import React, { useEffect, useMemo, useState } from 'react';
import { message as antdMessage, Button, Card as AntCard, Col, Form, Input, InputNumber, Modal, Row, Select, Space, Statistic, Table, Tag, Typography, Image, Upload, Badge, Tooltip } from 'antd';
import { Check, ImagePlus, Plus, X, Search, RefreshCcw, AlertTriangle, Info, Calendar, DollarSign } from 'lucide-react';
import { adminApi, DamageDto, EquipmentDto, RoomDto, RoomInventoryDto } from '../../services/adminApi';
import { formatVietnamTime, formatVietnamTimeShort, formatRelativeTime } from '../../utils/dateFormatter';
import { formatCurrency } from '../../utils/numberFormatter';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

const { Title, Text, Paragraph } = Typography;

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Chờ xác nhận', color: 'gold', icon: <Badge status="warning" /> },
  confirmed: { label: 'Đã xác nhận', color: 'green', icon: <Badge status="success" /> },
  cancelled: { label: 'Đã hủy', color: 'red', icon: <Badge status="error" /> },
};

const DamageLossPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const isAdminOrManager = user?.role === 'Admin' || user?.role === 'Manager';
  const [damages, setDamages] = useState<DamageDto[]>([]);
  const [equipments, setEquipments] = useState<EquipmentDto[]>([]);
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [roomInventory, setRoomInventory] = useState<RoomInventoryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<{ status?: string; equipmentId?: number }>({});
  const [openForm, setOpenForm] = useState(false);
  const [damageImage, setDamageImage] = useState<File | null>(null);
  const [form] = Form.useForm();

  const loadData = async (nextFilters = filters) => {
    setLoading(true);
    try {
      const [damageData, equipmentData, roomData] = await Promise.all([
        adminApi.getDamages(nextFilters),
        adminApi.getEquipments(),
        adminApi.getRooms(),
      ]);
      setDamages(damageData);
      setEquipments(equipmentData);
      setRooms(roomData);
    } catch (err: any) {
      antdMessage.error(err.response?.data?.message || 'Không thể tải dữ liệu hỏng / mất');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(filters);
  }, []);

  const summary = useMemo(() => {
    const totalIncidents = damages.length;
    const totalCompensation = damages.reduce((sum, item) => sum + (Number(item.penaltyAmount) || 0), 0);
    const latestUpdatedAt = damages
      .map((item) => item.createdAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b as string).getTime() - new Date(a as string).getTime())[0];

    return {
      totalIncidents,
      totalCompensation,
      latestUpdatedAt: latestUpdatedAt ? formatRelativeTime(latestUpdatedAt as string) : 'Chưa có dữ liệu',
    };
  }, [damages]);

  const loadInventoryByRoom = async (roomId?: number) => {
    if (!roomId) {
      setRoomInventory([]);
      form.setFieldValue('roomInventoryId', undefined);
      return;
    }

    try {
      const data = await adminApi.getRoomInventory(roomId);
      setRoomInventory(data);
    } catch {
      setRoomInventory([]);
    }
  };

  const submitForm = async (values: any) => {
    try {
      const res = await adminApi.reportDamage(values) as any;
      const damageId = res?.damageId || res?.data?.damageId;

      if (damageId && damageImage) {
        try {
          await adminApi.uploadDamageImage(damageId, damageImage);
          antdMessage.success('Đã ghi nhận hỏng / mất kèm ảnh');
        } catch (uploadErr) {
          antdMessage.warning('Đã ghi nhận hỏng / mất nhưng tải ảnh thất bại');
        }
      } else {
        antdMessage.success('Đã ghi nhận hỏng / mất');
      }

      setOpenForm(false);
      form.resetFields();
      setDamageImage(null);
      setRoomInventory([]);
      loadData(filters);
    } catch (err: any) {
      antdMessage.error(err.response?.data?.message || 'Không thể ghi nhận');
    }
  };

  const updateStatus = async (record: DamageDto, status: 'confirmed' | 'cancelled') => {
    try {
      await adminApi.updateDamageStatus(record.id, status);
      antdMessage.success(status === 'confirmed' ? 'Đã xác nhận sự cố' : 'Đã hủy bỏ ghi nhận');
      loadData(filters);
    } catch (err: any) {
      antdMessage.error(err.response?.data?.message || 'Không thể cập nhật trạng thái');
    }
  };

  const uploadDamageImage = async (damageId: number, file?: File) => {
    if (!file) return;

    try {
      await adminApi.uploadDamageImage(damageId, file);
      antdMessage.success('Đã tải ảnh minh chứng thành công');
      loadData(filters);
    } catch (err: any) {
      antdMessage.error(err.response?.data?.message || 'Không thể upload ảnh');
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
          <Title level={2} className="!mb-1 text-title">Hỏng / Mất / Đền bù</Title>
          <Text type="secondary" className="text-luxury">
            Ghi nhận và xử lý các trường hợp hư hại vật tư, thiết bị trong khách sạn.
          </Text>
        </div>

        <Button 
          type="primary" 
          className="btn-gold h-12 px-8 rounded-xl shadow-lg shadow-gold/20 flex items-center gap-2" 
          icon={<Plus size={20} />} 
          onClick={() => {
            setOpenForm(true);
            setDamageImage(null);
            form.resetFields();
          }}
        >
          Ghi nhận mới
        </Button>
      </motion.div>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={8}>
          <AntCard className="glass-card !border-none text-center" styles={{ body: { padding: 32 } }}>
            <div className="bg-primary/10 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
              <AlertTriangle size={24} />
            </div>
            <Statistic 
              title={<span className="text-xs font-black uppercase tracking-widest text-primary/60">Tổng sự cố</span>}
              value={summary.totalIncidents} 
              className="luxury-stat"
            />
          </AntCard>
        </Col>
        <Col xs={24} md={8}>
          <AntCard className="glass-card !border-none text-center" styles={{ body: { padding: 32 } }}>
            <div className="bg-green-500/10 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 text-green-600">
              <DollarSign size={24} />
            </div>
            <Statistic 
              title={<span className="text-xs font-black uppercase tracking-widest text-primary/60">Tổng tiền đền bù</span>}
              value={summary.totalCompensation} 
              formatter={(value) => formatCurrency(value as number)}
              className="luxury-stat"
            />
          </AntCard>
        </Col>
        <Col xs={24} md={8}>
          <AntCard className="glass-card !border-none text-center" styles={{ body: { padding: 32 } }}>
            <div className="bg-blue-500/10 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600">
              <Calendar size={24} />
            </div>
            <Statistic 
              title={<span className="text-xs font-black uppercase tracking-widest text-primary/60">Cập nhật cuối</span>}
              value={summary.latestUpdatedAt} 
              className="luxury-stat"
            />
          </AntCard>
        </Col>
      </Row>

      <AntCard className="glass-card border-none" styles={{ body: { padding: 24 } }}>
        <div className="flex flex-wrap gap-4 items-end mb-6">
          <div className="flex-1 min-w-[200px]">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary ml-1 block mb-2">Vật tư</span>
            <Select
              allowClear
              size="large"
              className="w-full custom-select-luxury"
              placeholder="Tất cả vật tư"
              value={filters.equipmentId}
              options={equipments.map((item) => ({ value: item.id, label: `${item.itemCode} - ${item.name}` }))}
              onChange={(value) => setFilters((prev) => ({ ...prev, equipmentId: value }))}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary ml-1 block mb-2">Trạng thái</span>
            <Select
              allowClear
              size="large"
              className="w-full custom-select-luxury"
              placeholder="Tất cả trạng thái"
              value={filters.status}
              options={Object.entries(STATUS_MAP).map(([key, val]) => ({ value: key, label: val.label }))}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
            />
          </div>
          <Space>
            <Button 
              type="primary" 
              size="large" 
              icon={<Search size={18} />} 
              onClick={() => loadData(filters)}
              className="btn-gold h-12 px-6 rounded-xl"
            >
              Lọc kết quả
            </Button>
            <Button 
              size="large" 
              icon={<RefreshCcw size={18} />} 
              onClick={() => {
                const next = {};
                setFilters(next);
                loadData(next);
              }}
              className="h-12 px-6 rounded-xl border-luxury"
            >
              Làm mới
            </Button>
          </Space>
        </div>

        <Table
          rowKey="id"
          loading={loading}
          dataSource={damages}
          scroll={{ x: 1000 }}
          className="luxury-table"
          pagination={{ pageSize: 8, showSizeChanger: false }}
          columns={[
            { 
              title: 'Vật tư / Thiết bị', 
              dataIndex: 'equipmentName',
              width: 200,
              render: (name: string, record: DamageDto) => (
                <Space direction="vertical" size={2}>
                  <Text strong style={{ fontSize: 13 }}>{name || '—'}</Text>
                  {record.equipmentCode && (
                    <Text type="secondary" style={{ fontSize: 11 }}>#{record.equipmentCode}</Text>
                  )}
                </Space>
              )
            },
            { 
              title: 'Phòng', 
              dataIndex: 'roomNumber',
              width: 100,
              align: 'center',
              render: (val: string) => val 
                ? <Tag color="blue" style={{ borderRadius: 20, fontWeight: 700, padding: '2px 12px' }}>P.{val}</Tag>
                : <Tag style={{ borderRadius: 20, opacity: 0.45, padding: '2px 10px' }}>Chưa gán</Tag>
            },
            { 
              title: 'SL', 
              dataIndex: 'quantity', 
              width: 55, 
              align: 'center',
              render: (v: number) => <Text strong>{v}</Text>
            },
            { 
              title: 'Tiền đền bù', 
              dataIndex: 'penaltyAmount',
              width: 140,
              render: (value: number) => (
                <Text strong style={{ color: '#b8972a' }}>{formatCurrency(value)}</Text>
              )
            },
            { 
              title: 'Mô tả', 
              dataIndex: 'description',
              ellipsis: true,
              render: (value?: string | null) => value 
                ? <Tooltip title={value}><Text italic style={{ fontSize: 12, opacity: 0.8 }}>{value}</Text></Tooltip>
                : <Text type="secondary" style={{ fontSize: 11 }}>Không có mô tả</Text>
            },
            {
              title: 'Trạng thái',
              dataIndex: 'status',
              width: 140,
              render: (value: string) => {
                const s = STATUS_MAP[value] || { label: value, color: 'default' };
                return (
                  <Tag 
                    color={s.color} 
                    style={{ 
                      borderRadius: 8, 
                      padding: '3px 10px', 
                      fontWeight: 700,
                      fontSize: 11,
                      border: 'none',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {s.label}
                  </Tag>
                );
              },
            },
            {
              title: 'Thời điểm',
              dataIndex: 'createdAt',
              width: 130,
              render: (value: string) => value ? (
                <Tooltip title={formatVietnamTime(value)}>
                  <Space direction="vertical" size={2}>
                    <Text style={{ fontSize: 12 }}>{formatRelativeTime(value)}</Text>
                    <Text type="secondary" style={{ fontSize: 10 }}>{formatVietnamTimeShort(value)}</Text>
                  </Space>
                </Tooltip>
              ) : <Text type="secondary">—</Text>,
            },
            {
              title: 'Thao tác',
              fixed: 'right',
              width: 150,
              render: (_, record: DamageDto) => (
                <Space size={6} wrap={false} style={{ alignItems: 'center' }}>
                  {record.status === 'pending' && isAdminOrManager ? (
                    <>
                      <Tooltip title="Xác nhận sự cố">
                        <Button 
                          shape="circle"
                          size="small"
                          type="primary"
                          icon={<Check size={13} />} 
                          onClick={() => updateStatus(record, 'confirmed')}
                          style={{ background: '#16a34a', borderColor: '#16a34a' }}
                        />
                      </Tooltip>
                      <Tooltip title="Hủy bỏ">
                        <Button 
                          shape="circle"
                          size="small"
                          danger
                          icon={<X size={13} />} 
                          onClick={() => updateStatus(record, 'cancelled')}
                        />
                      </Tooltip>
                    </>
                  ) : (
                    <div style={{ width: 48 }} />
                  )}

                  {record.imageUrl ? (
                    <Tooltip title="Xem ảnh minh chứng">
                      <Image 
                        src={record.imageUrl} 
                        width={28} 
                        height={28} 
                        style={{ borderRadius: 6, objectFit: 'cover', cursor: 'pointer', border: '1px solid rgba(184,151,42,0.25)', verticalAlign: 'middle' }}
                        fallback="https://via.placeholder.com/28?text=Img"
                      />
                    </Tooltip>
                  ) : null}

                  <Tooltip title={record.imageUrl ? 'Đổi ảnh minh chứng' : 'Đính kèm ảnh'}>
                    <Upload 
                      showUploadList={false} 
                      customRequest={({ file }) => uploadDamageImage(record.id, file as File)}
                    >
                      <Button 
                        shape="circle"
                        size="small"
                        icon={<ImagePlus size={13} />}
                      />
                    </Upload>
                  </Tooltip>
                </Space>
              ),
            },
          ]}
        />
      </AntCard>

      <Modal 
        open={openForm} 
        title={
          <div className="flex items-center gap-3 pb-4 border-b">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <AlertTriangle size={24} />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-primary">Ghi nhận sự cố</div>
              <div className="text-lg font-bold text-title">Báo hỏng / mất vật tư</div>
            </div>
          </div>
        }
        onCancel={() => setOpenForm(false)} 
        footer={null}
        width={600}
        centered
        className="luxury-modal"
      >
        <Form form={form} layout="vertical" onFinish={submitForm} className="pt-6">
          <Form.Item name="equipmentId" label={<span className="text-[10px] font-black uppercase tracking-widest text-primary">Vật tư / Thiết bị</span>} rules={[{ required: true }]}>
            <Select 
              size="large"
              className="custom-select-luxury"
              showSearch 
              optionFilterProp="label" 
              options={equipments.map((item) => ({ value: item.id, label: `${item.itemCode} - ${item.name}` }))} 
            />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="quantity" label={<span className="text-[10px] font-black uppercase tracking-widest text-primary">Số lượng</span>} rules={[{ required: true }]}>
                <InputNumber min={1} className="w-full luxury-input-number" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="penaltyAmount" label={<span className="text-[10px] font-black uppercase tracking-widest text-primary">Tiền đền bù</span>} rules={[{ required: true }]}>
                <InputNumber 
                  min={0} 
                  className="w-full luxury-input-number" 
                  size="large"
                  suffix="₫"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="roomId" label={<span className="text-[10px] font-black uppercase tracking-widest text-primary">Phòng liên quan</span>}>
                <Select 
                  allowClear 
                  size="large"
                  className="custom-select-luxury"
                  placeholder="Chọn phòng..."
                  options={rooms.map((room) => ({ value: room.id, label: `${room.roomNumber} - ${room.roomTypeName}` }))} 
                  onChange={loadInventoryByRoom} 
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="roomInventoryId" label={<span className="text-[10px] font-black uppercase tracking-widest text-primary">Vật tư cụ thể trong phòng</span>}>
                <Select 
                  allowClear 
                  size="large"
                  className="custom-select-luxury"
                  placeholder="Lọc theo phòng trước..."
                  disabled={!form.getFieldValue('roomId')}
                  options={roomInventory.map((item) => ({ value: item.id, label: `${item.equipmentName} (${item.quantity || 0})` }))} 
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label={<span className="text-[10px] font-black uppercase tracking-widest text-primary">Mô tả chi tiết</span>}>
            <Input.TextArea rows={3} className="input-luxury" placeholder="Tình trạng hỏng, nguyên nhân..." />
          </Form.Item>

          <Form.Item label={<span className="text-[10px] font-black uppercase tracking-widest text-primary">Ảnh minh chứng</span>}>
            <Upload 
              beforeUpload={(file) => {
                setDamageImage(file);
                return false;
              }}
              maxCount={1}
              onRemove={() => setDamageImage(null)}
              listType="picture"
            >
              <Button icon={<ImagePlus size={16} />} className="w-full h-12 flex items-center justify-center gap-2 border-dashed border-luxury/40">
                Tải ảnh minh chứng hư hại
              </Button>
            </Upload>
          </Form.Item>

          <div className="flex justify-end gap-3 pt-4">
            <Button size="large" onClick={() => setOpenForm(false)} className="rounded-xl px-8">Hủy</Button>
            <Button type="primary" size="large" htmlType="submit" className="btn-gold rounded-xl px-12">
              Lưu ghi nhận
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default DamageLossPage;
