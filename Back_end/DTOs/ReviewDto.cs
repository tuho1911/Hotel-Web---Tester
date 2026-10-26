namespace HotelManagementAPI.DTOs;

public record ReviewDto(
    int Id,
    string TargetType,
    int TargetId,
    string AuthorName,
    int Rating,
    string? Comment,
    bool IsApproved,
    DateTime CreatedAt
);

public record CreateReviewDto(
    string TargetType,
    int TargetId,
    int Rating,
    string? Comment,
    string? GuestName
);
