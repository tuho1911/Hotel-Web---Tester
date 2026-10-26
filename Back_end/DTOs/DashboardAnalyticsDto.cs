using System.Collections.Generic;

namespace HotelManagementAPI.DTOs;

public class DashboardAnalyticsDto
{
    public decimal TotalRevenue { get; set; }
    public decimal RoomRevenue { get; set; }
    public decimal ServiceRevenue { get; set; }
    public int TotalBookings { get; set; }
    public int OccupancyRate { get; set; }
    public decimal RevPAR { get; set; }
    public decimal ADR { get; set; }
    
    public List<RevenueChartDataDto> RevenueChart30Days { get; set; } = new();
    public List<PieChartDataDto> RevenueByRoomType { get; set; } = new();
    public List<PieChartDataDto> ServiceUsage { get; set; } = new();
    public List<PieChartDataDto> BookingStatusDistribution { get; set; } = new();
}

public class RevenueChartDataDto
{
    public string Date { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
}

public class PieChartDataDto
{
    public string Name { get; set; } = string.Empty;
    public decimal Value { get; set; }
}
