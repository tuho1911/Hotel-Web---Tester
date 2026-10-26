import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDarkMode: boolean;
  hydrated: boolean;
  toggleTheme: () => void;
  setHydrated: (value: boolean) => void;
}

const getPreferredTheme = () => {
  if (typeof window === 'undefined') return true;
  const stored = window.localStorage.getItem('theme-storage');
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as { state?: { isDarkMode?: boolean } };
      if (typeof parsed?.state?.isDarkMode === 'boolean') return parsed.state.isDarkMode;
    } catch {
      // ignore malformed storage
    }
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDarkMode: getPreferredTheme(),
      hydrated: false,
      toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      setHydrated: (value) => set({ hydrated: value }),
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
