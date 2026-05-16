import api from './axios';

export type PaymentType = 'cash' | 'card' | 'credit';
export type SaleStatus = 'pending' | 'completed' | 'cancelled';

export interface SaleItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Sale {
  id: string;
  tenantId: string;
  customerName: string;
  items: SaleItem[];
  totalAmount: number;
  paymentType: PaymentType;
  status: SaleStatus;
  createdAt: string;
}

export interface SaleStats {
  totalSales: number;
  totalAmount: number;
  totalCustomers: number;
}

export interface CreateSaleData {
  tenantId: string;
  customerName: string;
  items: SaleItem[];
  paymentType?: PaymentType;
}

export const getSales = (tenantId: string) =>
  api.get<Sale[]>('/sales', { params: { tenantId } }).then((r) => r.data);

export const createSale = (data: CreateSaleData) =>
  api.post<Sale>('/sales', data).then((r) => r.data);

export const getStats = (tenantId: string) =>
  api.get<SaleStats>('/sales/stats', { params: { tenantId } }).then((r) => r.data);

export const updateSaleStatus = (id: string, status: SaleStatus) =>
  api.patch<Sale>(`/sales/${id}/status`, { status }).then((r) => r.data);
