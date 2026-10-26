using System.IdentityModel.Tokens.Jwt;
using HotelManagementAPI.Data;
using HotelManagementAPI.Services;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementAPI.Middleware;

public class RefreshTokenMiddleware
{
    private readonly RequestDelegate _next;

    public RefreshTokenMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(
        HttpContext context, 
        ITokenService tokenService, 
        AppDbContext dbContext)
    {
        var token = context.Request.Headers["Authorization"]
            .FirstOrDefault()?.Split(" ").Last();

        if (!string.IsNullOrEmpty(token))
        {
            var handler = new JwtSecurityTokenHandler();
            if (handler.CanReadToken(token))
            {
                var jwtToken = handler.ReadJwtToken(token);

                // Nếu token hết hạn, thêm header thông báo cho FE
                if (jwtToken.ValidTo < DateTime.UtcNow)
                {
                    context.Response.Headers.Append("Token-Expired", "true");
                    context.Response.Headers.Append("Access-Control-Expose-Headers", "Token-Expired");
                }
            }
        }

        await _next(context);
    }
}

// Extension method để đăng ký middleware
public static class RefreshTokenMiddlewareExtensions
{
    public static IApplicationBuilder UseRefreshTokenMiddleware(
        this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<RefreshTokenMiddleware>();
    }
}
