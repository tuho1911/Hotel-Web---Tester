import axiosClient from '../api/axiosClient';

export interface MoMoPaymentResponse {
  payUrl: string;
  deeplink?: string;
  qrCodeUrl?: string;
  orderId: string;
  requestId: string;
  invoiceId: number;
  amount: number;
}

/**
 * Tạo yêu cầu thanh toán MoMo cho hóa đơn.
 * Backend sẽ gọi MoMo API và trả về payUrl.
 * @param invoiceId - ID hóa đơn cần thanh toán
 * @param amount - Số tiền thanh toán (VND). Nếu không truyền, dùng số tiền còn lại.
 * @param orderInfo - Ghi chú đơn hàng
 */
export const createMoMoPayment = async (
  invoiceId: number,
  amount?: number,
  orderInfo = 'Thanh toán hóa đơn khách sạn Kant'
): Promise<MoMoPaymentResponse> => {
  const body: { orderInfo: string; amount?: number } = { orderInfo };
  if (amount !== undefined && amount > 0) {
    body.amount = amount;
  }
  return (await axiosClient.post(
    `/api/invoices/${invoiceId}/momo-create`,
    body
  )) as unknown as MoMoPaymentResponse;
};

/**
 * Đọc kết quả thanh toán từ URL params sau khi MoMo redirect về.
 * ReturnUrl: /admin/invoices?payment_status=success&invoiceId=X
 */
export const parseMoMoReturnParams = () => {
  const params = new URLSearchParams(window.location.search);
  const rawResultCode = params.get('resultCode');
  const resultCode = rawResultCode ? parseInt(rawResultCode, 10) : null;
  const rawPaymentStatus = params.get('payment_status');

  return {
    paymentStatus:
      resultCode !== null
        ? (resultCode === 0 ? 'success' : 'failed')
        : rawPaymentStatus,
    invoiceId: params.get('invoiceId')
      ? parseInt(params.get('invoiceId')!, 10)
      : null,
    resultCode,
    message: params.get('message'),
  };
};

/**
 * Xoá MoMo params khỏi URL mà không reload trang.
 */
export const clearMoMoReturnParams = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete('payment_status');
  url.searchParams.delete('invoiceId');
  url.searchParams.delete('resultCode');
  url.searchParams.delete('message');
  window.history.replaceState({}, '', url.toString());
};
