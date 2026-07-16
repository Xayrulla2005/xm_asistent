import { create } from 'zustand';
import { FeatureFlags, getFeatureFlags } from '../api/billing.api';

interface FeaturesState {
  flags:        FeatureFlags | null;
  loading:      boolean;
  fetchFlags:   (tenantId: string) => Promise<void>;
  hasFeature:   (key: keyof FeatureFlags) => boolean;
}

export const useFeaturesStore = create<FeaturesState>((set, get) => ({
  flags:   null,
  loading: false,

  fetchFlags: async (tenantId: string) => {
    if (!tenantId) return;
    set({ loading: true });
    try {
      const flags = await getFeatureFlags(tenantId);
      set({ flags });
    } catch {
      // Billing not set up yet — treat as FREE (all false)
      set({ flags: null });
    } finally {
      set({ loading: false });
    }
  },

  hasFeature: (key: keyof FeatureFlags): boolean => {
    const { flags } = get();
    if (!flags) return false;
    return flags[key];
  },
}));
