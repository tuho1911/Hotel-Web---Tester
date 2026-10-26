using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagementAPI.Models;

// DB Roles: id, name, description (không có is_active, created_at)
[Table("Roles")]
public class Role
{
    [Column("id")]
    public int Id { get; set; }

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
