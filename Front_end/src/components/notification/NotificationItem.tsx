import React from 'react';
import { useDispatch } from 'react-redux';
import { markAsRead } from '../../store/slices/notificationSlice';
import { AlertCircle, CheckCircle2, Clock3, CreditCard, Info, MessageSquare, ShoppingBag, CalendarClock } from 'lucide-react';
import { notificationApi } from '../../services/notificationApi';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const icons = {
  booking: <CalendarClock className="text-sky-600" size={18} />,
  reminder: <Clock3 size={18} className="text-violet-500" />,
  update: <Info className="text-amber-500" size={18} />,
  message: <MessageSquare className="text-primary" size={18} />,
  payment: <CreditCard className="text-emerald-600" size={18} />,
  service: <ShoppingBag className="text-rose-500" size={18} />,
  warning: <AlertCircle size={18} className="text-red-500" />,
  success: <CheckCircle2 className="text-green-500" size={18} />,
};

const NotificationItem: React.FC<{ notification: any }> = ({ notification }) => {
  const dispatch = useDispatch();

  const handleRead = async () => {
    dispatch(markAsRead(notification.id));
    try {
      await notificationApi.markAsRead(notification.id);
    } catch {
      // Ignore network failure and keep local state responsive.
    }
  };

  return (
    <div 
      onClick={handleRead}
      className={`p-4 border-b border-gray-50 cursor-pointer transition-colors hover:bg-gray-50 ${!notification.isRead ? 'bg-primary/5' : ''}`}
    >
      <div className="flex space-x-3">
        <div className="mt-1">
          {icons[notification.type as keyof typeof icons] || <AlertCircle size={18} />}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h4 className={`text-sm font-semibold ${!notification.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
              {notification.title}
            </h4>
            <span className="text-[10px] text-gray-400 min-w-[70px] text-right">
              {dayjs(notification.createdAt).fromNow()}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {notification.description}
          </p>
          {!notification.isRead ? <span className="mt-2 inline-flex h-2 w-2 rounded-full bg-primary" /> : null}
        </div>
      </div>
    </div>
  );
};

export default React.memo(NotificationItem);
