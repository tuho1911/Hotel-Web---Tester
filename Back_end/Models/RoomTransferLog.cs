using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagementAPI.Models
{
    [Table("Room_Transfer_Logs")]
    public class RoomTransferLog
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("booking_detail_id")]
        public int BookingDetailId { get; set; }

        [Column("old_room_id")]
        public int? OldRoomId { get; set; }

        [Column("new_room_id")]
        public int NewRoomId { get; set; }

        [Column("transfer_reason")]
        public string? TransferReason { get; set; }

        [Column("transferred_at")]
        public DateTime? TransferredAt { get; set; } = DateTime.UtcNow;

        [Column("transferred_by")]
        public int? TransferredBy { get; set; }

        // Navigation properties
        [ForeignKey("BookingDetailId")]
        public BookingDetail? BookingDetail { get; set; }

        [ForeignKey("OldRoomId")]
        public Room? OldRoom { get; set; }

        [ForeignKey("NewRoomId")]
        public Room? NewRoom { get; set; }

        [ForeignKey("TransferredBy")]
        public User? Staff { get; set; }
    }
}
