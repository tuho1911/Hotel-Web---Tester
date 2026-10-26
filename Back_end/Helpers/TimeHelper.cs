using System;

namespace HotelManagementAPI.Helpers
{
    public static class TimeHelper
    {
        public static DateTime GetVietnamTime()
        {
            var utcNow = DateTime.UtcNow;
            var vietnamTimeZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
            
            // Note: "SE Asia Standard Time" is for Windows. 
            // On Linux/Docker, it might need "Asia/Ho_Chi_Minh".
            // A safer cross-platform way for .NET:
            try 
            {
                return TimeZoneInfo.ConvertTimeFromUtc(utcNow, vietnamTimeZone);
            }
            catch (TimeZoneNotFoundException)
            {
                // Fallback for Linux/macOS
                return TimeZoneInfo.ConvertTimeFromUtc(utcNow, TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh"));
            }
        }

        public static DateTime Now => GetVietnamTime();
    }
}
