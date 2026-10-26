import axios from 'axios';
import axiosClient from '../api/axiosClient';

export const BASE_URL = 'http://localhost:5206/api';

// Dùng axios thuần (không qua interceptor) để tránh vòng lặp refresh
const plainAxios = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

export const authApi = {
  login: async (dto: { email: string; password: string }) => {
    const res = await plainAxios.post('/Auth/login', dto);
    return res.data as {
      userId: number;
      accessToken: string;
      fullName: string;
      email: string;
      role: string;
      permissions: string[];
    };
  },

  register: async (dto: any) => {
    const res = await plainAxios.post('/Auth/register', dto);
    return res.data;
  },

  logout: async () => {
    const token = localStorage.getItem('token');
    await plainAxios.post(
      '/Auth/logout',
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
  },

  refreshToken: async (accessToken: string) => {
    const res = await plainAxios.post('/Auth/refresh-token', { accessToken });
    return res.data as {
      userId: number;
      accessToken: string;
      fullName: string;
      email: string;
      role: string;
      permissions: string[];
    };
  },

  refreshSession: async () => {
    const res = await axiosClient.get('/api/Auth/refresh-session');
    return res as any as {
      userId: number;
      accessToken: string;
      fullName: string;
      email: string;
      role: string;
      permissions: string[];
    };
  },
};
