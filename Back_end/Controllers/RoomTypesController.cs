using HotelManagementAPI.Data;
using HotelManagementAPI.DTOs;
using HotelManagementAPI.Middleware;
using HotelManagementAPI.Models;
using HotelManagementAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace HotelManagementAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[RequirePermission("MANAGE_ROOMS")]
public class RoomTypesController : ControllerBase
{
    private readonly IRoomService _roomService;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly AppDbContext _context;
    private readonly IAuditLogService _auditLogService;
    private readonly IMemoryCache _cache;
    private const string CACHE_KEY = "roomTypesList";

    public RoomTypesController(IRoomService roomService, ICloudinaryService cloudinaryService, AppDbContext context, IAuditLogService auditLogService, IMemoryCache cache)
    {
        _roomService = roomService;
        _cloudinaryService = cloudinaryService;
        _context = context;
        _auditLogService = auditLogService;
        _cache = cache;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        if (!_cache.TryGetValue(CACHE_KEY, out IEnumerable<RoomTypeResponseDto>? roomTypes))
        {
            roomTypes = await _roomService.GetAllRoomTypesAsync();
            var cacheOptions = new MemoryCacheEntryOptions().SetAbsoluteExpiration(TimeSpan.FromHours(1));
            _cache.Set(CACHE_KEY, roomTypes, cacheOptions);
        }
        return Ok(roomTypes);
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _roomService.GetRoomTypeByIdAsync(id);
        if (result == null) return NotFound(new { message = "Loại phòng không tồn tại" });
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRoomTypeDto dto)
    {
        var result = await _roomService.CreateRoomTypeAsync(dto);
        _cache.Remove(CACHE_KEY); // Invalidate cache
        await _auditLogService.LogAsync("CREATE", nameof(RoomType), new { roomTypeId = result.Id, result.Name }, null, dto, $"Tạo loại phòng {result.Name}.");
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateRoomTypeDto dto)
    {
        var result = await _roomService.UpdateRoomTypeAsync(id, dto);
        if (result == null) return NotFound(new { message = "Loại phòng không tồn tại" });
        _cache.Remove(CACHE_KEY); // Invalidate cache
        await _auditLogService.LogAsync("UPDATE", nameof(RoomType), new { roomTypeId = id, result.Name }, dto, result, $"Cập nhật loại phòng {result.Name}.");
        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _roomService.DeleteRoomTypeAsync(id);
        if (!result) return NotFound(new { message = "Loại phòng không tồn tại" });
        _cache.Remove(CACHE_KEY); // Invalidate cache
        await _auditLogService.LogAsync("DELETE", nameof(RoomType), new { roomTypeId = id }, null, null, $"Vô hiệu hóa loại phòng #{id}.");
        return Ok(new { message = "Đã vô hiệu hóa loại phòng thành công" });
    }

    // GALLERY MANAGEMENT
    [HttpPost("{id}/images")]
    public async Task<IActionResult> UploadImage(int id, IFormFile file, [FromQuery] bool isPrimary = false)
    {
        var rt = await _context.RoomTypes.FindAsync(id);
        if (rt == null) return NotFound();

        var (url, publicId) = await _cloudinaryService.UploadImageAsync(file, $"HotelManagement/RoomTypes/{id}");

        var roomImage = new RoomImage
        {
            RoomTypeId = id,
            ImageUrl = url,
            PublicId = publicId,
            IsPrimary = isPrimary
        };

        if (isPrimary)
        {
            // Reset other primary images
            var primaries = await _context.RoomImages.Where(img => img.RoomTypeId == id && img.IsPrimary == true).ToListAsync();
            foreach (var p in primaries) p.IsPrimary = false;
        }

        _context.RoomImages.Add(roomImage);
        await _context.SaveChangesAsync();
        _cache.Remove(CACHE_KEY); // Invalidate cache
        await _auditLogService.LogAsync("CREATE", "RoomTypeImage", new { roomTypeId = id, roomImage.Id }, null, new { file.FileName, isPrimary }, $"Tải ảnh mới cho loại phòng #{id}.");

        return Ok(roomImage);
    }

    [HttpDelete("images/{imageId}")]
    public async Task<IActionResult> DeleteImage(int imageId)
    {
        var img = await _context.RoomImages.FindAsync(imageId);
        if (img == null) return NotFound();

        await _cloudinaryService.DeleteImageAsync(img.PublicId!);

        _context.RoomImages.Remove(img);
        await _context.SaveChangesAsync();
        _cache.Remove(CACHE_KEY); // Invalidate cache
        await _auditLogService.LogAsync("DELETE", "RoomTypeImage", new { imageId }, null, null, $"Xóa ảnh loại phòng #{imageId}.");

        return Ok(new { message = "Đã xóa ảnh thành công" });
    }

    [HttpPatch("images/{imageId}/set-primary")]
    public async Task<IActionResult> SetPrimary(int imageId)
    {
        var img = await _context.RoomImages.FindAsync(imageId);
        if (img == null) return NotFound();

        // Reset all primary for this RoomType
        var primaries = await _context.RoomImages.Where(i => i.RoomTypeId == img.RoomTypeId && i.IsPrimary == true).ToListAsync();
        foreach (var p in primaries) p.IsPrimary = false;

        img.IsPrimary = true;
        await _context.SaveChangesAsync();
        _cache.Remove(CACHE_KEY); // Invalidate cache
        await _auditLogService.LogAsync("UPDATE", "RoomTypeImage", new { imageId }, null, new { isPrimary = true }, $"Đặt ảnh #{imageId} làm ảnh chính.");

        return Ok(new { message = "Đã đặt ảnh làm ảnh chính" });
    }
}
