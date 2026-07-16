import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const stored = (localStorage.getItem('crm_theme') as Theme) ?? 'dark';

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: stored,
  toggle: () => {
    const next: Theme = get().theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('crm_theme', next);
    set({ theme: next });
  },
  setTheme: (t: Theme) => {
    localStorage.setItem('crm_theme', t);
    set({ theme: t });
  },
}));
