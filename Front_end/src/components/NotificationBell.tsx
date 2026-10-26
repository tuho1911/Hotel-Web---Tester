import React, { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/useAppStore';
import {
  selectNotifications,
  selectUnreadCount,
  selectSignalRConnected,
  markAsRead,
  markAllAsRead,
} from '../store/slices/notificationSlice';
import api from '../services/axiosInstance';
import { setNotifications } from '../store/slices/notificationSlice';

const NotificationBell: React.FC = () => {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectNotifications);
  const unreadCount = useAppSelector(selectUnreadCount);
  const connected = useAppSelector(selectSignalRConnected);

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load lịch sử notification khi mount
  useEffect(() => {
    api.get('/Notifications')
      .then((res) => dispatch(setNotifications(res.data)))
      .catch(() => {/* ignore */});
  }, [dispatch]);

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = async (id: string | number) => {
    dispatch(markAsRead(id));
    api.put(`/Notifications/${id}/read`).catch(() => {});
  };

  const handleMarkAllRead = async () => {
    dispatch(markAllAsRead());
    api.put('/Notifications/read-all').catch(() => {});
  };

  const TYPE_COLORS: Record<string, string> = {
    Security: '#ef4444',
    Account: '#22c55e',
    PermissionUpdate: '#f59e0b',
    General: '#3b82f6',
  };

  return (
    <div style={styles.wrapper} ref={dropdownRef}>
      {/* Bell button */}
      <button style={styles.bell} onClick={() => setOpen((v) => !v)} title="Thông báo">
        🔔
        {unreadCount > 0 && (
          <span style={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
        {/* SignalR connection dot */}
        <span
          style={{
            ...styles.connDot,
            background: connected ? '#22c55e' : '#ef4444',
          }}
          title={connected ? 'Realtime: Đã kết nối' : 'Realtime: Mất kết nối'}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={styles.dropdown}>
          <div style={styles.dropHeader}>
            <span style={styles.dropTitle}>Thông báo</span>
            {unreadCount > 0 && (
              <button style={styles.readAllBtn} onClick={handleMarkAllRead}>
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
                    background: n.isRead ? 'transparent' : '#eff6ff',
                  }}
                  onClick={() => !n.isRead && handleMarkRead(n.id)}
                >
                  <span
                    style={{
                      ...styles.typeDot,
                      background: TYPE_COLORS[n.type] ?? '#94a3b8',
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
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: { position: 'relative' },
  bell: {
    position: 'relative',
    background: 'none',
    border: 'none',
    fontSize: 22,
    cursor: 'pointer',
    padding: '4px 6px',
    borderRadius: 8,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
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
    bottom: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: '50%',
    border: '1.5px solid #fff',
  },
  dropdown: {
    position: 'absolute',
    top: 44,
    right: 0,
    width: 340,
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
    border: '1px solid #e2e8f0',
    zIndex: 1000,
    overflow: 'hidden',
  },
  dropHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: '1px solid #f1f5f9',
  },
  dropTitle: { fontSize: 15, fontWeight: 700, color: '#0f172a' },
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
    borderBottom: '1px solid #f1f5f9',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  typeDot: { width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0 },
  itemBody: { flex: 1, minWidth: 0 },
  itemMsg: { margin: '0 0 4px', fontSize: 13, color: '#374151', lineHeight: 1.4 },
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

export default NotificationBell;
