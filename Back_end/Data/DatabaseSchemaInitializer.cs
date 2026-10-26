using Microsoft.EntityFrameworkCore;

namespace HotelManagementAPI.Data;

public static class DatabaseSchemaInitializer
{
    public static async Task EnsureVoucherSchemaAsync(IServiceProvider services)
    {
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID(N'[dbo].[Vouchers]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[Vouchers](
                    [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    [code] NVARCHAR(50) NOT NULL,
                    [name] NVARCHAR(255) NOT NULL,
                    [description] NVARCHAR(MAX) NULL,
                    [discount_type] NVARCHAR(20) NOT NULL,
                    [discount_value] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_Vouchers_DiscountValue] DEFAULT(0),
                    [min_booking_amount] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_Vouchers_MinBooking] DEFAULT(0),
                    [max_discount_amount] DECIMAL(18,2) NULL,
                    [start_date] DATETIME2 NOT NULL,
                    [end_date] DATETIME2 NOT NULL,
                    [usage_limit] INT NULL,
                    [eligible_membership_id] INT NULL,
                    [eligible_member_only] BIT NOT NULL CONSTRAINT [DF_Vouchers_EligibleMemberOnly] DEFAULT(0),
                    [usage_count] INT NOT NULL CONSTRAINT [DF_Vouchers_UsageCount] DEFAULT(0),
                    [is_active] BIT NOT NULL CONSTRAINT [DF_Vouchers_IsActive] DEFAULT(1),
                    [created_at] DATETIME2 NOT NULL CONSTRAINT [DF_Vouchers_CreatedAt] DEFAULT(SYSDATETIME()),
                    [updated_at] DATETIME2 NOT NULL CONSTRAINT [DF_Vouchers_UpdatedAt] DEFAULT(SYSDATETIME())
                );

                CREATE UNIQUE INDEX [IX_Vouchers_Code] ON [dbo].[Vouchers]([code]);
            END
            """
        );

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID(N'[dbo].[Vouchers]', N'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH(N'[dbo].[Vouchers]', 'name') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Vouchers] ADD [name] NVARCHAR(255) NULL;
                END

                IF COL_LENGTH(N'[dbo].[Vouchers]', 'description') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Vouchers] ADD [description] NVARCHAR(MAX) NULL;
                END

                IF COL_LENGTH(N'[dbo].[Vouchers]', 'min_booking_amount') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Vouchers] ADD [min_booking_amount] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_Vouchers_MinBookingAmount_Upgrade] DEFAULT(0);
                END

                IF COL_LENGTH(N'[dbo].[Vouchers]', 'max_discount_amount') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Vouchers] ADD [max_discount_amount] DECIMAL(18,2) NULL;
                END

                IF COL_LENGTH(N'[dbo].[Vouchers]', 'start_date') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Vouchers] ADD [start_date] DATETIME2 NULL;
                END

                IF COL_LENGTH(N'[dbo].[Vouchers]', 'end_date') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Vouchers] ADD [end_date] DATETIME2 NULL;
                END

                IF COL_LENGTH(N'[dbo].[Vouchers]', 'eligible_membership_id') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Vouchers] ADD [eligible_membership_id] INT NULL;
                END

                IF COL_LENGTH(N'[dbo].[Vouchers]', 'eligible_member_only') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Vouchers] ADD [eligible_member_only] BIT NOT NULL CONSTRAINT [DF_Vouchers_EligibleMemberOnly_Upgrade] DEFAULT(0);
                END

                IF COL_LENGTH(N'[dbo].[Vouchers]', 'usage_count') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Vouchers] ADD [usage_count] INT NOT NULL CONSTRAINT [DF_Vouchers_UsageCount_Upgrade] DEFAULT(0);
                END

                IF COL_LENGTH(N'[dbo].[Vouchers]', 'is_active') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Vouchers] ADD [is_active] BIT NOT NULL CONSTRAINT [DF_Vouchers_IsActive_Upgrade] DEFAULT(1);
                END

                IF COL_LENGTH(N'[dbo].[Vouchers]', 'created_at') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Vouchers] ADD [created_at] DATETIME2 NOT NULL CONSTRAINT [DF_Vouchers_CreatedAt_Upgrade] DEFAULT(SYSDATETIME());
                END

                IF COL_LENGTH(N'[dbo].[Vouchers]', 'updated_at') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Vouchers] ADD [updated_at] DATETIME2 NOT NULL CONSTRAINT [DF_Vouchers_UpdatedAt_Upgrade] DEFAULT(SYSDATETIME());
                END
            END
            """
        );

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID(N'[dbo].[Vouchers]', N'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH(N'[dbo].[Vouchers]', 'min_booking_value') IS NOT NULL
                BEGIN
                    EXEC sp_executesql N'UPDATE [dbo].[Vouchers] SET [min_booking_amount] = ISNULL([min_booking_value], 0) WHERE [min_booking_amount] IS NULL OR [min_booking_amount] = 0;';
                END

                IF COL_LENGTH(N'[dbo].[Vouchers]', 'valid_from') IS NOT NULL
                BEGIN
                    EXEC sp_executesql N'UPDATE [dbo].[Vouchers] SET [start_date] = [valid_from] WHERE [start_date] IS NULL;';
                END

                IF COL_LENGTH(N'[dbo].[Vouchers]', 'valid_to') IS NOT NULL
                BEGIN
                    EXEC sp_executesql N'UPDATE [dbo].[Vouchers] SET [end_date] = [valid_to] WHERE [end_date] IS NULL;';
                END

                UPDATE [dbo].[Vouchers]
                SET [name] = COALESCE(NULLIF(LTRIM(RTRIM([name])), ''), [code]),
                    [created_at] = COALESCE([created_at], SYSDATETIME()),
                    [updated_at] = COALESCE([updated_at], SYSDATETIME()),
                    [start_date] = COALESCE([start_date], DATEFROMPARTS(2025, 1, 1)),
                    [end_date] = COALESCE([end_date], DATEFROMPARTS(2026, 12, 31)),
                    [is_active] = COALESCE([is_active], 1),
                    [usage_count] = COALESCE([usage_count], 0);

                UPDATE [dbo].[Vouchers]
                SET [discount_type] = CASE
                    WHEN UPPER([discount_type]) IN ('PERCENT', 'PERCENTAGE') THEN 'Percentage'
                    WHEN UPPER([discount_type]) IN ('FIXED_AMOUNT', 'FIXED') THEN 'Fixed'
                    ELSE [discount_type]
                END;
            END
            
            IF OBJECT_ID(N'[dbo].[Vouchers]', N'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH(N'[dbo].[Vouchers]', 'eligible_membership_id') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Vouchers] ADD [eligible_membership_id] INT NULL;
                END

                IF COL_LENGTH(N'[dbo].[Vouchers]', 'eligible_member_only') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Vouchers] ADD [eligible_member_only] BIT NOT NULL CONSTRAINT [DF_Vouchers_EligibleMemberOnly_Upgrade2] DEFAULT(0);
                END
            END
            """
        );

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID(N'[dbo].[Vouchers]', N'U') IS NOT NULL
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM sys.columns
                    WHERE object_id = OBJECT_ID(N'[dbo].[Vouchers]')
                      AND name = 'name'
                      AND is_nullable = 1
                )
                BEGIN
                    ALTER TABLE [dbo].[Vouchers] ALTER COLUMN [name] NVARCHAR(255) NOT NULL;
                END

                IF EXISTS (
                    SELECT 1
                    FROM sys.columns
                    WHERE object_id = OBJECT_ID(N'[dbo].[Vouchers]')
                      AND name = 'start_date'
                      AND is_nullable = 1
                )
                BEGIN
                    ALTER TABLE [dbo].[Vouchers] ALTER COLUMN [start_date] DATETIME2 NOT NULL;
                END

                IF EXISTS (
                    SELECT 1
                    FROM sys.columns
                    WHERE object_id = OBJECT_ID(N'[dbo].[Vouchers]')
                      AND name = 'end_date'
                      AND is_nullable = 1
                )
                BEGIN
                    ALTER TABLE [dbo].[Vouchers] ALTER COLUMN [end_date] DATETIME2 NOT NULL;
                END

                IF NOT EXISTS (
                    SELECT 1
                    FROM sys.indexes
                    WHERE name = 'IX_Vouchers_Code'
                      AND object_id = OBJECT_ID(N'[dbo].[Vouchers]')
                )
                BEGIN
                    CREATE UNIQUE INDEX [IX_Vouchers_Code] ON [dbo].[Vouchers]([code]);
                END
            END
            """
        );

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID(N'[dbo].[Bookings]', N'U') IS NOT NULL
               AND COL_LENGTH(N'[dbo].[Bookings]', 'voucher_id') IS NOT NULL
               AND OBJECT_ID(N'[dbo].[Vouchers]', N'U') IS NOT NULL
               AND NOT EXISTS (
                   SELECT 1
                   FROM sys.foreign_keys
                   WHERE name = 'FK_Bookings_Vouchers'
               )
            BEGIN
                ALTER TABLE [dbo].[Bookings] WITH NOCHECK
                    ADD CONSTRAINT [FK_Bookings_Vouchers]
                    FOREIGN KEY ([voucher_id]) REFERENCES [dbo].[Vouchers]([id]);
            END
            """
        );
    }

    public static async Task EnsureMembershipSchemaAsync(IServiceProvider services)
    {
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID(N'[dbo].[Memberships]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[Memberships](
                    [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    [tier_name] NVARCHAR(100) NOT NULL,
                    [min_points] INT NULL,
                    [discount_percent] DECIMAL(18,2) NULL,
                    [created_at] DATETIME2 NULL
                );
            END
            """
        );

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID(N'[dbo].[Memberships]', N'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH(N'[dbo].[Memberships]', 'tier_name') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Memberships] ADD [tier_name] NVARCHAR(100) NULL;
                END

                IF COL_LENGTH(N'[dbo].[Memberships]', 'min_points') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Memberships] ADD [min_points] INT NULL;
                END

                IF COL_LENGTH(N'[dbo].[Memberships]', 'discount_percent') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Memberships] ADD [discount_percent] DECIMAL(18,2) NULL;
                END

                IF COL_LENGTH(N'[dbo].[Memberships]', 'created_at') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Memberships] ADD [created_at] DATETIME2 NULL;
                END

                UPDATE [dbo].[Memberships]
                SET [tier_name] = COALESCE(NULLIF(LTRIM(RTRIM([tier_name])), ''), CONCAT('Tier ', [id])),
                    [created_at] = COALESCE([created_at], SYSDATETIME())
                WHERE [tier_name] IS NULL OR LTRIM(RTRIM([tier_name])) = '';

                IF EXISTS (
                    SELECT 1
                    FROM sys.columns
                    WHERE object_id = OBJECT_ID(N'[dbo].[Memberships]')
                      AND name = 'tier_name'
                      AND is_nullable = 1
                )
                BEGIN
                    ALTER TABLE [dbo].[Memberships] ALTER COLUMN [tier_name] NVARCHAR(100) NOT NULL;
                END
            END
            """
        );

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID(N'[dbo].[Memberships]', N'U') IS NOT NULL
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM [dbo].[Memberships])
                BEGIN
                    INSERT INTO [dbo].[Memberships] ([tier_name], [min_points], [discount_percent], [created_at]) VALUES
                    (N'Silver', 0, 0, SYSDATETIME()),
                    (N'Gold', 5000, 5, SYSDATETIME()),
                    (N'Platinum', 10000, 10, SYSDATETIME());
                END
            END

            IF OBJECT_ID(N'[dbo].[Users]', N'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH(N'[dbo].[Users]', 'loyalty_points') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Users] ADD [loyalty_points] INT NOT NULL CONSTRAINT [DF_Users_LoyaltyPoints] DEFAULT(0);
                END
            END
            """
        );
    }

    public static async Task EnsureEquipmentDamageSchemaAsync(IServiceProvider services)
    {
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID(N'[dbo].[AuditLogs]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[AuditLogs](
                    [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                    [Timestamp] DATETIME2 NOT NULL,
                    [ActionType] NVARCHAR(50) NOT NULL,
                    [EntityType] NVARCHAR(100) NOT NULL,
                    [ContextJson] NVARCHAR(MAX) NULL,
                    [ChangesJson] NVARCHAR(MAX) NULL,
                    [Message] NVARCHAR(1000) NOT NULL,
                    [UserId] INT NULL,
                    [UserName] NVARCHAR(255) NULL,
                    [IpAddress] NVARCHAR(100) NULL
                );
            END
            ELSE
            BEGIN
                IF COL_LENGTH(N'[dbo].[AuditLogs]', 'UserId') IS NULL
                    ALTER TABLE [dbo].[AuditLogs] ADD [UserId] INT NULL;

                IF COL_LENGTH(N'[dbo].[AuditLogs]', 'UserName') IS NULL
                    ALTER TABLE [dbo].[AuditLogs] ADD [UserName] NVARCHAR(255) NULL;

                IF COL_LENGTH(N'[dbo].[AuditLogs]', 'IpAddress') IS NULL
                    ALTER TABLE [dbo].[AuditLogs] ADD [IpAddress] NVARCHAR(100) NULL;
            END
            """
        );

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID(N'[dbo].[Loss_And_Damages]', N'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH(N'[dbo].[Loss_And_Damages]', 'image_url') IS NULL
                   AND COL_LENGTH(N'[dbo].[Loss_And_Damages]', 'ImageUrl') IS NOT NULL
                BEGIN
                    EXEC sp_rename 'dbo.Loss_And_Damages.ImageUrl', 'image_url', 'COLUMN';
                END

                IF COL_LENGTH(N'[dbo].[Loss_And_Damages]', 'image_url') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Loss_And_Damages]
                        ADD [image_url] NVARCHAR(MAX) NULL;
                END

                IF COL_LENGTH(N'[dbo].[Loss_And_Damages]', 'equipment_id') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Loss_And_Damages]
                        ADD [equipment_id] INT NULL;
                END

                IF COL_LENGTH(N'[dbo].[Loss_And_Damages]', 'status') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[Loss_And_Damages]
                        ADD [status] NVARCHAR(20) NULL;
                END
            END
            """
        );

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID(N'[dbo].[Loss_And_Damages]', N'U') IS NOT NULL
               AND COL_LENGTH(N'[dbo].[Loss_And_Damages]', 'equipment_id') IS NOT NULL
               AND OBJECT_ID(N'[dbo].[Room_Inventory]', N'U') IS NOT NULL
               AND COL_LENGTH(N'[dbo].[Room_Inventory]', 'EquipmentId') IS NOT NULL
            BEGIN
                UPDATE ld
                SET ld.[equipment_id] = ri.[EquipmentId]
                FROM [dbo].[Loss_And_Damages] AS ld
                INNER JOIN [dbo].[Room_Inventory] AS ri
                    ON ri.[id] = ld.[room_inventory_id]
                WHERE ld.[equipment_id] IS NULL;
            END
            """
        );

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID(N'[dbo].[Loss_And_Damages]', N'U') IS NOT NULL
               AND COL_LENGTH(N'[dbo].[Loss_And_Damages]', 'status') IS NOT NULL
            BEGIN
                UPDATE [dbo].[Loss_And_Damages]
                SET [status] = 'pending'
                WHERE [status] IS NULL OR LTRIM(RTRIM([status])) = '';
            END
            """
        );

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID(N'[dbo].[Loss_And_Damages]', N'U') IS NOT NULL
               AND COL_LENGTH(N'[dbo].[Loss_And_Damages]', 'equipment_id') IS NOT NULL
               AND OBJECT_ID(N'[dbo].[Equipments]', N'U') IS NOT NULL
               AND NOT EXISTS (
                   SELECT 1
                   FROM sys.foreign_keys
                   WHERE name = 'FK_LossAndDamages_Equipment'
               )
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM sys.foreign_keys
                    WHERE name = 'FK_LossAndDamages_Equipment'
                )
                BEGIN
                    ALTER TABLE [dbo].[Loss_And_Damages] WITH CHECK
                        ADD CONSTRAINT [FK_LossAndDamages_Equipment]
                        FOREIGN KEY ([equipment_id]) REFERENCES [dbo].[Equipments]([id]);
                END
            END
            """
        );

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID(N'[dbo].[Loss_And_Damages]', N'U') IS NOT NULL
               AND COL_LENGTH(N'[dbo].[Loss_And_Damages]', 'status') IS NOT NULL
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM sys.check_constraints
                    WHERE name = 'CK_LossAndDamages_Status'
                )
                BEGIN
                    ALTER TABLE [dbo].[Loss_And_Damages] WITH NOCHECK
                        ADD CONSTRAINT [CK_LossAndDamages_Status]
                        CHECK ([status] IN ('pending', 'confirmed', 'cancelled'));
                END

                IF EXISTS (
                    SELECT 1
                    FROM sys.columns
                    WHERE object_id = OBJECT_ID(N'[dbo].[Loss_And_Damages]')
                      AND name = 'status'
                      AND is_nullable = 1
                )
                BEGIN
                    ALTER TABLE [dbo].[Loss_And_Damages]
                        ALTER COLUMN [status] NVARCHAR(20) NOT NULL;
                END
            END
            """
        );
    }

    public static async Task EnsureContactMessageSchemaAsync(IServiceProvider services)
    {
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID(N'[dbo].[ContactMessages]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[ContactMessages](
                    [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    [full_name] NVARCHAR(100) NOT NULL,
                    [email] NVARCHAR(100) NOT NULL,
                    [subject] NVARCHAR(200) NOT NULL,
                    [message] NVARCHAR(MAX) NOT NULL,
                    [created_at] DATETIME2 NOT NULL DEFAULT(SYSDATETIME()),
                    [is_read] BIT NOT NULL DEFAULT(0)
                );
            END
            IF OBJECT_ID(N'[dbo].[ContactMessages]', N'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH(N'[dbo].[ContactMessages]', 'reply_message') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[ContactMessages] ADD [reply_message] NVARCHAR(MAX) NULL;
                END

                IF COL_LENGTH(N'[dbo].[ContactMessages]', 'replied_at') IS NULL
                BEGIN
                    ALTER TABLE [dbo].[ContactMessages] ADD [replied_at] DATETIME2 NULL;
                END
            END
            """
        );
    }
}
