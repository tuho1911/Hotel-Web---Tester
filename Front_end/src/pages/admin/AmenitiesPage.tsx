import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  App, Button, Checkbox, Form, Input, Modal, Popconfirm, Table, Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Camera, Edit3, Link2, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import { amenityApi, type AmenityDto } from '../../services/amenityApi';
import { adminApi, type RoomTypeDto } from '../../services/adminApi';
import { usePermission } from '../../hooks/useAppStore';

const ICON_PRESETS = [
  { label: 'WiFi', icon: '📶' },
  { label: 'TV', icon: '📺' },
  { label: 'Điều hoà', icon: '❄️' },
  { label: 'Minibar', icon: '🍹' },
  { label: 'Bồn tắm', icon: '🛁' },
  { label: 'Phòng gym', icon: '🏋️' },
  { label: 'Hồ bơi', icon: '🏊' },
  { label: 'Bãi đỗ xe', icon: '🚗' },
  { label: 'Nhà hàng', icon: '🍽️' },
  { label: 'Spa', icon: '💆' },
  { label: 'Ban công', icon: '🌅' },
  { label: 'Két sắt', icon: '🔒' },
];

const AmenitiesPage: React.FC = () => {
  const { message } = App.useApp();
  const canManage = usePermission('MANAGE_ROOMS');

  const [amenities, setAmenities] = useState<AmenityDto[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomTypeDto[]>([]);
  const [loading, setLoading] = useState(false);

  // CRUD modal
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AmenityDto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form] = Form.useForm();

  // Link modal
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkingAmenity, setLinkingAmenity] = useState<AmenityDto | null>(null);
  const [linkedRoomTypeIds, setLinkedRoomTypeIds] = useState<number[]>([]);
  const [linkSaving, setLinkSaving] = useState(false);

  // Search
  const [search, setSearch] = useState('');

  // ─── Load ─────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const [amenityList, roomTypeList] = await Promise.all([
        amenityApi.getAll(),
        adminApi.getRoomTypes(),
      ]);
      setAmenities(amenityList);
      setRoomTypes(roomTypeList);
    } catch {
      message.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const displayed = useMemo(() => {
    if (!search.trim()) return amenities;
    const q = search.toLowerCase();
    return amenities.filter(a => a.name.toLowerCase().includes(q));
  }, [amenities, search]);

  // ─── CRUD ──────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setIconFile(null);
    setPreviewUrl(null);
    setOpen(true);
  };

  const openEdit = (record: AmenityDto) => {
    setEditing(record);
    form.setFieldsValue({ name: record.name, iconUrl: record.iconUrl ?? '' });
    setIconFile(null);
    setPreviewUrl(record.iconUrl ?? null);
    setOpen(true);
  };

  const handleIconFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIconFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleSubmit = async (values: { name: string; iconUrl?: string }) => {
    setSubmitting(true);
    try {
      let savedId: number;
      if (editing) {
        await amenityApi.update(editing.id, { name: values.name, iconUrl: editing.iconUrl ?? undefined });
        savedId = editing.id;
        message.success('Đã cập nhật tiện nghi');
      } else {
        const created = await amenityApi.create({ name: values.name }) as any;
        savedId = created?.id ?? created;
        message.success('Đã tạo tiện nghi mới');
      }
      // Upload icon lên Cloudinary nếu người dùng chọn file
      if (iconFile && savedId) {
        await amenityApi.uploadIcon(savedId, iconFile);
        message.success('Đã tải icon lên Cloudinary');
      } else if (!iconFile && values.iconUrl && values.iconUrl !== (editing?.iconUrl ?? '')) {
        // Nếu chỉ nhập emoji / URL text thì update qua PUT
        await amenityApi.update(savedId, { name: values.name, iconUrl: values.iconUrl });
      }
      setOpen(false);
      form.resetFields();
      setIconFile(null);
      setPreviewUrl(null);
      await load();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể lưu tiện nghi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await amenityApi.delete(id);
      message.success('Đã xóa tiện nghi');
      await load();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể xóa');
    }
  };

  // ─── Link to Room Types ────────────────────────────────────────────────
  const openLink = (amenity: AmenityDto) => {
    setLinkingAmenity(amenity);
    const linked = roomTypes
      .filter(rt => rt.amenities?.some(a => a.id === amenity.id))
      .map(rt => rt.id);
    setLinkedRoomTypeIds(linked);
    setLinkOpen(true);
  };

  const handleLinkSave = async () => {
    if (!linkingAmenity) return;
    setLinkSaving(true);
    try {
      const previouslyLinked = roomTypes
        .filter(rt => rt.amenities?.some(a => a.id === linkingAmenity.id))
        .map(rt => rt.id);
      const toAdd = linkedRoomTypeIds.filter(id => !previouslyLinked.includes(id));
      const toRemove = previouslyLinked.filter(id => !linkedRoomTypeIds.includes(id));
      await Promise.all([
        ...toAdd.map(id => amenityApi.linkToRoomType(id, linkingAmenity.id)),
        ...toRemove.map(id => amenityApi.unlinkFromRoomType(id, linkingAmenity.id)),
      ]);
      message.success('Đã cập nhật liên kết loại phòng');
      setLinkOpen(false);
      await load();
    } catch {
      message.error('Không thể cập nhật liên kết');
    } finally {
      setLinkSaving(false);
    }
  };

  // ─── Stats ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: amenities.length,
    linked: amenities.filter(a =>
      roomTypes.some(rt => rt.amenities?.some(ra => ra.id === a.id))
    ).length,
  }), [amenities, roomTypes]);

  // ─── Table columns ──────────────────────────────────────────────────────
  const columns: ColumnsType<AmenityDto> = [
    {
      title: 'Icon',
      dataIndex: 'iconUrl',
      width: 64,
      render: (v?: string | null) => (
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
          {v && v.startsWith('http')
            ? <img src={v} alt="" className="w-full h-full object-contain" />
            : <span className="text-xl">{v || '✨'}</span>
          }
        </div>
      ),
    },
    {
      title: 'Tên tiện nghi',
      dataIndex: 'name',
      render: (name: string) => <span className="font-semibold text-title">{name}</span>,
    },
    {
      title: 'Áp dụng cho loại phòng',
      width: 400,
      render: (_: any, record: AmenityDto) => {
        const linked = roomTypes.filter(rt => rt.amenities?.some(a => a.id === record.id));
        if (linked.length === 0) return <span className="text-muted text-xs italic">Chưa liên kết</span>;
        
        const maxVisible = 3;
        const visible = linked.slice(0, maxVisible);
        const extraCount = linked.length - maxVisible;

        return (
          <div className="flex flex-wrap gap-1 items-center">
            {visible.map(rt => (
              <Tag key={rt.id} color="gold" className="text-[10px] uppercase font-bold border-none bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                {rt.name}
              </Tag>
            ))}
            {extraCount > 0 && (
              <Tag color="default" className="text-[10px] font-bold border-none bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">
                +{extraCount} loại phòng khác
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Thao tác',
      width: 130,
      render: (_: any, record: AmenityDto) => (
        <div className="flex items-center gap-1">
          {canManage && (
            <Button 
              type="text" 
              size="small"
              className="hover:bg-primary/10"
              icon={<Link2 size={15} className="text-primary" />}
              onClick={() => openLink(record)}
            >
              <span className="text-xs text-primary font-medium">Liên kết</span>
            </Button>
          )}
          {canManage && (
            <Button type="text" size="small"
              icon={<Edit3 size={15} className="text-blue-500" />}
              onClick={() => openEdit(record)} title="Chỉnh sửa" />
          )}
          {canManage && (
            <Popconfirm
              title="Xóa tiện nghi này?"
              description="Tiện nghi sẽ bị gỡ khỏi tất cả loại phòng đang dùng."
              onConfirm={() => handleDelete(record.id)}
              okText="Xóa" cancelText="Hủy"
            >
              <Button type="text" size="small"
                icon={<Trash2 size={15} className="text-red-400" />} title="Xóa" />
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-title flex items-center gap-3">
            <Sparkles size={28} className="text-primary" />
            Tiện nghi phòng
          </h1>
          <p className="text-muted mt-1">Quản lý tiện nghi và liên kết với các loại phòng</p>
        </div>
        {canManage && (
          <Button type="primary" icon={<Plus size={16} />} onClick={openCreate} className="btn-gold h-11">
            Thêm tiện nghi
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="admin-card text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">Tổng tiện nghi</p>
          <p className="text-3xl font-bold text-title mt-1">{stats.total}</p>
        </div>
        <div className="admin-card text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">Đã liên kết phòng</p>
          <p className="text-3xl font-bold text-primary mt-1">{stats.linked}</p>
        </div>
        <div className="admin-card text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">Loại phòng</p>
          <p className="text-3xl font-bold text-title mt-1">{roomTypes.length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="admin-card">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input className="input-luxury pl-9 w-full" placeholder="Tìm tiện nghi..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="admin-card !p-0 overflow-hidden">
        <Table rowKey="id" columns={columns} dataSource={displayed} loading={loading}
          pagination={{ pageSize: 15 }} className="custom-table" />
      </div>

      {/* ─── CRUD Modal ─────────────────────────────────────────────────── */}
      <Modal
        title={<span className="text-title font-display text-lg font-bold">{editing ? 'Cập nhật tiện nghi' : 'Thêm tiện nghi mới'}</span>}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={500}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-4">
          <Form.Item name="name" label="Tên tiện nghi" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
            <Input className="h-11 rounded-xl" placeholder="VD: WiFi tốc độ cao" />
          </Form.Item>

          {/* Ẩn field iconUrl nhưng vẫn bind vào form cho trường hợp emoji */}
          <Form.Item name="iconUrl" className="hidden"><Input /></Form.Item>

          {/* Upload zone */}
          <div className="mb-4">
            <p className="text-sm font-semibold text-title mb-2">Icon tiện nghi (Cloudinary)</p>
            <div
              className="border-2 border-dashed border-[var(--border-color)] rounded-xl p-5 flex flex-col items-center gap-3 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl && previewUrl.startsWith('http') || previewUrl?.startsWith('blob:') ? (
                <>
                  <img src={previewUrl} alt="icon preview" className="w-20 h-20 rounded-xl object-contain bg-gray-50" />
                  <p className="text-xs text-muted">Nhấp để đổi ảnh khác</p>
                </>
              ) : (
                <>
                  <Camera size={32} className="text-primary/50" />
                  <p className="text-sm text-muted text-center">
                    <span className="font-semibold text-primary">Nhấp để chọn ảnh</span><br />
                    PNG, JPG, SVG – tối đa 5MB · Ảnh sẽ được lưu lên Cloudinary
                  </p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconFilePick} />
          </div>

          {/* Emoji fallback */}
          <div className="mb-4">
            <p className="text-xs text-muted font-semibold mb-2 uppercase tracking-wider">Hoặc chọn emoji (nếu không upload ảnh):</p>
            <div className="flex flex-wrap gap-2">
              {ICON_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  title={preset.label}
                  onClick={() => {
                    setPreviewUrl(null);
                    setIconFile(null);
                    form.setFieldValue('iconUrl', preset.icon);
                  }}
                  className="w-10 h-10 rounded-xl border border-[var(--border-color)] hover:border-primary hover:bg-primary/5 text-xl flex items-center justify-center transition-all"
                >
                  {preset.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Live preview */}
          <div className="bg-[var(--bg-main)] rounded-xl p-4 mb-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
              {previewUrl
                ? <img src={previewUrl} alt="" className="w-full h-full object-contain" />
                : <span className="text-2xl">{form.getFieldValue('iconUrl') || '✨'}</span>
              }
            </div>
            <div>
              <p className="text-xs text-muted">Xem trước</p>
              <p className="font-semibold text-title">{form.getFieldValue('name') || 'Tên tiện nghi'}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button onClick={() => setOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitting} className="btn-gold">
              {editing ? 'Lưu thay đổi' : 'Tạo mới'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ─── Link to Room Types Modal ──────────────────────────────────── */}
      <Modal
        title={<span className="text-title font-display text-lg font-bold">Liên kết: {linkingAmenity?.name}</span>}
        open={linkOpen}
        onCancel={() => setLinkOpen(false)}
        onOk={handleLinkSave}
        okText="Lưu liên kết"
        cancelText="Hủy"
        confirmLoading={linkSaving}
        width={480}
        okButtonProps={{ className: 'btn-gold' }}
      >
        <p className="text-muted text-sm mb-4">Chọn các loại phòng sẽ hiển thị tiện nghi này:</p>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {roomTypes.map(rt => (
            <label
              key={rt.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color)] hover:border-primary hover:bg-primary/5 cursor-pointer transition-all"
            >
              <Checkbox
                checked={linkedRoomTypeIds.includes(rt.id)}
                onChange={e => {
                  if (e.target.checked) setLinkedRoomTypeIds(prev => [...prev, rt.id]);
                  else setLinkedRoomTypeIds(prev => prev.filter(id => id !== rt.id));
                }}
              />
              <div>
                <p className="font-semibold text-title text-sm">{rt.name}</p>
                <p className="text-muted text-xs">{rt.bedType || ''}{rt.viewType ? ` • ${rt.viewType}` : ''}</p>
              </div>
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          Đã chọn: <span className="font-bold text-primary">{linkedRoomTypeIds.length}</span> loại phòng
        </p>
      </Modal>

    </motion.div>
  );
};

export default AmenitiesPage;
