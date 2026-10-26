using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;
using HotelManagementAPI.Enums;

namespace HotelManagementAPI.DTOs
{
    public class BookingResponseDto
    {
        public int Id { get; set; }
        public int? UserId { get; set; }
        public string? GuestName { get; set; }
        public string? GuestPhone { get; set; }
        public string? GuestEmail { get; set; }
        public string? BookingCode { get; set; }
        public int? VoucherId { get; set; }
        public string? VoucherCode { get; set; }
        // Trả về tên enum dưới dạng string ("Pending", "Confirmed", ...)
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public BookingStatus Status { get; set; }
        public List<BookingDetailResponseDto> Details { get; set; } = new List<BookingDetailResponseDto>();
        public int? InvoiceId { get; set; }
        public decimal DepositAmount { get; set; }
        public decimal DepositPaidAmount { get; set; }
        public decimal DepositRemainingAmount { get; set; }
        public string DepositStatus { get; set; } = "NotRequired";
    }

    public class BookingDetailResponseDto
    {
        public int Id { get; set; }
        public int? RoomId { get; set; }
        public int? RoomTypeId { get; set; }
        public DateTime CheckInDate { get; set; }
        public DateTime CheckOutDate { get; set; }
        public decimal PricePerNight { get; set; }
    }

    public class CreateBookingRequestDto
    {
        public int? UserId { get; set; }
        public string? GuestName { get; set; }
        public string? GuestPhone { get; set; }
        public string? GuestEmail { get; set; }
        public int? VoucherId { get; set; }
        public List<CreateBookingDetailDto> Details { get; set; } = new List<CreateBookingDetailDto>();
        public decimal DepositAmount { get; set; } = 0;
    }

    public class CreateBookingDetailDto
    {
        public int? RoomId { get; set; }
        public int? RoomTypeId { get; set; }
        public DateTime CheckInDate { get; set; }
        public DateTime CheckOutDate { get; set; }
        public decimal PricePerNight { get; set; }
    }

    public class UpdateBookingStatusDto
    {
        // Nhận số nguyên index (0=Pending, 1=Confirmed, 2=CheckedIn, 3=CheckedOut, 4=Cancelled)
        public BookingStatus Status { get; set; }
    }

    /// <summary>
    /// DTO cho nghiệp vụ đổi phòng / phòng chưa sẵn sàng.
    /// Staff dùng khi:
    ///   - Phòng được đặt chưa dọn xong (CleaningStatus != Clean)
    ///   - Khách trước chưa trả phòng (vẫn còn CheckedIn)
    ///   - Sự cố kỹ thuật (Maintenance)
    /// </summary>
    public class ReassignRoomDto
    {
        /// <summary>Booking detail cần đổi phòng (ID của dòng trong Booking_Details)</summary>
        public int BookingDetailId { get; set; }

        /// <summary>Phòng mới muốn chuyển sang (nullable — nếu null thì tự tìm)</summary>
        public int? NewRoomId { get; set; }

        /// <summary>Loại phòng muốn tìm nếu không chỉ định NewRoomId</summary>
        public int? RoomTypeId { get; set; }

        /// <summary>Lý do đổi phòng (ghi log, hiển thị cho khách)</summary>
        public string? Reason { get; set; }
    }

    /// <summary>
    /// DTO tách booking: khi khách có 2 phòng trong 1 booking nhưng muốn
    /// trả 1 phòng trước trong khi vẫn ở phòng còn lại.
    /// Hệ thống sẽ tạo booking mới cho phòng được tách ra và checkout ngay.
    /// </summary>
    public class SplitBookingDto
    {
        /// <summary>Danh sách booking detail ID cần tách ra thành booking mới</summary>
        public List<int> BookingDetailIds { get; set; } = new();

        /// <summary>Tiền cọc phân bổ cho booking mới (nếu cần)</summary>
        public decimal NewBookingDepositAmount { get; set; } = 0;

        /// <summary>Tự động checkout ngay sau khi tách không?</summary>
        public bool CheckOutImmediately { get; set; } = false;
    }

    /// <summary>Kết quả trả về sau khi tách booking</summary>
    public class SplitBookingResultDto
    {
        /// <summary>Booking gốc (đã bỏ các phòng được tách)</summary>
        public BookingResponseDto OriginalBooking { get; set; } = null!;
        /// <summary>Booking mới được tạo chứa các phòng tách ra</summary>
        public BookingResponseDto NewBooking { get; set; } = null!;
        public string Message { get; set; } = string.Empty;
    }
}
