using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HotelManagementAPI.Enums;
using System;

namespace HotelManagementAPI.Models
{
    [Table("Invoices")]
    public class Invoice
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("booking_id")]
        public int? BookingId { get; set; }

        [Column("total_room_amount")]
        public decimal? TotalRoomAmount { get; set; }

        [Column("total_service_amount")]
        public decimal? TotalServiceAmount { get; set; }

        [Column("discount_amount")]
        public decimal? DiscountAmount { get; set; }

        [Column("tax_amount")]
        public decimal? TaxAmount { get; set; }

        [Column("final_total")]
        public decimal? FinalTotal { get; set; }

        [Column("status")]
        [StringLength(50)]
        public string? StatusString { get; set; }

        [NotMapped]
        public InvoiceStatus Status
        {
            get => Enum.TryParse<InvoiceStatus>(StatusString, true, out var s) ? s : InvoiceStatus.Unpaid;
            set => StatusString = value.ToString();
        }

        // Navigation properties
        public Booking? Booking { get; set; }
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    }
}
