import api from './axiosInstance';

export interface MembershipDto {
  id: number;
  tierName: string;
  minPoints?: number | null;
  discountPercent?: number | null;
  createdAt?: string | null;
  userCount: number;
}

export type UpsertMembershipDto = {
  tierName: string;
  minPoints?: number | null;
  discountPercent?: number | null;
};

export const membershipApi = {
  getAll: async (): Promise<MembershipDto[]> => {
    const response = await api.get('/Memberships');
    return response.data;
  },
  getById: async (id: number): Promise<MembershipDto> => {
    const response = await api.get(`/Memberships/${id}`);
    return response.data;
  },
  create: async (dto: UpsertMembershipDto): Promise<MembershipDto> => {
    const response = await api.post('/Memberships', dto);
    return response.data;
  },
  update: async (id: number, dto: UpsertMembershipDto): Promise<MembershipDto> => {
    const response = await api.put(`/Memberships/${id}`, dto);
    return response.data;
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/Memberships/${id}`);
  },
};
