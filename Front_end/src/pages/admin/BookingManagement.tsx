// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useAppStore';
import {
  message as antdMessage,
  Button,
  Card as AntCard,
  Col,
  DatePicker,
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
  ArrowLeftRight,
  BanknoteIcon,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Eye,
  FileText,
  LogIn,
  LogOut,
  Plus,
  Printer,
  RefreshCw,
  ScissorsIcon,
  Search,
  Ticket,
  XCircle,
  Clock,
  LayoutDashboard,
  UserCheck,
} from 'lucide-react';
import dayjs from 'dayjs';
import {
  bookingApi,
  BookingResponseDto,
  BookingDetailDto,
  BookingStatus,
  InvoiceResponseDto,
  ReassignRoomDto,
  SplitBookingDto,
  AvailableRoomDto,
} from '../../services/bookingApi';
import { adminApi, RoomDto, RoomTypeDto } from '../../services/adminApi';
import { voucherApi, VoucherResponseDto } from '../../services/voucherApi';
import HotelInvoicePrint from '../../components/print/HotelInvoicePrint';

const { Title, Paragraph, Text } = Typography;

// ─── helpers ───────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<BookingStatus, string> = {
  Pending: 'gold',
  Confirmed: 'blue',
  CheckedIn: 'green',
  CheckedOut: 'default',
  Cancelled: 'red',
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  Pending: 'Chờ xác nhận',
  Confirmed: 'Đã xác nhận',
  CheckedIn: 'Đã nhận phòng',
  CheckedOut: 'Đã trả phòng',
  Cancelled: 'Đã hủy',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  Cash: 'Tiền mặt',
  BankTransfer: 'Chuyển khoản',
  MoMo: 'MoMo',
};

const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS);

const DEPOSIT_STATUS_COLOR: Record<string, string> = {
  NotRequired: 'default',
  Unpaid: 'orange',
  Paid: 'green',
};

const DEPOSIT_STATUS_LABEL: Record<string, string> = {
  NotRequired: 'Không yêu cầu đặt cọc',
  Unpaid: 'Chưa thanh toán đặt cọc',
  Paid: 'Đã thanh toán đặt cọc',
};

const getPaymentMethodLabel = (method?: string) => PAYMENT_METHOD_LABELS[method || ''] ?? method ?? 'Không rõ';

const formatMoney = (v?: number | null) =>
  v !== undefined && v !== null ? v.toLocaleString('vi-VN') + ' ₫' : '—';

const nightsBetween = (from: string, to: string) =>
  Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000));

const getDepositStatusLabel = (status?: string) => DEPOSIT_STATUS_LABEL[status || 'NotRequired'] ?? status ?? 'Không yêu cầu cọc';
const getDepositStatusColor = (status?: string) => DEPOSIT_STATUS_COLOR[status || 'NotRequired'] ?? 'default';

type BookingViewMode = 'manage' | 'arrivals' | 'in-house' | 'check-out' | 'invoices';

const VIEW_CONFIG: Record<
  BookingViewMode,
  {
    title: string;
    subtitle: string;
    createLabel: string;
    defaultStatus: BookingStatus | 'all';
    showCreate: boolean;
  }
> = {
  manage: {
    title: 'Quản lý đặt phòng',
    subtitle: 'Tạo đặt phòng, nhận phòng, trả phòng và theo dõi toàn bộ lịch lưu trú.',
    createLabel: 'Tạo đặt phòng mới',
    defaultStatus: 'all',
    showCreate: true,
  },
  arrivals: {
    title: 'Khách đến hôm nay',
    subtitle: 'Danh sách khách cần làm thủ tục nhận phòng hôm nay.',
    createLabel: 'Tạo đặt phòng walk-in',
    defaultStatus: 'all',
    showCreate: true,
  },
  'in-house': {
    title: 'Khách đang lưu trú',
    subtitle: 'Theo dõi khách đã nhận phòng và xử lý các nghiệp vụ phát sinh.',
    createLabel: 'Tạo đặt phòng walk-in',
    defaultStatus: 'CheckedIn',
    showCreate: true,
  },
  'check-out': {
    title: 'Thủ tục trả phòng',
    subtitle: 'Xử lý trả phòng nhanh và ghi nhận các khoản phát sinh.',
    createLabel: 'Tạo đặt phòng walk-in',
    defaultStatus: 'CheckedIn',
    showCreate: true,
  },
  invoices: {
    title: 'Quản lý hóa đơn',
    subtitle: 'Tạo hóa đơn, ghi nhận thanh toán và in chứng từ cho khách.',
    createLabel: 'Tạo đặt phòng mới',
    defaultStatus: 'all',
    showCreate: true,
  },
};

const getViewMode = (pathname: string): BookingViewMode => {
  if (pathname.endsWith('/arrivals')) return 'arrivals';
  if (pathname.endsWith('/in-house')) return 'in-house';
  if (pathname.endsWith('/check-out')) return 'check-out';
  if (pathname.endsWith('/invoices')) return 'invoices';
  return 'manage';
};

const isToday = (value?: string | null) =>
  Boolean(value) && dayjs(value).isSame(dayjs(), 'day');

/** Sinh mã giao dịch ngẫu nhiên phía client (backup nếu cần hiển thị tức thì) */
const generateTxnCode = () => {
  const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `TXN-${dayjs().format('YYYYMMDD')}-${rand}`;
};

// ─── Print Invoice Component ────────────────────────────────────────────────
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

// ─── Main Component ────────────────────────────────────────────────────────
const BookingPage: React.FC = () => {
  const cashierName = useAppSelector((s) => s.auth.user?.fullName || s.auth.user?.name || null);
  const location = useLocation();
  const viewMode = getViewMode(location.pathname);
  const viewConfig = VIEW_CONFIG[viewMode];

  const [bookings, setBookings] = useState<BookingResponseDto[]>([]);
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomTypeDto[]>([]);
  const [vouchers, setVouchers] = useState<VoucherResponseDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [arrivalDate, setArrivalDate] = useState<dayjs.Dayjs | null>(dayjs());

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [selectedBookingForCheckOut, setSelectedBookingForCheckOut] = useState<BookingResponseDto | null>(null);

  // ── Reassign Room Modal ──
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignDetail, setReassignDetail] = useState<BookingDetailDto | null>(null);
  const [reassignLoading, setReassignLoading] = useState(false);
  const [reassignForm] = Form.useForm();

  // ── Split Booking Modal ──
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitLoading, setSplitLoading] = useState(false);
  const [splitSelectedIds, setSplitSelectedIds] = useState<number[]>([]);

  // ── Available rooms cache (keyed by "typeId_checkIn_checkOut") ──
  const [availableRoomsCache, setAvailableRoomsCache] = useState<Record<string, AvailableRoomDto[]>>({});
  const [loadingAvailableRooms, setLoadingAvailableRooms] = useState<Record<string, boolean>>({});

  const fetchAvailableRooms = useCallback(async (roomTypeId: number, checkIn: string, checkOut: string) => {
    const key = `${roomTypeId}_${checkIn}_${checkOut}`;
    if (availableRoomsCache[key] !== undefined) return; // already cached
    setLoadingAvailableRooms(prev => ({ ...prev, [key]: true }));
    try {
      const result = await bookingApi.getAvailableRooms(checkIn, checkOut, roomTypeId);
      setAvailableRoomsCache(prev => ({ ...prev, [key]: result }));
    } catch {
      setAvailableRoomsCache(prev => ({ ...prev, [key]: [] }));
    } finally {
      setLoadingAvailableRooms(prev => ({ ...prev, [key]: false }));
    }
  }, [availableRoomsCache]);

  const [selectedBooking, setSelectedBooking] = useState<BookingResponseDto | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceResponseDto | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceDamages, setInvoiceDamages] = useState<any[]>([]);
  const [invoiceServices, setInvoiceServices] = useState<any[]>([]);

  const [form] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [checkOutForm] = Form.useForm();

  // ── load ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bk, rm, rt, vc] = await Promise.all([
        bookingApi.getAll(),
        adminApi.getRooms(),
        adminApi.getRoomTypes(),
        voucherApi.getAll(),
      ]);
      setBookings(bk);
      setRooms(rm);
      setRoomTypes(rt);
      setVouchers(vc);
    } catch {
      antdMessage.error('Không thể tải dữ liệu đặt phòng. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Tự động điền mã giao dịch khi mở payment modal
  useEffect(() => {
    if (paymentOpen) {
      paymentForm.setFieldsValue({ transactionCode: generateTxnCode() });
    }
  }, [paymentOpen, paymentForm]);

  useEffect(() => {
    setStatusFilter(viewConfig.defaultStatus);
    setSearchTerm('');
  }, [viewConfig.defaultStatus, viewMode]);

  // ── derived stats ──
  const stats = React.useMemo(() => ({
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'Pending').length,
    confirmed: bookings.filter(b => b.status === 'Confirmed').length,
    checkedIn: bookings.filter(b => b.status === 'CheckedIn').length,
    checkedOut: bookings.filter(b => b.status === 'CheckedOut').length,
    cancelled: bookings.filter(b => b.status === 'Cancelled').length,
    arrivalsToday: bookings.filter(
      b => (b.status === 'Pending' || b.status === 'Confirmed') && b.details?.some(d => dayjs(d.checkInDate).isSame(arrivalDate || dayjs(), 'day'))
    ).length,
    departuresToday: bookings.filter(
      b => b.status === 'CheckedIn' && b.details?.some(d => isToday(d.checkOutDate))
    ).length,
    withInvoice: bookings.filter(b => Boolean(b.invoiceId)).length,
    withVoucher: bookings.filter(b => Boolean(b.voucherId)).length,
  }), [bookings, arrivalDate]);

  const availableVouchers = React.useMemo(() => 
    vouchers.filter(voucher => voucher.isActive && dayjs(voucher.endDate).endOf('day').isAfter(dayjs())),
    [vouchers]
  );

  const visibleBookings = React.useMemo(() => {
    return bookings.filter(b => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !term ||
        b.guestName?.toLowerCase().includes(term) ||
        b.bookingCode?.toLowerCase().includes(term) ||
        b.guestPhone?.includes(term) ||
        b.guestEmail?.toLowerCase().includes(term);
      const matchStatus = statusFilter === 'all' || b.status === statusFilter;

      const matchView =
        viewMode === 'arrivals'
          ? (b.status === 'Pending' || b.status === 'Confirmed') && b.details?.some(d => dayjs(d.checkInDate).isSame(arrivalDate || dayjs(), 'day'))
          : viewMode === 'in-house'
            ? b.status === 'CheckedIn'
            : viewMode === 'check-out'
              ? b.status === 'CheckedIn' && b.details?.some(d => isToday(d.checkOutDate))
              : true;

      return matchSearch && matchStatus && matchView;
    });
  }, [bookings, searchTerm, statusFilter, viewMode, arrivalDate]);

  const statCards = [
    { label: 'Tổng booking', value: stats.total, color: '#C6A96B', icon: <LayoutDashboard size={20} /> },
    { label: 'Chờ xác nhận', value: stats.pending, color: '#fbbf24', icon: <Clock size={20} /> },
    { label: 'Đã xác nhận', value: stats.confirmed, color: '#60a5fa', icon: <CheckCircle2 size={20} /> },
    { label: 'Đang ở', value: stats.checkedIn, color: '#34d399', icon: <UserCheck size={20} /> },
    { label: 'Đã trả phòng', value: stats.checkedOut, color: '#94a3b8', icon: <LogOut size={20} /> },
    { label: 'Đã hủy', value: stats.cancelled, color: '#f87171', icon: <XCircle size={20} /> },
  ];

  // ── actions ──
  const updateStatus = async (booking: BookingResponseDto, status: BookingStatus) => {
    try {
      await bookingApi.updateStatus(booking.id, status);
      antdMessage.success(`Đã cập nhật trạng thái thành ${STATUS_LABEL[status]}`);
      loadData();
    } catch (err: any) {
      antdMessage.error(err.response?.data?.message || 'Không thể cập nhật trạng thái booking. Vui lòng thử lại.');
    }
  };

  const openDetail = (booking: BookingResponseDto) => {
    setSelectedBooking(booking);
    setDetailOpen(true);
  };

  const openInvoice = async (booking: BookingResponseDto) => {
    setSelectedBooking(booking);
    setInvoiceOpen(true);
    setInvoiceLoading(true);
    setSelectedInvoice(null);
    setInvoiceDamages([]);
    setInvoiceServices([]);
    try {
      const [inv, services] = await Promise.all([
        bookingApi.getInvoiceByBookingId(booking.id),
        adminApi.getOrderServicesByBookingId(booking.id).catch(() => []),
      ]);
      setSelectedInvoice(inv);
      setInvoiceServices(services.filter((s: any) => s.status === 'Delivered' || s.status === 1));

      // Load damages for all booking details
      if (booking.details?.length) {
        const allDamages = await Promise.all(
          booking.details.map(d => adminApi.getLossDamagesByBookingDetail(d.id).catch(() => []))
        );
        setInvoiceDamages(allDamages.flat());
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
      antdMessage.success('Tạo hóa đơn tạm tính thành công');
    } catch (err: any) {
      antdMessage.error(err.response?.data?.message || 'Không thể tạo hóa đơn tạm tính. Vui lòng kiểm tra lại dữ liệu.');
    }
  };

  const requestCleaning = async (booking: BookingResponseDto) => {
    try {
      if (!booking.details || booking.details.length === 0) return;
      
      const promises = booking.details.map(d => {
        if (d.roomId) {
          const room = rooms.find(r => r.id === d.roomId);
          return adminApi.updateRoomCleaningStatus(d.roomId, {
            status: room?.status || 'Occupied',
            cleaningStatus: 'Dirty'
          });
        }
        return Promise.resolve();
      });
      
      await Promise.all(promises);
      
      // Tự động tạo hóa đơn trong background khi báo dọn phòng để Lễ tân có sẵn hóa đơn khi check-out
      bookingApi.createInvoice(booking.id).catch(() => {});

      antdMessage.success('Đã gửi yêu cầu buồng phòng kiểm tra trạng thái phòng và chuẩn bị hóa đơn.');
      loadData();
    } catch (err: any) {
      antdMessage.error('Không thể gửi yêu cầu kiểm tra phòng. Vui lòng thử lại hoặc kiểm tra thiết lập phòng.');
    }
  };

  const openCheckOut = (booking: BookingResponseDto) => {
    setSelectedBookingForCheckOut(booking);
    checkOutForm.resetFields();
    setCheckOutOpen(true);
  };

  const submitCheckOut = async (values: any) => {
    try {
      if (values.damages && values.damages.length > 0) {
        for (const damage of values.damages) {
          if (damage.penaltyAmount > 0) {
            await adminApi.createLossDamage({
              bookingDetailId: damage.bookingDetailId,
              quantity: damage.quantity || 1,
              penaltyAmount: damage.penaltyAmount,
              description: damage.description
            });
          }
        }
      }
      
      await bookingApi.updateStatus(selectedBookingForCheckOut!.id, 'CheckedOut');
      antdMessage.success('Đã trả phòng thành công.');
      
      await bookingApi.createInvoice(selectedBookingForCheckOut!.id).catch(() => {});
      
      setCheckOutOpen(false);
      loadData();
    } catch (err: any) {
      antdMessage.error(err.response?.data?.message || 'Không thể hoàn tất thủ tục trả phòng. Vui lòng thử lại.');
    }
  };

  const submitPayment = async (values: any) => {
    if (!selectedInvoice) return;
    try {
      await bookingApi.addPayment(selectedInvoice.id, {
        paymentMethod: values.paymentMethod,
        amountPaid: values.amountPaid,
        transactionCode: values.transactionCode || undefined,
      });
      antdMessage.success('Đã ghi nhận thanh toán thành công.');
      paymentForm.resetFields();
      setPaymentOpen(false);
      const inv = await bookingApi.getInvoiceByBookingId(selectedBooking!.id);
      setSelectedInvoice(inv);
      loadData();
    } catch (err: any) {
      antdMessage.error(err.response?.data?.message || 'Không thể ghi nhận thanh toán. Vui lòng kiểm tra lại thông tin.');
    }
  };

  const submitCreate = async (values: any) => {
    try {
      const details = values.details.map((d: any) => ({
        roomId: d.roomId ?? null,
        roomTypeId: d.roomTypeId ?? null,
        checkInDate: d.dates[0].format('YYYY-MM-DDT14:00:00'),
        checkOutDate: d.dates[1].format('YYYY-MM-DDT12:00:00'),
        pricePerNight: Number(d.pricePerNight || 0),
      }));
      await bookingApi.create({
        guestName: values.guestName,
        guestPhone: values.guestPhone,
        guestEmail: values.guestEmail,
        voucherId: values.voucherId ?? null,
        details,
        depositAmount: Number(values.depositAmount || 0),
      });
      antdMessage.success('Tạo đặt phòng thành công.');
      setCreateOpen(false);
      form.resetFields();
      loadData();
    } catch (err: any) {
      antdMessage.error(err.response?.data?.message || 'Không thể tạo đặt phòng. Vui lòng kiểm tra lại thông tin nhập.');
    }
  };

  const handlePrint = () => {
    if (!selectedInvoice || !selectedBooking) return;
    // Just trigger standard print - HotelInvoicePrint will handle CSS visibility
    window.print();
  };

  const remainingAmount = selectedInvoice
    ? selectedInvoice.finalTotal - selectedInvoice.depositPaidAmount - selectedInvoice.payments.reduce((s, p) => s + p.amountPaid, 0)
    : 0;

  // ── table columns ──────────────────────────────────────────────────────
  const columns = React.useMemo(() => [
    {
      title: 'Mã đặt phòng',
      dataIndex: 'bookingCode',
      key: 'bookingCode',
      render: (code: string) => (
        <Text strong style={{ fontFamily: 'monospace', color: '#A6894B' }}>{code}</Text>
      ),
      width: 150,
    },
    {
      title: 'Khách hàng',
      key: 'guest',
      render: (_: any, r: BookingResponseDto) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.guestName || '—'}</div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>{r.guestPhone}</div>
        </div>
      ),
    },
    {
      title: 'Phòng / Ngày',
      key: 'rooms',
      render: (_: any, r: BookingResponseDto) => {
        const d = r.details?.[0];
        if (!d) return '—';
        const room = rooms.find(rm => rm.id === d.roomId);
        const nights = nightsBetween(d.checkInDate, d.checkOutDate);
        return (
          <div>
            <div style={{ fontWeight: 500 }}>
              {room ? `Phòng ${room.roomNumber}` : `Loại #${d.roomTypeId}`}
              {r.details.length > 1 && <Tag style={{ marginLeft: 4 }} color="default">+{r.details.length - 1}</Tag>}
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>
              {dayjs(d.checkInDate).format('DD/MM')} → {dayjs(d.checkOutDate).format('DD/MM/YYYY')} · {nights} đêm
            </div>
          </div>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (s: BookingStatus) => <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag>,
      width: 140,
    },
    {
      title: 'Voucher',
      key: 'voucher',
      render: (_: any, r: BookingResponseDto) =>
        r.voucherCode ? <Tag color="blue">{r.voucherCode}</Tag> : <Tag>Không áp dụng</Tag>,
      width: 120,
    },
    {
      title: 'Tiền cọc',
      key: 'deposit',
      render: (_: any, r: BookingResponseDto) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: r.depositAmount > 0 ? '#16a34a' : 'inherit' }}>
            {formatMoney(r.depositAmount)}
          </Text>
          <Text style={{ fontSize: 12, color: '#64748b' }}>
            Đã thu: {formatMoney(r.depositPaidAmount)}
          </Text>
          <Tag color={getDepositStatusColor(r.depositStatus)} style={{ width: 'fit-content', marginInlineEnd: 0 }}>
            {getDepositStatusLabel(r.depositStatus)}
          </Tag>
        </Space>
      ),
      width: 110,
    },
    {
      title: 'Hóa đơn',
      key: 'invoice',
      render: (_: any, r: BookingResponseDto) =>
        r.invoiceId ? <Tag color="green">Đã xuất hóa đơn</Tag> : <Tag>Chưa xuất hóa đơn</Tag>,
      width: 90,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 330,
      render: (_: any, r: BookingResponseDto) => (
        <Space wrap size="small">
          <Button size="small" icon={<Eye size={13} />} onClick={() => openDetail(r)}>
            Chi tiết
          </Button>
          {r.status === 'Pending' && (
            <Button size="small" type="primary" icon={<CheckCircle2 size={13} />} onClick={() => updateStatus(r, 'Confirmed')}>
              Xác nhận
            </Button>
          )}
          {r.status === 'Confirmed' && (
            <Button size="small" style={{ background: '#16a34a', color: '#fff', border: 'none' }} icon={<LogIn size={13} />} onClick={() => updateStatus(r, 'CheckedIn')}>
              Nhận phòng
            </Button>
          )}
          {r.status === 'CheckedIn' && (() => {
            const bookingRooms = r.details?.map(d => rooms.find(rm => rm.id === d.roomId)).filter(Boolean) || [];
            // Kiểm tra xem tất cả các phòng đã được dọn Sạch (Clean) hoặc Trống (Available) chưa
            const allClean = bookingRooms.length > 0 && bookingRooms.every(rm => 
               (rm?.cleaningStatus || '').toLowerCase() === 'clean' || rm?.status === 'Available'
            );

            return (
              <Space wrap size="small">
                {/* Luôn hiện nút Báo dọn & KT để Lễ tân có thể ép kiểm tra lại khi khách xuống */}
                <Button size="small" style={{ background: '#f59e0b', color: '#fff', border: 'none' }} icon={<RefreshCw size={13} />} onClick={() => requestCleaning(r)} title="Yêu cầu kiểm tra phòng trước khi khách đi">
                  Báo dọn & KT
                </Button>
                
                {allClean ? (
                  <Button size="small" style={{ background: '#7c3aed', color: '#fff', border: 'none' }} icon={<LogOut size={13} />} onClick={() => openCheckOut(r)} title="Phòng đang báo Sạch, có thể trả ngay">
                    Trả phòng
                  </Button>
                ) : (
                  <Button size="small" type="dashed" danger icon={<LogOut size={13} />} onClick={() => openCheckOut(r)} title="Phòng chưa dọn xong! Bỏ qua kiểm tra để trả liền">
                    Bỏ qua
                  </Button>
                )}
              </Space>
            );
          })()}
          {(r.status === 'Pending' || r.status === 'Confirmed') && (
            <Button size="small" danger icon={<XCircle size={13} />} onClick={() => updateStatus(r, 'Cancelled')}>Hủy</Button>
          )}
          <Button size="small" icon={<FileText size={13} />} onClick={() => openInvoice(r)}>
            Hóa đơn
          </Button>
        </Space>
      ),
    },
  ], [rooms, statusFilter]);

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* PrintInvoice wrapper - ẩn trên màn hình, in trong cửa sổ mới */}
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

      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <Title level={2} style={{ marginBottom: 0 }}>{viewConfig.title}</Title>
          <Paragraph style={{ color: '#6b7280', marginTop: 8 }}>
            {viewConfig.subtitle}
          </Paragraph>
        </div>
        <Space>
          <Button icon={<RefreshCw size={15} />} onClick={loadData} loading={loading}>Làm mới</Button>
          {viewConfig.showCreate && (
            <Button type="primary" className="btn-gold" icon={<Plus size={16} />} onClick={() => { setCreateOpen(true); form.resetFields(); }}>
              {viewConfig.createLabel}
            </Button>
          )}
        </Space>
      </div>

      {/* Stats */}
      <Row gutter={[16, 16]}>
        {statCards.map((s, i) => (
          <Col key={i} xs={12} sm={12} md={8} lg={4}>
            <AntCard className="glass-card text-center h-full" bodyStyle={{ padding: '12px md:16px' }}>
              <div style={{ color: s.color }} className="flex justify-center mb-1 md:mb-2">{s.icon}</div>
              <Statistic
                title={<span className="text-[10px] md:text-[12px] text-muted font-medium">{s.label}</span>}
                value={s.value}
                valueStyle={{ color: s.color, fontSize: '18px', md: '26px', fontWeight: 700 }}
              />
            </AntCard>
          </Col>
        ))}
      </Row>

      {/* Filters */}
      <AntCard className="glass-card">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={8} lg={10}>
            <Input
              prefix={<Search size={16} className="text-muted" />}
              placeholder={viewMode === 'invoices' ? 'Mã booking, khách hàng, SĐT...' : 'Tên, mã booking, SĐT, email...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              allowClear
              className="h-10 md:h-12"
            />
          </Col>
          {viewMode === 'arrivals' && (
            <Col xs={24} sm={12} md={4} lg={4}>
              <DatePicker 
                value={arrivalDate} 
                onChange={d => setArrivalDate(d)} 
                className="w-full h-10 md:h-12"
                format="DD/MM/YYYY" 
                placeholder="Ngày nhận" 
              />
            </Col>
          )}
          <Col xs={24} sm={12} md={6} lg={viewMode === 'arrivals' ? 6 : 8}>
            <Select
              className="w-full h-10 md:h-12"
              value={statusFilter}
              onChange={v => setStatusFilter(v)}
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                ...Object.entries(STATUS_LABEL).map(([v, l]) => ({ value: v, label: l })),
              ]}
            />
          </Col>
          <Col xs={24} md={4} lg={viewMode === 'arrivals' ? 4 : 6}>
            <Button block className="h-10 md:h-12" onClick={() => { setSearchTerm(''); setStatusFilter(viewConfig.defaultStatus); }}>Xóa bộ lọc</Button>
          </Col>
        </Row>
      </AntCard>

      {/* Table */}
      <AntCard className="glass-card">
        <Table
          rowKey="id"
          loading={loading}
          dataSource={visibleBookings}
          columns={columns}
          scroll={{ x: 1000 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </AntCard>

      <Modal
        open={createOpen}
        title="Tạo Booking Mới"
        onCancel={() => setCreateOpen(false)}
        footer={null}
        width={1000}
        className="max-w-[95vw]"
      >
        <Form form={form} layout="vertical" onFinish={submitCreate}>
          {/* ── Thông tin khách ───────────────────────────── */}
          <Divider orientation="left">Thông tin khách hàng</Divider>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="guestName" label="Tên khách" rules={[{ required: true }]}>
                <Input placeholder="Nguyễn Văn A" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="guestPhone" label="Số điện thoại" rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}>
                <Input placeholder="0912345678" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="guestEmail" label="Email">
                <Input placeholder="guest@example.com" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="depositAmount" label="Tiền đặt cọc (₫)" initialValue={0}>
                <InputNumber
                  className="w-full h-10 md:h-12"
                  min={0}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  parser={v => v!.replace(/\./g, '') as any}
                  addonAfter="VND"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="voucherId" label="Voucher áp dụng">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Chọn voucher nếu có..."
              options={availableVouchers.map(voucher => ({
                value: voucher.id,
                label: `${voucher.code} — ${voucher.discountType === 'Percentage' ? `${voucher.discountValue}%` : formatMoney(voucher.discountValue)} · Hạn: ${dayjs(voucher.endDate).format('DD/MM/YYYY')}`,
              }))}
            />
          </Form.Item>

          {/* ── Chi tiết phòng ───────────────────────────── */}
          <Divider orientation="left">Chi tiết phòng đặt</Divider>
          <Form.List name="details" initialValue={[{}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => {
                  // Watch để tính tổng real-time
                  return (
                    <AntCard
                      key={key}
                      size="small"
                      className="mb-4"
                      style={{ border: '1.5px solid #e5e7eb', borderRadius: 10 }}
                      title={
                        <span style={{ fontWeight: 700, color: '#A6894B' }}>
                          🛏 Phòng {name + 1}
                        </span>
                      }
                      extra={fields.length > 1 ? <Button danger size="small" onClick={() => remove(name)}>Xóa</Button> : null}
                    >
                      <Row gutter={16}>
                        {/* Loại phòng */}
                        <Col xs={24} sm={12}>
                          <Form.Item {...rest} name={[name, 'roomTypeId']} label="Loại phòng" rules={[{ required: true, message: 'Vui lòng chọn loại phòng' }]}>
                            <Select
                              showSearch
                              optionFilterProp="label"
                              placeholder="Chọn loại phòng..."
                              options={roomTypes.map(rt => ({ value: rt.id, label: rt.name }))}
                              className="w-full h-10 md:h-12"
                              onChange={(val) => {
                                const rt = roomTypes.find(t => t.id === val);
                                if (rt) {
                                  const details = form.getFieldValue('details') || [];
                                  if (details[name]) {
                                    details[name] = { ...details[name], pricePerNight: rt.basePrice, roomId: undefined };
                                    form.setFieldsValue({ details });
                                  }
                                }
                              }}
                            />
                          </Form.Item>
                        </Col>
                        {/* Phòng cụ thể — load theo ngày thực tế */}
                        <Col xs={24} sm={12}>
                          <Form.Item
                            shouldUpdate={(prev, curr) =>
                              prev.details?.[name]?.roomTypeId !== curr.details?.[name]?.roomTypeId ||
                              prev.details?.[name]?.dates !== curr.details?.[name]?.dates
                            }
                            noStyle
                          >
                            {({ getFieldValue }) => {
                              const typeId = getFieldValue(['details', name, 'roomTypeId']);
                              const dates = getFieldValue(['details', name, 'dates']);
                              const hasDateRange = dates?.[0] && dates?.[1];
                              const checkInStr = hasDateRange ? dates[0].format('YYYY-MM-DDTHH:mm:ss') : null;
                              const checkOutStr = hasDateRange ? dates[1].format('YYYY-MM-DDTHH:mm:ss') : null;
                              const cacheKey = typeId && checkInStr && checkOutStr ? `${typeId}_${checkInStr}_${checkOutStr}` : null;
                              const availableRooms: AvailableRoomDto[] = cacheKey ? (availableRoomsCache[cacheKey] ?? []) : [];
                              const isLoadingRooms = cacheKey ? (loadingAvailableRooms[cacheKey] ?? false) : false;

                              // Trigger fetch khi đủ điều kiện
                              if (typeId && hasDateRange && cacheKey && availableRoomsCache[cacheKey] === undefined && !loadingAvailableRooms[cacheKey]) {
                                void fetchAvailableRooms(typeId, checkInStr!, checkOutStr!);
                              }

                              const placeholder = !typeId
                                ? 'Chọn loại phòng trước'
                                : !hasDateRange
                                ? 'Chọn ngày trước'
                                : isLoadingRooms
                                ? 'Đang tải phòng trống...'
                                : availableRooms.length > 0
                                ? `${availableRooms.length} phòng trống — bấm để chọn`
                                : 'Không có phòng trống trong thời gian này';

                              return (
                                <Form.Item {...rest} name={[name, 'roomId']} label={
                                  <span>
                                    Chọn phòng cụ thể
                                    <span style={{ color: '#9ca3af', fontSize: 11 }}> (để trống = tự động)</span>
                                  </span>
                                }>
                                  <Select
                                    allowClear
                                    showSearch
                                    optionFilterProp="label"
                                    placeholder={placeholder}
                                    disabled={!typeId || !hasDateRange || isLoadingRooms}
                                    loading={isLoadingRooms}
                                    className="w-full h-10 md:h-12"
                                    options={(() => {
                                      const detailsList = getFieldValue('details') || [];
                                      const selectedRoomIdsInOtherDetails = detailsList
                                        .map((item: any, idx: number) => idx !== name ? item?.roomId : null)
                                        .filter((id: any) => id !== null && id !== undefined);
                                      return availableRooms
                                        .filter(r => !selectedRoomIdsInOtherDetails.includes(r.id))
                                        .map(r => ({
                                          value: r.id,
                                          label: `Phòng ${r.roomNumber} · Tầng ${r.floor}${r.cleaningStatus === 'Clean' ? ' ✓ Sạch' : ''}`,
                                        }));
                                    })()}
                                    onChange={(roomId) => {
                                      if (roomId) {
                                        const room = availableRooms.find(r => r.id === roomId);
                                        if (room) {
                                          const details = form.getFieldValue('details') || [];
                                          if (details[name]) {
                                            details[name] = { ...details[name], pricePerNight: room.basePrice };
                                            form.setFieldsValue({ details });
                                          }
                                        }
                                      }
                                    }}
                                  />
                                </Form.Item>
                              );
                            }}
                          </Form.Item>
                        </Col>
                      </Row>

                      {/* Ngày + Giá */}
                      <Row gutter={16}>
                        <Col xs={24} sm={14}>
                          <Form.Item
                            {...rest}
                            name={[name, 'dates']}
                            label="Ngày nhận phòng / Trả phòng"
                            rules={[
                              { required: true, message: 'Vui lòng chọn ngày' },
                              () => ({
                                validator(_, value) {
                                  if (value && value[0] && value[1] && value[0].isSame(value[1], 'day')) {
                                    return Promise.reject(new Error('Phải lưu trú ít nhất 1 đêm'));
                                  }
                                  return Promise.resolve();
                                }
                              })
                            ]}
                          >
                            <DatePicker.RangePicker
                              className="w-full h-10 md:h-12"
                              format="DD/MM/YYYY"
                              disabledDate={d => d && d < dayjs().startOf('day')}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={10}>
                          <Form.Item {...rest} name={[name, 'pricePerNight']} label="Giá / đêm (₫)" rules={[{ required: true }]}>
                            <InputNumber
                              min={0}
                              className="w-full h-10 md:h-12"
                              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                              parser={v => v!.replace(/\./g, '') as any}
                              addonAfter="VND"
                            />
                          </Form.Item>
                        </Col>
                      </Row>

                      {/* Tạm tính phòng này */}
                      <Form.Item shouldUpdate noStyle>
                        {({ getFieldValue }) => {
                          const dates = getFieldValue(['details', name, 'dates']);
                          const price = getFieldValue(['details', name, 'pricePerNight']) || 0;
                          if (!dates || !dates[0] || !dates[1]) return null;
                          const nights = nightsBetween(dates[0].toISOString(), dates[1].toISOString());
                          return (
                            <div style={{ background: '#faf7f2', border: '1px solid #e8d9bb', borderRadius: 6, padding: '6px 12px', textAlign: 'right' }}>
                              <span style={{ color: '#9ca3af', fontSize: 13 }}>{nights} đêm × {formatMoney(price)} = </span>
                              <strong style={{ color: '#A6894B', fontSize: 15 }}>{formatMoney(nights * price)}</strong>
                            </div>
                          );
                        }}
                      </Form.Item>
                    </AntCard>
                  );
                })}
                <Button
                  block
                  icon={<Plus size={14} />}
                  onClick={() => add({})}
                  style={{ borderStyle: 'dashed', marginBottom: 12 }}
                >
                  + Thêm phòng
                </Button>
              </>
            )}
          </Form.List>

          {/* ── Tổng kết booking ─────────────────────────── */}
          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => {
              const details: any[] = getFieldValue('details') || [];
              const deposit = Number(getFieldValue('depositAmount') || 0);
              let totalRoom = 0;
              details.forEach(d => {
                if (d?.dates?.[0] && d?.dates?.[1] && d?.pricePerNight) {
                  const nights = nightsBetween(d.dates[0].toISOString(), d.dates[1].toISOString());
                  totalRoom += nights * Number(d.pricePerNight || 0);
                }
              });
              if (totalRoom === 0) return null;
              return (
                <div style={{ background: '#1e3a5f', borderRadius: 10, padding: '16px 20px', color: '#fff', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ opacity: 0.7, fontSize: 13 }}>Tổng tiền phòng ({details.length} phòng)</span>
                    <span style={{ fontWeight: 600 }}>{formatMoney(totalRoom)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ opacity: 0.7, fontSize: 13 }}>Đặt cọc</span>
                    <span style={{ color: '#fbbf24', fontWeight: 600 }}>-{formatMoney(deposit)}</span>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700 }}>Còn lại cần thanh toán</span>
                    <span style={{ fontWeight: 700, fontSize: 18, color: '#fbbf24' }}>{formatMoney(Math.max(0, totalRoom - deposit))}</span>
                  </div>
                </div>
              );
            }}
          </Form.Item>

          <div className="flex justify-end gap-3 mt-2">
            <Button onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" className="btn-gold" icon={<Plus size={14} />}>Tạo booking</Button>
          </div>
        </Form>
      </Modal>

      {/* ── Detail Modal ──────────────────────────────────────────────────────── */}
      <Modal
        open={detailOpen}
        title={`Chi tiết booking · ${selectedBooking?.bookingCode}`}
        onCancel={() => setDetailOpen(false)}
        width={720}
        footer={
          <Space>
            <Button onClick={() => setDetailOpen(false)}>Đóng</Button>
            {selectedBooking && (
              <Button type="primary" icon={<FileText size={14} />} onClick={() => { setDetailOpen(false); openInvoice(selectedBooking); }}>
                Xem hóa đơn
              </Button>
            )}
          </Space>
        }
      >
        {selectedBooking && (
          <>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Mã booking" span={2}>
                <Text strong style={{ fontFamily: 'monospace' }}>{selectedBooking.bookingCode}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Khách">{selectedBooking.guestName || '—'}</Descriptions.Item>
              <Descriptions.Item label="SĐT">{selectedBooking.guestPhone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Email" span={2}>{selectedBooking.guestEmail || '—'}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái" span={2}>
                <Tag color={STATUS_COLOR[selectedBooking.status]}>{STATUS_LABEL[selectedBooking.status]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Voucher" span={2}>
                {selectedBooking.voucherCode ? <Tag color="blue">{selectedBooking.voucherCode}</Tag> : 'Không áp dụng'}
              </Descriptions.Item>
              <Descriptions.Item label="Tiền đặt cọc" span={2}>
                <Text strong style={{ color: '#16a34a', fontSize: 16 }}>{formatMoney(selectedBooking.depositAmount)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Đã thu cọc" span={1}>
                <Text strong style={{ color: '#16a34a', fontSize: 16 }}>{formatMoney(selectedBooking.depositPaidAmount)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái cọc" span={1}>
                <Tag color={getDepositStatusColor(selectedBooking.depositStatus)}>{getDepositStatusLabel(selectedBooking.depositStatus)}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">Chi tiết phòng</Divider>
            <Table
              size="small"
              pagination={false}
              rowKey="id"
              dataSource={selectedBooking.details}
              columns={[
                { title: 'Phòng', render: (_: any, d: any) => rooms.find(r => r.id === d.roomId)?.roomNumber ? `Phòng ${rooms.find(r => r.id === d.roomId)?.roomNumber}` : (d.roomId ? `#${d.roomId}` : `Loại #${d.roomTypeId}`) },
                { title: 'Nhận phòng', dataIndex: 'checkInDate', render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
                { title: 'Trả phòng', dataIndex: 'checkOutDate', render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
                { title: 'Số đêm', render: (_: any, d: any) => nightsBetween(d.checkInDate, d.checkOutDate) },
                { title: 'Giá/đêm', dataIndex: 'pricePerNight', render: (v: number) => formatMoney(v) },
                { title: 'Thành tiền', render: (_: any, d: any) => formatMoney(d.pricePerNight * nightsBetween(d.checkInDate, d.checkOutDate)) },
              ]}
            />

            <Divider orientation="left">Cập nhật trạng thái</Divider>
            <Space wrap>
              {selectedBooking.status === 'Pending' && (
                <>
                  <Button type="primary" icon={<CheckCircle2 size={14} />} onClick={() => { updateStatus(selectedBooking, 'Confirmed'); setDetailOpen(false); }}>Xác nhận</Button>
                  <Button danger icon={<XCircle size={14} />} onClick={() => { updateStatus(selectedBooking, 'Cancelled'); setDetailOpen(false); }}>Hủy booking</Button>
                </>
              )}
              {selectedBooking.status === 'Confirmed' && (
                <>
                  <Button style={{ background: '#16a34a', color: '#fff', border: 'none' }} icon={<LogIn size={14} />} onClick={() => { updateStatus(selectedBooking, 'CheckedIn'); setDetailOpen(false); }}>Check-in</Button>
                  <Button danger icon={<XCircle size={14} />} onClick={() => { updateStatus(selectedBooking, 'Cancelled'); setDetailOpen(false); }}>Hủy</Button>
                </>
              )}
              {selectedBooking.status === 'CheckedIn' && (
                <Button style={{ background: '#7c3aed', color: '#fff', border: 'none' }} icon={<LogOut size={14} />} onClick={() => { updateStatus(selectedBooking, 'CheckedOut'); setDetailOpen(false); }}>Check-out</Button>
              )}
            </Space>

            {/* ── Reassign + Split buttons (chỉ hiện khi đang hoạt động) */}
            {(selectedBooking.status === 'Confirmed' || selectedBooking.status === 'CheckedIn') && (
              <>
                <Divider orientation="left" style={{ fontSize: 13, color: '#6b7280' }}>Nghiệp vụ đặc biệt</Divider>
                <Space wrap>
                  <Button
                    icon={<ArrowLeftRight size={14} />}
                    onClick={() => {
                      setReassignDetail(selectedBooking.details[0] ?? null);
                      reassignForm.resetFields();
                      setReassignOpen(true);
                    }}
                  >
                    Đổi / Gán lại phòng
                  </Button>
                  {selectedBooking.details.length >= 2 && (
                    <Button
                      icon={<ScissorsIcon size={14} />}
                      style={{ borderColor: '#d97706', color: '#d97706' }}
                      onClick={() => {
                        setSplitSelectedIds([]);
                        setSplitOpen(true);
                      }}
                    >
                      Tách hóa đơn (Split)
                    </Button>
                  )}
                </Space>
              </>
            )}
          </>
        )}
      </Modal>

      {/* ── CheckOut Modal ─────────────────────────────────────────────────────── */}
      <Modal
        open={checkOutOpen}
        title="Tiến hành trả phòng & Dọn phòng"
        onCancel={() => setCheckOutOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={checkOutForm} layout="vertical" onFinish={submitCheckOut}>
          <Paragraph className="mb-4 text-gray-500">
            Xác nhận trả phòng cho khách <strong className="text-[#A6894B]">{selectedBookingForCheckOut?.guestName}</strong>. 
            Phòng sẽ tự động chuyển sang trạng thái <strong>Cần dọn dẹp (Dirty)</strong>.
          </Paragraph>
          <Divider orientation="left">Khai báo hỏng hóc/Mất mát (Nếu có)</Divider>
          
          <Form.List name="damages">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <AntCard key={key} size="small" className="mb-2 bg-gray-50 relative">
                    <Button type="text" danger size="small" className="absolute top-2 right-2 z-10" onClick={() => remove(name)}><XCircle size={15} /></Button>
                    <Row gutter={10}>
                      <Col span={24} className="mb-2 mt-2">
                        <Form.Item {...rest} name={[name, 'bookingDetailId']} rules={[{ required: true, message: 'Chọn phòng' }]} style={{ marginBottom: 0 }}>
                          <Select placeholder="Thuộc phòng...">
                            {selectedBookingForCheckOut?.details?.map(d => (
                              <Select.Option key={d.id} value={d.id}>
                                {rooms.find(r => r.id === d.roomId)?.roomNumber ? `Phòng ${rooms.find(r => r.id === d.roomId)?.roomNumber}` : 'Phòng'}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item {...rest} name={[name, 'penaltyAmount']} label="Tiền phạt (₫)" style={{ marginBottom: 0 }} rules={[{ required: true }]}>
                          <InputNumber className="w-full" min={0} style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item {...rest} name={[name, 'description']} label="Mô tả" style={{ marginBottom: 0 }}>
                          <Input placeholder="Vd: Vỡ ly, mất khăn..." />
                        </Form.Item>
                      </Col>
                    </Row>
                  </AntCard>
                ))}
                <Button type="dashed" block onClick={() => add({ quantity: 1, penaltyAmount: 0 })} icon={<Plus size={14} />}>
                  + Thêm khoản phạt
                </Button>
              </>
            )}
          </Form.List>

          <div className="flex justify-end gap-3 mt-6">
            <Button onClick={() => setCheckOutOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" danger>Xác nhận trả phòng</Button>
          </div>
        </Form>
      </Modal>

      {/* ── Invoice Modal ─────────────────────────────────────────────────────── */}
      <Modal
        open={invoiceOpen}
        title={
          <Space>
            <FileText size={16} />
            <span>Xác nhận thanh toán & Trả phòng</span>
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
            <div style={{ marginBottom: 12 }}>Chưa có hóa đơn.</div>
            {selectedBooking?.status !== 'Cancelled' && (
              <Button type="primary" icon={<FileText size={14} />} onClick={createInvoice}>
                Tạo hóa đơn tạm tính
              </Button>
            )}
          </div>
        ) : (
          <Row gutter={24}>
            {/* ── Left Column: Invoice Details ── */}
            <Col span={16}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>HÓA ĐƠN TẠM TÍNH</div>
                <div style={{ fontSize: 13, color: '#9ca3af' }}>Mã đơn #{selectedInvoice.id}</div>
              </div>

              {/* Cost Breakdown */}
              <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: 8, padding: '12px', background: '#fafafa', borderRadius: 6 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#111827' }}>Tổng hợp chi phí</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14, color: '#374151' }}>
                  <span>Tổng tiền phòng:</span>
                  <span style={{ fontWeight: 500 }}>{formatMoney(selectedInvoice.totalRoomAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14, color: '#374151' }}>
                  <span>Dịch vụ & Vật tư (Minibar...):</span>
                  <span>{formatMoney(invoiceServices.reduce((sum, s) => sum + (s.totalAmount || 0), 0))}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14, color: '#dc2626' }}>
                  <span>Hỏng hóc & Thất thoát:</span>
                  <span style={{ fontWeight: 500 }}>+{formatMoney(invoiceDamages.reduce((sum, d) => sum + (d.penaltyAmount || 0), 0))}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 4px', fontSize: 14, fontWeight: 700, color: '#111827', borderTop: '1px dashed #e5e7eb', marginTop: 4 }}>
                  <span>Tổng cộng (Trước giảm trừ):</span>
                  <span>{formatMoney(selectedInvoice.totalRoomAmount + selectedInvoice.totalServiceAmount)}</span>
                </div>
              </div>

              {/* Deductions */}
              <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: 8, padding: '12px', background: '#f0fdf4', borderRadius: 6 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#111827' }}>Khấu trừ</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14, color: '#16a34a' }}>
                  <span>Giảm giá (Voucher/Member):</span>
                  <span>-{formatMoney(selectedInvoice.discountAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14, color: '#d97706' }}>
                  <span>Tiền đã đặt cọc:</span>
                  <span>{formatMoney(selectedInvoice.depositAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14, color: '#16a34a' }}>
                  <span>Tiền cọc đã thanh toán:</span>
                  <span>-{formatMoney(selectedInvoice.depositPaidAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14, color: selectedInvoice.depositRemainingAmount > 0 ? '#dc2626' : '#16a34a' }}>
                  <span>Coc con thieu:</span>
                  <span>{formatMoney(selectedInvoice.depositRemainingAmount)}</span>
                </div>
              </div>

              {/* Final */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '2px solid #e5e7eb', marginBottom: 20 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>CẦN THANH TOÁN:</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#dc2626' }}>{formatMoney(remainingAmount)} VND</span>
              </div>

              {/* Room Details Table */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Chi tiết phòng:</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#1f2937' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', border: '1px solid #e5e7eb', color: '#374151', fontWeight: 600 }}>Phòng</th>
                      <th style={{ textAlign: 'center', padding: '8px 12px', border: '1px solid #e5e7eb', color: '#374151', fontWeight: 600 }}>Số đêm</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', border: '1px solid #e5e7eb', color: '#374151', fontWeight: 600 }}>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBooking?.details?.map((d, i) => {
                      const nights = Math.max(1, dayjs(d.checkOutDate).diff(dayjs(d.checkInDate), 'day'));
                      const total = nights * d.pricePerNight;
                      return (
                        <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                          <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', color: '#1f2937' }}>
                            P.{rooms.find(r => r.id === d.roomId)?.roomNumber ?? d.roomId}
                          </td>
                          <td style={{ textAlign: 'center', padding: '8px 12px', border: '1px solid #e5e7eb', color: '#1f2937' }}>{nights}</td>
                          <td style={{ textAlign: 'right', padding: '8px 12px', border: '1px solid #e5e7eb', color: '#1f2937', fontWeight: 600 }}>{formatMoney(total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Services Table */}
              {invoiceServices && invoiceServices.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, color: '#0369a1' }}>Dịch vụ & Vật tư đã sử dụng:</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#1f2937' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f0f9ff' }}>
                        <th style={{ textAlign: 'left', padding: '8px 12px', border: '1px solid #bae6fd', color: '#0369a1', fontWeight: 600 }}>Sản phẩm/Dịch vụ</th>
                        <th style={{ textAlign: 'center', padding: '8px 12px', border: '1px solid #bae6fd', color: '#0369a1', fontWeight: 600 }}>Số lượng</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', border: '1px solid #bae6fd', color: '#0369a1', fontWeight: 600 }}>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceServices.map((order, i) => (
                        <React.Fragment key={i}>
                          {order.details?.map((item: any, j: number) => (
                            <tr key={`${i}-${j}`} style={{ backgroundColor: '#ffffff' }}>
                              <td style={{ padding: '8px 12px', border: '1px solid #bae6fd' }}>{item.serviceName}</td>
                              <td style={{ textAlign: 'center', padding: '8px 12px', border: '1px solid #bae6fd' }}>{item.quantity}</td>
                              <td style={{ textAlign: 'right', padding: '8px 12px', border: '1px solid #bae6fd' }}>{formatMoney(item.lineTotal)}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Loss & Damage Table */}
              {invoiceDamages && invoiceDamages.length > 0 && (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Chi tiết đền bù & Thất thoát:</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#1f2937' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#fff7ed' }}>
                        <th style={{ textAlign: 'left', padding: '8px 12px', border: '1px solid #fed7aa', color: '#92400e', fontWeight: 600 }}>Phòng</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', border: '1px solid #fed7aa', color: '#92400e', fontWeight: 600 }}>Vật tư</th>
                        <th style={{ textAlign: 'center', padding: '8px 12px', border: '1px solid #fed7aa', color: '#92400e', fontWeight: 600 }}>SL</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', border: '1px solid #fed7aa', color: '#92400e', fontWeight: 600 }}>Tiền phạt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceDamages.map((d: any, i: number) => (
                        <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#fff7ed' }}>
                          <td style={{ padding: '8px 12px', border: '1px solid #fed7aa', color: '#1f2937' }}>{d.roomNumber ?? '—'}</td>
                          <td style={{ padding: '8px 12px', border: '1px solid #fed7aa', color: '#1f2937' }}>{d.equipmentName ?? '—'}</td>
                          <td style={{ textAlign: 'center', padding: '8px 12px', border: '1px solid #fed7aa', color: '#1f2937' }}>{d.quantity}</td>
                          <td style={{ textAlign: 'right', padding: '8px 12px', border: '1px solid #fed7aa', color: '#dc2626', fontWeight: 600 }}>{formatMoney(d.penaltyAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Col>

            {/* ── Right Column: Actions ── */}
            <Col span={8}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 12 }}>Thao tác nhanh</div>
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                  <Button block icon={<Plus size={14} />} onClick={() => setPaymentOpen(true)}>
                    + Thêm phụ phí
                  </Button>
                  <Button block icon={<Printer size={14} />} onClick={handlePrint}>
                    🖨 In bản nháp
                  </Button>
                </Space>

                <Divider />

                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: '#1d4ed8', marginBottom: 4 }}>Tổng thanh toán</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#1d4ed8' }}>{formatMoney(selectedInvoice.finalTotal)}</div>
                  
                  <Divider style={{ margin: '12px 0' }} />
                  
                  <div style={{ fontSize: 13, color: '#1d4ed8', marginBottom: 4 }}>Còn lại (Cần thu thêm)</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: remainingAmount > 0 ? '#dc2626' : '#16a34a' }}>
                    {formatMoney(Math.max(0, remainingAmount))}
                  </div>
                </div>

                {selectedInvoice.status !== 'Paid' ? (
                  <Button
                    type="primary"
                    size="large"
                    block
                    style={{ background: '#2563eb', borderColor: '#2563eb', height: 48, fontSize: 15, fontWeight: 600 }}
                    icon={<CreditCard size={16} />}
                    onClick={() => setPaymentOpen(true)}
                  >
                    🔒 CHỐT & XUẤT HÓA ĐƠN
                  </Button>
                ) : (
                  <div style={{ textAlign: 'center', padding: '12px', background: '#f0fdf4', borderRadius: 8, color: '#16a34a', fontWeight: 600 }}>
                    ✓ Đã thanh toán đủ
                  </div>
                )}

                {/* Payment History */}
                {selectedInvoice.payments?.length > 0 && (
                  <>
                    <Divider orientation="left" style={{ fontSize: 13 }}>Lịch sử thanh toán</Divider>
                    {selectedInvoice.payments.map((p, i) => (
                      <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text strong>{formatMoney(p.amountPaid)}</Text>
                          <Tag>{p.paymentMethod}</Tag>
                        </div>
                        <Text style={{ fontSize: 11, color: '#9ca3af' }}>
                          {p.paymentDate ? dayjs(p.paymentDate).format('DD/MM HH:mm') : ''}
                          {p.transactionCode ? ` · #${p.transactionCode}` : ''}
                        </Text>
                      </div>
                    ))}
                    <div style={{ textAlign: 'right', paddingTop: 8, fontWeight: 600, fontSize: 13 }}>
                      Đã thu: <Text strong style={{ color: '#16a34a' }}>
                        {formatMoney(selectedInvoice.payments.reduce((s, p) => s + p.amountPaid, 0))}
                      </Text>
                    </div>
                  </>
                )}
              </div>
            </Col>
          </Row>
        )}
      </Modal>

      {/* ── Payment Modal ─────────────────────────────────────────────────────── */}
      <Modal
        open={paymentOpen}
        title={
          <Space><CreditCard size={16} /><span>Ghi nhận thanh toán</span></Space>
        }
        onCancel={() => { setPaymentOpen(false); paymentForm.resetFields(); }}
        footer={null}
        width={460}
      >
        <Form form={paymentForm} layout="vertical" onFinish={submitPayment}>
          {selectedInvoice && (
            <div style={{ background: '#faf7f2', border: '1px solid #e8d9bb', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
              <Row>
                <Col span={12}>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>Tổng hóa đơn</div>
                  <div style={{ fontWeight: 700 }}>{formatMoney(selectedInvoice.finalTotal)}</div>
                </Col>
                <Col span={12}>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>Còn phải thu</div>
                  <div style={{ fontWeight: 700, color: remainingAmount > 0 ? '#dc2626' : '#16a34a' }}>
                    {formatMoney(remainingAmount)}
                  </div>
                </Col>
              </Row>
            </div>
          )}

          <Form.Item name="paymentMethod" label="Phương thức thanh toán" rules={[{ required: true, message: 'Vui lòng chọn phương thức' }]}>
            <Select
              options={PAYMENT_METHODS.map(m => ({ value: m, label: m }))}
              placeholder="Chọn phương thức..."
              onChange={() => {
                // Tự sinh lại mã khi đổi phương thức
                paymentForm.setFieldsValue({ transactionCode: generateTxnCode() });
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
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={v => v!.replace(/\./g, '') as any}
              addonAfter="VND"
            />
          </Form.Item>

          <Form.Item
            name="transactionCode"
            label={
              <Space>
                <span>Mã giao dịch</span>
                <Button
                  size="small"
                  type="link"
                  style={{ padding: 0, height: 'auto', fontSize: 12 }}
                  onClick={() => paymentForm.setFieldsValue({ transactionCode: generateTxnCode() })}
                >
                  ↻ Tạo mới
                </Button>
              </Space>
            }
          >
            <Input
              placeholder="TXN-..."
              style={{ fontFamily: 'monospace' }}
              suffix={
                <Tooltip title="Mã sẽ tự động sinh nếu để trống">
                  <span style={{ fontSize: 11, color: '#9ca3af', cursor: 'help' }}>auto</span>
                </Tooltip>
              }
            />
          </Form.Item>

          <div className="flex justify-end gap-3 mt-2">
            <Button onClick={() => { setPaymentOpen(false); paymentForm.resetFields(); }}>Hủy</Button>
            <Button type="primary" htmlType="submit" className="btn-gold" icon={<CreditCard size={14} />}>
              Xác nhận thanh toán
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ── Reassign Room Modal ─────────────────────────────────────────────────── */}
      <Modal
        open={reassignOpen}
        title={<Space><ArrowLeftRight size={16} /><span>Đổi / Gán lại phòng</span></Space>}
        onCancel={() => { setReassignOpen(false); reassignForm.resetFields(); }}
        footer={null}
        width={520}
      >
        {selectedBooking && (
          <Form
            form={reassignForm}
            layout="vertical"
            onFinish={async (vals) => {
              if (!selectedBooking) return;
              setReassignLoading(true);
              try {
                const dto: ReassignRoomDto = {
                  bookingDetailId: vals.bookingDetailId,
                  newRoomId: vals.newRoomId || null,
                  roomTypeId: vals.roomTypeId || null,
                  reason: vals.reason || null,
                };
                await bookingApi.reassignRoom(selectedBooking.id, dto);
                antdMessage.success('Đã đổi phòng thành công!');
                setReassignOpen(false);
                reassignForm.resetFields();
                await loadData();
              } catch (err: any) {
                antdMessage.error(err?.response?.data?.message || 'Đổi phòng thất bại');
              } finally {
                setReassignLoading(false);
              }
            }}
          >
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400e' }}>
              ⚠️ Dùng khi: phòng chưa dọn xong, khách trước chưa trả, phòng bảo trì, hoặc nâng hạng phòng.
            </div>

            <Form.Item name="bookingDetailId" label="Chọn phòng cần đổi" rules={[{ required: true, message: 'Vui lòng chọn' }]}>
              <Select placeholder="Chọn booking detail...">
                {selectedBooking.details.map(d => (
                  <Select.Option key={d.id} value={d.id}>
                    {rooms.find(r => r.id === d.roomId)?.roomNumber
                      ? `Phòng ${rooms.find(r => r.id === d.roomId)?.roomNumber}`
                      : `Loại #${d.roomTypeId}`}
                    {' '}· {dayjs(d.checkInDate).format('DD/MM')} → {dayjs(d.checkOutDate).format('DD/MM')}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label="Phòng mới (để trống → tự động tìm)" name="newRoomId">
              <Select allowClear placeholder="Chọn phòng cụ thể hoặc để trống">
                {rooms.filter(r => r.status === 'Available').map(r => (
                  <Select.Option key={r.id} value={r.id}>
                    Phòng {r.roomNumber} · {roomTypes.find(rt => rt.id === r.roomTypeId)?.name ?? `Loại #${r.roomTypeId}`}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label="Loại phòng (nếu tự tìm)" name="roomTypeId">
              <Select allowClear placeholder="Tìm theo loại phòng">
                {roomTypes.map(rt => (
                  <Select.Option key={rt.id} value={rt.id}>{rt.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="reason" label="Lý do đổi phòng">
              <Input.TextArea rows={2} placeholder="Vd: Phòng 301 chưa dọn xong, khách đã đến..." />
            </Form.Item>

            <div className="flex justify-end gap-3">
              <Button onClick={() => { setReassignOpen(false); reassignForm.resetFields(); }}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={reassignLoading} style={{ background: '#2563eb' }}>
                Xác nhận đổi phòng
              </Button>
            </div>
          </Form>
        )}
      </Modal>

      {/* ── Split Booking Modal ──────────────────────────────────────────────────── */}
      <Modal
        open={splitOpen}
        title={<Space><ScissorsIcon size={16} /><span>Tách hóa đơn (Split Booking)</span></Space>}
        onCancel={() => setSplitOpen(false)}
        footer={null}
        width={560}
      >
        {selectedBooking && (
          <>
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 mb-4">
              <p className="text-xs text-muted mb-0 flex gap-2">
                <span className="text-primary text-base">✨</span>
                <span>
                  Chọn các phòng muốn <strong>tách ra</strong> để thanh toán riêng hoặc check-out sớm. 
                  Booking gốc sẽ giữ lại những phòng còn lại.
                </span>
              </p>
            </div>

            <div className="text-sm font-bold uppercase tracking-wider text-muted mb-3 ml-1">Danh sách phòng trong booking:</div>
            <div className="space-y-3">
              {selectedBooking.details.map(d => {
                const room = rooms.find(r => r.id === d.roomId);
                const nights = nightsBetween(d.checkInDate, d.checkOutDate);
                const checked = splitSelectedIds.includes(d.id);
                return (
                  <div
                    key={d.id}
                    onClick={() => setSplitSelectedIds(prev =>
                      prev.includes(d.id) ? prev.filter(x => x !== d.id) : [...prev, d.id]
                    )}
                    className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      checked 
                        ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10' 
                        : 'border-luxury/10 bg-luxury/5 hover:border-primary/30'
                    }`}
                  >
                    <Row justify="space-between" align="middle">
                      <Col>
                        <div className={`text-base font-bold mb-0.5 ${checked ? 'text-primary' : 'text-title'}`}>
                          {room ? `Phòng ${room.roomNumber}` : `Loại #${d.roomTypeId}`}
                        </div>
                        <div className="text-xs text-muted">
                          {dayjs(d.checkInDate).format('DD/MM')} → {dayjs(d.checkOutDate).format('DD/MM')} · {nights} đêm
                        </div>
                      </Col>
                      <Col className="text-right">
                        <div className={`text-lg font-display font-bold ${checked ? 'text-primary' : 'text-title'}`}>
                          {formatMoney(d.pricePerNight * nights)}
                        </div>
                        {checked && (
                          <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-primary uppercase mt-1">
                            <ScissorsIcon size={10} /> Đã chọn tách
                          </div>
                        )}
                      </Col>
                    </Row>
                  </div>
                );
              })}
            </div>

            <Divider className="my-6 border-luxury/10" />

            <Row justify="space-between" align="middle" className="bg-luxury/5 p-4 rounded-xl border border-luxury/10">
              <Col>
                <div className="text-xs font-bold uppercase tracking-widest text-muted mb-1">Tổng cộng tách:</div>
                <div className="text-2xl font-display font-bold text-primary">
                  {formatMoney(
                    selectedBooking.details
                      .filter(d => splitSelectedIds.includes(d.id))
                      .reduce((sum, d) => sum + d.pricePerNight * nightsBetween(d.checkInDate, d.checkOutDate), 0)
                  )}
                </div>
              </Col>
              <Col>
                <Space>
                  <Button
                    size="large"
                    loading={splitLoading}
                    disabled={splitSelectedIds.length === 0 || splitSelectedIds.length >= selectedBooking.details.length}
                    onClick={async () => {
                      if (!selectedBooking) return;
                      setSplitLoading(true);
                      try {
                        const dto: SplitBookingDto = {
                          bookingDetailIds: splitSelectedIds,
                          newBookingDepositAmount: 0,
                          checkOutImmediately: false,
                        };
                        const result = await bookingApi.splitBooking(selectedBooking.id, dto);
                        antdMessage.success("Đã tách phòng sang booking mới thành công. Bạn có thể bổ sung dịch vụ cho booking mới này.");
                        setSplitOpen(false);
                        setSplitSelectedIds([]);
                        setDetailOpen(false);
                        await loadData();
                      } catch (err: any) {
                        antdMessage.error(err?.response?.data?.message || 'Tách hóa đơn thất bại');
                      } finally {
                        setSplitLoading(false);
                      }
                    }}
                  >
                    Chỉ tách phòng
                  </Button>
                  <Button
                    type="primary"
                    size="large"
                    className="btn-gold h-12 px-8"
                    loading={splitLoading}
                    disabled={splitSelectedIds.length === 0 || splitSelectedIds.length >= selectedBooking.details.length}
                    onClick={async () => {
                      if (!selectedBooking) return;
                      setSplitLoading(true);
                      try {
                        const dto: SplitBookingDto = {
                          bookingDetailIds: splitSelectedIds,
                          newBookingDepositAmount: 0,
                          checkOutImmediately: true,
                        };
                        const result = await bookingApi.splitBooking(selectedBooking.id, dto);
                        antdMessage.success(result.message);
                        setSplitOpen(false);
                        setSplitSelectedIds([]);
                        setDetailOpen(false);
                        await loadData();
                      } catch (err: any) {
                        antdMessage.error(err?.response?.data?.message || 'Tách hóa đơn thất bại');
                      } finally {
                        setSplitLoading(false);
                      }
                    }}
                  >
                    Tách & Trả phòng
                  </Button>
                </Space>
              </Col>
            </Row>
            {splitSelectedIds.length >= selectedBooking.details.length && (
              <div style={{ color: '#dc2626', fontSize: 12, marginTop: 8 }}>
                ⚠️ Phải giữ lại ít nhất 1 phòng trong booking gốc.
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default BookingPage;
