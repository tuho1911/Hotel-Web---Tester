using System.Security.Claims;
using HotelManagementAPI.Data;
using HotelManagementAPI.DTOs;
using HotelManagementAPI.Models;
using HotelManagementAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HotelManagementAPI.Middleware;
using Microsoft.AspNetCore.SignalR;
using HotelManagementAPI.Hubs;

namespace HotelManagementAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[RequirePermission("MANAGE_CONTENT")]
public class ReviewsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAuditLogService _auditLogService;
    private readonly IHubContext<NotificationHub> _hubContext;

    public ReviewsController(
        AppDbContext context, 
        IAuditLogService auditLogService, 
        IHubContext<NotificationHub> hubContext)
    {
        _context = context;
        _auditLogService = auditLogService;
        _hubContext = hubContext;
    }

    // GET /api/Reviews/{targetType}/{targetId}
    [HttpGet("{targetType}/{targetId}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetReviews(string targetType, int targetId)
    {
        var reviews = await _context.Reviews
            .Include(r => r.User)
            .Where(r => r.TargetType == targetType && r.TargetId == targetId && r.IsApproved)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new ReviewDto(
                r.Id,
                r.TargetType,
                r.TargetId,
                r.User != null ? r.User.FullName : (r.GuestName ?? "Khách vô danh"),
                r.Rating,
                r.Comment,
                r.IsApproved,
                r.CreatedAt
            ))
            .ToListAsync();

        var averageRating = reviews.Any() ? Math.Round(reviews.Average(r => r.Rating), 1) : 0;
        
        return Ok(new {
            AverageRating = averageRating,
            TotalReviews = reviews.Count,
            Reviews = reviews
        });
    }

    // POST /api/Reviews
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> CreateReview([FromBody] CreateReviewDto dto)
    {
        if (dto.Rating < 1 || dto.Rating > 5)
            return BadRequest(new { message = "Điểm đánh giá phải từ 1 đến 5." });

        if (dto.TargetType != "Article" && dto.TargetType != "Attraction" && dto.TargetType != "RoomType")
            return BadRequest(new { message = "Loại đối tượng không hợp lệ." });

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int? userId = null;
        if (!string.IsNullOrEmpty(userIdClaim) && int.TryParse(userIdClaim, out var parsedId))
        {
            userId = parsedId;
        }

        var review = new Review
        {
            TargetType = dto.TargetType,
            TargetId = dto.TargetId,
            Rating = dto.Rating,
            Comment = dto.Comment,
            GuestName = dto.GuestName,
            UserId = userId,
            IsApproved = true // Tự động duyệt
        };

        _context.Reviews.Add(review);
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("CREATE", "Review", new { reviewId = review.Id, review.TargetType, review.TargetId }, null, dto, $"Tự động duyệt đánh giá cho {dto.TargetType} #{dto.TargetId}.");

        // Gửi thông báo realtime đến tất cả các client (bao gồm Admin) qua SignalR
        await _hubContext.Clients.All.SendAsync("ReviewUpdated");

        return Ok(new { message = "Đã gửi đánh giá thành công." });
    }

    // --- ADMIN METHODS ---

    // GET /api/Reviews/admin
    [HttpGet("admin")]
    public async Task<IActionResult> GetAllForAdmin([FromQuery] bool? isApproved)
    {
        var query = _context.Reviews.Include(r => r.User).AsQueryable();
        
        if (isApproved.HasValue)
        {
            query = query.Where(r => r.IsApproved == isApproved.Value);
        }

        var reviews = await query
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new ReviewDto(
                r.Id,
                r.TargetType,
                r.TargetId,
                r.User != null ? r.User.FullName : (r.GuestName ?? "Khách vô danh"),
                r.Rating,
                r.Comment,
                r.IsApproved,
                r.CreatedAt
            ))
            .ToListAsync();

        return Ok(reviews);
    }

    // PUT /api/Reviews/admin/{id}/approve
    [HttpPut("admin/{id}/approve")]
    public async Task<IActionResult> ApproveReview(int id)
    {
        var review = await _context.Reviews.FindAsync(id);
        if (review == null) return NotFound();

        review.IsApproved = true;
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("UPDATE", "Review", new { reviewId = id }, new { isApproved = false }, new { isApproved = true }, $"Duyệt đánh giá #{id}.");
        return Ok(new { message = "Đã duyệt bình luận" });
    }

    // DELETE /api/Reviews/admin/{id}
    [HttpDelete("admin/{id}")]
    public async Task<IActionResult> DeleteReview(int id)
    {
        var review = await _context.Reviews.FindAsync(id);
        if (review == null) return NotFound();

        _context.Reviews.Remove(review);
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("DELETE", "Review", new { reviewId = id }, null, null, $"Xóa đánh giá #{id}.");
        return Ok(new { message = "Đã xóa bình luận" });
    }
}
