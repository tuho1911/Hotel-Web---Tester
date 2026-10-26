using System;
using System.Linq;
using System.Threading.Tasks;
using HotelManagementAPI.Data;
using HotelManagementAPI.DTOs;
using HotelManagementAPI.Enums;
using HotelManagementAPI.Middleware;
using HotelManagementAPI.Models;
using HotelManagementAPI.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

using HotelManagementAPI.Helpers;

namespace HotelManagementAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrderServicesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IInvoiceService _invoiceService;
    private readonly INotificationService _notificationService;
    private readonly IAuditLogService _auditLogService;

    public OrderServicesController(AppDbContext context, IInvoiceService invoiceService, INotificationService notificationService, IAuditLogService auditLogService)
    {
        _context = context;
        _invoiceService = invoiceService;
        _notificationService = notificationService;
        _auditLogService = auditLogService;
    }

    [HttpGet("bookings")]
    [RequirePermission("MANAGE_SERVICES")]
    public async Task<IActionResult> GetBookingsForServiceManagement()
    {

        var bookings = await _context.Bookings
            .Include(b => b.BookingDetails)
            .Include(b => b.Invoice)
            .Include(b => b.Voucher)
            .Where(b => b.StatusString != "Cancelled")
            .OrderByDescending(b => b.Id)
            .ToListAsync();

        var bookingDtos = bookings.Select(b => new BookingResponseDto
            {
                Id = b.Id,
                UserId = b.UserId,
                GuestName = b.GuestName,
                GuestPhone = b.GuestPhone,
                GuestEmail = b.GuestEmail,
                BookingCode = b.BookingCode,
                VoucherId = b.VoucherId,
                VoucherCode = b.Voucher != null ? b.Voucher.Code : null,
                Status = b.Status,
                InvoiceId = b.Invoice != null ? b.Invoice.Id : null,
                DepositAmount = b.DepositAmount,
                DepositPaidAmount = string.Equals(b.DepositStatus, "Paid", StringComparison.OrdinalIgnoreCase) ? b.DepositAmount : 0m,
                DepositRemainingAmount = string.Equals(b.DepositStatus, "Paid", StringComparison.OrdinalIgnoreCase) ? 0m : Math.Max(0m, b.DepositAmount),
                DepositStatus = string.IsNullOrWhiteSpace(b.DepositStatus)
                    ? (b.DepositAmount > 0 ? "Unpaid" : "NotRequired")
                    : b.DepositStatus,
                Details = b.BookingDetails
                    .OrderBy(d => d.CheckInDate)
                    .Select(d => new BookingDetailResponseDto
                    {
                        Id = d.Id,
                        RoomId = d.RoomId,
                        RoomTypeId = d.RoomTypeId,
                        CheckInDate = d.CheckInDate,
                        CheckOutDate = d.CheckOutDate,
                        PricePerNight = d.PricePerNight
                    })
                    .ToList()
            })
            .ToList();

        return Ok(bookingDtos);
    }

    [HttpGet("booking/{bookingId:int}")]
    [Authorize]
    public async Task<IActionResult> GetByBookingId(int bookingId)
    {
        var booking = await _context.Bookings.FindAsync(bookingId);
        if (booking == null) return NotFound(new { message = "Booking không tồn tại" });

        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
        bool isStaffRole = userRole == "Admin" || userRole == "Manager" || userRole == "Receptionist" || userRole == "Staff" || User.HasClaim(c => string.Equals(c.Type, "permission", StringComparison.OrdinalIgnoreCase) && (c.Value == "MANAGE_SERVICES" || c.Value == "MANAGE_ROOMS"));

        if (!isStaffRole)
        {
            if (string.IsNullOrEmpty(userIdString) || !int.TryParse(userIdString, out var userId) || booking.UserId != userId)
            {
                return Forbid();
            }
        }

        var orders = await _context.OrderServices
            .Include(o => o.Details)
            .ThenInclude(d => d.Service)
            .Include(o => o.BookingDetail)
            .Where(o => o.BookingDetail != null && o.BookingDetail.BookingId == bookingId)
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync();

        return Ok(orders.Select(MapToDto).ToList());
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] CreateOrderServiceRequestDto dto)
    {
        if (dto.Items == null || dto.Items.Count == 0)
            return BadRequest(new { message = "Items is required" });

        var bookingDetail = await _context.BookingDetails
            .Include(bd => bd.Booking)
            .FirstOrDefaultAsync(bd => bd.Id == dto.BookingDetailId);
        if (bookingDetail == null)
            return NotFound(new { message = "Booking detail not found" });

        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        bool isStaffRole = userRole == "Admin" || userRole == "Manager" || userRole == "Receptionist" || userRole == "Staff" || User.HasClaim(c => string.Equals(c.Type, "permission", StringComparison.OrdinalIgnoreCase) && (c.Value == "MANAGE_SERVICES" || c.Value == "MANAGE_ROOMS"));

        if (!isStaffRole)
        {
            if (string.IsNullOrEmpty(userIdString) || !int.TryParse(userIdString, out var userId) || bookingDetail.Booking?.UserId != userId)
            {
                return Forbid("Bạn không có quyền gọi dịch vụ cho phòng này.");
            }
        }

        var serviceIds = dto.Items.Select(i => i.ServiceId).Distinct().ToList();
        var services = await _context.Services.Where(s => serviceIds.Contains(s.Id)).ToListAsync();
        if (services.Count != serviceIds.Count)
            return BadRequest(new { message = "Some services not found" });

        var order = new OrderService
        {
            BookingDetailId = bookingDetail.Id,
            OrderDate = TimeHelper.Now,
            Status = OrderServiceStatus.Pending,
        };

        foreach (var item in dto.Items)
        {
            if (item.Quantity <= 0) continue;
            var service = services.First(s => s.Id == item.ServiceId);
            order.Details.Add(new OrderServiceDetail
            {
                ServiceId = service.Id,
                Quantity = item.Quantity,
                UnitPrice = service.Price,
            });
        }

        if (order.Details.Count == 0)
            return BadRequest(new { message = "No valid items" });

        order.TotalAmount = order.Details.Sum(d => d.UnitPrice * d.Quantity);

        await _context.OrderServices.AddAsync(order);
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("CREATE", "OrderService", new { bookingDetailId = bookingDetail.Id, bookingDetail.BookingId }, null, dto, $"Tạo đơn dịch vụ cho booking #{bookingDetail.BookingId}.");

        if (bookingDetail.BookingId != null)
        {
            await _invoiceService.RecalculateInvoiceAsync(bookingDetail.BookingId.Value);
        }

        var reloaded = await _context.OrderServices
            .Include(o => o.Details).ThenInclude(d => d.Service)
            .FirstAsync(o => o.Id == order.Id);

        await NotifyServiceOrderCreatedAsync(bookingDetail, reloaded, userRole);

        return Ok(MapToDto(reloaded));
    }

    [HttpPut("{id:int}/status")]
    [RequirePermission("MANAGE_SERVICES")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderServiceStatusDto dto)
    {

        var order = await _context.OrderServices
            .Include(o => o.BookingDetail)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null) return NotFound(new { message = "Order not found" });

        var oldStatus = order.Status;
        order.Status = dto.Status;
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("UPDATE", "OrderServiceStatus", new { orderId = id }, new { status = oldStatus }, new { status = dto.Status }, $"Cập nhật trạng thái đơn dịch vụ #{id}.");

        if (order.BookingDetail?.BookingId != null)
        {
            await _invoiceService.RecalculateInvoiceAsync(order.BookingDetail.BookingId.Value);
        }

        await NotifyServiceOrderStatusUpdatedAsync(order);

        return Ok(new { success = true });
    }

    [HttpPost("room/{roomId:int}/minibar")]
    [RequirePermission("MANAGE_SERVICES")]
    public async Task<IActionResult> ReportMinibar(int roomId, [FromBody] List<CreateOrderServiceItemDto> items)
    {

        if (items == null || items.Count == 0)
            return BadRequest(new { message = "Danh sách dịch vụ/Minibar trống" });

        var activeBookingDetail = await _context.BookingDetails
            .Include(bd => bd.Booking!)
                .ThenInclude(b => b!.Invoice)
            .Where(bd => bd.RoomId == roomId && bd.Booking != null)
            .OrderByDescending(bd => bd.CheckInDate)
            .FirstOrDefaultAsync();

        if (activeBookingDetail == null)
            return BadRequest(new { message = "Phòng không có khách đang ở hoặc chưa có booking hợp lệ." });

        var b = activeBookingDetail.Booking;
        if (b == null)
            return BadRequest(new { message = "Khong tim thay booking hop le cho phong nay." });
        var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        bool canCharge = false;
        
        if (b.StatusString == "CheckedIn") 
        {
            canCharge = true;
        }
        else if (b.StatusString == "CheckedOut" && (b.Invoice == null || b.Invoice.StatusString != "Paid"))
        {
            canCharge = true;
        }

        if (!canCharge)
            return BadRequest(new { message = "Khách đã trả phòng và thanh toán xong, không thể cộng Minibar." });

        var serviceIds = items.Select(i => i.ServiceId).Distinct().ToList();
        var services = await _context.Services.Where(s => serviceIds.Contains(s.Id)).ToListAsync();
        if (services.Count != serviceIds.Count)
            return BadRequest(new { message = "Một số dịch vụ không tồn tại" });

        var order = new OrderService
        {
            BookingDetailId = activeBookingDetail.Id,
            OrderDate = TimeHelper.Now,
            Status = OrderServiceStatus.Delivered, 
        };

        foreach (var item in items)
        {
            if (item.Quantity <= 0) continue;
            var service = services.First(s => s.Id == item.ServiceId);
            order.Details.Add(new OrderServiceDetail
            {
                ServiceId = service.Id,
                Quantity = item.Quantity,
                UnitPrice = service.Price,
            });
        }

        if (order.Details.Count == 0)
            return BadRequest(new { message = "Không có mục dịch vụ hợp lệ" });

        order.TotalAmount = order.Details.Sum(d => d.UnitPrice * d.Quantity);

        await _context.OrderServices.AddAsync(order);
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("CREATE", "MinibarCharge", new { roomId, bookingId = b.Id }, null, items, $"Cộng minibar cho phòng #{roomId}.");

        if (activeBookingDetail.BookingId != null)
        {
            await _invoiceService.RecalculateInvoiceAsync(activeBookingDetail.BookingId.Value);
        }

        var reloaded = await _context.OrderServices
            .Include(o => o.Details).ThenInclude(d => d.Service)
            .FirstAsync(o => o.Id == order.Id);

        await NotifyServiceOrderCreatedAsync(activeBookingDetail, reloaded, userRole);

        return Ok(new { 
            message = "Đã cộng dồn Minibar vào hóa đơn thành công", 
            order = MapToDto(reloaded),
            totalAmount = order.TotalAmount,
            bookingCode = b.BookingCode
        });
    }

    private OrderServiceResponseDto MapToDto(OrderService order)
    {
        var details = order.Details?.Select(d => new OrderServiceDetailDto(
            d.ServiceId,
            d.Service?.Name ?? $"#{d.ServiceId}",
            d.Quantity,
            d.UnitPrice,
            d.UnitPrice * d.Quantity
        )).ToList() ?? new();

        return new OrderServiceResponseDto(
            order.Id,
            order.BookingDetailId,
            order.OrderDate,
            order.TotalAmount ?? details.Sum(x => x.LineTotal),
            order.Status,
            details
        );
    }


    private async Task NotifyServiceOrderCreatedAsync(BookingDetail bookingDetail, OrderService order, string? userRole)
    {
        try
        {
            var booking = bookingDetail.Booking;
            var bookingCode = booking?.BookingCode ?? (bookingDetail.BookingId?.ToString() ?? "N/A");
            var summary = string.Join(", ", order.Details.Select(d => $"{d.Service?.Name ?? $"#{d.ServiceId}"} x{d.Quantity}"));
            var isStaffRole = userRole == "Admin" || userRole == "Manager" || userRole == "Receptionist" || userRole == "Staff" || userRole == "Housekeeping";
            var isGuestRequest = !isStaffRole;

            if (isGuestRequest)
            {
                await _notificationService.SendToRoleByNameAsync(
                    "Admin",
                    "Yêu cầu dịch vụ mới",
                    $"Khách vừa gửi đơn dịch vụ cho booking {bookingCode}: {summary}.",
                    NotificationType.Info,
                    "/admin/orders");

                await _notificationService.SendToRoleByNameAsync(
                    "Manager",
                    "Yêu cầu dịch vụ mới",
                    $"Khách vừa gửi đơn dịch vụ cho booking {bookingCode}: {summary}.",
                    NotificationType.Info,
                    "/admin/orders");
            }
            else
            {
                if (booking?.UserId != null)
                {
                    await _notificationService.SendNotificationAsync(
                        booking.UserId.Value,
                        "Yêu cầu dịch vụ đã được tạo",
                        $"Đơn dịch vụ cho booking {bookingCode} đã được tạo: {summary}.",
                        NotificationType.Success,
                        "/profile");
                }
            }
        }
        catch { }
    }

    private async Task NotifyServiceOrderStatusUpdatedAsync(OrderService order)
    {
        try
        {
            var bookingCode = order.BookingDetail?.Booking?.BookingCode ?? order.BookingDetail?.BookingId?.ToString() ?? "N/A";
            var summary = string.Join(", ", order.Details.Select(d => $"{d.Service?.Name ?? $"#{d.ServiceId}"} x{d.Quantity}"));

            if (order.BookingDetail?.Booking?.UserId != null)
            {
                await _notificationService.SendNotificationAsync(
                    order.BookingDetail.Booking.UserId.Value,
                    "Đơn dịch vụ đã cập nhật",
                    $"Đơn dịch vụ {summary} cho booking {bookingCode} đã cập nhật trạng thái thành {order.Status}.",
                    NotificationType.Info,
                    "/profile");
            }
        }
        catch { }
    }
}
