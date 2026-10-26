import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { App, Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Statistic, Switch, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { BadgePercent, CheckCircle2, Edit3, Percent, Plus, RefreshCw, Search, Ticket, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import { voucherApi, type UpsertVoucherDto, type VoucherResponseDto } from '../../services/voucherApi';
import { membershipApi, type MembershipDto } from '../../services/membershipApi';

const ALL_MEMBERSHIP_VALUE = -1;

const { Title, Paragraph, Text } = Typography;

const VOUCHER_STATUS_LABELS = {
  all: 'Tất cả trạng thái',
  active: 'Đang áp dụng',
  inactive: 'Đang tắt',
  expired: 'Hết hạn',
} as const;

const formatMoney = (value?: number | null) =>
  value !== undefined && value !== null ? `${value.toLocaleString('vi-VN')} đ` : '—';

const getVoucherStatus = (voucher: VoucherResponseDto) => {
  const expired = dayjs(voucher.endDate).isBefore(dayjs(), 'day');
  if (!voucher.isActive) return { label: 'Đang tắt', color: undefined };
  if (expired) return { label: 'Hết hạn', color: 'red' as const };
  return { label: 'Đang áp dụng', color: 'green' as const };
};

const VoucherManagement: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const isEligibleMemberOnly = Form.useWatch('eligibleMemberOnly', form);
  const [items, setItems] = useState<VoucherResponseDto[]>([]);
  const [membershipOptions, setMembershipOptions] = useState<MembershipDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VoucherResponseDto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await voucherApi.getAll();
      setItems(data);
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Không thể tải danh sách voucher');
    } finally {
      setLoading(false);
    }
  }, [message]);

  const loadMemberships = useCallback(async () => {
    setMembershipLoading(true);
    try {
      const data = await membershipApi.getAll();
      setMembershipOptions(data);
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Không thể tải danh sách hạng thành viên');
    } finally {
      setMembershipLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void loadData();
    void loadMemberships();
  }, [loadData, loadMemberships]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !term ||
        item.code.toLowerCase().includes(term) ||
        item.name.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term);

      const isExpired = dayjs(item.endDate).isBefore(dayjs(), 'day');
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && item.isActive && !isExpired) ||
        (statusFilter === 'inactive' && !item.isActive) ||
        (statusFilter === 'expired' && isExpired);

      return matchesSearch && matchesStatus;
    });
  }, [items, searchTerm, statusFilter]);

  const membershipSelectOptions = useMemo(() => [
    { value: ALL_MEMBERSHIP_VALUE, label: 'Tất cả thành viên' },
    ...membershipOptions.map((item) => ({ value: item.id, label: item.tierName })),
  ], [membershipOptions]);

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter((item) => item.isActive && !dayjs(item.endDate).isBefore(dayjs(), 'day')).length,
    redeemed: items.reduce((sum, item) => sum + item.usageCount, 0),
    avgDiscount: items.length ? Math.round(items.reduce((sum, item) => sum + item.discountValue, 0) / items.length) : 0,
  }), [items]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      discountType: 'Percentage',
      minBookingAmount: 0,
      eligibleMemberOnly: false,
      eligibleMembershipId: undefined,
      isActive: true,
      dateRange: [dayjs(), dayjs().add(30, 'day')],
    });
    setOpen(true);
  };

  const openEdit = (voucher: VoucherResponseDto) => {
    setEditing(voucher);
    form.setFieldsValue({
      code: voucher.code,
      name: voucher.name,
      description: voucher.description,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      minBookingAmount: voucher.minBookingAmount,
      maxDiscountAmount: voucher.maxDiscountAmount ?? undefined,
      usageLimit: voucher.usageLimit ?? undefined,
      eligibleMemberOnly: voucher.eligibleMemberOnly,
      eligibleMembershipId: voucher.eligibleMembershipId ?? undefined,
      isActive: voucher.isActive,
      dateRange: [dayjs(voucher.startDate), dayjs(voucher.endDate)],
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await voucherApi.remove(id);
      message.success('Đã xóa voucher');
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Không thể xóa voucher');
    }
  };

  const submit = async (values: any) => {
    const payload: UpsertVoucherDto = {
      code: values.code,
      name: values.name,
      description: values.description || null,
      discountType: values.discountType,
      discountValue: values.discountValue,
      minBookingAmount: values.minBookingAmount || 0,
      maxDiscountAmount: values.maxDiscountAmount ?? null,
      usageLimit: values.usageLimit ?? null,
      eligibleMemberOnly: values.eligibleMemberOnly ?? false,
      eligibleMembershipId:
        values.eligibleMemberOnly && values.eligibleMembershipId !== ALL_MEMBERSHIP_VALUE
          ? values.eligibleMembershipId
          : null,
      isActive: values.isActive,
      startDate: values.dateRange[0].startOf('day').toISOString(),
      endDate: values.dateRange[1].endOf('day').toISOString(),
    };

    try {
      const saved = editing
        ? await voucherApi.update(editing.id, payload)
        : await voucherApi.create(payload);

      setItems((prev) => {
        if (editing) {
          return prev.map((item) => (item.id === saved.id ? saved : item));
        }
        return [saved, ...prev];
      });

      message.success(editing ? 'Đã cập nhật voucher' : 'Đã tạo voucher');
      setOpen(false);
      form.resetFields();
      setEditing(null);
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Không thể lưu voucher');
    }
  };

  const columns: ColumnsType<VoucherResponseDto> = [
    {
      title: 'Mã voucher',
      dataIndex: 'code',
      key: 'code',
      render: (code: string, record) => (
        <div>
          <Text strong style={{ color: '#A6894B', fontFamily: 'monospace' }}>{code}</Text>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>{record.name}</div>
        </div>
      ),
    },
    {
      title: 'Giảm giá',
      key: 'discount',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.discountType === 'Percentage' ? `${record.discountValue}%` : formatMoney(record.discountValue)}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>Đơn tối thiểu: {formatMoney(record.minBookingAmount)}</Text>
          {record.maxDiscountAmount && (
            <Text type="danger" style={{ fontSize: 11 }}>Trần giảm: {formatMoney(record.maxDiscountAmount)}</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Thời gian',
      key: 'date',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{dayjs(record.startDate).format('DD/MM/YYYY')}</Text>
          <Text type="secondary">đến {dayjs(record.endDate).format('DD/MM/YYYY')}</Text>
        </Space>
      ),
    },
    {
      title: 'Sử dụng',
      key: 'usage',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{record.usageCount} lượt</Text>
          <Text type="secondary">
            {record.usageLimit ? `Giới hạn ${record.usageLimit}` : 'Không giới hạn'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Phạm vi',
      key: 'scope',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Tag color={record.eligibleMemberOnly ? 'gold' : 'blue'}>
            {record.eligibleMemberOnly ? 'Chỉ VIP' : 'Tất cả khách'}
          </Tag>
          {record.eligibleMemberOnly && (
            <Text type="secondary">
              Hạng áp dụng: {membershipSelectOptions.find((item) => item.value === record.eligibleMembershipId)?.label ?? `ID ${record.eligibleMembershipId ?? '—'}`}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, record) => {
        const status = getVoucherStatus(record);
        return <Tag color={status.color}>{status.label}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<Edit3 size={14} />} onClick={() => openEdit(record)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa voucher này?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button size="small" danger icon={<Trash2 size={14} />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <Title level={2} style={{ marginBottom: 0 }}>Quản lý Voucher</Title>
          <Paragraph style={{ color: '#9ca3af', marginTop: 8 }}>
            Tạo mã giảm giá cho booking và theo dõi hiệu lực sử dụng ngay tại quầy.
          </Paragraph>
        </div>
        <Space>
          <Button icon={<RefreshCw size={15} />} onClick={loadData} loading={loading}>Làm mới</Button>
          <Button type="primary" className="btn-gold" icon={<Plus size={15} />} onClick={openCreate}>
            Thêm voucher
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {[
          { label: 'Tổng voucher', value: stats.total, icon: <Ticket size={20} />, color: '#A6894B' },
          { label: 'Đang áp dụng', value: stats.active, icon: <CheckCircle2 size={20} />, color: '#16a34a' },
          { label: 'Tổng lượt dùng', value: stats.redeemed, icon: <BadgePercent size={20} />, color: '#2563eb' },
          { label: 'Giảm giá TB', value: `${stats.avgDiscount}%`, icon: <Percent size={20} />, color: '#d97706' },
        ].map((stat, index) => (
          <Col key={index} xs={24} sm={12} lg={6}>
            <Card className="glass-card text-center" styles={{ body: { padding: 16 } }}>
              <div style={{ color: stat.color }} className="flex justify-center mb-2">{stat.icon}</div>
              <Statistic title={stat.label} value={stat.value as any} styles={{ content: { color: stat.color } }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="glass-card">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Input
              prefix={<Search size={16} style={{ color: '#9ca3af' }} />}
              placeholder="Tìm theo mã voucher, tên hoặc mô tả..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: VOUCHER_STATUS_LABELS.all },
                { value: 'active', label: VOUCHER_STATUS_LABELS.active },
                { value: 'inactive', label: VOUCHER_STATUS_LABELS.inactive },
                { value: 'expired', label: VOUCHER_STATUS_LABELS.expired },
              ]}
            />
          </Col>
          <Col xs={24} md={6}>
            <Button block onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
              Xóa bộ lọc
            </Button>
          </Col>
        </Row>
      </Card>

      <Card className="glass-card">
        <Table
          rowKey="id"
          loading={loading}
          dataSource={filteredItems}
          columns={columns}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 920 }}
        />
      </Card>

      <Modal
        open={open}
        title={editing ? 'Cập nhật voucher' : 'Tạo voucher mới'}
        onCancel={() => { setOpen(false); setEditing(null); form.resetFields(); }}
        footer={null}
        width={720}
      >
        <Form form={form} layout="vertical" onFinish={submit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="code" label="Mã voucher" rules={[{ required: true, message: 'Nhập mã voucher' }]}>
                <Input placeholder="VD: SUMMER2026" style={{ textTransform: 'uppercase' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="Tên voucher" rules={[{ required: true, message: 'Nhập tên voucher' }]}>
                <Input placeholder="Giảm giá mùa hè" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Điều kiện áp dụng, ghi chú..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="discountType" label="Loại giảm giá" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'Percentage', label: 'Theo phần trăm (%)' },
                    { value: 'Fixed', label: 'Số tiền cố định' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="discountValue" label="Giá trị giảm" rules={[{ required: true, message: 'Nhập giá trị giảm' }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="minBookingAmount" label="Đơn tối thiểu">
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  parser={(value) => value?.replace(/\./g, '') as any}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="maxDiscountAmount" label="Trần giảm giá">
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  parser={(value) => value?.replace(/\./g, '') as any}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="usageLimit" label="Giới hạn lượt dùng">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="eligibleMemberOnly" label="Áp dụng cho VIP" valuePropName="checked">
                <Switch
                  checkedChildren="Có"
                  unCheckedChildren="Không"
                  onChange={(checked) => {
                    if (!checked) {
                      form.setFieldValue('eligibleMembershipId', undefined);
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="eligibleMembershipId"
                label="Hạng thành viên"
                dependencies={["eligibleMemberOnly"]}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!getFieldValue('eligibleMemberOnly') || (value !== undefined && value !== null)) return Promise.resolve();
                      return Promise.reject(new Error('Chọn hạng thành viên cho voucher VIP'));
                    },
                  }),
                ]}
              >
                <Select
                  allowClear
                  placeholder="Chọn hạng áp dụng"
                  options={membershipSelectOptions.filter((item) => item.value !== ALL_MEMBERSHIP_VALUE)}
                  loading={membershipLoading}
                  disabled={!isEligibleMemberOnly}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="dateRange" label="Thời gian áp dụng" rules={[{ required: true, message: 'Chọn thời gian áp dụng' }]}>
                <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="isActive" label="Kích hoạt" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: true, label: 'Đang bật' },
                    { value: false, label: 'Đang tắt' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end gap-3 mt-4">
            <Button onClick={() => { setOpen(false); setEditing(null); form.resetFields(); }}>Hủy</Button>
            <Button type="primary" htmlType="submit" className="btn-gold">
              {editing ? 'Lưu thay đổi' : 'Tạo voucher'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default VoucherManagement;
