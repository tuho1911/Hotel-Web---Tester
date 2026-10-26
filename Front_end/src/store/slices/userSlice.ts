import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { userApi, UserResponseDto, FilterParams, FilterResponse } from '../../services/userApi';

interface UserState {
  list: UserResponseDto[];
  filtered: UserResponseDto[];
  total: number;
  currentPage: number;
  pageSize: number;
  selectedUser: UserResponseDto | null;
  loading: boolean;
  filterLoading: boolean;
  error: string | null;
  filterParams: FilterParams;
}

const initialState: UserState = {
  list: [],
  filtered: [],
  total: 0,
  currentPage: 1,
  pageSize: 10,
  selectedUser: null,
  loading: false,
  filterLoading: false,
  error: null,
  filterParams: {},
};

// ── Async Thunks ──────────────────────────────────────────────────────────────

export const fetchAllUsers = createAsyncThunk('users/fetchAll', async (_, { rejectWithValue }) => {
  try {
    return await userApi.getAll();
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Lỗi tải danh sách người dùng');
  }
});

export const fetchFilteredUsers = createAsyncThunk(
  'users/filter',
  async (params: FilterParams & { page?: number; pageSize?: number }, { rejectWithValue }) => {
    try {
      return await userApi.filter(params);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Lỗi lọc người dùng');
    }
  }
);

export const fetchUserById = createAsyncThunk(
  'users/fetchById',
  async (id: number, { rejectWithValue }) => {
    try {
      return await userApi.getById(id);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Không tìm thấy người dùng');
    }
  }
);

export const createUser = createAsyncThunk(
  'users/create',
  async (dto: any, { rejectWithValue }) => {
    try {
      return await userApi.create(dto);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Lỗi tạo người dùng');
    }
  }
);

export const updateUser = createAsyncThunk(
  'users/update',
  async ({ id, dto }: { id: number; dto: any }, { rejectWithValue }) => {
    try {
      return await userApi.update(id, dto);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Lỗi cập nhật người dùng');
    }
  }
);

export const deleteUser = createAsyncThunk(
  'users/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await userApi.delete(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Lỗi xóa người dùng');
    }
  }
);

export const changeUserRole = createAsyncThunk(
  'users/changeRole',
  async ({ userId, roleId }: { userId: number; roleId: number }, { rejectWithValue }) => {
    try {
      await userApi.changeRole(userId, roleId);
      return { userId, roleId };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Lỗi thay đổi quyền');
    }
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setFilterParams(state, action: PayloadAction<FilterParams>) {
      state.filterParams = action.payload;
      state.currentPage = 1;
    },
    setPage(state, action: PayloadAction<number>) {
      state.currentPage = action.payload;
    },
    clearSelectedUser(state) {
      state.selectedUser = null;
    },
    clearError(state) {
      state.error = null;
    },
    // Cập nhật realtime khi nhận SignalR
    updateUserFromSignalR(state, action: PayloadAction<UserResponseDto>) {
      const idx = state.list.findIndex((u) => u.id === action.payload.id);
      if (idx !== -1) state.list[idx] = action.payload;
      const fidx = state.filtered.findIndex((u) => u.id === action.payload.id);
      if (fidx !== -1) state.filtered[fidx] = action.payload;
    },
  },
  extraReducers: (builder) => {
    // FETCH ALL
    builder
      .addCase(fetchAllUsers.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAllUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchAllUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // FILTER
    builder
      .addCase(fetchFilteredUsers.pending, (state) => { state.filterLoading = true; })
      .addCase(fetchFilteredUsers.fulfilled, (state, action) => {
        state.filterLoading = false;
        state.filtered = action.payload.data;
        state.total = action.payload.total;
        state.currentPage = action.payload.page;
        state.pageSize = action.payload.pageSize;
      })
      .addCase(fetchFilteredUsers.rejected, (state, action) => {
        state.filterLoading = false;
        state.error = action.payload as string;
      });

    // FETCH BY ID
    builder.addCase(fetchUserById.fulfilled, (state, action) => {
      state.selectedUser = action.payload;
    });

    // CREATE
    builder.addCase(createUser.fulfilled, (state, action) => {
      state.list.unshift(action.payload);
      state.filtered.unshift(action.payload);
      state.total += 1;
    });

    // UPDATE
    builder.addCase(updateUser.fulfilled, (state, action) => {
      const idx = state.list.findIndex((u) => u.id === action.payload.id);
      if (idx !== -1) state.list[idx] = action.payload;
      const fidx = state.filtered.findIndex((u) => u.id === action.payload.id);
      if (fidx !== -1) state.filtered[fidx] = action.payload;
    });

    // DELETE
    builder.addCase(deleteUser.fulfilled, (state, action) => {
      state.list = state.list.filter((u) => u.id !== action.payload);
      state.filtered = state.filtered.filter((u) => u.id !== action.payload);
      state.total -= 1;
    });
  },
});

export const { setFilterParams, setPage, clearSelectedUser, clearError, updateUserFromSignalR } =
  userSlice.actions;
export default userSlice.reducer;

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectAllUsers = (state: { users: UserState }) => state.users.list;
export const selectFilteredUsers = (state: { users: UserState }) => state.users.filtered;
export const selectUsersTotal = (state: { users: UserState }) => state.users.total;
export const selectUsersLoading = (state: { users: UserState }) => state.users.loading;
export const selectFilterLoading = (state: { users: UserState }) => state.users.filterLoading;
export const selectCurrentPage = (state: { users: UserState }) => state.users.currentPage;
export const selectPageSize = (state: { users: UserState }) => state.users.pageSize;
export const selectSelectedUser = (state: { users: UserState }) => state.users.selectedUser;
