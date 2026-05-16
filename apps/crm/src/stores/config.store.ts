import { create } from 'zustand';
import api from '../api/axios';
import { CrmConfig, getCrmConfig, generateCrmConfig } from '../api/crm-engine.api';
import { useTenantStore } from './tenant.store';

const STORAGE_KEY = 'crm_wizardConfig';

interface ConfigState {
  config: CrmConfig | null;
  loading: boolean;
  fetchConfig: (tenantId: string) => Promise<void>;
  clearConfig: () => void;
  hasModule: (key: string) => boolean;
}

const stored = (() => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as CrmConfig | null;
    // Eski WizardConfig formatini (navigation maydonsiz) rad etamiz
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

async function fetchOrGenerate(tenantId: string): Promise<CrmConfig> {
  try {
    return await getCrmConfig(tenantId);
  } catch {
    // 404 yoki boshqa xato → avtomatik generatsiya qilamiz
    return await generateCrmConfig(tenantId);
  }
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: stored,
  loading: false,

  fetchConfig: async (tenantId: string) => {
    const FALLBACK = 'd1cb106a-881b-43a5-a98e-3bebb3bfd0fa';
    const id = tenantId || FALLBACK;
    set({ loading: true });

    // 1-urinish: berilgan tenantId bilan
    try {
      const config = await fetchOrGenerate(id);
      applyTenant(id, config);
      set({ config, loading: false });
      return;
    } catch {
      // bu tenant uchun wizard config ham yo'q, keyingisini sinab ko'ramiz
    }

    // 2-urinish: /api/tenants dan boshqa tenantlarni sinab ko'rish
    try {
      const tenants = await api.get<{ id: string }[]>('/tenants').then((r) => r.data);

      for (const tenant of tenants) {
        if (tenant.id === id) continue;
        try {
          const config = await fetchOrGenerate(tenant.id);
          applyTenant(tenant.id, config);
          set({ config, loading: false });
          return;
        } catch {
          // keyingi tenant
        }
      }
    } catch {
      // /api/tenants xatosi
    }

    localStorage.removeItem(STORAGE_KEY);
    set({ config: null, loading: false });
  },

  clearConfig: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ config: null });
  },

  hasModule: (key: string) => {
    const { config } = get();
    if (!config || config.modules.length === 0) return true;
    return config.modules.includes(key);
  },
}));
