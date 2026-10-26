import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { logout } from '../store/slices/authSlice';
import { useNotification } from '../hooks/useNotification';
import NotificationBell from '../components/notification/NotificationBell';
import {
  LayoutDashboard,
  Users,
  Bed,
  Package,
  ClipboardList,
  CalendarClock,
  CalendarDays,
  CreditCard,
  DoorClosed,
  House,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  UserCircle,
  FileText,
  Sparkles,
  MapPin,
  TriangleAlert,
  BadgePercent,
  LayoutGrid,
  MessageSquare,
  History,
  TrendingUp,
  Settings,
  Mail,
  ShoppingBag
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import { useTranslation } from 'react-i18next';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { canAccessPath } from '../utils/authNavigation';

const AdminLayout: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleTheme } = useThemeStore();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
  };

  const { requestPermission } = useNotification();

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const menuConfig = React.useMemo(() => [
    {
      key: 'dashboard',
      icon: LayoutDashboard,
      label: t('nav.dashboard'),
      path: '/admin',
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
        { icon: CalendarClock, label: t('nav.all_bookings'), path: '/admin/bookings/manage', permissions: ['MANAGE_BOOKINGS'] },
        { icon: CalendarDays, label: t('nav.arrivals'), path: '/admin/bookings/arrivals', permissions: ['MANAGE_BOOKINGS'] },
        { icon: House, label: t('nav.in_house'), path: '/admin/bookings/in-house', permissions: ['MANAGE_BOOKINGS'] },
        { icon: DoorClosed, label: t('nav.check_out'), path: '/admin/bookings/check-out', permissions: ['MANAGE_BOOKINGS'] },
        { icon: CreditCard, label: t('nav.invoices'), path: '/admin/invoices', permissions: ['MANAGE_INVOICES'] },
      ]
    },
    {
      key: 'room_ops',
      icon: Bed,
      label: t('nav.room_ops'), // Vận hành & Phòng
      children: [
        { icon: Bed, label: t('nav.room_mgmt'), path: '/admin/rooms', permissions: ['MANAGE_ROOMS'] },
        { icon: LayoutGrid, label: t('nav.room_types'), path: '/admin/room-types', permissions: ['MANAGE_ROOMS'] },
        { icon: Sparkles, label: t('nav.amenities'), path: '/admin/amenities', permissions: ['MANAGE_ROOMS'] },
        { icon: ClipboardList, label: t('nav.cleaning'), path: '/admin/cleaning', permissions: ['MANAGE_ROOMS'] },
      ]
    },
    {
      key: 'service_mgmt',
      icon: ShoppingBag,
      label: t('nav.service_mgmt'), // Dịch vụ & Đơn hàng
      children: [
        { icon: ShoppingBag, label: 'Dịch vụ & Mặt hàng', path: '/admin/services', permissions: ['MANAGE_SERVICES'] },
        { icon: Package, label: t('nav.orders'), path: '/admin/orders', permissions: ['MANAGE_SERVICES', 'MANAGE_ROOMS'] },
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
        { icon: Users, label: t('nav.users'), path: '/admin/users', permissions: ['MANAGE_USERS'] },
        { icon: BadgePercent, label: t('nav.vouchers'), path: '/admin/vouchers', permissions: ['MANAGE_BOOKINGS'] },
        { icon: Users, label: t('nav.memberships'), path: '/admin/memberships', permissions: ['MANAGE_BOOKINGS'] },
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
        { icon: Settings, label: t('nav.settings'), path: '/admin/settings', permissions: ['MANAGE_ROLES'] },
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
      return location.pathname === group.path || (group.path !== '/admin' && location.pathname.startsWith(`${group.path}/`));
    }
    if (group.children) {
      return group.children.some((child: any) =>
        location.pathname === child.path || (child.path !== '/admin' && location.pathname.startsWith(`${child.path}/`))
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
      if (group.path && (location.pathname === group.path || (group.path !== '/admin' && location.pathname.startsWith(`${group.path}/`)))) {
        return group.label;
      }
      if (group.children) {
        const activeChild = group.children.find((child: any) =>
          location.pathname === child.path || (child.path !== '/admin' && location.pathname.startsWith(`${child.path}/`))
        );
        if (activeChild) {
          return activeChild.label;
        }
      }
    }
    return 'Dashboard';
  }, [filteredMenu, location.pathname]);

  const renderNav = () => (
    <>
      <nav className="flex-grow py-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        {filteredMenu.map((group) => {
          const Icon = group.icon;

          if (!group.children) {
            const isActive = location.pathname === group.path || (group.path !== '/admin' && location.pathname.startsWith(`${group.path}/`));
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
                    const isChildActive = location.pathname === child.path || (child.path !== '/admin' && location.pathname.startsWith(`${child.path}/`));
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

      <div className="p-4 border-t border-[var(--nav-border)]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all group"
        >
          <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
          {!isCollapsed && <span className="font-bold tracking-wide">{t('nav.logout')}</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-[var(--bg-main)] overflow-hidden">
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 80 : 280 }}
        className="relative hidden lg:flex shrink-0 bg-[var(--nav-bg)] border-r border-[var(--nav-border)] flex-col z-30 shadow-2xl shadow-black/5"
      >
        <div className="h-20 flex items-center justify-between px-6 border-b border-[var(--nav-border)]">
          {!isCollapsed && (
            <Link to="/" className="text-2xl font-display font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text !text-transparent tracking-[0.2em]">KANT</Link>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-primary/5 text-primary transition-colors"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {renderNav()}
      </motion.aside>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[280px] bg-[var(--nav-bg)] border-r border-[var(--nav-border)] flex flex-col transition-transform duration-300 lg:hidden shadow-2xl',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-20 flex items-center justify-between px-6 border-b border-[var(--nav-border)]">
          <Link to="/" className="text-xl font-display font-bold !text-primary tracking-widest">KANT</Link>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-primary/5 text-primary transition-colors"
            aria-label="Close navigation"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
        {renderNav()}
      </aside>

      <div className="flex-grow flex flex-col overflow-hidden">
        <header className="min-h-20 bg-[var(--nav-bg)]/80 backdrop-blur-xl border-b border-[var(--nav-border)] flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-[var(--nav-border)] text-primary hover:bg-primary/5 transition-colors"
              aria-label="Open navigation"
            >
              <LayoutDashboard size={18} />
            </button>
            <h1 className="text-lg sm:text-xl font-display font-semibold text-[var(--text-title)] truncate">{currentTitle}</h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
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
            <div className="flex items-center gap-3 pl-3 sm:pl-6 border-l border-[var(--nav-border)]">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-title">{user?.name}</p>
                <p className="text-[10px] text-primary font-bold uppercase tracking-wider">{user?.role}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-lg shadow-primary/10">
                <UserCircle size={24} />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-grow overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
