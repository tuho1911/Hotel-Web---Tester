import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  App, Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Switch, Tag,
} from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Edit, Eye, EyeOff, MapPin, Plus, Search, Trash2 } from 'lucide-react';
import { adminApi, type AttractionDto } from '../../services/adminApi';
import { usePermission } from '../../hooks/useAppStore';
import axios from 'axios';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type AttractionForm = {
  name: string;
  address?: string;
  category?: string;
  description?: string;
  mapEmbedLink?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
};

/* ─── Map Picker Component ──────────────────────────────────────────────── */
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default icon in React
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
L.Marker.prototype.options.icon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41]
});

const LocationPicker = ({ lat, lng, onChange }: { lat?: number; lng?: number; onChange: (lat: number, lng: number) => void }) => {
  // Default to Hoi An if no coordinates provided
  const position: [number, number] = [lat || 15.8801, lng || 108.338];

  const MapEvents = () => {
    useMapEvents({
      click(e) {
        onChange(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  };

  const UpdateCenter = () => {
    const map = useMap();
    useEffect(() => {
      if (lat && lng) {
        map.setView([lat, lng], map.getZoom(), { animate: true });
      }
    }, [lat, lng, map]);
    return null;
  };

  return (
    <div style={{ height: '300px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', zIndex: 0 }}>
      <MapContainer center={position} zoom={14} style={{ height: '100%', width: '100%', zIndex: 1 }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <MapEvents />
        <UpdateCenter />
        {(lat && lng) ? <Marker position={[lat, lng]} /> : null}
      </MapContainer>
    </div>
  );
};

/* ─── Component ─────────────────────────────────────────────────────────── */
const AttractionsPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const canManage = usePermission('MANAGE_CONTENT');

  const [attractions, setAttractions] = useState<AttractionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState<AttractionDto | null>(null);
  const [detailItem, setDetailItem] = useState<AttractionDto | null>(null);

  // Map search state
  const [searchAddress, setSearchAddress] = useState('');
  const [searchingAddress, setSearchingAddress] = useState(false);

  // Image upload
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingUploadId = useRef<number | null>(null);

  const [form] = Form.useForm<AttractionForm>();

  /* ── Map Search ───────────────────────────────────────────────────────── */
  const handleSearchAddress = async () => {
    if (!searchAddress.trim()) return;
    setSearchingAddress(true);
    try {
      const res = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: searchAddress,
          format: 'json',
          limit: 1,
          'accept-language': 'vi'
        }
      });
      if (res.data && res.data.length > 0) {
        const { lat, lon, display_name } = res.data[0];
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lon);
        form.setFieldsValue({
          latitude: Number(newLat.toFixed(5)),
          longitude: Number(newLng.toFixed(5)),
          address: display_name
        });
        message.success('Đã định vị thành công địa điểm!');
      } else {
        message.warning('Không tìm thấy địa điểm này. Hãy thử từ khoá khác.');
      }
    } catch {
      message.error('Lỗi khi kết nối hệ thống tìm bản đồ');
    } finally {
      setSearchingAddress(false);
    }
  };

  /* ── Load ─────────────────────────────────────────────────────────────── */
  const load = async () => {
    setLoading(true);
    try {
      setAttractions(await adminApi.getAttractions());
    } catch {
      message.error('Không thể tải dữ liệu điểm tham quan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  /* ── Filter ───────────────────────────────────────────────────────────── */
  const displayed = useMemo(() => {
    let list = [...attractions];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.address ?? '').toLowerCase().includes(q) ||
        (a.description ?? '').toLowerCase().includes(q)
      );
    }
    if (filterStatus === 'active') list = list.filter(a => a.isActive);
    if (filterStatus === 'inactive') list = list.filter(a => !a.isActive);
    return list.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [attractions, search, filterStatus]);

  const stats = useMemo(() => ({
    total: attractions.length,
    active: attractions.filter(a => a.isActive).length,
    withImage: attractions.filter(a => !!a.imageUrl).length,
  }), [attractions]);

  /* ── CRUD ─────────────────────────────────────────────────────────────── */
  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setSearchAddress('');
    // Default coordinates to Hoi An center if creating new
    form.setFieldsValue({ isActive: true, latitude: 15.8801, longitude: 108.3380 });
    setFormOpen(true);
  };

  const openEdit = (item: AttractionDto) => {
    setEditing(item);
    setSearchAddress('');
    form.setFieldsValue({
      name: item.name,
      address: item.address ?? '',
      category: item.category ?? '',
      description: item.description ?? '',
      mapEmbedLink: item.mapEmbedLink ?? '',
      latitude: item.latitude ?? undefined,
      longitude: item.longitude ?? undefined,
      isActive: item.isActive,
    });
    setFormOpen(true);
  };

  const handleSubmit = async (values: AttractionForm) => {
    setSubmitting(true);
    try {
      // Auto-generate Google Maps Embed link using the coordinates
      const generatedEmbedLink = `<iframe src="https://maps.google.com/maps?q=${values.latitude},${values.longitude}&hl=vi&z=15&output=embed" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy"></iframe>`;

      const payload = {
        name: values.name,
        address: values.address,
        category: values.category,
        description: values.description,
        mapEmbedLink: generatedEmbedLink,
        latitude: values.latitude,
        longitude: values.longitude,
        isActive: values.isActive,
        imageUrl: editing?.imageUrl ?? undefined,
      };

      if (editing) {
        await adminApi.updateAttraction(editing.id, payload);
        message.success('Đã cập nhật điểm tham quan');
      } else {
        await adminApi.createAttraction(payload);
        message.success('Đã thêm điểm tham quan mới');
      }
      setFormOpen(false);
      await load();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể lưu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: AttractionDto) => {
    modal.confirm({
      title: `Xóa "${item.name}"?`,
      content: 'Điểm tham quan này sẽ bị xóa vĩnh viễn.',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await adminApi.deleteAttraction(item.id);
          message.success('Đã xóa');
          await load();
        } catch (err: any) {
          message.error(err.response?.data?.message || 'Không thể xóa');
        }
      },
    });
  };

  const handleToggle = async (item: AttractionDto) => {
    try {
      await adminApi.updateAttraction(item.id, {
        name: item.name,
        address: item.address ?? undefined,
        category: item.category ?? undefined,
        description: item.description ?? undefined,
        mapEmbedLink: item.mapEmbedLink ?? undefined,
        latitude: item.latitude ?? undefined,
        longitude: item.longitude ?? undefined,
        isActive: !item.isActive,
        imageUrl: item.imageUrl ?? undefined,
      });
      await load();
    } catch {
      message.error('Không thể thay đổi trạng thái');
    }
  };

  /* ── Image upload ─────────────────────────────────────────────────────── */
  const pickImage = (id: number) => {
    pendingUploadId.current = id;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const id = pendingUploadId.current;
    if (!file || !id) return;
    setUploadingId(id);
    try {
      await adminApi.uploadAttractionImage(id, file);
      message.success('Đã cập nhật ảnh');
      await load();
    } catch {
      message.error('Không thể tải ảnh lên');
    } finally {
      setUploadingId(null);
      pendingUploadId.current = null;
    }
  };

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-title flex items-center gap-3">
            <MapPin className="text-primary" size={28} />
            Điểm tham quan
          </h1>
          <p className="text-muted mt-1">Quản lý địa điểm du lịch xung quanh khách sạn</p>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={openCreate} className="btn-gold h-11"
          style={{ display: canManage ? undefined : 'none' }}
        >
          Thêm địa điểm
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Tổng địa điểm', value: stats.total, color: 'text-title' },
          { label: 'Đang hiển thị', value: stats.active, color: 'text-green-500' },
          { label: 'Có ảnh', value: stats.withImage, color: 'text-primary' },
        ].map(s => (
          <div key={s.label} className="admin-card text-center !p-4 sm:!p-6">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted">{s.label}</p>
            <p className={`text-2xl sm:text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="admin-card flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            className="input-luxury pl-9 w-full"
            placeholder="Tìm theo tên, địa chỉ, mô tả..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'active', 'inactive'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`flex-1 sm:flex-none text-center px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all ${
                filterStatus === s
                  ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                  : 'border-[var(--border-color)] text-muted hover:border-primary/40'
              }`}
            >
              {s === 'all' ? 'Tất cả' : s === 'active' ? 'Hiển thị' : 'Đã ẩn'}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="admin-card animate-pulse h-72 flex flex-col">
              <div className="h-48 bg-gray-200 rounded-xl mb-4" />
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="admin-card text-center py-16">
          <MapPin size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-title font-semibold">Không tìm thấy địa điểm nào</p>
          <p className="text-muted text-sm mt-1">Thử thay đổi bộ lọc hoặc thêm địa điểm mới</p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayed.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="admin-card !p-0 overflow-hidden flex flex-col group"
              >
                {/* Image */}
                <div
                  className="relative h-48 bg-gray-100 cursor-pointer overflow-hidden"
                  onClick={() => pickImage(item.id)}
                  title="Nhấp để đổi ảnh"
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                      <Camera size={28} />
                      <span className="text-xs">Nhấp để thêm ảnh</span>
                    </div>
                  )}
                  {/* Upload overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {uploadingId === item.id ? (
                      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera size={24} className="text-white" />
                    )}
                  </div>
                  {/* Status badge */}
                  <div className="absolute top-3 right-3">
                    <Tag color={item.isActive ? 'success' : 'default'} className="text-[10px] font-bold">
                      {item.isActive ? 'Hiển thị' : 'Đã ẩn'}
                    </Tag>
                  </div>
                </div>

                {/* Info */}
                <div className="p-5 flex flex-col flex-1">
                  <h3
                    className="font-display font-bold text-title text-base leading-snug cursor-pointer hover:text-primary transition-colors line-clamp-2"
                    onClick={() => { setDetailItem(item); setDetailOpen(true); }}
                  >
                    {item.name}
                  </h3>
                  {(item as any).address && (
                    <p className="text-muted text-xs mt-1.5 flex items-start gap-1.5 line-clamp-1">
                      <MapPin size={12} className="text-primary mt-0.5 shrink-0" />
                      {(item as any).address}
                    </p>
                  )}
                  {item.description && (
                    <p className="text-muted text-xs mt-2 line-clamp-2 leading-relaxed">{item.description}</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--border-color)]">
                    <div className="flex gap-1">
                      <Button
                        type="text" size="small"
                        icon={<Eye size={15} className="text-blue-400" />}
                        onClick={() => { setDetailItem(item); setDetailOpen(true); }}
                        title="Xem chi tiết"
                      />
                      {canManage && (
                        <Button
                          type="text" size="small"
                          icon={<Edit size={15} className="text-green-500" />}
                          onClick={() => openEdit(item)}
                          title="Chỉnh sửa"
                        />
                      )}
                      {canManage && (
                        <Popconfirm
                          title={`Xóa "${item.name}"?`}
                          onConfirm={() => handleDelete(item)}
                          okText="Xóa" cancelText="Hủy"
                        >
                          <Button
                            type="text" size="small"
                            icon={<Trash2 size={15} className="text-red-400" />}
                            title="Xóa"
                          />
                        </Popconfirm>
                      )}
                    </div>
                    {canManage && (
                      <div
                        onClick={() => handleToggle(item)}
                        title={item.isActive ? 'Nhấp để ẩn' : 'Nhấp để hiện'}
                        className="cursor-pointer flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors"
                      >
                        {item.isActive
                          ? <EyeOff size={14} className="text-orange-400" />
                          : <Eye size={14} />
                        }
                        <span>{item.isActive ? 'Ẩn' : 'Hiện'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* ─── Add / Edit Modal ─────────────────────────────────────────────── */}
      <Modal
        title={
          <span className="text-title font-display text-lg font-bold">
            {editing ? `Chỉnh sửa: ${editing.name}` : 'Thêm điểm tham quan mới'}
          </span>
        }
        open={formOpen}
        onCancel={() => setFormOpen(false)}
        footer={null}
        width={760}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-4">
          <Form.Item
            name="name"
            label="Tên địa điểm"
            rules={[{ required: true, message: 'Vui lòng nhập tên địa điểm' }]}
          >
            <Input placeholder="VD: Phố cổ Hội An" className="h-11 rounded-xl" />
          </Form.Item>

          <Form.Item name="address" label="Địa chỉ">
            <Input placeholder="VD: 132 Trần Phú, Hội An, Quảng Nam" className="h-11 rounded-xl" />
          </Form.Item>

          <Form.Item name="category" label="Danh mục">
            <Select
              className="h-11 custom-select-luxury"
              placeholder="Chọn danh mục địa điểm"
              allowClear
              options={[
                { value: 'Lịch sử - Văn hóa', label: '🏛️ Lịch sử - Văn hóa' },
                { value: 'Thiên nhiên', label: '🌿 Thiên nhiên' },
                { value: 'Ẩm thực - Trải nghiệm', label: '🍜 Ẩm thực - Trải nghiệm' },
                { value: 'Tâm linh', label: '🛕 Tâm linh' },
                { value: 'Giải trí', label: '🎡 Giải trí' },
              ]}
            />
          </Form.Item>

          <Form.Item name="description" label="Mô tả ngắn">
            <Input.TextArea rows={3} placeholder="Giới thiệu ngắn về địa điểm này..." className="rounded-xl custom-input-luxury" />
          </Form.Item>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item name="latitude" label="Vĩ độ (Latitude)" rules={[{ required: true, message: 'Bắt buộc' }]}>
              <InputNumber placeholder="VD: 15.8801" className="w-full h-11 custom-input-luxury" step={0.0001} />
            </Form.Item>
            <Form.Item name="longitude" label="Kinh độ (Longitude)" rules={[{ required: true, message: 'Bắt buộc' }]}>
              <InputNumber placeholder="VD: 108.338" className="w-full h-11 custom-input-luxury" step={0.0001} />
            </Form.Item>
          </div>

          <Form.Item label={<span className="font-semibold text-primary">Chọn trực tiếp trên bản đồ (Nhấp vào bản đồ để ghim)</span>}>
            {/* Thanh tìm kiếm địa điểm trên bản đồ */}
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <Input 
                placeholder="Tìm địa điểm nhanh... (VD: Cầu Rồng Đà Nẵng, Phố cổ Hội An)" 
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                onPressEnter={(e) => {
                  e.preventDefault();
                  void handleSearchAddress();
                }}
                className="h-11 rounded-xl flex-1 custom-input-luxury"
              />
              <Button 
                onClick={() => void handleSearchAddress()} 
                loading={searchingAddress}
                className="btn-gold h-11 px-5 w-full sm:w-auto"
              >
                Tìm vị trí
              </Button>
            </div>

            <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.latitude !== currentValues.latitude || prevValues.longitude !== currentValues.longitude}>
              {({ getFieldValue, setFieldsValue }) => {
                const lat = getFieldValue('latitude');
                const lng = getFieldValue('longitude');
                return (
                  <LocationPicker 
                    lat={lat} 
                    lng={lng} 
                    onChange={(newLat, newLng) => {
                      setFieldsValue({ latitude: Number(newLat.toFixed(5)), longitude: Number(newLng.toFixed(5)) });
                    }} 
                  />
                );
              }}
            </Form.Item>
          </Form.Item>

          {editing && (
            <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
              <Switch checkedChildren="Hiển thị" unCheckedChildren="Đang ẩn" />
            </Form.Item>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={() => setFormOpen(false)} className="h-11">Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitting} className="btn-gold h-11 px-6">
              {editing ? 'Lưu thay đổi' : 'Thêm địa điểm'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ─── Detail Modal ─────────────────────────────────────────────────── */}
      <Modal
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={[
          <Button key="edit" type="primary" className="btn-gold" onClick={() => { setDetailOpen(false); if (detailItem) openEdit(detailItem); }}>
            Chỉnh sửa
          </Button>,
          <Button key="close" onClick={() => setDetailOpen(false)}>Đóng</Button>,
        ]}
        width={680}
        title={<span className="text-title font-display text-lg font-bold">{detailItem?.name}</span>}
      >
        {detailItem && (
          <div className="space-y-5">
            {detailItem.imageUrl ? (
              <img src={detailItem.imageUrl} alt={detailItem.name} className="w-full h-64 object-cover rounded-2xl" />
            ) : (
              <div className="w-full h-40 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-300">
                <Camera size={32} />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted text-xs uppercase font-bold tracking-wider">Trạng thái</p>
                <Tag color={detailItem.isActive ? 'success' : 'default'} className="mt-1">
                  {detailItem.isActive ? 'Đang hiển thị' : 'Đã ẩn'}
                </Tag>
              </div>
              {(detailItem as any).address && (
                <div className="col-span-1 sm:col-span-2">
                  <p className="text-muted text-xs uppercase font-bold tracking-wider">Địa chỉ</p>
                  <p className="text-title mt-1 flex items-center gap-1.5">
                    <MapPin size={14} className="text-primary" />
                    {(detailItem as any).address}
                  </p>
                </div>
              )}
              {detailItem.description && (
                <div className="col-span-2">
                  <p className="text-muted text-xs uppercase font-bold tracking-wider">Mô tả</p>
                  <p className="text-title mt-1 leading-relaxed">{detailItem.description}</p>
                </div>
              )}
              {(detailItem.latitude || detailItem.longitude) && (
                <div className="col-span-2">
                  <p className="text-muted text-xs uppercase font-bold tracking-wider">Tọa độ GPS</p>
                  <p className="text-title mt-1 font-mono text-sm">
                    {detailItem.latitude}, {detailItem.longitude}
                  </p>
                </div>
              )}
              {detailItem.mapEmbedLink && (
                <div className="col-span-2">
                  <p className="text-muted text-xs uppercase font-bold tracking-wider mb-2">Bản đồ</p>
                  <div
                    className="w-full rounded-xl overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: detailItem.mapEmbedLink }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

    </motion.div>
  );
};

export default AttractionsPage;
