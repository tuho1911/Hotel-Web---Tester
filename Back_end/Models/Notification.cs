using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

using HotelManagementAPI.Enums;

namespace HotelManagementAPI.Models;

[Table("Notifications")]
public class Notification
{   
    public int Id { get; set; }
    
    // Null = thông báo broadcast toàn hệ thống
    public int? UserId { get; set; }
    
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    
    public NotificationType Type { get; set; } = NotificationType.Info;
    
    public string? ReferenceLink { get; set; }
    
    public bool IsRead { get; set; } = false;
    
    public DateTime CreatedAt { get; set; } = Helpers.TimeHelper.Now;

    public User? User { get; set; }
}