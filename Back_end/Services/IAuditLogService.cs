using HotelManagementAPI.DTOs;
using HotelManagementAPI.Models;

namespace HotelManagementAPI.Services;

public interface IAuditLogService
{
    Task LogAsync(string actionType, string entityType, object? context, object? oldData, object? newData, string message);
    Task<(int TotalEvents, List<AuditLogResponseDto> Events)> GetEventsAsync(AuditLogQueryDto query);
    Task<string> ExportAsync(AuditLogQueryDto query);
    Task<int> CleanupAsync(int keepDays = 90);
}
