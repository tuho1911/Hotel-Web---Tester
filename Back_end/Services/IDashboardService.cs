using System.Threading.Tasks;
using HotelManagementAPI.DTOs;

namespace HotelManagementAPI.Services;

public interface IDashboardService
{
    Task<DashboardAnalyticsDto> GetAnalyticsAsync();
}
