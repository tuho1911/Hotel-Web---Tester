// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  Card as AntCard,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from 'antd';
import {
  BanknoteIcon,
  CreditCard,
  FileText,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Ticket,
} from 'lucide-react';
import dayjs from 'dayjs';
import { bookingApi, BookingResponseDto, InvoiceResponseDto } from '../../services/bookingApi';
import { adminApi, RoomDto } from '../../services/adminApi';
import { createMoMoPayment, parseMoMoReturnParams, clearMoMoReturnParams } from '../../services/momoApi';
import HotelInvoicePrint from '../../components/print/HotelInvoicePrint';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
const { Title, Paragraph, Text } = Typography;

const INVOICE_STATUS_COLOR: Record<string, string> = {
  Unpaid: 'gold',
  PartiallyPaid: 'blue',
  Paid: 'green',
  Cancelled: 'red',
};

const INVOICE_STATUS_LABEL: Record<string, string> = {
  Unpaid: 'Chưa thanh toán',
  PartiallyPaid: 'Thanh toán một phần',
  Paid: 'Đã thanh toán',
  Cancelled: 'Đã hủy',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  Cash: 'Tiền mặt',
  BankTransfer: 'Chuyển khoản',
  MoMo: 'MoMo',
};

const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS);

const MOMO_LOGO = 'https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-MoMo-Square.png';

const formatMoney = (v?: number | null) =>
  v !== undefined && v !== null ? v.toLocaleString('vi-VN') + ' ₫' : '—';

const nightsBetween = (from: string, to: string) =>
  Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000));

const generateTxnCode = () => {
  const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `TXN-${dayjs().format('YYYYMMDD')}-${rand}`;
};

interface PrintInvoiceProps {
  booking: BookingResponseDto;
  invoice: InvoiceResponseDto;
  rooms: RoomDto[];
  cashierName?: string | null;
  damages?: any[];
  services?: any[];
}

const PrintInvoice: React.FC<PrintInvoiceProps> = ({ booking, invoice, rooms, cashierName, damages, services }) => (
  <HotelInvoicePrint
    booking={booking}
    invoice={invoice}
    rooms={rooms}
    cashierName={cashierName}
    damages={damages}
    services={services}
  />
);

const InvoiceManagementPage: React.FC = () => {
  const { message } = App.useApp();
  const cashierName = useSelector((s: RootState) => s.auth.user?.fullName || s.auth.user?.name || null);
  const [bookings, setBookings] = useState<BookingResponseDto[]>([]);
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [hasInvoiceOnly, setHasInvoiceOnly] = useState(true);

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const [selectedBooking, setSelectedBooking] = useState<BookingResponseDto | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceResponseDto | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceDamages, setInvoiceDamages] = useState<any[]>([]);
  const [invoiceServices, setInvoiceServices] = useState<any[]>([]);

  const [paymentForm] = Form.useForm();
  const [momoLoading, setMomoLoading] = useState(false);

  // ── Xử lý redirect từ MoMo (sau khi khách thanh toán) ──
  useEffect(() => {
    const { paymentStatus, invoiceId: retInvoiceId, message: momoMessage } = parseMoMoReturnParams();
    if (paymentStatus === 'success') {
      message.success({
        content: '✅ Thanh toán MoMo thành công! Đang cập nhật hóa đơn...',
        duration: 5,
      });
      clearMoMoReturnParams();
      // Reload data sau 2s để IPN có thời gian xử lý
      setTimeout(() => {
        loadData();
        // Nếu đang mở invoice tương ứng thì reload lại
        if (retInvoiceId && selectedBooking) {
          openInvoice(selectedBooking);
        }
      }, 2000);
    } else if (paymentStatus === 'failed') {
      message.error({
        content: momoMessage || 'Thanh toán MoMo chưa hoàn tất hoặc đã thất bại.',
        duration: 5,
      });
      clearMoMoReturnParams();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bk, rm] = await Promise.all([bookingApi.getAll(), adminApi.getRooms()]);
      setBookings(bk);
      setRooms(rm);
    } catch {
      message.error('Không thể tải dữ liệu hóa đơn. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (paymentOpen) {
      paymentForm.setFieldsValue({ transactionCode: generateTxnCode() });
    }
  }, [paymentOpen]);

  const stats = useMemo(() => {
    const total = bookings.length;
    const withInvoice = bookings.filter(b => Boolean(b.invoiceId)).length;
    const checkedOut = bookings.filter(b => b.status === 'CheckedOut').length;
    return { total, withInvoice, checkedOut };
  }, [bookings]);

  const visibleRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return bookings
      .filter((b) => (hasInvoiceOnly ? Boolean(b.invoiceId) : true))
      .filter((b) => {
        if (!term) return true;
        return (
          b.bookingCode?.toLowerCase().includes(term) ||
          b.guestName?.toLowerCase().includes(term) ||
          b.guestPhone?.includes(term) ||
          b.guestEmail?.toLowerCase().includes(term)
        );
      });
  }, [bookings, hasInvoiceOnly, searchTerm]);

  const openInvoice = async (booking: BookingResponseDto) => {
    setSelectedBooking(booking);
    setInvoiceOpen(true);
    setInvoiceLoading(true);
    setSelectedInvoice(null);
    setInvoiceDamages([]);
    setInvoiceServices([]);
    try {
      const inv = await bookingApi.getInvoiceByBookingId(booking.id);
      setSelectedInvoice(inv);
      
      // Sử dụng dữ liệu gộp từ backend nếu có
      if (inv.serviceOrders) {
        setInvoiceServices(inv.serviceOrders);
      }
      if (inv.lossDamages) {
        setInvoiceDamages(inv.lossDamages);
      }
    } catch {
      setSelectedInvoice(null);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const createInvoice = async () => {
    if (!selectedBooking) return;
    try {
      const inv = await bookingApi.createInvoice(selectedBooking.id);
      setSelectedInvoice(inv);
      if (inv.serviceOrders) {
        setInvoiceServices(inv.serviceOrders);
      }
      if (inv.lossDamages) {
        setInvoiceDamages(inv.lossDamages);
      }
      message.success('Tạo hóa đơn thành công.');
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể tạo hóa đơn. Vui lòng kiểm tra lại thông tin booking.');
    }
  };

  const submitPayment = async (values: any) => {
    if (!selectedInvoice) return;

    // ── Nếu chọn MoMo → tạo link và mở tab mới ──
    if (values.paymentMethod === 'MoMo') {
      await handleMoMoPayment();
      setPaymentOpen(false);
      paymentForm.resetFields();
      return;
    }

    try {
      // ── Mẹo cho Demo: Nếu chọn MoMo và nhập mã đặc biệt ──
      if (values.paymentMethod === 'MoMo' && values.transactionCode === 'DEMO-SUCCESS') {
        const response = await fetch(`http://localhost:5206/api/MoMoPayment/simulate-momo-success?invoiceId=${selectedInvoice.id}`);
        if (response.ok) {
          message.success('✅ [DEMO] Hệ thống đã xác nhận thanh toán MoMo thành công!');
          loadData();
          if (selectedBooking) openInvoice(selectedBooking);
          setPaymentOpen(false);
          paymentForm.resetFields();
          return;
        }
      }

      await bookingApi.addPayment(selectedInvoice.id, {
        paymentMethod: values.paymentMethod,
        amountPaid: values.amountPaid,
        transactionCode: values.transactionCode || undefined,
      });
      message.success('Đã ghi nhận thanh toán thành công.');
      paymentForm.resetFields();
      setPaymentOpen(false);
      if (selectedBooking) {
        const inv = await bookingApi.getInvoiceByBookingId(selectedBooking.id);
        setSelectedInvoice(inv);
        if (inv.serviceOrders) setInvoiceServices(inv.serviceOrders);
        if (inv.lossDamages) setInvoiceDamages(inv.lossDamages);
      }
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể ghi nhận thanh toán. Vui lòng thử lại.');
    }
  };

  // ── Xử lý tạo thanh toán MoMo ──
  const handleMoMoPayment = async (customAmount?: number) => {
    if (!selectedInvoice) return;
    setMomoLoading(true);
    try {
      const result = await createMoMoPayment(
        selectedInvoice.id,
        customAmount,
        `Thanh toán hóa đơn #${selectedInvoice.id} - Kant Hotel`
      );
      // Mở tab mới với payUrl
      window.open(result.payUrl, '_blank', 'noopener,noreferrer');
      message.info({
        content: '🔗 Đã mở trang thanh toán MoMo. Sau khi thanh toán xong, quay lại đây để xem kết quả.',
        duration: 8,
      });
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || 'Không thể tạo liên kết thanh toán MoMo. Vui lòng thử lại.');
    } finally {
      setMomoLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const remainingAmount = selectedInvoice
    ? selectedInvoice.finalTotal - (selectedInvoice.depositPaidAmount || 0) - selectedInvoice.payments.reduce((sum, p) => sum + p.amountPaid, 0)
    : 0;

  const columns = [
    {
      title: 'Mã booking',
      dataIndex: 'bookingCode',
      key: 'bookingCode',
      width: 160,
      render: (code: string) => <Text strong style={{ fontFamily: 'monospace', color: '#A6894B' }}>{code}</Text>,
    },
    {
      title: 'Khách hàng',
      key: 'guest',
      render: (_: any, r: BookingResponseDto) => (
        <div>
          <div style={{ fontWeight: 700 }}>{r.guestName || '—'}</div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>{r.guestPhone || '—'}</div>
        </div>
      ),
    },
    {
      title: 'Tình trạng',
      key: 'invoice',
      width: 150,
      render: (_: any, r: BookingResponseDto) =>
        r.invoiceId ? <Tag color="green">Đã xuất hóa đơn</Tag> : <Tag>Chưa xuất hóa đơn</Tag>,
    },
    {
      title: 'Tiền cọc',
      key: 'deposit',
      width: 120,
      render: (_: any, r: BookingResponseDto) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Text strong style={{ color: r.depositAmount > 0 ? '#16a34a' : 'inherit' }}>
            {formatMoney(r.depositAmount)}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Đã thu: {formatMoney(r.depositPaidAmount)}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Còn thiếu: {formatMoney(r.depositRemainingAmount)}
          </Text>
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 200,
      render: (_: any, r: BookingResponseDto) => (
        <Space wrap size="small">
          <Button size="small" icon={<FileText size={14} />} onClick={() => openInvoice(r)}>
            Xem hóa đơn
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {selectedInvoice && selectedBooking && (
        <PrintInvoice
          booking={selectedBooking}
          invoice={selectedInvoice}
          rooms={rooms}
          cashierName={cashierName}
          damages={invoiceDamages}
          services={invoiceServices}
        />
      )}

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <Title level={2} style={{ marginBottom: 0 }}>Quản lý Hóa đơn</Title>
          <Paragraph style={{ color: '#9ca3af', marginTop: 8 }}>
            Tra cứu, tạo hóa đơn, ghi nhận thanh toán và in hóa đơn cho khách.
          </Paragraph>
        </div>
        <Space>
          <Button icon={<RefreshCw size={15} />} onClick={loadData} loading={loading}>Làm mới</Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {[
          { label: 'Tổng booking', value: stats.total, color: '#6b7280', icon: <Ticket size={20} /> },
          { label: 'Có hóa đơn', value: stats.withInvoice, color: '#A6894B', icon: <FileText size={20} /> },
          { label: 'Đã trả phòng', value: stats.checkedOut, color: '#16a34a', icon: <CreditCard size={20} /> },
        ].map((s, i) => (
          <Col key={i} xs={24} sm={12} md={8} lg={6}>
            <AntCard className="glass-card text-center" bodyStyle={{ padding: '16px' }}>
              <div style={{ color: s.color }} className="flex justify-center mb-2">{s.icon}</div>
              <Statistic title={<span style={{ fontSize: 12 }}>{s.label}</span>} value={s.value} valueStyle={{ color: s.color, fontSize: 24 }} />
            </AntCard>
          </Col>
        ))}
      </Row>

      <AntCard className="glass-card">
        <Row gutter={16} align="middle">
          <Col xs={24} md={12}>
            <Input
              prefix={<Search size={16} style={{ color: '#9ca3af' }} />}
              placeholder="Tìm theo mã booking, tên khách, SĐT, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              style={{ width: '100%' }}
              value={hasInvoiceOnly ? 'with' : 'all'}
              onChange={(v) => setHasInvoiceOnly(v === 'with')}
              options={[
                { value: 'with', label: 'Chỉ booking có hóa đơn' },
                { value: 'all', label: 'Tất cả booking' },
              ]}
            />
          </Col>
          <Col xs={24} md={6}>
            <Button block onClick={() => { setSearchTerm(''); setHasInvoiceOnly(true); }}>Xóa bộ lọc</Button>
          </Col>
        </Row>
      </AntCard>

      <AntCard className="glass-card">
        <Table
          rowKey="id"
          loading={loading}
          dataSource={visibleRows}
          columns={columns}
          scroll={{ x: 820 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </AntCard>

      <Modal
        open={invoiceOpen}
        title={
          <Space>
            <FileText size={16} />
            <span>Xác nhận thanh toán & In hóa đơn</span>
          </Space>
        }
        onCancel={() => setInvoiceOpen(false)}
        width={1000}
        footer={null}
      >
        {invoiceLoading ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af' }}>Đang tải hóa đơn...</div>
        ) : !selectedInvoice ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ marginBottom: 12 }}>Booking này chưa có hóa đơn.</div>
            {selectedBooking?.status !== 'Cancelled' && (
              <Button type="primary" icon={<Plus size={14} />} onClick={createInvoice}>
                Tạo hóa đơn
              </Button>
            )}
          </div>
        ) : (
          <Row gutter={24}>
            {/* ── Left Column: Cost Breakdown ── */}
            <Col span={16}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>HÓA ĐƠN THANH TOÁN</div>
                <div style={{ fontSize: 13, color: '#9ca3af' }}>Mã đơn #{selectedInvoice.id}</div>
              </div>

              {/* Costs Breakdown */}
              <div style={{ borderBottom: '1px solid var(--nav-border)', marginBottom: 8, padding: '12px', background: 'var(--bg-subtle)', borderRadius: 6, color: 'var(--text-body)' }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text-title)' }}>Chi tiết chi phí</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14 }}>
                  <span>Tiền phòng:</span>
                  <span style={{ fontWeight: 500 }}>{formatMoney(selectedInvoice.totalRoomAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14 }}>
                  <span>Dịch vụ & Vật tư (Minibar...):</span>
                  <span>{formatMoney(invoiceServices.reduce((sum, s) => sum + (s.totalAmount || 0), 0))}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14, color: '#ef4444' }}>
                  <span>Hỏng hóc & Thất thoát:</span>
                  <span style={{ fontWeight: 500 }}>+{formatMoney(invoiceDamages.reduce((sum, d) => sum + (d.penaltyAmount || 0), 0))}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 4px', fontSize: 14, fontWeight: 700, borderTop: '1px dashed var(--nav-border)', marginTop: 4, color: 'var(--text-title)' }}>
                  <span>TỔNG CỘNG (Chưa Thuế):</span>
                  <span>{formatMoney(selectedInvoice.totalRoomAmount + selectedInvoice.totalServiceAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14, color: '#d97706' }}>
                  <span>Đã đặt cọc:</span>
                  <span>-{formatMoney(selectedInvoice.depositPaidAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14, color: selectedInvoice.depositRemainingAmount > 0 ? '#ef4444' : '#10b981' }}>
                  <span>Cọc còn thiếu:</span>
                  <span>{formatMoney(selectedInvoice.depositRemainingAmount)}</span>
                </div>
              </div>

              {/* Deductions */}
              <div style={{ borderBottom: '1px solid var(--nav-border)', marginBottom: 8, padding: '12px', background: 'var(--bg-subtle)', borderRadius: 6, color: 'var(--text-body)' }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text-title)' }}>Các khoản giảm trừ</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14, color: '#10b981' }}>
                  <span>Ưu đãi / Voucher:</span>
                  <span>-{formatMoney(selectedInvoice.discountAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14, color: '#d97706' }}>
                  <span>Tiền đã cọc:</span>
                  <span>{formatMoney(selectedInvoice.depositAmount)}</span>
                </div>
              </div>

              {/* Amount Due Table */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text-title)' }}>Thông tin lưu trú:</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-subtle)' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', border: '1px solid var(--nav-border)', color: 'var(--text-muted)' }}>Phòng</th>
                      <th style={{ textAlign: 'center', padding: '8px 12px', border: '1px solid var(--nav-border)', color: 'var(--text-muted)' }}>Số đêm</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', border: '1px solid var(--nav-border)', color: 'var(--text-muted)' }}>Tổng tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBooking?.details?.map((d, i) => {
                      const nights = nightsBetween(d.checkInDate, d.checkOutDate);
                      return (
                        <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'var(--card-bg)' : 'var(--bg-subtle)' }}>
                          <td style={{ padding: '8px 12px', border: '1px solid var(--nav-border)', color: 'var(--text-body)' }}>
                            Phòng {rooms.find(r => r.id === d.roomId)?.roomNumber ?? d.roomId}
                          </td>
                          <td style={{ textAlign: 'center', padding: '8px 12px', border: '1px solid var(--nav-border)', color: 'var(--text-body)' }}>{nights}</td>
                          <td style={{ textAlign: 'right', padding: '8px 12px', border: '1px solid var(--nav-border)', color: 'var(--text-title)', fontWeight: 600 }}>{formatMoney(d.pricePerNight * nights)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Services Table */}
              {invoiceServices && invoiceServices.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, color: '#3b82f6' }}>Dịch vụ & Vật tư đã sử dụng:</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-subtle)' }}>
                        <th style={{ textAlign: 'left', padding: '8px 12px', border: '1px solid var(--nav-border)', color: '#3b82f6' }}>Sản phẩm/Dịch vụ</th>
                        <th style={{ textAlign: 'center', padding: '8px 12px', border: '1px solid var(--nav-border)', color: '#3b82f6' }}>Số lượng</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', border: '1px solid var(--nav-border)', color: '#3b82f6' }}>Tổng tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceServices.map((order, i) => (
                        <React.Fragment key={i}>
                          {order.details?.map((item: any, j: number) => (
                            <tr key={`${i}-${j}`} style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-body)' }}>
                              <td style={{ padding: '8px 12px', border: '1px solid var(--nav-border)' }}>{item.serviceName}</td>
                              <td style={{ textAlign: 'center', padding: '8px 12px', border: '1px solid var(--nav-border)' }}>{item.quantity}</td>
                              <td style={{ textAlign: 'right', padding: '8px 12px', border: '1px solid var(--nav-border)' }}>{formatMoney(item.lineTotal)}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Damages Table */}
              {invoiceDamages && invoiceDamages.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, color: '#ef4444' }}>Hỏng hóc & Thất thoát:</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(239,68,68,0.08)' }}>
                        <th style={{ textAlign: 'left', padding: '8px 12px', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>Vật tư hư hỏng</th>
                        <th style={{ textAlign: 'center', padding: '8px 12px', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>Số lượng</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>Phí bồi thường</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceDamages.map((d, i) => (
                        <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'var(--card-bg)' : 'rgba(239,68,68,0.04)', color: 'var(--text-body)' }}>
                          <td style={{ padding: '8px 12px', border: '1px solid rgba(239,68,68,0.2)' }}>{d.equipmentName || 'Vật dụng'} ({d.roomNumber || 'N/A'})</td>
                          <td style={{ textAlign: 'center', padding: '8px 12px', border: '1px solid rgba(239,68,68,0.2)' }}>{d.quantity}</td>
                          <td style={{ textAlign: 'right', padding: '8px 12px', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 600 }}>{formatMoney(d.penaltyAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Col>

            {/* ── Right Column: Summary & Actions ── */}
            <Col span={8}>
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontWeight: 600, marginBottom: 12 }}>Trạng thái thanh toán</div>
                <div style={{ marginBottom: 20 }}>
                   <Tag color={INVOICE_STATUS_COLOR[selectedInvoice.status] ?? 'default'} style={{ fontSize: 13, padding: '4px 12px' }}>
                    {INVOICE_STATUS_LABEL[selectedInvoice.status] ?? selectedInvoice.status}
                  </Tag>
                </div>

                <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--nav-border)', borderRadius: 8, padding: '16px', marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Tổng thanh toán</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-title)' }}>{formatMoney(selectedInvoice.finalTotal)}</div>
                  
                  <Divider style={{ margin: '12px 0' }} />
                  
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Còn lại</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: remainingAmount > 0 ? '#ef4444' : '#10b981' }}>
                    {formatMoney(Math.max(0, remainingAmount))}
                  </div>
                </div>

                <Space direction="vertical" style={{ width: '100%' }} size={10}>
                  <Button block size="large" icon={<Printer size={16} />} onClick={handlePrint}>
                    In hóa đơn
                  </Button>
                  
                  {selectedInvoice.status !== 'Paid' ? (
                    <>
                      {/* ── Nút MoMo nổi bật ── */}
                      <Button
                        block
                        size="large"
                        loading={momoLoading}
                        onClick={() => handleMoMoPayment()}
                        style={{
                          height: 48,
                          fontSize: 15,
                          fontWeight: 600,
                          backgroundColor: '#A50064',
                          border: 'none',
                          color: '#fff',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 10,
                          boxShadow: '0 4px 10px rgba(165,0,100,0.2)',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <img
                          src={MOMO_LOGO}
                          alt="MoMo"
                          style={{ width: 22, height: 22, borderRadius: 4, objectFit: 'cover', flexShrink: 0, backgroundColor: 'white', padding: 1 }}
                        />
                        THANH TOÁN QUA MOMO
                      </Button>

                      {/* ── Nút ghi nhận thủ công ── */}
                      <Button 
                        block 
                        size="large" 
                        type="primary" 
                        className="btn-gold" 
                        onClick={() => setPaymentOpen(true)}
                        style={{ 
                          height: 48, 
                          fontSize: 15, 
                          fontWeight: 600,
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 10,
                        }}
                      >
                        <CreditCard size={18} />
                        TIỀN MẶT / CHUYỂN KHOẢN
                      </Button>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, color: '#10b981', fontWeight: 600 }}>
                      ✓ ĐÃ THANH TOÁN ĐỦ
                    </div>
                  )}
                </Space>

                {selectedInvoice.payments?.length > 0 && (
                  <div style={{ marginTop: 'auto', paddingTop: 20 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>LỊCH SỬ GIAO DỊCH</div>
                    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                      {selectedInvoice.payments.map((p, i) => (
                        <div key={i} style={{ padding: '8px 0', borderBottom: '1px dashed var(--nav-border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-title)' }}>{formatMoney(p.amountPaid)}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{p.paymentMethod}</span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.paymentDate ? dayjs(p.paymentDate).format('DD/MM HH:mm') : ''}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Col>
          </Row>
        )}
      </Modal>

      <Modal
        open={paymentOpen}
        title={<Space><CreditCard size={16} /><span>Ghi nhận thanh toán</span></Space>}
        onCancel={() => { setPaymentOpen(false); paymentForm.resetFields(); }}
        footer={null}
        width={460}
      >
        <Form form={paymentForm} layout="vertical" onFinish={submitPayment}>
          {selectedInvoice && (
            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--nav-border)', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
              <Row>
                <Col span={12}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng hóa đơn</div>
                  <div style={{ fontWeight: 900, color: 'var(--text-title)' }}>{formatMoney(selectedInvoice.finalTotal)}</div>
                </Col>
                <Col span={12}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Còn phải thu</div>
                  <div style={{ fontWeight: 900, color: remainingAmount > 0 ? '#ef4444' : '#10b981' }}>
                    {formatMoney(Math.max(0, remainingAmount))}
                  </div>
                </Col>
              </Row>
            </div>
          )}

          <Form.Item name="paymentMethod" label="Phương thức thanh toán" rules={[{ required: true, message: 'Vui lòng chọn phương thức' }]}>
            <Select
              options={PAYMENT_METHODS.map(m => ({ 
                value: m, 
                label: m === 'MoMo'
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <img src={MOMO_LOGO} alt="MoMo" style={{ width: 18, height: 18, borderRadius: 3 }} />
                      MoMo (Chuyển hướng)
                    </span>
                  : m
              }))}
              placeholder="Chọn phương thức..."
              onChange={(v) => {
                paymentForm.setFieldsValue({ transactionCode: generateTxnCode() });
                // Ẩn/hiện trường số tiền khi chọn MoMo
              }}
            />
          </Form.Item>

          <Form.Item
            name="amountPaid"
            label="Số tiền thanh toán (₫)"
            rules={[{ required: true, message: 'Nhập số tiền' }]}
            initialValue={remainingAmount > 0 ? Math.round(remainingAmount) : undefined}
          >
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => v!.replace(/,/g, '') as any}
              addonAfter="₫"
            />
          </Form.Item>

          <Form.Item
            name="transactionCode"
            label={
              <Space>
                <span>Mã giao dịch</span>
                <Button size="small" type="link" style={{ padding: 0, height: 'auto', fontSize: 12 }} onClick={() => paymentForm.setFieldsValue({ transactionCode: generateTxnCode() })}>
                  ↻ Tạo mới
                </Button>
              </Space>
            }
          >
            <Input placeholder="TXN-..." style={{ fontFamily: 'monospace' }} />
          </Form.Item>

          <div className="flex justify-end gap-3 mt-2">
            <Button onClick={() => { setPaymentOpen(false); paymentForm.resetFields(); }}>Hủy</Button>
            <Button type="primary" htmlType="submit" className="btn-gold" icon={<CreditCard size={14} />}>
              Xác nhận thanh toán
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default InvoiceManagementPage;

