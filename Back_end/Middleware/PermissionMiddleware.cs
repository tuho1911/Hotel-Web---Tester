using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace HotelManagementAPI.Middleware;

// ══════════════════════════════════════════════════════════════
// ATTRIBUTE — Đánh dấu permission trực tiếp trên Action/Controller
// ══════════════════════════════════════════════════════════════
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class RequirePermissionAttribute : Attribute
{
    public string[] Permissions { get; }
    public RequirePermissionAttribute(params string[] permissions)
        => Permissions = permissions;
}

// ══════════════════════════════════════════════════════════════
// MIDDLEWARE — Kết hợp Attribute-based + Route-map-based
// ══════════════════════════════════════════════════════════════
public class PermissionMiddleware
{
    private readonly RequestDelegate _next;

    // Fallback mapping khi endpoint KHÔNG có [RequirePermission]
    // Key: "{METHOD}:{path_prefix}" — path phải lowercase
    private static readonly Dictionary<string, string> _permissionMap = new()
    {
        { "GET:/api/usermanagement",    "MANAGE_USERS" },
        { "POST:/api/usermanagement",   "MANAGE_USERS" },
        { "PUT:/api/usermanagement",    "MANAGE_USERS" },
        { "DELETE:/api/usermanagement", "MANAGE_USERS" },
        { "GET:/api/roles",             "MANAGE_ROLES" },
        { "POST:/api/roles",            "MANAGE_ROLES" },
        { "PUT:/api/roles",             "MANAGE_ROLES" },
        { "DELETE:/api/roles",          "MANAGE_ROLES" },
        { "GET:/api/equipments",        "MANAGE_INVENTORY" },
        { "POST:/api/equipments",       "MANAGE_INVENTORY" },
        { "PUT:/api/equipments",        "MANAGE_INVENTORY" },
        { "DELETE:/api/equipments",     "MANAGE_INVENTORY" },
        { "GET:/api/inventory",         "MANAGE_INVENTORY" },
        { "POST:/api/inventory",        "MANAGE_INVENTORY" },
        { "PUT:/api/inventory",         "MANAGE_INVENTORY" },
        { "DELETE:/api/inventory",      "MANAGE_INVENTORY" },
        { "GET:/api/lossanddamages",    "MANAGE_INVENTORY" },
        { "POST:/api/lossanddamages",   "MANAGE_INVENTORY" },
        { "PUT:/api/lossanddamages",    "MANAGE_INVENTORY" },
        { "DELETE:/api/lossanddamages", "MANAGE_INVENTORY" },
    };

    public PermissionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // ── Bước 1: Xác định permission yêu cầu ──────────────────────────
        // Ưu tiên 1: [RequirePermission] attribute trên endpoint (attribute-based)
        var endpoint = context.GetEndpoint();

        if (endpoint?.Metadata.GetMetadata<IAllowAnonymous>() != null)
        {
            await _next(context);
            return;
        }
        var requiredPermissions = endpoint?
            .Metadata.GetMetadata<RequirePermissionAttribute>()
            ?.Permissions;

        // Ưu tiên 2: Route map — fallback nếu endpoint không có attribute
        if (requiredPermissions == null || requiredPermissions.Length == 0)
        {
            var path   = context.Request.Path.Value?.ToLower() ?? "";
            var method = context.Request.Method.ToUpper();
            var mappedPerm = GetRequiredPermissionFromMap(method, path);
            if (mappedPerm != null)
            {
                requiredPermissions = new[] { mappedPerm };
            }
        }

        // Không yêu cầu permission → cho qua toàn bộ
        if (requiredPermissions == null || requiredPermissions.Length == 0)
        {
            await _next(context);
            return;
        }

        // ── Bước 2: Kiểm tra đã đăng nhập chưa → 401 ────────────────────
        if (context.User.Identity?.IsAuthenticated != true)
        {
            context.Response.StatusCode    = 401;
            context.Response.ContentType   = "application/json";
            await context.Response.WriteAsJsonAsync(new
            {
                statusCode = 401,
                message    = "Bạn chưa đăng nhập!",
                required   = requiredPermissions
            });
            return;
        }

        // ── Bước 3: Admin bypass — bỏ qua toàn bộ permission check ───────
        if (context.User.IsInRole("Admin"))
        {
            await _next(context);
            return;
        }

        // ── Bước 4: Kiểm tra permission từ JWT Claims → 403 ──────────────
        var userPermissions = context.User.Claims
            .Where(c => c.Type == "permission")
            .Select(c => c.Value)
            .ToHashSet(StringComparer.OrdinalIgnoreCase); // OrdinalIgnoreCase: tránh lỗi case

        if (!requiredPermissions.Any(rp => userPermissions.Contains(rp)))
        {
            context.Response.StatusCode    = 403;
            context.Response.ContentType   = "application/json";
            await context.Response.WriteAsJsonAsync(new
            {
                statusCode       = 403,
                message          = $"Bạn không có quyền cần thiết để thực hiện thao tác này!",
                required         = requiredPermissions,
                your_permissions = userPermissions   // Trả về để debug dễ hơn
            });
            return;
        }

        await _next(context);
    }

    // Helper: tìm permission từ _permissionMap dựa vào method + path prefix
    private static string? GetRequiredPermissionFromMap(string method, string path)
    {
        foreach (var entry in _permissionMap)
        {
            var parts = entry.Key.Split(':');
            if (parts[0] == method && path.StartsWith(parts[1]))
                return entry.Value;
        }
        return null;
    }
}

// ══════════════════════════════════════════════════════════════
// EXTENSION METHOD — Đăng ký middleware vào pipeline
// ══════════════════════════════════════════════════════════════
public static class PermissionMiddlewareExtensions
{
    public static IApplicationBuilder UsePermissionMiddleware(this IApplicationBuilder builder)
        => builder.UseMiddleware<PermissionMiddleware>();
}
