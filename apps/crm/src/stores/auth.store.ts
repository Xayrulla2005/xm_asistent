import { create } from 'zustand';
import api from '../api/axios';

interface User { id: string; email: string; role: string }

interface AuthState {
  user: User | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: () => boolean;
  isManager: () => boolean;
  isCashier: () => boolean;
  isWarehouse: () => boolean;
}

function parseJwt(token: string): User | null {
  try {
    const p = JSON.parse(atob(token.split('.')[1]));
    return { id: p.sub, email: p.email, role: p.role };
  } catch { return null; }
}

const stored = localStorage.getItem('crm_accessToken');

export const useAuthStore = create<AuthState>((set, get) => ({
  user: stored ? parseJwt(stored) : null,
  accessToken: stored,

  isAdmin:     () => get().user?.role === 'admin',
  isManager:   () => get().user?.role === 'manager',
  isCashier:   () => get().user?.role === 'cashier',
  isWarehouse: () => get().user?.role === 'warehouse',

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('crm_accessToken', data.accessToken);
    localStorage.setItem('crm_refreshToken', data.refreshToken);
    if (data.sessionToken) localStorage.setItem('crm_sessionToken', data.sessionToken);
    set({ accessToken: data.accessToken, user: data.user });
  },

  logout: () => {
    localStorage.removeItem('crm_accessToken');
    localStorage.removeItem('crm_refreshToken');
    localStorage.removeItem('crm_sessionToken');
    set({ accessToken: null, user: null });
  },
}));
