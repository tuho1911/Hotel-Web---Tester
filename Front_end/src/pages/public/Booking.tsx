import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowLeft, ArrowRight, Calendar, CheckCircle2, Loader2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { publicHotelApi, PublicRoomType } from '../../services/publicHotelApi';
import { bookingApi, AvailableRoomDto } from '../../services/bookingApi';
import { voucherApi, VoucherResponseDto } from '../../services/voucherApi';

type PaymentMethod = 'pay_at_hotel' | 'bank_transfer' | 'momo';

const PAYMENT_METHOD_OPTIONS: Array<{
  value: PaymentMethod;
  title: string;
  description: string;
}> = [
  {
    value: 'pay_at_hotel',
    title: 'Thanh toán tại khách sạn',
    description: 'Booking được tạo ngay và thanh toán sau tại quầy.',
  },
  {
    value: 'bank_transfer',
    title: 'Chuyển khoản thủ công',
    description: 'Tạo booking trước, sau đó liên hệ chuyển khoản và đợi nhân viên xác nhận.',
  },
  {
    value: 'momo',
    title: 'MoMo',
    description: 'Hệ thống sẽ mở trang MoMo khi bạn chủ động bấm thanh toán.',
  },
];

const Booking: React.FC = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  const [allRoomTypes, setAllRoomTypes] = useState<PublicRoomType[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<{ roomTypeId: number; quantity: number; roomIds: (number | null)[] }[]>([
    { roomTypeId: Number(roomId), quantity: 1, roomIds: [null] },
  ]);

  const [availableRoomsCache, setAvailableRoomsCache] = useState<Record<string, AvailableRoomDto[]>>({});
  const [loadingAvailableRooms, setLoadingAvailableRooms] = useState<Record<string, boolean>>({});

  const fetchAvailableRooms = async (roomTypeId: number, checkIn: string, checkOut: string) => {
    const key = `${roomTypeId}_${checkIn}_${checkOut}`;
    if (availableRoomsCache[key] !== undefined || loadingAvailableRooms[key]) return;
    setLoadingAvailableRooms(prev => ({ ...prev, [key]: true }));
    try {
      const res = await bookingApi.getAvailableRooms(
        new Date(checkIn).toISOString(),
        new Date(checkOut).toISOString(),
        roomTypeId
      );
      setAvailableRoomsCache(prev => ({ ...prev, [key]: res }));
    } catch {
      setAvailableRoomsCache(prev => ({ ...prev, [key]: [] }));
    } finally {
      setLoadingAvailableRooms(prev => ({ ...prev, [key]: false }));
    }
  };
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [launchingPayment, setLaunchingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [bookingCode, setBookingCode] = useState('');
  const [createdBookingId, setCreatedBookingId] = useState<number | null>(null);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pay_at_hotel');
  const [depositInput, setDepositInput] = useState('0');
  const [vouchers, setVouchers] = useState<VoucherResponseDto[]>([]);
  const [formData, setFormData] = useState({
    checkIn: '',
    checkOut: '',
    guests: 1,
    depositAmount: 0,
    voucherId: null as number | null,
    fullName: user?.fullName || user?.name || '',
    email: user?.email || '',
    phone: '',
    specialRequests: '',
  });

  const nights = useMemo(() => {
    if (!formData.checkIn || !formData.checkOut) return 0;
    const start = new Date(formData.checkIn);
    const end = new Date(formData.checkOut);
    const diff = end.getTime() - start.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [formData.checkIn, formData.checkOut]);

  const totalRoomPrice = useMemo(() => {
    let total = 0;
    for (const sr of selectedRooms) {
      const rt = allRoomTypes.find((x) => x.id === sr.roomTypeId);
      if (rt) {
        total += nights * sr.quantity * (rt.displayPrice || 0);
      }
    }
    return total;
  }, [nights, selectedRooms, allRoomTypes]);

  const totalRoomsCount = useMemo(
    () => selectedRooms.reduce((acc, curr) => acc + curr.quantity, 0),
    [selectedRooms]
  );

  const discountAmount = useMemo(() => {
    if (!formData.voucherId || !vouchers.length) return 0;
    const voucher = vouchers.find((x) => x.id === formData.voucherId);
    if (!voucher || totalRoomPrice < voucher.minBookingAmount) return 0;

    let discount = 0;
    if (voucher.discountType === 'Percentage') {
      discount = (totalRoomPrice * voucher.discountValue) / 100;
      if (voucher.maxDiscountAmount && discount > voucher.maxDiscountAmount) {
        discount = voucher.maxDiscountAmount;
      }
    } else {
      discount = voucher.discountValue;
    }
    return discount;
  }, [formData.voucherId, vouchers, totalRoomPrice]);

  const finalTotal = useMemo(() => Math.max(0, totalRoomPrice - discountAmount), [totalRoomPrice, discountAmount]);
  const normalizedDepositAmount = useMemo(
    () => Math.min(Math.max(0, formData.depositAmount || 0), finalTotal),
    [finalTotal, formData.depositAmount]
  );
  const remainingAmount = useMemo(
    () => Math.max(0, finalTotal - normalizedDepositAmount),
    [finalTotal, normalizedDepositAmount]
  );

  useEffect(() => {
    setDepositInput(normalizedDepositAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."));
  }, [normalizedDepositAmount]);

  useEffect(() => {
    const id = Number(roomId);
    if (!id) {
      setError('Loại phòng không hợp lệ');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const membershipId = Number((user as any)?.membershipId || (user as any)?.membership?.id || 0) || 0;
        const [roomsData, voucherList] = await Promise.all([
          publicHotelApi.getRoomTypes(),
          membershipId > 0
            ? voucherApi.getVip(membershipId).catch(() => [])
            : voucherApi.getPublic().catch(() => []),
        ]);
        setAllRoomTypes(roomsData);

        const validInitial = roomsData.find((room) => room.id === id) ? id : roomsData[0]?.id || 0;
        setSelectedRooms([{ roomTypeId: validInitial, quantity: 1, roomIds: [null] }]);

        setFormData((current) => ({
          ...current,
          guests: Math.max(1, current.guests),
        }));

        const activeVouchers = voucherList.filter(
          (voucher) => voucher.isActive && new Date(voucher.endDate).getTime() >= new Date().getTime()
        );
        setVouchers(activeVouchers);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Không thể tải thông tin phòng');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [roomId]);

  // Reset/resize roomIds when checkIn, checkOut, or quantity changes
  useEffect(() => {
    setSelectedRooms(prev => prev.map(sr => {
      // Resize to match quantity, preserving existing selections up to the new length
      const newRoomIds = Array(sr.quantity).fill(null);
      for (let i = 0; i < Math.min(sr.quantity, sr.roomIds.length); i++) {
        newRoomIds[i] = sr.roomIds[i];
      }
      return { ...sr, roomIds: newRoomIds };
    }));
  }, [formData.checkIn, formData.checkOut]);

  const canContinue = useMemo(() => {
    return Boolean(
      formData.checkIn &&
        formData.checkOut &&
        nights > 0 &&
        formData.fullName &&
        formData.email &&
        formData.phone &&
        selectedRooms.length > 0 &&
        selectedRooms.every((sr) => sr.roomTypeId && sr.quantity > 0)
    );
  }, [formData, nights, selectedRooms]);

  const commitDepositAmount = (rawValue: string) => {
    const cleanValue = rawValue.replace(/\./g, "");
    if (!cleanValue.trim()) {
      setFormData((current) => ({ ...current, depositAmount: 0 }));
      setDepositInput('0');
      return;
    }

    const numericValue = Number(cleanValue);
    if (Number.isNaN(numericValue)) {
      setDepositInput(normalizedDepositAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."));
      return;
    }

    setFormData((current) => ({
      ...current,
      depositAmount: Math.min(Math.max(0, numericValue), finalTotal),
    }));
  };

  const handleDepositChange = (value: string) => {
    const cleanValue = value.replace(/\./g, "");
    if (cleanValue === '') {
      setDepositInput('');
      return;
    }

    if (!/^\d+$/.test(cleanValue)) {
      return;
    }

    const formatted = cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    setDepositInput(formatted);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedRooms.length === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const detailsPayload = selectedRooms.flatMap((sr) => {
        const rt = allRoomTypes.find((x) => x.id === sr.roomTypeId);
        return Array.from({ length: sr.quantity }).map((_, roomIndex) => ({
          roomTypeId: sr.roomTypeId,
          roomId: sr.roomIds?.[roomIndex] || undefined,
          checkInDate: new Date(formData.checkIn).toISOString(),
          checkOutDate: new Date(formData.checkOut).toISOString(),
          pricePerNight: rt?.displayPrice || 0,
        }));
      });

      const booking = await bookingApi.create({
        userId: user?.id && Number(user.id) > 0 ? Number(user.id) : undefined,
        guestName: formData.fullName,
        guestEmail: formData.email,
        guestPhone: formData.phone,
        voucherId: formData.voucherId || undefined,
        depositAmount: normalizedDepositAmount,
        details: detailsPayload,
      });

      setCreatedBookingId(booking.id);
      setCreatedInvoiceId(booking.invoiceId || null);
      setBookingCode(booking.bookingCode);
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tạo booking');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProceedToMoMo = async () => {
    if (!createdInvoiceId || normalizedDepositAmount <= 0) {
      return;
    }

    setLaunchingPayment(true);
    setError(null);

    try {
      const momoRes = await bookingApi.createMoMoPayment(
        createdInvoiceId,
        normalizedDepositAmount,
        `Thanh toán cọc booking ${bookingCode}`
      );

      if (momoRes.payUrl) {
        window.location.href = momoRes.payUrl;
        return;
      }

      setError('Không tạo được liên kết thanh toán MoMo.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tạo thanh toán MoMo');
    } finally {
      setLaunchingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted">
        <Loader2 className="mr-3 h-6 w-6 animate-spin text-primary" />
        Đang tải phòng...
      </div>
    );
  }

  if ((allRoomTypes.length === 0 || error) && step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="admin-card max-w-xl w-full flex items-center gap-3 text-error">
          <AlertCircle size={20} />
          <span>{error || 'Không tìm thấy loại phòng nào phù hợp'}</span>
        </div>
      </div>
    );
  }

  const primaryRoomType = allRoomTypes.find((rt) => rt.id === selectedRooms[0]?.roomTypeId) || allRoomTypes[0];
  const selectedPaymentOption =
    PAYMENT_METHOD_OPTIONS.find((option) => option.value === paymentMethod) || PAYMENT_METHOD_OPTIONS[0];

  return (
    <div className="bg-[var(--bg-main)] min-h-screen py-20">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => (step === 1 ? navigate(-1) : setStep(step - 1))}
            className="inline-flex items-center gap-2 rounded-full border border-luxury bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold text-title transition hover:border-primary hover:text-primary"
          >
            <ArrowLeft size={16} />
            Quay lại
          </button>
        </div>

        <div className="flex items-center justify-between mb-16 relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-luxury -translate-y-1/2 z-0" />
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all duration-500 ${
                step >= s
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'bg-[var(--card-bg)] text-muted border border-luxury'
              }`}
            >
              {step > s ? <CheckCircle2 size={24} /> : s}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card"
            >
              <h2 className="text-3xl font-display font-bold text-title mb-2">Reservation Details</h2>
              <p className="text-muted mb-8">You are booking multiple rooms from the live hotel system.</p>

              <div className="flex flex-col lg:flex-row gap-10 mb-10">
                <div className="lg:w-1/3">
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                    <img
                      src={primaryRoomType?.primaryImage}
                      alt={primaryRoomType?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted">Avg Price / Night</span>
                      <span className="text-primary font-bold">
                        {primaryRoomType?.displayPrice.toLocaleString('vi-VN')} VND
                      </span>
                    </div>
                  </div>
                </div>

                <div className="lg:w-2/3 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-muted uppercase tracking-widest">Check-in Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={20} />
                        <input
                          type="date"
                          className="input-luxury w-full pl-12"
                          value={formData.checkIn}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => {
                            const newCheckIn = e.target.value;
                            setFormData((prev) => ({
                              ...prev,
                              checkIn: newCheckIn,
                              checkOut: prev.checkOut && prev.checkOut <= newCheckIn ? '' : prev.checkOut,
                            }));
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-muted uppercase tracking-widest">Check-out Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={20} />
                        <input
                          type="date"
                          className="input-luxury w-full pl-12"
                          value={formData.checkOut}
                          min={
                            formData.checkIn
                              ? new Date(new Date(formData.checkIn).getTime() + 86400000).toISOString().split('T')[0]
                              : new Date().toISOString().split('T')[0]
                          }
                          onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-luxury">
                    <label className="text-sm font-bold text-muted uppercase tracking-widest">Select Rooms</label>
                    {selectedRooms.map((sr, index) => {
                      const checkInStr = formData.checkIn ? `${formData.checkIn}T14:00:00` : null;
                      const checkOutStr = formData.checkOut ? `${formData.checkOut}T12:00:00` : null;
                      const cacheKey = sr.roomTypeId && checkInStr && checkOutStr ? `${sr.roomTypeId}_${checkInStr}_${checkOutStr}` : null;
                      
                      // Trigger fetch when parameters are ready
                      if (sr.roomTypeId && checkInStr && checkOutStr && cacheKey && availableRoomsCache[cacheKey] === undefined && !loadingAvailableRooms[cacheKey]) {
                        void fetchAvailableRooms(sr.roomTypeId, checkInStr, checkOutStr);
                      }

                      const available = cacheKey ? (availableRoomsCache[cacheKey] ?? []) : [];
                      const isLoading = cacheKey ? (loadingAvailableRooms[cacheKey] ?? false) : false;

                      return (
                        <div
                          key={index}
                          className="flex flex-col gap-4 bg-[var(--bg-main)] p-4 rounded-xl border border-luxury relative"
                        >
                          <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                            <select
                              className="input-luxury flex-1 w-full"
                              value={sr.roomTypeId}
                              onChange={(e) => {
                                const newTypeId = Number(e.target.value);
                                const newArr = [...selectedRooms];
                                newArr[index].roomTypeId = newTypeId;
                                newArr[index].roomIds = Array(sr.quantity).fill(null);
                                setSelectedRooms(newArr);
                              }}
                            >
                              {allRoomTypes.map((rt) => (
                                <option key={rt.id} value={rt.id}>
                                  {rt.name} - {rt.displayPrice.toLocaleString('vi-VN')}VND/night
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <select
                                className="input-luxury w-full sm:w-32"
                                value={sr.quantity}
                                onChange={(e) => {
                                  const newQty = Number(e.target.value);
                                  const newArr = [...selectedRooms];
                                  newArr[index].quantity = newQty;
                                  
                                  const newRoomIds = Array(newQty).fill(null);
                                  for (let i = 0; i < Math.min(newQty, sr.roomIds.length); i++) {
                                    newRoomIds[i] = sr.roomIds[i];
                                  }
                                  newArr[index].roomIds = newRoomIds;
                                  setSelectedRooms(newArr);
                                }}
                              >
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                  <option key={num} value={num}>
                                    {num} Room{num > 1 ? 's' : ''}
                                  </option>
                                ))}
                              </select>
                              {selectedRooms.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedRooms(selectedRooms.filter((_, i) => i !== index))}
                                  className="text-error font-bold p-3 hover:bg-error/10 rounded-lg shrink-0"
                                >
                                  x
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Specific Room selection dropdowns for each room */}
                          {sr.quantity > 0 && formData.checkIn && formData.checkOut && (
                            <div className="pl-4 border-l-2 border-primary/20 space-y-3">
                              <div className="text-xs font-bold text-muted uppercase tracking-wider flex items-center justify-between">
                                <span>Chọn phòng cụ thể (Tùy chọn)</span>
                                {isLoading && <span className="text-xs text-primary animate-pulse">Đang tải phòng...</span>}
                              </div>
                              {isLoading ? (
                                <div className="text-sm text-muted animate-pulse">Đang tìm phòng trống...</div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {Array.from({ length: sr.quantity }).map((_, roomIndex) => {
                                    // Loại trừ các phòng đã được chọn ở bất kỳ vị trí nào khác trong toàn bộ form đặt phòng
                                    const allSelectedRoomIds = selectedRooms.flatMap((row, rIdx) =>
                                      row.roomIds.filter((id, qIdx) => !(rIdx === index && qIdx === roomIndex) && id !== null)
                                    );
                                    const unselectedRooms = available.filter(r => !allSelectedRoomIds.includes(r.id));

                                    return (
                                      <div key={roomIndex} className="flex flex-col gap-1">
                                        <span className="text-[11px] text-muted font-semibold">Phòng {roomIndex + 1}:</span>
                                        <select
                                          className="input-luxury text-sm py-1.5 px-3"
                                          value={sr.roomIds[roomIndex] ?? ''}
                                          onChange={(e) => {
                                            const val = e.target.value ? Number(e.target.value) : null;
                                            const newArr = [...selectedRooms];
                                            newArr[index].roomIds[roomIndex] = val;
                                            setSelectedRooms(newArr);
                                          }}
                                        >
                                          <option value="">Tự động chọn phòng trống</option>
                                          {unselectedRooms.map(r => (
                                            <option key={r.id} value={r.id}>
                                              Phòng {r.roomNumber} (Tầng {r.floor}) {r.cleaningStatus === 'Clean' ? '✓' : ''}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedRooms([...selectedRooms, { roomTypeId: allRoomTypes[0]?.id || 0, quantity: 1, roomIds: [null] }])
                      }
                      className="text-primary font-bold text-sm hover:underline flex items-center"
                    >
                      + Add another room type
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-luxury">
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-muted uppercase tracking-widest">Voucher / Promo Code</label>
                      <select
                        className="input-luxury w-full"
                        value={formData.voucherId || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, voucherId: e.target.value ? Number(e.target.value) : null })
                        }
                      >
                        <option value="">No voucher applied</option>
                        {vouchers.map((voucher) => (
                          <option
                            key={voucher.id}
                            value={voucher.id}
                            disabled={totalRoomPrice < voucher.minBookingAmount}
                          >
                            {voucher.code} -{' '}
                            {voucher.discountType === 'Percentage'
                              ? `${voucher.discountValue}%`
                              : `${voucher.discountValue.toLocaleString('vi-VN')}VND`}{' '}
                            {totalRoomPrice < voucher.minBookingAmount ? '(Chưa đủ ĐK)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-muted uppercase tracking-widest">Deposit Amount (VND)</label>
                      <input
                        type="text"
                        className="input-luxury w-full"
                        value={depositInput}
                        onChange={(e) => handleDepositChange(e.target.value)}
                        onBlur={(e) => commitDepositAmount(e.target.value)}
                      />
                      <p className="text-xs text-muted">
                        Nhập tiền cọc từ 0 đến {finalTotal.toLocaleString('vi-VN')} VND. Hệ thống sẽ tự động giới hạn theo tổng giá trị booking.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6 pt-6 border-t border-luxury">
                    <h3 className="text-xl font-bold text-title">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted uppercase">Full Name</label>
                        <input
                          type="text"
                          className="input-luxury w-full"
                          placeholder="Your Name"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted uppercase">Email Address</label>
                        <input
                          type="email"
                          className="input-luxury w-full"
                          placeholder="your@email.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-bold text-muted uppercase">Phone Number</label>
                        <input
                          type="tel"
                          className="input-luxury w-full"
                          placeholder="e.g. +84 123 456 789"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!canContinue}
                className="btn-gold w-full py-4 text-lg flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
              >
                CONTINUE TO CONFIRMATION <ArrowRight size={20} className="ml-2" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.form
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card"
              onSubmit={handleSubmit}
            >
              <h2 className="text-3xl font-display font-bold text-title mb-8">Confirm Booking</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="space-y-6">
                  <div className="admin-card !p-6">
                    <h3 className="text-sm font-bold text-muted uppercase mb-4 tracking-widest">Guest Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Name</span>
                        <span className="font-semibold text-title">{formData.fullName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Email</span>
                        <span className="font-semibold text-title">{formData.email}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Phone</span>
                        <span className="font-semibold text-title">{formData.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="admin-card !p-6">
                    <h3 className="text-sm font-bold text-muted uppercase mb-4 tracking-widest">Stay Details</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Check-in</span>
                        <span className="font-semibold text-title">{formData.checkIn}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Check-out</span>
                        <span className="font-semibold text-title">{formData.checkOut}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Total Nights</span>
                        <span className="font-semibold text-primary">
                          {nights} Night{nights > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Total Rooms</span>
                        <span className="font-semibold text-primary">
                          {totalRoomsCount} Room{totalRoomsCount > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="admin-card !p-6 bg-primary/5 border-primary/20">
                    <h3 className="text-sm font-bold text-muted uppercase mb-4 tracking-widest text-primary">
                      Price Summary
                    </h3>
                    <div className="space-y-4">
                      {selectedRooms.map((sr, idx) => {
                        const rt = allRoomTypes.find((x) => x.id === sr.roomTypeId);
                        if (!rt) return null;
                        const lineTotal = nights * sr.quantity * rt.displayPrice;
                        return (
                          <div key={idx} className="flex justify-between text-sm border-b border-luxury pb-2">
                            <span className="text-muted">
                              {rt.name} x {nights} nights x {sr.quantity} rooms
                            </span>
                            <span className="font-semibold text-title">{lineTotal.toLocaleString('vi-VN')} VND</span>
                          </div>
                        );
                      })}
                      <div className="flex justify-between text-sm pt-2">
                        <span className="font-bold text-title">Rooms Total</span>
                        <span className="font-bold text-title">{totalRoomPrice.toLocaleString('vi-VN')} VND</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-success">
                          <span>Voucher Discount</span>
                          <span className="font-semibold">-{discountAmount.toLocaleString('vi-VN')} VND</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm text-warning">
                        <span>Deposit Planned</span>
                        <span className="font-semibold">-{normalizedDepositAmount.toLocaleString('vi-VN')} VND</span>
                      </div>
                      <div className="pt-4 border-t border-primary/10 flex justify-between items-center">
                        <span className="text-lg font-bold text-title">Amount Due</span>
                        <span className="text-2xl font-display font-bold text-primary">
                          {remainingAmount.toLocaleString('vi-VN')} VND
                        </span>
                      </div>
                      <p className="text-[10px] text-muted text-center italic">
                        Booking sẽ được tạo trước. Bạn tự chọn cách thanh toán ở bước tiếp theo.
                      </p>
                    </div>
                  </div>

                  <div className="admin-card !p-6">
                    <h3 className="text-sm font-bold text-muted uppercase mb-4 tracking-widest">Payment Preference</h3>
                    <div className="space-y-3">
                      {PAYMENT_METHOD_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setPaymentMethod(option.value)}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            paymentMethod === option.value
                              ? 'border-primary bg-primary/10 shadow-sm'
                              : 'border-luxury bg-[var(--card-bg)] hover:border-primary/50'
                          }`}
                        >
                          <div className="font-semibold text-title">{option.title}</div>
                          <div className="mt-1 text-sm text-muted">{option.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-6 rounded-xl text-sm status-error">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <button type="button" onClick={() => setStep(1)} className="btn-outline-gold flex-grow py-4">
                  BACK
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  onClick={() => commitDepositAmount(depositInput)}
                  className="btn-gold flex-grow py-4"
                >
                  {submitting ? 'CREATING BOOKING...' : 'CONFIRM BOOKING'}
                </button>
              </div>
            </motion.form>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card text-center"
            >
              <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center text-white mx-auto mb-8 shadow-xl shadow-primary/20">
                <CheckCircle2 size={48} />
              </div>
              <h2 className="text-4xl font-display font-bold text-title mb-4">Booking Confirmed</h2>
              <p className="text-muted text-lg mb-10 max-w-2xl mx-auto">
                Reservation for <strong>{totalRoomsCount} rooms</strong> has been created successfully. Bạn đã chọn{' '}
                <strong>{selectedPaymentOption.title}</strong> cho bước thanh toán tiếp theo.
              </p>

              <div className="admin-card !p-6 mb-6 text-left space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Booking Code:</span>
                  <span className="text-primary font-bold">{bookingCode}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Booking ID:</span>
                  <span className="text-title">{createdBookingId ?? '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Check-in:</span>
                  <span className="text-title">{formData.checkIn}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Check-out:</span>
                  <span className="text-title">{formData.checkOut}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Tổng giá trị:</span>
                  <span className="text-title">{finalTotal.toLocaleString('vi-VN')} VND</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Tiền cọc:</span>
                  <span className="text-title">{normalizedDepositAmount.toLocaleString('vi-VN')} VND</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Còn lại:</span>
                  <span className="text-title font-bold">{remainingAmount.toLocaleString('vi-VN')} VND</span>
                </div>
              </div>

              <div className="admin-card !p-6 mb-10 text-left">
                <h3 className="text-lg font-bold text-title mb-3">Thanh toán sau khi tạo booking</h3>
                <p className="text-sm text-muted mb-4">{selectedPaymentOption.description}</p>

                {normalizedDepositAmount <= 0 ? (
                  <div className="status-success">
                    Booking này không có tiền cọc bắt buộc, bạn có thể thanh toán phần còn lại sau.
                  </div>
                ) : paymentMethod === 'momo' ? (
                  <div className="space-y-4">
                    <div className="status-warning">
                      Hệ thống sẽ chuyển hướng đến trang thanh toán MoMo khi bạn bấm nút bên dưới.
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleProceedToMoMo()}
                      disabled={launchingPayment || !createdInvoiceId}
                      className="btn-gold w-full py-4 disabled:opacity-60"
                    >
                      {launchingPayment ? 'ĐANG MỞ MOMO...' : `THANH TOÁN MOMO ${normalizedDepositAmount.toLocaleString('vi-VN')} VND`}
                    </button>
                  </div>
                ) : paymentMethod === 'bank_transfer' ? (
                  <div className="status-info">
                    Booking đã được tạo. Vui lòng chuyển khoản thủ công và báo nhân viên xác nhận.
                  </div>
                ) : (
                  <div className="bg-subtle border border-luxury p-4 rounded-xl text-muted text-sm">
                    Booking đã được tạo. Bạn có thể thu tiền cọc tại quầy hoặc bỏ qua bước thanh toán online.
                  </div>
                )}
              </div>

              {error && (
                <div className="mb-6 rounded-xl text-sm status-error">
                  {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={() => navigate('/profile')} className="btn-gold px-10 py-4">
                  VIEW MY PROFILE
                </button>
                <button onClick={() => navigate('/rooms')} className="btn-outline-gold px-10 py-4">
                  BOOK ANOTHER ROOM
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Booking;
