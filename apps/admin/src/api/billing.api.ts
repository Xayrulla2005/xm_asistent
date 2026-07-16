import api from './axios';

// ─── Enums ────────────────────────────────────────────────────────────────────

export type PlanType      = 'trial' | 'starter' | 'pro';
export type SubStatus     = 'active' | 'trial' | 'suspended' | 'cancelled';
export type BillingCycle  = 'monthly' | 'yearly';
export type PaymentMethod = 'click' | 'payme' | 'manual';
export type PaymentHistoryStatus = 'pending' | 'success' | 'failed';

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface Subscription {
  id:                   string;
  tenantId:             string;
  tenantName:           string;   // joined in getAll()
  plan:                 PlanType;
  status:               SubStatus;
  billingCycle:         BillingCycle;
  usersLimit:           number;
  storageLimit:         number;
  apiCallsLimit:        number;
  currentApiCalls:      number;
  currentUsers:         number;
  priceUzs:             number;
  trialEndsAt:          string | null;
  currentPeriodStart:   string;
  currentPeriodEnd:     string;
  paymentMethod:        PaymentMethod;
  lastPaymentAt:        string | null;
  lastPaymentAmount:    number | null;
  nextPaymentAt:        string | null;
  pendingPlan:          PlanType | null;
  pendingCycle:         BillingCycle | null;
  pendingRequestedAt:   string | null;
  createdAt:            string;
  updatedAt:            string;
}

export interface PaymentHistoryItem {
  id:             string;
  tenantId:       string;
  subscriptionId: string;
  amount:         number;
  method:         PaymentMethod;
  status:         PaymentHistoryStatus;
  transactionId:  string | null;
  description:    string | null;
  paidAt:         string | null;
  createdAt:      string;
}

export interface BillingStats {
  monthlyRevenue: number;
  activeCount:    number;
  trialCount:     number;
  suspendedCount: number;
  byPlan:         Record<PlanType, number>;
  overdueCount:   number;
}

export interface UsageLimits {
  usersOk:     boolean;
  apiCallsOk:  boolean;
  storageOk:   boolean;
  percentages: { users: number; apiCalls: number; storage: number };
}

export interface ChangePlanPayload {
  plan:  PlanType;
  cycle: BillingCycle;
}

export interface RecordPaymentPayload {
  amount:        number;
  method:        PaymentMethod;
  transactionId?: string;
  description?:  string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const getBillingAll = (): Promise<Subscription[]> =>
  api.get<Subscription[]>('/billing').then((r) => r.data);

export const getBillingStats = (): Promise<BillingStats> =>
  api.get<BillingStats>('/billing/stats').then((r) => r.data);

export const getBilling = (tenantId: string): Promise<Subscription> =>
  api.get<Subscription>(`/billing/${tenantId}`).then((r) => r.data);

export const changePlan = (tenantId: string, payload: ChangePlanPayload): Promise<Subscription> =>
  api.post<Subscription>(`/billing/${tenantId}/plan`, payload).then((r) => r.data);

export const recordPayment = (tenantId: string, payload: RecordPaymentPayload): Promise<PaymentHistoryItem> =>
  api.post<PaymentHistoryItem>(`/billing/${tenantId}/payment`, payload).then((r) => r.data);

export const getPaymentHistory = (tenantId: string): Promise<PaymentHistoryItem[]> =>
  api.get<PaymentHistoryItem[]>(`/billing/${tenantId}/history`).then((r) => r.data);

export const checkUsageLimits = (tenantId: string): Promise<UsageLimits> =>
  api.get<UsageLimits>(`/billing/${tenantId}/limits`).then((r) => r.data);

export const suspendTenant = (tenantId: string): Promise<Subscription> =>
  api.post<Subscription>(`/billing/${tenantId}/suspend`).then((r) => r.data);

export const reactivateTenant = (tenantId: string): Promise<Subscription> =>
  api.post<Subscription>(`/billing/${tenantId}/reactivate`).then((r) => r.data);

export const getPendingRequests = (): Promise<Subscription[]> =>
  api.get<Subscription[]>('/billing/pending').then((r) => r.data);

export const approvePlanChange = (tenantId: string): Promise<Subscription> =>
  api.post<Subscription>(`/billing/${tenantId}/approve`).then((r) => r.data);

export const rejectPlanChange = (tenantId: string): Promise<Subscription> =>
  api.post<Subscription>(`/billing/${tenantId}/reject`).then((r) => r.data);
