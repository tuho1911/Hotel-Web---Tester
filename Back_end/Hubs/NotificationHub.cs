using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace HotelManagementAPI.Hubs;

[Authorize]
public class NotificationHub : Hub
{
    // Hub này dùng để người dùng kết nối qua WebSockets
    // ID người dùng sẽ được lấy từ JWT Token (Context.User)
    
    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        var role = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

        if (!string.IsNullOrEmpty(role))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, role);
            Console.WriteLine($"[SignalR] Client Connected. ConnectionId: {Context.ConnectionId}, UserId: {userId}, Role: {role}");
        }
        else
        {
            Console.WriteLine($"[SignalR] Client Connected but without a valid Role. ConnectionId: {Context.ConnectionId}, UserId: {userId}");
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(System.Exception? exception)
    {
        var role = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

        if (!string.IsNullOrEmpty(role))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, role);
            System.Console.WriteLine($"[SignalR] Client Disconnected. ConnectionId: {Context.ConnectionId}, Role: {role}");
        }

        await base.OnDisconnectedAsync(exception);
    }
}
