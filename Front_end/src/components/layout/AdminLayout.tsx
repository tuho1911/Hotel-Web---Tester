import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppStore';
import { logoutThunk } from '../../store/slices/authSlice';
import NotificationBell from '../NotificationBell';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { path: '/admin/users', label: 'Người dùng', icon: '👥', roles: ['Admin'] },
  { path: '/admin/staff', label: 'Nhân sự', icon: '🏨', roles: ['Admin', 'Manager'] },
  { path: '/admin/equipment', label: 'Quản lý vật tư',  icon: '🗂️', roles: ['Admin', 'Manager'] },
];

const AdminLayout: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    navigate('/login', { replace: true });
  };

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user?.role ?? '')
  );

  return (
    <div style={styles.shell}>
      {/* ── Sidebar ────────────────────────────────────────── */}
      <aside style={{ ...styles.sidebar, width: collapsed ? 64 : 230 }}>
        {/* Brand */}
        <div style={styles.brand}>
          <span style={styles.brandIcon}>⬡</span>
          {!collapsed && <span style={styles.brandName}>Kant ERP</span>}
        </div>

        {/* Toggle */}
        <button
          style={styles.toggleBtn}
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? 'Mở rộng' : 'Thu gọn'}
        >
          {collapsed ? '→' : '←'}
        </button>

        {/* Nav */}
        <nav style={styles.nav}>
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                ...styles.navLink,
                background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                fontWeight: isActive ? 700 : 400,
              })}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {!collapsed && <span style={styles.navLabel}>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User Info (bottom) */}
        <div style={styles.sidebarBottom}>
          {!collapsed && (
            <div style={styles.userInfo}>
              <div style={styles.userAvatar}>
                {user?.fullName?.charAt(0).toUpperCase() ?? 'U'}
              </div>
              <div style={styles.userMeta}>
                <div style={styles.userName}>{user?.fullName}</div>
                <div style={styles.userRole}>{user?.role}</div>
              </div>
            </div>
          )}
          <button style={styles.logoutBtn} onClick={handleLogout} title="Đăng xuất">
            🚪{!collapsed && ' Đăng xuất'}
          </button>
        </div>
      </aside>

      {/* ── Main Area ──────────────────────────────────────── */}
      <div style={styles.main}>
        {/* Topbar */}
        <header style={styles.topbar}>
          <div style={styles.topbarLeft}>
            <h2 style={styles.pageTitle}>Quản lý hệ thống</h2>
          </div>
          <div style={styles.topbarRight}>
            <NotificationBell />
            <div style={styles.topbarUser}>
              <div style={styles.topbarAvatar}>
                {user?.fullName?.charAt(0).toUpperCase() ?? 'U'}
              </div>
              <span style={styles.topbarName}>{user?.fullName}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const SIDEBAR_BG = '#0f172a';
const SIDEBAR_TEXT = 'rgba(255,255,255,0.85)';

const styles: Record<string, React.CSSProperties> = {
  shell: { display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Segoe UI', system-ui, sans-serif" },
  sidebar: {
    background: SIDEBAR_BG,
    color: SIDEBAR_TEXT,
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.25s ease',
    flexShrink: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '24px 16px 8px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  brandIcon: { fontSize: 26, color: '#C6A96B', flexShrink: 0 },
  brandName: { fontSize: 18, fontWeight: 800, whiteSpace: 'nowrap', letterSpacing: '-0.3px' },
  toggleBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: 'none',
    color: SIDEBAR_TEXT,
    cursor: 'pointer',
    fontSize: 14,
    padding: '6px',
    margin: '0 12px 8px',
    borderRadius: 6,
    textAlign: 'center',
  },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 8px' },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 8,
    color: SIDEBAR_TEXT,
    textDecoration: 'none',
    fontSize: 14,
    transition: 'background 0.15s',
    whiteSpace: 'nowrap',
  },
  navIcon: { fontSize: 18, flexShrink: 0, width: 24, textAlign: 'center' },
  navLabel: {},
  sidebarBottom: {
    padding: '12px 8px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  userInfo: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px 12px' },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    background: '#C6A96B',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 14,
    flexShrink: 0,
  },
  userMeta: { overflow: 'hidden' },
  userName: { fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  userRole: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  logoutBtn: {
    width: '100%',
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#f87171',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    cursor: 'pointer',
    textAlign: 'left',
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8fafc' },
  topbar: {
    height: 60,
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px',
    flexShrink: 0,
  },
  topbarLeft: {},
  pageTitle: { fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 },
  topbarRight: { display: 'flex', alignItems: 'center', gap: 16 },
  topbarUser: { display: 'flex', alignItems: 'center', gap: 8 },
  topbarAvatar: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    background: '#A6894B',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 14,
  },
  topbarName: { fontSize: 14, fontWeight: 600, color: '#374151' },
  content: { flex: 1, overflow: 'auto', padding: '28px' },
};

export default AdminLayout;
