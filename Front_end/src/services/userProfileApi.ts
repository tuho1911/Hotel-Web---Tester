import axiosClient from '../api/axiosClient';

export interface UserProfileDto {
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
  membershipId?: number | null;
  membershipName?: string | null;
  membershipDiscountPercent?: number | null;
  loyaltyPoints?: number | null;
}

export const userProfileApi = {
  getProfile: async () => (await axiosClient.get('/api/UserProfile')) as UserProfileDto,

  updateProfile: async (dto: { fullName: string; phone?: string }) =>
    axiosClient.put('/api/UserProfile', dto),

  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.post('/api/UserProfile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }) as Promise<{ message: string; url: string }>;
  },

  changePassword: async (dto: { oldPassword: string; newPassword: string }) =>
    axiosClient.post('/api/UserProfile/change-password', dto),
};
