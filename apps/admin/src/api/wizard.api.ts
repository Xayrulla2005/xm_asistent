import api from './axios';

export interface WizardCfgTheme {
  shopName?:     string;
  address?:      string;
  phone?:        string;
  primaryColor?: string;
  logo?:         string;
  style?:        string;
  darkMode?:     boolean;
}

export interface WizardCfg {
  id:                  string;
  tenantId:            string;
  industry:            string;
  modules:             string[];
  roles:               string[];
  theme:               WizardCfgTheme;
  status:              string;
  companyName:         string | null;
  companyPhone:        string | null;
  companyAddress:      string | null;
  logoUrl:             string | null;
  language:            string;
  currency:            string;
  workingHoursStart:   string | null;
  workingHoursEnd:     string | null;
  workingDays:         string[] | null;
  receiptSize:         string;
  receiptShowLogo:     boolean;
  receiptShowPhone:    boolean;
  receiptShowAddress:  boolean;
  receiptShowQr:       boolean;
  receiptFooter:       string | null;
  discountMode:        string;
  exportFormats:       string[] | null;
  posCardStyle:        string | null;
  posShowCategories:   boolean;
  posBarcode:          boolean;
  posCustomer:         boolean;
  posDiscount:         boolean;
  posPaymentMethods:   string[] | null;
  posCurrencies:       string[] | null;
  posMarkupAllowed:    boolean;
  posCustomerRequired: string;
}

export interface EmployeeRow {
  id:        string;
  firstName: string;
  lastName:  string;
  email:     string;
  role:      string;
  isActive:  boolean;
  createdAt: string;
}

export const getWizardConfig = (tenantId: string) =>
  api.get<WizardCfg>(`/wizard/${tenantId}`).then((r) => r.data);

export const updateWizardConfig = (tenantId: string, data: Partial<WizardCfg>) =>
  api.patch<WizardCfg>(`/wizard/${tenantId}`, data).then((r) => r.data);

export const generateCrm = (tenantId: string) =>
  api.post<{ success: boolean }>('/crm-engine/generate', { tenantId }).then((r) => r.data);

export const getEmployees = (tenantId: string) =>
  api.get<EmployeeRow[]>('/employees', { headers: { 'x-tenant-id': tenantId } }).then((r) => r.data);

export const patchEmployee = (tenantId: string, empId: string, patch: Partial<EmployeeRow>) =>
  api.patch<EmployeeRow>(`/employees/${empId}`, patch, { headers: { 'x-tenant-id': tenantId } }).then((r) => r.data);
