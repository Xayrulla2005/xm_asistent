import axios from 'axios';
import api from './axios';

const publicApi = axios.create({ baseURL: 'http://localhost:3000/api' });

export type PaymentType = 'cash' | 'card' | 'credit' | 'mixed' | 'partial' | 'transfer';
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
  customerId: string | null;
  items: SaleItem[];
  discount: number;
  totalAmount: number;
  paymentType: string;
  cashReceived: number | null;
  change: number | null;
  mixedCash: number | null;
  mixedCard: number | null;
  mixedTransfer: number | null;
  partialPaid: number | null;
  partialRemaining: number | null;
  currency: string;
  currencyRate: number;
  status: SaleStatus;
  createdAt: string;
  updatedAt: string;
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
  tenantId:         string;
  customerName?:    string;
  customerId?:      string;
  items:            CreateSaleItemData[];
  paymentType?:     PaymentType;
  cashReceived?:    number;
  change?:          number;
  mixedCash?:       number;
  mixedCard?:       number;
  mixedTransfer?:   number;
  currency?:        string;
  currencyRate?:    number;
  amountInCurrency?: number;
  partialPaid?:     number;
}

export interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
  discount: number;
  subtotal: number;
}

export interface ReceiptData {
  id:               string;
  tenantId:         string;
  receiptNumber:    string;
  createdAt:        string;
  sellerName:       string;
  items:            ReceiptItem[];
  subtotal:         number;
  discount:         number;
  total:            number;
  paymentType:      string;
  cashReceived:     number | null;
  change:           number | null;
  mixedCash:        number | null;
  mixedCard:        number | null;
  mixedTransfer:    number | null;
  partialPaid:      number | null;
  partialRemaining: number | null;
  customerName:     string | null;
  customerPhone:    string | null;
  totalDebt:        number | null;
  currency:         string;
  currencyRate:     number;
  amountInCurrency: number | null;
}

export interface ReturnItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface SaleReturn {
  id: string;
  tenantId: string;
  saleId: string;
  items: ReturnItem[];
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  totalRefund: number;
  createdAt: string;
}

export const getSales = (tenantId: string) =>
  api.get<Sale[]>('/sales', { params: { tenantId } }).then((r) => r.data);

export const getSale = (id: string) =>
  api.get<Sale & { debt?: unknown }>(`/sales/${id}`).then((r) => r.data);

export const createSale = (data: CreateSaleData) =>
  api.post<Sale>('/sales', data).then((r) => r.data);

export const getReceipt = (id: string) =>
  api.get<ReceiptData>(`/sales/receipt/${id}`).then((r) => r.data);

export const getPublicReceipt = (id: string) =>
  publicApi.get<ReceiptData>(`/sales/receipt/${id}`).then((r) => r.data);

export const getStats = (tenantId: string) =>
  api.get<SaleStats>('/sales/stats', { params: { tenantId } }).then((r) => r.data);

export const updateSaleStatus = (id: string, status: SaleStatus) =>
  api.patch<Sale>(`/sales/${id}/status`, { status }).then((r) => r.data);

export const createReturn = (id: string, items: ReturnItem[], reason?: string) =>
  api.post<SaleReturn>(`/sales/${id}/return`, { items, reason }).then((r) => r.data);

export const getSaleReturns = (id: string) =>
  api.get<SaleReturn[]>(`/sales/${id}/returns`).then((r) => r.data);

export const getAllReturns = (tenantId: string) =>
  api.get<SaleReturn[]>('/sales/returns', { params: { tenantId } }).then((r) => r.data);

export const updateReturnStatus = (id: string, status: 'approved' | 'rejected') =>
  api.patch<SaleReturn>(`/sales/returns/${id}`, { status }).then((r) => r.data);

export const exportSalesExcel = (tenantId: string, from?: string, to?: string) =>
  api.get('/sales/export', {
    params: { tenantId, from, to },
    responseType: 'blob',
  }).then((r) => r.data as Blob);
