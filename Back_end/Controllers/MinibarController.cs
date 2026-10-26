using HotelManagementAPI.Data;
using HotelManagementAPI.DTOs;
using HotelManagementAPI.Models;
using HotelManagementAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Manager")]
public class MinibarController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAuditLogService _auditLogService;

    public MinibarController(AppDbContext context, IAuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
    }

    [HttpGet("items")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAllItems()
    {
        return Ok(await _context.MinibarItems.OrderBy(m => m.Name).ToListAsync());
    }

    [HttpPost("items")]
    public async Task<IActionResult> CreateItem([FromBody] CreateMinibarItemDto dto)
    {
        var item = new MinibarItem { Name = dto.Name, Price = dto.Price };
        _context.MinibarItems.Add(item);
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("CREATE", "MinibarItem", new { minibarItemId = item.Id, item.Name }, null, dto, $"Tạo minibar item {item.Name}.");
        return CreatedAtAction(nameof(GetAllItems), new { id = item.Id }, item);
    }

    [HttpPut("items/{id}")]
    public async Task<IActionResult> UpdateItem(int id, [FromBody] UpdateMinibarItemDto dto)
    {
        var item = await _context.MinibarItems.FindAsync(id);
        if (item == null) return NotFound();

        item.Name = dto.Name;
        item.Price = dto.Price;
        item.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("UPDATE", "MinibarItem", new { minibarItemId = id }, dto, item, $"Cập nhật minibar item {item.Name}.");
        return Ok(item);
    }

    [HttpGet("stock/{roomId}")]
    public async Task<IActionResult> GetRoomStock(int roomId)
    {
        var stock = await _context.RoomMinibarStocks
            .Include(s => s.MinibarItem)
            .Where(s => s.RoomId == roomId)
            .ToListAsync();
        return Ok(stock);
    }

    [HttpPost("stock")]
    public async Task<IActionResult> UpdateStock([FromBody] UpdateMinibarStockDto dto)
    {
        var stock = await _context.RoomMinibarStocks
            .FirstOrDefaultAsync(s => s.RoomId == dto.RoomId && s.MinibarItemId == dto.MinibarItemId);

        if (stock == null)
        {
            stock = new RoomMinibarStock
            {
                RoomId = dto.RoomId,
                MinibarItemId = dto.MinibarItemId,
                Quantity = dto.Quantity
            };
            _context.RoomMinibarStocks.Add(stock);
        }
        else
        {
            stock.Quantity = dto.Quantity;
        }

        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("UPDATE", "MinibarStock", new { dto.RoomId, dto.MinibarItemId }, null, dto, $"Cập nhật tồn kho minibar phòng #{dto.RoomId}.");
        return Ok(stock);
    }
}
