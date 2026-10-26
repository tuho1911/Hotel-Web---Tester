import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  User,
  Mail,
  Phone,
  Shield,
  Bell,
  Moon,
  Sun,
  Camera,
  Lock,
  Save,
  LogOut,
  Loader2,
  Calendar,
  Trophy,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Form, Input, Button, Switch, Tabs, message, Avatar, Badge, Tag, Card } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { userProfileApi, UserProfileDto } from '../../services/userProfileApi';
import { useAppDispatch } from '../../hooks/useAppStore';
import { logout, updateUser } from '../../store/slices/authSlice';
import { bookingApi, type BookingResponseDto } from '../../services/bookingApi';
import { serviceOrderApi, type ServiceDto, type ServiceCategoryDto } from '../../services/serviceOrderApi';
import { membershipApi, type MembershipDto } from '../../services/membershipApi';

type GeneralFormValues = {
  fullName: string;
  email: string;
  phone?: string;
  role?: string;
};

type PasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const formatCurrency = (value?: number | null) =>
  Number(value || 0).toLocaleString('vi-VN') + 'd';

const formatDate = (value?: string | null) =>
  value ? value.split('T')[0] : '--';

const getMembershipBadgeColor = (membershipName?: string | null) => {
  const normalized = (membershipName || '').toLowerCase();
  if (normalized.includes('platinum')) return 'gold';
  if (normalized.includes('gold')) return 'orange';
  if (normalized.includes('silver')) return 'default';
  return 'blue';
};

const isCheckedInBooking = (status: string | number) =>
  String(status) === '2' || String(status) === 'CheckedIn';

// --- Sub-components ---

const MembershipTab = ({ profile, tiers }: { profile: UserProfileDto | null, tiers: MembershipDto[] }) => {
  const sortedTiers = [...tiers].sort((a, b) => (a.minPoints || 0) - (b.minPoints || 0));
  const currentPoints = profile?.loyaltyPoints || 0;
  const currentTierIndex = sortedTiers.findLastIndex(t => currentPoints >= (t.minPoints || 0));
  const currentTier = currentTierIndex !== -1 ? sortedTiers[currentTierIndex] : null;
  const nextTier = currentTierIndex + 1 < sortedTiers.length ? sortedTiers[currentTierIndex + 1] : null;

  const progress = nextTier 
    ? Math.min(100, Math.max(0, ((currentPoints - (currentTier?.minPoints || 0)) / ((nextTier.minPoints || 0) - (currentTier?.minPoints || 0))) * 100))
    : 100;

  return (
    <div className="space-y-8 mt-6">
      <div className="bg-subtle p-8 rounded-3xl border border-luxury relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <Trophy size={120} className="text-primary" />
        </div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-end mb-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted mb-2">Hạng hiện tại</p>
              <h3 className="text-4xl font-display font-bold text-primary">
                {currentTier?.tierName || 'Guest'}
              </h3>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-muted mb-2">Điểm tích lũy</p>
              <h3 className="text-3xl font-bold text-title">{currentPoints.toLocaleString()}</h3>
            </div>
          </div>

          {nextTier && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-body font-medium">Tiến trình lên {nextTier.tierName}</span>
                <span className="text-muted">Cần thêm {(nextTier.minPoints! - currentPoints).toLocaleString()} điểm</span>
              </div>
              <div className="h-3 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-gradient-to-r from-primary to-primary-light"
                />
              </div>
            </div>
          )}
          {!nextTier && currentTier && (
            <p className="text-sm text-emerald-600 font-bold">✨ Bạn đã đạt hạng cao nhất. Tận hưởng đặc quyền tối đa!</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-card !p-0 overflow-hidden border-none shadow-none">
          <div className="p-4 bg-primary/10 border-b border-primary/20">
            <h4 className="font-bold text-title flex items-center gap-2">
              <Shield size={18} className="text-primary" /> Đặc quyền của bạn
            </h4>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-body">Giảm giá đặt phòng</span>
              <span className="font-bold text-primary">{profile?.membershipDiscountPercent || 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-body">Ưu tiên nhận phòng sớm</span>
              <span className="text-emerald-500 font-bold">{currentTierIndex >= 1 ? 'Khả dụng' : 'Không'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-body">Quà tặng sinh nhật</span>
              <span className="text-emerald-500 font-bold">{currentTierIndex >= 2 ? 'Premium' : 'Standard'}</span>
            </div>
          </div>
        </Card>

        <Card className="glass-card !p-0 overflow-hidden border-none shadow-none">
          <div className="p-4 bg-black/5 dark:bg-white/5 border-b border-luxury">
            <h4 className="font-bold text-title flex items-center gap-2">
              <Calendar size={18} className="text-muted" /> Lộ trình thăng hạng
            </h4>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {sortedTiers.map((tier, idx) => (
                <div key={tier.id} className={`flex items-center justify-between p-3 rounded-xl ${idx === currentTierIndex ? 'bg-primary/5 border border-primary/20' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${idx <= currentTierIndex ? 'bg-primary' : 'bg-muted'}`} />
                    <span className={`font-bold ${idx === currentTierIndex ? 'text-primary' : 'text-title'}`}>{tier.tierName}</span>
                  </div>
                  <span className="text-xs text-muted font-medium">{tier.minPoints?.toLocaleString()} điểm</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

const MyBookingsTab = () => {
  const [bookings, setBookings] = useState<BookingResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingResponseDto | null>(null);
  const [selectedBookingDetailId, setSelectedBookingDetailId] = useState<number | null>(null);
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryDto[]>([]);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [orderingService, setOrderingService] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const loadBookings = async () => {
    try {
      const data = await bookingApi.getMyBookings();
      setBookings(data);
    } catch {
      message.error('Could not load your bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBookings();
    serviceOrderApi.getCategories().then(setCategories).catch(console.error);
    serviceOrderApi.getServices().then(setServices).catch(console.error);
  }, []);

  const handleOpenServiceModal = (booking: BookingResponseDto) => {
    setSelectedBooking(booking);
    setSelectedBookingDetailId(booking.details[0]?.id || null);
    setCart({});
    setIsServiceModalOpen(true);
  };

  const handleAddToCart = (serviceId: number, change: number) => {
    setCart((prev) => {
      const nextValue = (prev[serviceId] || 0) + change;
      if (nextValue <= 0) {
        const next = { ...prev };
        delete next[serviceId];
        return next;
      }

      return { ...prev, [serviceId]: nextValue };
    });
  };

  const handleOrderService = async () => {
    if (!selectedBookingDetailId || Object.keys(cart).length === 0) {
      message.warning('Please choose a room and at least one service.');
      return;
    }

    setOrderingService(true);
    try {
      await serviceOrderApi.createOrder({
        bookingDetailId: selectedBookingDetailId,
        items: Object.entries(cart).map(([serviceId, quantity]) => ({
          serviceId: Number(serviceId),
          quantity,
        })),
      });

      message.success('Your service request has been sent.');
      await loadBookings();
      setIsServiceModalOpen(false);
      setCart({});
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Could not place the service request.');
    } finally {
      setOrderingService(false);
    }
  };

  const handlePayMoMo = async (booking: BookingResponseDto) => {
    try {
      const depositRemaining = Math.max(0, booking.depositRemainingAmount || 0);
      if (depositRemaining <= 0) {
        message.info('This deposit is already fully paid.');
        return;
      }

      message.loading({ content: 'Creating MoMo payment...', key: 'momo' });
      let invoiceId = booking.invoiceId;
      if (!invoiceId) {
        const invoice = await bookingApi.createInvoice(booking.id);
        invoiceId = invoice.id;
      }

      const momoResult = await bookingApi.createMoMoPayment(
        invoiceId,
        depositRemaining,
        `Deposit payment for ${booking.bookingCode}`
      );

      if (momoResult.payUrl) {
        window.location.href = momoResult.payUrl;
      }
    } catch (error: any) {
      message.error({
        content: error.response?.data?.message || 'Could not create MoMo payment.',
        key: 'momo',
      });
    }
  };

  const cartTotal = useMemo(
    () =>
      Object.entries(cart).reduce((total, [serviceId, quantity]) => {
        const service = services.find((item) => item.id === Number(serviceId));
        return total + (service?.price || 0) * quantity;
      }, 0),
    [cart, services]
  );

  const getStatusTag = (status: string | number) => {
    const normalized = String(status);
    switch (normalized) {
      case '0':
      case 'Pending':
        return <Tag color="orange" className="rounded-full px-3">Chờ xác nhận</Tag>;
      case '1':
      case 'Confirmed':
        return <Tag color="blue" className="rounded-full px-3">Đã xác nhận</Tag>;
      case '2':
      case 'CheckedIn':
        return <Tag color="green" className="rounded-full px-3">Đã nhận phòng</Tag>;
      case '3':
      case 'CheckedOut':
        return <Tag color="default" className="rounded-full px-3">Đã trả phòng</Tag>;
      case '4':
      case 'Cancelled':
        return <Tag color="red" className="rounded-full px-3">Đã hủy</Tag>;
      default:
        return <Tag className="rounded-full px-3">{normalized}</Tag>;
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted">Đang tải lịch sử đặt phòng...</p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="mt-10 rounded-3xl border border-dashed border-luxury bg-subtle py-16 text-center">
        <Calendar className="mx-auto mb-4 h-16 w-16 text-muted/30" />
        <h4 className="text-xl font-display font-bold text-title mb-2">Chưa có đặt phòng nào</h4>
        <p className="text-muted mb-8">Bạn chưa thực hiện giao dịch đặt phòng nào với chúng tôi.</p>
        <Button 
          onClick={() => { window.location.href = '/rooms'; }} 
          type="primary" 
          className="btn-gold h-12 px-8 rounded-xl font-bold"
        >
          Khám phá các hạng phòng
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {bookings.map((booking) => (
        <div
          key={booking.id}
          className="group relative overflow-hidden rounded-3xl border border-luxury bg-white dark:bg-slate-900/40 p-6 transition-all hover:shadow-xl hover:shadow-primary/5"
        >
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
            <div className="space-y-4 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-primary/10 text-primary px-4 py-1 rounded-full text-sm font-bold border border-primary/20">
                  {booking.bookingCode}
                </div>
                {getStatusTag(booking.status)}
              </div>
              
              <div>
                <h4 className="text-lg font-bold text-title mb-1">
                  {booking.details.length} Phòng • {booking.details[0]?.roomTypeId ? 'Hạng phòng cao cấp' : 'Thông tin phòng'}
                </h4>
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Calendar size={14} />
                  <span>{formatDate(booking.details[0]?.checkInDate)}</span>
                  <span className="mx-1">→</span>
                  <span>{formatDate(booking.details[booking.details.length - 1]?.checkOutDate)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-luxury/50">
                  <p className="text-[10px] uppercase tracking-widest text-muted mb-1">Tiền cọc yêu cầu</p>
                  <p className="font-bold text-title">{formatCurrency(booking.depositAmount)}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-500/5 p-3 rounded-2xl border border-emerald-500/20">
                  <p className="text-[10px] uppercase tracking-widest text-emerald-600/70 mb-1">Đã thanh toán</p>
                  <p className="font-bold text-emerald-600">{formatCurrency(booking.depositPaidAmount)}</p>
                </div>
                <div className="bg-rose-50 dark:bg-rose-500/5 p-3 rounded-2xl border border-rose-500/20">
                  <p className="text-[10px] uppercase tracking-widest text-rose-600/70 mb-1">Còn lại</p>
                  <p className="font-bold text-rose-600">{formatCurrency(booking.depositRemainingAmount)}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-row md:flex-col gap-3 justify-end items-center md:items-end">
              {(String(booking.status) === 'Pending' ||
                String(booking.status) === 'Confirmed' ||
                String(booking.status) === 'CheckedOut') &&
                (booking.depositRemainingAmount || 0) > 0 && (
                  <Button
                    type="primary"
                    className="h-11 px-6 rounded-xl bg-pink-600 hover:bg-pink-700 border-none font-bold text-white shadow-lg shadow-pink-500/20"
                    onClick={() => void handlePayMoMo(booking)}
                  >
                    Thanh toán cọc MoMo
                  </Button>
                )}

              {isCheckedInBooking(booking.status) && (
                <Button
                  type="primary"
                  className="btn-gold h-11 px-6 rounded-xl font-bold shadow-lg shadow-primary/20"
                  onClick={() => handleOpenServiceModal(booking)}
                >
                  Đặt dịch vụ phòng
                </Button>
              )}
              
              <Button 
                type="text" 
                className="text-primary font-medium hover:bg-primary/5 rounded-lg h-11 px-4"
                onClick={() => {
                  setSelectedBooking(booking);
                  setIsDetailModalOpen(true);
                }}
              >
                Xem chi tiết
              </Button>
            </div>
          </div>
        </div>
      ))}

      {selectedBooking && createPortal(
        <div
          className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-all ${
            isServiceModalOpen ? 'visible opacity-100' : 'invisible opacity-0'
          }`}
        >
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-title">Yêu cầu dịch vụ phòng</h3>
                <p className="text-sm text-muted">Mã đặt phòng: {selectedBooking.bookingCode}</p>
              </div>
              <button
                onClick={() => setIsServiceModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-6 dark:bg-slate-900/50">
              {selectedBooking.details.length > 1 && (
                <div className="mb-6">
                  <label className="mb-2 block text-sm font-bold text-title">Chọn phòng:</label>
                  <select
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-title dark:border-slate-700 dark:bg-slate-800"
                    value={selectedBookingDetailId || ''}
                    onChange={(event) => setSelectedBookingDetailId(Number(event.target.value))}
                  >
                    {selectedBooking.details.map((detail) => (
                      <option key={detail.id} value={detail.id}>
                        Phòng {detail.roomId || 'Chưa gán'} ({formatDate(detail.checkInDate)} - {formatDate(detail.checkOutDate)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-8">
                {categories.map((category) => {
                  const categoryServices = services.filter((service) => service.categoryId === category.id);
                  if (categoryServices.length === 0) {
                    return null;
                  }

                  return (
                    <div key={category.id}>
                      <h4 className="mb-4 border-b border-slate-200 pb-2 font-bold text-primary dark:border-slate-800">
                        {category.name}
                      </h4>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {categoryServices.map((service) => (
                          <div
                            key={service.id}
                            className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
                          >
                            <div>
                              <div className="text-sm font-bold text-title">{service.name}</div>
                              <div className="text-sm font-semibold text-primary">
                                {formatCurrency(service.price)} {service.unit ? `/ ${service.unit}` : ''}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900">
                              <button
                                type="button"
                                onClick={() => handleAddToCart(service.id, -1)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 shadow-sm hover:bg-white dark:hover:bg-slate-800"
                              >
                                -
                              </button>
                              <span className="w-6 text-center text-sm font-bold text-title">
                                {cart[service.id] || 0}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAddToCart(service.id, 1)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 shadow-sm hover:bg-white dark:hover:bg-slate-800"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <p className="text-sm text-muted">Tổng tạm tính</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(cartTotal)}</p>
              </div>
              <Button
                type="primary"
                className="btn-gold h-12 rounded-xl px-8 text-sm"
                loading={orderingService}
                onClick={() => void handleOrderService()}
                disabled={cartTotal === 0}
              >
                Xác nhận đặt ({Object.values(cart).reduce((sum, value) => sum + value, 0)} món)
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {selectedBooking && isDetailModalOpen && createPortal(
        <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-all visible opacity-100`}>
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-title">Chi tiết Đặt phòng</h3>
                <p className="text-sm text-muted">Mã: {selectedBooking.bookingCode}</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                &times;
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-50 p-6 dark:bg-slate-900/50 space-y-6">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                <h4 className="font-bold text-primary mb-3">Thông tin thanh toán</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted">Tổng tiền cọc yêu cầu:</span><span className="font-bold text-title">{formatCurrency(selectedBooking.depositAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Đã thanh toán:</span><span className="font-bold text-emerald-600">{formatCurrency(selectedBooking.depositPaidAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Còn lại:</span><span className="font-bold text-rose-600">{formatCurrency(selectedBooking.depositRemainingAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Trạng thái:</span><span>{getStatusTag(selectedBooking.status)}</span></div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                <h4 className="font-bold text-primary mb-3">Danh sách phòng ({selectedBooking.details.length})</h4>
                <div className="space-y-3">
                  {selectedBooking.details.map(detail => (
                    <div key={detail.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-sm">
                      <div className="flex justify-between font-bold text-title mb-1">
                        <span>Phòng {detail.roomId || 'Chưa gán'}</span>
                        <span className="text-primary">{formatCurrency(detail.pricePerNight)} / đêm</span>
                      </div>
                      <div className="text-muted text-xs">
                        Từ {formatDate(detail.checkInDate)} đến {formatDate(detail.checkOutDate)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-slate-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 text-right">
              <Button onClick={() => setIsDetailModalOpen(false)} className="rounded-xl px-6 font-medium">Đóng</Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const Profile: React.FC = () => {
  const { isDarkMode, toggleTheme } = useThemeStore();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [form] = Form.useForm<GeneralFormValues>();
  const [passwordForm] = Form.useForm<PasswordFormValues>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [tiers, setTiers] = useState<MembershipDto[]>([]);

  useEffect(() => {
    membershipApi.getAll().then(setTiers).catch(console.error);
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await userProfileApi.getProfile();
        setProfile(data);
        form.setFieldsValue({
          fullName: data.fullName,
          email: data.email,
          phone: data.phone ?? '',
          role: data.role ?? '',
        });
      } catch (error: any) {
        message.error(error.response?.data?.message || 'Could not load account details.');
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [form]);

  const handleSaveProfile = async (values: GeneralFormValues) => {
    setSavingProfile(true);

    try {
      await userProfileApi.updateProfile({
        fullName: values.fullName.trim(),
        phone: values.phone?.trim() || '',
      });

      const nextProfile = {
        ...profile,
        fullName: values.fullName.trim(),
        phone: values.phone?.trim() || '',
      } as UserProfileDto;

      setProfile(nextProfile);
      dispatch(updateUser({ fullName: nextProfile.fullName, name: nextProfile.fullName }));
      message.success('Profile updated successfully.');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (values: PasswordFormValues) => {
    setSavingPassword(true);

    try {
      await userProfileApi.changePassword({
        oldPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      passwordForm.resetFields();
      message.success('Password updated successfully.');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Could not update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setUploadingAvatar(true);

    try {
      const response = await userProfileApi.uploadAvatar(file);
      const nextProfile = {
        ...profile,
        avatarUrl: response.url,
      } as UserProfileDto;

      setProfile(nextProfile);
      dispatch(updateUser({ avatar: response.url }));
      message.success('Avatar updated successfully.');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Could not upload avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-6xl space-y-12 pb-10"
    >
      <div className="flex flex-col gap-10 md:flex-row">
        <div className="w-full space-y-8 md:w-1/3">
          <div className="admin-card text-center">
            <div className="relative mb-8 inline-block">
              <Avatar
                size={140}
                src={profile?.avatarUrl || undefined}
                className="border-4 border-white shadow-2xl dark:border-slate-800"
              >
                {profile?.fullName?.charAt(0)?.toUpperCase()}
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-1 right-1 rounded-full bg-primary p-3 text-white shadow-lg transition-transform hover:scale-110 disabled:opacity-60 disabled:hover:scale-100"
              >
                <Camera size={18} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="mt-4">
              <h1 className="mb-2 text-4xl font-display font-bold text-title">{profile?.fullName}</h1>
              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                <Tag color={getMembershipBadgeColor(profile?.membershipName)} className="px-4 py-1 rounded-full border-luxury font-bold">
                  {profile?.membershipName || 'Hạng thường'}
                </Tag>
              </div>
            </div>

            <div className="mt-8 space-y-5 border-t border-luxury pt-8 text-left">
              <div className="flex items-center space-x-4 text-body">
                <Mail size={18} className="text-primary" />
                <span className="text-sm font-medium">{profile?.email}</span>
              </div>
              <div className="flex items-center space-x-4 text-body">
                <Phone size={18} className="text-primary" />
                <span className="text-sm font-medium">{profile?.phone || 'Not updated yet'}</span>
              </div>
              <div className="flex items-center space-x-4 text-body">
                <Shield size={18} className="text-primary" />
                <span className="text-sm font-medium">{profile?.role || 'User'}</span>
              </div>
            </div>

            <Button
              block
              danger
              icon={<LogOut size={18} />}
              onClick={handleLogout}
              className="mt-10 flex h-14 items-center justify-center rounded-xl text-xs font-bold uppercase tracking-wider"
            >
              Sign out
            </Button>
          </div>
        </div>

        <div className="w-full md:w-2/3">
          <div className="admin-card">
            <Tabs
              defaultActiveKey="1"
              className="custom-tabs"
              items={[
                {
                  key: '1',
                  label: (
                    <span className="flex items-center space-x-2 px-2 py-1">
                      <Trophy size={18} />
                      <span>Hạng thành viên</span>
                    </span>
                  ),
                  children: <MembershipTab profile={profile} tiers={tiers} />,
                },
                {
                  key: '2',
                  label: (
                    <span className="flex items-center space-x-2 px-2 py-1">
                      <User size={18} />
                      <span>Thông tin chung</span>
                    </span>
                  ),
                  children: (
                    <Form form={form} layout="vertical" className="mt-10 space-y-6" onFinish={handleSaveProfile}>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <Form.Item
                          label="Full Name"
                          name="fullName"
                          rules={[{ required: true, message: 'Please enter your full name.' }]}
                        >
                          <Input className="h-14 rounded-xl font-medium" />
                        </Form.Item>
                        <Form.Item label="Email Address" name="email">
                          <Input className="h-14 rounded-xl font-medium" disabled />
                        </Form.Item>
                      </div>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <Form.Item label="Phone Number" name="phone">
                          <Input className="h-14 rounded-xl font-medium" />
                        </Form.Item>
                        <Form.Item label="Position" name="role">
                          <Input className="h-14 rounded-xl font-medium" disabled />
                        </Form.Item>
                      </div>
                      <div className="pt-4">
                        <Button
                          htmlType="submit"
                          type="primary"
                          icon={<Save size={18} />}
                          loading={savingProfile}
                          className="btn-gold h-14 px-10"
                        >
                          Save Changes
                        </Button>
                      </div>
                    </Form>
                  ),
                },
                {
                  key: '3',
                  label: (
                    <span className="flex items-center space-x-2 px-2 py-1">
                      <Lock size={18} />
                      <span>Bảo mật</span>
                    </span>
                  ),
                  children: (
                    <Form
                      form={passwordForm}
                      layout="vertical"
                      className="mt-10 space-y-6"
                      onFinish={handleChangePassword}
                    >
                      <Form.Item
                        label="Current Password"
                        name="currentPassword"
                        rules={[{ required: true, message: 'Please enter your current password.' }]}
                      >
                        <Input.Password className="h-14 rounded-xl" />
                      </Form.Item>
                      <Form.Item
                        label="New Password"
                        name="newPassword"
                        rules={[
                          { required: true, message: 'Please enter a new password.' },
                          { min: 6, message: 'Password must be at least 6 characters.' },
                        ]}
                      >
                        <Input.Password className="h-14 rounded-xl" />
                      </Form.Item>
                      <Form.Item
                        label="Confirm New Password"
                        name="confirmPassword"
                        dependencies={['newPassword']}
                        rules={[
                          { required: true, message: 'Please confirm the new password.' },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              if (!value || getFieldValue('newPassword') === value) {
                                return Promise.resolve();
                              }

                              return Promise.reject(new Error('Password confirmation does not match.'));
                            },
                          }),
                        ]}
                      >
                        <Input.Password className="h-14 rounded-xl" />
                      </Form.Item>
                      <div className="pt-4">
                        <Button htmlType="submit" type="primary" loading={savingPassword} className="btn-gold h-14 px-10">
                          Update Password
                        </Button>
                      </div>
                    </Form>
                  ),
                },
                {
                  key: '4',
                  label: (
                    <span className="flex items-center space-x-2 px-2 py-1">
                      <Bell size={18} />
                      <span>Cài đặt</span>
                    </span>
                  ),
                  children: (
                    <div className="mt-10 space-y-10">
                      <div className="space-y-6">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-primary">Appearance</h4>
                        <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-800/50">
                          <div className="flex items-center space-x-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-800">
                              {isDarkMode ? (
                                <Moon size={24} className="text-primary" />
                              ) : (
                                <Sun size={24} className="text-primary" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-title">Dark Mode</p>
                              <p className="text-xs text-muted">Switch between light and dark themes</p>
                            </div>
                          </div>
                          <Switch checked={isDarkMode} onChange={toggleTheme} />
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-primary">Avatar</h4>
                        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-800/50">
                          <div className="flex items-center space-x-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-800">
                              <Camera size={24} className="text-primary" />
                            </div>
                            <div>
                              <p className="font-bold text-title">Cloudinary Upload</p>
                              <p className="text-xs text-muted">Update your avatar directly from the profile page</p>
                            </div>
                          </div>
                          <Button onClick={() => fileInputRef.current?.click()} loading={uploadingAvatar} className="rounded-xl">
                            Upload image
                          </Button>
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: '5',
                  label: (
                    <span className="flex items-center space-x-2 px-2 py-1">
                      <Calendar size={18} />
                      <span>Lịch sử đặt phòng</span>
                    </span>
                  ),
                  children: <MyBookingsTab />,
                },
              ]}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Profile;
