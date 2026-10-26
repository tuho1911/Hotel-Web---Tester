import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'room' | 'inventory' | 'damage' | 'system';
  timestamp: string;
  isRead: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [
        {
          id: '1',
          title: 'Room Update',
          message: 'Room 302 has been cleaned and is ready for check-in.',
          type: 'room',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          isRead: false,
        },
        {
          id: '2',
          title: 'Inventory Alert',
          message: 'Mini-bar stock for Deluxe Rooms is running low.',
          type: 'inventory',
          timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          isRead: false,
        },
        {
          id: '3',
          title: 'Damage Report',
          message: 'New damage reported in Room 105: Broken lamp.',
          type: 'damage',
          timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
          isRead: true,
        },
      ],
      unreadCount: 2,
      addNotification: (notification) => set((state) => {
        const newNotification: Notification = {
          ...notification,
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toISOString(),
          isRead: false,
        };
        const updatedNotifications = [newNotification, ...state.notifications];
        return {
          notifications: updatedNotifications,
          unreadCount: updatedNotifications.filter(n => !n.isRead).length,
        };
      }),
      markAsRead: (id) => set((state) => {
        const updatedNotifications = state.notifications.map(n => 
          n.id === id ? { ...n, isRead: true } : n
        );
        return {
          notifications: updatedNotifications,
          unreadCount: updatedNotifications.filter(n => !n.isRead).length,
        };
      }),
      markAllAsRead: () => set((state) => {
        const updatedNotifications = state.notifications.map(n => ({ ...n, isRead: true }));
        return {
          notifications: updatedNotifications,
          unreadCount: 0,
        };
      }),
      clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
    }),
    {
      name: 'kant-notifications',
    }
  )
);
