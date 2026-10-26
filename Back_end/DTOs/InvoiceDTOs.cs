using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;
using HotelManagementAPI.Enums;

namespace HotelManagementAPI.DTOs
{
    public class InvoiceResponseDto
    {
        public int Id { get; set; }
        public int? BookingId { get; set; }
        public decimal TotalRoomAmount { get; set; }
        public decimal TotalServiceAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal FinalTotal { get; set; }
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public InvoiceStatus Status { get; set; }
        public List<PaymentResponseDto> Payments { get; set; } = new List<PaymentResponseDto>();
        public List<OrderServiceResponseDto> ServiceOrders { get; set; } = new List<OrderServiceResponseDto>();
        public List<LossDamageResponseDto> LossDamages { get; set; } = new List<LossDamageResponseDto>();
        public decimal DepositAmount { get; set; }
        public decimal DepositPaidAmount { get; set; }
        public decimal DepositRemainingAmount { get; set; }
        public string DepositStatus { get; set; } = "NotRequired";
    }

    public class PaymentResponseDto
    {
        public int Id { get; set; }
        public string? PaymentMethod { get; set; }
        public decimal AmountPaid { get; set; }
        public string? TransactionCode { get; set; }
        public DateTime? PaymentDate { get; set; }
    }

    public class AddPaymentDto
    {
        public string PaymentMethod { get; set; } = string.Empty;
        public decimal AmountPaid { get; set; }
        public string TransactionCode { get; set; } = string.Empty;
    }

    // ── MoMo DTOs ──────────────────────────────────────────

    public class MoMoCreatePaymentResponseDto
    {
        public string PayUrl { get; set; } = string.Empty;
        public string? Deeplink { get; set; }
        public string? QrCodeUrl { get; set; }
        public string OrderId { get; set; } = string.Empty;
        public string RequestId { get; set; } = string.Empty;
        public int InvoiceId { get; set; }
        public long Amount { get; set; }
    }

    /// <summary>
    /// IPN (Instant Payment Notification) payload từ MoMo server gửi về NotifyUrl
    /// </summary>
    public class MoMoNotifyDto
    {
        public string PartnerCode { get; set; } = string.Empty;
        public string OrderId { get; set; } = string.Empty;
        public string RequestId { get; set; } = string.Empty;
        public long Amount { get; set; }
        public string OrderInfo { get; set; } = string.Empty;
        public string OrderType { get; set; } = string.Empty;
        public long TransId { get; set; }
        public int ResultCode { get; set; }
        public string Message { get; set; } = string.Empty;
        public string PayType { get; set; } = string.Empty;
        public long ResponseTime { get; set; }
        public string ExtraData { get; set; } = string.Empty;
        public string Signature { get; set; } = string.Empty;
    }

    public class MoMoCreateRequestDto
    {
        /// <summary>Số tiền cần thanh toán (VND). Nếu null, hệ thống dùng số tiền còn lại của hóa đơn.</summary>
        public decimal? Amount { get; set; }
        public string OrderInfo { get; set; } = "Thanh toán hóa đơn khách sạn Kant";
    }
}
