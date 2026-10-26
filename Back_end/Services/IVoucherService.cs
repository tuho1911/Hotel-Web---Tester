using HotelManagementAPI.DTOs;

namespace HotelManagementAPI.Services
{
    public interface IVoucherService
    {
        Task<IEnumerable<VoucherResponseDto>> GetAllAsync();
        Task<IEnumerable<VoucherResponseDto>> GetPublicForBookingAsync(decimal? bookingAmount = null);
        Task<IEnumerable<VoucherResponseDto>> GetVipForMemberAsync(int membershipId, decimal? bookingAmount = null);
        Task<VoucherResponseDto?> GetByIdAsync(int id);
        Task<VoucherResponseDto> CreateAsync(CreateVoucherDto dto);
        Task<VoucherResponseDto?> UpdateAsync(int id, UpdateVoucherDto dto);
        Task<bool> DeleteAsync(int id);
        Task<VoucherResponseDto?> ValidateForBookingAsync(int id, decimal bookingAmount);
    }
}
