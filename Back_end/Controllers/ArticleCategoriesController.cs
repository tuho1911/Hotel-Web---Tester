using HotelManagementAPI.Data;
using HotelManagementAPI.DTOs;
using HotelManagementAPI.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HotelManagementAPI.Middleware;

namespace HotelManagementAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[RequirePermission("MANAGE_CONTENT")]
public class ArticleCategoriesController : ControllerBase
{
    private readonly AppDbContext _context;

    public ArticleCategoriesController(AppDbContext context)
    {
        _context = context;
    }

    // GET /api/ArticleCategories  ← Public
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        var categories = await _context.ArticleCategories
            .Where(c => c.IsActive)  // Soft Delete filter
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.IsActive,
                c.Description,
                ArticleCount = c.Articles.Count(a => a.IsActive)
            })
            .ToListAsync();

        return Ok(categories);
    }

    // POST /api/ArticleCategories  ← Admin only
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateArticleCategoryDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Tên danh mục không được để trống" });

        var category = new ArticleCategory { Name = dto.Name, Description = dto.Description, IsActive = dto.IsActive };
        _context.ArticleCategories.Add(category);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), new { id = category.Id }, category);
    }

    // PUT /api/ArticleCategories/{id}  ← Admin only
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateArticleCategoryDto dto)
    {
        var category = await _context.ArticleCategories
            .FirstOrDefaultAsync(c => c.Id == id && c.IsActive);

        if (category == null)
            return NotFound(new { message = "Danh mục không tồn tại" });

        category.Name = dto.Name;
        category.Description = dto.Description;
        category.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();

        return Ok(category);
    }

    // DELETE /api/ArticleCategories/{id}  ← SOFT DELETE
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var category = await _context.ArticleCategories
            .FirstOrDefaultAsync(c => c.Id == id && c.IsActive);

        if (category == null)
            return NotFound(new { message = "Danh mục không tồn tại hoặc đã bị xóa" });

        // SOFT DELETE: chỉ cập nhật is_active = false
        category.IsActive = false;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Đã vô hiệu hóa danh mục thành công" });
    }
}
