using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HotelManagementAPI.Enums;

namespace HotelManagementAPI.Models
{
    [Table("Bookings")]
    public class Booking
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("user_id")]
        public int? UserId { get; set; }

        [Column("guest_name")]
        [StringLength(255)]
        public string? GuestName { get; set; }

        [Column("guest_phone")]
        [StringLength(50)]
        public string? GuestPhone { get; set; }

        [Column("guest_email")]
        [StringLength(255)]
        public string? GuestEmail { get; set; }

        [Column("booking_code")]
        [StringLength(50)]
        public string? BookingCode { get; set; }

        [Column("voucher_id")]
        public int? VoucherId { get; set; }

        // Lưu trực tiếp vào column "status" dưới dạng string nullable
        [Column("status")]
        [StringLength(50)]
        public string? StatusString { get; set; }

        [NotMapped]
        public BookingStatus Status
        {
            get => Enum.TryParse<BookingStatus>(StatusString, true, out var s) ? s : BookingStatus.Pending;
            set => StatusString = value.ToString();
        }

        [Column("deposit_amount", TypeName = "decimal(18,2)")]
        public decimal DepositAmount { get; set; } = 0;

        [Column("deposit_status")]
        [StringLength(50)]
        public string? DepositStatus { get; set; } = "Unpaid";

        // Navigation properties
        public User? User { get; set; }
        public Voucher? Voucher { get; set; }
        public ICollection<BookingDetail> BookingDetails { get; set; } = new List<BookingDetail>();
        public Invoice? Invoice { get; set; }
    }
}
