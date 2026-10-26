using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HotelManagementAPI.Enums;

namespace HotelManagementAPI.Models;

[Table("Order_Services")]
public class OrderService
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("booking_detail_id")]
    public int? BookingDetailId { get; set; }

    [Column("order_date")]
    public DateTime? OrderDate { get; set; }

    [Column("total_amount")]
    public decimal? TotalAmount { get; set; }

    [Column("status")]
    [StringLength(50)]
    public string? StatusString { get; set; }

    [NotMapped]
    public OrderServiceStatus Status
    {
        get => Enum.TryParse<OrderServiceStatus>(StatusString, true, out var s) ? s : OrderServiceStatus.Pending;
        set => StatusString = value.ToString();
    }

    public BookingDetail? BookingDetail { get; set; }
    public ICollection<OrderServiceDetail> Details { get; set; } = new List<OrderServiceDetail>();
}

