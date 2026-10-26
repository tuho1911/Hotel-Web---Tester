using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HotelManagementAPI.Data;

namespace HotelManagementAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DbFixController : ControllerBase
{
    private readonly AppDbContext _context;

    public DbFixController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("fix-notifications")]
    public async Task<IActionResult> FixNotifications()
    {
        try
        {
            await _context.Database.ExecuteSqlRawAsync(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Notifications]') AND name = 'title')
                ALTER TABLE [dbo].[Notifications] ADD [title] [nvarchar](255) NULL;
                
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Notifications]') AND name = 'content')
                ALTER TABLE [dbo].[Notifications] ADD [content] [nvarchar](max) NULL;
                
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Notifications]') AND name = 'reference_link')
                ALTER TABLE [dbo].[Notifications] ADD [reference_link] [varchar](255) NULL;
            ");
            
            await _context.Database.ExecuteSqlRawAsync(@"
                UPDATE [dbo].[Notifications] SET [title] = 'System' WHERE [title] IS NULL;
                UPDATE [dbo].[Notifications] SET [content] = '' WHERE [content] IS NULL;
            ");
            
            return Ok(new { message = "Database fixed successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("fix-reviews-time")]
    public async Task<IActionResult> FixReviewsTime()
    {
        try
        {
            // Cộng thêm 7 tiếng cho tất cả đánh giá được tạo trước thời điểm sửa đổi (21:28 ngày 18/5/2026)
            var affected = await _context.Database.ExecuteSqlRawAsync(@"
                UPDATE [dbo].[Reviews] 
                SET [created_at] = DATEADD(hour, 7, [created_at]) 
                WHERE [created_at] < '2026-05-18 21:28:00'
            ");
            return Ok(new { message = $"Đã sửa đổi thành công {affected} đánh giá cũ bị lệch múi giờ." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("seed-demo-presentation")]
    public async Task<IActionResult> SeedDemoPresentation()
    {
        try
        {
            var summary = await DemoPresentationSeeder.SeedAsync(HttpContext.RequestServices);
            return Ok(new
            {
                message = "Demo presentation data seeded successfully",
                summary
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("check-payments")]
    public async Task<IActionResult> CheckPayments()
    {
        try
        {
            var totalPayments = await _context.Payments.CountAsync();
            var sumPayments = await _context.Payments.SumAsync(p => (decimal?)p.AmountPaid) ?? 0m;
            
            var now = DateTime.UtcNow;
            var startOfMonth = new DateTime(now.Year, now.Month, 1);
            var monthPayments = await _context.Payments
                .Where(p => p.PaymentDate >= startOfMonth)
                .SumAsync(p => (decimal?)p.AmountPaid) ?? 0m;

            var recent = await _context.Payments
                .OrderByDescending(p => p.PaymentDate)
                .Take(5)
                .Select(p => new { p.Id, p.AmountPaid, p.PaymentDate })
                .ToListAsync();
            
            return Ok(new { 
                totalPayments, 
                sumPayments, 
                monthPayments,
                startOfMonthSearch = startOfMonth,
                serverUtcNow = DateTime.UtcNow,
                vietnamNow = Helpers.TimeHelper.Now,
                recent
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
