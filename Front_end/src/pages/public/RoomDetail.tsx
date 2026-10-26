import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle, ArrowLeft, Bed, CheckCircle2, ChevronLeft, ChevronRight,
  Loader2, Maximize, Shield, Star, Users,
} from 'lucide-react';
import { publicHotelApi, type PublicRoomType } from '../../services/publicHotelApi';
import { reviewApi, type ReviewDto } from '../../services/reviewApi';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

const FALLBACK =
  'https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1600&auto=format&fit=crop';

const RoomDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [room, setRoom] = useState<PublicRoomType | null>(null);
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImg, setActiveImg] = useState(0);

  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', guestName: user?.fullName || user?.name || '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMsg, setReviewMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    const roomId = Number(id);
    if (!roomId) { setError('Loại phòng không hợp lệ'); setLoading(false); return; }
    
    const loadAll = async () => {
      try {
        const [roomData, reviewData] = await Promise.all([
          publicHotelApi.getRoomTypeById(roomId),
          reviewApi.getReviews('RoomType', roomId).catch(() => ({ reviews: [], averageRating: 0, totalReviews: 0 }))
        ]);
        setRoom(roomData);
        setReviews(reviewData.reviews);
        setAvgRating(reviewData.averageRating);
        setTotalReviews(reviewData.totalReviews);
        setActiveImg(0);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Không tìm thấy thông tin phòng');
      } finally {
        setLoading(false);
      }
    };
    
    loadAll();
  }, [id]);

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewSubmitting(true);
    setReviewMsg({ type: '', text: '' });
    try {
      await reviewApi.createReview({
        targetType: 'RoomType',
        targetId: Number(id),
        rating: reviewForm.rating,
        comment: reviewForm.comment,
        guestName: reviewForm.guestName
      });
      setReviewMsg({ type: 'success', text: 'Cảm ơn bạn! Đánh giá đã được gửi và đang chờ duyệt.' });
      setReviewForm({ ...reviewForm, comment: '', rating: 5 });
    } catch (err: any) {
      setReviewMsg({ type: 'error', text: err.response?.data?.message || 'Có lỗi xảy ra khi gửi đánh giá.' });
    } finally {
      setReviewSubmitting(false);
    }
  };

  const images = useMemo(() => {
    if (!room) return [FALLBACK];
    const imgs = room.images?.map(i => i.imageUrl).filter(Boolean) as string[];
    return imgs?.length ? imgs : [room.primaryImage || FALLBACK];
  }, [room]);

  const prevImg = () => setActiveImg(i => (i - 1 + images.length) % images.length);
  const nextImg = () => setActiveImg(i => (i + 1) % images.length);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!room || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] px-4">
        <div className="flex items-center gap-3 text-error">
          <AlertCircle size={20} />
          <span>{error || 'Không tìm thấy phòng'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-main)] min-h-screen pb-24">
      {/* ── Hero Image Gallery ── */}
      <div className="relative h-[65vh] bg-black overflow-hidden">
        <motion.img
          key={activeImg}
          src={images[activeImg]}
          alt={room.name}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={e => { (e.target as HTMLImageElement).src = FALLBACK; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Back button */}
        <div className="absolute top-8 left-8 z-20">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-black/50 backdrop-blur-lg rounded-full text-white hover:text-primary transition-colors border border-white/10"
          >
            <ArrowLeft size={22} />
          </button>
        </div>

        {/* Gallery arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImg}
              className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-black/50 backdrop-blur-lg rounded-full text-white hover:text-primary transition-colors z-20 border border-white/10"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={nextImg}
              className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-black/50 backdrop-blur-lg rounded-full text-white hover:text-primary transition-colors z-20 border border-white/10"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}

        {/* Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={`h-1.5 rounded-full transition-all ${i === activeImg ? 'w-8 bg-primary' : 'w-1.5 bg-white/50'}`}
              />
            ))}
          </div>
        )}

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute top-6 right-6 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full z-20">
            {activeImg + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={`shrink-0 w-24 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                  i === activeImg ? 'border-primary scale-105' : 'border-transparent opacity-60 hover:opacity-90'
                }`}
              >
                <img
                  src={img}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={e => { (e.target as HTMLImageElement).src = FALLBACK; }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* Left: Detail */}
          <div className="lg:col-span-2 space-y-8">

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <h1 className="text-4xl md:text-5xl font-display font-bold text-title">{room.name}</h1>
                <div className="flex items-center text-primary gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={18} fill={i < Math.round(avgRating) ? 'currentColor' : 'none'} />
                    ))}
                  </div>
                  {totalReviews > 0 && <span className="text-sm font-semibold text-muted">({avgRating} / {totalReviews} đánh giá)</span>}
                </div>
              </div>
              <p className="text-body text-lg leading-relaxed">
                {room.description || 'Không gian nghỉ dưỡng đẳng cấp, được thiết kế để mang lại trải nghiệm tuyệt vời nhất.'}
              </p>
            </motion.div>

            {/* Specs grid */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            >
              {[
                { icon: <Users size={22} />, label: 'Sức chứa', value: room.capacityLabel },
                { icon: <Bed size={22} />, label: 'Giường', value: room.bedType || '—' },
                { icon: <Maximize size={22} />, label: 'Diện tích', value: room.sizeSqm ? `${room.sizeSqm} m²` : '—' },
                { icon: <Shield size={22} />, label: 'Hướng nhìn', value: room.viewType || '—' },
              ].map(spec => (
                <div key={spec.label} className="bg-[var(--card-bg)] border border-luxury rounded-2xl p-4 text-center">
                  <div className="text-primary mx-auto mb-2 flex justify-center">{spec.icon}</div>
                  <div className="text-xs text-muted mb-1">{spec.label}</div>
                  <div className="font-semibold text-title text-sm">{spec.value}</div>
                </div>
              ))}
            </motion.div>

            {/* Amenities */}
            {(room.amenities?.length ?? 0) > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bg-[var(--card-bg)] border border-luxury rounded-2xl p-7"
              >
                <h3 className="text-xl font-display font-bold text-title mb-6">Tiện nghi phòng</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {room.amenities!.map(amenity => (
                    <div key={amenity.id} className="flex items-center gap-3 text-body">
                      {amenity.iconUrl && amenity.iconUrl.startsWith('http') ? (
                        <img src={amenity.iconUrl} alt="" className="w-6 h-6 object-contain" />
                      ) : amenity.iconUrl ? (
                        <span className="text-xl leading-none">{amenity.iconUrl}</span>
                      ) : (
                        <CheckCircle2 size={18} className="text-primary shrink-0" />
                      )}
                      <span className="text-sm">{amenity.name}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Full content */}
            {room.content && (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="bg-[var(--card-bg)] border border-luxury rounded-2xl p-7"
              >
                <h3 className="text-xl font-display font-bold text-title mb-4">Mô tả chi tiết</h3>
                <div className="prose text-sm" dangerouslySetInnerHTML={{ __html: room.content }} />
              </motion.div>
            )}

            {/* Reviews Section */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="bg-[var(--card-bg)] border border-luxury rounded-2xl p-7"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-display font-bold text-title">Đánh giá từ khách hàng</h3>
                {totalReviews > 0 && (
                  <div className="badge-luxury-warning">
                    <Star size={16} fill="currentColor" /> {avgRating} ({totalReviews} đánh giá)
                  </div>
                )}
              </div>

              {/* Form */}
              <div className="mb-8 p-6 bg-subtle rounded-2xl border border-luxury">
                <h4 className="font-display font-bold text-lg mb-5 text-title">Gửi đánh giá của bạn</h4>
                <form onSubmit={submitReview} className="space-y-5">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-semibold text-body">Điểm số:</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button 
                          key={star} type="button" 
                          onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                          className={`hover:scale-110 transition-transform ${star <= reviewForm.rating ? 'text-warning' : 'text-muted'}`}
                        >
                          <Star size={24} fill={star <= reviewForm.rating ? 'currentColor' : 'none'} />
                        </button>
                      ))}
                    </div>
                  </div>
                  {!user && (
                    <input 
                      required type="text" placeholder="Tên của bạn..." 
                      className="input-luxury"
                      value={reviewForm.guestName} onChange={e => setReviewForm({ ...reviewForm, guestName: e.target.value })}
                    />
                  )}
                  <textarea 
                    required placeholder="Chia sẻ trải nghiệm của bạn về phòng này..." 
                    className="input-luxury min-h-[100px] resize-y"
                    value={reviewForm.comment} onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  />
                  {reviewMsg.text && (
                    <div className={`p-3 rounded-lg text-sm ${reviewMsg.type === 'success' ? 'status-success' : 'status-error'}`}>
                      {reviewMsg.text}
                    </div>
                  )}
                  <button type="submit" disabled={reviewSubmitting} className="btn-gold px-6 py-2">
                    {reviewSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                  </button>
                </form>
              </div>

              {/* Review List */}
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <p className="text-muted text-center py-4 italic">Chưa có đánh giá nào cho phòng này. Hãy là người đầu tiên!</p>
                ) : (
                  reviews.map(review => (
                    <div key={review.id} className="pb-4 border-b border-luxury last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-display font-bold text-lg text-title">{review.authorName}</div>
                        <div className="text-sm font-medium text-muted">{new Date(review.createdAt).toLocaleDateString('vi-VN')}</div>
                      </div>
                      <div className="flex text-warning mb-3">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={16} fill={i < review.rating ? 'currentColor' : 'none'} />
                        ))}
                      </div>
                      <p className="text-body text-base leading-relaxed whitespace-pre-line">{review.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>

          {/* Right: Booking card */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
              className="bg-[var(--card-bg)] border border-primary/30 rounded-2xl p-8 sticky top-24 shadow-lg"
            >
              <div className="text-center mb-8">
                <span className="text-[var(--text-muted)] text-xs uppercase tracking-widest">Giá khởi điểm</span>
                <div className="text-5xl font-display font-bold text-primary mt-2">
                  {room.displayPrice.toLocaleString('vi-VN')} đ
                </div>
                <span className="text-[var(--text-muted)] text-sm">/ đêm</span>
              </div>

              <div className="space-y-4 mb-8">
                {[
                  ['Sức chứa tối đa', room.capacityLabel],
                  ['Diện tích phòng', room.sizeSqm ? `${room.sizeSqm} m²` : 'Spacious'],
                  ['Hướng nhìn', room.viewType || '—'],
                  ['Loại giường', room.bedType || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm border-b border-luxury pb-3">
                    <span className="text-muted">{label}</span>
                    <span className="font-bold text-title">{value}</span>
                  </div>
                ))}
              </div>

              <Link
                to={`/booking/${room.id}`}
                className="btn-gold w-full block text-center py-4 text-base rounded-2xl"
              >
                ĐẶT PHÒNG NGAY
              </Link>

              <p className="text-center text-[var(--text-muted)] text-xs mt-5 leading-relaxed">
                Đặt phòng trực tiếp qua hệ thống — không qua trung gian
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomDetail;
