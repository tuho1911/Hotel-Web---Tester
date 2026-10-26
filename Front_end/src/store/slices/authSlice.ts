import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { authApi } from '../../services/authApi';
import { userProfileApi } from '../../services/userProfileApi';

export type Role = 'ADMIN' | 'STAFF' | 'USER' | 'Admin' | 'Staff' | 'User' | string;

export interface User {
  id: string;
  fullName: string;
  name: string;
  email: string;
  role: Role;
  permissions: string[];
  avatar?: string;
  membershipId?: number | null;
  membershipName?: string | null;
  membershipDiscountPercent?: number | null;
  loyaltyPoints?: number | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const storedUser = JSON.parse(localStorage.getItem('user') || 'null') as User | null;
const storedToken = localStorage.getItem('token');

const persistAuth = (user: User | null, token: string | null) => {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }

  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
};

const initialState: AuthState = {
  user: storedUser,
  token: storedToken,
  accessToken: storedToken,
  isAuthenticated: !!storedToken,
  loading: false,
  error: null,
};

export const loginThunk = createAsyncThunk(
  'auth/loginThunk',
  async (
    dto: { email: string; password: string },
    { dispatch, rejectWithValue }
  ) => {
    dispatch(loginStart());

    try {
      const response = await authApi.login(dto);
      
      // Save the token IMMEDIATELY so that subsequent API calls (like getProfile)
      // will use this new token instead of failing with 401 and redirecting to login.
      dispatch(setAccessToken(response.accessToken));

      const profile = await userProfileApi.getProfile().catch(() => null);
      const user: User = {
        id: String(response.userId ?? 0),
        fullName: response.fullName,
        name: response.fullName,
        email: response.email,
        role: response.role,
        permissions: response.permissions ?? [],
        avatar: profile?.avatarUrl ?? undefined,
        membershipId: profile?.membershipId ?? null,
        membershipName: profile?.membershipName ?? null,
        membershipDiscountPercent: profile?.membershipDiscountPercent ?? null,
        loyaltyPoints: profile?.loyaltyPoints ?? 0,
      };

      dispatch(loginSuccess({ user, token: response.accessToken }));
      return { user, token: response.accessToken };
    } catch (err: any) {
      const message = err.response?.data?.message || 'Đăng nhập thất bại';
      dispatch(loginFailure(message));
      return rejectWithValue(message);
    }
  }
);

export const logoutThunk = createAsyncThunk('auth/logoutThunk', async (_, { dispatch }) => {
  try {
    await authApi.logout();
  } catch {
    // Clear client session even if server-side logout fails.
  } finally {
    dispatch(logout());
  }
});

export const silentRefreshAuthThunk = createAsyncThunk(
  'auth/silentRefreshAuthThunk',
  async (_, { dispatch, getState }) => {
    const state = getState() as any;
    const token = state.auth.accessToken;
    if (!token) return;

    try {
      // 1. Thử refresh thông qua session endpoint (gửi token hiện tại trong header)
      // Giúp đồng bộ tức thì vai trò & quyền hạn mới từ CSDL mà không phụ thuộc cookie Lax trên localhost
      const data = await authApi.refreshSession();
      
      const currentRole = state.auth.user?.role;
      const currentPermissions = JSON.stringify(state.auth.user?.permissions || []);
      const newPermissions = JSON.stringify(data.permissions || []);
      
      dispatch(setAccessToken(data.accessToken));
      dispatch(updateUser({ role: data.role, permissions: data.permissions }));

      if (currentRole && (currentRole !== data.role || currentPermissions !== newPermissions)) {
        window.location.reload();
      }
    } catch (sessionErr) {
      console.warn('Session refresh fallback to standard cookie refresh token...', sessionErr);
      try {
        // 2. Fallback sang refresh token cookie truyền thống
        const data = await authApi.refreshToken(token);
        
        const currentRole = state.auth.user?.role;
        const currentPermissions = JSON.stringify(state.auth.user?.permissions || []);
        const newPermissions = JSON.stringify(data.permissions || []);
        
        dispatch(setAccessToken(data.accessToken));
        dispatch(updateUser({ role: data.role, permissions: data.permissions }));

        if (currentRole && (currentRole !== data.role || currentPermissions !== newPermissions)) {
          window.location.reload();
        }
      } catch (err) {
        console.error('Silent refresh failed completely', err);
      }
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.accessToken = action.payload.token;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
      persistAuth(action.payload.user, action.payload.token);
    },
    loginFailure: (state, action: PayloadAction<string | undefined>) => {
      state.loading = false;
      state.error = action.payload ?? 'Đăng nhập thất bại';
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      persistAuth(null, null);
    },
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      persistAuth(null, null);
    },
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      state.accessToken = action.payload;
      state.isAuthenticated = true;
      persistAuth(state.user, action.payload);
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = {
          ...state.user,
          ...action.payload,
          fullName: action.payload.fullName ?? action.payload.name ?? state.user.fullName,
          name: action.payload.name ?? action.payload.fullName ?? state.user.name,
        };
        persistAuth(state.user, state.token);
      }
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  clearAuth,
  setAccessToken,
  updateUser,
} = authSlice.actions;

export default authSlice.reducer;
