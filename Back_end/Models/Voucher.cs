using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagementAPI.Models
{
    [Table("Vouchers")]
    public class Voucher
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("code")]
        [StringLength(50)]
        public string Code { get; set; } = string.Empty;

        [Column("name")]
        [StringLength(255)]
        public string Name { get; set; } = string.Empty;

        [Column("description")]
        public string? Description { get; set; }

        [Column("discount_type")]
        [StringLength(20)]
        public string DiscountType { get; set; } = "Percentage";

        [Column("discount_value")]
        public decimal DiscountValue { get; set; }

        [Column("min_booking_amount")]
        public decimal MinBookingAmount { get; set; }

        [Column("max_discount_amount")]
        public decimal? MaxDiscountAmount { get; set; }

        [Column("start_date")]
        public DateTime StartDate { get; set; }

        [Column("end_date")]
        public DateTime EndDate { get; set; }

        [Column("usage_limit")]
        public int? UsageLimit { get; set; }

        [Column("eligible_membership_id")]
        public int? EligibleMembershipId { get; set; }

        [Column("eligible_member_only")]
        public bool EligibleMemberOnly { get; set; }

        [Column("usage_count")]
        public int UsageCount { get; set; }

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    }
}
