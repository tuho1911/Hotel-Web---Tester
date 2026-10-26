import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, DatePicker, Empty, Input, Select, Space, Spin, Tag, Typography, message, Table, ConfigProvider, Modal, Descriptions, Divider, Tabs } from 'antd';
import { Download, History, User as UserIcon, Calendar, Filter, Search, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import { adminApi } from '../../services/adminApi';
import { cn } from '../../utils/cn';

dayjs.extend(relativeTime);
dayjs.locale('vi');

interface AuditLogEvent {
  eventId: string;
  timestamp: string;
  actionType: string;
  entityType: string;
  context: Record<string, unknown> | null;
  changes: Record<string, unknown> | null;
  message: string;
  userId?: number | null;
  userName?: string | null;
  ipAddress?: string | null;
}

interface AuditLogExport {
  totalEvents: number;
  events: AuditLogEvent[];
}

const { RangePicker } = DatePicker;

const actionColor = (action: string) => {
  if (action === 'DELETE') return 'error';
  if (action === 'UPDATE') return 'warning';
  if (action === 'CREATE') return 'success';
  if (action === 'LOGIN') return 'blue';
  if (action === 'LOGIN_FAILED') return 'red';
  if (action === 'LOGOUT') return 'default';
  if (action === 'REGISTER') return 'cyan';
  if (action === 'REFRESH_TOKEN') return 'purple';
  return 'default';
};

interface GroupedRow {
  key: string;
  date: string;
  userName: string;
  summary: string;
  events: AuditLogEvent[];
}

const AuditLogsPage: React.FC = () => {
  const [data, setData] = useState<AuditLogExport>({ totalEvents: 0, events: [] });
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [userFilter, setUserFilter] = useState<string>('');
  const [entityType, setEntityType] = useState<string | undefined>();
  const [actionType, setActionType] = useState<string | undefined>();
  const [usersList, setUsersList] = useState<any[]>([]);
  // Default to last 7 days
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>([dayjs().subtract(7, 'day').startOf('day'), dayjs().endOf('day')]);
  const [selectedEvent, setSelectedEvent] = useState<AuditLogEvent | null>(null);
  const [cleanupModalOpen, setCleanupModalOpen] = useState(false);
  const [cleanupDays, setCleanupDays] = useState<number>(90);
  const [cleaningUp, setCleaningUp] = useState(false);

  const handleCleanup = async () => {
    setCleaningUp(true);
    try {
      const res = await adminApi.cleanupAuditLogs(cleanupDays);
      const deleted = (res as any).data?.deleted ?? (res as any).deleted ?? 0;
      message.success(`Đã dọn dẹp thành công! Đã xóa ${deleted} bản ghi nhật ký cũ hơn ${cleanupDays} ngày.`);
      setCleanupModalOpen(false);
      load();
    } catch (err) {
      console.error('AuditLog cleanup error:', err);
      message.error('Không thể dọn dẹp nhật ký hệ thống');
    } finally {
      setCleaningUp(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const query: any = {};
      // userFilter is sent as a dedicated 'userName' param — empty string means "all staff" (no filter)
      if (searchText) query.search = searchText;
      if (userFilter) query.userName = userFilter;
      if (entityType) query.entityType = entityType;
      if (actionType) query.actionType = actionType;
      // Fetch up to 500 events so grouping is complete across all users in the date range
      query.pageSize = 500;
      query.page = 1;
      
      // Ensure "To" date includes the full day (23:59:59)
      if (range?.[0]) query.from = range[0].startOf('day').toISOString();
      if (range?.[1]) query.to = range[1].endOf('day').toISOString();
      
      const [result, usersResult] = await Promise.allSettled([
        adminApi.getAuditLogs(query),
        adminApi.getUsers()
      ]);

      if (result.status === 'rejected') {
        throw result.reason;
      }

      const users = usersResult.status === 'fulfilled' ? usersResult.value : [];

      // Handle both PascalCase and camelCase response from backend
      const normalized = {
        totalEvents: (result.value as any).totalEvents ?? (result.value as any).TotalEvents ?? 0,
        events: (result.value as any).events ?? (result.value as any).Events ?? []
      };
      setData(normalized);
      setUsersList(users);
    } catch (err) {
      console.error('AuditLog load error:', err);
      message.error('Không thể tải nhật ký hoạt động');
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSearchText('');
    setUserFilter('');
    setEntityType(undefined);
    setActionType(undefined);
    setRange([dayjs().subtract(7, 'day').startOf('day'), dayjs().endOf('day')]);
    message.info('Đã đặt lại bộ lọc');
  };

  // Reactive loading
  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 400); // Debounce
    return () => clearTimeout(timer);
  }, [searchText, userFilter, entityType, actionType, range]);

  const eventsList = Array.isArray(data?.events) ? data.events : [];

  const groupedData = useMemo<GroupedRow[]>(() => {
    const map = new Map<string, AuditLogEvent[]>();
    
    [...eventsList].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).forEach(event => {
      const date = dayjs(event.timestamp).format('DD/MM/YYYY');
      const user = event.userName || 'System';
      const key = `${date}-${user}`;
      
      const existing = map.get(key) || [];
      existing.push({ ...event });
      map.set(key, existing);
    });

    return Array.from(map.entries()).map(([key, list]) => {
      const first = list[0];
      const otherCount = list.length - 1;
      const summaryText = otherCount > 0 
        ? `${first.message} (và ${otherCount} sự kiện khác)`
        : first.message;

      return {
        key,
        date: dayjs(first.timestamp).format('DD/MM/YYYY'),
        userName: first.userName || 'System',
        summary: summaryText,
        events: list
      };
    });
  }, [eventsList]);

  const exportJson = async (all = false) => {
    try {
      const query: any = {};
      if (range?.[0]) query.from = range[0].toISOString();
      if (range?.[1]) query.to = range[1].endOf('day').toISOString();
      
      const result = all ? (await adminApi.exportAuditLogs()) : (await adminApi.getAuditLogs(query));
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auditlogs-${all ? 'full' : 'filtered'}-${dayjs().format('YYYY-MM-DD')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('Đã xuất dữ liệu thành công');
    } catch {
      message.error('Lỗi khi xuất dữ liệu');
    }
  };

  const columns = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      width: 150,
    },
    {
      title: 'Nhân viên',
      dataIndex: 'userName',
      key: 'userName',
      width: 250,
      render: (text: string) => {
        const isSystem = text === 'System';
        return (
          <div className="flex items-center gap-2">
            <UserIcon size={14} className="text-muted" />
            <span className="font-medium text-title">{text}</span>
            <Tag
              color={isSystem ? 'blue' : 'gold'}
              className="m-0 border-none px-2 rounded font-bold text-[10px] uppercase"
            >
              {isSystem ? 'System' : 'Nhân viên'}
            </Tag>
          </div>
        );
      },
    },
    {
      title: 'Tóm tắt hoạt động',
      dataIndex: 'summary',
      key: 'summary',
      render: (text: string) => <span className="text-body">{text}</span>,
    },
  ];

  const expandedRowRender = (record: GroupedRow) => {
    const subColumns = [
      { 
        title: 'Giờ', 
        dataIndex: 'timestamp', 
        key: 'time', 
        render: (t: string) => {
          return (
            <div className="flex flex-col">
              <span className="font-medium text-title">{dayjs(t).format('HH:mm:ss')}</span>
              <span className="text-[10px] text-muted">{dayjs(t).fromNow()}</span>
            </div>
          );
        }, 
        width: 150 
      },
      { 
        title: 'Hành động', 
        dataIndex: 'actionType', 
        key: 'action', 
        width: 150,
        render: (a: string) => <Tag color={actionColor(a)} className="font-bold border-none">{a}</Tag>
      },
      { title: 'Đối tượng (Bảng)', dataIndex: 'entityType', key: 'entity', width: 200 },
      { title: 'Nội dung', dataIndex: 'message', key: 'msg' },
      {
        title: 'Chi tiết',
        key: 'actionDetail',
        width: 120,
        render: (_: any, recordEvent: AuditLogEvent) => (
          <Button 
            type="link" 
            size="small" 
            onClick={() => setSelectedEvent(recordEvent)}
            className="text-primary hover:text-primary-dark font-bold p-0"
          >
            Xem chi tiết
          </Button>
        )
      }
    ];

    return (
      <Table
        columns={subColumns}
        dataSource={record.events}
        pagination={false}
        rowKey="eventId"
        className="nested-audit-table"
        size="middle"
      />
    );
  };

  const renderJson = (jsonObj: any) => {
    if (!jsonObj || Object.keys(jsonObj).length === 0) {
      return <span className="text-muted italic">Không có dữ liệu</span>;
    }
    return (
      <pre className="p-4 bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl overflow-x-auto text-[12px] font-mono text-[var(--text-title)] custom-scrollbar select-all leading-relaxed">
        {JSON.stringify(jsonObj, null, 2)}
      </pre>
    );
  };

  const renderChanges = (changes: any) => {
    if (!changes || (!changes.previousValues && !changes.newValues)) {
      return <span className="text-muted italic">Không có dữ liệu thay đổi</span>;
    }

    const prev = changes.previousValues || {};
    const curr = changes.newValues || {};
    const keys = Array.from(new Set([...Object.keys(prev), ...Object.keys(curr)]));

    if (keys.length === 0) {
      return <span className="text-muted italic">Không có chi tiết thay đổi</span>;
    }

    return (
      <div className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--card-bg)]">
        <table className="w-full text-sm border-collapse text-left">
          <thead>
            <tr className="bg-[var(--bg-subtle)] border-b border-[var(--border-color)] text-muted font-bold text-xs uppercase tracking-wider">
              <th className="p-3 w-1/3">Thuộc tính</th>
              <th className="p-3 w-1/3 text-rose-500">Giá trị cũ</th>
              <th className="p-3 w-1/3 text-emerald-500">Giá trị mới</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => {
              const prevVal = typeof prev[key] === 'object' ? JSON.stringify(prev[key]) : String(prev[key] ?? '');
              const currVal = typeof curr[key] === 'object' ? JSON.stringify(curr[key]) : String(curr[key] ?? '');
              const isDifferent = prevVal !== currVal;

              return (
                <tr 
                  key={key} 
                  className={cn(
                    "border-b border-[var(--border-color)] last:border-none hover:bg-primary/5 transition-colors",
                    isDifferent ? "bg-amber-500/5 font-semibold" : ""
                  )}
                >
                  <td className="p-3 font-mono text-[13px] text-[var(--text-title)]">{key}</td>
                  <td className="p-3 text-rose-500 line-through bg-rose-500/5 break-all font-mono text-[13px]">{prevVal || <span className="italic opacity-40">none</span>}</td>
                  <td className="p-3 text-emerald-500 bg-emerald-500/5 break-all font-mono text-[13px]">{currVal || <span className="italic opacity-40">none</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <ConfigProvider
      theme={{
        components: {
          Table: {
            headerBg: 'transparent',
            headerColor: 'var(--text-secondary)',
            headerSplitColor: 'transparent',
            rowHoverBg: 'rgba(var(--primary-rgb), 0.05)',
          },
        },
      }}
    >
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <History size={24} className="text-primary" />
            </div>
            <Typography.Title level={2} style={{ margin: 0 }}>
              Nhật ký hoạt động
            </Typography.Title>
          </div>

          <Space wrap>
            <Button 
              danger 
              icon={<Trash2 size={16} />} 
              onClick={() => setCleanupModalOpen(true)} 
              className="rounded-xl h-10 px-6 hover:bg-rose-500/5 font-semibold"
            >
              Dọn dẹp nhật ký
            </Button>
            <Button icon={<Download size={16} />} onClick={() => exportJson(false)} className="rounded-xl h-10 px-6">
              Xuất theo bộ lọc
            </Button>
            <Button type="primary" icon={<Download size={16} />} onClick={() => exportJson(true)} className="btn-gold rounded-xl h-10 px-6">
              Xuất toàn bộ (Server)
            </Button>
          </Space>
        </div>

        {/* Filter Bar */}
        <Card className="glass-card !border-none !shadow-sm" styles={{ body: { padding: '16px 20px' } }}>
          <div className="flex flex-col gap-4">
            {/* Top Row: Main Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <Input
                placeholder="Tìm kiếm nội dung..."
                style={{ width: 260 }}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                className="custom-input-luxury"
                prefix={<Search size={16} className="text-muted" />}
              />

              <Select
                style={{ width: 240 }}
                showSearch
                filterOption={(input, option) =>
                  String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                value={userFilter}
                onChange={(val) => setUserFilter(val ?? '')}
                options={[
                  { label: '👥 Tất cả nhân viên', value: '' },
                  ...usersList.map(u => ({ label: u.fullName || u.email, value: u.fullName || u.email }))
                ]}
                className="custom-select-luxury"
              />

              <Select
                placeholder="Hành động"
                style={{ width: 160 }}
                allowClear
                value={actionType}
                onChange={setActionType}
                options={[
                  { label: 'Tạo (CREATE)', value: 'CREATE' },
                  { label: 'Cập nhật (UPDATE)', value: 'UPDATE' },
                  { label: 'Xóa (DELETE)', value: 'DELETE' },
                  { label: 'Đăng nhập (LOGIN)', value: 'LOGIN' },
                  { label: 'Đăng nhập thất bại', value: 'LOGIN_FAILED' },
                  { label: 'Đăng xuất (LOGOUT)', value: 'LOGOUT' },
                  { label: 'Đăng ký (REGISTER)', value: 'REGISTER' },
                ]}
                className="custom-select-luxury"
              />

              <Select
                placeholder="Phân loại đối tượng"
                style={{ width: 180 }}
                allowClear
                value={entityType}
                onChange={setEntityType}
                options={[
                  { label: 'Phòng (Room)', value: 'Room' },
                  { label: 'Loại phòng', value: 'RoomType' },
                  { label: 'Đơn đặt phòng', value: 'Booking' },
                  { label: 'Hóa đơn', value: 'Invoice' },
                  { label: 'Vật tư/Thiết bị', value: 'Equipment' },
                  { label: 'Tài khoản (User)', value: 'User' },
                  { label: 'Dịch vụ', value: 'Service' },
                ]}
                className="custom-select-luxury"
              />

              <Button 
                type="text" 
                icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />} 
                onClick={resetFilters} 
                className="text-primary hover:bg-primary/5 font-bold ml-auto flex items-center gap-2"
              >
                Đặt lại & Làm mới
              </Button>
            </div>

            {/* Bottom Row: Time Filters */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-luxury/30">
              <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/5 rounded-xl border border-primary/20">
                <Calendar size={14} className="text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Khoảng thời gian:</span>
                <RangePicker
                  variant="borderless"
                  value={range as unknown as [Dayjs, Dayjs] | null}
                  onChange={(values) => setRange(values as [Dayjs | null, Dayjs | null] | null)}
                  placeholder={['Từ ngày', 'Đến ngày']}
                  className="audit-range-picker !w-[220px]"
                />
              </div>

              <div className="flex items-center gap-2">
                <Select
                  placeholder="Tháng"
                  style={{ width: 110 }}
                  className="custom-select-luxury"
                  value={range?.[0] ? dayjs(range[0]).month() + 1 : undefined}
                  options={Array.from({ length: 12 }, (_, i) => ({ label: `Tháng ${i + 1}`, value: i + 1 }))}
                  onChange={(month) => {
                    const currentYear = range?.[0] ? dayjs(range[0]).year() : dayjs().year();
                    const start = dayjs().year(currentYear).month(month - 1).startOf('month');
                    const end = start.endOf('month');
                    setRange([start, end]);
                  }}
                />

                <Select
                  placeholder="Năm"
                  style={{ width: 100 }}
                  className="custom-select-luxury"
                  value={range?.[0] ? dayjs(range[0]).year() : dayjs().year()}
                  options={[2024, 2025, 2026].map(y => ({ label: y.toString(), value: y }))}
                  onChange={(year) => {
                    const currentMonth = range?.[0] ? dayjs(range[0]).month() : dayjs().month();
                    const start = dayjs().year(year).month(currentMonth).startOf('month');
                    const end = start.endOf('month');
                    setRange([start, end]);
                  }}
                />
              </div>

              <div className="ml-auto text-[11px] text-muted font-medium italic">
                * Tự động cập nhật sau 0.4s khi thay đổi bộ lọc
              </div>
            </div>
          </div>
        </Card>

        {/* Main Table */}
        <Card className="glass-card !border-none !shadow-sm overflow-hidden" styles={{ body: { padding: 0 } }}>
          <Table
            columns={columns}
            dataSource={groupedData}
            loading={loading}
            expandable={{
              expandedRowRender,
              expandRowByClick: true,
              columnWidth: 50,
            }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              className: "px-6 py-4",
            }}
            className="audit-main-table"
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có dữ liệu nhật ký" /> }}
          />
        </Card>

        {/* Audit Log Detail Modal */}
        <Modal
          title={
            <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-3">
              <History size={20} className="text-primary" />
              <span className="text-lg font-bold text-[var(--text-title)]">Chi tiết hoạt động</span>
            </div>
          }
          open={!!selectedEvent}
          onCancel={() => setSelectedEvent(null)}
          footer={[
            <Button key="close" type="primary" onClick={() => setSelectedEvent(null)} className="btn-gold rounded-xl px-6 h-10 font-bold">
              Đóng
            </Button>
          ]}
          width={800}
          className="luxury-modal"
          centered
        >
          {selectedEvent && (
            <div className="py-4 space-y-6">
              <Descriptions bordered column={2} className="luxury-descriptions">
                <Descriptions.Item label="Thời gian" span={2}>
                  <span className="font-bold text-[var(--text-title)]">{dayjs(selectedEvent.timestamp).format('DD/MM/YYYY HH:mm:ss')}</span>{' '}
                  <span className="text-[11px] text-muted">({dayjs(selectedEvent.timestamp).fromNow()})</span>
                </Descriptions.Item>
                <Descriptions.Item label="Nhân viên">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-title)]">{selectedEvent.userName || 'System'}</span>
                    <span className="text-[10px] text-muted">(ID: {selectedEvent.userId || 'N/A'})</span>
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="Địa chỉ IP">
                  <span className="font-mono font-medium text-[var(--text-title)]">{selectedEvent.ipAddress || 'N/A'}</span>
                </Descriptions.Item>
                <Descriptions.Item label="Hành động">
                  <Tag color={actionColor(selectedEvent.actionType)} className="font-bold border-none">
                    {selectedEvent.actionType}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Bảng đối tượng">
                  <span className="font-semibold text-[var(--text-title)]">{selectedEvent.entityType}</span>
                </Descriptions.Item>
                <Descriptions.Item label="Nội dung thông báo" span={2}>
                  <span className="text-[var(--text-body)] font-medium">{selectedEvent.message}</span>
                </Descriptions.Item>
              </Descriptions>

              <Divider className="my-2 border-[var(--border-color)]" />

              <Tabs
                defaultActiveKey="changes"
                type="card"
                className="luxury-tabs"
                items={[
                  {
                    key: 'changes',
                    label: <span className="font-bold">Chi tiết thay đổi</span>,
                    children: (
                      <div className="pt-2">
                        {renderChanges(selectedEvent.changes)}
                      </div>
                    )
                  },
                  {
                    key: 'context',
                    label: <span className="font-bold">Dữ liệu Context</span>,
                    children: (
                      <div className="pt-2">
                        {renderJson(selectedEvent.context)}
                      </div>
                    )
                  }
                ]}
              />
            </div>
          )}
        </Modal>

        {/* Audit Log Cleanup Modal */}
        <Modal
          title={
            <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-3">
              <Trash2 size={20} className="text-rose-500" />
              <span className="text-lg font-bold text-rose-500">Dọn dẹp nhật ký hệ thống</span>
            </div>
          }
          open={cleanupModalOpen}
          onCancel={() => !cleaningUp && setCleanupModalOpen(false)}
          footer={[
            <Button key="cancel" disabled={cleaningUp} onClick={() => setCleanupModalOpen(false)} className="rounded-xl px-5 h-10 font-medium">
              Hủy bỏ
            </Button>,
            <Button key="submit" type="primary" danger loading={cleaningUp} onClick={handleCleanup} className="rounded-xl px-5 h-10 font-bold">
              Xác nhận xóa
            </Button>
          ]}
          width={500}
          className="luxury-modal"
          centered
        >
          <div className="py-4 space-y-4">
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-3 items-start">
              <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={20} />
              <div className="space-y-1">
                <h4 className="font-bold text-rose-500 text-sm">Cảnh báo bảo mật & lưu trữ</h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Hành động này sẽ xóa vĩnh viễn tất cả các bản ghi nhật ký hoạt động cũ hơn thời gian quy định dưới đây. Dữ liệu sau khi xóa sẽ không thể phục hồi. Vui lòng đảm bảo bạn đã xuất lưu trữ dữ liệu trước khi thực hiện.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Thời gian lưu trữ tối thiểu:</label>
              <Select
                value={cleanupDays}
                onChange={setCleanupDays}
                className="w-full custom-select-luxury"
                size="large"
                options={[
                  { label: 'Giữ lại nhật ký 30 ngày gần nhất (Xóa trước đó)', value: 30 },
                  { label: 'Giữ lại nhật ký 60 ngày gần nhất (Xóa trước đó)', value: 60 },
                  { label: 'Giữ lại nhật ký 90 ngày gần nhất (Xóa trước đó - Khuyên dùng)', value: 90 },
                  { label: 'Giữ lại nhật ký 180 ngày gần nhất (Xóa trước đó)', value: 180 },
                  { label: 'Xóa toàn bộ lịch sử nhật ký (Không khuyên dùng)', value: 0 }
                ]}
              />
            </div>
          </div>
        </Modal>
      </div>

      <style>{`
        .audit-main-table .ant-table-thead > tr > th {
          border-bottom: 1px solid var(--border-color);
          font-weight: 600;
          padding: 16px 24px;
        }
        .audit-main-table .ant-table-tbody > tr > td {
          padding: 16px 24px;
          border-bottom: 1px solid var(--border-color);
        }
        .nested-audit-table {
          margin: 8px 0;
          background: var(--bg-subtle) !important;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--border-color);
        }
        .nested-audit-table .ant-table {
          background: transparent !important;
        }
        .nested-audit-table .ant-table-thead > tr > th {
          background: rgba(var(--primary-rgb), 0.05) !important;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 12px 24px;
        }
        .nested-audit-table .ant-table-tbody > tr > td {
          font-size: 13px;
          padding: 12px 24px;
        }
        .audit-range-picker {
          padding: 0 !important;
          width: 240px;
        }
        .audit-range-picker .ant-picker-input > input {
          font-size: 13px;
          font-weight: 600;
        }
      `}</style>
    </ConfigProvider>
  );
};

export default AuditLogsPage;
