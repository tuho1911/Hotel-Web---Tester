namespace HotelManagementAPI.DTOs;

public record AuditLogResponseDto(
    Guid EventId,
    DateTime Timestamp,
    string ActionType,
    string EntityType,
    object? Context,
    object? Changes,
    string Message,
    int? UserId,
    string? UserName,
    string? IpAddress);

public sealed class AuditLogQueryDto
{
    public string? ActionType { get; init; }
    public string? EntityType { get; init; }
    public DateTime? From { get; init; }
    public DateTime? To { get; init; }
    public string? Search { get; init; }
    public string? UserName { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}
