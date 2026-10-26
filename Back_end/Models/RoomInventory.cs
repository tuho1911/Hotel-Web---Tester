using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagementAPI.Models;

// Bảng Room_Inventory: danh sách vật dụng/thiết bị trong từng phòng
// Mỗi record = 1 loại thiết bị (Equipment) được gán vào 1 phòng (Room)
[Table("Room_Inventory")]
public class RoomInventory
{
    [Column("id")]
    public int Id { get; set; }

    [Column("room_id")]
    public int? RoomId { get; set; }

    [Column("quantity")]
    public int? Quantity { get; set; }

    [Column("price_if_lost")]
    public decimal? PriceIfLost { get; set; }

    [Column("note")]
    public string? Note { get; set; }

    [Column("is_active")]
    public bool? IsActive { get; set; }

    // Asset | Consumable
    [Column("item_type")]
    public string? ItemType { get; set; }

    // FK → Equipments(Id) — tên cột giữ PascalCase đúng theo DB
    [Column("EquipmentId")]
    public int EquipmentId { get; set; }

    // Navigation
    public Room? Room { get; set; }
    public Equipment? Equipment { get; set; }
}
