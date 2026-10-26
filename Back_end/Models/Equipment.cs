using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagementAPI.Models;

[Table("Equipments")]
public class Equipment
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("item_code")]
    [MaxLength(50)]
    public string ItemCode { get; set; } = null!;

    [Required]
    [Column("name")]
    [MaxLength(200)]
    public string Name { get; set; } = null!;

    [Column("category")]
    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    [Column("unit")]
    [MaxLength(50)]
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

    [Column("supplier")]
    [MaxLength(200)]
    public string? Supplier { get; set; }

    [Column("image_url")]
    public string? ImageUrl { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = Helpers.TimeHelper.Now;

    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }

    public ICollection<LossAndDamage> LossAndDamages { get; set; } = new List<LossAndDamage>();
}
