using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagementAPI.Models;

[Table("Loss_And_Damages")]
public class LossAndDamage
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("equipment_id")]
    public int EquipmentId { get; set; }

    [Column("booking_detail_id")]
    public int? BookingDetailId { get; set; }

    [Column("room_inventory_id")]
    public int? RoomInventoryId { get; set; }

    [Column("quantity")]
    public int Quantity { get; set; }

    [Column("penalty_amount", TypeName = "decimal(18,2)")]
    public decimal PenaltyAmount { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("image_url")]
    public string? ImageUrl { get; set; }

    [Column("status")]
    [MaxLength(20)]
    public string Status { get; set; } = "pending";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = Helpers.TimeHelper.Now;

    [ForeignKey(nameof(EquipmentId))]
    public Equipment? Equipment { get; set; }

    [ForeignKey(nameof(RoomInventoryId))]
    public RoomInventory? RoomInventory { get; set; }
}
