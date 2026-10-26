using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagementAPI.Models
{
    [Table("Room_Cleanings")]
    public class RoomCleaning
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("room_id")]
        public int RoomId { get; set; }

        [Column("staff_id")]
        public int? StaffId { get; set; }

        [Column("assigned_at")]
        public DateTime? AssignedAt { get; set; } = DateTime.UtcNow;

        [Column("started_at")]
        public DateTime? StartedAt { get; set; }

        [Column("completed_at")]
        public DateTime? CompletedAt { get; set; }

        [Column("status")]
        [StringLength(50)]
        public string? Status { get; set; } = "Pending";

        [Column("notes")]
        public string? Notes { get; set; }

        // Navigation properties
        [ForeignKey("RoomId")]
        public Room? Room { get; set; }

        [ForeignKey("StaffId")]
        public User? Staff { get; set; }
    }
}
