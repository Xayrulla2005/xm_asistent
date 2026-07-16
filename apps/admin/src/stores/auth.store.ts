import { create } from 'zustand';
import api from '../api/axios';

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

function parseJwt(token: string): User | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

const storedToken = localStorage.getItem('accessToken');

export const useAuthStore = create<AuthState>((set) => ({
  user: storedToken ? parseJwt(storedToken) : null,
  accessToken: storedToken,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.user?.role !== 'superadmin') {
      throw new Error('Kirish faqat superadmin uchun ruxsat etilgan');
    }
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({ accessToken: data.accessToken, user: data.user });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ accessToken: null, user: null });
  },
}));
