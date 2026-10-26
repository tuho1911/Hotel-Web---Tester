import api from './axiosInstance';

export interface UserResponseDto {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  roleName: string | null;
  roleId: number | null;
  status: boolean;
  avatarUrl: string | null;
  createdAt: string | null;
}

export interface FilterParams {
  phone?: string;
  email?: string;
  status?: boolean;
  page?: number;
  pageSize?: number;
}

export interface FilterResponse {
  data: UserResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateUserDto {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  roleId?: number;
}

export interface UpdateUserDto {
  fullName: string;
  phone?: string;
  status: boolean;
}

export const userApi = {
  getAll: async (): Promise<UserResponseDto[]> => {
    const res = await api.get('/UserManagement');
    return res.data;
  },

  filter: async (params: FilterParams): Promise<FilterResponse> => {
    const res = await api.get('/UserManagement/filter', { params });
    return res.data;
  },

  getById: async (id: number): Promise<UserResponseDto> => {
    const res = await api.get(`/UserManagement/${id}`);
    return res.data;
  },

  create: async (dto: CreateUserDto): Promise<UserResponseDto> => {
    const res = await api.post('/UserManagement', dto);
    return res.data;
  },

  update: async (id: number, dto: UpdateUserDto): Promise<UserResponseDto> => {
    const res = await api.put(`/UserManagement/${id}`, dto);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/UserManagement/${id}`);
  },

  changeRole: async (userId: number, roleId: number): Promise<void> => {
    await api.put(`/UserManagement/${userId}/change-role`, { roleId });
  },
};
