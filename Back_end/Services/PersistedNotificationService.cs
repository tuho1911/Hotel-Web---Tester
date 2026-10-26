using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HotelManagementAPI.Data;
using HotelManagementAPI.Enums;
using HotelManagementAPI.Hubs;
using HotelManagementAPI.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using HotelManagementAPI.Helpers;

namespace HotelManagementAPI.Services;

public class PersistedNotificationService : INotificationService
{
    private readonly AppDbContext _context;
    private readonly IHubContext<NotificationHub> _hubContext;

    public PersistedNotificationService(AppDbContext context, IHubContext<NotificationHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    public async Task SendNotificationAsync(
        int? userId,
        string title,
        string content,
        NotificationType type = NotificationType.Info,
        string? referenceLink = null)
    {
        try
        {
            var notification = new Notification
            {
                UserId = userId,
                Title = title,
                Content = content,
                Type = type,
                ReferenceLink = referenceLink,
                CreatedAt = TimeHelper.Now,
                IsRead = false
            };

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            if (userId.HasValue)
            {
                await _hubContext.Clients.User(userId.Value.ToString())
                    .SendAsync("ReceiveNotification", ToPayload(notification));
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PersistedNotificationService Error]: {ex.Message}");
        }
    }

    public async Task SendToRoleAsync(
        int roleId,
        string title,
        string content,
        NotificationType type = NotificationType.Info,
        string? referenceLink = null)
    {
        var userIds = await _context.Users
            .Where(u => u.RoleId == roleId)
            .Select(u => u.Id)
            .ToListAsync();

        if (userIds.Count == 0)
        {
            return;
        }

        await CreateAndSendPerUserAsync(userIds, title, content, type, referenceLink);
    }

    public async Task SendToRolesAndUserAsync(
        List<string> roles,
        int? targetUserId,
        NotificationAction action,
        NotificationType type,
        string actorName,
        string? referenceLink = null)
    {
        try
        {
            var (title, content) = GenerateMessage(action, actorName);

            var normalizedRoles = roles
                .Where(role => !string.IsNullOrWhiteSpace(role))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            var recipientIds = await _context.Users
                .Where(u => u.Role != null && normalizedRoles.Contains(u.Role.Name))
                .Select(u => u.Id)
                .Distinct()
                .ToListAsync();

            if (targetUserId.HasValue && !recipientIds.Contains(targetUserId.Value))
            {
                recipientIds.Add(targetUserId.Value);
            }

            if (recipientIds.Count == 0)
            {
                return;
            }

            await CreateAndSendPerUserAsync(recipientIds, title, content, type, referenceLink);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PersistedNotificationService Error]: {ex.Message}");
        }
    }

    public async Task SendToRoleByNameAsync(
        string roleName,
        string title,
        string content,
        NotificationType type = NotificationType.Info,
        string? referenceLink = null)
    {
        var roleId = await _context.Roles
            .Where(r => r.Name == roleName)
            .Select(r => r.Id)
            .FirstOrDefaultAsync();

        if (roleId == 0)
        {
            return;
        }

        await SendToRoleAsync(roleId, title, content, type, referenceLink);
    }

    private async Task CreateAndSendPerUserAsync(
        IEnumerable<int> userIds,
        string title,
        string content,
        NotificationType type,
        string? referenceLink)
    {
        var notifications = userIds
            .Distinct()
            .Select(userId => new Notification
            {
                UserId = userId,
                Title = title,
                Content = content,
                Type = type,
                ReferenceLink = referenceLink,
                CreatedAt = TimeHelper.Now,
                IsRead = false
            })
            .ToList();

        _context.Notifications.AddRange(notifications);
        await _context.SaveChangesAsync();

        foreach (var notification in notifications)
        {
            await _hubContext.Clients.User(notification.UserId!.Value.ToString())
                .SendAsync("ReceiveNotification", ToPayload(notification));
        }
    }

    private static object ToPayload(Notification notification) => new
    {
        notification.Id,
        notification.Title,
        notification.Content,
        Type = notification.Type.ToString(),
        notification.ReferenceLink,
        notification.CreatedAt,
        notification.IsRead
    };

    private static (string Title, string Content) GenerateMessage(NotificationAction action, string actorName)
    {
        return action switch
        {
            NotificationAction.CreateAccount => ("Tài khoản mới", $"Tài khoản {actorName} đã được thêm vào hệ thống"),
            NotificationAction.LockAccount => ("Tài khoản bị khóa", $"Tài khoản {actorName} đã bị vô hiệu hóa"),
            NotificationAction.ChangeRole => ("Cập nhật quyền hạn", $"Quyền của {actorName} đã được thay đổi"),
            NotificationAction.UnlockAccount => ("Tài khoản đã kích hoạt", $"Tài khoản {actorName} đã được kích hoạt trở lại"),
            NotificationAction.ResetPassword => ("Cập nhật mật khẩu", $"Mật khẩu của {actorName} đã được đặt lại"),
            NotificationAction.CheckIn => ("Check-in phòng", $"Khách hàng {actorName} đã check-in thành công"),
            NotificationAction.CheckOut => ("Check-out phòng", $"Khách hàng {actorName} đã check-out thành công"),
            NotificationAction.UpdateRolePermissions => ("Cập nhật quyền hệ thống", $"Quyền hạn của nhóm '{actorName}' vừa được thay đổi"),
            _ => ("Thông báo", $"Có cập nhật mới liên quan đến {actorName}")
        };
    }
}
