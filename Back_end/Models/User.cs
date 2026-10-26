using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagementAPI.Models;

[Table("Users")]
public class User
{
    
    [Column("id")] public int Id { get; set; }
    [Column("role_id")] public int? RoleId { get; set; }
    [Column("full_name")] public string FullName { get; set; } = string.Empty;
    [Column("email")] public string Email { get; set; } = string.Empty;
    [Column("phone")] public string? Phone { get; set; }
    [Column("password_hash")] public string PasswordHash { get; set; } = string.Empty;
    [Column("status")] public bool Status { get; set; } = true;
    [Column("avatar_url")] public string? AvatarUrl { get; set; }
    [Column("created_at")] public DateTime? CreatedAt { get; set; }
    [Column("refresh_token")] public string? RefreshToken { get; set; }
    [Column("refresh_token_expiry")] public DateTime? RefreshTokenExpiry { get; set; }
    [Column("avatar_public_id")] public string? AvatarPublicId { get; set; }

    //new fields
    [Column("membership_id")] public int? MembershipId { get; set; }
    [Column("loyalty_points")] public int LoyaltyPoints { get; set; }
    [Column("date_of_birth")] public DateOnly? DateOfBirth { get; set; }
    [Column("address")] public string? Address { get; set; }

    // Navigation
    public Role? Role { get; set; }
    public Membership? Membership { get; set; }
}
