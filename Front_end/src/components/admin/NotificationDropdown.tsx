import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Trash2, Bed, Package, AlertTriangle, Info } from 'lucide-react';
import { useNotificationStore, Notification } from '../../store/notificationStore';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../utils/cn';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotificationStore();

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'room': return <Bed size={16} className="text-blue-500" />;
      case 'inventory': return <Package size={16} className="text-amber-500" />;
      case 'damage': return <AlertTriangle size={16} className="text-red-500" />;
      default: return <Info size={16} className="text-primary" />;
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
            className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-dark-navy border border-slate-100 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-title">Notifications</h3>
                <p className="text-[10px] text-muted uppercase tracking-widest mt-0.5">
                  You have {unreadCount} unread messages
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={markAllAsRead}
                  className="p-2 text-slate-400 hover:text-primary transition-colors"
                  title="Mark all as read"
                >
                  <Check size={16} />
                </button>
                <button 
                  onClick={clearNotifications}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  title="Clear all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {notifications.length > 0 ? (
                <div className="divide-y divide-slate-50 dark:divide-white/5">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id}
                      onClick={() => markAsRead(notification.id)}
                      className={cn(
                        "p-4 flex items-start space-x-4 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/5",
                        !notification.isRead && "bg-primary/5 dark:bg-primary/10"
                      )}
                    >
                      <div className="mt-1">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-title truncate">{notification.title}</span>
                          <span className="text-[10px] text-muted whitespace-nowrap ml-2">
                            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs text-muted leading-relaxed line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="mt-2 w-2 h-2 bg-primary rounded-full" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center">
                  <Bell size={40} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                  <p className="text-sm text-muted">No new notifications</p>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-white/5 text-center">
              <button className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">
                View All Notifications
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationDropdown;
