import React, { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bed,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  DoorClosed,
  FileText,
  House,
  LayoutDashboard,
  Layers3,
  LogOut,
  MapPinned,
  Package,
  ShoppingCart,
  ShieldCheck,
  TriangleAlert,
  UserCircle,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import NotificationBell from '../components/NotificationBellImproved';
import { useAppDispatch, useAppSelector } from '../hooks/useAppStore';
import { useNotification } from '../hooks/useNotification';
import { logoutThunk } from '../store/slices/authSlice';
import { cn } from '../utils/cn';

interface MenuItem {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  path: string;
  permissions?: string[];
  activePaths?: string[];
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin', permissions: ['VIEW_DASHBOARD'] },
  { icon: UserCircle, label: 'Profile', path: '/admin/profile', activePaths: ['/admin/profile'] },
  { icon: Users, label: 'Người dùng', path: '/admin/users', permissions: ['MANAGE_USERS'] },
  {
    icon: Bed,
    label: 'Phòng',
    path: '/admin/rooms',
    permissions: ['MANAGE_ROOMS'],
    activePaths: ['/admin/rooms'],
  },
  {
    icon: Layers3,
    label: 'Hạng phòng',
    path: '/admin/room-types',
    permissions: ['MANAGE_ROOMS'],
    activePaths: ['/admin/room-types'],
  },
  {
    icon: ClipboardList,
    label: 'Dọn phòng',
    path: '/admin/cleaning',
    permissions: ['MANAGE_ROOMS'],
    activePaths: ['/admin/cleaning'],
  },
  {
    icon: MapPinned,
    label: 'Diem tham quan',
    path: '/admin/attractions',
    permissions: ['MANAGE_CONTENT'],
    activePaths: ['/admin/attractions'],
  },
  {
    icon: Package,
    label: 'Vật tư',
    path: '/admin/inventory',
    permissions: ['MANAGE_INVENTORY'],
    activePaths: ['/admin/inventory'],
  },
  {
    icon: TriangleAlert,
    label: 'Hỏng / mất',
    path: '/admin/inventory/damages',
    permissions: ['MANAGE_INVENTORY'],
    activePaths: ['/admin/inventory/damages'],
  },
  {
    icon: CalendarClock,
    label: 'Đặt phòng',
    path: '/admin/bookings',
    permissions: ['MANAGE_ROOMS'],
    activePaths: ['/admin/bookings'],
  },
  {
    icon: FileText,
    label: 'Hóa đơn',
    path: '/admin/invoices',
    permissions: ['MANAGE_ROOMS'],
    activePaths: ['/admin/invoices'],
  },
  {
    icon: ShoppingCart,
    label: 'Đặt dịch vụ',
    path: '/admin/orders',
    permissions: ['MANAGE_ROOMS'],
    activePaths: ['/admin/orders'],
  },
  { icon: ShieldCheck, label: 'Vai trò', path: '/admin/roles', permissions: ['MANAGE_ROLES'] },
];

const AdminShell: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { requestPermission } = useNotification();
  const { user } = useAppSelector((state) => state.auth);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(true);

  const bookingMenuItems: MenuItem[] = [
    {
      icon: CalendarClock,
      label: 'Tất cả booking',
      path: '/admin/bookings/manage',
      permissions: ['MANAGE_ROOMS'],
      activePaths: ['/admin/bookings', '/admin/bookings/manage'],
    },
    {
      icon: CalendarDays,
      label: 'Khách đến hôm nay',
      path: '/admin/bookings/arrivals',
      permissions: ['MANAGE_ROOMS'],
      activePaths: ['/admin/bookings/arrivals'],
    },
    {
      icon: House,
      label: 'Khách đang lưu trú',
      path: '/admin/bookings/in-house',
      permissions: ['MANAGE_ROOMS'],
      activePaths: ['/admin/bookings/in-house'],
    },
    {
      icon: DoorClosed,
      label: 'Thủ tục trả phòng',
      path: '/admin/bookings/check-out',
      permissions: ['MANAGE_ROOMS'],
      activePaths: ['/admin/bookings/check-out'],
    },
  ];

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  const filteredMenu = useMemo(
    () =>
      menuItems.filter((item) =>
        item.path !== '/admin/bookings' &&
        (item.permissions ? item.permissions.some((permission) => user?.permissions?.includes(permission)) : true)
      ),
    [user?.permissions]
  );

  const filteredBookingMenu = useMemo(
    () =>
      bookingMenuItems.filter((item) =>
        item.permissions ? item.permissions.some((permission) => user?.permissions?.includes(permission)) : true
      ),
    [user?.permissions]
  );

  const isBookingSectionActive = filteredBookingMenu.some((item) => {
    const activePaths = item.activePaths ?? [item.path];
    return activePaths.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));
  });

  useEffect(() => {
    if (isBookingSectionActive) {
      setIsBookingOpen(true);
    }
  }, [isBookingSectionActive]);

  const currentLabel =
    [...filteredMenu, ...filteredBookingMenu].find((item) => {
      const activePaths = item.activePaths ?? [item.path];
      return activePaths.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));
    })?.label ?? 'Dashboard';

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-beige-luxury dark:bg-dark-base transition-colors duration-300">
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 88 : 292 }}
        className="relative z-30 flex flex-col border-r border-gray-200 dark:border-white/5 bg-white dark:bg-dark-navy transition-colors duration-300"
      >
        <div className="flex h-20 items-center justify-between border-b border-gray-200 dark:border-white/5 px-5">
          {!isCollapsed ? (
            <div>
              <Link to="/admin" className="text-xl font-display font-bold tracking-widest text-primary-dark dark:text-primary">
                KANT
              </Link>
              <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-gray-500">Hotel Admin</p>
            </div>
          ) : (
            <Link to="/admin" className="text-xl font-display font-bold tracking-widest text-primary-dark dark:text-primary">
              K
            </Link>
          )}

          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="rounded-lg p-2 text-primary-dark dark:text-primary transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
            aria-label={isCollapsed ? 'Mở menu' : 'Thu gọn menu'}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
          {filteredBookingMenu.length > 0 ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setIsBookingOpen((prev) => !prev)}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-all duration-200',
                  isBookingSectionActive
                    ? 'bg-primary/10 text-primary-dark dark:text-primary'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-primary-dark dark:hover:text-primary'
                )}
              >
                <span className="flex items-center gap-3">
                  <CalendarClock size={20} />
                  {!isCollapsed ? <span className="font-medium">Quản lý Đặt phòng</span> : null}
                </span>
                {!isCollapsed ? (isBookingOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />) : null}
              </button>

              {!isCollapsed && isBookingOpen ? (
                <div className="ml-3 space-y-1 border-l border-gray-200 pl-3 dark:border-white/10">
                  {filteredBookingMenu.map((item) => {
                    const Icon = item.icon;
                    const activePaths = item.activePaths ?? [item.path];
                    const isActive = activePaths.some(
                      (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
                    );

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          'group flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200',
                          isActive
                            ? 'bg-primary text-white dark:text-dark-base shadow-lg shadow-primary/20'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-primary-dark dark:hover:text-primary'
                        )}
                      >
                        <Icon size={18} className={cn(isActive ? 'text-white dark:text-dark-base' : 'group-hover:text-primary-dark dark:group-hover:text-primary')} />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          {filteredMenu.map((item) => {
            const Icon = item.icon;
            const activePaths = item.activePaths ?? [item.path];
            const isActive = activePaths.some(
              (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
            );

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200',
                  isActive ? 'bg-primary text-white dark:text-dark-base shadow-lg shadow-primary/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-primary-dark dark:hover:text-primary'
                )}
              >
                <Icon size={20} className={cn(isActive ? 'text-white dark:text-dark-base' : 'group-hover:text-primary-dark dark:group-hover:text-primary')} />
                {!isCollapsed ? <span className="font-medium">{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 dark:border-white/5 p-4 transition-colors duration-300">
          {!isCollapsed ? (
            <div className="mb-3 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.fullName || user?.name || 'Tài khoản'}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-primary-dark dark:text-primary">{user?.role || 'Unknown'}</p>
            </div>
          ) : null}

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-red-400 transition-all hover:bg-red-400/10"
          >
            <LogOut size={20} />
            {!isCollapsed ? <span className="font-medium">Đăng xuất</span> : null}
          </button>
        </div>
      </motion.aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-20 items-center justify-between border-b border-gray-200 dark:border-white/5 bg-white/60 dark:bg-dark-navy/60 px-6 backdrop-blur-lg md:px-8 transition-colors duration-300">
          <div>
            <h1 className="text-xl font-display font-semibold text-gray-900 dark:text-white">{currentLabel}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Quản trị phòng, vật tư và vận hành khách sạn</p>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="flex items-center gap-3 border-l border-gray-200 dark:border-white/10 pl-4 transition-colors duration-300">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.fullName || user?.name}</p>
                <p className="text-xs font-medium text-primary-dark dark:text-primary">{user?.role}</p>
              </div>
              <Link
                to="/admin/profile"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-primary-dark dark:text-primary transition-colors hover:bg-primary/25"
              >
                <UserCircle size={24} />
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminShell;
