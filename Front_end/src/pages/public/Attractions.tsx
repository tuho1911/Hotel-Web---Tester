import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { App, Spin, Modal } from 'antd';
import { MapPin, Navigation, ChevronRight, Globe, Maximize2, X, Clock, Info } from 'lucide-react';
import { adminApi, type AttractionDto } from '../../services/adminApi';
import { useThemeStore } from '../../store/themeStore';
import ReviewSection from '../../components/common/ReviewSection';

const CATEGORIES = ['Tất cả', 'Lịch sử - Văn hóa', 'Thiên nhiên', 'Ẩm thực - Trải nghiệm', 'Tâm linh'];

const Attractions: React.FC = () => {
  const { message } = App.useApp();
  const [attractions, setAttractions] = useState<AttractionDto[]>([]);
  const { isDarkMode } = useThemeStore();
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [mapReady, setMapReady] = useState(false);
  const [showFullMap, setShowFullMap] = useState(false);
  const [selectedAttraction, setSelectedAttraction] = useState<AttractionDto | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const tileLayer = useRef<any>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await adminApi.getAttractions();
        const activeAttractions = data.filter((a: any) => a.isActive);
        setAttractions(activeAttractions);

        // Check if an ID is provided in URL
        const targetId = searchParams.get('id');
        if (targetId) {
          const target = activeAttractions.find((a: any) => a.id.toString() === targetId);
          if (target) {
            setSelectedAttraction(target);
          }
        }
      } catch {
        message.error('Không thể tải danh sách điểm tham quan.');
      } finally {
        setLoading(false);
      }
    };
    void fetch();
  }, [message]);

  // Load Leaflet CDN
  useEffect(() => {
    if (typeof window !== 'undefined' && !document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => setMapReady(true);
      document.body.appendChild(script);
    } else if ((window as any).L) {
      setMapReady(true);
    }
  }, []);

  const filtered = useMemo(() => {
    if (activeCategory === 'Tất cả') return attractions;
    return attractions.filter((a: any) => a.category === activeCategory);
  }, [attractions, activeCategory]);

  const attractionGroup = useRef<any>(null);

  // Initialize Map & Markers
  useEffect(() => {
    if (mapReady && mapRef.current && attractions.length > 0 && (window as any).L) {
      const L = (window as any).L;
      
      if (!leafletMap.current) {
        // First time initialization
        const map = L.map(mapRef.current, {
          scrollWheelZoom: false,
          zoomControl: false
        }).setView([10.9575, 106.8427], 13);

        const tileUrl = isDarkMode 
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

        tileLayer.current = L.tileLayer(tileUrl, {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Add Hotel Marker (Permanent)
        const hotelIcon = L.divIcon({
          className: 'hotel-div-icon',
          html: `<div class="w-10 h-10 bg-black rounded-full border-4 border-primary shadow-2xl flex items-center justify-center text-primary animate-bounce"><span class="font-display font-bold text-[10px]">KANT</span></div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 40]
        });

        L.marker([10.9416, 106.8185], { icon: hotelIcon, isHotel: true }).addTo(map)
          .bindPopup('<b class="font-display text-primary">KANT HOTEL</b><br/>Vị trí của chúng tôi');

        // Create group for attractions
        attractionGroup.current = L.layerGroup().addTo(map);
        leafletMap.current = map;
      }

      const map = leafletMap.current;
      const group = attractionGroup.current;

      if (group) {
        group.clearLayers();

        const customIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="w-8 h-8 bg-primary rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32]
        });

        const markers: any[] = [];
        filtered.forEach(attr => {
          if (attr.latitude && attr.longitude) {
            const marker = L.marker([attr.latitude, attr.longitude], { icon: customIcon })
              .bindPopup(`<div class="p-1"><b class="text-primary font-display">${attr.name}</b><p class="text-[10px] mt-1">${attr.category}</p></div>`);
            group.addLayer(marker);
            markers.push(marker);
          }
        });

        if (markers.length > 0) {
          const featureGroup = L.featureGroup(markers);
          map.fitBounds(featureGroup.getBounds().pad(0.3), { animate: true });
        } else {
          // If no attractions, center back to hotel
          map.setView([10.9416, 106.8185], 13, { animate: true });
        }
      }
    }
  }, [mapReady, attractions, filtered]);

  // Update Tile Layer on Theme Change
  useEffect(() => {
    if (leafletMap.current && tileLayer.current && (window as any).L) {
      const tileUrl = isDarkMode 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
      tileLayer.current.setUrl(tileUrl);
    }
  }, [isDarkMode]);

  return (
    <div className="min-h-screen bg-[var(--bg-main)] transition-colors duration-300">
      {/* Hero */}
      <section className="relative h-[40vh] sm:h-[55vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&q=80"
            alt="Attractions Hero"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
        </div>
        <div className="relative z-10 text-center px-4 flex flex-col items-center">
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-primary font-bold tracking-[0.4em] uppercase text-xs mb-4 block"
          >
            Explore
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-7xl font-display font-bold text-white tracking-widest uppercase mb-6"
          >
            ĐIỂM THAM QUAN
          </motion.h1>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 100 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="h-1 bg-primary mb-8"
          />
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/80 max-w-xl mx-auto font-light text-lg tracking-wide leading-relaxed"
          >
            Khám phá tinh hoa văn hóa và thiên nhiên tuyệt đẹp <br/> xung quanh <span className="text-primary font-bold">KANT HOTEL</span>
          </motion.p>
        </div>
      </section>

      {/* Interactive Map Section */}
      <section className="max-w-7xl mx-auto px-4 -mt-16 relative z-20">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--card-bg)] rounded-[32px] overflow-hidden border border-luxury shadow-2xl"
        >
          <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-luxury">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Globe size={24} />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-title">Bản đồ tương tác</h2>
                <p className="text-muted text-xs">Xem vị trí thực tế của các điểm đến</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-xl border transition-all duration-300 text-[10px] font-bold uppercase tracking-wider ${
                    activeCategory === cat
                      ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-transparent border-luxury text-muted hover:bg-primary/5 hover:text-primary'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="relative h-[400px] md:h-[500px]">
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-subtle">
                <Spin size="large" />
              </div>
            )}
            <div ref={mapRef} className="w-full h-full z-0 grayscale-[0.5] hover:grayscale-0 transition-all duration-700" />
            <button 
              onClick={() => setShowFullMap(true)}
              className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-2xl text-primary shadow-xl border border-luxury hover:bg-primary hover:text-white transition-all z-10"
            >
              <Maximize2 size={20} />
            </button>
          </div>
        </motion.div>
      </section>

      {/* Grid List */}
      <section className="max-w-7xl mx-auto px-4 py-24">
        {loading ? (
          <div className="flex justify-center py-20">
            <Spin size="large" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {filtered.map((attraction: any, idx) => (
              <motion.div
                key={attraction.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.06 }}
                whileHover={{ y: -10 }}
                className="group bg-[var(--card-bg)] rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-luxury flex flex-col"
              >
                {/* Image */}
                <div className="relative h-64 overflow-hidden">
                  {attraction.imageUrl ? (
                    <img
                      src={attraction.imageUrl}
                      alt={attraction.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-subtle text-muted">
                      <MapPin size={40} className="opacity-20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Category badge */}
                  {attraction.category && (
                    <div className="absolute top-5 left-5">
                      <span className="bg-primary/90 backdrop-blur-md text-white px-3 py-1 rounded-full font-bold text-[9px] uppercase tracking-widest shadow-lg">
                        {attraction.category}
                      </span>
                    </div>
                  )}

                  {/* Distance badge */}
                  {attraction.distanceKm && (
                    <div className="absolute bottom-5 right-5">
                      <span className="bg-white/90 backdrop-blur-md text-primary px-4 py-2 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-xl border border-luxury">
                        <Navigation size={14} className="animate-pulse" />
                        {attraction.distanceKm} km
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-8 flex flex-col flex-1">
                  <h3 className="text-2xl font-display font-bold text-title leading-tight group-hover:text-primary transition-colors mb-4">
                    {attraction.name}
                  </h3>
 
                  {attraction.address && (
                    <p className="text-muted text-sm flex items-start gap-2 mb-4 font-light">
                      <MapPin size={16} className="text-primary mt-0.5 shrink-0" />
                      {attraction.address}
                    </p>
                  )}
 
                  {attraction.description && (
                    <p className="text-muted text-sm leading-relaxed line-clamp-3 mb-8 font-light">
                      {attraction.description}
                    </p>
                  )}

                  {/* Action */}
                  <div className="mt-auto flex items-center justify-between gap-4">
                    <button 
                      onClick={() => setSelectedAttraction(attraction)}
                      className="text-primary font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:translate-x-1 transition-transform"
                    >
                      Xem chi tiết <ChevronRight size={14} />
                    </button>
                    {attraction.mapEmbedLink && (
                       <div 
                        onClick={() => setSelectedAttraction(attraction)}
                        className="w-10 h-10 rounded-full border border-luxury flex items-center justify-center text-muted hover:bg-primary hover:text-white transition-all cursor-pointer"
                        title="Xem vị trí"
                       >
                         <MapPin size={16} />
                       </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-32 bg-[var(--card-bg)] rounded-[32px] border border-luxury shadow-xl">
            <MapPin size={60} className="text-primary/20 mx-auto mb-6" />
            <h3 className="text-2xl font-display font-bold text-title mb-2">Không tìm thấy địa điểm</h3>
            <p className="text-muted font-light">Vui lòng chọn danh mục khác hoặc quay lại sau.</p>
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 pb-32 text-center">
        <div className="bg-primary/5 rounded-[40px] p-12 md:p-20 border border-luxury relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px]" />
          <div className="relative z-10">
            <h2 className="font-display text-4xl md:text-6xl font-bold text-title mb-6">
              Sẵn sàng khám phá <span className="text-primary italic">Biên Hòa?</span>
            </h2>
            <p className="text-muted text-lg mb-10 max-w-2xl mx-auto font-light">
              Đặt phòng tại <span className="font-bold text-primary">KANT HOTEL</span> để trải nghiệm sự thoải mái trọn vẹn sau mỗi hành trình khám phá tinh hoa vùng đất Đồng Nai.
            </p>
            <Link
              to="/rooms"
              className="inline-flex items-center gap-3 bg-primary hover:bg-primary-dark text-white px-12 py-5 rounded-full font-bold tracking-[0.2em] uppercase text-xs transition-all shadow-2xl shadow-primary/30 hover:shadow-primary/50"
            >
              Xem phòng & Đặt ngay
              <ChevronRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* Attraction Detail Modal */}
      <Modal
        open={!!selectedAttraction}
        onCancel={() => {
          setSelectedAttraction(null);
          // Remove ID from URL when closing modal
          if (searchParams.has('id')) {
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('id');
            setSearchParams(newParams, { replace: true });
          }
        }}
        footer={null}
        width={1100}
        centered
        closeIcon={<X size={24} className="text-white md:text-muted hover:text-primary transition-colors" />}
        className="luxury-modal"
        styles={{
          mask: { backdropFilter: 'blur(12px)', backgroundColor: 'rgba(0,0,0,0.7)' },
          body: { padding: 0, borderRadius: 32, overflow: 'hidden', backgroundColor: 'var(--card-bg)' }
        }}
      >
        {selectedAttraction && (
          <div className="flex flex-col md:flex-row min-h-[600px]">
            {/* Left: Image & Quick Info */}
            <div className="md:w-5/12 relative bg-subtle overflow-hidden">
              <img 
                src={selectedAttraction.imageUrl || ''} 
                alt={selectedAttraction.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute bottom-8 left-8 right-8 text-white z-10">
                <span className="bg-primary px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] mb-4 inline-block shadow-lg">
                  {selectedAttraction.category}
                </span>
                <h2 className="text-3xl md:text-5xl font-display font-bold mb-4 leading-tight">
                  {selectedAttraction.name}
                </h2>
                <div className="flex items-center gap-3 text-white/70 text-sm font-light">
                   <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                     <MapPin size={14} className="text-primary" />
                   </div>
                   {selectedAttraction.address}
                </div>
              </div>
            </div>

            {/* Right: Full Details */}
            <div className="md:w-7/12 flex flex-col bg-[var(--card-bg)] max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="p-8 md:p-12">
                <div className="mb-12">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-6 flex items-center gap-2">
                    <Info size={12} /> Giới thiệu địa điểm
                  </h3>
                  <p className="text-muted text-lg leading-relaxed font-light mb-10">
                    {selectedAttraction.description}
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-subtle/50 p-6 rounded-[2rem] border border-luxury/30">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <Navigation size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Khoảng cách</span>
                        <span className="text-xl font-display font-bold text-title">{selectedAttraction.distanceKm} km</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <Clock size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Di chuyển</span>
                        <span className="text-xl font-display font-bold text-title">~{Math.round((selectedAttraction.distanceKm || 0) * 3)} phút</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Map Section */}
                <div className="mb-12">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] flex items-center gap-2">
                      <Globe size={12} /> Vị trí bản đồ
                    </h3>
                    {selectedAttraction.latitude && selectedAttraction.longitude && (
                      <button 
                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedAttraction.latitude},${selectedAttraction.longitude}`, '_blank')}
                        className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1.5"
                      >
                        <Navigation size={12} /> CHỈ ĐƯỜNG NGAY
                      </button>
                    )}
                  </div>
                  {selectedAttraction.mapEmbedLink ? (
                    <div 
                      className="w-full h-56 rounded-[2rem] overflow-hidden border border-luxury shadow-inner"
                      dangerouslySetInnerHTML={{
                        __html: selectedAttraction.mapEmbedLink.replace(
                          /width="[^"]*"/,
                          'width="100%"'
                        ).replace(
                          /height="[^"]*"/,
                          'height="224"'
                        ),
                      }}
                    />
                  ) : (
                    <div className="w-full h-56 rounded-[2rem] bg-subtle flex items-center justify-center text-muted border border-luxury border-dashed">
                      <MapPin size={24} className="opacity-20" />
                    </div>
                  )}
                </div>

                {/* Reviews Section */}
                <div className="border-t border-luxury pt-12">
                   <ReviewSection targetType="Attraction" targetId={selectedAttraction.id} />
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Fullscreen Map Modal (Area Overview) */}
      <Modal
        open={showFullMap}
        onCancel={() => setShowFullMap(false)}
        footer={null}
        width="90vw"
        styles={{ body: { padding: 0, borderRadius: 24, overflow: 'hidden' } }}
        centered
        className="luxury-modal-full"
      >
        <div className="h-[80vh] relative">
          <div className="absolute top-4 left-4 z-10">
             <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-luxury">
                <h3 className="font-display font-bold text-primary">Khu vực Biên Hòa</h3>
                <p className="text-[10px] text-muted uppercase tracking-widest">Điểm tham quan & Văn hóa</p>
             </div>
          </div>
          <div 
            dangerouslySetInnerHTML={{ 
              __html: `<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d125380.05282438837!2d106.7570499!3d10.957500!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3174d85e7997933d%3A0x19a0088597970d!2zQmnDqm4gSMOyYSwgxJDhu5NuZyBOYWksIFZp4buHdCBOYW0!5e0!3m2!1svi!2s!4v1713955000000!5m2!1svi!2s" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`
            }} 
            className="w-full h-full"
          />
        </div>
      </Modal>

      <style dangerouslySetInnerHTML={{ __html: `
        .leaflet-container { font-family: inherit; }
        .custom-div-icon { background: none; border: none; }
        .hotel-div-icon { background: none; border: none; }
        .leaflet-popup-content-wrapper { border-radius: 12px; border: 1px solid var(--border-luxury); }
        .leaflet-popup-tip { background: white; }
        .luxury-modal .ant-modal-content { border: 1px solid var(--border-luxury); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
      `}} />
    </div>
  );
};

export default Attractions;
