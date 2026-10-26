using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagementAPI.Models;

[Table("Articles")]
public class Article
{
    [Column("id")]
    public int Id { get; set; }

    [Column("category_id")]
    public int? CategoryId { get; set; }

    [Column("author_id")]
    public int? AuthorId { get; set; }

    [Column("attraction_id")]
    public int? AttractionId { get; set; }

    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [Column("slug")]
    public string? Slug { get; set; }

    [Column("content")]
    public string? Content { get; set; }

    // DB column: thumbnail_url (đúng với schema)
    [Column("thumbnail_url")]
    public string? ImageUrl { get; set; }

    // Thêm vào DB qua patch_articles_add_columns.sql
    [Column("thumbnail_public_id")]
    public string? ThumbnailPublicId { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    // DB column: published_at (đúng với schema)
    [Column("published_at")]
    public DateTime? CreatedAt { get; set; }

    // Thêm vào DB qua patch_articles_add_columns.sql
    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public ArticleCategory? Category { get; set; }
    public User? Author { get; set; }
    public Attraction? Attraction { get; set; }
}
