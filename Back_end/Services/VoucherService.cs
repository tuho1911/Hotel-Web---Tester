using HotelManagementAPI.Data;
using HotelManagementAPI.DTOs;
using HotelManagementAPI.Models;
using Microsoft.EntityFrameworkCore;

using HotelManagementAPI.Helpers;

namespace HotelManagementAPI.Services
{
    public class VoucherService : IVoucherService
    {
        private readonly AppDbContext _context;

        public VoucherService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<VoucherResponseDto>> GetAllAsync()
        {
            var vouchers = await _context.Vouchers
                .OrderByDescending(v => v.CreatedAt)
                .ToListAsync();

            return vouchers.Select(v => MapToDto(v, null));
        }

        public async Task<IEnumerable<VoucherResponseDto>> GetPublicForBookingAsync(decimal? bookingAmount = null)
        {
            var now = TimeHelper.Now;

            var vouchers = await _context.Vouchers
                .Where(v =>
                    v.IsActive &&
                    v.StartDate <= now &&
                    v.EndDate >= now &&
                    (!v.UsageLimit.HasValue || v.UsageCount < v.UsageLimit.Value))
                .OrderBy(v => v.MinBookingAmount)
                .ThenBy(v => v.Code)
                .ToListAsync();

            return vouchers.Select(v => MapToDto(v, bookingAmount));
        }

        public async Task<IEnumerable<VoucherResponseDto>> GetVipForMemberAsync(int membershipId, decimal? bookingAmount = null)
        {
            var now = TimeHelper.Now;

            var vouchers = await _context.Vouchers
                .Where(v =>
                    v.IsActive &&
                    v.StartDate <= now &&
                    v.EndDate >= now &&
                    (!v.UsageLimit.HasValue || v.UsageCount < v.UsageLimit.Value) &&
                    (
                        !v.EligibleMemberOnly ||
                        (v.EligibleMembershipId.HasValue && v.EligibleMembershipId.Value == membershipId)
                    ))
                .OrderBy(v => v.MinBookingAmount)
                .ThenBy(v => v.Code)
                .ToListAsync();

            return vouchers.Select(v => MapToDto(v, bookingAmount));
        }

        public async Task<VoucherResponseDto?> GetByIdAsync(int id)
        {
            var voucher = await _context.Vouchers.FirstOrDefaultAsync(v => v.Id == id);
            return voucher == null ? null : MapToDto(voucher, null);
        }

        public async Task<VoucherResponseDto> CreateAsync(CreateVoucherDto dto)
        {
            await EnsureCodeUniqueAsync(dto.Code, null);
            ValidateVoucherDates(dto.StartDate, dto.EndDate);
            ValidateDiscount(dto.DiscountType, dto.DiscountValue);
            ValidateVipVoucher(dto.EligibleMemberOnly, dto.EligibleMembershipId);

            var voucher = new Voucher
            {
                Code = dto.Code.Trim().ToUpperInvariant(),
                Name = dto.Name.Trim(),
                Description = dto.Description?.Trim(),
                DiscountType = dto.DiscountType,
                DiscountValue = dto.DiscountValue,
                MinBookingAmount = dto.MinBookingAmount,
                MaxDiscountAmount = dto.MaxDiscountAmount,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                UsageLimit = dto.UsageLimit,
                EligibleMembershipId = dto.EligibleMembershipId,
                EligibleMemberOnly = dto.EligibleMemberOnly,
                IsActive = dto.IsActive,
                CreatedAt = TimeHelper.Now,
                UpdatedAt = TimeHelper.Now
            };

            _context.Vouchers.Add(voucher);
            await _context.SaveChangesAsync();

            return MapToDto(voucher, null);
        }

        public async Task<VoucherResponseDto?> UpdateAsync(int id, UpdateVoucherDto dto)
        {
            var voucher = await _context.Vouchers.FirstOrDefaultAsync(v => v.Id == id);
            if (voucher == null) return null;

            await EnsureCodeUniqueAsync(dto.Code, id);
            ValidateVoucherDates(dto.StartDate, dto.EndDate);
            ValidateDiscount(dto.DiscountType, dto.DiscountValue);
            ValidateVipVoucher(dto.EligibleMemberOnly, dto.EligibleMembershipId);

            voucher.Code = dto.Code.Trim().ToUpperInvariant();
            voucher.Name = dto.Name.Trim();
            voucher.Description = dto.Description?.Trim();
            voucher.DiscountType = dto.DiscountType;
            voucher.DiscountValue = dto.DiscountValue;
            voucher.MinBookingAmount = dto.MinBookingAmount;
            voucher.MaxDiscountAmount = dto.MaxDiscountAmount;
            voucher.StartDate = dto.StartDate;
            voucher.EndDate = dto.EndDate;
            voucher.UsageLimit = dto.UsageLimit;
            voucher.EligibleMembershipId = dto.EligibleMembershipId;
            voucher.EligibleMemberOnly = dto.EligibleMemberOnly;
            voucher.IsActive = dto.IsActive;
            voucher.UpdatedAt = TimeHelper.Now;

            await _context.SaveChangesAsync();
            return MapToDto(voucher, null);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var voucher = await _context.Vouchers.FirstOrDefaultAsync(v => v.Id == id);
            if (voucher == null) return false;

            // Kiểm tra xem voucher có đang được sử dụng trong booking nào không
            var isUsed = await _context.Bookings.AnyAsync(b => b.VoucherId == id);
            if (isUsed)
            {
                throw new InvalidOperationException("Voucher đã được sử dụng trong đặt phòng, không thể xóa. Bạn nên chuyển trạng thái sang ngưng hoạt động.");
            }

            _context.Vouchers.Remove(voucher);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<VoucherResponseDto?> ValidateForBookingAsync(int id, decimal bookingAmount)
        {
            var voucher = await _context.Vouchers.FirstOrDefaultAsync(v => v.Id == id);
            if (voucher == null || !IsVoucherValid(voucher, bookingAmount))
            {
                return null;
            }

            return MapToDto(voucher, bookingAmount);
        }

        private async Task EnsureCodeUniqueAsync(string code, int? currentId)
        {
            var normalizedCode = code.Trim().ToUpperInvariant();
            var exists = await _context.Vouchers.AnyAsync(v =>
                v.Code.ToUpper() == normalizedCode && (!currentId.HasValue || v.Id != currentId.Value));

            if (exists)
            {
                throw new InvalidOperationException("Mã voucher đã tồn tại");
            }
        }

        private static void ValidateVoucherDates(DateTime startDate, DateTime endDate)
        {
            if (endDate < startDate)
            {
                throw new InvalidOperationException("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu");
            }
        }

        private static void ValidateDiscount(string discountType, decimal discountValue)
        {
            if (discountType == "Percentage" && discountValue > 100)
            {
                throw new InvalidOperationException("Voucher phần trăm không được vượt quá 100%");
            }
        }

        private static void ValidateVipVoucher(bool eligibleMemberOnly, int? eligibleMembershipId)
        {
            if (eligibleMemberOnly && !eligibleMembershipId.HasValue)
            {
                throw new InvalidOperationException("Voucher VIP phải chỉ định hạng thành viên áp dụng");
            }
        }

        private static bool IsVoucherValid(Voucher voucher, decimal bookingAmount)
        {
            var now = TimeHelper.Now;
            var withinDate = voucher.StartDate <= now && voucher.EndDate >= now;
            var underLimit = !voucher.UsageLimit.HasValue || voucher.UsageCount < voucher.UsageLimit.Value;
            return voucher.IsActive && withinDate && underLimit && bookingAmount >= voucher.MinBookingAmount;
        }

        private static decimal CalculateDiscount(Voucher voucher, decimal bookingAmount)
        {
            decimal discount = voucher.DiscountType == "Fixed"
                ? voucher.DiscountValue
                : bookingAmount * (voucher.DiscountValue / 100m);

            if (voucher.MaxDiscountAmount.HasValue)
            {
                discount = Math.Min(discount, voucher.MaxDiscountAmount.Value);
            }

            return Math.Max(0m, discount);
        }

        private static VoucherResponseDto MapToDto(Voucher voucher, decimal? bookingAmount)
        {
            decimal? estimatedDiscount = bookingAmount.HasValue ? CalculateDiscount(voucher, bookingAmount.Value) : null;

            return new VoucherResponseDto
            {
                Id = voucher.Id,
                Code = voucher.Code,
                Name = voucher.Name,
                Description = voucher.Description,
                DiscountType = voucher.DiscountType,
                DiscountValue = voucher.DiscountValue,
                MinBookingAmount = voucher.MinBookingAmount,
                MaxDiscountAmount = voucher.MaxDiscountAmount,
                StartDate = voucher.StartDate,
                EndDate = voucher.EndDate,
                UsageLimit = voucher.UsageLimit,
                EligibleMembershipId = voucher.EligibleMembershipId,
                EligibleMemberOnly = voucher.EligibleMemberOnly,
                UsageCount = voucher.UsageCount,
                IsActive = voucher.IsActive,
                IsCurrentlyValid = IsVoucherValid(voucher, bookingAmount ?? voucher.MinBookingAmount),
                EstimatedDiscountAmount = estimatedDiscount
            };
        }
    }
}
