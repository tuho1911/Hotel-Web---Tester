using System.Runtime.CompilerServices;
using System.Security.Claims;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using HotelManagementAPI.Data;
using HotelManagementAPI.DTOs;
using HotelManagementAPI.Models;
using HotelManagementAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using HotelManagementAPI.Helpers;
using HotelManagementAPI.Middleware;

namespace HotelManagementAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[RequirePermission("MANAGE_CONTENT")]
public class ArticlesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ISlugService _slugService;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly IAuditLogService _auditLogService;

    public ArticlesController(
        AppDbContext context, 
        ISlugService slugService, 
        ICloudinaryService cloudinaryService,
        IAuditLogService auditLogService)
    {
        _context = context;
        _slugService = slugService;
        _cloudinaryService = cloudinaryService;
        _auditLogService = auditLogService;
    }

    // GET /api/Articles  ← Public
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] int? categoryId, [FromQuery] int page = 1)
    {
        var query = _context.Articles
            .Include(a => a.Author)
            .Include(a => a.Category)
            .Where(a => a.IsActive);

        if (categoryId.HasValue)
            query = query.Where(a => a.CategoryId == categoryId.Value);

        var articles = await query
            .OrderByDescending(a => a.CreatedAt ?? TimeHelper.Now)
            .Skip((page - 1) * 10)
            .Take(10)
            .Select(a => new
            {
                a.Id,
                a.Title,
                a.Slug,
                ThumbnailUrl = a.ImageUrl,       // property ImageUrl → DB column: thumbnail_url
                PublishedAt  = a.CreatedAt ?? TimeHelper.Now,  // property CreatedAt → DB column: published_at
                IsActive = a.IsActive,
                Author   = a.Author != null ? a.Author.FullName : "Unknown",
                Category = a.Category != null ? a.Category.Name : "None",
                AttractionId = a.AttractionId
            })
            .ToListAsync();

        return Ok(articles);
    }

    // GET /api/Articles/{slug}  ← Public, AllowAnonymous (Google Crawler index được)
    [HttpGet("{slug}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var article = await _context.Articles
            .Include(a => a.Author)
            .Include(a => a.Category)
            .FirstOrDefaultAsync(a => a.Slug == slug && a.IsActive);

        if (article == null)
            return NotFound(new { message = "Bài viết không tồn tại" });

        return Ok(new
        {
            article.Id,
            article.Title,
            article.Slug,
            article.Content,
            ThumbnailUrl = article.ImageUrl,      // property ImageUrl → DB column: thumbnail_url
            PublishedAt  = article.CreatedAt ?? TimeHelper.Now,  // property CreatedAt → DB column: published_at
            UpdatedAt    = article.UpdatedAt ?? TimeHelper.Now,
            IsActive     = article.IsActive,
            Author   = article.Author != null ? article.Author.FullName : "Unknown",
            AuthorId = article.AuthorId,
            AttractionId = article.AttractionId,
            Category = new { article.Category?.Id, article.Category?.Name }
        });
    }

    // POST /api/Articles  ← Authorize, tự động gán AuthorId từ Token
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateArticleDto dto)
    {
        // Lấy AuthorId từ JWT Token — KHÔNG nhận từ client
        var authorIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (authorIdClaim == null) return Unauthorized();

        // Kiểm tra Category
        var categoryExists = await _context.ArticleCategories
            .AnyAsync(c => c.Id == dto.CategoryId && c.IsActive);
        if (!categoryExists)
            return BadRequest(new { message = "Danh mục không tồn tại" });

        // Auto-generate Slug từ Title
        var slug = await _slugService.GenerateUniqueSlugAsync(dto.Title);

        var article = new Article
        {
            Title      = dto.Title,
            Slug       = slug,
            Content    = dto.Content,
            CategoryId = dto.CategoryId,
            AttractionId = dto.AttractionId,
            AuthorId   = dto.AuthorId ?? int.Parse(authorIdClaim), // Sử dụng AuthorId truyền vào, không có thì xài Token
            CreatedAt  = dto.PublishedAt ?? TimeHelper.Now,          // → DB column: published_at
            UpdatedAt  = TimeHelper.Now,           // → DB column: updated_at (thêm qua SQL patch)
            IsActive   = dto.IsActive
        };

        _context.Articles.Add(article);
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("CREATE", "Article", new { articleId = article.Id, article.Slug }, null, dto, $"Tạo bài viết {article.Title}.");

        return CreatedAtAction(nameof(GetBySlug), new { slug = article.Slug }, new
        {
            article.Id,
            article.Title,
            article.Slug
        });
    }

    // PUT /api/Articles/{id}  ← Authorize
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateArticleDto dto)
    {
        var article = await _context.Articles
            .FirstOrDefaultAsync(a => a.Id == id && a.IsActive);

        if (article == null)
            return NotFound(new { message = "Bài viết không tồn tại" });

        // Tự động cập nhật slug nếu title thay đổi
        if (article.Title != dto.Title)
        {
            article.Slug = await _slugService.GenerateUniqueSlugAsync(dto.Title, id);
            article.Title = dto.Title;
        }

        article.Content    = dto.Content;
        article.CategoryId = dto.CategoryId;
        article.AttractionId = dto.AttractionId;
        article.AuthorId   = dto.AuthorId ?? article.AuthorId;
        article.CreatedAt  = dto.PublishedAt ?? article.CreatedAt;
        article.IsActive   = dto.IsActive;
        article.UpdatedAt  = TimeHelper.Now;

        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("UPDATE", "Article", new { articleId = article.Id, article.Slug }, dto, article, $"Cập nhật bài viết {article.Title}.");
        return Ok(article);
    }

    // DELETE /api/Articles/{id}  ← SOFT DELETE
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var article = await _context.Articles
            .FirstOrDefaultAsync(a => a.Id == id && a.IsActive);

        if (article == null)
            return NotFound(new { message = "Bài viết không tồn tại" });

        article.IsActive = false;
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("DELETE", "Article", new { articleId = article.Id, article.Slug }, null, null, $"Vô hiệu hóa bài viết {article.Title}.");

        return Ok(new { message = "Đã vô hiệu hóa bài viết" });
    }

    // POST /api/Articles/{id}/thumbnail  ← Upload ảnh bìa lên Cloudinary
    [HttpPost("{id}/thumbnail")]
    public async Task<IActionResult> UploadThumbnail(int id, IFormFile file)
    {
        var article = await _context.Articles
            .FirstOrDefaultAsync(a => a.Id == id && a.IsActive);

        if (article == null)
            return NotFound(new { message = "Bài viết không tồn tại" });

        if (file == null || file.Length == 0)
            return BadRequest(new { message = "File không hợp lệ" });

        // Bước 1: Xóa ảnh cũ trên Cloudinary (dọn rác tự động)
        if (!string.IsNullOrEmpty(article.ThumbnailPublicId))
        {
            await _cloudinaryService.DeleteImageAsync(article.ThumbnailPublicId);
        }

        // Bước 2: Upload ảnh mới qua CloudinaryService
        var (url, publicId) = await _cloudinaryService.UploadImageAsync(file, "HotelManagement/Articles");

        // Bước 3: Lưu URL và PublicId mới
        article.ImageUrl = url;
        article.ThumbnailPublicId = publicId;
        article.UpdatedAt = TimeHelper.Now;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Upload ảnh bìa thành công",
            thumbnailUrl = article.ImageUrl
        });
    }
}
