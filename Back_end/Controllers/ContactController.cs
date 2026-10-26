using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HotelManagementAPI.Data;
using HotelManagementAPI.Models;
using HotelManagementAPI.Services;
using HotelManagementAPI.Helpers;
using HotelManagementAPI.Middleware;
using Microsoft.AspNetCore.Authorization;

namespace HotelManagementAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [RequirePermission("MANAGE_CONTENT")]
    public class ContactController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ContactController(AppDbContext context)
        {
            _context = context;
        }

        // POST: api/Contact
        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> PostContactMessage([FromBody] ContactMessage message)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            message.CreatedAt = TimeHelper.Now;
            message.IsRead = false;

            _context.ContactMessages.Add(message);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Message sent successfully!" });
        }

        // GET: api/Contact (Admin only - for simplicity I'll not add auth yet but usually it should have)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ContactMessage>>> GetContactMessages()
        {
            return await _context.ContactMessages.OrderByDescending(m => m.CreatedAt).ToListAsync();
        }

        // PATCH: api/Contact/5/read
        [HttpPatch("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var message = await _context.ContactMessages.FindAsync(id);
            if (message == null) return NotFound();

            message.IsRead = true;
            await _context.SaveChangesAsync();

            return NoContent();
        }
        // POST: api/Contact/{id}/reply
        [HttpPost("{id}/reply")]
        public async Task<IActionResult> ReplyToMessage(int id, [FromBody] string replyContent, [FromServices] IEmailService emailService)
        {
            var message = await _context.ContactMessages.FindAsync(id);
            if (message == null) return NotFound();

            message.ReplyMessage = replyContent;
            message.RepliedAt = TimeHelper.Now;
            message.IsRead = true;

            await _context.SaveChangesAsync();

            // Send email notification
            try
            {
                string emailBody = $@"
                    <h2>Xin chào {message.FullName},</h2>
                    <p>Cảm ơn bạn đã liên hệ với chúng tôi về chủ đề: <strong>{message.Subject}</strong></p>
                    <p>Đây là phản hồi từ chúng tôi:</p>
                    <div style='padding: 15px; background: #f9f9f9; border-left: 4px solid #b1976b; margin: 20px 0;'>
                        {replyContent}
                    </div>
                    <p>Trân trọng,<br/>Đội ngũ KANT Luxury Hotel</p>";

                await emailService.SendEmailAsync(message.Email, $"Phản hồi từ KANT: {message.Subject}", emailBody);
            }
            catch (Exception ex)
            {
                // Log error but return success for DB update
                Console.WriteLine($"Failed to send reply email: {ex.Message}");
            }

            return Ok(new { message = "Reply sent successfully!" });
        }
    }
}
