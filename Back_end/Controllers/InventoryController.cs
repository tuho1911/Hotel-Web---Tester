using HotelManagementAPI.DTOs;
using HotelManagementAPI.Middleware;
using HotelManagementAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelManagementAPI.Controllers;

/// <summary>
/// Quản lý thiết bị/vật dụng được gán vào từng phòng (Room_Inventory).
/// </summary>
[ApiController]
[Route("api/[controller]")]
[RequirePermission("MANAGE_INVENTORY")]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventoryService;
    private readonly IAuditLogService _auditLogService;

    public InventoryController(IInventoryService inventoryService, IAuditLogService auditLogService)
    {
        _inventoryService = inventoryService;
        _auditLogService = auditLogService;
    }

    [HttpPost("sync")]
    public async Task<IActionResult> Sync([FromBody] SyncRoomInventoryDto dto)
    {
        try
        {
            var result = await _inventoryService.SyncAsync(dto);
            await _auditLogService.LogAsync("UPDATE", "Inventory", new { dto.RoomId }, null, dto, $"Đồng bộ vật tư phòng #{dto.RoomId}.");
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // GET /api/Inventory/room/{roomId} — Lấy danh sách thiết bị trong phòng
    [HttpGet("room/{roomId}")]
    public async Task<IActionResult> GetByRoom(int roomId)
    {
        var result = await _inventoryService.GetByRoomAsync(roomId);
        return Ok(result);
    }

    // GET /api/Inventory/{id} — Lấy chi tiết 1 bản ghi
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _inventoryService.GetByIdAsync(id);
        if (result == null) return NotFound(new { message = "Không tìm thấy thiết bị trong phòng" });
        return Ok(result);
    }

    // PUT /api/Inventory/{id} — Cập nhật số lượng / giá đền bù / ghi chú
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateRoomInventoryDto dto)
    {
        var previous = await _inventoryService.GetByIdAsync(id);
        var result = await _inventoryService.UpdateByIdAsync(id, dto);
        if (result == null) return NotFound(new { message = "Không tìm thấy thiết bị trong phòng" });
        await _auditLogService.LogAsync("UPDATE", "Inventory", new { inventoryId = id }, previous, result, $"Cập nhật vật tư trong phòng #{id}.");
        return Ok(result);
    }

    // DELETE /api/Inventory/{id} — Xóa thiết bị khỏi phòng
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _inventoryService.DeleteByIdAsync(id);
        if (!result) return NotFound(new { message = "Không tìm thấy thiết bị trong phòng" });
        await _auditLogService.LogAsync("DELETE", "Inventory", new { inventoryId = id }, null, null, $"Xóa vật tư khỏi phòng #{id}.");
        return Ok(new { message = "Đã xóa thiết bị khỏi phòng thành công" });
    }
}
