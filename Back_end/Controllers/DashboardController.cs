using System.Threading.Tasks;
using HotelManagementAPI.DTOs;
using HotelManagementAPI.Middleware;
using HotelManagementAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelManagementAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[RequirePermission("VIEW_DASHBOARD")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;
    private readonly IAuditLogService _auditLogService;

    public DashboardController(IDashboardService dashboardService, IAuditLogService auditLogService)
    {
        _dashboardService = dashboardService;
        _auditLogService = auditLogService;
    }

    [HttpGet("analytics")]
    public async Task<ActionResult<DashboardAnalyticsDto>> GetAnalytics()
    {
        var result = await _dashboardService.GetAnalyticsAsync();
        await _auditLogService.LogAsync("READ", "DashboardAnalytics", new { }, null, result, "Xem thống kê dashboard.");
        return Ok(result);
    }
}
