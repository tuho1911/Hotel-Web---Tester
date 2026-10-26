using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HotelManagementAPI.Helpers;

namespace HotelManagementAPI.Models;

[Table("Reviews")]
public class Review
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [Column("target_type")]
    [MaxLength(50)]
    public string TargetType { get; set; } = string.Empty; // 'Article' or 'Attraction'

    [Required]
    [Column("target_id")]
    public int TargetId { get; set; }

    [Column("user_id")]
    public int? UserId { get; set; }

    [Column("guest_name")]
    [MaxLength(255)]
    public string? GuestName { get; set; }

    [Required]
    [Column("rating")]
    public int Rating { get; set; } = 5;

    [Column("comment")]
    public string? Comment { get; set; }

    [Column("is_approved")]
    public bool IsApproved { get; set; } = false;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = TimeHelper.Now;

    // Navigation
    public User? User { get; set; }
}
