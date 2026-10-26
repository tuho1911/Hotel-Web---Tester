using HotelManagementAPI.DTOs;
using HotelManagementAPI.Middleware;
using HotelManagementAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelManagementAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MembershipsController : ControllerBase
    {
        private readonly IMembershipService _membershipService;
        private readonly IAuditLogService _auditLogService;

        public MembershipsController(IMembershipService membershipService, IAuditLogService auditLogService)
        {
            _membershipService = membershipService;
            _auditLogService = auditLogService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var memberships = await _membershipService.GetAllAsync();
            return Ok(memberships);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var membership = await _membershipService.GetByIdAsync(id);
            return membership == null ? NotFound(new { message = "Hạng thành viên không tồn tại" }) : Ok(membership);
        }

        [HttpPost]
        [RequirePermission("MANAGE_BOOKINGS")]
        public async Task<IActionResult> Create([FromBody] CreateMembershipDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var created = await _membershipService.CreateAsync(dto);
            await _auditLogService.LogAsync("CREATE", "Membership", new { membershipId = created.Id, created.TierName }, null, dto, $"Tạo hạng thành viên {created.TierName}.");
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }

        [HttpPut("{id:int}")]
        [RequirePermission("MANAGE_BOOKINGS")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateMembershipDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var updated = await _membershipService.UpdateAsync(id, dto);
            if (updated == null) return NotFound(new { message = "Hạng thành viên không tồn tại" });
            await _auditLogService.LogAsync("UPDATE", "Membership", new { membershipId = id, updated.TierName }, dto, updated, $"Cập nhật hạng thành viên {updated.TierName}.");
            return Ok(updated);
        }

        [HttpDelete("{id:int}")]
        [RequirePermission("MANAGE_BOOKINGS")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var deleted = await _membershipService.DeleteAsync(id);
                if (deleted) await _auditLogService.LogAsync("DELETE", "Membership", new { membershipId = id }, null, null, $"Xóa hạng thành viên #{id}.");
                return deleted ? Ok(new { message = "Đã xóa hạng thành viên" }) : NotFound(new { message = "Hạng thành viên không tồn tại" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
