import axiosClient from '../api/axiosClient';

export interface AmenityDto {
  id: number;
  name: string;
  iconUrl?: string | null;
}

export const amenityApi = {
  getAll: async (): Promise<AmenityDto[]> =>
    (await axiosClient.get('/api/Amenities')) as AmenityDto[],

  create: async (dto: { name: string; iconUrl?: string }) =>
    axiosClient.post('/api/Amenities', dto),

  update: async (id: number, dto: { name: string; iconUrl?: string }) =>
    axiosClient.put(`/api/Amenities/${id}`, dto),

  delete: async (id: number) =>
    axiosClient.delete(`/api/Amenities/${id}`),

  linkToRoomType: async (roomTypeId: number, amenityId: number) =>
    axiosClient.post(`/api/Amenities/link/${roomTypeId}/${amenityId}`),

  unlinkFromRoomType: async (roomTypeId: number, amenityId: number) =>
    axiosClient.delete(`/api/Amenities/link/${roomTypeId}/${amenityId}`),

  uploadIcon: async (id: number, file: File): Promise<{ message: string; iconUrl: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.post(`/api/Amenities/${id}/icon`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }) as Promise<{ message: string; iconUrl: string }>;
  },
};

