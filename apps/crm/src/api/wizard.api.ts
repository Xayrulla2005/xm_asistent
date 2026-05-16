import api from './axios';

export interface WizardConfig {
  id: string;
  tenantId: string;
  industry: string;
  modules: string[];
  roles: string[];
  theme: { primaryColor?: string; logo?: string };
  status: string;
}

export const getWizardConfig = (tenantId: string) =>
  api.get<WizardConfig>(`/wizard/${tenantId}`).then((r) => r.data);
