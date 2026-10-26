namespace HotelManagementAPI.DTOs;

// ─── ROOM TYPES ────────────────────────────────────────────────────────────────

public record CreateRoomTypeDto(
    string Name,
    string? Description,
    decimal BasePrice,
    int CapacityAdults,
    int CapacityChildren,
    int? SizeSqm = null,
    string? BedType = null,
    string? ViewType = null,
    string? Slug = null,
    string? Content = null
);

public record UpdateRoomTypeDto(
    string Name,
    string? Description,
    decimal BasePrice,
    int CapacityAdults,
    int CapacityChildren,
    bool IsActive,
    int? SizeSqm = null,
    string? BedType = null,
    string? ViewType = null,
    string? Slug = null,
    string? Content = null
);

public record RoomTypeResponseDto(
    int Id,
    string Name,
    string? Description,
    decimal BasePrice,
    int CapacityAdults,
    int CapacityChildren,
    int? SizeSqm,
    string? BedType,
    string? ViewType,
    bool IsActive,
    string? Slug,
    List<RoomImageResponseDto>? Images = null,
    List<AmenityDto>? Amenities = null
);

public record RoomImageResponseDto(
    int Id,
    string ImageUrl,
    bool? IsPrimary,
    bool? IsActive
);

// ─── ROOMS ─────────────────────────────────────────────────────────────────────

public record CreateRoomDto(
    string RoomNumber,
    int RoomTypeId,
    string Status,
    int? Floor = null,
    string? CleaningStatus = null,
    string? ExtensionNumber = null
);

public record UpdateRoomDto(
    string RoomNumber,
    int RoomTypeId,
    string Status,
    bool IsActive,
    int? Floor = null,
    string? CleaningStatus = null,
    string? ExtensionNumber = null
);

public record RoomResponseDto(
    int Id,
    string RoomNumber,
    string RoomTypeName,
    int RoomTypeId,
    string Status,
    string? CleaningStatus,
    bool IsActive,
    int? Floor = null,
    string? ExtensionNumber = null
);

public record CloneRoomItemsDto(
    int TemplateRoomId
);

public record BulkCreateRoomsRequestDto(
    int RoomTypeId,
    int Floor,
    int StartNumber,
    int Count,
    int? TemplateRoomId,
    int? Step = 1
);

// ─── BULK CREATE ───────────────────────────────────────────────────────────────

// BulkCreateRoomDto nằm trong EquipmentDtos.cs (tránh duplicate namespace)

// ─── ROOM INVENTORY ────────────────────────────────────────────────────────────

public record RoomInventoryResponseDto(
    int Id,
    int? RoomId,
    string? RoomNumber,
    int EquipmentId,
    string? EquipmentName,
    int? Quantity,
    decimal? PriceIfLost,
    string? Note,
    bool? IsActive,
    string? ItemType
);

public record UpdateRoomInventoryDto(
    int? Quantity,
    decimal? PriceIfLost,
    string? Note,
    bool? IsActive
);

public record SyncRoomInventoryDto(
    int RoomId,
    int EquipmentId,
    int Quantity,
    decimal? PriceIfLost = null,
    string? Note = null,
    bool IsActive = true,
    string? ItemType = null
);
