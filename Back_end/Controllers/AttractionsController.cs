using CloudinaryDotNet;
using HotelManagementAPI.Data;
using HotelManagementAPI.DTOs;
using HotelManagementAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HotelManagementAPI.Middleware;

namespace HotelManagementAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[RequirePermission("MANAGE_CONTENT")]
public class AttractionsController : ControllerBase
{
    private readonly IAttractionService _attractionService;
    private readonly AppDbContext _context;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly IAuditLogService _auditLogService;

    public AttractionsController(
        IAttractionService attractionService,
        AppDbContext context,
        ICloudinaryService cloudinaryService,
        IAuditLogService auditLogService)
    {
        _attractionService = attractionService;
        _context = context;
        _cloudinaryService = cloudinaryService;
        _auditLogService = auditLogService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        var result = await _attractionService.GetAllAsync();
        return Ok(result);
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _attractionService.GetByIdAsync(id);
        if (result == null) return NotFound(new { message = "Điểm tham quan không tồn tại" });
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAttractionDto dto)
    {
        var result = await _attractionService.CreateAsync(dto);
        await _auditLogService.LogAsync("CREATE", "Attraction", new { attractionId = result.Id, result.Name }, null, dto, $"Tạo điểm tham quan {result.Name}.");
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateAttractionDto dto)
    {
        var result = await _attractionService.UpdateAsync(id, dto);
        if (result == null) return NotFound(new { message = "Điểm tham quan không tồn tại" });
        await _auditLogService.LogAsync("UPDATE", "Attraction", new { attractionId = id, result.Name }, dto, result, $"Cập nhật điểm tham quan {result.Name}.");
        return Ok(result);
    }

    [HttpPost("{id}/image")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> UploadImage(int id, IFormFile file)
    {
        try 
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "Vui lòng chọn ảnh hợp lệ" });
            }

            var attraction = await _context.Attractions.FirstOrDefaultAsync(a => a.Id == id);
            if (attraction == null)
            {
                return NotFound(new { message = "Điểm tham quan không tồn tại" });
            }

            var imageTransformation = new Transformation()
                .Width(1600)
                .Height(900)
                .Crop("fill")
                .Gravity("auto")
                .Quality("auto")
                .FetchFormat("auto");

            var (url, _) = await _cloudinaryService.UploadImageAsync(
                file,
                $"HotelManagement/Attractions/{id}",
                imageTransformation);

            attraction.ImageUrl = url;
            attraction.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await _auditLogService.LogAsync("UPDATE", "AttractionImage", new { attractionId = id, attraction.Name }, null, new { imageUrl = attraction.ImageUrl }, $"Cập nhật ảnh điểm tham quan {attraction.Name}.");

            return Ok(new
            {
                message = "Cập nhật ảnh điểm tham quan thành công",
                imageUrl = attraction.ImageUrl,
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Lỗi khi upload lên Cloudinary", details = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _attractionService.DeleteAsync(id);
        if (!result) return NotFound(new { message = "Điểm tham quan không tồn tại" });
        await _auditLogService.LogAsync("DELETE", "Attraction", new { attractionId = id }, null, null, $"Xóa điểm tham quan #{id}.");
        return Ok(new { message = "Đã xóa điểm tham quan thành công" });
    }
}
