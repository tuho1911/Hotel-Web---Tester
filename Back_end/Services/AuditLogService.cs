using System.Text.Json;
using HotelManagementAPI.Data;
using HotelManagementAPI.DTOs;
using HotelManagementAPI.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using HotelManagementAPI.Helpers;

namespace HotelManagementAPI.Services;

public class AuditLogService : IAuditLogService
{
    private readonly AppDbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuditLogService(AppDbContext context, IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task LogAsync(string actionType, string entityType, object? context, object? previousValues, object? newValues, string message)
    {
        var httpContext = _httpContextAccessor.HttpContext;
        var userIdString = httpContext?.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var userName = httpContext?.User?.Identity?.Name ?? httpContext?.User?.FindFirst("fullName")?.Value;
        var ipAddress = httpContext?.Connection?.RemoteIpAddress?.ToString();

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            Timestamp = TimeHelper.Now,
            ActionType = actionType,
            EntityType = entityType,
            ContextJson = Serialize(context),
            ChangesJson = Serialize(new { previousValues, newValues }),
            Message = message,
            UserId = !string.IsNullOrEmpty(userIdString) ? int.Parse(userIdString) : null,
            UserName = userName,
            IpAddress = ipAddress
        });
        await _context.SaveChangesAsync();
    }

    public async Task<(int TotalEvents, List<AuditLogResponseDto> Events)> GetEventsAsync(AuditLogQueryDto query)
    {
        var q = _context.AuditLogs.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(query.ActionType)) q = q.Where(x => x.ActionType == query.ActionType);
        if (!string.IsNullOrWhiteSpace(query.EntityType)) q = q.Where(x => x.EntityType == query.EntityType);
        if (query.From.HasValue) q = q.Where(x => x.Timestamp >= query.From.Value);
        if (query.To.HasValue) q = q.Where(x => x.Timestamp <= query.To.Value);
        if (!string.IsNullOrWhiteSpace(query.UserName)) q = q.Where(x => x.UserName != null && x.UserName.Contains(query.UserName));
        if (!string.IsNullOrWhiteSpace(query.Search)) q = q.Where(x => x.Message.Contains(query.Search) || (x.UserName != null && x.UserName.Contains(query.Search)));

        var total = await q.CountAsync();
        var events = await q.OrderByDescending(x => x.Timestamp)
            .Skip((Math.Max(query.Page, 1) - 1) * Math.Clamp(query.PageSize, 1, 200))
            .Take(Math.Clamp(query.PageSize, 1, 200))
            .Select(x => new AuditLogResponseDto(
                x.Id, 
                x.Timestamp, 
                x.ActionType, 
                x.EntityType, 
                JsonSerializer.Deserialize<object>(x.ContextJson ?? "{}"), 
                JsonSerializer.Deserialize<object>(x.ChangesJson ?? "{}"), 
                x.Message,
                x.UserId,
                x.UserName,
                x.IpAddress))
            .ToListAsync();
        return (total, events);
    }

    public async Task<string> ExportAsync(AuditLogQueryDto query)
    {
        var events = await GetEventsAsync(new AuditLogQueryDto { ActionType = query.ActionType, EntityType = query.EntityType, From = query.From, To = query.To, Search = query.Search, Page = 1, PageSize = 1000 });
        return JsonSerializer.Serialize(new { events.TotalEvents, Events = events.Events }, new JsonSerializerOptions { WriteIndented = true });
    }

    public async Task<int> CleanupAsync(int keepDays = 90)
    {
        var cutoff = TimeHelper.Now.AddDays(-keepDays);
        var old = await _context.AuditLogs.Where(x => x.Timestamp < cutoff).ToListAsync();
        _context.AuditLogs.RemoveRange(old);
        return await _context.SaveChangesAsync();
    }

    private static string? Serialize(object? value) => value is null ? null : JsonSerializer.Serialize(value);
}
