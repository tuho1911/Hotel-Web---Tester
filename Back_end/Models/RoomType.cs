using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagementAPI.Models;

// Table name phải là Room_Types (đúng với 00_MASTER_INSTALL.sql)
[Table("Room_Types")]
public class RoomType
{
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("base_price")]
    public decimal BasePrice { get; set; }

    // DB có capacity_adults + capacity_children (không phải max_occupancy)
    [Column("capacity_adults")]
    public int CapacityAdults { get; set; }

    [Column("capacity_children")]
    public int CapacityChildren { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    // DB dùng size_sqm kiểu int (không phải size_m2 decimal)
    [Column("size_sqm")]
    public int? SizeSqm { get; set; }

    [Column("bed_type")]
    public string? BedType { get; set; }

    [Column("view_type")]
    public string? ViewType { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("slug")]
    public string? Slug { get; set; }

    [Column("content")]
    public string? Content { get; set; }

    // Navigation
    public ICollection<Room>? Rooms { get; set; }
    public ICollection<RoomImage>? Images { get; set; }
    public ICollection<Amenity>? Amenities { get; set; }
}
