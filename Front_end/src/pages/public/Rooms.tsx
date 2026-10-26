import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Bed, Loader2, Maximize, Search, SlidersHorizontal, Users, X } from 'lucide-react';
import { publicHotelApi, type PublicRoomType } from '../../services/publicHotelApi';

const FALLBACK =
  'https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1600&auto=format&fit=crop';

const Rooms: React.FC = () => {
  const [rooms, setRooms] = useState<PublicRoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [minCapacity, setMinCapacity] = useState<number | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    publicHotelApi.getRoomTypes()
      .then(setRooms)
      .catch((err: any) => setError(err.response?.data?.message || 'Không thể tải danh sách phòng'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = rooms;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q)
      );
    }
    if (maxPrice !== '') list = list.filter(r => r.displayPrice <= Number(maxPrice));
    if (minCapacity !== '') list = list.filter(r => (r.capacityAdults + (r.capacityChildren ?? 0)) >= Number(minCapacity));
    return list;
  }, [rooms, search, maxPrice, minCapacity]);

  const priceRange = useMemo(() => ({
    min: rooms.length ? Math.min(...rooms.map(r => r.displayPrice)) : 0,
    max: rooms.length ? Math.max(...rooms.map(r => r.displayPrice)) : 0,
  }), [rooms]);

  const clearFilters = () => { setSearch(''); setMaxPrice(''); setMinCapacity(''); };
  const hasFilter = search.trim() || maxPrice !== '' || minCapacity !== '';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] px-4">
        <div className="flex items-center gap-3 text-error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-main)] min-h-screen">
      {/* Hero */}
      <section className="relative h-[55vh] flex items-center justify-center overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070&auto=format&fit=crop"
          alt="Luxury Rooms"
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative z-10 text-center px-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-display text-white mb-4"
          >
            Phòng nghỉ của chúng tôi
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-white/80 text-lg max-w-2xl mx-auto font-light"
          >
            {rooms.length} loại phòng từ{' '}
            <span className="text-primary font-semibold">
              {priceRange.min.toLocaleString('vi-VN')} đ
            </span>{' '}
            đến{' '}
            <span className="text-primary font-semibold">
              {priceRange.max.toLocaleString('vi-VN')} đ
            </span>{' '}
            / đêm
          </motion.p>
        </div>
      </section>

      <section className="py-16 px-4 max-w-7xl mx-auto">
        {/* Search + Filter bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 space-y-4"
        >
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <input
                className="w-full pl-12 pr-4 h-13 py-3.5 rounded-2xl border border-luxury bg-[var(--card-bg)] text-body placeholder:text-muted/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                placeholder="Tìm kiếm loại phòng..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl border font-semibold text-sm transition-all ${
                showFilters
                  ? 'bg-primary text-white border-primary'
                  : 'border-luxury text-body hover:border-primary/40'
              }`}
            >
              <SlidersHorizontal size={16} />
              Lọc
            </button>
            {hasFilter && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-4 py-3.5 rounded-2xl text-sm text-error hover:bg-error/10 transition-colors"
              >
                <X size={15} />
                Xóa bộ lọc
              </button>
            )}
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl border border-luxury bg-[var(--card-bg)]"
            >
              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-2">
                  Giá tối đa (đ/đêm)
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-3 rounded-xl border border-luxury bg-[var(--bg-main)] text-body focus:outline-none focus:border-primary/50 transition-all"
                  placeholder={`VD: ${(5_000_000).toLocaleString('vi-VN')}`}
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value ? Number(e.target.value) : '')}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-2">
                  Số khách tối thiểu
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-3 rounded-xl border border-luxury bg-[var(--bg-main)] text-body focus:outline-none focus:border-primary/50 transition-all"
                  placeholder="VD: 2"
                  min={1}
                  value={minCapacity}
                  onChange={e => setMinCapacity(e.target.value ? Number(e.target.value) : '')}
                />
              </div>
            </motion.div>
          )}

          {/* Results count */}
          {hasFilter && (
            <p className="text-muted text-sm">
              Hiển thị <span className="font-bold text-primary">{filtered.length}</span> / {rooms.length} loại phòng
            </p>
          )}
        </motion.div>

        {/* Room grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-muted text-lg">Không tìm thấy loại phòng phù hợp.</p>
            <button onClick={clearFilters} className="mt-4 text-primary underline text-sm">Xóa bộ lọc</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((room, index) => {
              const img = room.primaryImage || FALLBACK;
              return (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.06 }}
                  className="bg-[var(--card-bg)] rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 group border border-luxury flex flex-col"
                >
                  {/* Image */}
                  <Link to={`/rooms/${room.id}`} className="relative h-60 overflow-hidden block">
                    <img
                      src={img}
                      alt={room.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108"
                      referrerPolicy="no-referrer"
                      onError={e => { (e.target as HTMLImageElement).src = FALLBACK; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    {/* Price badge */}
                    <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md px-4 py-1.5 rounded-full">
                      <span className="text-primary font-bold text-base">
                        {room.displayPrice.toLocaleString('vi-VN')} đ
                      </span>
                      <span className="text-white/70 text-xs ml-1">/ đêm</span>
                    </div>
                    {/* Image count */}
                    {(room.images?.length ?? 0) > 1 && (
                      <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                        +{(room.images?.length ?? 0) - 1} ảnh
                      </div>
                    )}
                  </Link>

                  {/* Body */}
                  <div className="p-7 flex flex-col flex-1">
                    <Link to={`/rooms/${room.id}`}>
                      <h3 className="text-xl font-display font-bold text-title mb-3 hover:text-primary transition-colors line-clamp-1">
                        {room.name}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted mb-5 line-clamp-2 leading-relaxed">
                      {room.description || 'Không gian nghỉ dưỡng được thiết kế tinh tế và thoải mái.'}
                    </p>

                    <div className="flex flex-wrap gap-3 mb-6 text-xs text-muted">
                      <span className="flex items-center gap-1.5">
                        <Users size={14} className="text-primary" />
                        {room.capacityLabel}
                      </span>
                      {room.bedType && (
                        <span className="flex items-center gap-1.5">
                          <Bed size={14} className="text-primary" />
                          {room.bedType}
                        </span>
                      )}
                      {room.sizeSqm && (
                        <span className="flex items-center gap-1.5">
                          <Maximize size={14} className="text-primary" />
                          {room.sizeSqm} m²
                        </span>
                      )}
                    </div>

                    {/* Amenity tags (max 3) */}
                    {(room.amenities?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-5">
                        {room.amenities!.slice(0, 3).map(a => (
                          <span key={a.id} className="text-[10px] px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                            {a.iconUrl && !a.iconUrl.startsWith('http') ? `${a.iconUrl} ` : ''}{a.name}
                          </span>
                        ))}
                        {room.amenities!.length > 3 && (
                          <span className="text-[10px] px-2.5 py-1 rounded-full border border-luxury text-muted">
                            +{room.amenities!.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3 mt-auto">
                      <Link
                        to={`/rooms/${room.id}`}
                        className="text-title font-bold text-sm hover:text-primary transition-colors flex items-center gap-1.5"
                      >
                        Chi tiết
                        <ArrowRight size={15} />
                      </Link>
                      <Link to={`/booking/${room.id}`} className="btn-gold px-6 py-2.5 text-xs rounded-full">
                        ĐẶT PHÒNG
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default Rooms;
