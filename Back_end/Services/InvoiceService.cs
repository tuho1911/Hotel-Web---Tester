using System;
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
    public class InvoiceService : IInvoiceService
    {
        private readonly AppDbContext _context;

        public InvoiceService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<InvoiceResponseDto?> GetInvoiceByBookingIdAsync(int bookingId)
        {
            var invoice = await _context.Invoices
                .Include(i => i.Payments)
                .FirstOrDefaultAsync(i => i.BookingId == bookingId);

            if (invoice == null) return null;

            await RecalculateInvoiceAsync(bookingId);
            return await MapToDtoAsync(invoice);
        }

        public async Task<InvoiceResponseDto> CreateInvoiceAsync(int bookingId)
        {
            // ── Kiểm tra hóa đơn đã tồn tại → trả về luôn, không tạo trùng ──
            var existingInvoice = await _context.Invoices
                .Include(i => i.Payments)
                .FirstOrDefaultAsync(i => i.BookingId == bookingId);

            if (existingInvoice != null)
            {
                // Recalculate để cập nhật số liệu mới nhất rồi trả về
                await RecalculateInvoiceAsync(bookingId);
                existingInvoice = await _context.Invoices
                    .Include(i => i.Payments)
                    .FirstOrDefaultAsync(i => i.BookingId == bookingId);
                return await MapToDtoAsync(existingInvoice!);
            }

            var booking = await _context.Bookings
                .Include(b => b.BookingDetails)
                .Include(b => b.Voucher)
                .FirstOrDefaultAsync(b => b.Id == bookingId);

            if (booking == null) throw new Exception("Booking not found");

            decimal totalRoom = booking.BookingDetails.Sum(bd =>
                Math.Max(1, (decimal)(bd.CheckOutDate.Date - bd.CheckInDate.Date).Days) * bd.PricePerNight);

            // Chỉ tính dịch vụ đã Delivered (bao gồm giá trị '1' hoặc 'Delivered' trong CSDL) để lên hóa đơn
            var deliveredServiceTotal = await _context.OrderServices
                .Include(o => o.BookingDetail)
                .Where(o => o.BookingDetail != null && o.BookingDetail.BookingId == bookingId && (o.StatusString == OrderServiceStatus.Delivered.ToString() || o.StatusString == "1"))
                .SumAsync(o => (decimal?)(o.TotalAmount ?? 0)) ?? 0m;

            // Tính tiền phạt hỏng hóc vật tư
            var detailIds = booking.BookingDetails.Select(bd => bd.Id).ToList();
            var penaltyTotal = await _context.LossAndDamages
                .Where(ld => ld.BookingDetailId.HasValue && detailIds.Contains(ld.BookingDetailId.Value) && ld.Status == "confirmed")
                .SumAsync(ld => ld.PenaltyAmount);
            
            deliveredServiceTotal += penaltyTotal;

            var discount = CalculateVoucherDiscount(booking, totalRoom + deliveredServiceTotal);
            var invoice = new Invoice
            {
                BookingId = bookingId,
                TotalRoomAmount = totalRoom,
                TotalServiceAmount = deliveredServiceTotal,
                DiscountAmount = discount,
                TaxAmount = (totalRoom + deliveredServiceTotal - discount) * 0.1m,
                FinalTotal = (totalRoom + deliveredServiceTotal - discount) * 1.1m,
                Status = InvoiceStatus.Unpaid
            };

            if (invoice.FinalTotal < 0) invoice.FinalTotal = 0;

            if (booking.VoucherId.HasValue && booking.Voucher != null)
            {
                booking.Voucher.UsageCount += 1;
            }

            await _context.Invoices.AddAsync(invoice);
            await _context.SaveChangesAsync();

            return await MapToDtoAsync(invoice);
        }

        public async Task RecalculateInvoiceAsync(int bookingId)
        {
            var booking = await _context.Bookings
                .Include(b => b.BookingDetails)
                .Include(b => b.Voucher)
                .FirstOrDefaultAsync(b => b.Id == bookingId);
            if (booking == null) return;

            var invoice = await _context.Invoices
                .Include(i => i.Payments)
                .FirstOrDefaultAsync(i => i.BookingId == bookingId);
            bool isNew = false;
            if (invoice == null)
            {
                invoice = new Invoice
                {
                    BookingId = bookingId,
                    Status = InvoiceStatus.Unpaid,
                    TotalRoomAmount = 0,
                    TotalServiceAmount = 0,
                    TaxAmount = 0,
                    DiscountAmount = 0,
                    FinalTotal = 0
                };
                isNew = true;
            }

            var totalRoom = booking.BookingDetails.Sum(bd =>
                Math.Max(1, (decimal)(bd.CheckOutDate.Date - bd.CheckInDate.Date).Days) * bd.PricePerNight);

            var deliveredServiceTotal = await _context.OrderServices
                .Include(o => o.BookingDetail)
                .Where(o => o.BookingDetail != null && o.BookingDetail.BookingId == bookingId && (o.StatusString == OrderServiceStatus.Delivered.ToString() || o.StatusString == "1"))
                .SumAsync(o => (decimal?)(o.TotalAmount ?? 0)) ?? 0m;

            var detailIds = booking.BookingDetails.Select(bd => bd.Id).ToList();
            var penaltyTotal = await _context.LossAndDamages
                .Where(ld => ld.BookingDetailId.HasValue && detailIds.Contains(ld.BookingDetailId.Value) && ld.Status == "confirmed")
                .SumAsync(ld => ld.PenaltyAmount);
                
            deliveredServiceTotal += penaltyTotal;

            var discount = CalculateVoucherDiscount(booking, totalRoom + deliveredServiceTotal);
            var subTotal = totalRoom + deliveredServiceTotal - discount;
            if (subTotal < 0) subTotal = 0;

            var tax = subTotal * 0.1m;
            invoice.TotalRoomAmount = totalRoom;
            invoice.TotalServiceAmount = deliveredServiceTotal;
            invoice.DiscountAmount = discount;
            invoice.TaxAmount = tax;
            invoice.FinalTotal = subTotal + tax;

            // Only count deposit after it has actually been paid.
            decimal deposit = GetEffectiveDepositAmount(booking);
            decimal totalPaid = (invoice.Payments?.Sum(p => p.AmountPaid) ?? 0m) + deposit;
            
            var oldStatus = invoice.Status;

            if (invoice.FinalTotal == 0)
            {
                invoice.Status = InvoiceStatus.Paid;
            }
            else if (totalPaid >= invoice.FinalTotal)
            {
                invoice.Status = InvoiceStatus.Paid;
            }
            else if (totalPaid > 0)
            {
                invoice.Status = InvoiceStatus.PartiallyPaid;
            }
            else
            {
                invoice.Status = InvoiceStatus.Unpaid;
            }

            if (oldStatus != InvoiceStatus.Paid && invoice.Status == InvoiceStatus.Paid)
            {
                if (booking?.UserId != null && booking.UserId > 0)
                {
                    await AddLoyaltyPointsInternalAsync(booking.Id, invoice.FinalTotal ?? 0m);
                }
            }

            if (isNew)
            {
                await _context.Invoices.AddAsync(invoice);
            }
            await _context.SaveChangesAsync();
        }

        public async Task<PaymentResponseDto> AddPaymentAsync(int invoiceId, AddPaymentDto paymentDto)
        {
            var invoice = await _context.Invoices
                .Include(i => i.Payments)
                .FirstOrDefaultAsync(i => i.Id == invoiceId);

            if (invoice == null) throw new Exception("Invoice not found");

            var payment = new Payment
            {
                InvoiceId = invoiceId,
                PaymentMethod = paymentDto.PaymentMethod,
                AmountPaid = paymentDto.AmountPaid,
                // Tự động sinh mã giao dịch nếu client không gửi
                TransactionCode = !string.IsNullOrWhiteSpace(paymentDto.TransactionCode)
                    ? paymentDto.TransactionCode
                    : $"TXN-{TimeHelper.Now:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
                PaymentDate = TimeHelper.Now
            };

            await _context.Payments.AddAsync(payment);
            
            // Check if fully paid (including a paid deposit only)
            var bookingRecord = await _context.Bookings.FindAsync(invoice.BookingId);
            decimal depositAmt = GetEffectiveDepositAmount(bookingRecord);
            var totalWithDeposit = invoice.Payments.Sum(p => p.AmountPaid) + payment.AmountPaid + depositAmt;
            
            var oldStatus = invoice.Status;

            if (totalWithDeposit >= invoice.FinalTotal)
                invoice.Status = InvoiceStatus.Paid;
            else if (totalWithDeposit > 0)
                invoice.Status = InvoiceStatus.PartiallyPaid;

            if (oldStatus != InvoiceStatus.Paid && invoice.Status == InvoiceStatus.Paid)
            {
                if (bookingRecord?.UserId != null && bookingRecord.UserId > 0)
                {
                    await AddLoyaltyPointsInternalAsync(bookingRecord.Id, invoice.FinalTotal ?? 0m);
                }
            }

            await _context.SaveChangesAsync();

            return new PaymentResponseDto
            {
                Id = payment.Id,
                PaymentMethod = payment.PaymentMethod,
                AmountPaid = payment.AmountPaid,
                TransactionCode = payment.TransactionCode,
                PaymentDate = payment.PaymentDate
            };
        }

        public async Task<InvoiceResponseDto?> MarkInvoicePaidAsync(int bookingId, string? transactionCode = null)
        {
            var invoice = await _context.Invoices
                .Include(i => i.Payments)
                .FirstOrDefaultAsync(i => i.BookingId == bookingId);

            if (invoice == null) return null;

            var oldStatus = invoice.Status;
            invoice.Status = InvoiceStatus.Paid;

            if (oldStatus != InvoiceStatus.Paid)
            {
                var booking = await _context.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId);
                if (booking?.UserId != null && booking.UserId > 0)
                {
                    await AddLoyaltyPointsInternalAsync(bookingId, invoice.FinalTotal ?? 0m);
                }
            }

            await _context.SaveChangesAsync();
            return await GetInvoiceByBookingIdAsync(bookingId);
        }

        private async Task AddLoyaltyPointsInternalAsync(int bookingId, decimal finalTotal)
        {
            var booking = await _context.Bookings.Include(b => b.User).FirstOrDefaultAsync(b => b.Id == bookingId);
            if (booking?.User == null) return;

            var loyaltyPointsToAdd = Math.Max(1, (int)Math.Floor(finalTotal / 100000m));
            booking.User.LoyaltyPoints += loyaltyPointsToAdd;
            
            booking.User.MembershipId = await _context.Memberships
                .Where(m => m.MinPoints == null || m.MinPoints <= booking.User.LoyaltyPoints)
                .OrderByDescending(m => m.MinPoints ?? 0)
                .ThenByDescending(m => m.Id)
                .Select(m => (int?)m.Id)
                .FirstOrDefaultAsync();
        }

        private async Task<InvoiceResponseDto> MapToDtoAsync(Invoice invoice)
        {
            var bookingId = invoice.BookingId;
            var booking = await _context.Bookings.FindAsync(invoice.BookingId);
            var depositRequiredAmount = Math.Max(0m, booking?.DepositAmount ?? 0m);
            var depositPaidAmount = GetEffectiveDepositAmount(booking);
            
            // Lấy danh sách dịch vụ
            var services = await _context.OrderServices
                .Include(o => o.Details)
                    .ThenInclude(d => d.Service)
                .Include(o => o.BookingDetail)
                .Where(o => o.BookingDetail != null && o.BookingDetail.BookingId == bookingId && (o.StatusString == "Delivered" || o.StatusString == "1"))
                .ToListAsync();

            // Lấy danh sách hỏng hóc
            var detailIds = await _context.BookingDetails
                .Where(bd => bd.BookingId == bookingId)
                .Select(bd => bd.Id)
                .ToListAsync();

            var damages = await _context.LossAndDamages
                .Include(ld => ld.Equipment)
                .Include(ld => ld.RoomInventory)
                    .ThenInclude(ri => ri!.Room)
                .Where(ld => ld.BookingDetailId.HasValue && detailIds.Contains(ld.BookingDetailId.Value) && ld.Status == "confirmed")
                .ToListAsync();

            return new InvoiceResponseDto
            {
                Id = invoice.Id,
                BookingId = invoice.BookingId,
                TotalRoomAmount = invoice.TotalRoomAmount ?? 0,
                TotalServiceAmount = invoice.TotalServiceAmount ?? 0,
                DiscountAmount = invoice.DiscountAmount ?? 0,
                TaxAmount = invoice.TaxAmount ?? 0,
                FinalTotal = invoice.FinalTotal ?? 0,
                Status = invoice.Status,
                Payments = invoice.Payments?.Select(p => new PaymentResponseDto
                {
                    Id = p.Id,
                    PaymentMethod = p.PaymentMethod,
                    AmountPaid = p.AmountPaid,
                    TransactionCode = p.TransactionCode,
                    PaymentDate = p.PaymentDate
                }).ToList() ?? new System.Collections.Generic.List<PaymentResponseDto>(),
                ServiceOrders = services.Select(s => new OrderServiceResponseDto(
                    s.Id,
                    s.BookingDetailId,
                    s.OrderDate,
                    s.TotalAmount ?? 0,
                    s.Status,
                    s.Details.Select(sd => new OrderServiceDetailDto(
                        sd.ServiceId,
                        sd.Service?.Name ?? "N/A",
                        sd.Quantity,
                        sd.UnitPrice,
                        sd.UnitPrice * sd.Quantity
                    )).ToList()
                )).ToList(),
                LossDamages = damages.Select(ld => new LossDamageResponseDto(
                    ld.Id,
                    ld.BookingDetailId,
                    ld.RoomInventoryId,
                    ld.Quantity,
                    ld.PenaltyAmount,
                    ld.Description,
                    ld.ImageUrl,
                    ld.CreatedAt,
                    ld.RoomInventory?.Room?.RoomNumber,
                    ld.Equipment?.Name ?? ld.RoomInventory?.Equipment?.Name ?? "Vật tư"
                )).ToList(),
                DepositAmount = depositRequiredAmount,
                DepositPaidAmount = depositPaidAmount,
                DepositRemainingAmount = Math.Max(0m, depositRequiredAmount - depositPaidAmount),
                DepositStatus = ResolveDepositStatus(booking)
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

        private static string ResolveDepositStatus(Booking? booking)
        {
            if (booking == null || booking.DepositAmount <= 0)
            {
                return "NotRequired";
            }

            return string.IsNullOrWhiteSpace(booking.DepositStatus)
                ? "Unpaid"
                : booking.DepositStatus;
        }

        private static decimal CalculateVoucherDiscount(Booking booking, decimal baseAmount)
        {
            if (booking.Voucher == null)
            {
                return 0m;
            }

            var voucher = booking.Voucher;
            var now = TimeHelper.Now;
            var canApply = voucher.IsActive
                && voucher.StartDate <= now
                && voucher.EndDate >= now
                && baseAmount >= voucher.MinBookingAmount;

            if (!canApply)
            {
                return 0m;
            }

            var discount = voucher.DiscountType == "Fixed"
                ? voucher.DiscountValue
                : baseAmount * (voucher.DiscountValue / 100m);

            if (voucher.MaxDiscountAmount.HasValue)
            {
                discount = Math.Min(discount, voucher.MaxDiscountAmount.Value);
            }

            return Math.Max(0m, discount);
        }
    }
}
