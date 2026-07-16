import api from './axios';

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  qty: number;
  notes?: string;
}

export interface MenuItem {
  id: string;
  tenantId: string;
  name: string;
  category: string | null;
  description: string | null;
  price: number;
  imageUrl: string | null;
  preparationTime: number;
  isAvailable: boolean;
  isPopular: boolean;
  createdAt: string;
}

export interface RestTable {
  id: string;
  tenantId: string;
  number: string;
  capacity: number;
  zone: string | null;
  status: string;
  currentOrderId: string | null;
}

export interface RestOrder {
  id: string;
  tenantId: string;
  tableId: string | null;
  tableNumber: string | null;
  items: OrderItem[];
  total: number;
  status: string;
  paymentMethod: string | null;
  notes: string | null;
  customerName: string | null;
  createdAt: string;
}

// Menu
export const getMenu = (search?: string, category?: string) =>
  api.get<MenuItem[]>('/restaurant/menu', { params: { search, category } }).then((r) => r.data);
export const createMenuItem = (dto: Partial<MenuItem>) =>
  api.post<MenuItem>('/restaurant/menu', dto).then((r) => r.data);
export const updateMenuItem = (id: string, dto: Partial<MenuItem>) =>
  api.put<MenuItem>(`/restaurant/menu/${id}`, dto).then((r) => r.data);
export const deleteMenuItem = (id: string) =>
  api.delete(`/restaurant/menu/${id}`).then((r) => r.data);

// Tables
export const getTables = () =>
  api.get<RestTable[]>('/restaurant/tables').then((r) => r.data);
export const createTable = (dto: Partial<RestTable>) =>
  api.post<RestTable>('/restaurant/tables', dto).then((r) => r.data);
export const updateTable = (id: string, dto: Partial<RestTable>) =>
  api.put<RestTable>(`/restaurant/tables/${id}`, dto).then((r) => r.data);
export const deleteTable = (id: string) =>
  api.delete(`/restaurant/tables/${id}`).then((r) => r.data);

// Orders
export const getOrders = (status?: string) =>
  api.get<RestOrder[]>('/restaurant/orders', { params: status ? { status } : {} }).then((r) => r.data);
export const getKitchenOrders = () =>
  api.get<RestOrder[]>('/restaurant/orders/kitchen').then((r) => r.data);
export const getOrderStats = () =>
  api.get<{ total: number; pending: number; cooking: number; today: number }>('/restaurant/orders/stats').then((r) => r.data);
export const createOrder = (dto: Partial<RestOrder>) =>
  api.post<RestOrder>('/restaurant/orders', dto).then((r) => r.data);
export const updateOrder = (id: string, dto: Partial<RestOrder>) =>
  api.put<RestOrder>(`/restaurant/orders/${id}`, dto).then((r) => r.data);
export const deleteOrder = (id: string) =>
  api.delete(`/restaurant/orders/${id}`).then((r) => r.data);
