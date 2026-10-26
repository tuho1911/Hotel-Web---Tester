using HotelManagementAPI.Data;
using HotelManagementAPI.DTOs;
using HotelManagementAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementAPI.Services;

public class AttractionService : IAttractionService
{
    private readonly AppDbContext _context;

    public AttractionService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<AttractionDto>> GetAllAsync()
    {
        return await _context.Attractions
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => MapToDto(a))
            .ToListAsync();
    }

    public async Task<AttractionDto?> GetByIdAsync(int id)
    {
        var attraction = await _context.Attractions.FindAsync(id);
        return attraction == null ? null : MapToDto(attraction);
    }

    public async Task<AttractionDto> CreateAsync(CreateAttractionDto dto)
    {
        var attraction = new Attraction
        {
            Name = dto.Name,
            DistanceKm = dto.DistanceKm,
            Description = dto.Description,
            Address = dto.Address,
            Category = dto.Category,
            MapEmbedLink = dto.MapEmbedLink,
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
            ImageUrl = dto.ImageUrl,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Attractions.Add(attraction);
        await _context.SaveChangesAsync();

        return MapToDto(attraction);
    }

    public async Task<AttractionDto?> UpdateAsync(int id, UpdateAttractionDto dto)
    {
        var attraction = await _context.Attractions.FindAsync(id);
        if (attraction == null) return null;

        attraction.Name = dto.Name;
        attraction.DistanceKm = dto.DistanceKm;
        attraction.Description = dto.Description;
        attraction.Address = dto.Address;
        attraction.Category = dto.Category;
        attraction.MapEmbedLink = dto.MapEmbedLink;
        attraction.Latitude = dto.Latitude;
        attraction.Longitude = dto.Longitude;
        if (!string.IsNullOrWhiteSpace(dto.ImageUrl))
        {
            attraction.ImageUrl = dto.ImageUrl;
        }
        attraction.IsActive = dto.IsActive;
        attraction.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapToDto(attraction);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var attraction = await _context.Attractions.FindAsync(id);
        if (attraction == null) return false;

        _context.Attractions.Remove(attraction);
        await _context.SaveChangesAsync();
        return true;
    }

    private static AttractionDto MapToDto(Attraction a) => new(
        a.Id,
        a.Name,
        a.DistanceKm,
        a.Description,
        a.Address,
        a.Category,
        a.MapEmbedLink,
        a.Latitude,
        a.Longitude,
        a.ImageUrl,
        a.IsActive,
        a.CreatedAt ?? DateTime.MinValue,
        a.UpdatedAt ?? DateTime.MinValue
    );
}
