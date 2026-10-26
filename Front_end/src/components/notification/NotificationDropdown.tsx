import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { markAllAsRead, clearAll, setNotifications } from '../../store/slices/notificationSlice';
import NotificationItem from './NotificationItem';
import { Trash2, CheckCheck, Radio } from 'lucide-react';
import { notificationApi } from '../../services/notificationApi';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose }) => {
  const { notifications, unreadCount, connected } = useSelector((state: RootState) => state.notifications);
  const dispatch = useDispatch();

  const handleMarkAllAsRead = async () => {
    dispatch(markAllAsRead());
    try {
      await notificationApi.markAllAsRead();
      const refreshed = await notificationApi.getMine();
      dispatch(setNotifications(refreshed));
    } catch {
      // Keep optimistic UI.
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="font-bold text-gray-800">Notifications</h3>
                <p className="text-xs text-gray-500 flex items-center gap-2">
                  <span>{unreadCount} unread messages</span>
                  <span className={`inline-flex items-center gap-1 ${connected ? 'text-emerald-600' : 'text-amber-500'}`}>
                    <Radio size={12} />
                    {connected ? 'Realtime on' : 'Polling fallback'}
                  </span>
                </p>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={handleMarkAllAsRead}
                  className="p-2 text-gray-400 hover:text-primary transition-colors" 
                  title="Mark all as read"
                >
                  <CheckCheck size={18} />
                </button>
                <button 
                  onClick={() => dispatch(clearAll())}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors" 
                  title="Clear all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <NotificationItem key={n.id} notification={n} />
                ))
              ) : (
                <div className="p-8 text-center">
                  <p className="text-gray-400 text-sm">No notifications yet</p>
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 text-center border-t border-gray-100">
                <button className="text-xs font-bold text-primary hover:underline">
                  VIEW ALL NOTIFICATIONS
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationDropdown;
