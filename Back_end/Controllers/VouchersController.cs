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
    [RequirePermission("MANAGE_BOOKINGS", "MANAGE_INVOICES")]
    public class VouchersController : ControllerBase
    {
        private readonly IVoucherService _voucherService;
        private readonly IAuditLogService _auditLogService;

        public VouchersController(IVoucherService voucherService, IAuditLogService auditLogService)
        {
            _voucherService = voucherService;
            _auditLogService = auditLogService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var vouchers = await _voucherService.GetAllAsync();
            return Ok(vouchers);
        }

        [HttpGet("public")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublicForBooking([FromQuery] decimal? bookingAmount)
        {
            var vouchers = await _voucherService.GetPublicForBookingAsync(bookingAmount);
            return Ok(vouchers);
        }

        [HttpGet("vip")]
        public async Task<IActionResult> GetVipForMember([FromQuery] int membershipId, [FromQuery] decimal? bookingAmount)
        {
            var vouchers = await _voucherService.GetVipForMemberAsync(membershipId, bookingAmount);
            return Ok(vouchers);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var voucher = await _voucherService.GetByIdAsync(id);
            return voucher == null ? NotFound(new { message = "Voucher không tồn tại" }) : Ok(voucher);
        }

        [HttpGet("{id:int}/validate")]
        [AllowAnonymous]
        public async Task<IActionResult> ValidateForBooking(int id, [FromQuery] decimal bookingAmount)
        {
            var voucher = await _voucherService.ValidateForBookingAsync(id, bookingAmount);
            return voucher == null ? BadRequest(new { message = "Voucher không hợp lệ với booking này" }) : Ok(voucher);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateVoucherDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var created = await _voucherService.CreateAsync(dto);
                await _auditLogService.LogAsync("CREATE", "Voucher", new { voucherId = created.Id, created.Code }, null, dto, $"Tạo voucher {created.Code}.");
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateVoucherDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var updated = await _voucherService.UpdateAsync(id, dto);
                if (updated == null) return NotFound(new { message = "Voucher không tồn tại" });
                await _auditLogService.LogAsync("UPDATE", "Voucher", new { voucherId = id, updated.Code }, dto, updated, $"Cập nhật voucher {updated.Code}.");
                return Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var deleted = await _voucherService.DeleteAsync(id);
                if (!deleted) return NotFound(new { message = "Voucher không tồn tại" });
                await _auditLogService.LogAsync("DELETE", "Voucher", new { voucherId = id }, null, null, $"Xóa voucher #{id}.");
                return Ok(new { message = "Đã xóa voucher" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
