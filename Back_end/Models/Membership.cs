using System.ComponentModel.DataAnnotations.Schema;
using HotelManagementAPI.Models;

[Table("Memberships")]
public class Membership
{
    [Column("id")] public int Id { get; set; }
    [Column("tier_name")] public string TierName { get; set; } = string.Empty;
    [Column("min_points")] public int? MinPoints { get; set; }
    [Column("discount_percent")] public decimal? DiscountPercent { get; set; }
    [Column("created_at")] public DateTime? CreatedAt { get; set; }
    public ICollection<User> Users { get; set; } = new List<User>();
}