using HotelManagementAPI.DTOs;

namespace HotelManagementAPI.Services
{
    public interface IMembershipService
    {
        Task<IEnumerable<MembershipResponseDto>> GetAllAsync();
        Task<MembershipResponseDto?> GetByIdAsync(int id);
        Task<MembershipResponseDto> CreateAsync(CreateMembershipDto dto);
        Task<MembershipResponseDto?> UpdateAsync(int id, UpdateMembershipDto dto);
        Task<bool> DeleteAsync(int id);
        Task<LoyaltyUpdateResultDto?> RecalculateMemberTierAsync(int userId);
    }
}
