using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagementAPI.DTOs;

[Table("Equipments")]
public class EquipmentSnapshotDto
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("item_code")]
    public string ItemCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    [Column("category")]
    public string Category { get; set; } = string.Empty;

    [MaxLength(50)]
    [Column("unit")]
    public string Unit { get; set; } = string.Empty;

    [Column("total_quantity")]
    public int TotalQuantity { get; set; }

    [Column("in_use_quantity")]
    public int InUseQuantity { get; set; }

    [Column("damaged_quantity")]
    public int DamagedQuantity { get; set; }

    [Column("liquidated_quantity")]
    public int LiquidatedQuantity { get; set; }

    [NotMapped]
    public int InStockQuantity =>
        TotalQuantity - InUseQuantity - DamagedQuantity - LiquidatedQuantity;

    [Column("base_price", TypeName = "decimal(18,2)")]
    public decimal BasePrice { get; set; }

    [Column("default_price_if_lost", TypeName = "decimal(18,2)")]
    public decimal DefaultPriceIfLost { get; set; }

    [MaxLength(255)]
    [Column("supplier")]
    public string? Supplier { get; set; }

    [Column("image_url")]
    public string? ImageUrl { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime? CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }
}
