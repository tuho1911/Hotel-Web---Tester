namespace HotelManagementAPI.DTOs;

public record CreateArticleCategoryDto(string Name, string? Description, bool IsActive = true);
public record UpdateArticleCategoryDto(string Name, string? Description, bool IsActive = true);
