using Microsoft.AspNetCore.Http;

namespace HotelManagementAPI.DTOs;

public record ImportEquipmentsExcelDto(
    IFormFile File
);
