using System.ComponentModel.DataAnnotations;

namespace HotelManagementAPI.DTOs;

public record AttractionDto(
    int Id,
    string Name,
    decimal? DistanceKm,
    string? Description,
    string? Address,
    string? Category,
    string? MapEmbedLink,
    decimal? Latitude,
    decimal? Longitude,
    string? ImageUrl,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateAttractionDto(
    [Required(ErrorMessage = "Tên điểm tham quan không được để trống")]
    string Name,
    decimal? DistanceKm,
    string? Description,
    string? Address,
    string? Category,
    string? MapEmbedLink,
    decimal? Latitude,
    decimal? Longitude,
    string? ImageUrl
);

public record UpdateAttractionDto(
    [Required(ErrorMessage = "Tên điểm tham quan không được để trống")]
    string Name,
    decimal? DistanceKm,
    string? Description,
    string? Address,
    string? Category,
    string? MapEmbedLink,
    decimal? Latitude,
    decimal? Longitude,
    string? ImageUrl,
    bool IsActive
);
