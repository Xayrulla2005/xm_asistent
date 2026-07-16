import { create } from 'zustand';

interface TenantState {
  tenantId: string;
  setTenantId: (id: string) => void;
}

const STORAGE_KEY = 'crm_tenantId';

export const useTenantStore = create<TenantState>((set) => ({
  tenantId: localStorage.getItem(STORAGE_KEY) ?? '',
  setTenantId: (id) => {
    localStorage.setItem(STORAGE_KEY, id);
    set({ tenantId: id });
  },
}));
