import api from './axios';

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  address: string;
  totalDebt: number;
  portalEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerData {
  tenantId: string;
  name: string;
  phone?: string;
  address?: string;
}

export type DebtStatus = 'pending' | 'partial' | 'paid' | 'cancelled';

export interface Debt {
  id: string;
  tenantId: string;
  saleId: string;
  customerId: string | null;
  customerName: string;
  originalAmount: number;
  remainingAmount: number;
  status: DebtStatus;
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const getCustomers = (_tenantId?: string) =>
  api.get<Customer[]>('/customers').then((r) => r.data);

export const getCustomer = (id: string) =>
  api.get<Customer>(`/customers/${id}`).then((r) => r.data);

export const createCustomer = (data: CreateCustomerData) =>
  api.post<Customer>('/customers', data).then((r) => r.data);

export const updateCustomer = (id: string, data: Partial<CreateCustomerData>) =>
  api.patch<Customer>(`/customers/${id}`, data).then((r) => r.data);

export const deleteCustomer = (id: string) =>
  api.delete(`/customers/${id}`).then((r) => r.data);

export const exportCustomersExcel = (_tenantId?: string) =>
  api.get('/customers/export', {
    responseType: 'blob',
  }).then((r) => r.data as Blob);

export const getDebts = (_tenantId?: string, customerId?: string, status?: string) =>
  api.get<Debt[]>('/debts', { params: { customerId, status } }).then((r) => r.data);

export const getDebtsSummary = (_tenantId?: string) =>
  api.get<{ totalDebt: number; pendingCount: number }>('/debts/summary').then((r) => r.data);

export const recordDebtPayment = (id: string, amount: number, notes?: string) =>
  api.patch<Debt>(`/debts/${id}/pay`, { amount, notes }).then((r) => r.data);

export const cancelDebt = (id: string) =>
  api.patch<Debt>(`/debts/${id}/cancel`).then((r) => r.data);
