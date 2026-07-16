import axios from 'axios';
import api from './axios';

const publicApi = axios.create({ baseURL: '/api' });

export interface WizardConfig {
  id:               string;
  tenantId:         string;
  industry:         string;
  modules:          string[];
  roles:            string[];
  theme:            { primaryColor?: string; logo?: string; shopName?: string; phone?: string; address?: string };
  status:           'draft' | 'active';
  wizardCompleted:  boolean;
  // Company info
  companyName:    string | null;
  companyPhone:   string | null;
  companyAddress: string | null;
  logoUrl:        string | null;
  // Receipt
  receiptSize:        string | null;
  receiptShowLogo:    boolean;
  receiptShowPhone:   boolean;
  receiptShowAddress: boolean;
  receiptShowQr:      boolean;
  receiptFooter:      string | null;
  discountMode:       string;
  // Customer levels
  customerLevels?: { name: string; minAmount: number; color: string }[] | null;
  // POS
  posCardStyle:          string | null;
  posShowCategories:     boolean;
  posBarcode:            boolean;
  posCustomer:           boolean;
  posDiscount:           boolean;
  posPaymentMethods:     string[] | null;
  posCurrencies:         string[] | null;
  posMarkupAllowed:      boolean;
  posCustomerRequired:   string;
}

export interface WizardEmployee {
  firstName: string;
  lastName:  string;
  email:     string;
  password:  string;
  role:      string;
}

export interface WizardSetupPayload {
  tenantId:          string;
  industry:          string;
  modules:           string[];
  roles:             string[];
  companyName:       string;
  companyPhone:      string;
  companyAddress:    string;
  logoUrl:           string;
  language:          string;
  currency:          string;
  workingHoursStart: string;
  workingHoursEnd:   string;
  workingDays:       string[];
  primaryColor:      string;
  themeStyle:        string;
  receiptSize?:      string;
  receiptShowLogo?:  boolean;
  receiptShowPhone?: boolean;
  receiptShowAddress?: boolean;
  receiptShowQr?:    boolean;
  receiptFooter:     string;
  discountMode?:     string;
  exportFormats?:    string[];
  subdomain?:        string;
  // POS config
  posCardStyle?:          string;
  posShowCategories?:     boolean;
  posBarcode?:            boolean;
  posCustomer?:           boolean;
  posDiscount?:           boolean;
  posPaymentMethods?:     string[];
  posCurrencies?:         string[];
  posMarkupAllowed?:      boolean;
  posCustomerRequired?:   string;
  employees:              WizardEmployee[];
}

export interface WizardSetupResult {
  success:      boolean;
  wizardConfig: string;
  employees:    string[];
}

export const getWizardConfig = (tenantId: string) =>
  api.get<WizardConfig>(`/wizard/${tenantId}`).then((r) => r.data);

export const updateWizardConfig = (tenantId: string, dto: Partial<WizardConfig>) =>
  api.patch<WizardConfig>(`/wizard/${tenantId}`, dto).then((r) => r.data);

export const getPublicWizardConfig = (tenantId: string) =>
  publicApi.get<WizardConfig>(`/wizard/public/${tenantId}`).then((r) => r.data);

export const getPublicDefaults = (industry: string) =>
  publicApi
    .get<{ modules: string[]; roles: string[] }>(`/wizard/defaults/${industry}`)
    .then((r) => r.data);

export const submitWizardSetup = (data: WizardSetupPayload) =>
  publicApi
    .post<WizardSetupResult>('/wizard/public-setup', data)
    .then((r) => r.data);

// publicSetup already marks wizard complete; this is a no-op kept for interface symmetry
export const completeWizard = (_tenantId: string): Promise<{ success: boolean }> =>
  Promise.resolve({ success: true });

// ── Public tenant registration ────────────────────────────────────────────────

export interface TenantRegisterPayload {
  email?:       string;
  phone?:       string;
  googleToken?: string;
  firstName?:   string;
  password?:    string;
}

export interface TenantRegisterResult {
  tenantId:       string;
  userId:         string;
  accessToken:    string;
  refreshToken:   string;
  isExistingUser?: boolean;
}

export const registerTenant = (data: TenantRegisterPayload) =>
  publicApi
    .post<TenantRegisterResult>('/tenants/register', data)
    .then((r) => r.data);

// ── Public tenant list (for login portal) ─────────────────────────────────────

export interface PublicTenant {
  id:           string;
  name:         string;
  slug:         string;
  industry:     string | null;
  logoUrl:      string | null;
  primaryColor: string | null;
  shopName:     string | null;
}

export const getPublicTenants = () =>
  publicApi.get<PublicTenant[]>('/tenants/public').then((r) => r.data);
