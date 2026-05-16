import api from './axios';

export type PaymentType   = 'income' | 'expense';
export type PaymentMethod = 'cash' | 'card' | 'credit';
export type PaymentStatus = 'pending' | 'completed' | 'cancelled';

export interface Payment {
  id: string;
  tenantId: string;
  customerId: string | null;
  customerName: string;
  amount: number;
  type: PaymentType;
  method: PaymentMethod;
  status: PaymentStatus;
  description: string | null;
  saleId: string | null;
  createdAt: string;
}

export interface PaymentStats {
  totalIncome: number;
  totalExpense: number;
  pendingCount: number;
}

export interface CreatePaymentData {
  tenantId: string;
  customerName: string;
  amount: number;
  type: PaymentType;
  method?: PaymentMethod;
  description?: string;
  customerId?: string;
  saleId?: string;
}

export const getPayments = (tenantId: string, status?: PaymentStatus, method?: PaymentMethod) =>
  api.get<Payment[]>('/payments', { params: { tenantId, status, method } }).then((r) => r.data);

export const getPaymentStats = (tenantId: string) =>
  api.get<PaymentStats>('/payments/stats', { params: { tenantId } }).then((r) => r.data);

export const createPayment = (data: CreatePaymentData) =>
  api.post<Payment>('/payments', data).then((r) => r.data);

export const updatePaymentStatus = (id: string, status: PaymentStatus) =>
  api.patch<Payment>(`/payments/${id}/status`, { status }).then((r) => r.data);
