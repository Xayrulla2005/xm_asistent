import { create } from 'zustand';

export type ToastType = 'error' | 'success' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: ToastItem[];
  toast: (message: string, type?: ToastType, duration?: number) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  toast: (message, type = 'error', duration = 3000) => {
    const id = Math.random().toString(36).slice(2, 9);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// Convenience shorthand used outside React components
export const toast = {
  error:   (msg: string, dur?: number) => useToastStore.getState().toast(msg, 'error',   dur),
  success: (msg: string, dur?: number) => useToastStore.getState().toast(msg, 'success', dur),
  info:    (msg: string, dur?: number) => useToastStore.getState().toast(msg, 'info',    dur),
  warning: (msg: string, dur?: number) => useToastStore.getState().toast(msg, 'warning', dur),
};
