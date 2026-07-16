import api from './axios';

// ─── Types (mirrors apps/admin/src/api/billing.api.ts) ───────────────────────

export type PlanType             = 'trial' | 'starter' | 'pro';
export type SubStatus            = 'active' | 'trial' | 'suspended' | 'cancelled';
export type BillingCycle         = 'monthly' | 'yearly';
export type PaymentMethod        = 'click' | 'payme' | 'manual';
export type PaymentHistoryStatus = 'pending' | 'success' | 'failed';

export interface Subscription {
  id:                   string;
  tenantId:             string;
  tenantName:           string;
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

export interface UsageLimits {
  usersOk:     boolean;
  apiCallsOk:  boolean;
  storageOk:   boolean;
  percentages: { users: number; apiCalls: number; storage: number };
}

export interface FeatureFlags {
  customers_debt_tracking: boolean;
  customers_excel_export:  boolean;
  customers_statistics:    boolean;
  customers_invoice:       boolean;
  sales_payment_types:     boolean;
  sales_excel_export:      boolean;
  sales_date_filter:       boolean;
  products_excel_import:   boolean;
  products_excel_export:   boolean;
  products_categories:     boolean;
  employees_roles:         boolean;
  employees_block:         boolean;
  dashboard_charts:        boolean;
  // Audit journal (all Pro-only)
  sales_returns_view:      boolean;
  sales_return_approve:    boolean;
  sales_receipt_view:      boolean;
  sales_system_log:        boolean;
  sales_notify_dashboard:  boolean;
  sales_notify_sms:        boolean;
  // Client portal (Pro-only)
  client_portal:           boolean;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const getMySubscription = (tenantId: string): Promise<Subscription> =>
  api.get<Subscription>(`/billing/${tenantId}`).then((r) => r.data);

export const getMyLimits = (tenantId: string): Promise<UsageLimits> =>
  api.get<UsageLimits>(`/billing/${tenantId}/limits`).then((r) => r.data);

export const getMyPaymentHistory = (tenantId: string): Promise<PaymentHistoryItem[]> =>
  api.get<PaymentHistoryItem[]>(`/billing/${tenantId}/history`).then((r) => r.data);

export const requestPlanChange = (tenantId: string, plan: PlanType, cycle: BillingCycle): Promise<Subscription> =>
  api.post<Subscription>(`/billing/${tenantId}/request-plan`, { plan, cycle }).then((r) => r.data);

export const cancelPlanRequest = (tenantId: string): Promise<Subscription> =>
  api.post<Subscription>(`/billing/${tenantId}/reject`).then((r) => r.data);

export interface ClickPaymentResult  { payment_url: string; merchant_trans_id: string }
export interface PaymePaymentResult  { payment_url: string }

export const createClickPayment = (tenantId: string, amount: number, planType: PlanType, cycle: BillingCycle): Promise<ClickPaymentResult> =>
  api.post<ClickPaymentResult>('/billing/click/create', { tenantId, amount, planType, cycle }).then((r) => r.data);

export const createPaymePayment = (tenantId: string, amount: number, planType: PlanType, cycle: BillingCycle): Promise<PaymePaymentResult> =>
  api.post<PaymePaymentResult>('/billing/payme/create', { tenantId, amount, planType, cycle }).then((r) => r.data);

export const getFeatureFlags = (tenantId: string): Promise<FeatureFlags> =>
  api.get<FeatureFlags>(`/billing/${tenantId}/features`).then((r) => r.data);
