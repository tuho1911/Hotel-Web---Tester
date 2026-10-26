import React, { useEffect, useRef, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
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
  Typography,
  Tooltip,
} from 'antd';
import { CircleDollarSign, Edit2, FileUp, ImagePlus, Plus, RotateCcw, Trash2, Search, RefreshCcw, Package, Box, TrendingUp, AlertCircle, Download } from 'lucide-react';
import { adminApi, EquipmentDto, EquipmentStats } from '../../services/adminApi';
import { formatCurrency, formatNumber } from '../../utils/numberFormatter';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

const { Title, Text, Paragraph } = Typography;

const InventoryPage: React.FC = () => {
  const { message } = App.useApp();
  const { user } = useSelector((state: RootState) => state.auth);
  const isAdminOrManager = user?.role === 'Admin' || user?.role === 'Manager';
  const [items, setItems] = useState<EquipmentDto[]>([]);
  const [stats, setStats] = useState<EquipmentStats['overall']>({ total: 0, inUse: 0, damaged: 0, inStock: 0 });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<{ search?: string; includeInactive?: boolean }>({});
  const [editingItem, setEditingItem] = useState<EquipmentDto | null>(null);
  const [priceTarget, setPriceTarget] = useState<EquipmentDto | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [openPriceForm, setOpenPriceForm] = useState(false);
  const [form] = Form.useForm();
  const [priceForm] = Form.useForm();
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const imageFileRef = useRef<HTMLInputElement | null>(null);

  const loadData = async (nextFilters = filters) => {
    setLoading(true);
    try {
      const [equipmentData, stockSummary] = await Promise.all([
        adminApi.getEquipments(nextFilters),
        adminApi.getEquipmentStats(),
      ]);
      setItems(Array.isArray(equipmentData) ? equipmentData : []);
      setStats({
        total: Number(stockSummary?.overall?.total || 0),
        inUse: Number(stockSummary?.overall?.inUse || 0),
        damaged: Number(stockSummary?.overall?.damaged || 0),
        inStock: Number(stockSummary?.overall?.inStock || 0),
      });
    } catch (err: any) {
      setItems([]);
      setStats({ total: 0, inUse: 0, damaged: 0, inStock: 0 });
      message.error(err.response?.data?.message || 'Không thể tải vật tư');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(filters);
  }, []);

  const openCreate = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({ totalQuantity: 0, basePrice: 0, defaultPriceIfLost: 0 });
    setOpenForm(true);
  };

  const openEdit = (record: EquipmentDto) => {
    setEditingItem(record);
    form.setFieldsValue(record);
    setOpenForm(true);
  };

  const openPriceModal = (record: EquipmentDto) => {
    setPriceTarget(record);
    priceForm.setFieldsValue({
      basePrice: record.basePrice,
      defaultPriceIfLost: record.defaultPriceIfLost,
    });
    setOpenPriceForm(true);
  };

  const submitForm = async (values: any) => {
    try {
      if (editingItem) {
        await adminApi.updateEquipment(editingItem.id, {
          ...editingItem,
          ...values,
          basePrice: editingItem.basePrice,
          defaultPriceIfLost: editingItem.defaultPriceIfLost,
        } as any);
        message.success('Đã cập nhật vật tư');
      } else {
        await adminApi.createEquipment(values);
        message.success('Đã thêm vật tư');
      }
      setOpenForm(false);
      loadData(filters);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể lưu vật tư');
    }
  };

  const submitPrice = async (values: any) => {
    if (!priceTarget) return;

    try {
      await adminApi.updateEquipmentPrice(priceTarget.id, values);
      message.success('Đã cập nhật giá và đền bù');
      setOpenPriceForm(false);
      loadData(filters);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể cập nhật giá');
    }
  };

  const toggleItem = async (record: EquipmentDto) => {
    try {
      if (record.isActive) {
        await adminApi.deleteEquipment(record.id);
        message.success('Đã ẩn vật tư');
      } else {
        await adminApi.restoreEquipment(record.id);
        message.success('Đã khôi phục vật tư');
      }
      loadData(filters);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể cập nhật trạng thái');
    }
  };

  const importExcel = async (file?: File) => {
    if (!file) return;

    try {
      message.loading({ content: 'Đang tải file lên và import vật tư...', key: 'importExcel' });
      const result: any = await adminApi.importEquipmentExcel(file);
      message.success({ content: result.message || 'Đã import Excel thành công', key: 'importExcel' });
      loadData(filters);
    } catch (err: any) {
      message.error({ content: err.response?.data?.message || 'Import Excel thất bại', key: 'importExcel' });
    } finally {
      if (importFileRef.current) {
        importFileRef.current.value = '';
      }
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await adminApi.downloadEquipmentImportTemplate() as any;
      const blob = response.data || response; // Handle both direct blob and axios response
      const url = window.URL.createObjectURL(blob instanceof Blob ? blob : new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'equipment-import-template.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể tải file mẫu');
    }
  };

  const exportToExcel = async () => {
    try {
      message.loading({ content: 'Đang chuẩn bị file Excel...', key: 'exportExcel' });
      const response = await adminApi.exportEquipmentExcel(filters) as any;
      const blob = response.data || response;
      const url = window.URL.createObjectURL(blob instanceof Blob ? blob : new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `danh-sach-vat-tu-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success({ content: 'Xuất file Excel thành công!', key: 'exportExcel' });
    } catch (err: any) {
      message.error({ content: err.response?.data?.message || 'Không thể xuất file Excel', key: 'exportExcel' });
    }
  };

  const uploadImage = async (file?: File) => {
    if (!file || !editingItem) return;

    try {
      await adminApi.uploadEquipmentImage(editingItem.id, file);
      message.success('Đã upload ảnh vật tư');
      loadData(filters);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể upload ảnh');
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <Title level={2} className="!mb-1 text-title">Quản lý Kho vật tư</Title>
          <Paragraph className="text-luxury">
            Quản lý tồn kho, định giá đền bù và theo dõi tình trạng thiết bị.
          </Paragraph>
        </div>

        <Space wrap>
          {isAdminOrManager && (
            <>
              <input ref={importFileRef} type="file" hidden accept=".xlsx,.csv" onChange={(event) => importExcel(event.target.files?.[0])} />
              <Button onClick={downloadTemplate} className="h-12 px-6 rounded-xl border-luxury">
                Mẫu Excel
              </Button>
              <Button icon={<FileUp size={18} />} onClick={() => importFileRef.current?.click()} className="h-12 px-6 rounded-xl border-luxury flex items-center gap-2">
                Import Excel
              </Button>
            </>
          )}
          <Button icon={<Download size={18} />} onClick={exportToExcel} className="h-12 px-6 rounded-xl border-luxury flex items-center gap-2 bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20">
            Xuất Excel
          </Button>
          {isAdminOrManager && (
            <Button type="primary" className="btn-gold h-12 px-8 rounded-xl shadow-lg shadow-gold/20 flex items-center gap-2" icon={<Plus size={20} />} onClick={openCreate}>
              Thêm vật tư
            </Button>
          )}
        </Space>
      </motion.div>

      <Row gutter={[24, 24]}>
        {[
          { label: 'Tổng vật tư', value: stats.total, icon: <Package size={24} />, color: 'primary' },
          { label: 'Đang dùng', value: stats.inUse, icon: <TrendingUp size={24} />, color: 'green' },
          { label: 'Hỏng / Mất', value: stats.damaged, icon: <AlertCircle size={24} />, color: 'red' },
          { label: 'Tồn kho', value: stats.inStock, icon: <Box size={24} />, color: 'blue' },
        ].map((stat, idx) => (
          <Col key={idx} xs={24} md={12} xl={6}>
            <Card className="glass-card !border-none text-center" styles={{ body: { padding: 32 } }}>
              <div className={`bg-${stat.color === 'primary' ? 'primary' : stat.color + '-500'}/10 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 text-${stat.color === 'primary' ? 'primary' : stat.color + '-600'}`}>
                {stat.icon}
              </div>
              <Statistic 
                title={<span className="text-[10px] font-black uppercase tracking-widest text-primary/60">{stat.label}</span>}
                value={stat.value} 
                className="luxury-stat"
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="glass-card border-none" styles={{ body: { padding: 24 } }}>
        <div className="flex flex-wrap gap-4 items-end mb-6">
          <div className="flex-1 min-w-[300px]">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary ml-1 block mb-2">Tìm kiếm</span>
            <Input
              size="large"
              placeholder="Nhập tên vật tư, mã..."
              prefix={<Search size={18} className="text-muted" />}
              className="input-luxury"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value || undefined }))}
            />
          </div>
          <div className="w-[200px]">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary ml-1 block mb-2">Trạng thái</span>
            <Select
              size="large"
              className="w-full custom-select-luxury"
              value={filters.includeInactive ? 'all' : 'active'}
              options={[
                { value: 'active', label: 'Chỉ đang dùng' },
                { value: 'all', label: 'Tất cả' },
              ]}
              onChange={(value) => setFilters((prev) => ({ ...prev, includeInactive: value === 'all' }))}
            />
          </div>
          <Space>
            <Button type="primary" size="large" className="btn-gold h-12 px-8 rounded-xl" onClick={() => loadData(filters)}>
              Tìm kiếm
            </Button>
            <Button size="large" className="h-12 px-6 rounded-xl border-luxury" icon={<RefreshCcw size={18} />} onClick={() => {
              const next = {};
              setFilters(next);
              loadData(next);
            }}>
              Làm mới
            </Button>
          </Space>
        </div>

        <Table
          rowKey="id"
          loading={loading}
          dataSource={items}
          scroll={{ x: 1100 }}
          className="luxury-table"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          rowClassName={(record: EquipmentDto) => record.isActive ? '' : 'opacity-50'}
          columns={[
            { 
              title: 'Vật tư',
              key: 'info',
              width: 240,
              render: (_, record: EquipmentDto) => (
                <Space size={12}>
                  {record.imageUrl ? (
                    <img
                      src={record.imageUrl}
                      alt={record.name}
                      style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{
                      width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(184,151,42,0.07)', border: '1px dashed rgba(184,151,42,0.2)',
                      fontSize: 9, fontWeight: 900, color: 'rgba(184,151,42,0.4)', textAlign: 'center', letterSpacing: 0.5
                    }}>NO<br/>IMG</div>
                  )}
                  <Space direction="vertical" size={2}>
                    <Text strong style={{ fontSize: 13 }}>{record.name}</Text>
                    <Space size={6}>
                      <Text type="secondary" style={{ fontSize: 11 }}>#{record.itemCode}</Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>· {record.unit}</Text>
                    </Space>
                  </Space>
                </Space>
              )
            },
            {
              title: 'Danh mục',
              dataIndex: 'category',
              width: 110,
              render: (value: string) => (
                <Tag style={{ borderRadius: 16, padding: '2px 10px', fontWeight: 600, fontSize: 11, border: '1px solid rgba(184,151,42,0.3)', background: 'rgba(184,151,42,0.08)', color: '#b8972a' }}>
                  {value}
                </Tag>
              )
            },
            { 
              title: 'Tồn kho',
              key: 'stock',
              width: 140,
              render: (_, record: EquipmentDto) => {
                const total = record.totalQuantity || 1;
                const inStock = record.inStockQuantity || 0;
                const pct = Math.round((inStock / total) * 100);
                return (
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, fontWeight: 700 }}>{inStock}</Text>
                      <Text type="secondary" style={{ fontSize: 10 }}>/ {total}</Text>
                    </Space>
                    <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 4,
                        width: `${pct}%`,
                        background: pct > 50 ? '#16a34a' : pct > 20 ? '#b8972a' : '#dc2626',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </Space>
                );
              }
            },
            {
              title: 'Đang dùng',
              dataIndex: 'inUseQuantity',
              align: 'center',
              width: 90,
              render: (v: number) => (
                <Tag style={{ borderRadius: 16, padding: '2px 10px', fontWeight: 700, border: 'none', background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                  {v}
                </Tag>
              )
            },
            { 
              title: 'Hỏng / Mất',
              dataIndex: 'damagedQuantity',
              align: 'center',
              width: 100,
              render: (value: number) => value > 0
                ? <Tag color="error" style={{ borderRadius: 16, padding: '2px 10px', fontWeight: 700, border: 'none' }}>{value}</Tag>
                : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
            },
            { 
              title: 'Giá gốc / Đền bù',
              key: 'pricing',
              width: 160,
              render: (_, record: EquipmentDto) => (
                <Space direction="vertical" size={3}>
                  <Space size={4}>
                    <Text type="secondary" style={{ fontSize: 10 }}>Gốc:</Text>
                    <Text style={{ fontSize: 11 }}>{formatCurrency(record.basePrice)}</Text>
                  </Space>
                  <Space size={4}>
                    <Text type="secondary" style={{ fontSize: 10 }}>Đền:</Text>
                    <Text strong style={{ fontSize: 12, color: '#b8972a' }}>{formatCurrency(record.defaultPriceIfLost)}</Text>
                  </Space>
                </Space>
              )
            },
            {
              title: 'Trạng thái',
              dataIndex: 'isActive',
              width: 100,
              align: 'center',
              render: (value: boolean) => (
                <Tag
                  style={{
                    borderRadius: 16, padding: '3px 12px', fontWeight: 700, fontSize: 11,
                    border: 'none',
                    background: value ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)',
                    color: value ? '#16a34a' : '#dc2626',
                  }}
                >
                  {value ? 'Hoạt động' : 'Đã ẩn'}
                </Tag>
              )
            },
            ...(isAdminOrManager ? [{
              title: 'Thao tác',
              fixed: 'right' as const,
              width: 130,
              render: (_: any, record: EquipmentDto) => (
                <Space direction="vertical" size={6}>
                  <Space size={6}>
                    <Tooltip title="Chỉnh sửa thông tin">
                      <Button
                        size="small"
                        icon={<Edit2 size={13} />}
                        onClick={() => openEdit(record)}
                        style={{ borderRadius: 8, fontSize: 11 }}
                      >
                        Sửa
                      </Button>
                    </Tooltip>
                    <Tooltip title="Cập nhật giá">
                      <Button
                        size="small"
                        icon={<CircleDollarSign size={13} />}
                        onClick={() => openPriceModal(record)}
                        style={{ borderRadius: 8, fontSize: 11, color: '#b8972a', borderColor: 'rgba(184,151,42,0.3)' }}
                      >
                        Giá
                      </Button>
                    </Tooltip>
                  </Space>
                  <Tooltip title={record.isActive ? 'Ẩn vật tư khỏi hệ thống' : 'Khôi phục vật tư'}>
                    <Button
                      size="small"
                      danger={record.isActive}
                      icon={record.isActive ? <Trash2 size={13} /> : <RotateCcw size={13} />}
                      onClick={() => toggleItem(record)}
                      style={{ borderRadius: 8, fontSize: 11, width: '100%', ...(!record.isActive ? { color: '#16a34a', borderColor: 'rgba(22,163,74,0.3)' } : {}) }}
                    >
                      {record.isActive ? 'Ẩn' : 'Khôi phục'}
                    </Button>
                  </Tooltip>
                </Space>
              ),
            }] : [])
          ].filter(Boolean) as any}
        />
      </Card>


      <Modal 
        open={openForm} 
        title={
          <div className="flex items-center gap-3 pb-4 border-b">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Package size={24} />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-primary">{editingItem ? 'Cập nhật' : 'Thêm mới'}</div>
              <div className="text-lg font-bold text-title">Thông tin vật tư</div>
            </div>
          </div>
        }
        onCancel={() => setOpenForm(false)} 
        footer={null}
        width={600}
        centered
        className="luxury-modal"
      >
        <Form 
          form={form} 
          layout="vertical" 
          onFinish={submitForm}
          className="pt-6"
          onValuesChange={(changedValues) => {
            if (changedValues.basePrice !== undefined && !editingItem) {
              const base = changedValues.basePrice || 0;
              let multiplier = 1.1;
              if (base <= 50000) multiplier = 4.0;
              else if (base <= 200000) multiplier = 2.5;
              else if (base <= 1000000) multiplier = 1.5;
              else if (base <= 5000000) multiplier = 1.2;
              form.setFieldsValue({ defaultPriceIfLost: Math.round(base * multiplier) });
            }
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="itemCode" label={<span className="text-[10px] font-black uppercase tracking-widest text-primary">Mã vật tư</span>} rules={[{ required: !editingItem }]}>
                <Input disabled={!!editingItem} placeholder="VD: VT-001" className="input-luxury h-12" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label={<span className="text-[10px] font-black uppercase tracking-widest text-primary">Tên vật tư</span>} rules={[{ required: true }]}>
                <Input placeholder="VD: Khăn tắm trắng" className="input-luxury h-12" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label={<span className="text-[10px] font-black uppercase tracking-widest text-primary">Danh mục</span>} rules={[{ required: true }]}>
                <Input placeholder="VD: Đồ vải" className="input-luxury h-12" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="unit" label={<span className="text-[10px] font-black uppercase tracking-widest text-primary">Đơn vị tính</span>} rules={[{ required: true }]}>
                <Input placeholder="VD: Cái, Bộ..." className="input-luxury h-12" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="totalQuantity" label={<span className="text-[10px] font-black uppercase tracking-widest text-primary">Tổng số lượng</span>} rules={[{ required: true }]}>
                <InputNumber min={0} className="w-full luxury-input-number h-12" size="large" />
              </Form.Item>
            </Col>
            {!editingItem ? (
              <>
                <Col span={8}>
                  <Form.Item name="basePrice" label={<span className="text-[10px] font-black uppercase tracking-widest text-primary">Giá gốc nhập</span>} rules={[{ required: true }]}>
                    <InputNumber min={0} className="w-full luxury-input-number h-12" size="large" suffix="₫" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="defaultPriceIfLost" label={<span className="text-[10px] font-black uppercase tracking-widest text-primary">Định giá đền bù</span>}>
                    <Tooltip title="Hệ thống tự động tính dựa trên giá nhập">
                      <InputNumber min={0} className="w-full luxury-input-number h-12 bg-muted/5" size="large" disabled readOnly suffix="₫" />
                    </Tooltip>
                  </Form.Item>
                </Col>
              </>
            ) : null}
          </Row>
          <Form.Item name="supplier" label={<span className="text-[10px] font-black uppercase tracking-widest text-primary">Nhà cung cấp</span>}>
            <Input placeholder="Tên công ty cung cấp..." className="input-luxury h-12" />
          </Form.Item>

          {editingItem ? (
            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
              <input ref={imageFileRef} type="file" hidden accept="image/*" onChange={(event) => uploadImage(event.target.files?.[0])} />
              <div className="flex items-center justify-between">
                <div>
                  <Text strong className="text-xs block">Hình ảnh vật tư</Text>
                  <Text type="secondary" className="text-[10px]">Tải ảnh minh chứng giúp nhân viên dễ nhận diện.</Text>
                </div>
                <Button icon={<ImagePlus size={16} />} onClick={() => imageFileRef.current?.click()} className="btn-gold-small">
                  Tải lên
                </Button>
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex justify-end gap-3">
            <Button size="large" onClick={() => setOpenForm(false)} className="rounded-xl px-8">Hủy</Button>
            <Button type="primary" size="large" htmlType="submit" className="btn-gold rounded-xl px-12">
              {editingItem ? 'Lưu thay đổi' : 'Thêm vật tư'}
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal 
        open={openPriceForm} 
        title={
          <div className="flex items-center gap-3 pb-4 border-b">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <CircleDollarSign size={24} />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-primary">Cập nhật tài chính</div>
              <div className="text-lg font-bold text-title">{priceTarget?.name}</div>
            </div>
          </div>
        }
        onCancel={() => setOpenPriceForm(false)} 
        footer={null}
        width={500}
        centered
        className="luxury-modal"
      >
        <Form 
          form={priceForm} 
          layout="vertical" 
          onFinish={submitPrice}
          className="pt-6"
          onValuesChange={(changedValues) => {
            if (changedValues.basePrice !== undefined) {
              const base = changedValues.basePrice || 0;
              let multiplier = 1.1;
              if (base <= 50000) multiplier = 4.0;
              else if (base <= 200000) multiplier = 2.5;
              else if (base <= 1000000) multiplier = 1.5;
              else if (base <= 5000000) multiplier = 1.2;
              priceForm.setFieldsValue({ defaultPriceIfLost: Math.round(base * multiplier) });
            }
          }}
        >
          <Form.Item name="basePrice" label={<span className="text-[10px] font-black uppercase tracking-widest text-primary">Giá gốc nhập mới</span>} rules={[{ required: true }]}>
            <InputNumber min={0} className="w-full luxury-input-number h-12" size="large" suffix="₫" />
          </Form.Item>
          <Form.Item name="defaultPriceIfLost" label={<span className="text-[10px] font-black uppercase tracking-widest text-primary">Giá đền bù đề xuất</span>} rules={[{ required: true }]}>
            <InputNumber min={0} className="w-full luxury-input-number h-12 bg-muted/5" size="large" disabled readOnly suffix="₫" />
          </Form.Item>
          <div className="flex justify-end gap-3 pt-4">
            <Button size="large" onClick={() => setOpenPriceForm(false)} className="rounded-xl px-6">Hủy</Button>
            <Button type="primary" size="large" htmlType="submit" className="btn-gold rounded-xl px-12">
              Cập nhật giá
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default InventoryPage;
