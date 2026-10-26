using HotelManagementAPI.Data;
using HotelManagementAPI.DTOs;
using HotelManagementAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementAPI.Services
{
    public class MembershipService : IMembershipService
    {
        private readonly AppDbContext _context;

        public MembershipService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<MembershipResponseDto>> GetAllAsync()
        {
            return await _context.Memberships
                .AsNoTracking()
                .Select(m => new MembershipResponseDto
                {
                    Id = m.Id,
                    TierName = m.TierName,
                    MinPoints = m.MinPoints,
                    DiscountPercent = m.DiscountPercent,
                    CreatedAt = m.CreatedAt,
                    UserCount = m.Users.Count
                })
                .OrderBy(m => m.MinPoints)
                .ThenBy(m => m.Id)
                .ToListAsync();
        }

        public async Task<MembershipResponseDto?> GetByIdAsync(int id)
        {
            return await _context.Memberships
                .AsNoTracking()
                .Where(m => m.Id == id)
                .Select(m => new MembershipResponseDto
                {
                    Id = m.Id,
                    TierName = m.TierName,
                    MinPoints = m.MinPoints,
                    DiscountPercent = m.DiscountPercent,
                    CreatedAt = m.CreatedAt,
                    UserCount = m.Users.Count
                })
                .FirstOrDefaultAsync();
        }

        public async Task<MembershipResponseDto> CreateAsync(CreateMembershipDto dto)
        {
            var entity = new Membership
            {
                TierName = dto.TierName.Trim(),
                MinPoints = dto.MinPoints,
                DiscountPercent = dto.DiscountPercent,
                CreatedAt = DateTime.Now
            };

            _context.Memberships.Add(entity);
            await _context.SaveChangesAsync();
            return await GetByIdRequiredAsync(entity.Id);
        }

        public async Task<MembershipResponseDto?> UpdateAsync(int id, UpdateMembershipDto dto)
        {
            var entity = await _context.Memberships.FirstOrDefaultAsync(m => m.Id == id);
            if (entity == null) return null;

            entity.TierName = dto.TierName.Trim();
            entity.MinPoints = dto.MinPoints;
            entity.DiscountPercent = dto.DiscountPercent;
            await _context.SaveChangesAsync();

            return await GetByIdAsync(id);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _context.Memberships.FirstOrDefaultAsync(m => m.Id == id);
            if (entity == null) return false;

            var hasUsers = await _context.Users.AnyAsync(u => u.MembershipId == id);
            if (hasUsers)
            {
                throw new InvalidOperationException("Không thể xóa hạng thành viên đang được sử dụng");
            }

            _context.Memberships.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<LoyaltyUpdateResultDto?> RecalculateMemberTierAsync(int userId)
        {
            var user = await _context.Users
                .Include(u => u.Membership)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null) return null;

            var bestMembership = await _context.Memberships
                .AsNoTracking()
                .Where(m => m.MinPoints == null || m.MinPoints <= user.LoyaltyPoints)
                .OrderByDescending(m => m.MinPoints ?? 0)
                .ThenByDescending(m => m.Id)
                .FirstOrDefaultAsync();

            user.MembershipId = bestMembership?.Id;
            await _context.SaveChangesAsync();

            return new LoyaltyUpdateResultDto
            {
                UserId = user.Id,
                LoyaltyPoints = user.LoyaltyPoints,
                MembershipId = user.MembershipId,
                MembershipName = bestMembership?.TierName
            };
        }

        private async Task<MembershipResponseDto> GetByIdRequiredAsync(int id)
        {
            var dto = await GetByIdAsync(id);
            if (dto == null)
            {
                throw new InvalidOperationException("Không thể tạo hạng thành viên");
            }
            return dto;
        }
    }
}
