import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useAppStore';
import {
  selectNotifications,
  selectUnreadCount,
  selectSignalRConnected,
  markAsRead,
  markAllAsRead,
} from '../store/slices/notificationSlice';
import { setNotifications } from '../store/slices/notificationSlice';
import api from '../services/axiosInstance';
import { useThemeStore } from '../store/themeStore';

const NotificationBellImproved: React.FC = () => {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectNotifications);
  const unreadCount = useAppSelector(selectUnreadCount);
  const connected = useAppSelector(selectSignalRConnected);
  const { isDarkMode } = useThemeStore();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 52, right: 24 });

  useEffect(() => {
    api.get('/Notifications')
      .then((res) => dispatch(setNotifications(res.data)))
      .catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      const clickedOutsideButton = buttonRef.current && !buttonRef.current.contains(target);

      if (clickedOutsideDropdown && clickedOutsideButton) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;

    const updatePosition = () => {
      const rect = buttonRef.current!.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 12,
        right: Math.max(window.innerWidth - rect.right, 16),
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  const handleMarkRead = (id: string | number) => {
    dispatch(markAsRead(id));
    api.put(`/Notifications/${id}/read`).catch(() => {});
  };

  const handleMarkAllRead = () => {
    dispatch(markAllAsRead());
    api.put('/Notifications/read-all').catch(() => {});
  };

  const typeColors: Record<string, string> = {
    Security: '#ef4444',
    Account: '#22c55e',
    PermissionUpdate: '#f59e0b',
    General: '#3b82f6',
  };



  const styles: Record<string, React.CSSProperties> = {
    wrapper: { position: 'relative' },
    bell: {
      position: 'relative',
      width: 44,
      height: 44,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(166,137,75,0.1)',
      color: isDarkMode ? '#f8fafc' : '#A6894B',
      border: isDarkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(166,137,75,0.25)',
      cursor: 'pointer',
      padding: 0,
      borderRadius: 14,
      boxShadow: isDarkMode ? '0 10px 30px rgba(15, 23, 42, 0.18)' : '0 4px 12px rgba(166, 137, 75, 0.12)',
      transition: 'all 0.3s ease',
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      background: '#ef4444',
      color: '#fff',
      fontSize: 10,
      fontWeight: 700,
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 4px',
      lineHeight: 1,
    },
    connDot: {
      position: 'absolute',
      bottom: 6,
      right: 6,
      width: 9,
      height: 9,
      borderRadius: '50%',
      border: isDarkMode ? '2px solid #0f172a' : '2px solid #fff',
    },
    dropdown: {
      position: 'fixed',
      width: 340,
      background: isDarkMode ? '#1F2937' : '#fff',
      borderRadius: 12,
      boxShadow: isDarkMode ? '0 8px 30px rgba(0,0,0,0.4)' : '0 8px 30px rgba(0,0,0,0.12)',
      border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
      zIndex: 9999,
      overflow: 'hidden',
    },
    dropHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 16px',
      borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f1f5f9',
    },
    dropTitle: { fontSize: 15, fontWeight: 700, color: isDarkMode ? '#f8fafc' : '#0f172a' },
    readAllBtn: {
      background: 'none',
      border: 'none',
      color: '#2563eb',
      fontSize: 12,
      cursor: 'pointer',
      fontWeight: 600,
    },
    list: { maxHeight: 360, overflowY: 'auto' },
    empty: { padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 14 },
    item: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      padding: '12px 16px',
      borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f1f5f9',
      cursor: 'pointer',
      transition: 'background 0.15s',
    },
    typeDot: { width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0 },
    itemBody: { flex: 1, minWidth: 0 },
    itemMsg: { margin: '0 0 4px', fontSize: 13, color: isDarkMode ? '#e2e8f0' : '#374151', lineHeight: 1.4 },
    itemTime: { fontSize: 11, color: '#94a3b8' },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: '#2563eb',
      flexShrink: 0,
      marginTop: 5,
    },
  };

  return (
    <div style={styles.wrapper} ref={dropdownRef}>
      <button
        type="button"
        ref={buttonRef}
        style={styles.bell}
        onClick={() => setOpen((v) => !v)}
        title="Thông báo"
        aria-label="Mở thông báo"
      >
        <Bell size={20} strokeWidth={2.2} />
        {unreadCount > 0 && (
          <span style={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
        <span
          style={{
            ...styles.connDot,
            background: connected ? '#22c55e' : '#ef4444',
          }}
          title={connected ? 'Realtime: Đã kết nối' : 'Realtime: Mất kết nối'}
        />
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{
            ...styles.dropdown,
            top: dropdownPosition.top,
            right: dropdownPosition.right,
          }}
        >
          <div style={styles.dropHeader}>
            <span style={styles.dropTitle}>Thông báo</span>
            {unreadCount > 0 && (
              <button type="button" style={styles.readAllBtn} onClick={handleMarkAllRead}>
                Đọc tất cả
              </button>
            )}
          </div>

          <div style={styles.list}>
            {notifications.length === 0 ? (
              <div style={styles.empty}>Không có thông báo</div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                  style={{
                    ...styles.item,
                    background: n.isRead ? 'transparent' : (isDarkMode ? 'rgba(59,130,246,0.08)' : '#eff6ff'),
                  }}
                  onClick={() => !n.isRead && handleMarkRead(n.id)}
                >
                  <span
                    style={{
                      ...styles.typeDot,
                      background: typeColors[n.type] ?? '#94a3b8',
                    }}
                  />
                    <div style={styles.itemBody}>
                      <p style={styles.itemMsg}>{n.message}</p>
                      <time style={styles.itemTime}>{n.time}</time>
                    </div>
                  {!n.isRead && <span style={styles.unreadDot} />}
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default NotificationBellImproved;
