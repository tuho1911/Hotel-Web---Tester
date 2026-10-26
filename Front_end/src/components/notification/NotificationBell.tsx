import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { Bell, BellRing } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import { setNotifications } from '../../store/slices/notificationSlice';
import { notificationApi } from '../../services/notificationApi';

const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const { unreadCount, connected } = useSelector((state: RootState) => state.notifications);

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadNotifications = async () => {
      try {
        const data = await notificationApi.getMine();
        dispatch(setNotifications(data));
      } catch {
        // Keep local notifications when API fetch fails.
      }
    };

    void loadNotifications();
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const intervalId = window.setInterval(async () => {
      try {
        const data = await notificationApi.getMine();
        dispatch(setNotifications(data));
      } catch {
        // Keep current state if polling fails.
      }
    }, 45000);

    return () => window.clearInterval(intervalId);
  }, [dispatch, isAuthenticated]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-luxury bg-subtle text-body shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
        aria-label="Open notifications"
      >
        {unreadCount > 0 ? <BellRing size={22} /> : <Bell size={22} />}
        
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 min-w-[20px] h-5 px-1 bg-primary text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[var(--bg-main)] shadow-lg shadow-primary/20">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationDropdown isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
};

export default React.memo(NotificationBell);
