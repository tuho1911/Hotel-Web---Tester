using HotelManagementAPI.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace HotelManagementAPI.Scratch
{
    public class CheckPayments
    {
        public static async Task Run(IServiceProvider services)
        {
            using var scope = services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var totalPayments = await context.Payments.CountAsync();
            var sumPayments = await context.Payments.SumAsync(p => (decimal?)p.AmountPaid) ?? 0m;
            
            Console.WriteLine($"Total Payments: {totalPayments}");
            Console.WriteLine($"Total Revenue (Sum): {sumPayments}");

            var recentPayments = await context.Payments
                .OrderByDescending(p => p.PaymentDate)
                .Take(5)
                .ToListAsync();

            foreach (var p in recentPayments)
            {
                Console.WriteLine($"- ID: {p.Id}, Amount: {p.AmountPaid}, Date: {p.PaymentDate}");
            }
            
            var now = DateTime.UtcNow;
            var startOfMonth = new DateTime(now.Year, now.Month, 1);
            var monthPayments = await context.Payments
                .Where(p => p.PaymentDate >= startOfMonth)
                .SumAsync(p => (decimal?)p.AmountPaid) ?? 0m;
            
            Console.WriteLine($"Revenue this month (>= {startOfMonth:yyyy-MM-dd}): {monthPayments}");
        }
    }
}
