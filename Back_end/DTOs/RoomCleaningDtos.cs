namespace HotelManagementAPI.DTOs;

public record UpdateRoomCleaningDto(
    string Status,
    string? CleaningStatus = null
);
