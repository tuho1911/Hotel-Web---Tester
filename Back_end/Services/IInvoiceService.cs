using System.Threading.Tasks;
using HotelManagementAPI.DTOs;

namespace HotelManagementAPI.Services
{
    public interface IInvoiceService
    {
        Task<InvoiceResponseDto?> GetInvoiceByBookingIdAsync(int bookingId);
        Task<InvoiceResponseDto> CreateInvoiceAsync(int bookingId);
        Task<PaymentResponseDto> AddPaymentAsync(int invoiceId, AddPaymentDto paymentDto);
        Task RecalculateInvoiceAsync(int bookingId);
        Task<InvoiceResponseDto?> MarkInvoicePaidAsync(int bookingId, string? transactionCode = null);
    }
}
