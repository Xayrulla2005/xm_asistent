import api from './axios';

export interface GymPlan {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  durationDays: number;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GymMember {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  planId: string | null;
  planName: string | null;
  planPrice: number | null;
  joinedAt: string | null;
  expiresAt: string | null;
  status: 'active' | 'expired' | 'frozen' | 'cancelled';
  totalCheckins: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GymCheckIn {
  id: string;
  tenantId: string;
  memberId: string;
  memberName: string;
  note: string | null;
  checkedAt: string;
}

export interface MemberStats {
  total: number;
  active: number;
  expired: number;
  todayCheckins: number;
}

// Plans
export const getGymPlans = () =>
  api.get<GymPlan[]>('/gym/plans').then((r) => r.data);
export const createGymPlan = (dto: Partial<GymPlan>) =>
  api.post<GymPlan>('/gym/plans', dto).then((r) => r.data);
export const updateGymPlan = (id: string, dto: Partial<GymPlan>) =>
  api.put<GymPlan>(`/gym/plans/${id}`, dto).then((r) => r.data);
export const deleteGymPlan = (id: string) =>
  api.delete(`/gym/plans/${id}`).then((r) => r.data);

// Members
export const getMemberStats = () =>
  api.get<MemberStats>('/gym/members/stats').then((r) => r.data);
export const getGymMembers = (search?: string, status?: string) =>
  api.get<GymMember[]>('/gym/members', { params: { search, status } }).then((r) => r.data);
export const createGymMember = (dto: Partial<GymMember>) =>
  api.post<GymMember>('/gym/members', dto).then((r) => r.data);
export const updateGymMember = (id: string, dto: Partial<GymMember>) =>
  api.put<GymMember>(`/gym/members/${id}`, dto).then((r) => r.data);
export const deleteGymMember = (id: string) =>
  api.delete(`/gym/members/${id}`).then((r) => r.data);
export const syncExpiredMembers = () =>
  api.post('/gym/members/sync-expired').then((r) => r.data);

// Check-ins
export const getCheckins = (memberId?: string, date?: string) =>
  api.get<GymCheckIn[]>('/gym/checkins', { params: { memberId, date } }).then((r) => r.data);
export const checkIn = (memberId: string, note?: string) =>
  api.post<GymCheckIn>('/gym/checkins', { memberId, note }).then((r) => r.data);
