import api from './axios';

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  address: string;
  totalDebt: number;
  createdAt: string;
}

export interface CreateCustomerData {
  tenantId: string;
  name: string;
  phone?: string;
  address?: string;
}

export const getCustomers = (tenantId: string) =>
  api.get<Customer[]>('/customers', { params: { tenantId } }).then((r) => r.data);

export const createCustomer = (data: CreateCustomerData) =>
  api.post<Customer>('/customers', data).then((r) => r.data);

export const updateCustomer = (id: string, data: Partial<CreateCustomerData> & { totalDebt?: number }) =>
  api.patch<Customer>(`/customers/${id}`, data).then((r) => r.data);
