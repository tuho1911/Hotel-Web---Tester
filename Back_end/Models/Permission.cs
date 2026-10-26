using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagementAPI.Models;

// DB Permissions: chỉ có id, name
[Table("Permissions")]
public class Permission
{
    [Column("id")]
    public int Id { get; set; }

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
