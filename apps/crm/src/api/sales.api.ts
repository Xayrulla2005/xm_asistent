import api from './axios';

export type PaymentType = 'cash' | 'card' | 'credit' | 'mixed';
export type SaleStatus = 'pending' | 'completed' | 'cancelled';

export interface SaleItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  discount: number;
}

export interface Sale {
  id: string;
  tenantId: string;
  customerName: string;
  items: SaleItem[];
  discount: number;
  totalAmount: number;
  paymentType: string;
  cashReceived: number | null;
  change: number | null;
  mixedCash: number | null;
  mixedCard: number | null;
  status: SaleStatus;
  createdAt: string;
}

export interface SaleStats {
  totalSales: number;
  totalAmount: number;
  totalCustomers: number;
}

export interface CreateSaleItemData {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  discount?: number;
}

export interface CreateSaleData {
  tenantId: string;
  customerName?: string;
  items: CreateSaleItemData[];
  paymentType?: PaymentType;
  cashReceived?: number;
  change?: number;
  mixedCash?: number;
  mixedCard?: number;
}

export interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
  discount: number;
  subtotal: number;
}

export interface ReceiptData {
  receiptNumber: string;
  createdAt: string;
  sellerName: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentType: string;
  cashReceived: number | null;
  change: number | null;
  mixedCash: number | null;
  mixedCard: number | null;
  customerName: string;
}

export const getSales = (tenantId: string) =>
  api.get<Sale[]>('/sales', { params: { tenantId } }).then((r) => r.data);

export const createSale = (data: CreateSaleData) =>
  api.post<Sale>('/sales', data).then((r) => r.data);

export const getReceipt = (id: string) =>
  api.get<ReceiptData>(`/sales/receipt/${id}`).then((r) => r.data);

export const getStats = (tenantId: string) =>
  api.get<SaleStats>('/sales/stats', { params: { tenantId } }).then((r) => r.data);

export const updateSaleStatus = (id: string, status: SaleStatus) =>
  api.patch<Sale>(`/sales/${id}/status`, { status }).then((r) => r.data);
