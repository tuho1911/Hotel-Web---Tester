using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagementAPI.Models;

[Table("Order_Service_Details")]
public class OrderServiceDetail
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("order_service_id")]
    public int OrderServiceId { get; set; }

    [Column("service_id")]
    public int ServiceId { get; set; }

    [Column("quantity")]
    public int Quantity { get; set; }

    [Column("unit_price")]
    public decimal UnitPrice { get; set; }

    public OrderService? OrderService { get; set; }
    public Service? Service { get; set; }
}

