using HotelManagementAPI.DTOs;

namespace HotelManagementAPI.Services;

public interface IUserManagementService
{
    Task<IEnumerable<UserResponseDto>> GetAllUsersAsync();
    Task<UserResponseDto?> GetUserByIdAsync(int id);
    Task<UserResponseDto> CreateUserAsync(CreateUserDto dto);
    Task<UserResponseDto?> UpdateUserAsync(int id, UpdateUserDto dto);
    Task<bool> DeleteUserAsync(int id);
    Task<bool> ChangeUserRoleAsync(int id, int roleId);
    Task<IEnumerable<UserResponseDto>> FilterUsersAsync(string? phone, string? email, bool? status);
    Task<(IEnumerable<UserResponseDto> Data, int Total)> FilterUsersPagedAsync(string? phone, string? email, bool? status, int page, int pageSize);
}
