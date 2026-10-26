using BCrypt.Net;
using HotelManagementAPI.Enums;
using HotelManagementAPI.Models;
using HotelManagementAPI.Services;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementAPI.Data;

public sealed class DemoPresentationSeedResult
{
    public int RolesCreated { get; set; }
    public int UsersCreated { get; set; }
    public int RoomImagesCreated { get; set; }
    public int RoomsCreated { get; set; }
    public int ServiceCategoriesCreated { get; set; }
    public int ServicesCreated { get; set; }
    public int VouchersCreated { get; set; }
    public int ReviewsCreated { get; set; }
    public int BookingsCreated { get; set; }
    public int InvoicesCreated { get; set; }
    public int PaymentsCreated { get; set; }
}

public static class DemoPresentationSeeder
{
    private const string DemoPassword = "Demo@123";

    public static async Task<DemoPresentationSeedResult> SeedAsync(IServiceProvider services)
    {
        await using var scope = services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var invoiceService = scope.ServiceProvider.GetRequiredService<IInvoiceService>();

        var result = new DemoPresentationSeedResult();
        await using var transaction = await context.Database.BeginTransactionAsync();

        var guestRoleId = await EnsureGuestRoleAsync(context, result);
        var demoUsers = await EnsureDemoUsersAsync(context, guestRoleId, result);
        var selectedRoomTypes = await SelectRoomTypesAsync(context);

        await EnsureRoomImagesAsync(context, selectedRoomTypes, result);
        var demoRooms = await EnsureDemoRoomsAsync(context, selectedRoomTypes, result);

        var serviceCategories = await EnsureServiceCategoriesAsync(context, result);
        var servicesByName = await EnsureServicesAsync(context, serviceCategories, result);
        var vouchersByCode = await EnsureVouchersAsync(context, result);
        await EnsureRoomTypeReviewsAsync(context, selectedRoomTypes, demoUsers, result);

        if (demoRooms.Count >= 3)
        {
            await EnsureFutureConfirmedBookingAsync(
                context,
                invoiceService,
                demoUsers["business"],
                demoRooms[0],
                vouchersByCode["DEMO10"],
                result);

            await EnsureCheckedInBookingAsync(
                context,
                invoiceService,
                demoUsers["family"],
                demoRooms[1],
                servicesByName,
                result);

            await EnsureCheckedOutBookingAsync(
                context,
                invoiceService,
                demoUsers["traveler"],
                demoRooms[2],
                vouchersByCode["FAMILY500"],
                servicesByName,
                result);
        }

        await EnsureDemoAuditLogsAsync(context, demoUsers);

        await transaction.CommitAsync();
        return result;
    }

    private static async Task<int> EnsureGuestRoleAsync(AppDbContext context, DemoPresentationSeedResult result)
    {
        var guestRole = await context.Roles.FirstOrDefaultAsync(r => r.Name == "Guest");
        if (guestRole != null)
        {
            return guestRole.Id;
        }

        guestRole = new Role
        {
            Name = "Guest",
            Description = "Demo guest role"
        };

        context.Roles.Add(guestRole);
        await context.SaveChangesAsync();
        result.RolesCreated++;
        return guestRole.Id;
    }

    private static async Task<Dictionary<string, User>> EnsureDemoUsersAsync(
        AppDbContext context,
        int guestRoleId,
        DemoPresentationSeedResult result)
    {
        var specs = new[]
        {
            new { Key = "traveler", FullName = "Tran Minh Khoa", Email = "demo.traveler@hotel.local", Phone = "0901000001", Address = "Da Nang" },
            new { Key = "family", FullName = "Nguyen Thu Ha", Email = "demo.family@hotel.local", Phone = "0901000002", Address = "Ha Noi" },
            new { Key = "business", FullName = "Le Bao An", Email = "demo.business@hotel.local", Phone = "0901000003", Address = "Ho Chi Minh City" }
        };

        var users = new Dictionary<string, User>(StringComparer.OrdinalIgnoreCase);

        foreach (var spec in specs)
        {
            var user = await context.Users.FirstOrDefaultAsync(u => u.Email == spec.Email);
            if (user == null)
            {
                user = new User
                {
                    RoleId = guestRoleId,
                    FullName = spec.FullName,
                    Email = spec.Email,
                    Phone = spec.Phone,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(DemoPassword),
                    Status = true,
                    Address = spec.Address,
                    CreatedAt = DateTime.Now
                };

                context.Users.Add(user);
                await context.SaveChangesAsync();
                result.UsersCreated++;
            }
            else
            {
                user.RoleId = user.RoleId ?? guestRoleId;
                user.FullName = spec.FullName;
                user.Phone = spec.Phone;
                user.Status = true;
                user.Address = spec.Address;
                await context.SaveChangesAsync();
            }

            users[spec.Key] = user;
        }

        return users;
    }

    private static async Task<List<RoomType>> SelectRoomTypesAsync(AppDbContext context)
    {
        var preferredIds = new[] { 2, 4, 6 };
        var roomTypes = await context.RoomTypes
            .Where(rt => rt.IsActive)
            .OrderBy(rt => rt.BasePrice)
            .ToListAsync();

        var selected = new List<RoomType>();
        foreach (var preferredId in preferredIds)
        {
            var roomType = roomTypes.FirstOrDefault(rt => rt.Id == preferredId);
            if (roomType != null && selected.All(item => item.Id != roomType.Id))
            {
                selected.Add(roomType);
            }
        }

        foreach (var roomType in roomTypes)
        {
            if (selected.Count >= 3)
            {
                break;
            }

            if (selected.All(item => item.Id != roomType.Id))
            {
                selected.Add(roomType);
            }
        }

        return selected;
    }

    private static async Task EnsureRoomImagesAsync(
        AppDbContext context,
        IReadOnlyList<RoomType> roomTypes,
        DemoPresentationSeedResult result)
    {
        var imageUrls = new[]
        {
            "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1600&q=80",
            "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80",
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80"
        };

        for (var i = 0; i < roomTypes.Count; i++)
        {
            var roomType = roomTypes[i];
            var hasImage = await context.RoomImages.AnyAsync(image => image.RoomTypeId == roomType.Id);
            if (hasImage)
            {
                continue;
            }

            context.RoomImages.Add(new RoomImage
            {
                RoomTypeId = roomType.Id,
                ImageUrl = imageUrls[Math.Min(i, imageUrls.Length - 1)],
                IsPrimary = true,
                IsActive = true
            });
            result.RoomImagesCreated++;
        }

        await context.SaveChangesAsync();
    }

    private static async Task<List<Room>> EnsureDemoRoomsAsync(
        AppDbContext context,
        IReadOnlyList<RoomType> roomTypes,
        DemoPresentationSeedResult result)
    {
        var roomNumbers = new[] { "601", "602", "603" };
        var rooms = new List<Room>();

        for (var i = 0; i < roomTypes.Count && i < roomNumbers.Length; i++)
        {
            var roomNumber = roomNumbers[i];
            var room = await context.Rooms.FirstOrDefaultAsync(r => r.RoomNumber == roomNumber);
            if (room == null)
            {
                room = new Room
                {
                    RoomNumber = roomNumber,
                    RoomTypeId = roomTypes[i].Id,
                    Floor = 6,
                    Status = "Available",
                    CleaningStatus = "Clean",
                    IsActive = true
                };
                context.Rooms.Add(room);
                await context.SaveChangesAsync();
                result.RoomsCreated++;
            }
            else
            {
                room.RoomTypeId = roomTypes[i].Id;
                room.Floor = 6;
                room.IsActive = true;
                await context.SaveChangesAsync();
            }

            rooms.Add(room);
        }

        return rooms;
    }

    private static async Task<Dictionary<string, ServiceCategory>> EnsureServiceCategoriesAsync(
        AppDbContext context,
        DemoPresentationSeedResult result)
    {
        var categoryNames = new[]
        {
            "Breakfast",
            "Spa",
            "Transport",
            "Laundry"
        };

        var categories = new Dictionary<string, ServiceCategory>(StringComparer.OrdinalIgnoreCase);

        foreach (var categoryName in categoryNames)
        {
            var category = await context.ServiceCategories.FirstOrDefaultAsync(c => c.Name == categoryName);
            if (category == null)
            {
                category = new ServiceCategory { Name = categoryName };
                context.ServiceCategories.Add(category);
                await context.SaveChangesAsync();
                result.ServiceCategoriesCreated++;
            }

            categories[categoryName] = category;
        }

        return categories;
    }

    private static async Task<Dictionary<string, Service>> EnsureServicesAsync(
        AppDbContext context,
        Dictionary<string, ServiceCategory> categories,
        DemoPresentationSeedResult result)
    {
        var specs = new[]
        {
            new { Name = "Buffet Breakfast", Category = "Breakfast", Price = 200000m, Unit = "Guest" },
            new { Name = "Garden BBQ Set", Category = "Breakfast", Price = 450000m, Unit = "Set" },
            new { Name = "Aroma Massage 90m", Category = "Spa", Price = 650000m, Unit = "Session" },
            new { Name = "Airport Transfer", Category = "Transport", Price = 350000m, Unit = "Trip" },
            new { Name = "Same Day Laundry", Category = "Laundry", Price = 80000m, Unit = "Kg" }
        };

        var services = new Dictionary<string, Service>(StringComparer.OrdinalIgnoreCase);

        foreach (var spec in specs)
        {
            var service = await context.Services.FirstOrDefaultAsync(s => s.Name == spec.Name);
            if (service == null)
            {
                service = new Service
                {
                    CategoryId = categories[spec.Category].Id,
                    Name = spec.Name,
                    Price = spec.Price,
                    Unit = spec.Unit
                };

                context.Services.Add(service);
                await context.SaveChangesAsync();
                result.ServicesCreated++;
            }
            else
            {
                service.CategoryId = categories[spec.Category].Id;
                service.Price = spec.Price;
                service.Unit = spec.Unit;
                await context.SaveChangesAsync();
            }

            services[spec.Name] = service;
        }

        return services;
    }

    private static async Task<Dictionary<string, Voucher>> EnsureVouchersAsync(
        AppDbContext context,
        DemoPresentationSeedResult result)
    {
        var now = DateTime.Now;
        var specs = new[]
        {
            new { Code = "DEMO10", Name = "Demo 10 Percent", Description = "Suitable for direct booking demos", DiscountType = "Percentage", DiscountValue = 10m, MinBookingAmount = 1000000m, MaxDiscountAmount = (decimal?)500000m, UsageLimit = (int?)100 },
            new { Code = "FAMILY500", Name = "Family Half Million", Description = "Good for family room bundles", DiscountType = "Fixed", DiscountValue = 500000m, MinBookingAmount = 3500000m, MaxDiscountAmount = (decimal?)null, UsageLimit = (int?)50 },
            new { Code = "SPA15", Name = "Spa 15 Percent", Description = "Cross sell voucher for service demos", DiscountType = "Percentage", DiscountValue = 15m, MinBookingAmount = 2000000m, MaxDiscountAmount = (decimal?)450000m, UsageLimit = (int?)30 }
        };

        var vouchers = new Dictionary<string, Voucher>(StringComparer.OrdinalIgnoreCase);

        foreach (var spec in specs)
        {
            var voucher = await context.Vouchers.FirstOrDefaultAsync(v => v.Code == spec.Code);
            if (voucher == null)
            {
                voucher = new Voucher
                {
                    Code = spec.Code,
                    Name = spec.Name,
                    Description = spec.Description,
                    DiscountType = spec.DiscountType,
                    DiscountValue = spec.DiscountValue,
                    MinBookingAmount = spec.MinBookingAmount,
                    MaxDiscountAmount = spec.MaxDiscountAmount,
                    StartDate = new DateTime(now.Year, 1, 1),
                    EndDate = new DateTime(now.Year, 12, 31),
                    UsageLimit = spec.UsageLimit,
                    UsageCount = 0,
                    IsActive = true,
                    CreatedAt = now,
                    UpdatedAt = now
                };

                context.Vouchers.Add(voucher);
                await context.SaveChangesAsync();
                result.VouchersCreated++;
            }
            else
            {
                voucher.Name = spec.Name;
                voucher.Description = spec.Description;
                voucher.DiscountType = spec.DiscountType;
                voucher.DiscountValue = spec.DiscountValue;
                voucher.MinBookingAmount = spec.MinBookingAmount;
                voucher.MaxDiscountAmount = spec.MaxDiscountAmount;
                voucher.StartDate = new DateTime(now.Year, 1, 1);
                voucher.EndDate = new DateTime(now.Year, 12, 31);
                voucher.IsActive = true;
                voucher.UpdatedAt = now;
                await context.SaveChangesAsync();
            }

            vouchers[spec.Code] = voucher;
        }

        return vouchers;
    }

    private static async Task EnsureRoomTypeReviewsAsync(
        AppDbContext context,
        IReadOnlyList<RoomType> roomTypes,
        IReadOnlyDictionary<string, User> demoUsers,
        DemoPresentationSeedResult result)
    {
        var comments = new[]
        {
            new { Index = 0, GuestName = "Minh Chau", Rating = 5, Comment = "Phong sach, de check-in va rat de demo booking." },
            new { Index = 1, GuestName = "Gia Dinh Anh Quan", Rating = 5, Comment = "Phong rong, view dep va phu hop demo gia dinh." },
            new { Index = 2, GuestName = "Thu Hang", Rating = 4, Comment = "Khong gian yen tinh, phu hop khach cong tac." }
        };

        for (var i = 0; i < roomTypes.Count && i < comments.Length; i++)
        {
            var roomType = roomTypes[i];
            var comment = comments[i];
            var exists = await context.Reviews.AnyAsync(r =>
                r.TargetType == "RoomType" &&
                r.TargetId == roomType.Id &&
                r.GuestName == comment.GuestName &&
                r.Comment == comment.Comment);

            if (exists)
            {
                continue;
            }

            var linkedUser = i switch
            {
                0 => demoUsers["traveler"],
                1 => demoUsers["family"],
                _ => demoUsers["business"]
            };

            context.Reviews.Add(new Review
            {
                TargetType = "RoomType",
                TargetId = roomType.Id,
                UserId = linkedUser.Id,
                GuestName = comment.GuestName,
                Rating = comment.Rating,
                Comment = comment.Comment,
                IsApproved = true,
                CreatedAt = DateTime.UtcNow.AddDays(-(7 - i))
            });
            result.ReviewsCreated++;
        }

        await context.SaveChangesAsync();
    }

    private static async Task EnsureFutureConfirmedBookingAsync(
        AppDbContext context,
        IInvoiceService invoiceService,
        User user,
        Room room,
        Voucher voucher,
        DemoPresentationSeedResult result)
    {
        var roomType = await context.RoomTypes.FindAsync(room.RoomTypeId);
        if (roomType == null)
        {
            return;
        }

        var booking = await EnsureBookingShellAsync(
            context,
            room,
            user,
            "DEMO-BK-001",
            BookingStatus.Confirmed,
            500000m,
            "Unpaid",
            DateTime.Today.AddDays(17),
            DateTime.Today.AddDays(19),
            roomType.BasePrice,
            voucher.Id,
            result);

        await EnsureInvoiceAsync(context, invoiceService, booking.Id, result);

        room.Status = "Available";
        room.CleaningStatus = "Clean";
        await context.SaveChangesAsync();
    }

    private static async Task EnsureCheckedInBookingAsync(
        AppDbContext context,
        IInvoiceService invoiceService,
        User user,
        Room room,
        IReadOnlyDictionary<string, Service> servicesByName,
        DemoPresentationSeedResult result)
    {
        var roomType = await context.RoomTypes.FindAsync(room.RoomTypeId);
        if (roomType == null)
        {
            return;
        }

        var booking = await EnsureBookingShellAsync(
            context,
            room,
            user,
            "DEMO-BK-002",
            BookingStatus.CheckedIn,
            1000000m,
            "Paid",
            DateTime.Today.AddDays(-1),
            DateTime.Today.AddDays(2),
            roomType.BasePrice,
            null,
            result);

        var detail = await context.BookingDetails.FirstAsync(d => d.BookingId == booking.Id);
        await EnsureDeliveredOrderAsync(
            context,
            detail.Id,
            DateTime.Today.AddDays(-1).AddHours(9),
            new[]
            {
                (servicesByName["Airport Transfer"], 1),
                (servicesByName["Buffet Breakfast"], 2)
            });

        var invoice = await EnsureInvoiceAsync(context, invoiceService, booking.Id, result);
        await EnsurePaymentAsync(invoiceService, context, invoice.Id, "DEMO-PAY-002-1", "BankTransfer", 1500000m, result);

        room.Status = "Occupied";
        room.CleaningStatus = "Clean";
        await context.SaveChangesAsync();
        await invoiceService.RecalculateInvoiceAsync(booking.Id);
    }

    private static async Task EnsureCheckedOutBookingAsync(
        AppDbContext context,
        IInvoiceService invoiceService,
        User user,
        Room room,
        Voucher voucher,
        IReadOnlyDictionary<string, Service> servicesByName,
        DemoPresentationSeedResult result)
    {
        var roomType = await context.RoomTypes.FindAsync(room.RoomTypeId);
        if (roomType == null)
        {
            return;
        }

        var booking = await EnsureBookingShellAsync(
            context,
            room,
            user,
            "DEMO-BK-003",
            BookingStatus.CheckedOut,
            800000m,
            "Paid",
            DateTime.Today.AddDays(-8),
            DateTime.Today.AddDays(-5),
            roomType.BasePrice,
            voucher.Id,
            result);

        var detail = await context.BookingDetails.FirstAsync(d => d.BookingId == booking.Id);
        await EnsureDeliveredOrderAsync(
            context,
            detail.Id,
            DateTime.Today.AddDays(-7).AddHours(20),
            new[]
            {
                (servicesByName["Aroma Massage 90m"], 1),
                (servicesByName["Same Day Laundry"], 2)
            });

        var invoice = await EnsureInvoiceAsync(context, invoiceService, booking.Id, result);
        var existingPayments = await context.Payments
            .Where(p => p.InvoiceId == invoice.Id)
            .SumAsync(p => (decimal?)p.AmountPaid) ?? 0m;
        var remaining = Math.Max(0m, (invoice.FinalTotal ?? 0m) - 800000m - existingPayments);

        if (remaining > 0)
        {
            await EnsurePaymentAsync(invoiceService, context, invoice.Id, "DEMO-PAY-003-1", "Cash", remaining, result);
        }

        room.Status = "Available";
        room.CleaningStatus = "Dirty";
        await context.SaveChangesAsync();
        await invoiceService.RecalculateInvoiceAsync(booking.Id);
    }

    private static async Task<Booking> EnsureBookingShellAsync(
        AppDbContext context,
        Room room,
        User user,
        string bookingCode,
        BookingStatus status,
        decimal depositAmount,
        string depositStatus,
        DateTime checkInDate,
        DateTime checkOutDate,
        decimal pricePerNight,
        int? voucherId,
        DemoPresentationSeedResult result)
    {
        var booking = await context.Bookings
            .Include(b => b.BookingDetails)
            .FirstOrDefaultAsync(b => b.BookingCode == bookingCode);

        if (booking == null)
        {
            booking = new Booking
            {
                UserId = user.Id,
                GuestName = user.FullName,
                GuestPhone = user.Phone,
                GuestEmail = user.Email,
                BookingCode = bookingCode,
                VoucherId = voucherId,
                Status = status,
                DepositAmount = depositAmount,
                DepositStatus = depositStatus
            };

            context.Bookings.Add(booking);
            await context.SaveChangesAsync();
            result.BookingsCreated++;
        }
        else
        {
            booking.UserId = user.Id;
            booking.GuestName = user.FullName;
            booking.GuestPhone = user.Phone;
            booking.GuestEmail = user.Email;
            booking.VoucherId = voucherId;
            booking.Status = status;
            booking.DepositAmount = depositAmount;
            booking.DepositStatus = depositStatus;
            await context.SaveChangesAsync();
        }

        var detail = booking.BookingDetails.FirstOrDefault();
        if (detail == null)
        {
            detail = new BookingDetail
            {
                BookingId = booking.Id,
                RoomId = room.Id,
                RoomTypeId = room.RoomTypeId,
                CheckInDate = checkInDate,
                CheckOutDate = checkOutDate,
                PricePerNight = pricePerNight,
                Status = status.ToString()
            };
            context.BookingDetails.Add(detail);
        }
        else
        {
            detail.RoomId = room.Id;
            detail.RoomTypeId = room.RoomTypeId;
            detail.CheckInDate = checkInDate;
            detail.CheckOutDate = checkOutDate;
            detail.PricePerNight = pricePerNight;
            detail.Status = status.ToString();
        }

        await context.SaveChangesAsync();
        return booking;
    }

    private static async Task EnsureDeliveredOrderAsync(
        AppDbContext context,
        int bookingDetailId,
        DateTime orderDate,
        IEnumerable<(Service Service, int Quantity)> lines)
    {
        var order = await context.OrderServices
            .Include(o => o.Details)
            .FirstOrDefaultAsync(o => o.BookingDetailId == bookingDetailId);

        if (order == null)
        {
            order = new OrderService
            {
                BookingDetailId = bookingDetailId,
                OrderDate = orderDate,
                Status = OrderServiceStatus.Delivered
            };
            context.OrderServices.Add(order);
            await context.SaveChangesAsync();
        }

        foreach (var line in lines)
        {
            var existingDetail = order.Details.FirstOrDefault(d => d.ServiceId == line.Service.Id);
            if (existingDetail == null)
            {
                existingDetail = new OrderServiceDetail
                {
                    OrderServiceId = order.Id,
                    ServiceId = line.Service.Id,
                    Quantity = line.Quantity,
                    UnitPrice = line.Service.Price
                };
                context.OrderServiceDetails.Add(existingDetail);
            }
            else
            {
                existingDetail.Quantity = line.Quantity;
                existingDetail.UnitPrice = line.Service.Price;
            }
        }

        order.TotalAmount = lines.Sum(line => line.Service.Price * line.Quantity);
        order.Status = OrderServiceStatus.Delivered;
        order.OrderDate = orderDate;
        await context.SaveChangesAsync();
    }

    private static async Task<Invoice> EnsureInvoiceAsync(
        AppDbContext context,
        IInvoiceService invoiceService,
        int bookingId,
        DemoPresentationSeedResult result)
    {
        var invoice = await context.Invoices.FirstOrDefaultAsync(i => i.BookingId == bookingId);
        if (invoice == null)
        {
            await invoiceService.CreateInvoiceAsync(bookingId);
            result.InvoicesCreated++;
        }
        else
        {
            await invoiceService.RecalculateInvoiceAsync(bookingId);
        }

        return await context.Invoices.FirstAsync(i => i.BookingId == bookingId);
    }

    private static async Task EnsurePaymentAsync(
        IInvoiceService invoiceService,
        AppDbContext context,
        int invoiceId,
        string transactionCode,
        string paymentMethod,
        decimal amount,
        DemoPresentationSeedResult result)
    {
        if (amount <= 0)
        {
            return;
        }

        var exists = await context.Payments.AnyAsync(p => p.TransactionCode == transactionCode);
        if (exists)
        {
            return;
        }

        await invoiceService.AddPaymentAsync(invoiceId, new DTOs.AddPaymentDto
        {
            PaymentMethod = paymentMethod,
            AmountPaid = amount,
            TransactionCode = transactionCode
        });
        result.PaymentsCreated++;
    }

    private static async Task EnsureDemoAuditLogsAsync(AppDbContext context, IReadOnlyDictionary<string, User> demoUsers)
    {
        var marker = "[DEMO_AUDIT_SEED]";
        var alreadySeeded = await context.AuditLogs.AnyAsync(x => x.Message.Contains(marker));
        if (alreadySeeded) return;

        var now = DateTime.UtcNow;
        var user = demoUsers.Values.FirstOrDefault();

        var logs = new[]
        {
            new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = now.AddMinutes(-30),
                ActionType = "CREATE",
                EntityType = "Booking",
                ContextJson = "{\"bookingCode\":\"DEMO-0001\"}",
                ChangesJson = "{\"newValues\":{\"status\":\"Confirmed\"}}",
                Message = $"{marker} Tạo booking demo thành công",
                UserId = user?.Id,
                UserName = user?.FullName,
                IpAddress = "127.0.0.1"
            },
            new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = now.AddMinutes(-20),
                ActionType = "UPDATE",
                EntityType = "Room",
                ContextJson = "{\"roomNumber\":\"601\"}",
                ChangesJson = "{\"previousValues\":{\"status\":\"Available\"},\"newValues\":{\"status\":\"Occupied\"}}",
                Message = $"{marker} Cập nhật trạng thái phòng demo",
                UserId = user?.Id,
                UserName = user?.FullName,
                IpAddress = "127.0.0.1"
            },
            new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = now.AddMinutes(-10),
                ActionType = "LOGIN",
                EntityType = "User",
                ContextJson = "{\"source\":\"demo-seeder\"}",
                ChangesJson = "{}",
                Message = $"{marker} Đăng nhập demo",
                UserId = user?.Id,
                UserName = user?.FullName,
                IpAddress = "127.0.0.1"
            }
        };

        context.AuditLogs.AddRange(logs);
        await context.SaveChangesAsync();
    }
}
