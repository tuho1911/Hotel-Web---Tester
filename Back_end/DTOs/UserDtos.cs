namespace HotelManagementAPI.DTOs;

public record UserResponseDto(
    int Id,
    string FullName,
    string Email,
    string? Phone,
    string? RoleName,
    int? RoleId,
    bool Status,
    string? AvatarUrl,
    DateTime? CreatedAt
);

public record CreateUserDto(
    string FullName,
    string Email,
    string Password,
    string? Phone,
    int RoleId
);

public record UpdateUserDto(
    string FullName,
    string? Phone,
    bool Status,
    string? Password = null
);

public record ChangeRoleDto(
    int RoleId
);
