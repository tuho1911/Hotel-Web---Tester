using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagementAPI.Models
{
    [Table("Payments")]
    public class Payment
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("invoice_id")]
        public int? InvoiceId { get; set; }

        [Column("payment_method")]
        [StringLength(50)]
        public string? PaymentMethod { get; set; }

        [Column("amount_paid")]
        public decimal AmountPaid { get; set; }

        [Column("transaction_code")]
        [StringLength(100)]
        public string? TransactionCode { get; set; }

        [Column("payment_date")]
        public DateTime? PaymentDate { get; set; }

        // Navigation properties
        public Invoice? Invoice { get; set; }
    }
}
