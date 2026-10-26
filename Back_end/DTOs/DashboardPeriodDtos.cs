using System.Text.Json;

namespace HotelManagementAPI.DTOs;

public class DashboardPeriodResponseDto
{
    public int Id { get; set; }
    public int RoleId { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public string DashboardCode { get; set; } = string.Empty;
    public string DashboardTitle { get; set; } = string.Empty;
    public string PeriodType { get; set; } = string.Empty;
    public string PeriodKey { get; set; } = string.Empty;
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsCurrent { get; set; }
    public int Version { get; set; }
    public DateTime UpdatedAt { get; set; }
    public JsonElement? Dashboard { get; set; }
    public JsonElement? Comparison { get; set; }
}

public class DashboardHistoryItemDto
{
    public int Id { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public string DashboardCode { get; set; } = string.Empty;
    public string PeriodType { get; set; } = string.Empty;
    public string PeriodKey { get; set; } = string.Empty;
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsCurrent { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class DashboardRebuildRequestDto
{
    public string RoleName { get; set; } = "Manager";
    public string PeriodType { get; set; } = "MONTHLY";
    public DateTime? OccurredAtUtc { get; set; }
}

public class DashboardRefreshRequestDto
{
    public int? RoleId { get; set; }
    public string? RoleName { get; set; }
    public string PeriodType { get; set; } = "MONTHLY";
    public string? PeriodKey { get; set; }
    public DateTime? OccurredAtUtc { get; set; }
}

public class DashboardEventRequestDto
{
    public string EventType { get; set; } = string.Empty;
    public DateTime? OccurredAtUtc { get; set; }
    public int? RefId { get; set; }
}
