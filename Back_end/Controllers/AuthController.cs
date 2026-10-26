using HotelManagementAPI.Data;
using HotelManagementAPI.DTOs;
using HotelManagementAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using HotelManagementAPI.Models;

namespace HotelManagementAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ITokenService _tokenService;
    private readonly IConfiguration _config;
    private readonly IAuditLogService _auditLogService;
    private readonly IEmailService _emailService;

    public AuthController(AppDbContext context, ITokenService tokenService, IConfiguration config, IAuditLogService auditLogService, IEmailService emailService)
    {
        _context = context;
        _tokenService = tokenService;
        _config = config;
        _auditLogService = auditLogService;
        _emailService = emailService;
    }

    // POST /api/Auth/register
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
            return BadRequest(new { message = "Email này đã được sử dụng" });

        var guestRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Guest");
        if (guestRole == null)
            return StatusCode(500, new { message = "Lỗi hệ thống: Không tìm thấy quyền mặc định (Guest)" });

        var user = new User
        {
            FullName = dto.FullName,
            Email = dto.Email,
            Phone = dto.Phone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            RoleId = guestRole.Id,
            Status = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await _auditLogService.LogAsync("REGISTER", nameof(User), new { user.Id, user.Email }, null, null, $"Người dùng đăng ký mới: {user.Email}");

        var emailBody = $@"
        <h3>Chào mừng bạn đến với Hotel Management</h3>
        <p>Xin chào {user.FullName},</p>
        <p>Chúc mừng bạn đã đăng ký tài khoản thành công tại hệ thống của chúng tôi.</p>
        <p><strong>Thông tin tài khoản:</strong></p>
        <ul>
            <li><strong>Họ và tên:</strong> {user.FullName}</li>
            <li><strong>Email:</strong> {user.Email}</li>
            <li><strong>Số điện thoại:</strong> {user.Phone}</li>
        </ul>
        <p>Cảm ơn bạn đã đồng hành cùng chúng tôi!</p>
        <p>Trân trọng,<br>Đội ngũ Hotel Management</p>";

        await _emailService.SendEmailAsync(user.Email, "Đăng ký tài khoản thành công - Hotel Management", emailBody);

        return Ok(new { message = "Đăng ký thành công" });
    }

    // POST /api/Auth/login
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        // Query đơn giản trước — không Include phức tạp
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (user == null)
        {
            await _auditLogService.LogAsync("LOGIN_FAILED", nameof(User), new { email = dto.Email }, null, null, $"Đăng nhập thất bại - email không tồn tại: {dto.Email}");
            return Unauthorized(new { message = "Email hoặc mật khẩu không đúng" });
        }

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            await _auditLogService.LogAsync("LOGIN_FAILED", nameof(User), new { user.Id, user.Email }, null, null, $"Đăng nhập thất bại - sai mật khẩu: {user.Email}");
            return Unauthorized(new { message = "Email hoặc mật khẩu không đúng" });
        }

        if (!user.Status)
        {
            await _auditLogService.LogAsync("LOGIN_FAILED", nameof(User), new { user.Id, user.Email }, null, null, $"Đăng nhập thất bại - tài khoản bị khóa: {user.Email}");
            return Unauthorized(new { message = "Tài khoản đã bị khóa" });
        }

        // Query permissions riêng — tránh null chain
        var permissions = await _context.RolePermissions
            .Where(rp => rp.RoleId == user.RoleId)
            .Include(rp => rp.Permission)
            .Select(rp => rp.Permission!.Name)
            .ToListAsync();

        var accessToken = _tokenService.GenerateAccessToken(user, permissions);
        var refreshToken = _tokenService.GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await _context.SaveChangesAsync();

        SetRefreshTokenCookie(refreshToken);

        await _auditLogService.LogAsync("LOGIN", nameof(User), new { user.Id, user.Email }, null, null, $"Đăng nhập thành công: {user.Email}");

        return Ok(new LoginResponseDto(
            user.Id,
            accessToken,
            user.FullName,
            user.Email,
            user.Role?.Name ?? "",
            permissions
        ));
    }


    // POST /api/Auth/refresh-token
    [HttpPost("refresh-token")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenDto dto)
    {
        // Lấy refresh token từ cookie
        var refreshToken = Request.Cookies["refreshToken"];
        
        if (string.IsNullOrEmpty(refreshToken))
            return Unauthorized(new { message = "Không tìm thấy Refresh token trong cookie" });

        // Giải mã access token cũ (đã expired)
        var principal = _tokenService.GetPrincipalFromExpiredToken(dto.AccessToken);
        if (principal == null)
            return BadRequest(new { message = "Access token không hợp lệ" });

        var userIdClaim = principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return BadRequest(new { message = "Token không có UserId" });

        var user = await _context.Users
            .Include(u => u.Role)
                .ThenInclude(r => r!.RolePermissions)
                    .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(u => u.Id == int.Parse(userIdClaim.Value));

        if (user == null || 
            user.RefreshToken != refreshToken ||
            user.RefreshTokenExpiry < DateTime.UtcNow)
        {
            return Unauthorized(new { message = "Refresh token không hợp lệ hoặc đã hết hạn" });
        }

        await _auditLogService.LogAsync("REFRESH_TOKEN", nameof(User), new { user.Id, user.Email }, null, null, "Gia hạn phiên đăng nhập.");

        var permissions = user.Role?.RolePermissions
            .Select(rp => rp.Permission!.Name)
            .ToList() ?? new List<string>();

        // Cấp token mới
        var newAccessToken = _tokenService.GenerateAccessToken(user, permissions);
        var newRefreshToken = _tokenService.GenerateRefreshToken();

        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await _context.SaveChangesAsync();

        SetRefreshTokenCookie(newRefreshToken);

        return Ok(new LoginResponseDto(
            user.Id,
            newAccessToken,
            user.FullName,
            user.Email,
            user.Role?.Name ?? "",
            permissions
        ));
    }

    // GET /api/Auth/refresh-session
    [HttpGet("refresh-session")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<IActionResult> RefreshSession()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return BadRequest(new { message = "Token không có UserId" });

        var user = await _context.Users
            .Include(u => u.Role)
                .ThenInclude(r => r!.RolePermissions)
                    .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(u => u.Id == int.Parse(userIdClaim.Value));

        if (user == null)
            return NotFound(new { message = "Người dùng không tồn tại" });

        var permissions = user.Role?.RolePermissions
            .Select(rp => rp.Permission!.Name)
            .ToList() ?? new List<string>();

        // Cấp token mới
        var newAccessToken = _tokenService.GenerateAccessToken(user, permissions);
        var newRefreshToken = _tokenService.GenerateRefreshToken();

        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await _context.SaveChangesAsync();

        SetRefreshTokenCookie(newRefreshToken);

        await _auditLogService.LogAsync("REFRESH_SESSION", nameof(User), new { user.Id, user.Email }, null, null, "Đồng bộ và làm mới phiên đăng nhập thành công.");

        return Ok(new LoginResponseDto(
            user.Id,
            newAccessToken,
            user.FullName,
            user.Email,
            user.Role?.Name ?? "",
            permissions
        ));
    }

    // POST /api/Auth/logout  
    [HttpPost("logout")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<IActionResult> Logout()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim != null)
        {
            var user = await _context.Users.FindAsync(int.Parse(userIdClaim.Value));
            if (user != null)
            {
                user.RefreshToken = null;
                user.RefreshTokenExpiry = null;
                await _context.SaveChangesAsync();

                Response.Cookies.Delete("refreshToken");
                await _auditLogService.LogAsync("LOGOUT", nameof(User), new { user.Id, user.Email }, null, null, $"Đăng xuất: {user.Email}");
            }
        }
        return Ok(new { message = "Đăng xuất thành công" });
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null)
            return BadRequest(new { message = "Email này chưa được đăng ký trong hệ thống." });

        var secret = _config["JwtSettings:Secret"] + user.PasswordHash;
        var securityKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(secret));
        var credentials = new Microsoft.IdentityModel.Tokens.SigningCredentials(securityKey, Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, user.Id.ToString()),
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Email, user.Email)
        };

        var token = new System.IdentityModel.Tokens.Jwt.JwtSecurityToken(
            issuer: _config["JwtSettings:Issuer"],
            audience: _config["JwtSettings:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(15),
            signingCredentials: credentials);

        var tokenString = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().WriteToken(token);
        var resetLink = $"http://localhost:5173/reset-password?token={tokenString}&email={user.Email}";
        
        var emailBody = $@"
        <h3>Yêu cầu đặt lại mật khẩu</h3>
        <p>Xin chào {user.FullName},</p>
        <p>Bạn đã yêu cầu đặt lại mật khẩu tại hệ thống quản lý khách sạn. Vui lòng click vào link bên dưới để tạo mật khẩu mới:</p>
        <a href='{resetLink}'>Đặt lại mật khẩu</a>
        <p>Link này sẽ hết hạn sau 15 phút. Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>";

        await _emailService.SendEmailAsync(user.Email, "Hotel Management - Đặt lại mật khẩu", emailBody);
        await _auditLogService.LogAsync("FORGOT_PASSWORD", nameof(User), new { user.Id, user.Email }, null, null, $"Gửi email reset password: {user.Email}");

        return Ok(new { message = "Đã gửi đường dẫn đặt lại mật khẩu vào email của bạn. Vui lòng kiểm tra hộp thư." });
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null)
            return BadRequest(new { message = "Token hoặc email không hợp lệ." });

        var secret = _config["JwtSettings:Secret"] + user.PasswordHash;
        var tokenHandler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
        var key = System.Text.Encoding.UTF8.GetBytes(secret);

        try
        {
            tokenHandler.ValidateToken(dto.Token, new Microsoft.IdentityModel.Tokens.TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidIssuer = _config["JwtSettings:Issuer"],
                ValidAudience = _config["JwtSettings:Audience"],
                ClockSkew = TimeSpan.Zero
            }, out Microsoft.IdentityModel.Tokens.SecurityToken validatedToken);

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();
            await _auditLogService.LogAsync("RESET_PASSWORD", nameof(User), new { user.Id, user.Email }, null, null, $"Đặt lại mật khẩu thành công: {user.Email}");

            return Ok(new { message = "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới." });
        }
        catch (Microsoft.IdentityModel.Tokens.SecurityTokenExpiredException)
        {
            return BadRequest(new { message = "Link đặt lại mật khẩu đã hết hạn." });
        }
        catch (Exception)
        {
            return BadRequest(new { message = "Link đặt lại mật khẩu không hợp lệ." });
        }
    }

    private void SetRefreshTokenCookie(string refreshToken)
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps, // Tự động bật Secure nếu dùng HTTPS
            SameSite = SameSiteMode.Lax, // Lax sẽ dễ dùng hơn cho FE local
            Expires = DateTime.UtcNow.AddDays(7)
        };
        Response.Cookies.Append("refreshToken", refreshToken, cookieOptions);
    }
}
