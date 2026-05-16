import api from './axios';
import { Product } from './products.api';

export type WarehouseLogType = 'income' | 'expense';

export interface WarehouseLog {
  id: string;
  tenantId: string;
  productId: string;
  productName: string;
  type: WarehouseLogType;
  quantity: number;
  price: number;
  totalAmount: number;
  reason: string | null;
  createdAt: string;
}

export interface WarehouseStats {
  totalIncome: number;
  totalExpense: number;
  lowStockCount: number;
}

export interface CreateWarehouseLogData {
  tenantId: string;
  productId: string;
  type: WarehouseLogType;
  quantity: number;
  price: number;
  reason?: string;
}

export const getWarehouseLogs = (tenantId: string, type?: WarehouseLogType) =>
  api.get<WarehouseLog[]>('/warehouse', { params: { tenantId, type } }).then((r) => r.data);

export const getWarehouseStats = (tenantId: string) =>
  api.get<WarehouseStats>('/warehouse/stats', { params: { tenantId } }).then((r) => r.data);

export const getLowStockProducts = (tenantId: string) =>
  api.get<Product[]>('/warehouse/low-stock', { params: { tenantId } }).then((r) => r.data);

export const createWarehouseLog = (data: CreateWarehouseLogData) =>
  api.post<WarehouseLog>('/warehouse', data).then((r) => r.data);
