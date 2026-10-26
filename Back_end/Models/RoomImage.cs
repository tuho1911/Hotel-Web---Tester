using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagementAPI.Models;

[Table("Room_Images")]
public class RoomImage
{
    [Column("id")]
    public int Id { get; set; }

    [Column("room_type_id")]
    public int? RoomTypeId { get; set; }

    [Column("image_url")]
    public string ImageUrl { get; set; } = string.Empty;

    // Thêm vào DB qua patch_room_images_add_public_id.sql (dùng cho Cloudinary)
    [Column("public_id")]
    public string? PublicId { get; set; }

    [Column("is_primary")]
    public bool? IsPrimary { get; set; }

    [Column("is_active")]
    public bool? IsActive { get; set; }

    // Navigation
    public RoomType? RoomType { get; set; }
}
