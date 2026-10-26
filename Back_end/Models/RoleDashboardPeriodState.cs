using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagementAPI.Models;

[Table("Role_Dashboard_Period_States")]
public class RoleDashboardPeriodState
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("role_id")]
    public int RoleId { get; set; }

    [Column("role_name")]
    [MaxLength(100)]
    public string RoleName { get; set; } = string.Empty;

    [Column("dashboard_code")]
    [MaxLength(100)]
    public string DashboardCode { get; set; } = string.Empty;

    [Column("dashboard_title")]
    [MaxLength(255)]
    public string DashboardTitle { get; set; } = string.Empty;

    [Column("period_type")]
    [MaxLength(20)]
    public string PeriodType { get; set; } = string.Empty;

    [Column("period_key")]
    [MaxLength(30)]
    public string PeriodKey { get; set; } = string.Empty;

    [Column("period_start")]
    public DateTime PeriodStart { get; set; }

    [Column("period_end")]
    public DateTime PeriodEnd { get; set; }

    [Column("dashboard_json")]
    public string DashboardJson { get; set; } = "{}";

    [Column("comparison_json")]
    public string? ComparisonJson { get; set; }

    [Column("status")]
    [MaxLength(20)]
    public string Status { get; set; } = "OPEN";

    [Column("is_current")]
    public bool IsCurrent { get; set; }

    [Column("last_event_type")]
    [MaxLength(100)]
    public string? LastEventType { get; set; }

    [Column("last_event_source")]
    [MaxLength(100)]
    public string? LastEventSource { get; set; }

    [Column("last_event_ref_id")]
    public int? LastEventRefId { get; set; }

    [Column("version")]
    public int Version { get; set; } = 1;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    [Column("closed_at")]
    public DateTime? ClosedAt { get; set; }

    [Column("updated_by")]
    public int? UpdatedBy { get; set; }

    [ForeignKey(nameof(RoleId))]
    public Role? Role { get; set; }

    [ForeignKey(nameof(UpdatedBy))]
    public User? UpdatedByUser { get; set; }
}
