namespace HotelManagementAPI.DTOs;

public record AmenityDto(
    int Id,
    string Name,
    string? IconUrl
);

public record CreateAmenityDto(
    string Name,
    string? IconUrl
);

public record UpdateAmenityDto(
    string Name,
    string? IconUrl
);
