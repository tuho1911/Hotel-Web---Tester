using System;
using System.ComponentModel.DataAnnotations;

namespace HotelManagementAPI.DTOs
{
    public class MembershipResponseDto
    {
        public int Id { get; set; }
        public string TierName { get; set; } = string.Empty;
        public int? MinPoints { get; set; }
        public decimal? DiscountPercent { get; set; }
        public DateTime? CreatedAt { get; set; }
        public int UserCount { get; set; }
    }

    public class LoyaltyUpdateResultDto
    {
        public int UserId { get; set; }
        public int LoyaltyPoints { get; set; }
        public int? MembershipId { get; set; }
        public string? MembershipName { get; set; }
    }

    public class CreateMembershipDto
    {
        [Required]
        [MaxLength(100)]
        public string TierName { get; set; } = string.Empty;

        public int? MinPoints { get; set; }
        public decimal? DiscountPercent { get; set; }
    }

    public class UpdateMembershipDto : CreateMembershipDto
    {
    }
}
