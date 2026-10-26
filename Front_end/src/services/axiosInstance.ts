import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { setAccessToken, clearAuth, updateUser } from '../store/slices/authSlice';

export const BASE_URL = 'http://localhost:5206/api';

let store: any = null;
export const injectStore = (_store: any) => {
  store = _store;
};

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,                    // Gửi HttpOnly cookie (refreshToken) tự động
  headers: { 'Content-Type': 'application/json' },
});

// ── Request Interceptor: Đính kèm accessToken ──────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (store) {
    const token = store.getState().auth.accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Response Interceptor ────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });
  failedQueue = [];
};

/**
 * Redirect helper – dùng window.location để force full navigation,
 * tránh React Router không re-render khi state chưa clear.
 */
const redirectTo = (path: '/login' | '/401') => {
  // Chỉ redirect nếu chưa ở trang đó (tránh loop)
  if (!window.location.pathname.startsWith(path)) {
    window.location.href = path;
  }
};

api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // ── Case 403: Đã đăng nhập nhưng sai role/permission → /401 ────────────
    if (error.response?.status === 403) {
      redirectTo('/401');
      return Promise.reject(error);
    }

    // ── Case 401: Chưa đăng nhập / token hết hạn → thử refresh ─────────────
    if (error.response?.status === 401 && !originalRequest._retry) {

      // Nếu đang refresh → xếp hàng chờ
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers!.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      if (!store) {
        redirectTo('/login');
        return Promise.reject(error);
      }

      const currentToken = store.getState().auth.accessToken;

      try {
        // Gọi refresh token trực tiếp bằng plain axios để tránh circular dependency
        const refreshResponse = await axios.post(
          `${BASE_URL}/Auth/refresh-token`,
          { accessToken: currentToken || '' },
          { withCredentials: true }
        );
        const data = refreshResponse.data;
        const newToken = data.accessToken;

        store.dispatch(setAccessToken(newToken));
        store.dispatch(updateUser({ role: data.role, permissions: data.permissions }));
        processQueue(null, newToken);

        originalRequest.headers!.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);                // Retry request gốc

      } catch (refreshError) {
        processQueue(refreshError, null);

        // Refresh fail hoàn toàn → clear auth + về login
        store.dispatch(clearAuth());
        redirectTo('/login');

        return Promise.reject(refreshError);

      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;