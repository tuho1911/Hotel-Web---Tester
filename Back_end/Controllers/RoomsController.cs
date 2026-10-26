using HotelManagementAPI.DTOs;
using HotelManagementAPI.Middleware;
using HotelManagementAPI.Models;
using HotelManagementAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HotelManagementAPI.Data;
using Microsoft.AspNetCore.SignalR;

namespace HotelManagementAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[RequirePermission("MANAGE_ROOMS")]
public class RoomsController : ControllerBase
{
    private readonly IRoomService _roomService;
    private readonly AppDbContext _context;
    private readonly Microsoft.AspNetCore.SignalR.IHubContext<HotelManagementAPI.Hubs.NotificationHub> _hubContext;
    private readonly IAuditLogService _auditLogService;

    public RoomsController(IRoomService roomService, AppDbContext context, Microsoft.AspNetCore.SignalR.IHubContext<HotelManagementAPI.Hubs.NotificationHub> hubContext, IAuditLogService auditLogService)
    {
        _roomService = roomService;
        _context = context;
        _hubContext = hubContext;
        _auditLogService = auditLogService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] int? roomTypeId, [FromQuery] int? floor, [FromQuery] string? roomNumber)
    {
        var result = await _roomService.GetAllRoomsAsync(roomTypeId, floor, roomNumber);
        return Ok(result);
    }

    /// <summary>
    /// Trả về danh sách phòng trống trong khoảng thời gian checkIn → checkOut.
    /// Phòng bị loại trừ nếu đã có BookingDetail nào đó trùng ngày và không bị Cancelled/CheckedOut.
    /// </summary>
    [HttpGet("available")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAvailable(
        [FromQuery] DateTime checkIn,
        [FromQuery] DateTime checkOut,
        [FromQuery] int? roomTypeId)
    {
        if (checkIn >= checkOut)
            return BadRequest(new { message = "Ngày trả phòng phải sau ngày nhận phòng." });

        var query = _context.Rooms
            .Include(r => r.RoomType)
            .Where(r => r.IsActive && r.Status != "Maintenance");

        if (roomTypeId.HasValue)
            query = query.Where(r => r.RoomTypeId == roomTypeId.Value);

        // Lấy tất cả roomId bị xung đột trong khoảng thời gian yêu cầu
        var bookedRoomIds = await _context.BookingDetails
            .Where(bd =>
                bd.RoomId.HasValue &&
                bd.Booking != null &&
                bd.Booking.StatusString != "Cancelled" &&
                bd.Booking.StatusString != "CheckedOut" &&
                bd.CheckInDate < checkOut &&
                bd.CheckOutDate > checkIn)
            .Select(bd => bd.RoomId!.Value)
            .Distinct()
            .ToListAsync();

        var available = await query
            .Where(r => !bookedRoomIds.Contains(r.Id))
            .OrderBy(r => r.RoomType!.Name)
            .ThenBy(r => r.RoomNumber)
            .Select(r => new
            {
                r.Id,
                r.RoomNumber,
                r.Floor,
                r.Status,
                r.CleaningStatus,
                r.IsActive,
                RoomTypeId = r.RoomTypeId,
                RoomTypeName = r.RoomType != null ? r.RoomType.Name : "Unknown",
                BasePrice = r.RoomType != null ? r.RoomType.BasePrice : 0m,
            })
            .ToListAsync();

        return Ok(available);
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _roomService.GetRoomByIdAsync(id);
        if (result == null) return NotFound(new { message = "Phòng không tồn tại" });
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRoomDto dto)
    {
        var result = await _roomService.CreateRoomAsync(dto);
        await _auditLogService.LogAsync("CREATE", nameof(Room), new { roomId = result.Id, result.RoomNumber }, null, dto, $"Tạo phòng {result.RoomNumber}.");
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateRoomDto dto)
    {
        var result = await _roomService.UpdateRoomAsync(id, dto);
        if (result == null) return NotFound(new { message = "Phòng không tồn tại" });
        await _auditLogService.LogAsync("UPDATE", nameof(Room), new { roomId = id, result.RoomNumber }, dto, result, $"Cập nhật phòng {result.RoomNumber}.");
        
        // Gửi SignalR thông báo
        await _hubContext.Clients.All.SendAsync("RoomStatusChanged", result.Id, result.Status, result.CleaningStatus);
        
        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _roomService.DeleteRoomAsync(id);
        if (!result) return NotFound(new { message = "Phòng không tồn tại" });
        await _auditLogService.LogAsync("DELETE", nameof(Room), new { roomId = id }, null, null, $"Vô hiệu hóa phòng #{id}.");
        return Ok(new { message = "Đã vô hiệu hóa phòng thành công" });
    }

    [HttpPatch("{id}/cleaning-status")]
    public async Task<IActionResult> UpdateCleaningStatus(int id, [FromBody] UpdateRoomCleaningDto dto)
    {
        var room = await _context.Rooms.FindAsync(id);
        if (room == null) return NotFound(new { message = "Phòng không tồn tại" });

        room.Status = dto.Status;
        room.CleaningStatus = dto.CleaningStatus;
        await _context.SaveChangesAsync();
        
        await _hubContext.Clients.All.SendAsync("RoomStatusChanged", room.Id, room.Status, room.CleaningStatus);
        await _auditLogService.LogAsync("UPDATE", nameof(Room), new { roomId = room.Id, room.RoomNumber }, null, new { room.Status, room.CleaningStatus }, $"Cập nhật trạng thái phòng {room.RoomNumber} -> {room.Status}/{room.CleaningStatus}.");
        
        return Ok(room);
    }

    [HttpPost("{id}/clone-items")]
    public async Task<IActionResult> CloneItems(int id, [FromBody] CloneRoomItemsDto dto)
    {
        var targetRoom = await _context.Rooms.FindAsync(id);
        if (targetRoom == null) return NotFound(new { message = "Phòng mục tiêu không tồn tại" });

        var templateRoom = await _context.Rooms.FindAsync(dto.TemplateRoomId);
        if (templateRoom == null) return NotFound(new { message = "Phòng mẫu không tồn tại" });

        var templateInventories = await LoadTemplateInventoriesAsync(dto.TemplateRoomId);
        var oldInventories = await _context.RoomInventories.Where(ri => ri.RoomId == id).ToListAsync();
        
        // Tránh lỗi FK: Lấy danh sách ID đang được tham chiếu bởi LossAndDamages
        var usedInventoryIds = await _context.LossAndDamages
            .Where(ld => ld.RoomInventoryId.HasValue && oldInventories.Select(oi => oi.Id).Contains(ld.RoomInventoryId.Value))
            .Select(ld => ld.RoomInventoryId!.Value)
            .Distinct()
            .ToListAsync();

        var affectedEquipmentIds = oldInventories.Select(ri => ri.EquipmentId).ToHashSet();
        foreach (var inventory in templateInventories) affectedEquipmentIds.Add(inventory.EquipmentId);

        // Chỉ xóa những thứ không bị tham chiếu
        var toRemove = oldInventories.Where(oi => !usedInventoryIds.Contains(oi.Id)).ToList();
        var toKeep = oldInventories.Where(oi => usedInventoryIds.Contains(oi.Id)).ToList();

        _context.RoomInventories.RemoveRange(toRemove);
        
        // Đối với những thứ giữ lại vì vướng FK, ta đánh dấu ẩn đi nếu nó không có trong template mới
        foreach (var k in toKeep)
        {
            if (!templateInventories.Any(t => t.EquipmentId == k.EquipmentId))
            {
                k.IsActive = false;
                k.Quantity = 0; // Đặt về 0 vì thực tế nó không còn trong set đồ của phòng này
            }
        }

        // Thêm mới hoặc cập nhật
        foreach (var item in templateInventories)
        {
            var existing = toKeep.FirstOrDefault(k => k.EquipmentId == item.EquipmentId);
            if (existing != null)
            {
                existing.Quantity = item.Quantity;
                existing.PriceIfLost = item.PriceIfLost;
                existing.Note = item.Note;
                existing.IsActive = item.IsActive;
                existing.ItemType = item.ItemType;
            }
            else
            {
                _context.RoomInventories.Add(new RoomInventory
                {
                    RoomId = id,
                    EquipmentId = item.EquipmentId,
                    Quantity = item.Quantity,
                    PriceIfLost = item.PriceIfLost,
                    Note = item.Note,
                    IsActive = item.IsActive,
                    ItemType = item.ItemType
                });
            }
        }

        await _context.SaveChangesAsync();
        await RecalculateEquipmentUsageAsync(affectedEquipmentIds);
        await _auditLogService.LogAsync("UPDATE", nameof(RoomInventory), new { targetRoomId = targetRoom.Id, targetRoom.RoomNumber, templateRoomId = templateRoom.Id }, null, new { copiedFrom = templateRoom.RoomNumber, itemCount = templateInventories.Count }, $"Copy vật tư sang phòng {targetRoom.RoomNumber}.");
        return Ok(new { message = $"Đã copy thành công vật tư sang phòng {targetRoom.RoomNumber}" });
    }

    [HttpPost("{id}/sync-items")]
    public async Task<IActionResult> SyncItems(int id)
    {
        var templateRoom = await _context.Rooms.FindAsync(id);
        if (templateRoom == null) return NotFound(new { message = "Phòng mẫu không tồn tại" });

        var targetRooms = await _context.Rooms.Where(r => r.RoomTypeId == templateRoom.RoomTypeId && r.Id != id && r.IsActive).ToListAsync();
        if (!targetRooms.Any()) return Ok(new { message = "Không có phòng nào cùng hạng để đồng bộ" });

        var templateItems = await LoadTemplateInventoriesAsync(id);
        var targetRoomIds = targetRooms.Select(r => r.Id).ToList();

        var allOldItems = await _context.RoomInventories.Where(ri => ri.RoomId.HasValue && targetRoomIds.Contains(ri.RoomId.Value)).ToListAsync();
        
        // Lấy danh sách ID bị vướng FK
        var usedInventoryIds = await _context.LossAndDamages
            .Where(ld => ld.RoomInventoryId.HasValue && allOldItems.Select(oi => oi.Id).Contains(ld.RoomInventoryId.Value))
            .Select(ld => ld.RoomInventoryId!.Value)
            .Distinct()
            .ToListAsync();

        var affectedEquipmentIds = allOldItems.Select(ri => ri.EquipmentId).ToHashSet();
        foreach (var item in templateItems) affectedEquipmentIds.Add(item.EquipmentId);

        // Xóa những thứ không bị vướng
        var toRemove = allOldItems.Where(oi => !usedInventoryIds.Contains(oi.Id)).ToList();
        _context.RoomInventories.RemoveRange(toRemove);

        // Cập nhật hoặc thêm mới cho từng phòng mục tiêu
        foreach (var room in targetRooms)
        {
            var roomOldItemsToKeep = allOldItems.Where(oi => oi.RoomId == room.Id && usedInventoryIds.Contains(oi.Id)).ToList();

            // Ẩn những thứ cũ bị vướng FK nhưng không có trong template mới
            foreach (var old in roomOldItemsToKeep)
            {
                if (!templateItems.Any(t => t.EquipmentId == old.EquipmentId))
                {
                    old.IsActive = false;
                    old.Quantity = 0;
                }
            }

            foreach (var tItem in templateItems)
            {
                var existing = roomOldItemsToKeep.FirstOrDefault(k => k.EquipmentId == tItem.EquipmentId);
                if (existing != null)
                {
                    existing.Quantity = tItem.Quantity;
                    existing.PriceIfLost = tItem.PriceIfLost;
                    existing.Note = tItem.Note;
                    existing.IsActive = tItem.IsActive;
                    existing.ItemType = tItem.ItemType;
                }
                else
                {
                    _context.RoomInventories.Add(new RoomInventory
                    {
                        RoomId = room.Id,
                        EquipmentId = tItem.EquipmentId,
                        Quantity = tItem.Quantity,
                        PriceIfLost = tItem.PriceIfLost,
                        Note = tItem.Note,
                        IsActive = tItem.IsActive,
                        ItemType = tItem.ItemType
                    });
                }
            }
        }

        await _context.SaveChangesAsync();
        await RecalculateEquipmentUsageAsync(affectedEquipmentIds);
        await _auditLogService.LogAsync("UPDATE", nameof(RoomInventory), new { templateRoomId = templateRoom.Id, templateRoom.RoomNumber }, null, new { syncedRooms = targetRooms.Count, itemCount = templateItems.Count }, $"Đồng bộ vật tư từ phòng {templateRoom.RoomNumber} sang {targetRooms.Count} phòng.");
        return Ok(new { message = $"Đã đồng bộ vật tư sang {targetRooms.Count} phòng cùng hạng." });
    }

    [HttpPost("bulk-create")]
    public async Task<IActionResult> BulkCreate([FromBody] BulkCreateRoomsRequestDto dto)
    {
        if (dto.Count <= 0 || dto.Count > 50) return BadRequest(new { message = "Số lượng phòng phải từ 1 đến 50" });
        
        var templateInventories = dto.TemplateRoomId.HasValue ? await LoadTemplateInventoriesAsync(dto.TemplateRoomId.Value) : new List<RoomInventory>();
        var affectedEquipmentIds = templateInventories.Select(ri => ri.EquipmentId).ToHashSet();

        var step = dto.Step ?? 1;
        for (int i = 0; i < dto.Count; i++)
        {
            var roomNumber = BuildRoomNumber(dto.Floor, dto.StartNumber + (i * step));
            if (await _context.Rooms.AnyAsync(r => r.RoomNumber == roomNumber)) continue;

            var room = new Room { RoomTypeId = dto.RoomTypeId, RoomNumber = roomNumber, Floor = dto.Floor, Status = "Available", CleaningStatus = "Clean", IsActive = true };
            _context.Rooms.Add(room);
            await _context.SaveChangesAsync();

            if (dto.TemplateRoomId.HasValue)
            {
                _context.RoomInventories.AddRange(templateInventories.Select(item => new RoomInventory
                {
                    RoomId = room.Id, EquipmentId = item.EquipmentId, Quantity = item.Quantity,
                    PriceIfLost = item.PriceIfLost, Note = item.Note, IsActive = item.IsActive, ItemType = item.ItemType
                }));
            }
        }
        await _context.SaveChangesAsync();
        await RecalculateEquipmentUsageAsync(affectedEquipmentIds);
        await _auditLogService.LogAsync("CREATE", nameof(Room), new { roomTypeId = dto.RoomTypeId, dto.Floor, dto.Count }, null, dto, $"Tạo hàng loạt {dto.Count} phòng.");
        return Ok(new { message = $"Đã tạo phòng thành công" });
    }

    private async Task<List<RoomInventory>> LoadTemplateInventoriesAsync(int templateRoomId)
    {
        return await _context.RoomInventories.Where(ri => ri.RoomId == templateRoomId).AsNoTracking().ToListAsync();
    }

    private static string BuildRoomNumber(int floor, int sequenceNumber) => sequenceNumber >= 100 ? sequenceNumber.ToString() : $"{floor}{sequenceNumber:D2}";

    private async Task RecalculateEquipmentUsageAsync(IEnumerable<int> equipmentIds)
    {
        var distinctIds = equipmentIds.Distinct().ToList();
        if (!distinctIds.Any()) return;
        var usage = await _context.RoomInventories.Where(ri => distinctIds.Contains(ri.EquipmentId) && (ri.IsActive ?? true)).GroupBy(ri => ri.EquipmentId).Select(g => new { Id = g.Key, Qty = g.Sum(x => x.Quantity ?? 0) }).ToDictionaryAsync(x => x.Id, x => x.Qty);
        var equipments = await _context.Equipments.Where(e => distinctIds.Contains(e.Id)).ToListAsync();
        foreach (var e in equipments) e.InUseQuantity = usage.TryGetValue(e.Id, out var q) ? q : 0;
        await _context.SaveChangesAsync();
    }
}
