import api from './axiosInstance';

export interface RoleResponseDto {
  id: number;
  name: string;
  description: string | null;
  permissions: string[];
}

export interface PermissionResponseDto {
  id: number;
  name: string;
}

export const roleApi = {
  getAll: async (): Promise<RoleResponseDto[]> => {
    const res = await api.get('/Roles');
    return res.data;
  },

  getById: async (id: number): Promise<RoleResponseDto> => {
    const res = await api.get(`/Roles/${id}`);
    return res.data;
  },

  create: async (dto: { name: string; description?: string }): Promise<RoleResponseDto> => {
    const res = await api.post('/Roles', dto);
    return res.data;
  },

  update: async (id: number, dto: { name: string; description?: string }): Promise<RoleResponseDto> => {
    const res = await api.put(`/Roles/${id}`, dto);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/Roles/${id}`);
  },

  getAllPermissions: async (): Promise<PermissionResponseDto[]> => {
    const res = await api.get('/Roles/permissions');
    return res.data;
  },

  assignPermission: async (dto: { roleId: number; permissionId: number }): Promise<void> => {
    await api.post('/Roles/assign-permission', dto);
  },

  removePermission: async (dto: { roleId: number; permissionId: number }): Promise<void> => {
    await api.delete('/Roles/remove-permission', { data: dto });
  },

  getMyPermissions: async () => {
    const res = await api.get('/Roles/my-permissions');
    return res.data as { userId: number; role: string; permissions: string[] };
  },
};
