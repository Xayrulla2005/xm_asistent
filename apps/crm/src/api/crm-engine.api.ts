import api from './axios';

export interface NavItem {
  key: string;
  label: string;
  path: string;
}

export interface CrmConfig {
  tenantId: string;
  slug: string;
  industry: string;
  modules: string[];
  roles: string[];
  theme: {
    primaryColor: string;
    logo: string;
    bgType: string;
    darkMode: boolean;
  };
  navigation: NavItem[];
  permissions: Record<string, string[]>;
  generatedAt: string;
}

export const getCrmConfig = (tenantId: string) =>
  api.get<CrmConfig>(`/crm-engine/${tenantId}`).then((r) => r.data);

export const generateCrmConfig = (tenantId: string) =>
  api.post<CrmConfig>('/crm-engine/generate', { tenantId }).then((r) => r.data);
