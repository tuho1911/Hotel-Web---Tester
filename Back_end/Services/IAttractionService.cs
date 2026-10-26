using HotelManagementAPI.DTOs;

namespace HotelManagementAPI.Services;

public interface IAttractionService
{
    Task<IEnumerable<AttractionDto>> GetAllAsync();
    Task<AttractionDto?> GetByIdAsync(int id);
    Task<AttractionDto> CreateAsync(CreateAttractionDto dto);
    Task<AttractionDto?> UpdateAsync(int id, UpdateAttractionDto dto);
    Task<bool> DeleteAsync(int id);
}
