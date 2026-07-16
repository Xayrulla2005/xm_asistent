import { create } from 'zustand';
import { CrmConfig, RolePermission, getCrmConfig, generateCrmConfig } from '../api/crm-engine.api';
import { useTenantStore } from './tenant.store';
import { useAuthStore } from './auth.store';

const STORAGE_KEY = 'crm_wizardConfig';

interface ConfigState {
  config: CrmConfig | null;
  loading: boolean;
  fetchConfig: (tenantId: string) => Promise<void>;
  clearConfig: () => void;
  hasModule: (key: string) => boolean;
  canAccess: (moduleKey: string) => boolean;
  getUserPerms: () => RolePermission | null;
}

const stored = (() => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as CrmConfig | null;
    if (parsed && !Array.isArray(parsed.navigation)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch { return null; }
})();

function applyTenant(tenantId: string, config: CrmConfig) {
  useTenantStore.getState().setTenantId(tenantId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

async function fetchOrGenerate(): Promise<CrmConfig> {
  try {
    return await getCrmConfig();
  } catch {
    return await generateCrmConfig();
  }
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: stored,
  loading: false,

  fetchConfig: async (tenantId: string) => {
    if (!tenantId) { set({ config: null, loading: false }); return; }
    set({ loading: true });
    try {
      const config = await fetchOrGenerate();
      applyTenant(tenantId, config);
      set({ config, loading: false });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      set({ config: null, loading: false });
    }
  },

  clearConfig: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ config: null });
  },

  hasModule: (key: string) => {
    const { config } = get();
    if (!config) return true;
    return config.modules.includes(key);
  },

  getUserPerms: (): RolePermission | null => {
    const { config } = get();
    if (!config) return null;
    const role = useAuthStore.getState().user?.role ?? '';
    return config.permissions?.[role] ?? null;
  },

  canAccess: (moduleKey: string): boolean => {
    const role = useAuthStore.getState().user?.role ?? '';
    if (role === 'admin' || role === 'ADMIN') return true;
    const perms = get().getUserPerms();
    if (!perms) return true;
    const modules = perms.modules ?? [];
    if (modules.includes('*')) return true;
    return modules.includes(moduleKey);
  },
}));
