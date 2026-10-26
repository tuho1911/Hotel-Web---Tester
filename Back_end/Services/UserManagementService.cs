using HotelManagementAPI.Data;
using HotelManagementAPI.DTOs;
using HotelManagementAPI.Models;
using HotelManagementAPI.Enums;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementAPI.Services;

public class UserManagementService : IUserManagementService
{
    private readonly AppDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly IEmailService _emailService;

    public UserManagementService(AppDbContext context, INotificationService notificationService, IEmailService emailService)
    {
        _context = context;
        _notificationService = notificationService;
        _emailService = emailService;
    }

    public async Task<IEnumerable<UserResponseDto>> GetAllUsersAsync()
    {
        return await _context.Users
            .Include(u => u.Role)
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => MapToDto(u))
            .ToListAsync();
    }

    public async Task<UserResponseDto?> GetUserByIdAsync(int id)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == id);
        return user == null ? null : MapToDto(user);
    }

    public async Task<UserResponseDto> CreateUserAsync(CreateUserDto dto)
    {
        if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
            throw new InvalidOperationException("Email đã tồn tại trong hệ thống");

        var user = new User
        {
            FullName = dto.FullName,
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Phone = dto.Phone,
            RoleId = dto.RoleId,
            Status = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        await _context.Entry(user).Reference(u => u.Role).LoadAsync();

        // Gửi Email thông báo tài khoản
        try
        {
            string subject = "Chào mừng bạn đến với hệ thống quản lý khách sạn";
            string body = $@"
                <h3>Chào mừng <b>{dto.FullName}</b>!</h3>
                <p>Tài khoản của bạn đã được tạo thành công bởi Admin.</p>
                <p>Dưới đây là thông tin đăng nhập của bạn:</p>
                <ul>
                    <li><b>Email:</b> {dto.Email}</li>
                    <li><b>Mật khẩu:</b> {dto.Password}</li>
                </ul>
                <p>Vui lòng đăng nhập và bảo mật thông tin tài khoản của bạn.</p>";
            
            await _emailService.SendEmailAsync(dto.Email, subject, body);
        }
        catch (Exception ex)
        {
            // Log lỗi gửi mail nhưng không làm gián đoạn quá trình tạo user
            Console.WriteLine($"Lỗi gửi email: {ex.Message}");
        }

        // Gửi thông báo đến Admin và Manager
        try
        {
            await _notificationService.SendToRolesAndUserAsync(
                new List<string> { "Admin", "Manager" },
                null,
                NotificationAction.CreateAccount,
                NotificationType.Info,
                user.FullName,
                $"/admin/users"
            );
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CreateUser Notification Error]: {ex.Message}");
        }

        return MapToDto(user);
    }

    public async Task<UserResponseDto?> UpdateUserAsync(int id, UpdateUserDto dto)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return null;

        bool wasActive = user.Status;

        user.FullName = dto.FullName;
        user.Phone = dto.Phone;
        user.Status = dto.Status;

        if (!string.IsNullOrEmpty(dto.Password))
        {
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            
            try
            {
                string subject = "Thông báo thay đổi mật khẩu";
                string body = $@"
                    <h3>Chào <b>{user.FullName}</b>!</h3>
                    <p>Mật khẩu tài khoản của bạn trên hệ thống đã được thay đổi bởi Admin.</p>
                    <p>Dưới đây là thông tin đăng nhập mới của bạn:</p>
                    <ul>
                        <li><b>Email:</b> {user.Email}</li>
                        <li><b>Mật khẩu mới:</b> {dto.Password}</li>
                    </ul>
                    <p>Vui lòng đăng nhập bằng mật khẩu mới này.</p>";
                
                await _emailService.SendEmailAsync(user.Email, subject, body);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi gửi email: {ex.Message}");
            }
        }

        await _context.SaveChangesAsync();

        // Gửi thông báo nếu tài khoản bị khóa
        if (wasActive && !dto.Status)
        {
            await _notificationService.SendNotificationAsync(
                user.Id,
                "Tài khoản bị khóa",
                "Tài khoản của bạn đã bị khóa bởi Admin. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.",
                NotificationType.Security
            );

            // Gửi thông báo đến Admin và Manager
            await _notificationService.SendToRolesAndUserAsync(
                new List<string> { "Admin", "Manager" },
                null,
                NotificationAction.LockAccount,
                NotificationType.Security,
                user.FullName
            );
        }
        // Gửi thông báo nếu tài khoản được mở khóa
        else if (!wasActive && dto.Status)
        {
            await _notificationService.SendToRolesAndUserAsync(
                new List<string> { "Admin", "Manager" },
                null,
                NotificationAction.UnlockAccount,
                NotificationType.Account,
                user.FullName
            );
        }

        await _context.Entry(user).Reference(u => u.Role).LoadAsync();
        return MapToDto(user);
    }

    public async Task<bool> DeleteUserAsync(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return false;

        if (!user.Status)
        {
            return true;
        }

        user.Status = false;
        await _context.SaveChangesAsync();

        await _notificationService.SendNotificationAsync(
            user.Id,
            "Tài khoản bị khóa",
            "Tài khoản của bạn đã bị khóa bởi Admin. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.",
            NotificationType.Security
        );

        await _notificationService.SendToRolesAndUserAsync(
            new List<string> { "Admin", "Manager" },
            null,
            NotificationAction.LockAccount,
            NotificationType.Security,
            user.FullName
        );

        return true;
    }

    public async Task<bool> ChangeUserRoleAsync(int userId, int roleId)
    {
        var user = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return false;

        var roleExists = await _context.Roles.AnyAsync(r => r.Id == roleId);
        if (!roleExists) return false;

        var oldRoleName = user.Role?.Name ?? "N/A";
        var newRole = await _context.Roles.FindAsync(roleId);

        user.RoleId = roleId;
        await _context.SaveChangesAsync();

        // Thông báo khi quyền thay đổi
        await _notificationService.SendNotificationAsync(
            userId,
            "Cập nhật quyền hạn",
            $"Quyền của bạn đã được thay đổi từ [{oldRoleName}] sang [{newRole?.Name}].",
            NotificationType.PermissionUpdate
        );

        // Thông báo bằng Group Broadcast đến Admin và Manager
        await _notificationService.SendToRolesAndUserAsync(
            new List<string> { "Admin", "Manager" },
            null,
            NotificationAction.ChangeRole,
            NotificationType.PermissionUpdate,
            user.FullName
        );

        return true;
    }

    public async Task<IEnumerable<UserResponseDto>> FilterUsersAsync(
        string? phone, string? email, bool? status)
    {
        var query = _context.Users.Include(u => u.Role).AsQueryable();

        if (!string.IsNullOrWhiteSpace(phone))
            query = query.Where(u => u.Phone != null && u.Phone.Contains(phone));

        if (!string.IsNullOrWhiteSpace(email))
            query = query.Where(u => u.Email.Contains(email));

        if (status.HasValue)
            query = query.Where(u => u.Status == status.Value);

        return await query
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => MapToDto(u))
            .ToListAsync();
    }

    public async Task<(IEnumerable<UserResponseDto> Data, int Total)> FilterUsersPagedAsync(
        string? phone, string? email, bool? status, int page, int pageSize)
    {
        var query = _context.Users.Include(u => u.Role).AsQueryable();

        if (!string.IsNullOrWhiteSpace(phone))
            query = query.Where(u => u.Phone != null && u.Phone.Contains(phone));

        if (!string.IsNullOrWhiteSpace(email))
            query = query.Where(u => u.Email.Contains(email));

        if (status.HasValue)
            query = query.Where(u => u.Status == status.Value);

        var total = await query.CountAsync();

        var data = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => MapToDto(u))
            .ToListAsync();

        return (data, total);
    }

    private static UserResponseDto MapToDto(User u) => new(
        u.Id,
        u.FullName,
        u.Email,
        u.Phone,
        u.Role?.Name,
        u.RoleId,
        u.Status,
        u.AvatarUrl,
        u.CreatedAt
    );
}
