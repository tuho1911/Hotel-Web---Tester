import React from 'react';
import dayjs from 'dayjs';
import { BookingResponseDto, InvoiceResponseDto } from '../../services/bookingApi';
import { RoomDto } from '../../services/adminApi';

interface HotelInvoicePrintProps {
  booking: BookingResponseDto;
  invoice: InvoiceResponseDto;
  rooms: RoomDto[];
  cashierName?: string | null;
  damages?: any[];
  services?: any[];
}

const formatMoney = (v?: number | null) =>
  v !== undefined && v !== null ? v.toLocaleString('vi-VN') + ' ₫' : '0 ₫';

const HotelInvoicePrint: React.FC<HotelInvoicePrintProps> = ({ 
  booking, 
  invoice, 
  rooms, 
  cashierName, 
  damages = [], 
  services = [] 
}) => {
  const hotelInfo = {
    name: 'KANT LUXURY HOTEL',
    address: '123 Đường Luxury, Quận 1, TP. Hồ Chí Minh',
    phone: '+84 123 456 789',
    email: 'contact@kant-hotel.com',
    website: 'www.kant-hotel.com'
  };

  return (
    <div id="hotel-invoice-print" className="print-only">
      <style>{`
        @media screen {
          #hotel-invoice-print {
            display: none !important;
          }
        }

        @media print {
          body * { visibility: hidden; }
          #hotel-invoice-print, #hotel-invoice-print * { visibility: visible; }
          #hotel-invoice-print {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            min-height: 297mm;
            padding: 20mm;
            background: white;
            color: black;
            font-family: 'Times New Roman', Times, serif;
          }
          .no-print { display: none !important; }
        }
        
        #hotel-invoice-print {
          background: #fff;
          color: #333;
          line-height: 1.5;
        }

        .invoice-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid #C6A96B;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }

        .hotel-brand h1 {
          color: #C6A96B;
          font-size: 28px;
          margin: 0;
          letter-spacing: 2px;
          font-weight: 900;
        }

        .invoice-title {
          text-align: right;
        }

        .invoice-title h2 {
          margin: 0;
          font-size: 24px;
          color: #333;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-bottom: 40px;
        }

        .info-section h3 {
          font-size: 14px;
          text-transform: uppercase;
          color: #888;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
          margin-bottom: 10px;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          font-size: 14px;
        }

        .info-label { font-weight: 600; color: #555; }

        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }

        .invoice-table th {
          background: #f9f6f0;
          color: #A6894B;
          text-align: left;
          padding: 12px;
          border-bottom: 1px solid #C6A96B;
          font-size: 13px;
          text-transform: uppercase;
        }

        .invoice-table td {
          padding: 12px;
          border-bottom: 1px solid #eee;
          font-size: 14px;
        }

        .total-section {
          margin-left: auto;
          width: 300px;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 14px;
        }

        .total-row.grand-total {
          border-top: 2px solid #C6A96B;
          margin-top: 10px;
          padding-top: 15px;
          font-weight: 900;
          font-size: 18px;
          color: #C6A96B;
        }

        .invoice-footer {
          margin-top: 60px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          text-align: center;
        }

        .signature-box {
          height: 100px;
        }

        .terms {
          margin-top: 50px;
          font-size: 11px;
          color: #888;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
      `}</style>

      {/* Header */}
      <div className="invoice-header">
        <div className="hotel-brand">
          <h1>{hotelInfo.name}</h1>
          <p style={{ margin: '5px 0', fontSize: '13px' }}>{hotelInfo.address}</p>
          <p style={{ margin: 0, fontSize: '13px' }}>SĐT: {hotelInfo.phone} | Email: {hotelInfo.email}</p>
        </div>
        <div className="invoice-title">
          <h2>HÓA ĐƠN GIA TRỊ GIA TĂNG</h2>
          <p style={{ margin: '5px 0' }}>Mã HĐ: <strong>#{invoice.id}</strong></p>
          <p style={{ margin: 0 }}>Ngày in: {dayjs().format('DD/MM/YYYY HH:mm')}</p>
        </div>
      </div>

      {/* Info Grid */}
      <div className="info-grid">
        <div className="info-section">
          <h3>Thông tin khách hàng</h3>
          <div className="info-item"><span className="info-label">Họ tên:</span> <span>{booking.guestName}</span></div>
          <div className="info-item"><span className="info-label">Số điện thoại:</span> <span>{booking.guestPhone}</span></div>
          <div className="info-item"><span className="info-label">Email:</span> <span>{booking.guestEmail}</span></div>
          <div className="info-item"><span className="info-label">Mã Booking:</span> <span>{booking.bookingCode}</span></div>
        </div>
        <div className="info-section">
          <h3>Chi tiết lưu trú</h3>
          <div className="info-item"><span className="info-label">Ngày đến:</span> <span>{dayjs(booking.details?.[0]?.checkInDate).format('DD/MM/YYYY')}</span></div>
          <div className="info-item"><span className="info-label">Ngày đi:</span> <span>{dayjs(booking.details?.[0]?.checkOutDate).format('DD/MM/YYYY')}</span></div>
          <div className="info-item">
            <span className="info-label">Trạng thái:</span> 
            <span>
              {invoice.status === 'Paid' ? 'ĐÃ THANH TOÁN' : 
               invoice.status === 'PartiallyPaid' ? 'THANH TOÁN MỘT PHẦN' : 
               invoice.status === 'Cancelled' ? 'ĐÃ HỦY' : 'CHƯA THANH TOÁN'}
            </span>
          </div>
          <div className="info-item"><span className="info-label">Nhân viên lập:</span> <span>{cashierName || 'Admin'}</span></div>
        </div>
      </div>

      {/* Main Table */}
      <table className="invoice-table">
        <thead>
          <tr>
            <th>Mô tả</th>
            <th style={{ textAlign: 'center' }}>Số lượng</th>
            <th style={{ textAlign: 'right' }}>Đơn giá</th>
            <th style={{ textAlign: 'right' }}>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {/* Room Charges */}
          {booking.details?.map((d, i) => {
            const nights = Math.max(1, Math.round((new Date(d.checkOutDate).getTime() - new Date(d.checkInDate).getTime()) / 86_400_000));
            const roomNum = rooms.find(r => r.id === d.roomId)?.roomNumber || d.roomId;
            return (
              <tr key={`room-${i}`}>
                <td>Tiền phòng - Phòng {roomNum} ({dayjs(d.checkInDate).format('DD/MM')} - {dayjs(d.checkOutDate).format('DD/MM')})</td>
                <td style={{ textAlign: 'center' }}>{nights} Đêm</td>
                <td style={{ textAlign: 'right' }}>{formatMoney(d.pricePerNight)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(d.pricePerNight * nights)}</td>
              </tr>
            );
          })}

          {/* Service Charges */}
          {services.map((order, i) => 
            order.details?.map((item: any, j: number) => (
              <tr key={`svc-${i}-${j}`}>
                <td>Dịch vụ/Minibar: {item.serviceName}</td>
                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>{formatMoney(item.unitPrice)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(item.lineTotal)}</td>
              </tr>
            ))
          )}

          {/* Damage Charges */}
          {damages.map((d, i) => (
            <tr key={`dmg-${i}`} style={{ color: '#dc2626' }}>
              <td>Bồi thường: {d.equipmentName || 'Vật dụng'} ({d.roomNumber || 'N/A'}) - {d.description || 'Hư hỏng'}</td>
              <td style={{ textAlign: 'center' }}>{d.quantity}</td>
              <td style={{ textAlign: 'right' }}>{formatMoney(d.penaltyAmount)}</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(d.penaltyAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="total-section">
        <div className="total-row">
          <span>Tiền phòng:</span>
          <span>{formatMoney(invoice.totalRoomAmount)}</span>
        </div>
        <div className="total-row">
          <span>Tiền dịch vụ:</span>
          <span>{formatMoney(invoice.totalServiceAmount)}</span>
        </div>
        {invoice.discountAmount > 0 && (
          <div className="total-row">
            <span>Giảm giá (Voucher):</span>
            <span style={{ color: '#16a34a' }}>-{formatMoney(invoice.discountAmount)}</span>
          </div>
        )}
        <div className="total-row">
          <span>Tổng Cộng (Chưa Thuế):</span>
          <span>{formatMoney(invoice.totalRoomAmount + invoice.totalServiceAmount - invoice.discountAmount)}</span>
        </div>
        <div className="total-row">
          <span>Thuế (10% VAT):</span>
          <span>{formatMoney(invoice.taxAmount)}</span>
        </div>
        <div className="total-row grand-total" style={{ color: '#A6894B' }}>
          <span>TỔNG THANH TOÁN:</span>
          <span>{formatMoney(invoice.finalTotal)}</span>
        </div>
        {invoice.depositPaidAmount > 0 && (
          <div className="total-row" style={{ fontSize: '14px' }}>
            <span>Đã cọc:</span>
            <span style={{ color: '#16a34a' }}>-{formatMoney(invoice.depositPaidAmount)}</span>
          </div>
        )}
        {invoice.payments?.length > 0 && (
          <div className="total-row" style={{ fontSize: '14px' }}>
            <span>Đã thanh toán thêm:</span>
            <span style={{ color: '#16a34a' }}>-{formatMoney(invoice.payments.reduce((sum, p) => sum + p.amountPaid, 0))}</span>
          </div>
        )}
        <div className="total-row grand-total" style={{ borderTop: '1px dashed #ccc', marginTop: '5px', paddingTop: '10px', color: '#dc2626' }}>
          <span>CẦN THU THÊM:</span>
          <span>{formatMoney(Math.max(0, invoice.finalTotal - (invoice.depositPaidAmount || 0) - (invoice.payments?.reduce((sum, p) => sum + p.amountPaid, 0) || 0)))}</span>
        </div>
      </div>

      {/* Footer / Signatures */}
      <div className="invoice-footer">
        <div>
          <p style={{ fontWeight: 600 }}>KHÁCH HÀNG</p>
          <p style={{ fontSize: '11px', color: '#888' }}>(Ký và ghi rõ họ tên)</p>
          <div className="signature-box"></div>
          <p style={{ fontWeight: 600 }}>{booking.guestName}</p>
        </div>
        <div>
          <p style={{ fontWeight: 600 }}>NHÂN VIÊN LỄ TÂN</p>
          <p style={{ fontSize: '11px', color: '#888' }}>(Ký và ghi rõ họ tên)</p>
          <div className="signature-box"></div>
          <p style={{ fontWeight: 600 }}>{cashierName || 'Admin'}</p>
        </div>
      </div>

      {/* Terms */}
      <div className="terms">
        <p><strong>Ghi chú:</strong></p>
        <ul>
          <li>Hóa đơn này chỉ có giá trị thanh toán khi có đủ chữ ký của hai bên.</li>
          <li>Quý khách vui lòng kiểm tra kỹ các khoản phí trước khi rời khỏi quầy lễ tân.</li>
          <li>Cảm ơn Quý khách đã lựa chọn dịch vụ của {hotelInfo.name}. Hẹn gặp lại Quý khách!</li>
        </ul>
      </div>
    </div>
  );
};

export default HotelInvoicePrint;
