import { create } from 'zustand';

interface TenantState {
  tenantId: string;
  setTenantId: (id: string) => void;
}

const STORAGE_KEY = 'crm_tenantId';
const DEFAULT_TENANT = 'd1cb106a-881b-43a5-a98e-3bebb3bfd0fa';

export const useTenantStore = create<TenantState>((set) => ({
  tenantId: localStorage.getItem(STORAGE_KEY) ?? DEFAULT_TENANT,
  setTenantId: (id) => {
    localStorage.setItem(STORAGE_KEY, id);
    set({ tenantId: id });
  },
}));
