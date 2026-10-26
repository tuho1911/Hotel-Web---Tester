using System.Text.Json.Serialization;

namespace HotelManagementAPI.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum OrderServiceStatus
{
    Pending = 0,
    Delivered = 1,
    Cancelled = 2
}

