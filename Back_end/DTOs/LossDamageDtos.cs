namespace HotelManagementAPI.DTOs;

public class CreateLossDamageDto
{
    public int? EquipmentId { get; set; }
    public int? BookingDetailId { get; set; }
    public int? RoomInventoryId { get; set; }
    public int Quantity { get; set; }
    public decimal PenaltyAmount { get; set; }
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
}

public class UpdateLossDamageDto
{
    public int? EquipmentId { get; set; }
    public int? BookingDetailId { get; set; }
    public int? RoomInventoryId { get; set; }
    public int Quantity { get; set; }
    public decimal PenaltyAmount { get; set; }
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
}

public record LossDamageResponseDto(
    int Id,
    int? BookingDetailId,
    int? RoomInventoryId,
    int Quantity,
    decimal PenaltyAmount,
    string? Description,
    string? ImageUrl,
    DateTime? CreatedAt,
    string? RoomNumber,
    string? EquipmentName
);
