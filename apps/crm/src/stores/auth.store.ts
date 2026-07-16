import { create } from 'zustand';
import api from '../api/axios';

interface User { id: string; email: string; role: string; tenantId: string | null }

interface AuthState {
  user: User | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
  isAdmin: () => boolean;
  isManager: () => boolean;
  isCashier: () => boolean;
  isWarehouse: () => boolean;
  setDirectAuth: (accessToken: string) => void;
}

function parseJwt(token: string): User | null {
  try {
    const p = JSON.parse(atob(token.split('.')[1]));
    if (p.exp && p.exp * 1000 < Date.now()) return null;
    return { id: p.sub, email: p.email, role: p.role, tenantId: p.tenantId ?? null };
  } catch { return null; }
}

function getValidStored(): string | null {
  const token = localStorage.getItem('crm_accessToken');
  if (!token) return null;
  if (!parseJwt(token)) {
    localStorage.removeItem('crm_accessToken');
    localStorage.removeItem('crm_refreshToken');
    localStorage.removeItem('crm_sessionToken');
    return null;
  }
  return token;
}

const stored = getValidStored();

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
    const user = parseJwt(data.accessToken);
    set({ accessToken: data.accessToken, user });
    return user?.tenantId ?? null;
  },

  logout: () => {
    // Fire-and-forget server logout — invalidates refreshToken in DB
    const token = localStorage.getItem('crm_accessToken');
    if (token) {
      api.post('/auth/logout').catch(() => undefined);
    }
    localStorage.removeItem('crm_accessToken');
    localStorage.removeItem('crm_refreshToken');
    localStorage.removeItem('crm_sessionToken');
    set({ accessToken: null, user: null });
  },

  setDirectAuth: (accessToken: string) => {
    set({ accessToken, user: parseJwt(accessToken) });
  },
}));
