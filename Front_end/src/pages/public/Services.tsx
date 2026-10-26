import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Car,
  ConciergeBell,
  Dumbbell,
  Sparkles,
  UtensilsCrossed,
  Waves,
  Loader2,
  Info,
  ShoppingBag,
  Hotel,
  Plus,
  Minus,
  CheckCircle2,
} from 'lucide-react';
import { Button, message, Select, Badge, Empty, Skeleton } from 'antd';
import { useAppSelector } from '../../hooks/useAppStore';
import { bookingApi, type BookingResponseDto } from '../../services/bookingApi';
import { serviceOrderApi, type ServiceDto, type ServiceCategoryDto } from '../../services/serviceOrderApi';
import dayjs from 'dayjs';

const heroServices = [
  {
    icon: ConciergeBell,
    title: 'Hỗ trợ 24/7',
    description: 'Đội ngũ lễ tân luôn sẵn sàng hỗ trợ đặt vé, tư vấn du lịch và giải quyết mọi yêu cầu của quý khách.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Ẩm thực thượng hạng',
    description: 'Thưởng thức tinh hoa ẩm thực địa phương và quốc tế được chế biến bởi các đầu bếp hàng đầu.',
  },
  {
    icon: Waves,
    title: 'Spa & Thư giãn',
    description: 'Tái tạo năng lượng với các liệu trình massage chuyên sâu và không gian xông hơi yên tĩnh.',
  },
  {
    icon: Dumbbell,
    title: 'Phòng Gym Hiện đại',
    description: 'Duy trì thói quen tập luyện với hệ thống thiết bị nhập khẩu cao cấp trong không gian thoáng đãng.',
  },
  {
    icon: Car,
    title: 'Đưa đón Sân bay',
    description: 'Dịch vụ xe riêng sang trọng đảm bảo sự thoải mái và đúng giờ cho hành trình của quý khách.',
  },
  {
    icon: Sparkles,
    title: 'Dịch vụ Buồng phòng',
    description: 'Sự chăm sóc tỉ mỉ hàng ngày giúp không gian lưu trú của quý khách luôn sạch sẽ và thơm mát.',
  },
];

const formatCurrency = (value?: number | null) =>
  Number(value || 0).toLocaleString('vi-VN') + ' đ';

const formatDate = (value?: string | null) =>
  value ? dayjs(value).format('DD/MM/YYYY') : '--';

const isCheckedInBooking = (status: string | number) => {
  const s = String(status).toLowerCase();
  return s === '2' || s === 'checkedin';
};

const Services: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const [servicesData, setServicesData] = useState<ServiceDto[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryDto[]>([]);
  const [bookings, setBookings] = useState<BookingResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [orderingService, setOrderingService] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [selectedBookingDetailId, setSelectedBookingDetailId] = useState<number | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});

  useEffect(() => {
    Promise.all([serviceOrderApi.getCategories(), serviceOrderApi.getServices()])
      .then(([cats, svcs]) => {
        setCategories(cats);
        setServicesData(svcs);
      })
      .catch(() => {
        message.error('Không thể tải danh sách dịch vụ.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setBookings([]);
      setSelectedBookingId(null);
      setSelectedBookingDetailId(null);
      setCart({});
      return;
    }

    setBookingLoading(true);
    bookingApi
      .getMyBookings()
      .then((data) => setBookings(data))
      .catch(() => {
        message.error('Không thể tải thông tin đặt phòng của bạn.');
      })
      .finally(() => setBookingLoading(false));
  }, [isAuthenticated]);

  const activeBookings = useMemo(
    () => bookings.filter((booking) => isCheckedInBooking(booking.status)),
    [bookings]
  );

  const selectedBooking = useMemo(
    () => activeBookings.find((booking) => booking.id === selectedBookingId) || activeBookings[0] || null,
    [activeBookings, selectedBookingId]
  );

  const selectedBookingDetails = selectedBooking?.details || [];

  useEffect(() => {
    if (!selectedBooking) {
      setSelectedBookingId(null);
      setSelectedBookingDetailId(null);
      return;
    }

    setSelectedBookingId(selectedBooking.id);
    setSelectedBookingDetailId((current) => {
      const exists = selectedBookingDetails.some((detail) => detail.id === current);
      return exists ? current : selectedBookingDetails[0]?.id || null;
    });
  }, [selectedBooking, selectedBookingDetails]);

  const addToCart = (serviceId: number, change: number) => {
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

  const cartCount = useMemo(
    () => Object.values(cart).reduce((sum, value) => sum + value, 0),
    [cart]
  );

  const cartTotal = useMemo(
    () =>
      Object.entries(cart).reduce((sum, [serviceId, quantity]) => {
        const service = servicesData.find((item) => item.id === Number(serviceId));
        return sum + (service?.price || 0) * quantity;
      }, 0),
    [cart, servicesData]
  );

  const handleSubmitOrder = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!selectedBookingDetailId) {
      message.warning('Vui lòng chọn phòng đang lưu trú.');
      return;
    }

    if (cartCount === 0) {
      message.warning('Vui lòng chọn ít nhất một dịch vụ.');
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

      message.success('Yêu cầu dịch vụ đã được gửi thành công.');
      setCart({});
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể gửi yêu cầu dịch vụ.');
    } finally {
      setOrderingService(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] pb-24">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-dark-base">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-primary text-xs font-black uppercase tracking-[0.4em] mb-6 block"
          >
            Trải nghiệm Đặc quyền
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-display font-bold text-white mb-8 leading-tight"
          >
            Dịch vụ Hoàn hảo <br/> <span className="text-primary italic">Tại KANT Hotel</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/60 max-w-2xl mx-auto text-lg font-light leading-relaxed mb-16"
          >
            Chúng tôi tận tâm mang đến những dịch vụ đẳng cấp nhất, đảm bảo mỗi giây phút lưu trú của quý khách đều trở nên đáng nhớ và trọn vẹn.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {heroServices.map((service, index) => {
              const Icon = service.icon;
              return (
                <motion.div
                  key={service.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] text-left hover:bg-white/10 transition-all duration-500 group"
                >
                  <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                    <Icon size={28} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-display font-bold text-white mb-4">{service.title}</h3>
                  <p className="text-white/50 font-light leading-relaxed text-sm">{service.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Booking Selection & Cart */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Order Selector */}
          <div className="lg:col-span-2 glass-card p-8 md:p-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <ShoppingBag size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold text-[var(--text-title)]">Đặt dịch vụ tại phòng</h2>
                <p className="text-[var(--text-muted)] text-sm mt-1">Yêu cầu dịch vụ nhanh chóng cho phòng bạn đang ở.</p>
              </div>
            </div>

            {!isAuthenticated ? (
              <div className="bg-subtle rounded-3xl p-8 text-center border border-dashed border-luxury/20">
                <p className="text-title font-bold mb-2">Quý khách chưa đăng nhập</p>
                <p className="text-muted text-sm mb-6">Vui lòng đăng nhập để sử dụng tính năng đặt dịch vụ trực tuyến.</p>
                <div className="flex justify-center gap-4">
                  <Button type="primary" className="btn-gold h-11 px-8" onClick={() => navigate('/login')}>Đăng nhập</Button>
                  <Button className="h-11 px-8 rounded-xl" onClick={() => navigate('/rooms')}>Xem phòng</Button>
                </div>
              </div>
            ) : bookingLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
            ) : activeBookings.length === 0 ? (
              <div className="bg-[var(--bg-subtle)] rounded-3xl p-8 text-center border border-dashed border-[var(--border-color)]">
                <Hotel className="mx-auto mb-4 text-primary/40" size={40} />
                <p className="text-[var(--text-title)] font-bold mb-2">Không tìm thấy thông tin lưu trú</p>
                <p className="text-[var(--text-muted)] text-sm mb-6">Tính năng đặt dịch vụ chỉ khả dụng sau khi quý khách đã làm thủ tục nhận phòng.</p>
                <Button type="primary" className="btn-gold h-11 px-8" onClick={() => navigate('/profile')}>Xem lịch sử đặt phòng</Button>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted ml-1">Mã đặt phòng</label>
                    <Select
                      className="w-full h-12"
                      value={selectedBookingId}
                      onChange={(val) => { setSelectedBookingId(val); setCart({}); }}
                      options={activeBookings.map(b => ({
                        value: b.id,
                        label: `${b.bookingCode} (${formatDate(b.details[0]?.checkInDate)})`
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted ml-1">Phòng yêu cầu</label>
                    <Select
                      className="w-full h-12"
                      value={selectedBookingDetailId}
                      onChange={setSelectedBookingDetailId}
                      options={selectedBookingDetails.map(d => ({
                        value: d.id,
                        label: `Phòng ${d.roomId || '---'}`
                      }))}
                    />
                  </div>
                </div>

                <div className="bg-[var(--bg-main)] rounded-3xl p-6 border border-[var(--border-color)] flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <CheckCircle2 className="text-green-500" size={24} />
                    <div>
                      <p className="text-[var(--text-title)] font-bold text-sm">Trạng thái: Đang lưu trú</p>
                      <p className="text-[var(--text-muted)] text-xs mt-0.5">Phí dịch vụ sẽ được cộng vào hóa đơn cuối cùng.</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-muted uppercase tracking-widest">Tiền cọc còn lại</p>
                    <p className="text-rose-500 font-bold text-lg">{formatCurrency(selectedBooking?.depositRemainingAmount)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cart Summary */}
          <div className="glass-card p-8 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-display font-bold text-[var(--text-title)]">Yêu cầu của bạn</h3>
              <Badge count={cartCount} className="bg-primary" />
            </div>

            <div className="flex-1 space-y-4 mb-8 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {Object.entries(cart).length === 0 ? (
                <Empty description="Chưa chọn dịch vụ" className="mt-8" />
              ) : (
                Object.entries(cart).map(([serviceId, quantity]) => {
                  const service = servicesData.find(s => s.id === Number(serviceId));
                  if (!service) return null;
                  return (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }}
                      key={serviceId} 
                      className="flex items-center justify-between p-4 bg-[var(--bg-subtle)] rounded-2xl"
                    >
                      <div className="flex-1">
                        <p className="font-bold text-sm text-[var(--text-title)]">{service.name}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">{quantity} x {formatCurrency(service.price)}</p>
                      </div>
                      <p className="font-bold text-primary text-sm">{formatCurrency(service.price * quantity)}</p>
                    </motion.div>
                  );
                })
              )}
            </div>

            <div className="pt-6 border-t border-luxury/5">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[var(--text-muted)] font-bold uppercase text-[10px] tracking-widest">Tạm tính</span>
                <span className="text-2xl font-display font-bold text-primary">{formatCurrency(cartTotal)}</span>
              </div>
              <Button
                type="primary"
                block
                className="btn-gold h-14 rounded-2xl text-xs font-black uppercase tracking-widest"
                loading={orderingService}
                disabled={!isAuthenticated || !selectedBookingDetailId || cartCount === 0}
                onClick={handleSubmitOrder}
              >
                Gửi yêu cầu dịch vụ
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Menu Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <div className="text-center mb-16">
          <span className="text-primary text-[10px] font-black uppercase tracking-[0.4em] mb-4 block">Thực đơn & Tiện ích</span>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-[var(--text-title)]">Menu Dịch vụ</h2>
          <div className="w-20 h-0.5 bg-primary mx-auto mt-6" />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8"><Skeleton active /><Skeleton active /></div>
        ) : (
          <div className="space-y-20">
            {categories.map((category) => {
              const categoryServices = servicesData.filter(s => s.categoryId === category.id);
              if (categoryServices.length === 0) return null;

              return (
                <div key={category.id}>
                  <div className="flex items-center gap-6 mb-10">
                    <h3 className="text-2xl font-display font-bold text-primary shrink-0">{category.name}</h3>
                    <div className="h-px bg-[var(--border-color)] flex-1" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {categoryServices.map((service) => (
                      <motion.div
                        whileHover={{ y: -4 }}
                        key={service.id}
                        className="bg-[var(--card-bg)] border border-[var(--border-color)] p-6 rounded-3xl flex items-center justify-between group hover:shadow-xl hover:shadow-black/5 transition-all duration-300"
                      >
                        <div className="flex-1">
                          <h4 className="font-bold text-[var(--text-title)] group-hover:text-primary transition-colors">{service.name}</h4>
                          <p className="text-xs text-[var(--text-muted)] mt-2 font-light">
                            {service.unit ? `Đơn vị: ${service.unit}` : 'Dịch vụ lẻ'}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                          <p className="font-bold text-primary">{formatCurrency(service.price)}</p>
                          <div className="flex items-center gap-3 bg-[var(--bg-subtle)] p-1 rounded-xl">
                            <button 
                              onClick={() => addToCart(service.id, -1)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--card-bg)] text-[var(--text-muted)] transition-colors"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-6 text-center font-bold text-sm text-[var(--text-title)]">{cart[service.id] || 0}</span>
                            <button 
                              onClick={() => addToCart(service.id, 1)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--card-bg)] text-[var(--text-muted)] transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default Services;
