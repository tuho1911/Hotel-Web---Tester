using HotelManagementAPI.Data;
using HotelManagementAPI.DTOs;
using HotelManagementAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementAPI.Services;

public class AmenityService : IAmenityService
{
    private readonly AppDbContext _context;

    public AmenityService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<AmenityDto>> GetAllAsync()
    {
        return await _context.Amenities
            .Select(a => new AmenityDto(a.Id, a.Name, a.IconUrl))
            .ToListAsync();
    }

    public async Task<AmenityDto?> GetByIdAsync(int id)
    {
        var amenity = await _context.Amenities.FindAsync(id);
        return amenity == null ? null : new AmenityDto(amenity.Id, amenity.Name, amenity.IconUrl);
    }

    public async Task<AmenityDto> CreateAsync(CreateAmenityDto dto)
    {
        var amenity = new Amenity
        {
            Name = dto.Name,
            IconUrl = dto.IconUrl
        };

        _context.Amenities.Add(amenity);
        await _context.SaveChangesAsync();

        return new AmenityDto(amenity.Id, amenity.Name, amenity.IconUrl);
    }

    public async Task<AmenityDto?> UpdateAsync(int id, UpdateAmenityDto dto)
    {
        var amenity = await _context.Amenities.FindAsync(id);
        if (amenity == null) return null;

        amenity.Name = dto.Name;
        amenity.IconUrl = dto.IconUrl;

        await _context.SaveChangesAsync();
        return new AmenityDto(amenity.Id, amenity.Name, amenity.IconUrl);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var amenity = await _context.Amenities.FindAsync(id);
        if (amenity == null) return false;

        _context.Amenities.Remove(amenity);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> AddToRoomTypeAsync(int roomTypeId, int amenityId)
    {
        var roomType = await _context.RoomTypes
            .Include(rt => rt.Amenities)
            .FirstOrDefaultAsync(rt => rt.Id == roomTypeId);
            
        var amenity = await _context.Amenities.FindAsync(amenityId);
        
        if (roomType == null || amenity == null) return false;
        
        if (roomType.Amenities == null) roomType.Amenities = new List<Amenity>();
        
        if (!roomType.Amenities.Any(a => a.Id == amenityId))
        {
            roomType.Amenities.Add(amenity);
            await _context.SaveChangesAsync();
        }
        
        return true;
    }

    public async Task<bool> RemoveFromRoomTypeAsync(int roomTypeId, int amenityId)
    {
        var roomType = await _context.RoomTypes
            .Include(rt => rt.Amenities)
            .FirstOrDefaultAsync(rt => rt.Id == roomTypeId);
            
        if (roomType == null || roomType.Amenities == null) return false;
        
        var amenity = roomType.Amenities.FirstOrDefault(a => a.Id == amenityId);
        if (amenity != null)
        {
            roomType.Amenities.Remove(amenity);
            await _context.SaveChangesAsync();
        }
        
        return true;
    }
}
