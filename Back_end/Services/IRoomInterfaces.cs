using HotelManagementAPI.DTOs;

namespace HotelManagementAPI.Services;

public interface IRoomService
{
    // Room Types
    Task<IEnumerable<RoomTypeResponseDto>> GetAllRoomTypesAsync();
    Task<RoomTypeResponseDto?> GetRoomTypeByIdAsync(int id);
    Task<RoomTypeResponseDto> CreateRoomTypeAsync(CreateRoomTypeDto dto);
    Task<RoomTypeResponseDto?> UpdateRoomTypeAsync(int id, UpdateRoomTypeDto dto);
    Task<bool> DeleteRoomTypeAsync(int id);

    // Rooms
    Task<IEnumerable<RoomResponseDto>> GetAllRoomsAsync(int? roomTypeId = null, int? floor = null, string? roomNumber = null);
    Task<RoomResponseDto?> GetRoomByIdAsync(int id);
    Task<RoomResponseDto> CreateRoomAsync(CreateRoomDto dto);
    Task<RoomResponseDto?> UpdateRoomAsync(int id, UpdateRoomDto dto);
    Task<bool> DeleteRoomAsync(int id);
}

/// <summary>
/// Quản lý thiết bị/vật dụng được gán vào phòng (bảng Room_Inventory)
/// </summary>
public interface IInventoryService
{
    Task<IEnumerable<RoomInventoryResponseDto>> GetByRoomAsync(int roomId);
    Task<RoomInventoryResponseDto?> GetByIdAsync(int id);
    Task<RoomInventoryResponseDto> SyncAsync(SyncRoomInventoryDto dto);
    Task<RoomInventoryResponseDto?> UpdateByIdAsync(int id, UpdateRoomInventoryDto dto);
    Task<bool> DeleteByIdAsync(int id);
}
