import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { roleApi, RoleResponseDto, PermissionResponseDto } from '../../services/roleApi';

interface RoleState {
  list: RoleResponseDto[];
  permissions: PermissionResponseDto[];
  loading: boolean;
  error: string | null;
}

const initialState: RoleState = {
  list: [],
  permissions: [],
  loading: false,
  error: null,
};

// ── Async Thunks ──────────────────────────────────────────────────────────────

export const fetchRoles = createAsyncThunk('roles/fetchAll', async (_, { rejectWithValue }) => {
  try {
    return await roleApi.getAll();
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Lỗi tải danh sách role');
  }
});

export const fetchPermissions = createAsyncThunk(
  'roles/fetchPermissions',
  async (_, { rejectWithValue }) => {
    try {
      return await roleApi.getAllPermissions();
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Lỗi tải danh sách quyền');
    }
  }
);

export const createRole = createAsyncThunk(
  'roles/create',
  async (dto: { name: string; description?: string }, { rejectWithValue }) => {
    try {
      return await roleApi.create(dto);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Lỗi tạo role');
    }
  }
);

export const updateRole = createAsyncThunk(
  'roles/update',
  async ({ id, dto }: { id: number; dto: { name: string; description?: string } }, { rejectWithValue }) => {
    try {
      return await roleApi.update(id, dto);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Lỗi cập nhật role');
    }
  }
);

export const deleteRole = createAsyncThunk(
  'roles/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await roleApi.delete(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Lỗi xóa role');
    }
  }
);

export const assignPermission = createAsyncThunk(
  'roles/assignPermission',
  async ({ roleId, permissionId }: { roleId: number; permissionId: number }, { rejectWithValue }) => {
    try {
      await roleApi.assignPermission({ roleId, permissionId });
      return { roleId, permissionId };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Lỗi gán quyền');
    }
  }
);

export const removePermission = createAsyncThunk(
  'roles/removePermission',
  async ({ roleId, permissionId }: { roleId: number; permissionId: number }, { rejectWithValue }) => {
    try {
      await roleApi.removePermission({ roleId, permissionId });
      return { roleId, permissionId };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Lỗi gỡ quyền');
    }
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const roleSlice = createSlice({
  name: 'roles',
  initialState,
  reducers: {
    // Cập nhật realtime khi SignalR gửi PermissionUpdate
    refreshRolePermissionsFromSignalR(state, action: { payload: { roleId: number; permissionName: string; action: 'add' | 'remove' } }) {
      const role = state.list.find((r) => r.id === action.payload.roleId);
      if (!role) return;
      if (action.payload.action === 'add') {
        if (!role.permissions.includes(action.payload.permissionName)) {
          role.permissions.push(action.payload.permissionName);
        }
      } else {
        role.permissions = role.permissions.filter((p) => p !== action.payload.permissionName);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoles.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchRoles.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchRoles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder.addCase(fetchPermissions.fulfilled, (state, action) => {
      state.permissions = action.payload;
    });

    builder.addCase(createRole.fulfilled, (state, action) => {
      state.list.push(action.payload);
    });

    builder.addCase(updateRole.fulfilled, (state, action) => {
      const idx = state.list.findIndex((r) => r.id === action.payload.id);
      if (idx !== -1) state.list[idx] = action.payload;
    });

    builder.addCase(deleteRole.fulfilled, (state, action) => {
      state.list = state.list.filter((r) => r.id !== action.payload);
    });
  },
});

export const { refreshRolePermissionsFromSignalR } = roleSlice.actions;
export default roleSlice.reducer;

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectAllRoles = (state: { roles: RoleState }) => state.roles.list;
export const selectAllPermissions = (state: { roles: RoleState }) => state.roles.permissions;
export const selectRolesLoading = (state: { roles: RoleState }) => state.roles.loading;
