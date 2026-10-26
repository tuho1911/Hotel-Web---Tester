using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagementAPI.Models;

[Table("Attractions")]
public class Attraction
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("distance_km", TypeName = "decimal(5,2)")]
    public decimal? DistanceKm { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("address")]
    public string? Address { get; set; }

    [Column("map_embed_link")]
    public string? MapEmbedLink { get; set; }

    [Column("category")]
    public string? Category { get; set; }

    // Cho Google Maps Marker
    [Column("latitude", TypeName = "decimal(18, 10)")]
    public decimal? Latitude { get; set; }

    [Column("longitude", TypeName = "decimal(18, 10)")]
    public decimal? Longitude { get; set; }

    // Ảnh đại diện
    [Column("image_url")]
    public string? ImageUrl { get; set; }

    // Soft delete — ẩn điểm đã xóa (is_active = false)
    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime? CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }
}
