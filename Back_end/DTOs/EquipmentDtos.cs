namespace HotelManagementAPI.DTOs;

public record CreateEquipmentDto(
    string ItemCode,
    string Name,
    string Category,
    string Unit,
    int TotalQuantity,
    decimal BasePrice,
    decimal DefaultPriceIfLost,
    string? Supplier,
    string? ImageUrl
);

public record UpdateEquipmentDto(
    string Name,
    string Category,
    string Unit,
    int TotalQuantity,
    decimal BasePrice,
    decimal DefaultPriceIfLost,
    string? Supplier,
    string? ImageUrl,
    bool IsActive
);

public record UpdatePriceDto(
    decimal BasePrice,
    decimal DefaultPriceIfLost
);

public record UpdateCompensationDto(
    decimal DefaultPriceIfLost
);

public record SyncInventoryDto(
    int DamagedQuantity
);