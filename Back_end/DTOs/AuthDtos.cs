namespace HotelManagementAPI.DTOs;

public record LoginDto(string Email, string Password);

public record LoginResponseDto(
    int UserId,
    string AccessToken,
    string FullName,
    string Email,
    string Role,
    List<string> Permissions
);

public record RefreshTokenDto(string AccessToken);

public record UpdateProfileDto(string FullName, string? Phone);

public record ChangePasswordDto(string OldPassword, string NewPassword);

public record ForgotPasswordDto(string Email);

public record ResetPasswordDto(string Email, string Token, string NewPassword);
