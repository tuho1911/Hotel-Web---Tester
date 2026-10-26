import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import roomReducer from './slices/roomSlice';
import bookingReducer from './slices/bookingSlice';
import staffReducer from './slices/staffSlice';
import notificationReducer from './slices/notificationSlice';
import userReducer from './slices/userSlice';
import roleReducer from './slices/roleSlice';
import systemSettingsReducer from './slices/systemSettingsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    room: roomReducer,
    booking: bookingReducer,
    staff: staffReducer,
    notifications: notificationReducer,
    users: userReducer,
    roles: roleReducer,
    systemSettings: systemSettingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

import { injectStore } from '../services/axiosInstance';
injectStore(store);
