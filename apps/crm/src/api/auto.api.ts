import api from './axios';

export interface AutoVehicle {
  id: string;
  tenantId: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  brand: string;
  model: string;
  year: number | null;
  plateNumber: string | null;
  color: string | null;
  vin: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkItem {
  name: string;
  qty: number;
  price: number;
  type: 'work' | 'part';
}

export interface AutoServiceOrder {
  id: string;
  tenantId: string;
  vehicleId: string | null;
  plateNumber: string | null;
  vehicleInfo: string | null;
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  description: string;
  mechanics: string[];
  status: 'received' | 'diagnosing' | 'in_progress' | 'ready' | 'delivered';
  workItems: WorkItem[];
  totalCost: number;
  receivedAt: string;
  estimatedAt: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStats {
  received: number;
  diagnosing: number;
  inProgress: number;
  ready: number;
  totalToday: number;
}

// Vehicles
export const getAutoVehicles = (search?: string) =>
  api.get<AutoVehicle[]>('/auto/vehicles', { params: { search } }).then((r) => r.data);
export const createAutoVehicle = (dto: Partial<AutoVehicle>) =>
  api.post<AutoVehicle>('/auto/vehicles', dto).then((r) => r.data);
export const updateAutoVehicle = (id: string, dto: Partial<AutoVehicle>) =>
  api.put<AutoVehicle>(`/auto/vehicles/${id}`, dto).then((r) => r.data);
export const deleteAutoVehicle = (id: string) =>
  api.delete(`/auto/vehicles/${id}`).then((r) => r.data);

// Service orders
export const getOrderStats = () =>
  api.get<OrderStats>('/auto/orders/stats').then((r) => r.data);
export const getAutoOrders = (status?: string) =>
  api.get<AutoServiceOrder[]>('/auto/orders', { params: { status } }).then((r) => r.data);
export const createAutoOrder = (dto: Partial<AutoServiceOrder>) =>
  api.post<AutoServiceOrder>('/auto/orders', dto).then((r) => r.data);
export const updateAutoOrder = (id: string, dto: Partial<AutoServiceOrder>) =>
  api.put<AutoServiceOrder>(`/auto/orders/${id}`, dto).then((r) => r.data);
export const deleteAutoOrder = (id: string) =>
  api.delete(`/auto/orders/${id}`).then((r) => r.data);
export const advanceAutoOrder = (id: string) =>
  api.post<AutoServiceOrder>(`/auto/orders/${id}/advance`).then((r) => r.data);
