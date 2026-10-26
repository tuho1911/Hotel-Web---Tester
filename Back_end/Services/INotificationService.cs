using HotelManagementAPI.Enums;

namespace HotelManagementAPI.Services;

public interface INotificationService
{
    Task SendNotificationAsync(int? userId, string title, string content, NotificationType type = NotificationType.Info, string? referenceLink = null);
    Task SendToRoleAsync(int roleId, string title, string content, NotificationType type = NotificationType.Info, string? referenceLink = null);
    Task SendToRolesAndUserAsync(List<string> roles, int? targetUserId, NotificationAction action, NotificationType type, string actorName, string? referenceLink = null);
    Task SendToRoleByNameAsync(string roleName, string title, string content, NotificationType type = NotificationType.Info, string? referenceLink = null);
}
