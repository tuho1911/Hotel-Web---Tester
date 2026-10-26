using System.Security.Claims;
using HotelManagementAPI.DTOs;
using HotelManagementAPI.Data;
using HotelManagementAPI.Middleware;
using HotelManagementAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementAPI.Controllers;

[Route("api/dashboard-periods")]
[ApiController]
[Authorize]
[RequirePermission("VIEW_DASHBOARD")]
public class DashboardPeriodsController : ControllerBase
{
    private readonly IRoleDashboardPeriodService _dashboardService;
    private readonly AppDbContext _context;

    public DashboardPeriodsController(IRoleDashboardPeriodService dashboardService, AppDbContext context)
    {
        _dashboardService = dashboardService;
        _context = context;
    }

    [HttpGet("current")]
    public async Task<IActionResult> GetCurrentDashboard([FromQuery] string? roleName, [FromQuery] string periodType = "MONTHLY", CancellationToken cancellationToken = default)
    {
        var resolvedRoleName = ResolveRoleName(roleName);
        var dashboard = await _dashboardService.GetDashboardAsync(resolvedRoleName, periodType, periodKey: null, currentOnly: true, cancellationToken);

        return dashboard == null
            ? NotFound(new { message = "Khong tim thay dashboard hien tai." })
            : Ok(dashboard);
    }

    [HttpGet("{roleName}/{periodType}/{periodKey}")]
    public async Task<IActionResult> GetDashboardByPeriod(string roleName, string periodType, string periodKey, CancellationToken cancellationToken = default)
    {
        var dashboard = await _dashboardService.GetDashboardAsync(roleName, periodType, periodKey, currentOnly: false, cancellationToken);

        return dashboard == null
            ? NotFound(new { message = "Khong tim thay dashboard theo ky." })
            : Ok(dashboard);
    }

    [HttpGet("{roleName}/{periodType}/history")]
    public async Task<IActionResult> GetHistory(string roleName, string periodType, [FromQuery] int take = 12, CancellationToken cancellationToken = default)
    {
        var items = await _dashboardService.GetHistoryAsync(roleName, periodType, take, cancellationToken);
        return Ok(items);
    }

    [HttpPost("rebuild")]
    [RequirePermission("MANAGE_SYSTEM")]
    public async Task<IActionResult> RebuildDashboard([FromBody] DashboardRebuildRequestDto request, CancellationToken cancellationToken = default)
    {
        var userId = ResolveUserId();
        var occurredAt = request.OccurredAtUtc ?? Helpers.TimeHelper.Now;

        await _dashboardService.RebuildDashboardAsync(request.RoleName, request.PeriodType, occurredAt, userId, "MANUAL_REBUILD", null, cancellationToken);

        return Ok(new { message = "Da rebuild dashboard theo ky." });
    }

    [HttpPost("rebuild-current")]
    [RequirePermission("MANAGE_SYSTEM")]
    public async Task<IActionResult> RebuildAllCurrent(CancellationToken cancellationToken = default)
    {
        await _dashboardService.RebuildAllCurrentDashboardsAsync(ResolveUserId(), cancellationToken);
        return Ok(new { message = "Da rebuild toan bo dashboard hien tai." });
    }

    [HttpPost("events/rebuild-affected")]
    [RequirePermission("MANAGE_SYSTEM")]
    public async Task<IActionResult> RebuildAffectedByEvent([FromBody] DashboardEventRequestDto request, CancellationToken cancellationToken = default)
    {
        await _dashboardService.RebuildAffectedDashboardsAsync(request.EventType, request.OccurredAtUtc ?? Helpers.TimeHelper.Now, ResolveUserId(), request.RefId, cancellationToken);

        return Ok(new { message = "Da cap nhat cac dashboard bi anh huong boi su kien." });
    }

    [HttpGet("/api/dashboards/{dashboardCode}")]
    public async Task<IActionResult> GetDashboardByCode(
        string dashboardCode,
        [FromQuery] int roleId,
        [FromQuery] string periodType = "MONTHLY",
        [FromQuery] string? periodKey = null,
        CancellationToken cancellationToken = default)
    {
        var role = await _context.Roles.AsNoTracking().FirstOrDefaultAsync(x => x.Id == roleId, cancellationToken);
        if (role == null)
        {
            return NotFound(new { message = "Khong tim thay role." });
        }

        var result = await _dashboardService.GetDashboardAsync(role.Name, periodType, periodKey, currentOnly: string.IsNullOrWhiteSpace(periodKey), cancellationToken);
        if (result == null)
        {
            return NotFound(new { message = "Khong tim thay dashboard theo ky." });
        }

        if (!string.Equals(result.DashboardCode, dashboardCode, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "DashboardCode khong khop voi role hien tai." });
        }

        return Ok(result);
    }

    [HttpPost("/api/dashboards/{dashboardCode}/refresh")]
    [RequirePermission("VIEW_DASHBOARD")]
    public async Task<IActionResult> RefreshDashboard(
        string dashboardCode,
        [FromBody] DashboardRefreshRequestDto request,
        CancellationToken cancellationToken = default)
    {
        string? roleName = request.RoleName;
        if (string.IsNullOrWhiteSpace(roleName) && request.RoleId.HasValue)
        {
            roleName = await _context.Roles.AsNoTracking()
                .Where(x => x.Id == request.RoleId.Value)
                .Select(x => x.Name)
                .FirstOrDefaultAsync(cancellationToken);
        }

        if (string.IsNullOrWhiteSpace(roleName))
        {
            return BadRequest(new { message = "Can roleName hoac roleId hop le." });
        }

        var expectedCode = Helpers.DashboardPeriodHelper.GetDashboardCode(roleName);
        if (!string.Equals(expectedCode, dashboardCode, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "dashboardCode khong dung voi roleName/roleId." });
        }

        var occurredAt = request.OccurredAtUtc ?? Helpers.TimeHelper.Now;
        if (string.Equals(roleName, "Manager", StringComparison.OrdinalIgnoreCase) || 
            string.Equals(roleName, "Admin", StringComparison.OrdinalIgnoreCase))
        {
            await _dashboardService.RebuildAllCurrentDashboardsAsync(ResolveUserId(), cancellationToken);
        }
        else
        {
            await _dashboardService.RebuildDashboardAsync(
                roleName,
                request.PeriodType,
                occurredAt,
                ResolveUserId(),
                "MANUAL_REFRESH",
                null,
                cancellationToken);
        }

        return NoContent();
    }

    private string ResolveRoleName(string? requestedRoleName)
    {
        if (!string.IsNullOrWhiteSpace(requestedRoleName))
        {
            return Helpers.DashboardPeriodHelper.NormalizeRoleName(requestedRoleName);
        }

        return Helpers.DashboardPeriodHelper.NormalizeRoleName(User.FindFirst(ClaimTypes.Role)?.Value);
    }

    private int? ResolveUserId()
    {
        var raw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(raw, out var userId) ? userId : null;
    }
}
