import api from './axios';

export interface BeautyCatalog {
  id: string;
  tenantId: string;
  name: string;
  category: string | null;
  duration: number;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BeautyMaster {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  specialty: string | null;
  isActive: boolean;
  totalAppointments: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BeautyAppointment {
  id: string;
  tenantId: string;
  clientName: string;
  clientPhone: string | null;
  masterId: string | null;
  masterName: string | null;
  serviceId: string | null;
  serviceName: string | null;
  servicePrice: number;
  date: string;
  timeSlot: string;
  duration: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  fee: number;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentStats {
  todayCount: number;
  scheduled: number;
  completedToday: number;
  todayFee: number;
}

// Services catalog
export const getBeautyServices = () =>
  api.get<BeautyCatalog[]>('/beauty/services').then((r) => r.data);
export const createBeautyService = (dto: Partial<BeautyCatalog>) =>
  api.post<BeautyCatalog>('/beauty/services', dto).then((r) => r.data);
export const updateBeautyService = (id: string, dto: Partial<BeautyCatalog>) =>
  api.put<BeautyCatalog>(`/beauty/services/${id}`, dto).then((r) => r.data);
export const deleteBeautyService = (id: string) =>
  api.delete(`/beauty/services/${id}`).then((r) => r.data);

// Masters
export const getBeautyMasters = () =>
  api.get<BeautyMaster[]>('/beauty/masters').then((r) => r.data);
export const createBeautyMaster = (dto: Partial<BeautyMaster>) =>
  api.post<BeautyMaster>('/beauty/masters', dto).then((r) => r.data);
export const updateBeautyMaster = (id: string, dto: Partial<BeautyMaster>) =>
  api.put<BeautyMaster>(`/beauty/masters/${id}`, dto).then((r) => r.data);
export const deleteBeautyMaster = (id: string) =>
  api.delete(`/beauty/masters/${id}`).then((r) => r.data);

// Appointments
export const getAppointmentStats = () =>
  api.get<AppointmentStats>('/beauty/appointments/stats').then((r) => r.data);
export const getBeautyAppointments = (date?: string, masterId?: string, status?: string) =>
  api.get<BeautyAppointment[]>('/beauty/appointments', { params: { date, masterId, status } }).then((r) => r.data);
export const createBeautyAppointment = (dto: Partial<BeautyAppointment>) =>
  api.post<BeautyAppointment>('/beauty/appointments', dto).then((r) => r.data);
export const updateBeautyAppointment = (id: string, dto: Partial<BeautyAppointment>) =>
  api.put<BeautyAppointment>(`/beauty/appointments/${id}`, dto).then((r) => r.data);
export const deleteBeautyAppointment = (id: string) =>
  api.delete(`/beauty/appointments/${id}`).then((r) => r.data);
