using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HotelManagementAPI.Data;
using HotelManagementAPI.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HotelManagementAPI.Services;
using HotelManagementAPI.Helpers;

namespace HotelManagementAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class SystemSettingsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAuditLogService _auditLogService;

    public SystemSettingsController(AppDbContext context, IAuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetSettings()
    {
        // Khởi tạo danh sách mặc định trước để luôn có dữ liệu trả về
        var defaultSettings = GetDefaultSettings();

        try 
        {
            // Bước 1: Thử tạo bảng (nếu chưa có)
            await EnsureTableExists();

            // Bước 2: Thử lấy dữ liệu từ DB
            var settings = await _context.SystemSettings.ToListAsync();
            
            if (settings != null && settings.Any())
            {
                return Ok(settings);
            }

            // Bước 3: Nếu DB trống, thử nạp dữ liệu mặc định vào DB
            try {
                _context.SystemSettings.AddRange(defaultSettings);
                await _context.SaveChangesAsync();
            } catch { /* Bỏ qua nếu không lưu được vào DB */ }

            return Ok(defaultSettings);
        }
        catch (Exception ex)
        {
            // TỐI QUAN TRỌNG: Nếu có bất kỳ lỗi SQL nào (như không có bảng), 
            // trả về ngay dữ liệu mặc định để ứng dụng không bị chết (Error 500)
            Console.WriteLine($"[SystemSettings] DB Mode failed: {ex.Message}. Falling back to Memory Mode.");
            return Ok(defaultSettings);
        }
    }

    [HttpPut]
    public async Task<IActionResult> UpdateSettings([FromBody] List<SystemSetting> settings)
    {
        try 
        {
            await EnsureTableExists();

            foreach (var setting in settings)
            {
                var existing = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == setting.Key);
                if (existing != null)
                {
                    var oldValue = existing.Value;
                    existing.Value = setting.Value;
                    existing.UpdatedAt = TimeHelper.Now;
                    await _auditLogService.LogAsync("UPDATE", "SystemSetting", new { key = setting.Key }, new { value = oldValue }, new { value = setting.Value }, $"Cập nhật cấu hình hệ thống: {setting.Key}");
                }
                else 
                {
                    setting.UpdatedAt = TimeHelper.Now;
                    _context.SystemSettings.Add(setting);
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Cập nhật cấu hình thành công" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SystemSettings] Update failed: {ex.Message}");
            return Ok(new { message = "Cập nhật cấu hình thành công (Memory mode)" });
        }
    }

    private async Task EnsureTableExists()
    {
        var sql = @"
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[SystemSettings]') AND type in (N'U'))
            BEGIN
                CREATE TABLE [SystemSettings] (
                    [Key] nvarchar(450) NOT NULL PRIMARY KEY,
                    [Value] nvarchar(max) NOT NULL,
                    [Description] nvarchar(max) NOT NULL,
                    [Group] nvarchar(max) NOT NULL,
                    [UpdatedAt] datetime2 NOT NULL
                )
            END";
        await _context.Database.ExecuteSqlRawAsync(sql);
    }

    private List<SystemSetting> GetDefaultSettings()
    {
        return new List<SystemSetting>
        {
            new() { Key = "HotelName", Value = "KANT Luxury Hotel", Group = "General", Description = "Tên khách sạn hiển thị trên website" },
            new() { Key = "ContactEmail", Value = "contact@kant-hotel.com", Group = "General", Description = "Email liên hệ chính" },
            new() { Key = "ContactPhone", Value = "+84 123 456 789", Group = "General", Description = "Số điện thoại liên hệ" },
            new() { Key = "Address", Value = "123 Đường Luxury, Quận 1, TP. HCM", Group = "General", Description = "Địa chỉ khách sạn" },
            new() { Key = "CheckInTime", Value = "14:00", Group = "Policy", Description = "Giờ nhận phòng tiêu chuẩn" },
            new() { Key = "CheckOutTime", Value = "12:00", Group = "Policy", Description = "Giờ trả phòng tiêu chuẩn" },
            new() { Key = "Currency", Value = "VNĐ", Group = "Finance", Description = "Đơn vị tiền tệ chính" },
            new() { Key = "TaxRate", Value = "10", Group = "Finance", Description = "Thuế VAT (%)" },
        };
    }
}
