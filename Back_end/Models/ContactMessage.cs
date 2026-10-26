using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelManagementAPI.Models
{
    [Table("ContactMessages")]
    public class ContactMessage
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        [Column("full_name")]
        public required string FullName { get; set; }

        [Required]
        [EmailAddress]
        [MaxLength(100)]
        [Column("email")]
        public required string Email { get; set; }

        [Required]
        [MaxLength(200)]
        [Column("subject")]
        public required string Subject { get; set; }

        [Required]
        [Column("message")]
        public required string Message { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [Column("is_read")]
        public bool IsRead { get; set; } = false;

        [Column("reply_message")]
        public string? ReplyMessage { get; set; }

        [Column("replied_at")]
        public DateTime? RepliedAt { get; set; }
    }
}
