namespace HotelManagementAPI.DTOs;

public record CreateRoleDto(string Name, string? Description);
public record UpdateRoleDto(string Name, string? Description);
public record AssignPermissionDto(int RoleId, int PermissionId);
public record RemovePermissionDto(int RoleId, int PermissionId);

public record RoleResponseDto(
    int Id, 
    string Name, 
    string? Description, 
    List<string> Permissions
);

public record PermissionResponseDto(
    int Id, 
    string Name
);
