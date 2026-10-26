using HotelManagementAPI.Data;
using HotelManagementAPI.DTOs;
using HotelManagementAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using HotelManagementAPI.Middleware;

namespace HotelManagementAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[RequirePermission("MANAGE_ROOMS")]
public class AmenitiesController : ControllerBase
{
    private readonly IAmenityService _amenityService;
    private readonly AppDbContext _context;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly IMemoryCache _cache;
    private const string ROOM_TYPES_CACHE_KEY = "roomTypesList";

    public AmenitiesController(
        IAmenityService amenityService,
        AppDbContext context,
        ICloudinaryService cloudinaryService,
        IMemoryCache cache)
    {
        _amenityService = amenityService;
        _context = context;
        _cloudinaryService = cloudinaryService;
        _cache = cache;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        var result = await _amenityService.GetAllAsync();
        return Ok(result);
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _amenityService.GetByIdAsync(id);
        if (result == null) return NotFound(new { message = "Tiện nghi không tồn tại" });
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAmenityDto dto)
    {
        var result = await _amenityService.CreateAsync(dto);
        _cache.Remove(ROOM_TYPES_CACHE_KEY);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateAmenityDto dto)
    {
        var result = await _amenityService.UpdateAsync(id, dto);
        if (result == null) return NotFound(new { message = "Tiện nghi không tồn tại" });
        _cache.Remove(ROOM_TYPES_CACHE_KEY);
        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _amenityService.DeleteAsync(id);
        if (!result) return NotFound(new { message = "Tiện nghi không tồn tại" });
        _cache.Remove(ROOM_TYPES_CACHE_KEY);
        return Ok(new { message = "Đã xóa tiện nghi thành công" });
    }

    // UPLOAD ICON
    [HttpPost("{id}/icon")]
    [RequestSizeLimit(5_000_000)]
    public async Task<IActionResult> UploadIcon(int id, IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Vui lòng chọn ảnh hợp lệ" });

        var amenity = await _context.Amenities.FirstOrDefaultAsync(a => a.Id == id);
        if (amenity == null)
            return NotFound(new { message = "Tiện nghi không tồn tại" });

        var (url, _) = await _cloudinaryService.UploadImageAsync(
            file,
            $"HotelManagement/Amenities/{id}",
            new CloudinaryDotNet.Transformation().Width(256).Height(256).Crop("fill").Quality("auto").FetchFormat("auto")
        );

        amenity.IconUrl = url;
        await _context.SaveChangesAsync();
        _cache.Remove(ROOM_TYPES_CACHE_KEY);

        return Ok(new { message = "Đã cập nhật icon tiện nghi", iconUrl = amenity.IconUrl });
    }

    // LINKING
    [HttpPost("link/{roomTypeId}/{amenityId}")]
    public async Task<IActionResult> AddToRoomType(int roomTypeId, int amenityId)
    {
        var result = await _amenityService.AddToRoomTypeAsync(roomTypeId, amenityId);
        if (!result) return BadRequest(new { message = "Không thể liên kết tiện nghi (có thể ID không đúng)" });
        _cache.Remove(ROOM_TYPES_CACHE_KEY);
        return Ok(new { message = "Đã liên kết tiện nghi thành công" });
    }

    [HttpDelete("link/{roomTypeId}/{amenityId}")]
    public async Task<IActionResult> RemoveFromRoomType(int roomTypeId, int amenityId)
    {
        var result = await _amenityService.RemoveFromRoomTypeAsync(roomTypeId, amenityId);
        if (!result) return BadRequest(new { message = "Không thể gỡ bỏ liên kết" });
        _cache.Remove(ROOM_TYPES_CACHE_KEY);
        return Ok(new { message = "Đã gỡ bỏ liên kết tiện nghi thành công" });
    }
}
