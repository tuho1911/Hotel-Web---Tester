using System;
using System.ComponentModel.DataAnnotations;

namespace HotelManagementAPI.DTOs
{
    public class VoucherResponseDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string DiscountType { get; set; } = string.Empty;
        public decimal DiscountValue { get; set; }
        public decimal MinBookingAmount { get; set; }
        public decimal? MaxDiscountAmount { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int? UsageLimit { get; set; }
        public int? EligibleMembershipId { get; set; }
        public bool EligibleMemberOnly { get; set; }
        public int UsageCount { get; set; }
        public bool IsActive { get; set; }
        public bool IsCurrentlyValid { get; set; }
        public decimal? EstimatedDiscountAmount { get; set; }
    }

    public class CreateVoucherDto
    {
        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Required]
        [RegularExpression("Percentage|Fixed")]
        public string DiscountType { get; set; } = "Percentage";

        [Range(0.01, double.MaxValue)]
        public decimal DiscountValue { get; set; }

        [Range(0, double.MaxValue)]
        public decimal MinBookingAmount { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? MaxDiscountAmount { get; set; }

        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }

        [Range(1, int.MaxValue)]
        public int? UsageLimit { get; set; }

        public int? EligibleMembershipId { get; set; }
        public bool EligibleMemberOnly { get; set; } = false;

        public bool IsActive { get; set; } = true;
    }

    public class UpdateVoucherDto : CreateVoucherDto
    {
    }
}
