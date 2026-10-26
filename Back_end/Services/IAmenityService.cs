using HotelManagementAPI.DTOs;

namespace HotelManagementAPI.Services;

public interface IAmenityService
{
    Task<IEnumerable<AmenityDto>> GetAllAsync();
    Task<AmenityDto?> GetByIdAsync(int id);
    Task<AmenityDto> CreateAsync(CreateAmenityDto dto);
    Task<AmenityDto?> UpdateAsync(int id, UpdateAmenityDto dto);
    Task<bool> DeleteAsync(int id);
    
    // Linking
    Task<bool> AddToRoomTypeAsync(int roomTypeId, int amenityId);
    Task<bool> RemoveFromRoomTypeAsync(int roomTypeId, int amenityId);
}
