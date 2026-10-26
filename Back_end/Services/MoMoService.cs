using System;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using HotelManagementAPI.Configurations;
using HotelManagementAPI.DTOs;
using Microsoft.Extensions.Options;

namespace HotelManagementAPI.Services
{
    public interface IMoMoService
    {
        Task<MoMoCreatePaymentResponseDto> CreatePaymentAsync(int invoiceId, decimal amount, string orderInfo);
        bool VerifyIpnSignature(MoMoNotifyDto notify);
    }

    public class MoMoService : IMoMoService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly MoMoApiOptions _options;

        public MoMoService(IOptions<MoMoApiOptions> options, IHttpClientFactory httpClientFactory)
        {
            _options = options.Value;
            _httpClientFactory = httpClientFactory;
        }

        public async Task<MoMoCreatePaymentResponseDto> CreatePaymentAsync(int invoiceId, decimal amount, string orderInfo)
        {
            var orderId = $"INVOICE-{invoiceId}-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";
            var requestId = Guid.NewGuid().ToString("N");
            var amountLong = (long)Math.Round(amount);
            var extraData = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{{\"invoiceId\":{invoiceId}}}"));
            var returnUrl = AppendQueryParameter(_options.ReturnUrl, "invoiceId", invoiceId.ToString());

            var rawSignature =
                $"accessKey={_options.AccessKey}" +
                $"&amount={amountLong}" +
                $"&extraData={extraData}" +
                $"&ipnUrl={_options.NotifyUrl}" +
                $"&orderId={orderId}" +
                $"&orderInfo={orderInfo}" +
                $"&partnerCode={_options.PartnerCode}" +
                $"&redirectUrl={returnUrl}" +
                $"&requestId={requestId}" +
                $"&requestType={_options.RequestType}";

            var signature = ComputeHmacSha256(rawSignature, _options.SecretKey);

            var requestBody = new
            {
                partnerCode = _options.PartnerCode,
                partnerName = "Kant Hotel",
                storeId = "KantHotel",
                requestId,
                amount = amountLong,
                orderId,
                orderInfo,
                redirectUrl = returnUrl,
                ipnUrl = _options.NotifyUrl,
                lang = "vi",
                extraData,
                requestType = _options.RequestType,
                signature
            };

            var json = JsonSerializer.Serialize(requestBody);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");

            var client = _httpClientFactory.CreateClient("MoMo");
            var response = await client.PostAsync(_options.MomoApiUrl, content);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new Exception($"MoMo HTTP Error [{(int)response.StatusCode}]: {responseBody}");
            }

            using var doc = JsonDocument.Parse(responseBody);
            var root = doc.RootElement;

            var resultCode = root.TryGetProperty("resultCode", out var rc) ? rc.GetInt32() : -1;
            var message = root.TryGetProperty("message", out var msg) ? msg.GetString() : "Unknown error";
            var payUrl = root.TryGetProperty("payUrl", out var pu) ? pu.GetString() : null;
            var deeplink = root.TryGetProperty("deeplink", out var dl) ? dl.GetString() : null;
            var qrCodeUrl = root.TryGetProperty("qrCodeUrl", out var qr) ? qr.GetString() : null;

            if (resultCode != 0)
            {
                throw new Exception($"MoMo Error [{resultCode}]: {message}");
            }

            return new MoMoCreatePaymentResponseDto
            {
                PayUrl = payUrl ?? string.Empty,
                Deeplink = deeplink,
                QrCodeUrl = qrCodeUrl,
                OrderId = orderId,
                RequestId = requestId,
                InvoiceId = invoiceId,
                Amount = amountLong
            };
        }

        public bool VerifyIpnSignature(MoMoNotifyDto notify)
        {
            var rawSignature =
                $"accessKey={_options.AccessKey}" +
                $"&amount={notify.Amount}" +
                $"&extraData={notify.ExtraData}" +
                $"&message={notify.Message}" +
                $"&orderId={notify.OrderId}" +
                $"&orderInfo={notify.OrderInfo}" +
                $"&orderType={notify.OrderType}" +
                $"&partnerCode={notify.PartnerCode}" +
                $"&payType={notify.PayType}" +
                $"&requestId={notify.RequestId}" +
                $"&responseTime={notify.ResponseTime}" +
                $"&resultCode={notify.ResultCode}" +
                $"&transId={notify.TransId}";

            var expectedSig = ComputeHmacSha256(rawSignature, _options.SecretKey);
            return string.Equals(expectedSig, notify.Signature, StringComparison.OrdinalIgnoreCase);
        }

        private static string ComputeHmacSha256(string message, string secretKey)
        {
            var keyBytes = Encoding.UTF8.GetBytes(secretKey);
            var msgBytes = Encoding.UTF8.GetBytes(message);
            using var hmac = new HMACSHA256(keyBytes);
            var hashBytes = hmac.ComputeHash(msgBytes);
            return BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
        }

        private static string AppendQueryParameter(string baseUrl, string key, string value)
        {
            if (string.IsNullOrWhiteSpace(baseUrl))
            {
                return string.Empty;
            }

            var separator = baseUrl.Contains('?') ? "&" : "?";
            return $"{baseUrl}{separator}{key}={Uri.EscapeDataString(value)}";
        }
    }
}
