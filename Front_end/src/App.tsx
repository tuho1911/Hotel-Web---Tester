/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { store } from './store';
import AppRoutes from './routes';
import { ConfigProvider, App as AntdApp, theme } from 'antd';
import { useScrollToTop } from './hooks/useScrollToTop';
import { useThemeStore } from './store/themeStore';
import { addNotification } from './store/slices/notificationSlice';
import { fetchSystemSettings } from './store/slices/systemSettingsSlice';
import { silentRefreshAuthThunk } from './store/slices/authSlice';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const GlobalLoading = () => {
  return null;
};

const AppContent = () => {
  useScrollToTop();
  const { isDarkMode, hydrated } = useThemeStore();
  const dispatch = useDispatch();

  useEffect(() => {
    // @ts-ignore
    dispatch(fetchSystemSettings());
    // Refresh auth data on page load to ensure latest permissions and role
    // @ts-ignore
    dispatch(silentRefreshAuthThunk());
  }, [dispatch]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [hydrated, isDarkMode]);

  if (!hydrated) {
    return null;
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#C6A96B',
          colorLink: '#C6A96B',
          colorLinkHover: '#A6894B',
          colorLinkActive: '#A6894B',
          colorInfo: '#C6A96B',
          colorSuccess: '#10B981',
          colorWarning: '#F59E0B',
          colorError: '#EF4444',
          borderRadius: 16,
          colorBgContainer: isDarkMode ? '#111827' : '#FFFFFF',
          colorBgElevated: isDarkMode ? '#1F2937' : '#FFFFFF',
          colorBgLayout: isDarkMode ? '#0B0F19' : '#FDFCFB',
          colorText: isDarkMode ? '#F8FAFC' : '#0F172A',
          colorTextSecondary: isDarkMode ? '#94A3B8' : '#334155',
          colorBorder: isDarkMode ? '#1E2937' : '#E2E8F0',
          fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
        },
        components: {
          Button: {
            borderRadius: 12,
            controlHeight: 44,
            fontWeight: 600,
          },
          Input: {
            borderRadius: 12,
            controlHeight: 44,
          },
          Select: {
            borderRadius: 12,
            controlHeight: 44,
          },
          Card: {
            borderRadius: 20,
          },
          Table: {
            borderRadius: 16,
          }
        }
      }}
    >
      <AntdApp>
        <GlobalLoading />
        <AppRoutes />
      </AntdApp>
    </ConfigProvider>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </Provider>
  );
}


