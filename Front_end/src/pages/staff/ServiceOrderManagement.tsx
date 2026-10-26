// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { App, Button, Card, Col, Divider, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Tag, Typography } from 'antd';
import { Plus, RefreshCw, ShoppingCart, CheckCircle2, XCircle, Truck, Search } from 'lucide-react';
import dayjs from 'dayjs';
import { BookingResponseDto } from '../../services/bookingApi';
import { adminApi, RoomDto } from '../../services/adminApi';
import { serviceOrderApi, OrderServiceResponseDto, OrderServiceStatus, ServiceDto } from '../../services/serviceOrderApi';

const { Title, Paragraph, Text } = Typography;

const STATUS_COLOR: Record<OrderServiceStatus, string> = {
  Pending: 'gold',
  Delivered: 'green',
  Cancelled: 'red',
};

const STATUS_LABEL: Record<OrderServiceStatus, string> = {
  Pending: 'Chờ xử lý',
  Delivered: 'Đã giao',
  Cancelled: 'Đã hủy',
};

const formatMoney = (v?: number | null) =>
  v !== undefined && v !== null ? v.toLocaleString('vi-VN') + ' ₫' : '—';

const ServiceOrderManagementPage: React.FC = () => {
  const { message } = App.useApp();

  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<BookingResponseDto[]>([]);
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [services, setServices] = useState<ServiceDto[]>([]);

  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [orders, setOrders] = useState<OrderServiceResponseDto[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderServiceStatus | 'all'>('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();

  const selectedBooking = useMemo(
    () => bookings.find((b) => b.id === selectedBookingId) ?? null,
    [bookings, selectedBookingId]
  );

  const bookingRoomOptions = useMemo(() => {
    if (!selectedBooking) return [];
    return (selectedBooking.details ?? []).map((d) => {
      const room = rooms.find((r) => r.id === d.roomId);
      return {
        value: d.id,
        label: room ? `Phòng ${room.roomNumber} (${dayjs(d.checkInDate).format('DD/MM')} → ${dayjs(d.checkOutDate).format('DD/MM')})` : `BookingDetail #${d.id}`,
      };
    });
  }, [selectedBooking, rooms]);

  const serviceOptions = useMemo(
    () => services.map((s) => ({ value: s.id, label: `${s.name} · ${formatMoney(s.price)}${s.unit ? `/${s.unit}` : ''}` })),
    [services]
  );

  const loadBase = useCallback(async () => {
    setLoading(true);
    try {
      const [bk, rm, sv] = await Promise.all([
        serviceOrderApi.getBookingsForManagement(),
        adminApi.getRooms(),
        serviceOrderApi.getServices(),
      ]);
      setBookings(bk);
      setRooms(rm);
      setServices(sv);
      setSelectedBookingId((current) => {
        if (current && bk.some((booking) => booking.id === current)) {
          return current;
        }

        return bk.filter((b: any) => b.status === 'CheckedIn')[0]?.id ?? null;
      });
    } catch {
      message.error('Không thể tải dữ liệu đặt hàng/dịch vụ');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async (bookingId: number) => {
    try {
      const data = await serviceOrderApi.getOrdersByBookingId(bookingId);
      setOrders(data);
    } catch {
      setOrders([]);
    }
  }, []);

  useEffect(() => {
    loadBase();
  }, [loadBase]);

  useEffect(() => {
    if (selectedBookingId) {
      void loadOrders(selectedBookingId);
      return;
    }

    setOrders([]);
  }, [selectedBookingId, loadOrders]);

  const visibleOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((o) => {
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      const matchSearch =
        !term ||
        o.details?.some((d) => d.serviceName?.toLowerCase().includes(term)) ||
        String(o.id).includes(term);
      return matchStatus && matchSearch;
    });
  }, [orders, search, statusFilter]);

  const submitCreate = async (values: any) => {
    if (!selectedBookingId) {
      message.error('Vui lòng chọn booking trước');
      return;
    }
    try {
      const items = (values.items ?? []).map((it: any) => ({
        serviceId: it.serviceId,
        quantity: it.quantity,
      }));
      await serviceOrderApi.createOrder({
        bookingDetailId: values.bookingDetailId,
        items,
      });
      message.success('Tạo đơn dịch vụ thành công');
      setCreateOpen(false);
      form.resetFields();
      await loadOrders(selectedBookingId);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể tạo đơn dịch vụ');
    }
  };

  const updateStatus = async (order: OrderServiceResponseDto, status: OrderServiceStatus) => {
    try {
      await serviceOrderApi.updateStatus(order.id, { status });
      message.success(`Đã cập nhật → ${STATUS_LABEL[status]}`);
      if (selectedBookingId) await loadOrders(selectedBookingId);
    } catch {
      message.error('Cập nhật trạng thái thất bại');
    }
  };

  const columns = React.useMemo(() => [
    {
      title: 'Mã đơn',
      dataIndex: 'id',
      width: 90,
      render: (v: number) => <Text strong style={{ fontFamily: 'monospace', color: '#A6894B' }}>#{v}</Text>,
    },
    {
      title: 'Thời gian',
      dataIndex: 'orderDate',
      width: 160,
      render: (v: string) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—'),
    },
    {
      title: 'Chi tiết',
      key: 'details',
      render: (_: any, r: OrderServiceResponseDto) => (
        <div style={{ minWidth: 260 }}>
          {(r.details ?? []).slice(0, 3).map((d, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontWeight: 600 }}>{d.serviceName}</span>
              <span style={{ color: '#6b7280' }}>{d.quantity} × {formatMoney(d.unitPrice)}</span>
            </div>
          ))}
          {(r.details?.length ?? 0) > 3 && (
            <div style={{ fontSize: 12, color: '#9ca3af' }}>+{r.details.length - 3} dịch vụ</div>
          )}
        </div>
      ),
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      width: 140,
      render: (v: number) => <Text strong>{formatMoney(v)}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 140,
      render: (s: OrderServiceStatus) => <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 240,
      render: (_: any, r: OrderServiceResponseDto) => (
        <Space wrap size="small">
          {r.status === 'Pending' && (
            <Button size="small" style={{ background: '#16a34a', color: '#fff', border: 'none' }} icon={<Truck size={14} />} onClick={() => updateStatus(r, 'Delivered')}>
              Giao
            </Button>
          )}
          {r.status !== 'Cancelled' && (
            <Button size="small" danger icon={<XCircle size={14} />} onClick={() => updateStatus(r, 'Cancelled')}>
              Hủy
            </Button>
          )}
        </Space>
      ),
    },
  ], [statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <Title level={2} style={{ marginBottom: 0 }}>Đặt dịch vụ (Đặt hàng)</Title>
          <Paragraph style={{ color: '#9ca3af', marginTop: 8 }}>
            Tạo đơn dịch vụ theo phòng, theo dõi trạng thái và tự động cộng vào hóa đơn khi đã giao.
          </Paragraph>
        </div>
        <Space>
          <Button icon={<RefreshCw size={15} />} onClick={loadBase} loading={loading}>Làm mới</Button>
          <Button type="primary" className="btn-gold" icon={<Plus size={16} />} onClick={() => { setCreateOpen(true); form.resetFields(); }}>
            Tạo đơn dịch vụ
          </Button>
        </Space>
      </div>

      <Card className="glass-card">
        <Row gutter={16} align="middle">
          <Col xs={24} md={10}>
            <Select
              style={{ width: '100%' }}
              placeholder="Chọn booking..."
              showSearch
              optionFilterProp="label"
              value={selectedBookingId ?? undefined}
              onChange={(v) => setSelectedBookingId(v)}
              options={bookings.filter(b => b.status === 'CheckedIn' || b.status === 'CheckedOut').map((b) => ({ value: b.id, label: `${b.bookingCode} · ${b.guestName || '—'} · ${b.guestPhone || ''} (Phòng ${b.details?.[0]?.roomId || '?'}) [${b.status}]` }))}
            />
          </Col>
          <Col xs={24} md={8}>
            <Input
              prefix={<Search size={16} style={{ color: '#9ca3af' }} />}
              placeholder="Tìm theo tên dịch vụ hoặc mã đơn..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'Pending', label: STATUS_LABEL.Pending },
                { value: 'Delivered', label: STATUS_LABEL.Delivered },
                { value: 'Cancelled', label: STATUS_LABEL.Cancelled },
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Card className="glass-card">
        <Table
          rowKey="id"
          loading={loading}
          dataSource={visibleOrders}
          columns={columns}
          scroll={{ x: 980 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          locale={{ emptyText: selectedBookingId ? 'Chưa có đơn dịch vụ' : 'Chọn booking để xem đơn dịch vụ' }}
        />
      </Card>

      <Modal
        open={createOpen}
        title={<Space><ShoppingCart size={16} /><span>Tạo đơn dịch vụ</span></Space>}
        onCancel={() => setCreateOpen(false)}
        footer={null}
        width={760}
      >
        <Form form={form} layout="vertical" onFinish={submitCreate}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="bookingDetailId" label="Phòng (booking detail)" rules={[{ required: true, message: 'Chọn phòng' }]}>
                <Select
                  placeholder={selectedBooking ? 'Chọn phòng...' : 'Chọn booking trước'}
                  disabled={!selectedBooking}
                  options={bookingRoomOptions}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Ghi chú (tùy chọn)">
                <Input placeholder="Ví dụ: giao trước 18:00" disabled />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Dịch vụ</Divider>
          <Form.List name="items" initialValue={[{}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <Row gutter={12} key={key} align="middle" style={{ marginBottom: 10 }}>
                    <Col span={14}>
                      <Form.Item {...rest} name={[name, 'serviceId']} rules={[{ required: true, message: 'Chọn dịch vụ' }]} style={{ marginBottom: 0 }}>
                        <Select showSearch optionFilterProp="label" placeholder="Chọn dịch vụ..." options={serviceOptions} />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item {...rest} name={[name, 'quantity']} rules={[{ required: true, message: 'Số lượng' }]} initialValue={1} style={{ marginBottom: 0 }}>
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={4} style={{ textAlign: 'right' }}>
                      <Button danger onClick={() => remove(name)} disabled={fields.length === 1}>Xóa</Button>
                    </Col>
                  </Row>
                ))}
                <Button icon={<Plus size={14} />} onClick={() => add({})}>Thêm dịch vụ</Button>
              </>
            )}
          </Form.List>

          <div className="flex justify-end gap-3 mt-6">
            <Button onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button type="primary" className="btn-gold" htmlType="submit" icon={<CheckCircle2 size={14} />}>
              Tạo đơn
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ServiceOrderManagementPage;

