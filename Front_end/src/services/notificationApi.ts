import axiosClient from '../api/axiosClient';

export interface NotificationDto {
  id: number;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationApi = {
  getMine: async (): Promise<NotificationDto[]> =>
    (await axiosClient.get('/api/Notifications')) as NotificationDto[],

  markAsRead: async (id: string | number) =>
    axiosClient.put(`/api/Notifications/${id}/read`, {}),

  markAllAsRead: async () =>
    axiosClient.put('/api/Notifications/read-all', {}),
};

