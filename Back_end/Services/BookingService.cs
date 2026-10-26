using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HotelManagementAPI.Data;
using HotelManagementAPI.DTOs;
using HotelManagementAPI.Enums;
using HotelManagementAPI.Models;
using Microsoft.EntityFrameworkCore;

using HotelManagementAPI.Helpers;

namespace HotelManagementAPI.Services
{
    public class BookingService : IBookingService
    {
        private readonly AppDbContext _context;
        private readonly IInvoiceService _invoiceService;

        public BookingService(AppDbContext context, IInvoiceService invoiceService)
        {
            _context = context;
            _invoiceService = invoiceService;
        }

        public async Task<IEnumerable<BookingResponseDto>> GetAllBookingsAsync()
        {
            var bookings = await _context.Bookings
                .Include(b => b.BookingDetails)
                .Include(b => b.Invoice)
                .Include(b => b.Voucher)
                .ToListAsync();

            return bookings.Select(MapToResponseDto);
        }

        public async Task<IEnumerable<BookingResponseDto>> GetBookingsByUserIdAsync(int userId)
        {
            var bookings = await _context.Bookings
                .Include(b => b.BookingDetails)
                .Include(b => b.Invoice)
                .Include(b => b.Voucher)
                .Where(b => b.UserId == userId)
                .OrderByDescending(b => b.Id)
                .ToListAsync();

            return bookings.Select(MapToResponseDto);
        }

        public async Task<BookingResponseDto?> GetBookingByIdAsync(int id)
        {
            var booking = await _context.Bookings
                .Include(b => b.BookingDetails)
                .Include(b => b.Invoice)
                .Include(b => b.Voucher)
                .FirstOrDefaultAsync(b => b.Id == id);

            return booking == null ? null : MapToResponseDto(booking);
        }

        public async Task<BookingResponseDto> CreateBookingAsync(CreateBookingRequestDto requestDto)
        {
            var bookingCode = "BK" + TimeHelper.Now.ToString("yyyyMMddHHmmss");
            var bookingDetails = new List<BookingDetail>();
            decimal trueTotalAmount = 0m;

            foreach (var d in requestDto.Details)
            {
                int? assignedRoomId = d.RoomId;
                if (!assignedRoomId.HasValue && d.RoomTypeId.HasValue)
                {
                    var availableRoom = await _context.Rooms
                        .Where(r => r.RoomTypeId == d.RoomTypeId && r.IsActive)
                        .FirstOrDefaultAsync(r => !_context.BookingDetails.Any(bd => 
                            bd.RoomId == r.Id && 
                            bd.Booking != null &&
                            bd.Booking.StatusString != "Cancelled" &&
                            bd.Booking.StatusString != "CheckedOut" &&
                            bd.CheckInDate < d.CheckOutDate && 
                            bd.CheckOutDate > d.CheckInDate));

                    if (availableRoom != null) assignedRoomId = availableRoom.Id;
                    else throw new Exception("Không có phòng trống cho loại phòng này trong thời gian yêu cầu.");
                }

                // SECURITY FIX: Lấy BasePrice từ Database thay vì tin tưởng Frontend
                var roomType = await _context.RoomTypes.FindAsync(d.RoomTypeId);
                if (roomType == null) throw new Exception("Không tìm thấy thông tin hạng phòng.");

                decimal basePrice = roomType.BasePrice;
                decimal nights = (decimal)(d.CheckOutDate - d.CheckInDate).TotalDays;
                if (nights <= 0) nights = 1;

                // DYNAMIC PRICING: Tăng 20% nếu là cuối tuần (T6, T7, CN)
                decimal averagePricePerNight = basePrice;
                decimal totalLinePrice = 0m;
                
                for(int i = 0; i < nights; i++)
                {
                    var currentNight = d.CheckInDate.AddDays(i);
                    decimal nightPrice = basePrice;
                    
                    // Cuối tuần +20%
                    if (currentNight.DayOfWeek == DayOfWeek.Friday || 
                        currentNight.DayOfWeek == DayOfWeek.Saturday || 
                        currentNight.DayOfWeek == DayOfWeek.Sunday)
                    {
                        nightPrice = basePrice * 1.20m;
                    }
                    
                    // Mùa cao điểm (Tháng 6,7,8) +10%
                    if (currentNight.Month >= 6 && currentNight.Month <= 8)
                    {
                        nightPrice *= 1.10m;
                    }
                    
                    totalLinePrice += nightPrice;
                }
                
                averagePricePerNight = Math.Round(totalLinePrice / nights);
                trueTotalAmount += totalLinePrice;

                bookingDetails.Add(new BookingDetail
                {
                    RoomId = assignedRoomId,
                    RoomTypeId = d.RoomTypeId,
                    CheckInDate = d.CheckInDate,
                    CheckOutDate = d.CheckOutDate,
                    PricePerNight = averagePricePerNight
                });
            }

            if (requestDto.VoucherId.HasValue)
            {
                var voucher = await _context.Vouchers.FirstOrDefaultAsync(v => v.Id == requestDto.VoucherId.Value);
                if (voucher == null) throw new Exception("Voucher không tồn tại");

                var now = TimeHelper.Now;
                var isValid = voucher.IsActive
                    && voucher.StartDate <= now
                    && voucher.EndDate >= now
                    && trueTotalAmount >= voucher.MinBookingAmount
                    && (!voucher.UsageLimit.HasValue || voucher.UsageCount < voucher.UsageLimit.Value);

                if (!isValid) throw new Exception("Voucher không hợp lệ hoặc không áp dụng được");
            }

            var booking = new Booking
            {
                UserId = requestDto.UserId,
                GuestName = requestDto.GuestName,
                GuestPhone = requestDto.GuestPhone,
                GuestEmail = requestDto.GuestEmail,
                VoucherId = requestDto.VoucherId,
                BookingCode = bookingCode,
                DepositAmount = requestDto.DepositAmount,
                DepositStatus = requestDto.DepositAmount > 0 ? "Unpaid" : "NotRequired",
                Status = BookingStatus.Pending,
                BookingDetails = bookingDetails
            };

            await _context.Bookings.AddAsync(booking);
            await _context.SaveChangesAsync();

            // Tự động tạo hóa đơn nếu có tiền đặt cọc
            if (booking.DepositAmount > 0)
            {
                await _invoiceService.CreateInvoiceAsync(booking.Id);
                // Reload để lấy thông tin Invoice vừa tạo cho DTO
                await _context.Entry(booking).Reference(b => b.Invoice).LoadAsync();
            }

            return MapToResponseDto(booking);
        }

        public async Task<BookingResponseDto?> UpdateBookingStatusAsync(int id, BookingStatus newStatus)
        {
            var booking = await _context.Bookings
                .Include(b => b.BookingDetails)
                .Include(b => b.Invoice)
                .Include(b => b.Voucher)
                .FirstOrDefaultAsync(b => b.Id == id);

            if (booking == null) return null;

            // Chặn trả phòng nếu chưa thanh toán đầy đủ
            if (newStatus == BookingStatus.CheckedOut && booking.BookingDetails != null)
            {
                if (booking.Invoice == null)
                {
                    throw new Exception("Không thể trả phòng: Booking này chưa được lập hóa đơn. Vui lòng lập hóa đơn trước.");
                }
                
                // Load lại invoice status mới nhất từ DB
                await _context.Entry(booking.Invoice).ReloadAsync();

                if (booking.Invoice.Status != InvoiceStatus.Paid)
                {
                    throw new Exception($"Không thể trả phòng: Hóa đơn #{booking.Invoice.Id} chưa thanh toán đủ. Trạng thái hiện tại: {booking.Invoice.StatusString}");
                }

                var roomIds = booking.BookingDetails.Where(bd => bd.RoomId.HasValue).Select(bd => bd.RoomId!.Value).ToList();
                if (roomIds.Any())
                {
                    var rooms = await _context.Rooms.Where(r => roomIds.Contains(r.Id)).ToListAsync();
                    foreach (var room in rooms)
                    {
                        room.Status = "Available";
                        room.CleaningStatus = "Dirty";
                    }
                }
            }
            else if (newStatus == BookingStatus.CheckedIn && booking.BookingDetails != null)
            {
                // Tự động gán phòng cho những booking detail chưa có phòng
                foreach (var bd in booking.BookingDetails)
                {
                    if (!bd.RoomId.HasValue && bd.RoomTypeId.HasValue)
                    {
                        var availableRoom = await _context.Rooms
                            .Where(r => r.RoomTypeId == bd.RoomTypeId && r.Status == "Available" && r.IsActive)
                            .FirstOrDefaultAsync(r => !_context.BookingDetails.Any(other => 
                                other.Id != bd.Id &&
                                other.RoomId == r.Id && 
                                other.Booking != null &&
                                other.Booking.StatusString != "Cancelled" &&
                                other.Booking.StatusString != "CheckedOut" &&
                                other.CheckInDate < bd.CheckOutDate && 
                                other.CheckOutDate > bd.CheckInDate));
                                
                        if (availableRoom != null)
                        {
                            bd.RoomId = availableRoom.Id;
                        }
                        else
                        {
                            throw new Exception($"Không có phòng trống cho loại phòng #{bd.RoomTypeId} tại thời điểm nhận phòng.");
                        }
                    }
                }

                var roomIds = booking.BookingDetails.Where(bd => bd.RoomId.HasValue).Select(bd => bd.RoomId!.Value).ToList();
                if (roomIds.Any())
                {
                    var rooms = await _context.Rooms.Where(r => roomIds.Contains(r.Id)).ToListAsync();
                    foreach (var room in rooms)
                    {
                        if (room.Status != "Available" || (room.CleaningStatus != "Clean" && !string.IsNullOrEmpty(room.CleaningStatus))) 
                        {
                            var cleaningDisplay = room.CleaningStatus == "Dirty" ? "chưa dọn dẹp" : (room.CleaningStatus == "Inspecting" ? "đang kiểm tra" : room.CleaningStatus);
                            var statusDisplay = room.Status == "Maintenance" ? "đang bảo trì" : room.Status;
                            throw new Exception($"Phòng {room.RoomNumber} chưa sẵn sàng đón khách. Tình trạng: {(room.Status != "Available" ? statusDisplay : cleaningDisplay)}.");
                        }
                        room.Status = "Occupied";
                    }
                }
            }

            booking.Status = newStatus;
            
            _context.Bookings.Update(booking);
            await _context.SaveChangesAsync();

            return MapToResponseDto(booking);
        }

        private BookingResponseDto MapToResponseDto(Booking booking)
        {
            var depositPaidAmount = GetEffectiveDepositAmount(booking);
            var depositRequiredAmount = Math.Max(0m, booking.DepositAmount);

            return new BookingResponseDto
            {
                Id = booking.Id,
                UserId = booking.UserId,
                GuestName = booking.GuestName,
                GuestPhone = booking.GuestPhone,
                GuestEmail = booking.GuestEmail,
                BookingCode = booking.BookingCode,
                VoucherId = booking.VoucherId,
                VoucherCode = booking.Voucher?.Code,
                Status = booking.Status,
                InvoiceId = booking.Invoice?.Id,
                DepositAmount = depositRequiredAmount,
                DepositPaidAmount = depositPaidAmount,
                DepositRemainingAmount = Math.Max(0m, depositRequiredAmount - depositPaidAmount),
                DepositStatus = ResolveDepositStatus(booking),
                Details = booking.BookingDetails?.Select(d => new BookingDetailResponseDto
                {
                    Id = d.Id,
                    RoomId = d.RoomId,
                    RoomTypeId = d.RoomTypeId,
                    CheckInDate = d.CheckInDate,
                    CheckOutDate = d.CheckOutDate,
                    PricePerNight = d.PricePerNight
                }).ToList() ?? new List<BookingDetailResponseDto>()
            };
        }

        private static decimal GetEffectiveDepositAmount(Booking? booking)
        {
            if (booking == null)
            {
                return 0m;
            }

            return string.Equals(booking.DepositStatus, "Paid", StringComparison.OrdinalIgnoreCase)
                ? booking.DepositAmount
                : 0m;
        }

        private static string ResolveDepositStatus(Booking booking)
        {
            if (booking.DepositAmount <= 0)
            {
                return "NotRequired";
            }

            return string.IsNullOrWhiteSpace(booking.DepositStatus)
                ? "Unpaid"
                : booking.DepositStatus;
        }

        /// <summary>
        /// Đổi/tái phân bổ phòng cho một booking detail.
        /// Dùng trong các tình huống:
        ///   (1) Phòng gốc chưa dọn xong (CleaningStatus != Clean)
        ///   (2) Khách trước vẫn chưa trả phòng (vẫn còn CheckedIn)
        ///   (3) Phòng đang bảo trì (Maintenance)
        ///   (4) Nâng hạng phòng tự nguyện (Upgrade)
        /// </summary>
        public async Task<BookingResponseDto?> ReassignRoomAsync(int bookingId, ReassignRoomDto dto)
        {
            // 1. Load booking cùng với detail cần đổi phòng
            var booking = await _context.Bookings
                .Include(b => b.BookingDetails)
                .Include(b => b.Invoice)
                .Include(b => b.Voucher)
                .FirstOrDefaultAsync(b => b.Id == bookingId);

            if (booking == null) return null;

            // Tìm booking detail cần đổi
            var detail = booking.BookingDetails.FirstOrDefault(d => d.Id == dto.BookingDetailId);
            if (detail == null)
                throw new Exception($"Không tìm thấy booking detail #{dto.BookingDetailId} trong booking này.");

            int? targetRoomId = dto.NewRoomId;

            if (targetRoomId.HasValue)
            {
                // 2a. Staff chỉ định phòng cụ thể — validate phòng đó có khả dụng không
                var specifiedRoom = await _context.Rooms
                    .FirstOrDefaultAsync(r => r.Id == targetRoomId.Value && r.IsActive);

                if (specifiedRoom == null)
                    throw new Exception($"Phòng #{targetRoomId} không tồn tại hoặc đã bị vô hiệu hóa.");

                // Kiểm tra phòng chỉ định có bị trùng lịch không
                bool isConflict = await _context.BookingDetails.AnyAsync(bd =>
                    bd.Id != dto.BookingDetailId &&
                    bd.RoomId == targetRoomId &&
                    bd.Booking != null &&
                    bd.Booking.StatusString != "Cancelled" &&
                    bd.Booking.StatusString != "CheckedOut" &&
                    bd.CheckInDate < detail.CheckOutDate &&
                    bd.CheckOutDate > detail.CheckInDate);

                if (isConflict)
                    throw new Exception($"Phòng #{specifiedRoom.Id} đã có khách đặt trong khoảng thời gian này. Vui lòng chọn phòng khác.");
            }
            else
            {
                // 2b. Tự động tìm phòng khả dụng cùng loại (ưu tiên Available + Clean)
                var targetTypeId = dto.RoomTypeId ?? detail.RoomTypeId;
                if (!targetTypeId.HasValue)
                    throw new Exception("Không có thông tin loại phòng để tìm kiếm phòng thay thế.");

                // Ưu tiên phòng Available + Clean trước
                var autoRoom = await _context.Rooms
                    .Where(r => r.RoomTypeId == targetTypeId && r.IsActive
                                && r.Status == "Available"
                                && (r.CleaningStatus == "Clean" || r.CleaningStatus == null))
                    .FirstOrDefaultAsync(r => !_context.BookingDetails.Any(bd =>
                        bd.Id != dto.BookingDetailId &&
                        bd.RoomId == r.Id &&
                        bd.Booking != null &&
                        bd.Booking.StatusString != "Cancelled" &&
                        bd.Booking.StatusString != "CheckedOut" &&
                        bd.CheckInDate < detail.CheckOutDate &&
                        bd.CheckOutDate > detail.CheckInDate));

                if (autoRoom == null)
                    throw new Exception($"Không còn phòng trống và sạch nào thuộc loại #{targetTypeId} trong khoảng thời gian yêu cầu. Vui lòng kiểm tra lại hoặc chỉ định phòng thủ công.");

                targetRoomId = autoRoom.Id;
            }

            // 3. Gán phòng mới cho booking detail
            var oldRoomId = detail.RoomId;
            detail.RoomId = targetRoomId;
            if (dto.RoomTypeId.HasValue)
                detail.RoomTypeId = dto.RoomTypeId;

            // 4. Nếu phòng mới có trạng thái Available thì chuyển sang Occupied khi check-in
            //    Không thay đổi trạng thái ở đây — sẽ xử lý khi Staff bấm Check-In
            //    Chỉ giải phóng phòng cũ nếu nó đã Occupied (nhường chỗ từ booking khác)
            if (oldRoomId.HasValue && oldRoomId != targetRoomId)
            {
                var oldRoom = await _context.Rooms.FindAsync(oldRoomId.Value);
                if (oldRoom != null && oldRoom.Status == "Occupied")
                {
                    // Kiểm tra không còn booking nào khác đang dùng phòng cũ
                    bool stillOccupied = await _context.BookingDetails.AnyAsync(bd =>
                        bd.Id != dto.BookingDetailId &&
                        bd.RoomId == oldRoomId &&
                        bd.Booking != null &&
                        bd.Booking.StatusString == "CheckedIn");

                    if (!stillOccupied)
                        oldRoom.Status = "Available";
                }
            }

            await _context.SaveChangesAsync();

            // Reload để lấy dữ liệu mới nhất
            booking = await _context.Bookings
                .Include(b => b.BookingDetails)
                .Include(b => b.Invoice)
                .Include(b => b.Voucher)
                .FirstAsync(b => b.Id == bookingId);

            return MapToResponseDto(booking);
        }

        /// <summary>
        /// Tách một số phòng ra khỏi booking gốc thành 1 booking mới độc lập.
        /// Scenario: Khách đặt 2 phòng, muốn trả phòng A sớm trong khi vẫn ở phòng B.
        ///   1. Tạo booking mới kế thừa thông tin khách từ booking gốc.
        ///   2. Di chuyển booking detail được chọn sang booking mới.
        ///   3. Nếu CheckOutImmediately=true → tự động CheckedOut + tạo hóa đơn cho booking mới.
        ///   4. Booking gốc giữ nguyên các phòng còn lại.
        /// </summary>
        public async Task<SplitBookingResultDto> SplitBookingAsync(int bookingId, SplitBookingDto dto)
        {
            // ── 1. Load booking gốc ──────────────────────────────────────────
            var original = await _context.Bookings
                .Include(b => b.BookingDetails)
                .Include(b => b.Invoice)
                .Include(b => b.Voucher)
                .FirstOrDefaultAsync(b => b.Id == bookingId);

            if (original == null)
                throw new Exception("Không tìm thấy booking gốc.");

            if (original.BookingDetails.Count < 2)
                throw new Exception("Booking cần có ít nhất 2 phòng để thực hiện tách.");

            // Lấy các detail cần tách
            var detailsToSplit = original.BookingDetails
                .Where(d => dto.BookingDetailIds.Contains(d.Id))
                .ToList();

            if (!detailsToSplit.Any())
                throw new Exception("Không tìm thấy booking detail phù hợp để tách.");

            if (detailsToSplit.Count >= original.BookingDetails.Count)
                throw new Exception("Phải giữ lại ít nhất 1 phòng trong booking gốc. Không thể tách toàn bộ.");

            // ── 2. Tạo booking mới ───────────────────────────────────────────
            var newBookingCode = "BK" + TimeHelper.Now.ToString("yyyyMMddHHmmss") + "S";
            var newBooking = new Booking
            {
                UserId       = original.UserId,
                GuestName    = original.GuestName,
                GuestPhone   = original.GuestPhone,
                GuestEmail   = original.GuestEmail,
                BookingCode  = newBookingCode,
                DepositAmount = dto.NewBookingDepositAmount,
                DepositStatus = dto.NewBookingDepositAmount > 0 ? "Unpaid" : "NotRequired",
                Status       = dto.CheckOutImmediately ? BookingStatus.CheckedOut : original.Status,
            };

            await _context.Bookings.AddAsync(newBooking);
            await _context.SaveChangesAsync(); // Cần ID của newBooking

            // ── 3. Di chuyển detail sang booking mới ─────────────────────────
            foreach (var detail in detailsToSplit)
            {
                detail.BookingId = newBooking.Id;
            }

            await _context.SaveChangesAsync();

            // ── 4. Nếu CheckOut ngay: cập nhật trạng thái phòng + tạo hóa đơn ──
            if (dto.CheckOutImmediately)
            {
                foreach (var detail in detailsToSplit)
                {
                    if (detail.RoomId.HasValue)
                    {
                        var room = await _context.Rooms.FindAsync(detail.RoomId.Value);
                        if (room != null)
                        {
                            room.Status = "Available";
                            room.CleaningStatus = "Dirty";
                        }
                    }
                }
                await _context.SaveChangesAsync();

                // Dùng InvoiceService để tạo hóa đơn đầy đủ (tính service, thuế, discount, ...)
                await _invoiceService.CreateInvoiceAsync(newBooking.Id);
            }

            // ── 5. Cập nhật lại hóa đơn của booking gốc (vì đã mất một số phòng/dịch vụ) ──
            await _invoiceService.RecalculateInvoiceAsync(bookingId);

            // ── 6. Reload cả 2 booking để trả về ────────────────────────────
            var reloadedOriginal = await _context.Bookings
                .Include(b => b.BookingDetails)
                .Include(b => b.Invoice)
                .Include(b => b.Voucher)
                .FirstAsync(b => b.Id == bookingId);

            var reloadedNew = await _context.Bookings
                .Include(b => b.BookingDetails)
                .Include(b => b.Invoice)
                .Include(b => b.Voucher)
                .FirstAsync(b => b.Id == newBooking.Id);

            return new SplitBookingResultDto
            {
                OriginalBooking = MapToResponseDto(reloadedOriginal),
                NewBooking      = MapToResponseDto(reloadedNew),
                Message = dto.CheckOutImmediately
                    ? $"Đã tách và trả phòng thành công. Booking mới: {newBookingCode}"
                    : $"Đã tách thành công. Booking mới: {newBookingCode}"
            };
        }

        public async Task<RoomResponseDto?> GetRoomByIdAsync(int roomId)
        {
            var room = await _context.Rooms
                .Include(r => r.RoomType)
                .FirstOrDefaultAsync(r => r.Id == roomId);

            if (room == null) return null;

            return new RoomResponseDto(
                room.Id,
                room.RoomNumber,
                room.RoomType?.Name ?? "Unknown",
                room.RoomTypeId,
                room.Status,
                room.CleaningStatus,
                room.IsActive,
                room.Floor,
                null // ExtensionNumber
            );
        }
    }
}
