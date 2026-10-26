using HotelManagementAPI.DTOs;
using HotelManagementAPI.Middleware;
using HotelManagementAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelManagementAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[RequirePermission("MANAGE_USERS")]
public class UserManagementController : ControllerBase
{
    private readonly IUserManagementService _userService;
    private readonly IAuditLogService _auditLogService;

    public UserManagementController(IUserManagementService userService, IAuditLogService auditLogService)
    {
        _userService = userService;
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _userService.GetAllUsersAsync();
        return Ok(result);
    }

    // GET /api/UserManagement/filter?phone=...&email=...&status=true/false
    [HttpGet("filter")]
    public async Task<IActionResult> Filter(
        [FromQuery] string? phone,
        [FromQuery] string? email,
        [FromQuery] bool? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var (data, total) = await _userService.FilterUsersPagedAsync(phone, email, status, page, pageSize);
        return Ok(new FilterUsersResponseDto(data, total, page, pageSize));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _userService.GetUserByIdAsync(id);
        if (result == null) return NotFound(new { message = "Người dùng không tồn tại" });
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserDto dto)
    {
        var result = await _userService.CreateUserAsync(dto);
        await _auditLogService.LogAsync("CREATE", "User", new { userId = result.Id, result.Email }, null, dto, $"Tạo người dùng {result.Email}.");
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateUserDto dto)
    {
        var currentUserIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (currentUserIdClaim != null && int.TryParse(currentUserIdClaim.Value, out int currentUserId))
        {
            if (currentUserId == id && !dto.Status)
            {
                return BadRequest(new { message = "Bạn không thể tự khóa tài khoản của chính mình" });
            }
        }

        var result = await _userService.UpdateUserAsync(id, dto);
        if (result == null) return NotFound(new { message = "Người dùng không tồn tại" });
        await _auditLogService.LogAsync("UPDATE", "User", new { userId = id, result.Email }, dto, result, $"Cập nhật người dùng {result.Email}.");
        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var currentUserIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (currentUserIdClaim != null && int.TryParse(currentUserIdClaim.Value, out int currentUserId))
        {
            if (currentUserId == id)
            {
                return BadRequest(new { message = "Bạn không thể tự khóa tài khoản của chính mình" });
            }
        }

        var result = await _userService.DeleteUserAsync(id);
        if (!result) return NotFound(new { message = "Người dùng không tồn tại" });
        await _auditLogService.LogAsync("DELETE", "User", new { userId = id }, null, null, $"Khóa tài khoản #{id}.");
        return Ok(new { message = "Đã khóa tài khoản thành công" });
    }

    [HttpPut("{id}/change-role")]
    public async Task<IActionResult> ChangeRole(int id, [FromBody] ChangeRoleDto dto)
    {
        var result = await _userService.ChangeUserRoleAsync(id, dto.RoleId);
        if (!result) return BadRequest(new { message = "Không thể thay đổi quyền" });
        await _auditLogService.LogAsync("UPDATE", "UserRole", new { userId = id, dto.RoleId }, null, dto, $"Thay đổi quyền người dùng #{id}.");
        return Ok(new { message = "Đã thay đổi quyền thành công" });
    }
}

