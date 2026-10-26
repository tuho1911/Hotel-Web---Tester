import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { bookingApi } from '../../services/bookingApi';

interface SystemSetting {
  key: string;
  value: string;
}

interface SystemSettingsState {
  settings: SystemSetting[];
  loading: boolean;
}

const initialState: SystemSettingsState = {
  settings: [],
  loading: false,
};

export const fetchSystemSettings = createAsyncThunk(
  'systemSettings/fetch',
  async () => {
    const data = await bookingApi.getSystemSettings();
    return data;
  }
);

const systemSettingsSlice = createSlice({
  name: 'systemSettings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSystemSettings.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSystemSettings.fulfilled, (state, action: PayloadAction<SystemSetting[]>) => {
        state.settings = action.payload;
        state.loading = false;
      })
      .addCase(fetchSystemSettings.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const selectSystemSettings = (state: { systemSettings: SystemSettingsState }) => state.systemSettings.settings;
export const selectHotelName = (state: { systemSettings: SystemSettingsState }) => 
  state.systemSettings.settings.find(s => s.key === 'HotelName')?.value || 'KANT';

export default systemSettingsSlice.reducer;
