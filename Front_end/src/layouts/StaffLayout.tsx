import React, { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  CreditCard,
  DoorClosed,
  House,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ShoppingCart,
  Sun,
  Tv,
  UserCircle,
  Users,
  BadgePercent,
  ShieldCheck,
  TrendingUp,
  History,
  X,
  Grid,
  ShoppingBag,
  MessageSquare,
  Mail,
  FileText,
  MapPin,
  Package,
  TriangleAlert,
  Bed,
  LayoutGrid,
  Sparkles,
  CalendarClock,
  Settings,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { logout } from '../store/slices/authSlice';
import { useThemeStore } from '../store/themeStore';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import { useTranslation } from 'react-i18next';
import NotificationBell from '../components/notification/NotificationBell';
import { canAccessPath } from '../utils/authNavigation';

const StaffLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { isDarkMode, toggleTheme } = useThemeStore();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
  };

  const menuConfig = React.useMemo(() => [
    {
      key: 'dashboard',
      icon: LayoutDashboard,
      label: t('nav.dashboard'),
      path: '/staff',
      permissions: ['VIEW_DASHBOARD']
    },
    {
      key: 'analytics',
      icon: TrendingUp,
      label: t('nav.analytics'),
      path: '/admin/analytics',
      permissions: ['VIEW_REPORTS']
    },
    {
      key: 'bookings',
      icon: CalendarClock,
      label: t('nav.bookings'),
      children: [
        { icon: CalendarClock, label: t('nav.all_bookings'), path: '/staff/bookings/manage', permissions: ['MANAGE_BOOKINGS'] },
        { icon: LayoutGrid, label: 'Sơ đồ phòng', path: '/staff/bookings/room-map', permissions: ['MANAGE_BOOKINGS'] },
        { icon: CalendarDays, label: t('nav.arrivals'), path: '/staff/bookings/arrivals', permissions: ['MANAGE_BOOKINGS'] },
        { icon: House, label: t('nav.in_house'), path: '/staff/bookings/in-house', permissions: ['MANAGE_BOOKINGS'] },
        { icon: DoorClosed, label: t('nav.check_out'), path: '/staff/bookings/check-out', permissions: ['MANAGE_BOOKINGS'] },
        { icon: CreditCard, label: t('nav.invoices'), path: '/staff/invoices', permissions: ['MANAGE_INVOICES'] },
      ]
    },
    {
      key: 'room_ops',
      icon: Bed,
      label: t('nav.room_ops'), // Vận hành & Phòng
      children: [
        { icon: ClipboardList, label: t('nav.cleaning'), path: '/staff/cleaning', permissions: ['MANAGE_ROOMS'] },
        { icon: Bed, label: t('nav.room_mgmt'), path: '/admin/rooms', permissions: ['MANAGE_ROOMS'] },
        { icon: LayoutGrid, label: t('nav.room_types'), path: '/admin/room-types', permissions: ['MANAGE_ROOMS'] },
        { icon: Sparkles, label: t('nav.amenities'), path: '/admin/amenities', permissions: ['MANAGE_ROOMS'] },
      ]
    },
    {
      key: 'service_mgmt',
      icon: ShoppingBag,
      label: t('nav.service_mgmt'), // Dịch vụ & Đơn hàng
      children: [
        { icon: ShoppingBag, label: 'Dịch vụ & Mặt hàng', path: '/admin/services', permissions: ['MANAGE_SERVICES'] },
        { icon: ShoppingCart, label: t('nav.orders'), path: '/staff/orders', permissions: ['MANAGE_SERVICES', 'MANAGE_ROOMS'] },
      ]
    },
    {
      key: 'inventory_assets',
      icon: Package,
      label: t('nav.inventory_assets'), // Kho & Tài sản
      children: [
        { icon: Package, label: t('nav.inventory'), path: '/admin/inventory', permissions: ['MANAGE_INVENTORY'] },
        { icon: TriangleAlert, label: t('nav.damages'), path: '/admin/inventory/damages', permissions: ['MANAGE_INVENTORY'] },
      ]
    },
    {
      key: 'customers_loyalty',
      icon: Users,
      label: t('nav.customers_loyalty'), // Khách hàng & Ưu đãi
      children: [
        { icon: Users, label: t('nav.accounts'), path: '/admin/users', permissions: ['MANAGE_USERS'] },
        { icon: BadgePercent, label: t('nav.vouchers'), path: '/staff/vouchers', permissions: ['MANAGE_BOOKINGS'] },
        { icon: Users, label: t('nav.memberships'), path: '/staff/memberships', permissions: ['MANAGE_BOOKINGS'] },
      ]
    },
    {
      key: 'content_cms',
      icon: FileText,
      label: t('nav.content_cms'), // Nội dung & Tương tác
      children: [
        { icon: MapPin, label: t('nav.attractions'), path: '/admin/attractions', permissions: ['MANAGE_CONTENT'] },
        { icon: FileText, label: t('nav.cms'), path: '/admin/cms', permissions: ['MANAGE_CONTENT'] },
        { icon: MessageSquare, label: t('nav.reviews'), path: '/admin/reviews', permissions: ['MANAGE_CONTENT'] },
        { icon: Mail, label: t('nav.contact'), path: '/admin/contact', permissions: ['MANAGE_CONTENT'] },
      ]
    },
    {
      key: 'system_security',
      icon: Settings,
      label: t('nav.system_security'), // Hệ thống & Bảo mật
      children: [
        { icon: ShieldCheck, label: t('nav.roles'), path: '/admin/roles', permissions: ['MANAGE_ROLES'] },
        { icon: History, label: t('nav.audit_logs'), path: '/admin/audit-logs', permissions: ['MANAGE_ROLES'] },
      ]
    }
  ], [t]);

  const filteredMenu = React.useMemo(() => {
    return menuConfig
      .map((group) => {
        if (group.children) {
          const allowedChildren = group.children.filter((child) =>
            canAccessPath(user, child.path)
          );
          return { ...group, children: allowedChildren };
        }
        return group;
      })
      .filter((group) => {
        if (group.path) {
          return canAccessPath(user, group.path);
        }
        return group.children && group.children.length > 0;
      });
  }, [menuConfig, user]);

  const isGroupActive = React.useCallback((group: any) => {
    if (group.path) {
      return location.pathname === group.path || (group.path !== '/staff' && location.pathname.startsWith(`${group.path}/`));
    }
    if (group.children) {
      return group.children.some((child: any) =>
        location.pathname === child.path || (child.path !== '/staff' && location.pathname.startsWith(`${child.path}/`))
      );
    }
    return false;
  }, [location.pathname]);

  // Auto-expand active group on load/route change
  useEffect(() => {
    const updatedOpenGroups = { ...openGroups };
    let hasChanges = false;
    filteredMenu.forEach((group) => {
      if (group.children && isGroupActive(group)) {
        if (!openGroups[group.key]) {
          updatedOpenGroups[group.key] = true;
          hasChanges = true;
        }
      }
    });
    if (hasChanges) {
      setOpenGroups(updatedOpenGroups);
    }
  }, [location.pathname, filteredMenu, isGroupActive]);

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const currentTitle = React.useMemo(() => {
    for (const group of filteredMenu) {
      if (group.path && (location.pathname === group.path || (group.path !== '/staff' && location.pathname.startsWith(`${group.path}/`)))) {
        return group.label;
      }
      if (group.children) {
        const activeChild = group.children.find((child: any) =>
          location.pathname === child.path || (child.path !== '/staff' && location.pathname.startsWith(`${child.path}/`))
        );
        if (activeChild) {
          return activeChild.label;
        }
      }
    }
    return 'Staff Portal';
  }, [filteredMenu, location.pathname]);

  const renderNav = () => (
    <>
      <nav className="flex-grow py-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        {filteredMenu.map((group) => {
          const Icon = group.icon;

          if (!group.children) {
            const isActive = location.pathname === group.path || (group.path !== '/staff' && location.pathname.startsWith(`${group.path}/`));
            return (
              <Link
                key={group.path}
                to={group.path}
                className={cn(
                  'flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 group',
                  isActive ? 'bg-primary/10 text-primary font-bold' : 'text-[var(--text-muted)] hover:bg-primary/5 hover:text-primary'
                )}
              >
                <Icon size={20} className={cn(isActive ? 'text-primary' : 'group-hover:text-primary')} />
                {!isCollapsed && <span className="font-semibold tracking-wide">{group.label}</span>}
              </Link>
            );
          }

          const isOpen = openGroups[group.key];
          const isSectionActive = isGroupActive(group);

          return (
            <div key={group.key} className="space-y-1">
              <button
                onClick={() => toggleGroup(group.key)}
                className={cn(
                  'flex w-full items-center justify-between px-4 py-3 rounded-xl transition-all duration-300',
                  isSectionActive ? 'bg-primary/5 text-primary font-bold' : 'text-[var(--text-muted)] hover:bg-primary/5 hover:text-primary'
                )}
              >
                <span className="flex items-center space-x-3">
                  <Icon size={20} className={cn(isSectionActive ? 'text-primary' : 'text-[var(--text-muted)]')} />
                  {!isCollapsed && <span className="font-semibold tracking-wide">{group.label}</span>}
                </span>
                {!isCollapsed && (isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />)}
              </button>

              {!isCollapsed && isOpen && (
                <div className="ml-5 border-l border-[var(--nav-border)] pl-4 space-y-1">
                  {group.children.map((child) => {
                    const isChildActive = location.pathname === child.path || (child.path !== '/staff' && location.pathname.startsWith(`${child.path}/`));
                    const ChildIcon = child.icon;
                    return (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={cn(
                          'flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all duration-300 group relative',
                          isChildActive ? 'text-primary font-bold bg-primary/5' : 'text-[var(--text-muted)] hover:text-primary'
                        )}
                      >
                        {isChildActive && (
                          <motion.div
                            layoutId="activeNav"
                            className="absolute left-[-17px] w-1 h-6 bg-primary rounded-r-full"
                          />
                        )}
                        <ChildIcon size={18} className={cn(isChildActive ? 'text-primary' : 'group-hover:text-primary')} />
                        <span className="text-sm font-medium">{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Info + Logout */}
      <div className="border-t border-[var(--nav-border)] p-4">
        {!isCollapsed && (
          <div className="mb-3 rounded-xl border border-[var(--nav-border)] bg-[var(--bg-subtle)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--text-title)] truncate">
              {user?.fullName || user?.name || 'Nhân viên'}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-primary">
              {user?.role || 'Staff'}
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-rose-500 hover:bg-rose-500/10 transition-all group"
          title={isCollapsed ? 'Đăng xuất' : undefined}
        >
          <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
          {!isCollapsed && <span className="font-bold tracking-wide">Đăng xuất</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-[var(--bg-main)] overflow-hidden">
      {/* ── Desktop Sidebar ── */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 80 : 280 }}
        className="relative hidden lg:flex shrink-0 bg-[var(--nav-bg)] border-r border-[var(--nav-border)] flex-col z-30 shadow-2xl shadow-black/5"
      >
        {/* Brand Header */}
        <div className="h-20 flex items-center justify-between px-5 border-b border-[var(--nav-border)]">
          {!isCollapsed && (
            <div>
              <Link
                to="/"
                className="text-xl font-display font-bold tracking-widest bg-gradient-to-r from-primary to-primary-dark bg-clip-text !text-transparent"
              >
                KANT
              </Link>
              <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-[var(--text-muted)]">
                {user?.role === 'Housekeeping' ? 'Housekeeping Portal' : 'Staff Portal'}
              </p>
            </div>
          )}
          {isCollapsed && (
            <Link to="/" className="mx-auto text-xl font-display font-bold tracking-widest !text-primary">
              K
            </Link>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              'rounded-lg p-2 text-primary transition-colors hover:bg-primary/5',
              isCollapsed && 'mx-auto'
            )}
            aria-label={isCollapsed ? 'Mở menu' : 'Thu gọn menu'}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {renderNav()}
      </motion.aside>

      {/* ── Mobile Overlay ── */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile Sidebar ── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[280px] bg-[var(--nav-bg)] border-r border-[var(--nav-border)] flex flex-col transition-transform duration-300 lg:hidden shadow-2xl',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-20 flex items-center justify-between px-5 border-b border-[var(--nav-border)]">
          <Link to="/" className="text-xl font-display font-bold tracking-widest !text-primary">
            KANT
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-primary/5 text-primary transition-colors"
            aria-label="Đóng menu"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
        {renderNav()}
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-grow flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="min-h-20 bg-[var(--nav-bg)]/80 backdrop-blur-xl border-b border-[var(--nav-border)] flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8 z-20">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-[var(--nav-border)] text-primary hover:bg-primary/5 transition-colors"
              aria-label="Mở menu điều hướng"
            >
              <Menu size={18} />
            </button>
            <h1 className="text-lg sm:text-xl font-display font-semibold text-[var(--text-title)] truncate">
              {currentTitle}
            </h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-[var(--nav-border)] text-[var(--text-muted)] hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm"
              title={isDarkMode ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            >
              {isDarkMode
                ? <Sun size={18} className="text-yellow-500" />
                : <Moon size={18} className="text-indigo-500" />
              }
            </button>

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="p-2.5 rounded-xl border border-[var(--nav-border)] text-primary font-bold hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm min-w-[45px]"
              title={i18n.language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
            >
              {i18n.language === 'vi' ? 'VI' : 'EN'}
            </button>

            <NotificationBell />

            {/* User Info */}
            <div className="flex items-center gap-3 pl-3 sm:pl-4 border-l border-[var(--nav-border)]">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-[var(--text-title)]">
                  {user?.fullName || user?.name}
                </p>
                <p className="text-[10px] text-primary font-bold uppercase tracking-wider">
                  {user?.role === 'Receptionist' ? 'RECEPTIONIST' : user?.role?.toUpperCase()}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-lg shadow-primary/10">
                <UserCircle size={24} />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-grow overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StaffLayout;
