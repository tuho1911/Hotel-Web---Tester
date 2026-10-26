import React, { useEffect, useMemo, useState } from 'react';
import { 
  Users, 
  Bed, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight,
  Package,
  Calendar,
  Ticket,
  RefreshCcw,
  DollarSign,
  LayoutGrid
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Card, Button, Badge, cn } from '../../components/ui';
import { adminApi, DashboardMetricComparison, DashboardPeriodResponse, DashboardPeriodType, DashboardAnalyticsDto, RoomDto, EquipmentDto } from '../../services/adminApi';
import { bookingApi, BookingResponseDto } from '../../services/bookingApi';
import { useAppSelector } from '../../hooks/useAppStore';
import { useNavigate } from 'react-router-dom';
import { getConnection } from '../../services/signalRService';
import { message } from 'antd';

const normalizeRole = (roleName: string) => {
  const upper = roleName.toUpperCase();
  if (upper === 'ADMIN') return 'Admin';
  if (upper === 'MANAGER') return 'Manager';
  if (upper === 'RECEPTIONIST') return 'Receptionist';
  if (upper === 'ACCOUNTANT') return 'Accountant';
  if (upper === 'HOUSEKEEPING') return 'Housekeeping';
  if (upper === 'WAREHOUSESTAFF' || upper === 'WAREHOUSE_STAFF') return 'WarehouseStaff';
  return roleName;
};

const resolveDashboardCode = (roleName?: string): string => {
  switch ((roleName || '').trim()) {
    case 'Admin': return 'ADMIN_DASHBOARD';
    case 'Manager': return 'MANAGER_DASHBOARD';
    case 'Receptionist': return 'RECEPTION_DASHBOARD';
    case 'Accountant': return 'ACCOUNTANT_DASHBOARD';
    case 'Housekeeping': return 'HOUSEKEEPING_DASHBOARD';
    case 'WarehouseStaff': return 'WAREHOUSE_DASHBOARD';
    default: return `${(roleName || 'Guest').toUpperCase().replace(/\s+/g, '_')}_DASHBOARD`;
  }
};

const formatValue = (val: number, isMoney: boolean = false) => {
  if (isMoney) return `${val.toLocaleString('vi-VN')} ₫`;
  return val.toLocaleString('vi-VN');
};

const getRoleStats = (roleName: string, summary: any) => {
  if (roleName === 'WarehouseStaff') {
    return [
      { label: 'Tồn kho', value: formatValue(Number(summary?.inventory?.inStockQuantity || 0)), icon: Package, color: 'text-info', bg: 'bg-info/10' },
      { label: 'Báo hỏng', value: formatValue(Number(summary?.damage?.damageReports || 0)), icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
      { label: 'Tồn thấp', value: formatValue(Number(summary?.risk?.lowStockItems || 0)), icon: AlertTriangle, color: 'text-error', bg: 'bg-error/10' },
      { label: 'Tiền phạt', value: formatValue(Number(summary?.damage?.penaltyAmount || 0), true), icon: DollarSign, color: 'text-success', bg: 'bg-success/10' },
    ];
  }

  if (roleName === 'Housekeeping') {
    return [
      { label: 'Báo hỏng', value: formatValue(Number(summary?.damage?.damageReports || 0)), icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
      { label: 'SL hỏng/mất', value: formatValue(Number(summary?.damage?.damagedQuantityInPeriod || 0)), icon: Package, color: 'text-error', bg: 'bg-error/10' },
      { label: 'Tồn thấp', value: formatValue(Number(summary?.risk?.lowStockItems || 0)), icon: AlertTriangle, color: 'text-info', bg: 'bg-info/10' },
      { label: 'Tiền phạt', value: formatValue(Number(summary?.damage?.penaltyAmount || 0), true), icon: DollarSign, color: 'text-success', bg: 'bg-success/10' },
    ];
  }

  if (roleName === 'Accountant') {
    return [
      { label: 'Doanh thu', value: formatValue(Number(summary?.operations?.totalRevenue || summary?.revenue?.totalRevenue || 0), true), icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
      { label: 'Tiền phạt', value: formatValue(Number(summary?.damage?.penaltyAmount || 0), true), icon: DollarSign, color: 'text-warning', bg: 'bg-warning/10' },
      { label: 'Báo hỏng', value: formatValue(Number(summary?.damage?.damageReports || 0)), icon: AlertTriangle, color: 'text-error', bg: 'bg-error/10' },
      { label: 'Tồn thấp', value: formatValue(Number(summary?.risk?.lowStockItems || 0)), icon: Package, color: 'text-info', bg: 'bg-info/10' },
    ];
  }

  if (roleName === 'Receptionist') {
    return [
      { label: 'Booking', value: formatValue(Number(summary?.operations?.totalBookings || summary?.booking?.totalBookings || 0)), icon: Bed, color: 'text-info', bg: 'bg-info/10' },
      { label: 'Doanh thu', value: formatValue(Number(summary?.operations?.totalRevenue || summary?.revenue?.totalRevenue || 0), true), icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
      { label: 'Báo hỏng', value: formatValue(Number(summary?.damage?.damageReports || 0)), icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
      { label: 'Tồn thấp', value: formatValue(Number(summary?.risk?.lowStockItems || 0)), icon: Package, color: 'text-error', bg: 'bg-error/10' },
    ];
  }

  // Default / Manager / Admin
  return [
    { code: 'totalRevenue', label: 'Doanh thu', value: formatValue(Number(summary?.operations?.totalRevenue || summary?.revenue?.totalRevenue || 0), true), icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
    { code: 'totalBookings', label: 'Booking', value: formatValue(Number(summary?.operations?.totalBookings || summary?.booking?.totalBookings || 0)), icon: Bed, color: 'text-info', bg: 'bg-info/10' },
    { code: 'lowStockItems', label: 'Tồn thấp', value: formatValue(Number(summary?.risk?.lowStockItems || summary?.warehouse?.lowStockItems || 0)), icon: Package, color: 'text-warning', bg: 'bg-warning/10' },
    { code: 'damageReports', label: 'Báo hỏng', value: formatValue(Number(summary?.damage?.damageReports || summary?.risk?.damageReports || summary?.warehouse?.damageReports || 0)), icon: AlertTriangle, color: 'text-error', bg: 'bg-error/10' },
  ];
};

const getKpiIconAndColor = (code: string) => {
  const lower = code.toLowerCase();
  if (lower.includes('revenue') || lower.includes('amount') || lower.includes('paid')) return { icon: DollarSign, color: 'text-success', bg: 'bg-success/10' };
  if (lower.includes('booking') || lower.includes('room')) return { icon: Bed, color: 'text-info', bg: 'bg-info/10' };
  if (lower.includes('damage') || lower.includes('lowstock')) return { icon: AlertTriangle, color: 'text-error', bg: 'bg-error/10' };
  if (lower.includes('stock') || lower.includes('quantity')) return { icon: Package, color: 'text-info', bg: 'bg-info/10' };
  if (lower.includes('occupancy')) return { icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' };
  return { icon: CheckCircle, color: 'text-primary', bg: 'bg-primary/10' };
};

const getRoleActions = (permissions: string[], roleName: string) => {
  const actions = [];
  const isAdminOrManager = ['Admin', 'Manager'].includes(roleName);
  const basePath = isAdminOrManager ? '/admin' : '/staff';

  // 1. Quản lý phòng & Dọn phòng (MANAGE_ROOMS)
  if (permissions.includes('MANAGE_ROOMS') || roleName === 'Admin') {
    if (isAdminOrManager) {
      actions.push({ label: 'Quản lý phòng', icon: Bed, color: 'bg-blue-50 text-blue-600', link: '/admin/rooms' });
    } else {
      actions.push({ label: 'Dọn phòng', icon: Bed, color: 'bg-blue-50 text-blue-600', link: '/staff/cleaning' });
    }
  }

  // 2. Booking & Lễ tân & Sơ đồ phòng & Voucher (MANAGE_BOOKINGS)
  if (permissions.includes('MANAGE_BOOKINGS') || roleName === 'Admin') {
    if (isAdminOrManager) {
      actions.push({ label: 'Sơ đồ phòng', icon: LayoutGrid, color: 'bg-indigo-50 text-indigo-600', link: '/admin/bookings/room-map' });
    } else {
      actions.push({ label: 'Lễ tân', icon: Bed, color: 'bg-blue-50 text-blue-600', link: '/staff/bookings/arrivals' });
      actions.push({ label: 'Sơ đồ phòng', icon: LayoutGrid, color: 'bg-indigo-50 text-indigo-600', link: '/staff/bookings/room-map' });
    }
    actions.push({ label: 'Tạo Voucher', icon: Ticket, color: 'bg-amber-50 text-amber-600', link: `${basePath}/vouchers` });
    actions.push({ label: 'Xem Booking', icon: Calendar, color: 'bg-blue-50 text-blue-600', link: `${basePath}/bookings/manage` });
  }

  // 3. Kho bãi & Báo hỏng (MANAGE_INVENTORY)
  if (permissions.includes('MANAGE_INVENTORY') || roleName === 'Admin') {
    actions.push({ label: 'Nhập kho', icon: Package, color: 'bg-green-50 text-green-600', link: '/admin/inventory' });
    actions.push({ label: 'Báo hỏng', icon: AlertTriangle, color: 'bg-red-50 text-red-600', link: '/admin/inventory/damages' });
  }

  // 4. Hóa đơn (MANAGE_INVOICES)
  if (permissions.includes('MANAGE_INVOICES') || roleName === 'Admin') {
    actions.push({ label: 'Hóa đơn', icon: DollarSign, color: 'bg-emerald-50 text-emerald-600', link: `${basePath}/invoices` });
  }

  // 5. Báo cáo & Thống kê (VIEW_REPORTS)
  if (permissions.includes('VIEW_REPORTS') || roleName === 'Admin') {
    actions.push({ label: 'Báo cáo', icon: TrendingUp, color: 'bg-indigo-50 text-indigo-600', link: '/admin/analytics' });
  }

  // 6. Cài đặt hệ thống (Admin)
  if (roleName === 'Admin') {
    actions.push({ label: 'Cài đặt', icon: Plus, color: 'bg-gray-50 text-gray-600', link: '/admin/settings' });
  }

  return actions.slice(0, 6);
};

const occupancyData = [
  { name: 'Mon', value: 65 }, { name: 'Tue', value: 72 }, { name: 'Wed', value: 85 },
  { name: 'Thu', value: 78 }, { name: 'Fri', value: 92 }, { name: 'Sat', value: 98 }, { name: 'Sun', value: 88 },
];
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

const Dashboard: React.FC = () => {
  const user = useAppSelector((s) => s.auth.user);
  const roleName = normalizeRole(user?.role || 'Guest');
  const permissions = useMemo(() => user?.permissions || [], [user]);
  const navigate = useNavigate();

  const [periodType, setPeriodType] = useState<DashboardPeriodType>('MONTHLY');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardPeriodResponse | null>(null);
  const [equipmentStats, setEquipmentStats] = useState<any>(null);

  // States bổ sung cho các cấp
  const [analyticsData, setAnalyticsData] = useState<DashboardAnalyticsDto | null>(null);
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [lowStockEquipments, setLowStockEquipments] = useState<EquipmentDto[]>([]);
  const [updatingRoomId, setUpdatingRoomId] = useState<number | null>(null);

  const dashboardCode = useMemo(() => resolveDashboardCode(roleName), [roleName]);

  const loadData = async (isSilent: boolean = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [result, statsResult] = await Promise.all([
        adminApi.getCurrentDashboardPeriod({ roleName, periodType }),
        adminApi.getEquipmentStats().catch(() => null)
      ]);
      setData(result);
      if (statsResult) setEquipmentStats(statsResult);

      // Tải dữ liệu thực tế cho nhóm Quản lý & Tài chính
      if (['Admin', 'Manager', 'Accountant'].includes(roleName)) {
        const analyticsResult = await adminApi.getDashboardAnalytics().catch(() => null);
        if (analyticsResult) setAnalyticsData(analyticsResult);
      }

      // Tải dữ liệu phòng cho nhóm Lễ tân & Buồng phòng
      if (['Housekeeping', 'Receptionist'].includes(roleName)) {
        const roomsResult = await adminApi.getRooms().catch(() => []);
        setRooms(roomsResult);
      }

      // Tải dữ liệu tồn kho thấp thực tế cho nhóm Thủ kho
      if (roleName === 'WarehouseStaff') {
        const equipmentsResult = await adminApi.getEquipments().catch(() => []);
        const filtered = equipmentsResult.filter((e: any) => e.inStockQuantity <= 10 && e.isActive);
        setLowStockEquipments(filtered);
      }
    } catch (error: any) {
      console.error('Lỗi tải dashboard:', error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await adminApi.refreshDashboardPeriod(dashboardCode, { roleName, periodType });
      await loadData();
    } catch (error: any) {
      console.error('Lỗi refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dashboardCode, periodType, roleName]);

  // Đăng ký SignalR kết nối tự động cập nhật thời gian thực
  useEffect(() => {
    const connection = getConnection();
    if (connection) {
      const handleRoomStatusChanged = () => {
        console.info('[SignalR] Nhận RoomStatusChanged, tự động cập nhật dashboard ngầm...');
        loadData(true);
      };
      const handleReceiveNotification = () => {
        console.info('[SignalR] Nhận ReceiveNotification, tự động cập nhật dashboard ngầm...');
        loadData(true);
      };

      connection.on('RoomStatusChanged', handleRoomStatusChanged);
      connection.on('ReceiveNotification', handleReceiveNotification);

      return () => {
         connection.off('RoomStatusChanged', handleRoomStatusChanged);
         connection.off('ReceiveNotification', handleReceiveNotification);
      };
    }
  }, [roleName, periodType]);

  const handleUpdateCleaningStatus = async (roomId: number, status: string, cleaningStatus: string) => {
    setUpdatingRoomId(roomId);
    try {
      await adminApi.updateRoomCleaningStatus(roomId, { status, cleaningStatus });
      message.success(`Đã cập nhật trạng thái phòng thành công!`);
      // Silent refresh rooms
      const roomsResult = await adminApi.getRooms().catch(() => []);
      setRooms(roomsResult);
    } catch (error: any) {
      console.error('Lỗi cập nhật trạng thái dọn phòng:', error);
      message.error(error?.response?.data?.message || 'Không thể cập nhật trạng thái dọn phòng');
    } finally {
      setUpdatingRoomId(null);
    }
  };

  const summary = (data?.dashboard?.summary || {}) as any;
  const kpiCards = data?.dashboard?.widgets?.kpiCards as any[];
  const comparisonMetrics = data?.comparison?.metrics || {};

  const stats = kpiCards && kpiCards.length > 0 ? kpiCards.map(c => {
    const { icon, color, bg } = getKpiIconAndColor(c.code);
    return { 
      code: c.code,
      label: c.title, 
      value: formatValue(Number(c.value), c.unit === 'VND' || c.unit === 'VNĐ'), 
      icon, color, bg 
    };
  }) : getRoleStats(roleName, summary);
  const quickActions = getRoleActions(permissions, roleName);
  const isManagerOrAdmin = ['Admin', 'Manager'].includes(roleName);
  const bookingLink = isManagerOrAdmin ? '/admin/bookings' : '/staff/bookings/manage';

  const inventoryUsage = useMemo(() => {
    if (equipmentStats?.byCategory && equipmentStats.byCategory.length > 0) {
      return equipmentStats.byCategory.map((c: any) => ({
        name: c.category || 'Khác',
        value: c.totalQuantity || 0
      })).filter((c: any) => c.value > 0);
    }
    return [
      { name: 'Chưa có dữ liệu', value: 1 }
    ];
  }, [equipmentStats]);

  const totalInventoryItems = equipmentStats?.overall?.total || 0;
  
  const recentAudits = (data?.dashboard?.tables?.recentAudits || []) as any[];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-title">{data?.dashboardTitle || 'Dashboard'}</h1>
          <p className="text-muted">Xin chào {user?.fullName || 'bạn'}, dưới đây là tổng quan ({data?.periodType || 'Tháng'}).</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            className="bg-[var(--bg-subtle)] text-[var(--text-title)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm outline-none font-medium"
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value as DashboardPeriodType)}
          >
            <option value="DAILY">Ngày</option>
            <option value="WEEKLY">Tuần</option>
            <option value="MONTHLY">Tháng</option>
            <option value="QUARTERLY">Quý</option>
            <option value="YEARLY">Năm</option>
          </select>
          <Button variant="secondary" onClick={onRefresh} disabled={refreshing} className="gap-2">
            <RefreshCcw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            <span className="hidden sm:inline">Làm mới</span>
          </Button>
          {(permissions.includes('MANAGE_BOOKINGS') || roleName === 'Admin') && (
            <Button className="gap-2" onClick={() => navigate(bookingLink)}>
              <Plus className="w-4 h-4" />
              <span>Tạo Booking</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <Card key={idx} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className={cn('p-3 rounded-xl', stat.bg)}>
                <stat.icon className={cn('w-6 h-6', stat.color)} />
              </div>
              {comparisonMetrics[stat.code] && comparisonMetrics[stat.code].growthRate !== null && (
                <div className={cn("flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full", comparisonMetrics[stat.code].trend === 'up' ? (comparisonMetrics[stat.code].directionMeaning === 'lower_is_better' ? 'text-error bg-error/10' : 'text-success bg-success/10') : comparisonMetrics[stat.code].trend === 'down' ? (comparisonMetrics[stat.code].directionMeaning === 'lower_is_better' ? 'text-success bg-success/10' : 'text-error bg-error/10') : 'text-muted bg-muted/10')}>
                  {comparisonMetrics[stat.code].trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : comparisonMetrics[stat.code].trend === 'down' ? <ArrowDownRight className="w-3 h-3" /> : null}
                  <span>{Math.abs(comparisonMetrics[stat.code].growthRate)}%</span>
                </div>
              )}
            </div>
            <div className="mt-4">
              <p className="text-muted text-sm font-medium">{stat.label}</p>
              <h3 className="text-2xl font-bold mt-1 text-title">{loading ? '...' : stat.value}</h3>
            </div>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      {data?.dashboard?.alerts && data.dashboard.alerts.length > 0 && (
        <Card className="p-4 border-error/50 bg-error/5">
          <div className="flex items-center gap-2 mb-2 text-error">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold">Cảnh báo vận hành</h3>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {data.dashboard.alerts.map((a: any, idx: number) => (
              <Badge key={idx} variant={a.level === 'warning' ? 'warning' : 'info'}>
                {a.code}: {a.value}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* WIDGET CẤP 1: BÊN TRÁI (COL-SPAN-2) */}
        {roleName === 'Housekeeping' ? (
          /* Nhóm Buồng phòng: Hàng đợi dọn dẹp tương tác */
          <Card className="lg:col-span-2 p-6 flex flex-col justify-between min-h-[380px]">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg text-title">Hàng đợi Dọn phòng (Interactive Queue)</h3>
                  <p className="text-xs text-muted mt-0.5">Danh sách phòng cần vệ sinh (Cập nhật thời gian thực qua SignalR)</p>
                </div>
                <Badge variant="info">Live Feed</Badge>
              </div>
              
              {(() => {
                const dirtyRooms = rooms.filter(r => r.cleaningStatus === 'Dirty' || r.cleaningStatus === 'Cleaning').slice(0, 8);
                if (dirtyRooms.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-[260px] text-center bg-emerald-500/5 rounded-2xl border border-dashed border-emerald-500/20 p-6">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                        <CheckCircle className="w-6 h-6 text-emerald-600" />
                      </div>
                      <h4 className="font-bold text-emerald-800 text-sm">Tất cả các phòng đã sạch sẽ!</h4>
                      <p className="text-xs text-emerald-600 mt-1 max-w-[280px]">Chúc bạn một ngày làm việc vui vẻ và hiệu quả. Mọi phòng đều đã sẵn sàng đón khách.</p>
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[280px] overflow-y-auto pr-1">
                    {dirtyRooms.map((room) => {
                      const isDirty = room.cleaningStatus === 'Dirty';
                      const isCleaning = room.cleaningStatus === 'Cleaning';
                      const isUpdating = updatingRoomId === room.id;
                      return (
                        <div
                          key={room.id}
                          className="flex items-center justify-between p-4 rounded-xl border border-border bg-[var(--bg-subtle)] hover:border-primary/35 hover:shadow-sm transition-all"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-title">Phòng {room.roomNumber}</span>
                              <Badge variant={isDirty ? 'error' : 'warning'} className="text-[10px] px-2 py-0.5">
                                {isDirty ? 'Chưa dọn' : 'Đang dọn'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted mt-1 truncate max-w-[150px]">{room.roomTypeName} • Tầng {room.floor || 1}</p>
                          </div>
                          <button
                            disabled={isUpdating}
                            onClick={() => handleUpdateCleaningStatus(room.id, room.status, isDirty ? 'Cleaning' : 'Clean')}
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center disabled:opacity-50 text-white",
                              isDirty && "bg-blue-600 hover:bg-blue-700",
                              isCleaning && "bg-emerald-600 hover:bg-emerald-700"
                            )}
                          >
                            {isUpdating ? '...' : (isDirty ? 'Dọn phòng' : 'Hoàn tất')}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </Card>
        ) : roleName === 'WarehouseStaff' ? (
          /* Nhóm Thủ kho: Cảnh báo tồn kho thấp thực tế */
          <Card className="lg:col-span-2 p-6 flex flex-col justify-between min-h-[380px]">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg text-title">Cảnh báo vật tư tồn thấp thực tế</h3>
                  <p className="text-xs text-muted mt-0.5">Các thiết bị/vật phẩm trong kho có số lượng dưới ngưỡng an toàn (≤ 10)</p>
                </div>
                <Badge variant="error">Critical Alerts</Badge>
              </div>

              {lowStockEquipments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[260px] text-center bg-emerald-500/5 rounded-2xl border border-dashed border-emerald-500/20 p-6">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h4 className="font-bold text-emerald-800 text-sm">Kho hàng an toàn!</h4>
                  <p className="text-xs text-emerald-600 mt-1 max-w-[280px]">Tất cả các vật phẩm và trang thiết bị đều có mức tồn kho dồi dào trên mức an toàn.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  <div className="hidden sm:grid grid-cols-5 text-[10px] font-bold uppercase tracking-wider text-muted px-3 border-b border-border pb-1">
                    <div className="col-span-2">Vật phẩm</div>
                    <div>Phân loại</div>
                    <div className="text-center">Tồn kho</div>
                    <div className="text-right">Trạng thái</div>
                  </div>
                  {lowStockEquipments.slice(0, 5).map((eq) => {
                    const isCritical = eq.inStockQuantity <= 3;
                    return (
                      <div key={eq.id} className="grid grid-cols-1 sm:grid-cols-5 items-center p-3 rounded-xl border border-border bg-[var(--bg-subtle)] hover:border-primary/30 transition-all text-sm gap-2 sm:gap-0">
                        <div className="col-span-2 flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className="font-bold text-title">{eq.name}</span>
                          <span className="text-[10px] text-muted px-1.5 py-0.5 rounded border border-border w-fit">{eq.itemCode}</span>
                        </div>
                        <div className="text-xs text-muted truncate">{eq.category}</div>
                        <div className="text-center font-bold text-title">{eq.inStockQuantity} <span className="text-xs font-normal text-muted">{eq.unit}</span></div>
                        <div className="text-right">
                          <Badge variant={isCritical ? 'error' : 'warning'} className="text-[10px] px-2 py-0.5">
                            {isCritical ? 'Nguy cấp' : 'Tồn thấp'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-end pt-1">
                    <Button variant="secondary" size="sm" onClick={() => navigate('/admin/inventory')} className="text-xs py-2 px-4">
                      Đến Quản lý kho
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ) : roleName === 'Receptionist' ? (
          /* Nhóm Lễ tân: Sơ đồ phòng rút gọn thời gian thực */
          <Card className="lg:col-span-2 p-6 flex flex-col justify-between min-h-[380px]">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg text-title">Sơ đồ phòng khách sạn (Live Grid)</h3>
                  <p className="text-xs text-muted mt-0.5">Trạng thái phòng thực tế thời gian thực (Gõ để xem chi tiết)</p>
                </div>
                <Badge variant="success">Realtime Map</Badge>
              </div>

              {(() => {
                const displayRooms = rooms.slice(0, 24);
                if (displayRooms.length === 0) {
                  return <p className="text-sm text-muted">Đang tải dữ liệu phòng...</p>;
                }
                return (
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-[280px] overflow-y-auto pr-1">
                    {displayRooms.map((room) => {
                      const isOccupied = room.status === 'Occupied';
                      const isMaintenance = room.status === 'Maintenance';
                      const isAvailable = room.status === 'Available';
                      const isDirty = room.cleaningStatus === 'Dirty';
                      return (
                        <button
                          key={room.id}
                          onClick={() => navigate(isManagerOrAdmin ? '/admin/bookings/room-map' : '/staff/bookings/room-map')}
                          className={cn(
                            "flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 active:scale-95 relative group",
                            isAvailable && "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10",
                            isOccupied && "bg-amber-500/5 border-amber-500/20 text-amber-600 hover:bg-amber-500/10",
                            isMaintenance && "bg-rose-500/5 border-rose-500/20 text-rose-600 hover:bg-rose-500/10",
                            (!isAvailable && !isOccupied && !isMaintenance) && "bg-slate-500/5 border-slate-500/20 text-slate-600 hover:bg-slate-500/10"
                          )}
                        >
                          <span className="text-sm font-bold">{room.roomNumber}</span>
                          <span className="text-[10px] opacity-75 truncate max-w-full mt-0.5">{room.roomTypeName}</span>
                          {isDirty && (
                            <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </Card>
        ) : (
          /* Nhóm Quản lý & Kế toán (Default / Admin / Manager / Accountant): Biểu đồ Doanh thu Thực tế */
          <Card className="lg:col-span-2 p-6 flex flex-col justify-between min-h-[380px]">
            {(() => {
              const hasAnalytics = analyticsData?.revenueChart30Days && analyticsData.revenueChart30Days.length > 0;
              const chartSource = hasAnalytics
                ? analyticsData!.revenueChart30Days.map(item => ({
                    name: item.date,
                    value: item.revenue
                  }))
                : occupancyData;
              const chartTitle = hasAnalytics ? "Biểu đồ Doanh thu 30 ngày qua" : "Tỷ lệ lấp đầy phòng";
              const valFormatter = (v: number) => hasAnalytics ? `${(v/1000000).toFixed(1)}M đ` : `${v}%`;

              return (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-bold text-lg text-title">{chartTitle}</h3>
                      <p className="text-xs text-muted mt-0.5">
                        {hasAnalytics ? "Tổng hợp doanh thu từ các hóa đơn thực tế trong kỳ" : "Tỷ lệ lấp đầy phòng trung bình theo ngày"}
                      </p>
                    </div>
                    <select className="bg-[var(--bg-subtle)] text-[var(--text-title)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-sm outline-none">
                      <option>30 Ngày qua</option>
                      <option>7 Ngày qua</option>
                    </select>
                  </div>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartSource}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#C6A96B" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#C6A96B" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.3} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={valFormatter} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-title)', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ color: 'var(--text-body)' }}
                          formatter={(v: any) => [hasAnalytics ? `${Number(v).toLocaleString('vi-VN')} đ` : `${v}%`, hasAnalytics ? "Doanh thu" : "Tỷ lệ"]}
                        />
                        <Area type="monotone" dataKey="value" stroke="#C6A96B" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </>
              );
            })()}
          </Card>
        )}

        {/* WIDGET CẤP 2: BÊN PHẢI (COL-SPAN-1 PIE CHART) */}
        {roleName === 'Housekeeping' ? (
          /* Housekeeping Pie Chart: Room Cleaning Breakdown */
          <Card className="p-6 flex flex-col justify-between min-h-[380px]">
            {(() => {
              const countClean = rooms.filter(r => r.cleaningStatus === 'Clean').length;
              const countDirty = rooms.filter(r => r.cleaningStatus === 'Dirty').length;
              const countCleaning = rooms.filter(r => r.cleaningStatus === 'Cleaning').length;
              const totalRooms = rooms.length;
              
              const pieData = [
                { name: 'Đã sạch', value: countClean, color: '#10B981' },
                { name: 'Chưa dọn', value: countDirty, color: '#EF4444' },
                { name: 'Đang dọn', value: countCleaning, color: '#3B82F6' }
              ].filter(x => x.value > 0);

              return (
                <>
                  <h3 className="font-bold text-lg text-title mb-6">Trạng thái dọn phòng</h3>
                  <div className="h-[200px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold text-title">{totalRooms}</span>
                      <span className="text-xs text-muted">Tổng số phòng</span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {pieData.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="text-xs text-muted">{item.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-title">{item.value} phòng ({totalRooms > 0 ? ((item.value/totalRooms)*100).toFixed(0) : 0}%)</span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </Card>
        ) : roleName === 'Receptionist' ? (
          /* Receptionist Pie Chart: Room occupancy/availability breakdown */
          <Card className="p-6 flex flex-col justify-between min-h-[380px]">
            {(() => {
              const countAvailable = rooms.filter(r => r.status === 'Available').length;
              const countOccupied = rooms.filter(r => r.status === 'Occupied').length;
              const countMaintenance = rooms.filter(r => r.status === 'Maintenance').length;
              const totalRooms = rooms.length;
              
              const pieData = [
                { name: 'Trống sẵn sàng', value: countAvailable, color: '#10B981' },
                { name: 'Đang có khách', value: countOccupied, color: '#F59E0B' },
                { name: 'Đang bảo trì', value: countMaintenance, color: '#EF4444' }
              ].filter(x => x.value > 0);

              return (
                <>
                  <h3 className="font-bold text-lg text-title mb-6">Trạng thái phòng thực tế</h3>
                  <div className="h-[200px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold text-title">{totalRooms}</span>
                      <span className="text-xs text-muted">Tổng số phòng</span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {pieData.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="text-xs text-muted">{item.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-title">{item.value} phòng ({totalRooms > 0 ? ((item.value/totalRooms)*100).toFixed(0) : 0}%)</span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </Card>
        ) : (
          /* Admin / Accountant / Manager / WarehouseStaff Pie Chart: Category or Stock Breakdown */
          <Card className="p-6 flex flex-col justify-between min-h-[380px]">
            {(() => {
              const hasRoomTypeRev = roleName !== 'WarehouseStaff' && analyticsData?.revenueByRoomType && analyticsData.revenueByRoomType.length > 0;
              const pieData = hasRoomTypeRev
                ? analyticsData!.revenueByRoomType.map(item => ({
                    name: item.name,
                    value: item.value
                  }))
                : inventoryUsage;
              const pieTitle = hasRoomTypeRev ? "Doanh thu theo hạng phòng" : "Cơ cấu tồn kho";
              const pieTotalLabel = hasRoomTypeRev ? "Tổng doanh thu" : "Tổng vật phẩm";
              const pieTotalValue = hasRoomTypeRev 
                ? `${(analyticsData!.totalRevenue/1000000).toFixed(1)}M đ`
                : totalInventoryItems.toLocaleString('vi-VN');

              return (
                <>
                  <h3 className="font-bold text-lg text-title mb-6">{pieTitle}</h3>
                  <div className="h-[200px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                      <span className="text-lg font-bold text-title truncate max-w-full">{pieTotalValue}</span>
                      <span className="text-[10px] text-muted">{pieTotalLabel}</span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 max-h-[100px] overflow-y-auto pr-1">
                    {pieData.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                          <span className="text-xs text-muted truncate max-w-[120px]">{item.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-title">
                          {hasRoomTypeRev ? `${(item.value/1000000).toFixed(1)}M đ` : Number(item.value).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </Card>
        )}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4">Thao tác nhanh</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {quickActions.map((action, idx) => (
              <button 
                key={idx} 
                onClick={() => navigate(action.link)}
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
              >
                <div className={cn('p-3 rounded-lg mb-2 group-hover:scale-110 transition-transform', action.color)}>
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-title">{action.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Hoạt động gần đây</h3>
            <button className="text-primary text-sm font-medium hover:underline">Xem tất cả</button>
          </div>
          <div className="space-y-4">
            {recentAudits.length === 0 ? (
              <p className="text-sm text-muted">Không có hoạt động nào gần đây.</p>
            ) : (
              recentAudits.slice(0, 5).map((audit, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {(audit.userName || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-title">{audit.message || `${audit.action} ${audit.entityType || ''}`}</p>
                      <p className="text-xs text-muted">Bởi: {audit.userName || 'Hệ thống'} - {new Date(audit.timestamp).toLocaleString('vi-VN')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={audit.action?.includes('CREATE') ? 'success' : audit.action?.includes('DELETE') ? 'error' : 'info'}>
                      {audit.action}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

