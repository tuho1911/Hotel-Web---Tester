using HotelManagementAPI.DTOs;
using HotelManagementAPI.Middleware;
using HotelManagementAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelManagementAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[RequirePermission("MANAGE_ROLES")]
public class AuditLogsController : ControllerBase
{
    private readonly IAuditLogService _auditLogService;

    public AuditLogsController(IAuditLogService auditLogService)
    {
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] AuditLogQueryDto query)
    {
        var result = await _auditLogService.GetEventsAsync(query);
        return Ok(new { result.TotalEvents, result.Events });
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] AuditLogQueryDto query)
    {
        var json = await _auditLogService.ExportAsync(query);
        return Content(json, "application/json");
    }

    [HttpPost("cleanup")]
    public async Task<IActionResult> Cleanup([FromQuery] int keepDays = 90)
    {
        var deleted = await _auditLogService.CleanupAsync(keepDays);
        return Ok(new { deleted });
    }
}
