using System;
using System.Threading.Tasks;
using HotelManagementAPI.DTOs;
using HotelManagementAPI.Enums;
using HotelManagementAPI.Middleware;
using HotelManagementAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using HotelManagementAPI.Hubs;

namespace HotelManagementAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BookingController : ControllerBase
    {
        private readonly IBookingService _bookingService;
        private readonly INotificationService _notificationService;
        private readonly IAuditLogService _auditLogService;
        private readonly IHubContext<NotificationHub> _hubContext;

        public BookingController(
            IBookingService bookingService, 
            INotificationService notificationService, 
            IAuditLogService auditLogService,
            IHubContext<NotificationHub> hubContext)
        {
            _bookingService = bookingService;
            _notificationService = notificationService;
            _auditLogService = auditLogService;
            _hubContext = hubContext;
        }

        /// <summary>Lấy tất cả booking — chỉ Staff/Admin có quyền MANAGE_BOOKINGS</summary>
        [HttpGet]
        [Authorize]
        [RequirePermission("MANAGE_BOOKINGS", "MANAGE_INVOICES")]
        public async Task<IActionResult> GetAllBookings()
        {
            try
            {
                var bookings = await _bookingService.GetAllBookingsAsync();
                return Ok(bookings);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while retrieving bookings", error = ex.Message });
            }
        }

        /// <summary>Lấy tất cả booking của user đang đăng nhập</summary>
        [HttpGet("my-bookings")]
        [Authorize]
        public async Task<IActionResult> GetMyBookings()
        {
            try
            {
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                {
                    return Unauthorized(new { message = "Không xác định được danh tính người dùng" });
                }

                var bookings = await _bookingService.GetBookingsByUserIdAsync(userId);
                return Ok(bookings);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Đã xảy ra lỗi khi tải danh sách booking", error = ex.Message });
            }
        }

        /// <summary>Lấy chi tiết booking — chỉ Staff/Admin có quyền MANAGE_BOOKINGS</summary>
        [HttpGet("{id:int}")]
        [Authorize]
        [RequirePermission("MANAGE_BOOKINGS", "MANAGE_INVOICES")]
        public async Task<IActionResult> GetBookingById(int id)
        {
            try
            {
                var booking = await _bookingService.GetBookingByIdAsync(id);
                if (booking == null) return NotFound(new { message = "Booking not found" });
                return Ok(booking);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while retrieving the booking", error = ex.Message });
            }
        }

        /// <summary>Tạo booking — khách hàng và staff đều gọi được (AllowAnonymous)</summary>
        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> CreateBooking([FromBody] CreateBookingRequestDto requestDto)
        {
            try
            {
                if (!ModelState.IsValid) return BadRequest(ModelState);

                if (!requestDto.UserId.HasValue && User.Identity?.IsAuthenticated == true)
                {
                    var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                    if (int.TryParse(userIdClaim, out var currentUserId))
                    {
                        requestDto.UserId = currentUserId;
                    }
                }

                var newBooking = await _bookingService.CreateBookingAsync(requestDto);
                await NotifyBookingCreatedAsync(newBooking);
                await _auditLogService.LogAsync("CREATE", "Booking", new { bookingId = newBooking.Id, code = newBooking.BookingCode }, null, requestDto, $"Tạo booking mới {newBooking.BookingCode} cho {newBooking.GuestName}.");
                return CreatedAtAction(nameof(GetBookingById), new { id = newBooking.Id }, newBooking);
            }
            catch (Exception ex)
            {
                if (ex.Message.Contains("Voucher") || ex.Message.Contains("phòng"))
                    return BadRequest(new { message = ex.Message });
                return StatusCode(500, new { message = "An error occurred while creating the booking", error = ex.Message });
            }
        }

        /// <summary>Cập nhật trạng thái booking — chỉ Staff/Admin có quyền MANAGE_BOOKINGS</summary>
        [HttpPut("{id:int}/status")]
        [Authorize]
        [RequirePermission("MANAGE_BOOKINGS")]
        public async Task<IActionResult> UpdateBookingStatus(int id, [FromBody] UpdateBookingStatusDto statusDto)
        {
            try
            {
                var updatedBooking = await _bookingService.UpdateBookingStatusAsync(id, statusDto.Status);
                if (updatedBooking == null) return NotFound(new { message = "Booking not found" });
                await NotifyBookingStatusChangedAsync(updatedBooking);
                await _auditLogService.LogAsync("UPDATE", "BookingStatus", new { bookingId = id, code = updatedBooking.BookingCode }, new { statusDto.Status }, updatedBooking, $"Cập nhật trạng thái booking {updatedBooking.BookingCode} sang {statusDto.Status}.");

                // Gửi SignalR cập nhật trạng thái phòng cho Dashboard/RoomsPage
                if (updatedBooking.Details != null)
                {
                    foreach (var detail in updatedBooking.Details)
                    {
                        if (detail.RoomId.HasValue)
                        {
                            var room = await _bookingService.GetRoomByIdAsync(detail.RoomId.Value);
                            if (room != null)
                            {
                                await _hubContext.Clients.All.SendAsync("RoomStatusChanged", room.Id, room.Status, room.CleaningStatus);
                            }
                        }
                    }
                }

                return Ok(updatedBooking);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>Đổi phòng — xử lý: phòng chưa dọn, khách trước chưa trả, bảo trì, nâng hạng</summary>
        [HttpPut("{id:int}/reassign-room")]
        [Authorize]
        [RequirePermission("MANAGE_BOOKINGS")]
        public async Task<IActionResult> ReassignRoom(int id, [FromBody] ReassignRoomDto dto)
        {
            try
            {
                var result = await _bookingService.ReassignRoomAsync(id, dto);
                if (result == null) return NotFound(new { message = "Booking not found" });
                await _auditLogService.LogAsync("UPDATE", "BookingRoom", new { bookingId = id, code = result.BookingCode }, dto, result, $"Đổi phòng cho booking {result.BookingCode}.");

                // Gửi SignalR thông báo trạng thái phòng thay đổi
                if (dto.NewRoomId.HasValue)
                {
                    var newRoom = await _bookingService.GetRoomByIdAsync(dto.NewRoomId.Value);
                    if (newRoom != null)
                    {
                        await _hubContext.Clients.All.SendAsync("RoomStatusChanged", newRoom.Id, newRoom.Status, newRoom.CleaningStatus);
                    }
                }
                // Nếu đổi phòng cũ sang phòng mới, phòng cũ sẽ về Available
                // Lưu ý: Logic trong service đã cập nhật DB, ở đây ta gửi Notify
                if (result.Details != null)
                {
                    foreach (var d in result.Details)
                    {
                        if (d.RoomId.HasValue)
                        {
                            var r = await _bookingService.GetRoomByIdAsync(d.RoomId.Value);
                            if (r != null) await _hubContext.Clients.All.SendAsync("RoomStatusChanged", r.Id, r.Status, r.CleaningStatus);
                        }
                    }
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>Tách phòng: khách có 2+ phòng trong 1 booking, muốn trả 1 phòng trước → booking + hóa đơn riêng</summary>
        [HttpPost("{id:int}/split")]
        [Authorize]
        [RequirePermission("MANAGE_BOOKINGS")]
        public async Task<IActionResult> SplitBooking(int id, [FromBody] SplitBookingDto dto)
        {
            try
            {
                var result = await _bookingService.SplitBookingAsync(id, dto);
                
                // Nếu tách và trả phòng ngay -> Gửi SignalR cập nhật trạng thái phòng cho các client khác
                if (dto.CheckOutImmediately)
                {
                    foreach (var detail in result.NewBooking.Details)
                    {
                        if (detail.RoomId.HasValue)
                        {
                            // Lấy thông tin phòng để gửi SignalR (vì detail chỉ có ID)
                            var room = await _bookingService.GetRoomByIdAsync(detail.RoomId.Value);
                            if (room != null)
                            {
                                await _hubContext.Clients.All.SendAsync("RoomStatusChanged", room.Id, "Available", "Dirty");
                                
                                // Gửi thông báo cho nhân viên dọn phòng
                                await _notificationService.SendToRoleByNameAsync(
                                    "Staff",
                                    "Yêu cầu dọn phòng",
                                    $"Phòng {room.RoomNumber} đã được tách trả (Split) và cần được dọn dẹp.",
                                    NotificationType.Warning,
                                    "/staff/rooms");
                            }
                        }
                    }
                }

                await _auditLogService.LogAsync("CREATE", "BookingSplit", new { originalBookingId = id }, dto, result, $"Tách booking #{id} thành booking mới #{result.NewBooking.Id}.");
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private async Task NotifyBookingCreatedAsync(BookingResponseDto booking)
        {
            var bookingCode = booking.BookingCode ?? $"#{booking.Id}";
            var guestName = booking.GuestName ?? booking.GuestEmail ?? "Guest";
            var checkIn = booking.Details.Count > 0 ? booking.Details[0].CheckInDate.ToString("dd/MM/yyyy") : "N/A";

            try
            {
                await _notificationService.SendToRoleByNameAsync(
                    "Admin",
                    "Booking mới",
                    $"Có booking mới {bookingCode} của {guestName}, check-in {checkIn}.",
                    NotificationType.Info,
                    "/admin/bookings");

                await _notificationService.SendToRoleByNameAsync(
                    "Manager",
                    "Booking mới",
                    $"Có booking mới {bookingCode} của {guestName}, check-in {checkIn}.",
                    NotificationType.Info,
                    "/admin/bookings");

                await _notificationService.SendToRoleByNameAsync(
                    "Staff",
                    "Booking mới",
                    $"Có booking mới {bookingCode} của {guestName}, check-in {checkIn}.",
                    NotificationType.Info,
                    "/staff/bookings/manage");

                if (booking.UserId.HasValue)
                {
                    await _notificationService.SendNotificationAsync(
                        booking.UserId.Value,
                        "Đặt phòng thành công",
                        $"Booking {bookingCode} đã được tạo thành công. Chúng tôi sẽ sớm xác nhận cho bạn.",
                        NotificationType.Success,
                        "/profile");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Booking Created Notification Error]: {ex.Message}");
            }
        }

        private async Task NotifyBookingStatusChangedAsync(BookingResponseDto booking)
        {
            var bookingCode = booking.BookingCode ?? $"#{booking.Id}";
            var status = booking.Status.ToString();
            var guestName = booking.GuestName ?? booking.GuestEmail ?? "Guest";

            try
            {
                switch (status)
                {
                    case "CheckedIn":
                        await _notificationService.SendToRoleByNameAsync(
                            "Admin",
                            "Khách đã check-in",
                            $"{guestName} đã check-in cho booking {bookingCode}.",
                            NotificationType.Success,
                            "/admin/bookings/in-house");
                        await _notificationService.SendToRoleByNameAsync(
                            "Staff",
                            "Khách đã check-in",
                            $"{guestName} đã check-in cho booking {bookingCode}.",
                            NotificationType.Success,
                            "/staff/bookings/in-house");
                        break;
                    case "CheckedOut":
                        await _notificationService.SendToRoleByNameAsync(
                            "Admin",
                            "Khách đã check-out",
                            $"{guestName} đã check-out cho booking {bookingCode}.",
                            NotificationType.Info,
                            "/admin/bookings/check-out");
                        await _notificationService.SendToRoleByNameAsync(
                            "Staff",
                            "Khách đã check-out",
                            $"{guestName} đã check-out cho booking {bookingCode}.",
                            NotificationType.Info,
                            "/staff/bookings/check-out");
                        break;
                    case "Cancelled":
                        await _notificationService.SendToRoleByNameAsync(
                            "Admin",
                            "Booking bị hủy",
                            $"Booking {bookingCode} của {guestName} đã bị hủy.",
                            NotificationType.Warning,
                            "/admin/bookings");
                        await _notificationService.SendToRoleByNameAsync(
                            "Staff",
                            "Booking bị hủy",
                            $"Booking {bookingCode} của {guestName} đã bị hủy.",
                            NotificationType.Warning,
                            "/staff/bookings/manage");
                        break;
                }

                if (booking.UserId.HasValue)
                {
                    await _notificationService.SendNotificationAsync(
                        booking.UserId.Value,
                        "Cập nhật booking",
                        $"Booking {bookingCode} của bạn đã chuyển sang trạng thái {status}.",
                        status == "Cancelled" ? NotificationType.Warning : NotificationType.Info,
                        "/profile");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Booking Status Notification Error]: {ex.Message}");
            }
        }
    }
}
