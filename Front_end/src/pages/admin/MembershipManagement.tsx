import React, { useEffect, useMemo, useState } from 'react';
import { App, Button, Card, Col, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Edit3, Plus, RefreshCw, Search, Trash2, Trophy, Users } from 'lucide-react';
import { membershipApi, type MembershipDto, type UpsertMembershipDto } from '../../services/membershipApi';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

const getTierBadgeColor = (tierName: string) => {
  const lower = tierName.toLowerCase();
  if (lower.includes('platinum')) return 'gold';
  if (lower.includes('gold')) return 'orange';
  if (lower.includes('silver')) return 'default';
  return 'blue';
};

const { Title, Paragraph, Text } = Typography;

const POINT_FILTERS = [
  { label: 'Tất cả điểm', value: 'all' },
  { label: '0 - 4,999', value: '0-4999' },
  { label: '5,000 - 9,999', value: '5000-9999' },
  { label: '10,000+', value: '10000+' },
] as const;

type MembershipForm = UpsertMembershipDto;

const MembershipManagement: React.FC = () => {
  const { message } = App.useApp();
  const { user } = useSelector((state: RootState) => state.auth);
  const [form] = Form.useForm<MembershipForm>();
  const [items, setItems] = useState<MembershipDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MembershipDto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pointFilter, setPointFilter] = useState<'all' | '0-4999' | '5000-9999' | '10000+'>('all');

  const loadData = async () => {
    setLoading(true);
    try {
      setItems(await membershipApi.getAll());
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Không thể tải danh sách hạng thành viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch = !term || item.tierName.toLowerCase().includes(term);
      const points = item.minPoints ?? 0;
      const matchesPointFilter =
        pointFilter === 'all' ||
        (pointFilter === '0-4999' && points >= 0 && points < 5000) ||
        (pointFilter === '5000-9999' && points >= 5000 && points < 10000) ||
        (pointFilter === '10000+' && points >= 10000);

      return matchesSearch && matchesPointFilter;
    });
  }, [items, pointFilter, searchTerm]);

  const stats = useMemo(() => ({
    total: items.length,
    users: items.reduce((sum, item) => sum + item.userCount, 0),
  }), [items]);

  const currentMembership = useMemo(() => {
    if (!user?.membershipName) return null;
    const found = items.find((item) => item.tierName.toLowerCase() === user.membershipName?.toLowerCase());
    return found || { tierName: user.membershipName, minPoints: null, discountPercent: user.membershipDiscountPercent ?? null, userCount: 0 };
  }, [items, user]);

  const badgeColorByTier = (tierName: string) => {
    const normalized = tierName.trim().toLowerCase();
    if (normalized.includes('platinum')) return 'gold';
    if (normalized.includes('gold')) return 'orange';
    if (normalized.includes('silver')) return 'default';
    return 'blue';
  };

  const currentMembershipLabel = user?.membershipName || (user?.membershipId ? `#${user.membershipId}` : 'Chưa có');

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ tierName: '', minPoints: 0, discountPercent: 0 });
    setOpen(true);
  };

  const openEdit = (item: MembershipDto) => {
    setEditing(item);
    form.setFieldsValue({
      tierName: item.tierName,
      minPoints: item.minPoints ?? null,
      discountPercent: item.discountPercent ?? null,
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await membershipApi.remove(id);
      message.success('Đã xóa hạng thành viên');
      await loadData();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Không thể xóa hạng thành viên');
    }
  };

  const submit = async (values: MembershipForm) => {
    setSaving(true);
    try {
      const payload = {
        tierName: values.tierName,
        minPoints: values.minPoints ?? null,
        discountPercent: values.discountPercent ?? null,
      };

      if (editing) {
        await membershipApi.update(editing.id, payload);
        message.success('Đã cập nhật hạng thành viên');
      } else {
        await membershipApi.create(payload);
        message.success('Đã tạo hạng thành viên');
      }

      setOpen(false);
      setEditing(null);
      form.resetFields();
      await loadData();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Không thể lưu hạng thành viên');
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<MembershipDto> = [
    {
      title: 'Hạng thành viên',
      dataIndex: 'tierName',
      key: 'tierName',
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 ${
            value.toLowerCase().includes('platinum') ? 'bg-amber-50 border-amber-200 text-amber-600' :
            value.toLowerCase().includes('gold') ? 'bg-orange-50 border-orange-200 text-orange-600' :
            value.toLowerCase().includes('silver') ? 'bg-slate-50 border-slate-200 text-slate-600' :
            'bg-blue-50 border-blue-200 text-blue-600'
          }`}>
            <Trophy size={20} />
          </div>
          <div>
            <div className="font-display font-bold text-title">{value}</div>
            <div className="text-[10px] uppercase tracking-tighter text-muted">Quyền lợi đặc biệt</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Điểm tối thiểu',
      dataIndex: 'minPoints',
      key: 'minPoints',
      sorter: (a, b) => (a.minPoints ?? 0) - (b.minPoints ?? 0),
      render: (value) => (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-xs font-bold border border-purple-100">
          <Trophy size={12} /> {value?.toLocaleString() ?? 0}
        </span>
      ),
    },
    {
      title: 'Giảm giá',
      dataIndex: 'discountPercent',
      key: 'discountPercent',
      render: (value) => (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-100">
          {value != null ? `${value}%` : '0%'}
        </span>
      ),
    },
    { 
      title: 'Thành viên', 
      dataIndex: 'userCount', 
      key: 'userCount', 
      render: (value) => (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100">
          <Users size={12} /> {value}
        </span>
      )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="text" 
            size="small" 
            className="text-primary hover:bg-primary/10 rounded-lg"
            icon={<Edit3 size={16} />} 
            onClick={() => openEdit(record)} 
          />
          <Popconfirm 
            title="Xóa hạng thành viên này?" 
            description="Lưu ý: Chỉ có thể xóa nếu không có thành viên nào đang thuộc hạng này."
            okText="Xóa" 
            cancelText="Hủy" 
            onConfirm={() => handleDelete(record.id)}
          >
            <Button 
              type="text" 
              size="small" 
              danger 
              className="hover:bg-red-50 rounded-lg"
              icon={<Trash2 size={16} />} 
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <Title level={2} style={{ marginBottom: 0 }}>Quản lý hạng thành viên</Title>
          <Paragraph style={{ color: '#9ca3af', marginTop: 8 }}>Quản lý cấp bậc thành viên dùng cho voucher VIP và quyền lợi khách hàng.</Paragraph>
        </div>
        <div className="flex gap-2">
          <Button icon={<RefreshCw size={15} />} onClick={loadData} loading={loading}>Làm mới</Button>
          <Button type="primary" className="btn-gold" icon={<Plus size={15} />} onClick={openCreate}>Thêm hạng</Button>
        </div>
      </div>

      <Card className="glass-card">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <div className="flex items-center gap-3">
              <Trophy className="text-primary" size={24} />
              <div>
                <Text type="secondary">Hạng hiện tại của bạn</Text>
                <div className="flex items-center gap-2 mt-1">
                  <Tag color={badgeColorByTier(currentMembershipLabel)}>{currentMembershipLabel}</Tag>
                  {user?.membershipDiscountPercent != null && (
                    <Tag color="green">Giảm {user.membershipDiscountPercent}%</Tag>
                  )}
                </div>
              </div>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className="text-right md:text-left">
              <Text type="secondary">Thông tin này lấy từ profile user đã đăng nhập.</Text>
            </div>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card className="glass-card flex items-center gap-3">
            <Trophy className="text-primary" size={24} />
            <div>
              <Text type="secondary">Tổng hạng</Text>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card className="glass-card flex items-center gap-3">
            <Users className="text-primary" size={24} />
            <div>
              <Text type="secondary">Tổng người dùng</Text>
              <div className="text-2xl font-bold">{stats.users}</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="glass-card">
        <Row gutter={[12, 12]} className="mb-4">
          <Col xs={24} md={12}>
            <Input
              allowClear
              prefix={<Search size={16} className="text-gray-400" />}
              placeholder="Tìm theo tên hạng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Col>
          <Col xs={24} md={12}>
            <Select
              className="w-full"
              value={pointFilter}
              onChange={setPointFilter}
              options={POINT_FILTERS.map((item) => ({ value: item.value, label: item.label }))}
            />
          </Col>
        </Row>

        <Table rowKey="id" loading={loading} dataSource={filteredItems} columns={columns} pagination={{ pageSize: 10 }} />
      </Card>

      <Modal open={open} title={editing ? 'Cập nhật hạng thành viên' : 'Thêm hạng thành viên'} footer={null} onCancel={() => { setOpen(false); setEditing(null); form.resetFields(); }}>
        <Form form={form} layout="vertical" onFinish={submit}>
          <Form.Item name="tierName" label="Tên hạng" rules={[{ required: true, message: 'Nhập tên hạng' }]}>
            <Input placeholder="Silver / Gold / Platinum" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="minPoints" label="Điểm tối thiểu"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="discountPercent" label="Giảm giá (%)"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item>
            </Col>
          </Row>
          <div className="flex justify-end gap-3">
            <Button onClick={() => { setOpen(false); setEditing(null); form.resetFields(); }}>Hủy</Button>
            <Button type="primary" htmlType="submit" className="btn-gold" loading={saving}>{editing ? 'Lưu thay đổi' : 'Tạo hạng'}</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default MembershipManagement;
