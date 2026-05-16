import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
}

const stored = (localStorage.getItem('crm_theme') as Theme) ?? 'light';

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: stored,
  toggle: () => {
    const next: Theme = get().theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('crm_theme', next);
    set({ theme: next });
  },
}));
