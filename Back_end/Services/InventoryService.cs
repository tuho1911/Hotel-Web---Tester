using HotelManagementAPI.Data;
using HotelManagementAPI.DTOs;
using HotelManagementAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementAPI.Services;

/// <summary>
/// Quản lý danh sách thiết bị/vật dụng được gán cho từng phòng (Room_Inventory).
/// Mỗi bản ghi = 1 thiết bị (Equipment) trong 1 phòng cụ thể.
/// </summary>
public class InventoryService : IInventoryService
{
    private readonly AppDbContext _context;

    public InventoryService(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>Lấy danh sách thiết bị trong 1 phòng cụ thể</summary>
    public async Task<IEnumerable<RoomInventoryResponseDto>> GetByRoomAsync(int roomId)
    {
        return await _context.RoomInventories
            .Include(ri => ri.Room)
            .Include(ri => ri.Equipment)
            .Where(ri => ri.RoomId == roomId)
            .OrderBy(ri => ri.ItemType)
            .Select(ri => MapToDto(ri))
            .ToListAsync();
    }

    /// <summary>Lấy 1 bản ghi inventory theo Id</summary>
    public async Task<RoomInventoryResponseDto?> GetByIdAsync(int id)
    {
        var inv = await _context.RoomInventories
            .Include(ri => ri.Room)
            .Include(ri => ri.Equipment)
            .FirstOrDefaultAsync(ri => ri.Id == id);

        return inv == null ? null : MapToDto(inv);
    }

    /// <summary>Thêm mới hoặc đồng bộ 1 vật tư vào phòng theo cặp RoomId + EquipmentId</summary>
    public async Task<RoomInventoryResponseDto> SyncAsync(SyncRoomInventoryDto dto)
    {
        var roomExists = await _context.Rooms.AnyAsync(r => r.Id == dto.RoomId && r.IsActive);
        if (!roomExists)
            throw new InvalidOperationException("Phòng không tồn tại");

        var equipment = await _context.Equipments
            .FirstOrDefaultAsync(e => e.Id == dto.EquipmentId && e.IsActive);

        if (equipment == null)
            throw new InvalidOperationException("Vật tư không tồn tại");

        var inv = await _context.RoomInventories
            .FirstOrDefaultAsync(ri => ri.RoomId == dto.RoomId && ri.EquipmentId == dto.EquipmentId);

        if (inv == null)
        {
            inv = new RoomInventory
            {
                RoomId = dto.RoomId,
                EquipmentId = dto.EquipmentId,
                Quantity = dto.Quantity,
                PriceIfLost = dto.PriceIfLost ?? equipment.DefaultPriceIfLost,
                Note = dto.Note,
                IsActive = dto.IsActive,
                ItemType = dto.ItemType
            };

            _context.RoomInventories.Add(inv);
        }
        else
        {
            inv.Quantity = dto.Quantity;
            inv.PriceIfLost = dto.PriceIfLost ?? inv.PriceIfLost ?? equipment.DefaultPriceIfLost;
            inv.Note = dto.Note ?? inv.Note;
            inv.IsActive = dto.IsActive;
            inv.ItemType = dto.ItemType ?? inv.ItemType;
        }

        await _context.SaveChangesAsync();
        await RecalculateEquipmentUsageAsync(dto.EquipmentId);

        return (await GetByIdAsync(inv.Id))!;
    }

    /// <summary>Cập nhật số lượng / giá đền bù / ghi chú của 1 bản ghi inventory</summary>
    public async Task<RoomInventoryResponseDto?> UpdateByIdAsync(int id, UpdateRoomInventoryDto dto)
    {
        var inv = await _context.RoomInventories.FindAsync(id);
        if (inv == null) return null;

        var affectedEquipmentId = inv.EquipmentId;

        if (dto.Quantity.HasValue)    inv.Quantity    = dto.Quantity;
        if (dto.PriceIfLost.HasValue) inv.PriceIfLost = dto.PriceIfLost;
        if (dto.Note   != null)       inv.Note        = dto.Note;
        if (dto.IsActive.HasValue)    inv.IsActive    = dto.IsActive;

        await _context.SaveChangesAsync();
        await RecalculateEquipmentUsageAsync(affectedEquipmentId);
        return await GetByIdAsync(id);
    }

    /// <summary>Xóa hẳn 1 bản ghi thiết bị khỏi phòng</summary>
    public async Task<bool> DeleteByIdAsync(int id)
    {
        var inv = await _context.RoomInventories.FindAsync(id);
        if (inv == null) return false;

        var affectedEquipmentId = inv.EquipmentId;
        _context.RoomInventories.Remove(inv);
        await _context.SaveChangesAsync();
        await RecalculateEquipmentUsageAsync(affectedEquipmentId);
        return true;
    }

    // ─── MAPPER ──────────────────────────────────────────────────────────────────
    private static RoomInventoryResponseDto MapToDto(RoomInventory ri) => new(
        ri.Id,
        ri.RoomId,
        ri.Room?.RoomNumber,
        ri.EquipmentId,
        ri.Equipment?.Name,
        ri.Quantity,
        ri.PriceIfLost,
        ri.Note,
        ri.IsActive,
        ri.ItemType
    );

    private async Task RecalculateEquipmentUsageAsync(int equipmentId)
    {
        var equipment = await _context.Equipments.FindAsync(equipmentId);
        if (equipment == null) return;

        equipment.InUseQuantity = await _context.RoomInventories
            .Where(ri => ri.EquipmentId == equipmentId && (ri.IsActive ?? true))
            .SumAsync(ri => ri.Quantity ?? 0);

        await _context.SaveChangesAsync();
    }
}
