using HotelManagementAPI.Data;
using HotelManagementAPI.DTOs;
using HotelManagementAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementAPI.Services;

public class RoomService : IRoomService
{
    private readonly AppDbContext _context;

    public RoomService(AppDbContext context)
    {
        _context = context;
    }

    // =============================================
    // 1. ROOM TYPES
    // =============================================

    public async Task<IEnumerable<RoomTypeResponseDto>> GetAllRoomTypesAsync()
    {
        return await _context.RoomTypes
            .Include(rt => rt.Images)
            .Include(rt => rt.Amenities)
            .Where(rt => rt.IsActive)
            .OrderBy(rt => rt.Name)
            .Select(rt => MapToDto(rt))
            .ToListAsync();
    }

    public async Task<RoomTypeResponseDto?> GetRoomTypeByIdAsync(int id)
    {
        var rt = await _context.RoomTypes
            .Include(rt => rt.Images)
            .Include(rt => rt.Amenities)
            .FirstOrDefaultAsync(rt => rt.Id == id);

        return rt == null ? null : MapToDto(rt);
    }

    public async Task<RoomTypeResponseDto> CreateRoomTypeAsync(CreateRoomTypeDto dto)
    {
        // Auto-generate slug nếu không cung cấp
        var slug = dto.Slug ?? GenerateSlug(dto.Name);

        var rt = new RoomType
        {
            Name             = dto.Name,
            Description      = dto.Description,
            BasePrice        = dto.BasePrice,
            CapacityAdults   = dto.CapacityAdults,
            CapacityChildren = dto.CapacityChildren,
            SizeSqm          = dto.SizeSqm,
            BedType          = dto.BedType,
            ViewType         = dto.ViewType,
            IsActive         = true,
            Slug             = slug,
            Content          = dto.Content
        };

        _context.RoomTypes.Add(rt);
        await _context.SaveChangesAsync();

        return MapToDto(rt);
    }

    public async Task<RoomTypeResponseDto?> UpdateRoomTypeAsync(int id, UpdateRoomTypeDto dto)
    {
        var rt = await _context.RoomTypes.FindAsync(id);
        if (rt == null) return null;

        rt.Name             = dto.Name;
        rt.Description      = dto.Description;
        rt.BasePrice        = dto.BasePrice;
        rt.CapacityAdults   = dto.CapacityAdults;
        rt.CapacityChildren = dto.CapacityChildren;
        rt.SizeSqm          = dto.SizeSqm;
        rt.BedType          = dto.BedType;
        rt.ViewType         = dto.ViewType;
        rt.IsActive         = dto.IsActive;
        rt.Slug             = dto.Slug ?? rt.Slug;
        rt.Content          = dto.Content;

        await _context.SaveChangesAsync();
        return MapToDto(rt);
    }

    public async Task<bool> DeleteRoomTypeAsync(int id)
    {
        var rt = await _context.RoomTypes.FindAsync(id);
        if (rt == null) return false;

        rt.IsActive = false; // Soft delete
        await _context.SaveChangesAsync();
        return true;
    }

    // =============================================
    // 2. ROOMS
    // =============================================

    public async Task<IEnumerable<RoomResponseDto>> GetAllRoomsAsync(int? roomTypeId = null, int? floor = null, string? roomNumber = null)
    {
        var query = _context.Rooms
            .Include(r => r.RoomType)
            .Where(r => r.IsActive)
            .AsQueryable();

        if (roomTypeId.HasValue)
            query = query.Where(r => r.RoomTypeId == roomTypeId.Value);

        if (floor.HasValue)
            query = query.Where(r => r.Floor == floor.Value);

        if (!string.IsNullOrWhiteSpace(roomNumber))
            query = query.Where(r => r.RoomNumber.Contains(roomNumber));

        return await query
            .OrderBy(r => r.RoomNumber)
            .Select(r => new RoomResponseDto(
                r.Id,
                r.RoomNumber,
                r.RoomType!.Name,
                r.RoomTypeId,
                r.Status,
                r.CleaningStatus,
                r.IsActive,
                r.Floor,
                r.ExtensionNumber))
            .ToListAsync();
    }

    public async Task<RoomResponseDto?> GetRoomByIdAsync(int id)
    {
        var room = await _context.Rooms
            .Include(r => r.RoomType)
            .FirstOrDefaultAsync(r => r.Id == id);

        return room == null ? null : new RoomResponseDto(
            room.Id,
            room.RoomNumber,
            room.RoomType?.Name ?? "N/A",
            room.RoomTypeId,
            room.Status,
            room.CleaningStatus,
            room.IsActive,
            room.Floor,
            room.ExtensionNumber);
    }

    public async Task<RoomResponseDto> CreateRoomAsync(CreateRoomDto dto)
    {
        var room = new Room
        {
            RoomNumber      = dto.RoomNumber,
            RoomTypeId      = dto.RoomTypeId,
            Status          = dto.Status,
            Floor           = dto.Floor,
            CleaningStatus  = dto.CleaningStatus ?? "Clean",
            ExtensionNumber = dto.ExtensionNumber,
            IsActive        = true
        };

        _context.Rooms.Add(room);
        await _context.SaveChangesAsync();

        return (await GetRoomByIdAsync(room.Id))!;
    }

    public async Task<RoomResponseDto?> UpdateRoomAsync(int id, UpdateRoomDto dto)
    {
        var room = await _context.Rooms.FindAsync(id);
        if (room == null) return null;

        room.RoomNumber      = dto.RoomNumber;
        room.RoomTypeId      = dto.RoomTypeId;
        room.Status          = dto.Status;
        room.IsActive        = dto.IsActive;
        room.Floor           = dto.Floor;
        room.CleaningStatus  = dto.CleaningStatus;
        room.ExtensionNumber = dto.ExtensionNumber;

        await _context.SaveChangesAsync();
        return await GetRoomByIdAsync(id);
    }

    public async Task<bool> DeleteRoomAsync(int id)
    {
        var room = await _context.Rooms.FindAsync(id);
        if (room == null) return false;

        room.IsActive = false; // Soft delete
        await _context.SaveChangesAsync();
        return true;
    }

    // ─── HELPERS ────────────────────────────────────────────────────────────────

    private static string GenerateSlug(string name)
    {
        // Đơn giản hóa: lowercase, thay space bằng dấu gạch
        return name.ToLower()
            .Replace(" ", "-")
            .Replace("ă", "a").Replace("â", "a").Replace("đ", "d")
            .Replace("ê", "e").Replace("ô", "o").Replace("ơ", "o")
            .Replace("ư", "u").Replace("ạ", "a").Replace("ả", "a")
            .Replace("á", "a").Replace("à", "a").Replace("ã", "a")
            .Replace("ắ", "a").Replace("ặ", "a").Replace("ầ", "a")
            .Replace("ấ", "a").Replace("ẩ", "a").Replace("ổ", "o")
            .Replace("ộ", "o").Replace("ợ", "o").Replace("ồ", "o")
            .Replace("ố", "o").Replace("ụ", "u").Replace("ủ", "u")
            .Replace("ứ", "u").Replace("ừ", "u").Replace("ử", "u")
            .Replace("ự", "u").Replace("ị", "i").Replace("ỉ", "i")
            .Replace("ệ", "e").Replace("ề", "e").Replace("ế", "e");
    }

    // MAPPERS
    private static RoomTypeResponseDto MapToDto(RoomType rt) => new(
        rt.Id,
        rt.Name,
        rt.Description,
        rt.BasePrice,
        rt.CapacityAdults,
        rt.CapacityChildren,
        rt.SizeSqm,
        rt.BedType,
        rt.ViewType,
        rt.IsActive,
        rt.Slug,
        rt.Images?.Select(i => new RoomImageResponseDto(i.Id, i.ImageUrl, i.IsPrimary, i.IsActive)).ToList(),
        rt.Amenities?.Select(a => new AmenityDto(a.Id, a.Name, a.IconUrl)).ToList()
    );
}
