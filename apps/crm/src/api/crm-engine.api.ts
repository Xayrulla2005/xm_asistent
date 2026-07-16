import api from './axios';

export interface NavItem {
  key: string;
  label: string;
  path: string;
}

export interface RolePermission {
  modules: string[];
  actions: string[];
  denied: string[];
  canAccessSettings: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  canDeleteData: boolean;
}

export interface CustomerLevel {
  name: string;
  minAmount: number;
  color: string;
}

export const DEFAULT_CUSTOMER_LEVELS: CustomerLevel[] = [
  { name: 'Oddiy',     minAmount: 0,         color: '#94a3b8' },
  { name: 'Silver',    minAmount: 500000,    color: '#64748b' },
  { name: 'Gold',      minAmount: 2000000,   color: '#f59e0b' },
  { name: 'Brilliant', minAmount: 10000000,  color: '#8b5cf6' },
];

export interface CrmConfig {
  tenantId: string;
  slug: string;
  industry: string;
  modules: string[];
  roles: string[];
  currency?: string;
  theme: {
    shopName?: string;
    address?: string;
    phone?: string;
    primaryColor: string;
    logo: string;
    bgType: string;
    style?: string;
    darkMode: boolean;
  };
  navigation: NavItem[];
  permissions: Record<string, RolePermission>;
  generatedAt: string;
  customerLevels?: CustomerLevel[] | null;
}

export const getCrmConfig = () =>
  api.get<CrmConfig>('/crm-engine/config').then((r) => r.data);

export const generateCrmConfig = () =>
  api.post<CrmConfig>('/crm-engine/generate').then((r) => r.data);
