namespace HotelManagementAPI.DTOs;

public record CreateArticleDto(
    string Title,
    string Content,
    int CategoryId,
    int? AttractionId,
    int? AuthorId,
    DateTime? PublishedAt,
    bool IsActive = true
);

public record UpdateArticleDto(
    string Title,
    string Content,
    int CategoryId,
    int? AttractionId,
    int? AuthorId,
    DateTime? PublishedAt,
    bool IsActive = true
);
