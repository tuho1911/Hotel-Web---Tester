using HotelManagementAPI.Data;
using HotelManagementAPI.DTOs;
using HotelManagementAPI.Middleware;
using HotelManagementAPI.Models;
using HotelManagementAPI.Enums;
using HotelManagementAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HotelManagementAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // Tất cả endpoint cần đăng nhập
[RequirePermission("MANAGE_ROLES")]
public class RolesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly IAuditLogService _auditLogService;

    public RolesController(AppDbContext context, INotificationService notificationService, IAuditLogService auditLogService)
    {
        _context = context;
        _notificationService = notificationService;
        _auditLogService = auditLogService;
    }

    // --- QUẢN LÝ ROLE ---

    // GET /api/Roles (Admin Only)
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var roles = await _context.Roles
            .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
            .ToListAsync();

        var result = roles.Select(r => new RoleResponseDto(
            r.Id,
            r.Name,
            r.Description,
            r.RolePermissions.Select(rp => rp.Permission!.Name).ToList()
        ));

        return Ok(result);
    }

    // GET /api/Roles/{id} (Admin Only)
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var role = await _context.Roles
            .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (role == null) return NotFound(new { message = "Role không tồn tại" });

        var result = new RoleResponseDto(
            role.Id,
            role.Name,
            role.Description,
            role.RolePermissions.Select(rp => rp.Permission!.Name).ToList()
        );

        return Ok(result);
    }

    // POST /api/Roles (Admin Only)
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRoleDto dto)
    {
        if (await _context.Roles.AnyAsync(r => r.Name == dto.Name))
            return BadRequest(new { message = "Tên Role đã tồn tại" });

        var role = new Role
        {
            Name = dto.Name,
            Description = dto.Description
        };

        _context.Roles.Add(role);
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("CREATE", "Role", new { roleId = role.Id, role.Name }, null, dto, $"Tạo role {role.Name}.");

        return CreatedAtAction(nameof(GetById), new { id = role.Id }, role);
    }

    // PUT /api/Roles/{id} (Admin Only)
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateRoleDto dto)
    {
        var role = await _context.Roles.FindAsync(id);
        if (role == null) return NotFound(new { message = "Role không tồn tại" });

        // Không cho sửa tên Role "Admin" hệ thống (nếu muốn bảo mật)
        if (role.Name == "Admin" && dto.Name != "Admin")
            return BadRequest(new { message = "Không thể đổi tên Role hệ thống Admin" });

        role.Name = dto.Name;
        role.Description = dto.Description;

        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("UPDATE", "Role", new { roleId = id, role.Name }, dto, role, $"Cập nhật role {role.Name}.");
        return Ok(role);
    }

    // DELETE /api/Roles/{id} (Admin Only)
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var role = await _context.Roles.Include(r => r.Users).FirstOrDefaultAsync(r => r.Id == id);
        if (role == null) return NotFound(new { message = "Role không tồn tại" });

        if (role.Name == "Admin")
            return BadRequest(new { message = "Không thể xóa Role quản trị hệ thống" });

        if (role.Users.Any())
            return BadRequest(new { message = "Không thể xóa Role đang có người dùng sử dụng" });

        _context.Roles.Remove(role);
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("DELETE", "Role", new { roleId = id, role.Name }, null, null, $"Xóa role {role.Name}.");

        return Ok(new { message = "Đã xóa Role thành công" });
    }

    // --- QUẢN LÝ PERMISSION ---

    // GET /api/Roles/permissions (Admin Only)
    [HttpGet("permissions")]
    public async Task<IActionResult> GetAllPermissions()
    {
        var permissions = await _context.Permissions
            .Select(p => new PermissionResponseDto(p.Id, p.Name))
            .ToListAsync();
        return Ok(permissions);
    }

    // POST /api/Roles/assign-permission  ← (Admin Only)
    [HttpPost("assign-permission")]
    public async Task<IActionResult> AssignPermission([FromBody] AssignPermissionDto dto)
    {
        var role = await _context.Roles.AnyAsync(r => r.Id == dto.RoleId);
        if (!role) return NotFound(new { message = "Role không tồn tại" });

        var permission = await _context.Permissions.AnyAsync(p => p.Id == dto.PermissionId);
        if (!permission) return NotFound(new { message = "Permission không tồn tại" });

        var existing = await _context.RolePermissions
            .FirstOrDefaultAsync(rp => rp.RoleId == dto.RoleId && rp.PermissionId == dto.PermissionId);

        if (existing != null)
            return BadRequest(new { message = "Role đã có quyền này rồi" });

        var rolePermission = new RolePermission
        {
            RoleId = dto.RoleId,
            PermissionId = dto.PermissionId
        };

        _context.RolePermissions.Add(rolePermission);
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("CREATE", "RolePermission", new { dto.RoleId, dto.PermissionId }, null, dto, $"Gán quyền cho role #{dto.RoleId}.");

        // Notify users
        try {
            var roleName = await _context.Roles.Where(r => r.Id == dto.RoleId).Select(r => r.Name).FirstOrDefaultAsync();
            var permissionName = await _context.Permissions.Where(p => p.Id == dto.PermissionId).Select(p => p.Name).FirstOrDefaultAsync();
            
            // 1. Notify affected users in the role
            await _notificationService.SendToRoleAsync(dto.RoleId, "Cập nhật quyền hạn nhóm", $"Quyền [{permissionName}] đã được thêm vào nhóm [{roleName}]", NotificationType.PermissionUpdate);
            
            // 2. Notify Admin and Manager roles
            await _notificationService.SendToRolesAndUserAsync(
                new List<string> { "Admin", "Manager" },
                null,
                HotelManagementAPI.Enums.NotificationAction.UpdateRolePermissions,
                NotificationType.PermissionUpdate,
                roleName ?? "Unknown Role"
            );
        } catch (Exception ex) {
            Console.WriteLine($"[AssignPermission Notification Error]: {ex.Message}");
        }

        return Ok(new { message = "Gán quyền thành công" });
    }

    // DELETE /api/Roles/remove-permission (Admin Only)
    [HttpDelete("remove-permission")]
    public async Task<IActionResult> RemovePermission([FromBody] RemovePermissionDto dto)
    {
        var rolePermission = await _context.RolePermissions
            .FirstOrDefaultAsync(rp => rp.RoleId == dto.RoleId && rp.PermissionId == dto.PermissionId);

        if (rolePermission == null)
            return NotFound(new { message = "Quyền này chưa được gán cho Role" });

        _context.RolePermissions.Remove(rolePermission);
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("DELETE", "RolePermission", new { dto.RoleId, dto.PermissionId }, null, null, $"Gỡ quyền khỏi role #{dto.RoleId}.");

        // Notify users
        try {
            var roleName = await _context.Roles.Where(r => r.Id == dto.RoleId).Select(r => r.Name).FirstOrDefaultAsync();
            var permissionName = await _context.Permissions.Where(p => p.Id == dto.PermissionId).Select(p => p.Name).FirstOrDefaultAsync();
            
            // 1. Notify affected users
            await _notificationService.SendToRoleAsync(dto.RoleId, "Cập nhật quyền hạn nhóm", $"Quyền [{permissionName}] đã bị gỡ khỏi nhóm [{roleName}]", NotificationType.PermissionUpdate);
            
            // 2. Notify Admin and Manager roles
            await _notificationService.SendToRolesAndUserAsync(
                new List<string> { "Admin", "Manager" },
                null, 
                HotelManagementAPI.Enums.NotificationAction.UpdateRolePermissions,
                NotificationType.PermissionUpdate,
                roleName ?? "Unknown Role"
            );
        } catch (Exception ex) {
            Console.WriteLine($"[RemovePermission Notification Error]: {ex.Message}");
        }

        return Ok(new { message = "Gỡ quyền thành công" });
    }

    // GET /api/Roles/my-permissions  ← Bất kỳ user đã đăng nhập
    [HttpGet("my-permissions")]
    public IActionResult GetMyPermissions()
    {
        var permissions = User.Claims
            .Where(c => c.Type == "permission")
            .Select(c => c.Value)
            .ToList();

        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        return Ok(new
        {
            userId = int.Parse(userIdString ?? "0"),
            role,
            permissions
        });
    }
}
