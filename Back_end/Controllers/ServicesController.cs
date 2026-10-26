using System.Linq;
using System.Threading.Tasks;
using HotelManagementAPI.Data;
using HotelManagementAPI.DTOs;
using HotelManagementAPI.Middleware;
using HotelManagementAPI.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

using Microsoft.AspNetCore.Authorization;

using HotelManagementAPI.Models;

namespace HotelManagementAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ServicesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAuditLogService _auditLogService;

    public ServicesController(AppDbContext context, IAuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
    }

    [HttpGet("categories")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCategories()
    {
        var data = await _context.ServiceCategories
            .OrderBy(c => c.Name)
            .Select(c => new ServiceCategoryDto(c.Id, c.Name))
            .ToListAsync();

        return Ok(data);
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetServices()
    {
        var data = await _context.Services
            .OrderBy(s => s.Name)
            .Select(s => new ServiceDto(
                s.Id,
                s.CategoryId,
                s.Name,
                s.Price,
                s.Unit
            ))
            .ToListAsync();

        return Ok(data);
    }

    [HttpPost("categories")]
    [RequirePermission("MANAGE_SERVICES")]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryDto dto)
    {
        var cat = new ServiceCategory { Name = dto.Name };
        _context.ServiceCategories.Add(cat);
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("CREATE_SERVICE_CATEGORY", "ServiceCategory", new { id = cat.Id }, null, new { name = cat.Name }, $"Tạo danh mục {cat.Name}");
        return Ok(new ServiceCategoryDto(cat.Id, cat.Name));
    }

    [HttpPut("categories/{id}")]
    [RequirePermission("MANAGE_SERVICES")]
    public async Task<IActionResult> UpdateCategory(int id, [FromBody] CreateCategoryDto dto)
    {
        var cat = await _context.ServiceCategories.FindAsync(id);
        if (cat == null) return NotFound();
        cat.Name = dto.Name;
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("UPDATE_SERVICE_CATEGORY", "ServiceCategory", new { id }, null, new { name = cat.Name }, $"Cập nhật danh mục {id}");
        return Ok(new ServiceCategoryDto(cat.Id, cat.Name));
    }

    [HttpDelete("categories/{id}")]
    [RequirePermission("MANAGE_SERVICES")]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        var cat = await _context.ServiceCategories.FindAsync(id);
        if (cat == null) return NotFound();
        // Check if there are services
        if (await _context.Services.AnyAsync(s => s.CategoryId == id))
            return BadRequest(new { message = "Không thể xóa danh mục đang có dịch vụ" });

        _context.ServiceCategories.Remove(cat);
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("DELETE_SERVICE_CATEGORY", "ServiceCategory", new { id }, null, null, $"Xóa danh mục {id}");
        return Ok(new { message = "Đã xóa danh mục" });
    }

    [HttpPost]
    [RequirePermission("MANAGE_SERVICES")]
    public async Task<IActionResult> CreateService([FromBody] CreateServiceDto dto)
    {
        var srv = new Service {
            CategoryId = dto.CategoryId,
            Name = dto.Name,
            Price = dto.Price,
            Unit = dto.Unit
        };
        _context.Services.Add(srv);
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("CREATE_SERVICE", "Service", new { id = srv.Id }, null, srv, $"Tạo dịch vụ {srv.Name}");
        return Ok(new ServiceDto(srv.Id, srv.CategoryId, srv.Name, srv.Price, srv.Unit));
    }

    [HttpPut("{id}")]
    [RequirePermission("MANAGE_SERVICES")]
    public async Task<IActionResult> UpdateService(int id, [FromBody] CreateServiceDto dto)
    {
        var srv = await _context.Services.FindAsync(id);
        if (srv == null) return NotFound();
        srv.CategoryId = dto.CategoryId;
        srv.Name = dto.Name;
        srv.Price = dto.Price;
        srv.Unit = dto.Unit;
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("UPDATE_SERVICE", "Service", new { id }, null, srv, $"Cập nhật dịch vụ {srv.Name}");
        return Ok(new ServiceDto(srv.Id, srv.CategoryId, srv.Name, srv.Price, srv.Unit));
    }

    [HttpDelete("{id}")]
    [RequirePermission("MANAGE_SERVICES")]
    public async Task<IActionResult> DeleteService(int id)
    {
        var srv = await _context.Services.FindAsync(id);
        if (srv == null) return NotFound();
        _context.Services.Remove(srv);
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("DELETE_SERVICE", "Service", new { id }, null, null, $"Xóa dịch vụ {id}");
        return Ok(new { message = "Đã xóa dịch vụ" });
    }
}

public record CreateCategoryDto(string Name);
public record CreateServiceDto(int? CategoryId, string Name, decimal Price, string? Unit);

