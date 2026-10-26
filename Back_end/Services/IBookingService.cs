using System.Collections.Generic;
using System.Threading.Tasks;
using HotelManagementAPI.DTOs;
using HotelManagementAPI.Enums;

namespace HotelManagementAPI.Services
{
    public interface IBookingService
    {
        Task<IEnumerable<BookingResponseDto>> GetAllBookingsAsync();
        Task<IEnumerable<BookingResponseDto>> GetBookingsByUserIdAsync(int userId);
        Task<BookingResponseDto?> GetBookingByIdAsync(int id);
        Task<BookingResponseDto> CreateBookingAsync(CreateBookingRequestDto requestDto);
        Task<BookingResponseDto?> UpdateBookingStatusAsync(int id, BookingStatus newStatus);
        Task<BookingResponseDto?> ReassignRoomAsync(int bookingId, ReassignRoomDto dto);
        Task<SplitBookingResultDto> SplitBookingAsync(int bookingId, SplitBookingDto dto);
        Task<RoomResponseDto?> GetRoomByIdAsync(int roomId);
    }
}
