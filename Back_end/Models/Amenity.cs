using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace HotelManagementAPI.Models;

[Table("Amenities")]
public class Amenity
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("icon_url")]
    public string? IconUrl { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    // Many-to-Many relationship
    [JsonIgnore]
    public ICollection<RoomType>? RoomTypes { get; set; }
}
