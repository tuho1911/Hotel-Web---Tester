using System.Security.Claims;
using HotelManagementAPI.Data;
using HotelManagementAPI.DTOs;
using HotelManagementAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UserProfileController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly IAuditLogService _auditLogService;

    public UserProfileController(AppDbContext context, ICloudinaryService cloudinaryService, IAuditLogService auditLogService)
    {
        _context = context;
        _cloudinaryService = cloudinaryService;
        _auditLogService = auditLogService;
    }

    // GET /api/UserProfile
    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return NotFound();

        return Ok(new
        {
            user.FullName,
            user.Email,
            user.Phone,
            user.AvatarUrl,
            Role = user.Role?.Name,
            MembershipId = user.MembershipId,
            LoyaltyPoints = user.LoyaltyPoints,
            MembershipName = user.Membership?.TierName,
            MembershipDiscountPercent = user.Membership?.DiscountPercent
        });
    }

    // POST /api/UserProfile/avatar
    [HttpPost("avatar")]
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound();

        // 1. Xóa ảnh cũ trên Cloudinary nếu có
        if (!string.IsNullOrEmpty(user.AvatarPublicId))
        {
            await _cloudinaryService.DeleteImageAsync(user.AvatarPublicId);
        }

        // 2. Upload ảnh mới (Chuẩn hóa 500x500, nhận diện khuôn mặt)
        var avatarTransformation = new CloudinaryDotNet.Transformation()
            .Width(500).Height(500).Crop("fill").Gravity("face").Quality("auto");

        var (url, publicId) = await _cloudinaryService.UploadImageAsync(
            file, 
            "HotelManagement/Avatars", 
            avatarTransformation);

        // 3. Lưu vào DB
        user.AvatarUrl = url;
        user.AvatarPublicId = publicId;
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("UPDATE", "UserProfile", new { userId }, null, new { avatarUrl = url }, "Cập nhật ảnh đại diện cá nhân.");

        return Ok(new { message = "Cập nhật ảnh đại diện thành công", url });
    }

    // PUT /api/UserProfile
    [HttpPut]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound();

        user.FullName = dto.FullName;
        user.Phone = dto.Phone;
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("UPDATE", "UserProfile", new { userId }, null, dto, "Cập nhật thông tin cá nhân.");

        return Ok(new { message = "Cập nhật thông tin cá nhân thành công" });
    }

    // POST /api/UserProfile/change-password
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound();

        // 1. Kiểm tra mật khẩu cũ
        if (!BCrypt.Net.BCrypt.Verify(dto.OldPassword, user.PasswordHash))
        {
            return BadRequest(new { message = "Mật khẩu cũ không chính xác" });
        }

        // 2. Hash mật khẩu mới và lưu
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("UPDATE", "UserProfile", new { userId }, null, null, "Đổi mật khẩu cá nhân.");

        return Ok(new { message = "Đổi mật khẩu thành công" });
    }
}
