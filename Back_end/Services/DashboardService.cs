using System;
using System.Linq;
using System.Threading.Tasks;
using HotelManagementAPI.Data;
using HotelManagementAPI.DTOs;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Globalization;

using HotelManagementAPI.Helpers;

namespace HotelManagementAPI.Services;

public class DashboardService : IDashboardService
{
    private readonly AppDbContext _context;

    public DashboardService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardAnalyticsDto> GetAnalyticsAsync()
    {
        var now = TimeHelper.Now;
        var startOfToday = now.Date;
        var thirtyDaysAgo = startOfToday.AddDays(-30);

        // 1. Core Revenue Calculation from Payments
        var recentPayments = await _context.Payments
            .Include(p => p.Invoice)
            .Where(p => p.PaymentDate >= thirtyDaysAgo)
            .ToListAsync();

        var totalRevenue = recentPayments.Sum(p => p.AmountPaid);

        // 2. Room vs Service Revenue Breakdown
        decimal roomRevenue = 0;
        decimal serviceRevenue = 0;

        var paidInvoices = recentPayments
            .Where(p => p.Invoice != null && p.Invoice.StatusString == "Paid")
            .Select(p => p.Invoice)
            .Distinct()
            .ToList();

        foreach (var inv in paidInvoices)
        {
            if (inv == null) continue;
            roomRevenue += inv.TotalRoomAmount ?? 0;
            serviceRevenue += (inv.TotalServiceAmount ?? 0) - (inv.DiscountAmount ?? 0);
        }
        
        // Fallback for demo if no invoices found via payments
        if (totalRevenue > 0 && roomRevenue == 0) {
            roomRevenue = totalRevenue * 0.75m;
            serviceRevenue = totalRevenue * 0.25m;
        }

        // 3. Occupancy & Rooms
        var totalActiveRooms = await _context.Rooms.CountAsync(r => r.IsActive);
        var occupiedRooms = await _context.Rooms.CountAsync(r => r.Status == "Occupied");
        int occupancyRate = totalActiveRooms > 0 ? (int)Math.Round((double)occupiedRooms / totalActiveRooms * 100) : 0;

        // 4. Booking Stats (Parsing date from BookingCode)
        var allBookings = await _context.Bookings.ToListAsync();
        var recentBookings = allBookings.Where(b => 
            !string.IsNullOrEmpty(b.BookingCode) && 
            b.BookingCode.Length >= 10 && 
            DateTime.TryParseExact(b.BookingCode.Substring(2, 8), "yyyyMMdd", null, DateTimeStyles.None, out var d) 
            && d >= thirtyDaysAgo).ToList();
        
        var totalBookings = recentBookings.Count;

        // 5. ADR & RevPAR
        var totalRoomsSold = await _context.BookingDetails
            .Include(bd => bd.Booking)
            .Where(bd => bd.CheckInDate >= thirtyDaysAgo && bd.Booking != null && bd.Booking.StatusString != "Cancelled")
            .CountAsync();

        decimal adr = totalRoomsSold > 0 ? roomRevenue / totalRoomsSold : 0;
        decimal revPAR = totalActiveRooms > 0 ? roomRevenue / (totalActiveRooms * 30) : 0;

        // 6. Revenue Chart (30 Days)
        var chartData = new List<RevenueChartDataDto>();
        for (int i = 29; i >= 0; i--)
        {
            var date = startOfToday.AddDays(-i);
            var nextDate = date.AddDays(1);
            var dailyRevenue = recentPayments
                .Where(p => p.PaymentDate >= date && p.PaymentDate < nextDate)
                .Sum(p => p.AmountPaid);

            chartData.Add(new RevenueChartDataDto { Date = date.ToString("MMM dd"), Revenue = dailyRevenue });
        }

        // 7. Revenue by Room Type (Pie Chart)
        var roomTypeRevenue = await _context.BookingDetails
            .Include(bd => bd.Booking!).ThenInclude(b => b!.Invoice)
            .Include(bd => bd.RoomType)
            .Where(bd => bd.CheckInDate >= thirtyDaysAgo && bd.Booking != null && bd.Booking.Invoice != null && bd.Booking.Invoice.StatusString == "Paid" && bd.RoomType != null)
            .GroupBy(bd => bd.RoomType!.Name)
            .Select(g => new PieChartDataDto { Name = g.Key, Value = g.Sum(x => x.PricePerNight) })
            .ToListAsync();

        // 8. Service Usage Distribution
        var serviceUsage = await _context.OrderServiceDetails
            .Include(osd => osd.Service)
            .Include(osd => osd.OrderService)
            .Where(osd => osd.OrderService != null && osd.OrderService.OrderDate >= thirtyDaysAgo && osd.Service != null)
            .GroupBy(osd => osd.Service!.Name)
            .Select(g => new PieChartDataDto { Name = g.Key, Value = g.Count() })
            .ToListAsync();

        // 9. Booking Status Distribution
        var statusDistribution = recentBookings
            .GroupBy(b => b.StatusString ?? "Unknown")
            .Select(g => new PieChartDataDto { Name = g.Key, Value = g.Count() })
            .ToList();

        return new DashboardAnalyticsDto
        {
            TotalRevenue = totalRevenue,
            RoomRevenue = roomRevenue,
            ServiceRevenue = serviceRevenue,
            TotalBookings = totalBookings,
            OccupancyRate = occupancyRate,
            ADR = adr,
            RevPAR = revPAR,
            RevenueChart30Days = chartData,
            RevenueByRoomType = roomTypeRevenue,
            ServiceUsage = serviceUsage,
            BookingStatusDistribution = statusDistribution
        };
    }
}
