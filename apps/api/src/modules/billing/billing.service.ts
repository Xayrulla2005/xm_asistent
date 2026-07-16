import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';
import { BillingCycle, PaymentMethod, PlanType, SubStatus, Subscription } from './entities/subscription.entity';
import { PaymentHistory, PaymentHistoryMethod, PaymentHistoryStatus } from './entities/payment-history.entity';
import { ChangePlanDto, RecordPaymentDto } from './dto/billing.dto';

// ─── Plan configuration (prices in USD) ──────────────────────────────────────

interface PlanConfig {
  usersLimit:    number;
  storageLimit:  number;
  apiCallsLimit: number;
  priceMonthly:  number; // USD
  priceYearly:   number; // USD
}

// Narxlar so'mda (UZS). 1 USD ≈ 12,800 UZS — kerak bo'lsa admin paneldan o'zgartiring
export const PLAN_LIMITS: Record<PlanType, PlanConfig> = {
  [PlanType.TRIAL]:   { usersLimit: 3,  storageLimit: 500,    apiCallsLimit: 500,    priceMonthly: 0,          priceYearly: 0          },
  [PlanType.STARTER]: { usersLimit: 10, storageLimit: 2_000,  apiCallsLimit: 10_000, priceMonthly: 128_000,    priceYearly: 1_280_000  },
  [PlanType.PRO]:     { usersLimit: 50, storageLimit: 10_000, apiCallsLimit: 100_000,priceMonthly: 640_000,    priceYearly: 6_400_000  },
};

const TRIAL_DAYS = 14;
const MS_PER_DAY = 86_400_000;

// ─── Response types ───────────────────────────────────────────────────────────

export interface SubscriptionRow extends Subscription {
  tenantName: string;
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

// ─── Feature flags ────────────────────────────────────────────────────────────

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
  // Audit journal
  sales_returns_view:      boolean;
  sales_return_approve:    boolean;
  sales_receipt_view:      boolean;
  sales_system_log:        boolean;
  sales_notify_dashboard:  boolean;
  sales_notify_sms:        boolean;
  // Client portal
  client_portal:           boolean;
}

const TRIAL_FLAGS: FeatureFlags = {
  customers_debt_tracking: false,
  customers_excel_export:  false,
  customers_statistics:    false,
  customers_invoice:       false,
  sales_payment_types:     false,
  sales_excel_export:      false,
  sales_date_filter:       false,
  products_excel_import:   false,
  products_excel_export:   false,
  products_categories:     false,
  employees_roles:         false,
  employees_block:         false,
  dashboard_charts:        false,
  sales_returns_view:      false,
  sales_return_approve:    false,
  sales_receipt_view:      false,
  sales_system_log:        false,
  sales_notify_dashboard:  false,
  sales_notify_sms:        false,
  client_portal:           false,
};

const STARTER_FLAGS: FeatureFlags = {
  customers_debt_tracking: true,
  customers_excel_export:  false,
  customers_statistics:    false,
  customers_invoice:       false,
  sales_payment_types:     true,
  sales_excel_export:      true,
  sales_date_filter:       true,
  products_excel_import:   true,
  products_excel_export:   true,
  products_categories:     true,
  employees_roles:         true,
  employees_block:         true,
  dashboard_charts:        true,
  sales_returns_view:      false,
  sales_return_approve:    false,
  sales_receipt_view:      false,
  sales_system_log:        false,
  sales_notify_dashboard:  false,
  sales_notify_sms:        false,
  client_portal:           false,
};

const PRO_FLAGS: FeatureFlags = {
  customers_debt_tracking: true,
  customers_excel_export:  true,
  customers_statistics:    true,
  customers_invoice:       true,
  sales_payment_types:     true,
  sales_excel_export:      true,
  sales_date_filter:       true,
  products_excel_import:   true,
  products_excel_export:   true,
  products_categories:     true,
  employees_roles:         true,
  employees_block:         true,
  dashboard_charts:        true,
  sales_returns_view:      true,
  sales_return_approve:    true,
  sales_receipt_view:      true,
  sales_system_log:        true,
  sales_notify_dashboard:  true,
  sales_notify_sms:        true,
  client_portal:           true,
};

const FLAGS_BY_PLAN: Record<PlanType, FeatureFlags> = {
  [PlanType.TRIAL]:   TRIAL_FLAGS,
  [PlanType.STARTER]: STARTER_FLAGS,
  [PlanType.PRO]:     PRO_FLAGS,
};

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Subscription)  private readonly subRepo:     Repository<Subscription>,
    @InjectRepository(PaymentHistory) private readonly payRepo:    Repository<PaymentHistory>,
    @InjectRepository(Tenant)         private readonly tenantRepo: Repository<Tenant>,
  ) {}

  // ── Get or create a TRIAL subscription ────────────────────────────────────

  async getOrCreate(tenantId: string): Promise<Subscription> {
    const existing = await this.subRepo.findOne({ where: { tenantId } });
    if (existing) return existing;

    const now         = new Date();
    const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * MS_PER_DAY);
    const limits      = PLAN_LIMITS[PlanType.TRIAL];

    const sub = this.subRepo.create({
      tenantId,
      plan:               PlanType.TRIAL,
      status:             SubStatus.TRIAL,
      billingCycle:       BillingCycle.MONTHLY,
      usersLimit:         limits.usersLimit,
      storageLimit:       limits.storageLimit,
      apiCallsLimit:      limits.apiCallsLimit,
      currentApiCalls:    0,
      currentUsers:       0,
      priceUzs:           0,
      trialEndsAt,
      currentPeriodStart: now,
      currentPeriodEnd:   trialEndsAt,
      paymentMethod:      PaymentMethod.MANUAL,
      lastPaymentAt:      null,
      lastPaymentAmount:  null,
      nextPaymentAt:      null,
    });
    return this.subRepo.save(sub);
  }

  // ── All subscriptions joined with tenant names ─────────────────────────────

  async getAll(): Promise<SubscriptionRow[]> {
    const [subs, tenants] = await Promise.all([
      this.subRepo.find({ order: { createdAt: 'DESC' } }),
      this.tenantRepo.find(),
    ]);
    const nameMap = new Map(tenants.map((t) => [t.id, t.name]));
    // Only return subscriptions whose tenant still exists
    return subs
      .filter((s) => nameMap.has(s.tenantId))
      .map((s) => Object.assign(Object.create(Object.getPrototypeOf(s)), s, {
        tenantName: nameMap.get(s.tenantId)!,
      }) as SubscriptionRow);
  }

  // ── Change plan (TRIAL not allowed as a target) ────────────────────────────

  async changePlan(tenantId: string, dto: ChangePlanDto): Promise<Subscription> {
    if (dto.plan === PlanType.TRIAL) {
      throw new BadRequestException('Cannot set plan to TRIAL directly');
    }
    const sub     = await this.getOrCreate(tenantId);
    const limits  = PLAN_LIMITS[dto.plan];
    const now     = new Date();
    const days    = dto.cycle === BillingCycle.YEARLY ? 365 : 30;
    const periodEnd = new Date(now.getTime() + days * MS_PER_DAY);

    sub.plan               = dto.plan;
    sub.billingCycle       = dto.cycle;
    sub.usersLimit         = limits.usersLimit;
    sub.storageLimit       = limits.storageLimit;
    sub.apiCallsLimit      = limits.apiCallsLimit;
    sub.priceUzs           = dto.cycle === BillingCycle.YEARLY ? limits.priceYearly : limits.priceMonthly;
    sub.currentPeriodStart = now;
    sub.currentPeriodEnd   = periodEnd;
    sub.nextPaymentAt      = periodEnd;
    sub.status             = SubStatus.ACTIVE;

    return this.subRepo.save(sub);
  }

  // ── Record a manual or payment-gateway payment ─────────────────────────────

  async recordPayment(tenantId: string, dto: RecordPaymentDto): Promise<PaymentHistory> {
    const sub = await this.getOrCreate(tenantId);
    const now = new Date();
    const days = sub.billingCycle === BillingCycle.YEARLY ? 365 : 30;

    const base   = sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now;
    const newEnd = new Date(base.getTime() + days * MS_PER_DAY);

    sub.lastPaymentAt     = now;
    sub.lastPaymentAmount = dto.amount;
    sub.currentPeriodEnd  = newEnd;
    sub.nextPaymentAt     = newEnd;
    if (sub.status === SubStatus.TRIAL || sub.status === SubStatus.SUSPENDED) {
      sub.status = SubStatus.ACTIVE;
    }
    await this.subRepo.save(sub);

    const history = this.payRepo.create({
      tenantId,
      subscriptionId: sub.id,
      amount:         dto.amount,
      method:         dto.method as unknown as PaymentHistoryMethod,
      status:         PaymentHistoryStatus.SUCCESS,
      transactionId:  dto.transactionId ?? null,
      description:    dto.description   ?? null,
      paidAt:         now,
    });
    return this.payRepo.save(history);
  }

  // ── Payment history for a tenant ──────────────────────────────────────────

  getPaymentHistory(tenantId: string): Promise<PaymentHistory[]> {
    return this.payRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  // ── Suspend / reactivate ───────────────────────────────────────────────────

  async suspendTenant(tenantId: string): Promise<Subscription> {
    const sub  = await this.getOrCreate(tenantId);
    sub.status = SubStatus.SUSPENDED;
    return this.subRepo.save(sub);
  }

  async reactivateTenant(tenantId: string): Promise<Subscription> {
    const sub  = await this.getOrCreate(tenantId);
    sub.status = SubStatus.ACTIVE;
    return this.subRepo.save(sub);
  }

  // ── Usage limits check ─────────────────────────────────────────────────────

  async checkUsageLimits(tenantId: string): Promise<UsageLimits> {
    const sub      = await this.getOrCreate(tenantId);
    const usersPct = sub.usersLimit    > 0 ? (sub.currentUsers    / sub.usersLimit)    : 0;
    const apiPct   = sub.apiCallsLimit > 0 ? (sub.currentApiCalls / sub.apiCallsLimit) : 0;
    return {
      usersOk:    usersPct < 1,
      apiCallsOk: apiPct   < 1,
      storageOk:  true,
      percentages: {
        users:    Math.round(usersPct * 100),
        apiCalls: Math.round(apiPct   * 100),
        storage:  0,
      },
    };
  }

  // ── API call counter ───────────────────────────────────────────────────────

  async incrementApiCalls(tenantId: string): Promise<void> {
    await this.subRepo
      .createQueryBuilder()
      .update(Subscription)
      .set({ currentApiCalls: () => '"currentApiCalls" + 1' })
      .where('"tenantId" = :tenantId', { tenantId })
      .execute();
  }

  // ── Sync employee count into subscription ──────────────────────────────────

  async syncUserCount(tenantId: string, count: number): Promise<void> {
    await this.subRepo.update({ tenantId }, { currentUsers: count });
  }

  // ── Global stats ──────────────────────────────────────────────────────────

  async getStats(): Promise<BillingStats> {
    const [allSubs, tenants] = await Promise.all([
      this.subRepo.find(),
      this.tenantRepo.find({ select: ['id'] }),
    ]);
    const tenantIds = new Set(tenants.map((t) => t.id));
    const subs = allSubs.filter((s) => tenantIds.has(s.tenantId));
    const now  = new Date();

    const monthlyRevenue = subs
      .filter((s) => s.status === SubStatus.ACTIVE)
      .reduce((sum, s) => {
        const price = Number(s.priceUzs);
        return sum + (s.billingCycle === BillingCycle.YEARLY ? price / 12 : price);
      }, 0);

    const activeCount    = subs.filter((s) => s.status === SubStatus.ACTIVE).length;
    const trialCount     = subs.filter((s) => s.status === SubStatus.TRIAL).length;
    const suspendedCount = subs.filter((s) => s.status === SubStatus.SUSPENDED).length;

    const byPlan: Record<PlanType, number> = {
      [PlanType.TRIAL]:   subs.filter((s) => s.plan === PlanType.TRIAL).length,
      [PlanType.STARTER]: subs.filter((s) => s.plan === PlanType.STARTER).length,
      [PlanType.PRO]:     subs.filter((s) => s.plan === PlanType.PRO).length,
    };

    const overdueCount = subs.filter(
      (s) => s.status === SubStatus.ACTIVE && s.nextPaymentAt !== null && new Date(s.nextPaymentAt) < now,
    ).length;

    return { monthlyRevenue, activeCount, trialCount, suspendedCount, byPlan, overdueCount };
  }

  // ── Get single subscription ────────────────────────────────────────────────

  async findByTenantOrFail(tenantId: string): Promise<Subscription> {
    const sub = await this.subRepo.findOne({ where: { tenantId } });
    if (!sub) throw new NotFoundException(`Billing record for tenant ${tenantId} not found`);
    return sub;
  }

  // ── Feature flags for the tenant's current plan ───────────────────────────

  async getFeatureFlags(tenantId: string): Promise<FeatureFlags> {
    const sub = await this.getOrCreate(tenantId);
    return FLAGS_BY_PLAN[sub.plan] ?? TRIAL_FLAGS;
  }

  // ── Request plan change ────────────────────────────────────────────────────

  async requestPlanChange(tenantId: string, plan: PlanType, cycle: BillingCycle): Promise<Subscription> {
    const sub = await this.getOrCreate(tenantId);
    sub.pendingPlan        = plan;
    sub.pendingCycle       = cycle;
    sub.pendingRequestedAt = new Date();
    return this.subRepo.save(sub);
  }

  // ── Approve pending request ────────────────────────────────────────────────

  async approvePlanChange(tenantId: string): Promise<Subscription> {
    const sub = await this.getOrCreate(tenantId);
    if (!sub.pendingPlan || !sub.pendingCycle) {
      throw new BadRequestException("Kutayotgan so'rov mavjud emas");
    }

    const limits    = PLAN_LIMITS[sub.pendingPlan];
    const now       = new Date();
    const days      = sub.pendingCycle === BillingCycle.YEARLY ? 365 : 30;
    const periodEnd = new Date(now.getTime() + days * MS_PER_DAY);

    sub.plan               = sub.pendingPlan;
    sub.billingCycle       = sub.pendingCycle;
    sub.usersLimit         = limits.usersLimit;
    sub.storageLimit       = limits.storageLimit;
    sub.apiCallsLimit      = limits.apiCallsLimit;
    sub.priceUzs           = sub.pendingCycle === BillingCycle.YEARLY ? limits.priceYearly : limits.priceMonthly;
    sub.currentPeriodStart = now;
    sub.currentPeriodEnd   = periodEnd;
    sub.nextPaymentAt      = periodEnd;
    sub.status             = SubStatus.ACTIVE;
    sub.pendingPlan        = null;
    sub.pendingCycle       = null;
    sub.pendingRequestedAt = null;

    return this.subRepo.save(sub);
  }

  // ── Reject / cancel pending request ───────────────────────────────────────

  async rejectPlanChange(tenantId: string): Promise<Subscription> {
    const sub = await this.getOrCreate(tenantId);
    sub.pendingPlan        = null;
    sub.pendingCycle       = null;
    sub.pendingRequestedAt = null;
    return this.subRepo.save(sub);
  }

  // ── All pending plan requests ──────────────────────────────────────────────

  async getPendingRequests(): Promise<SubscriptionRow[]> {
    const [subs, tenants] = await Promise.all([
      this.subRepo.find({
        where: { pendingPlan: Not(IsNull()) },
        order: { pendingRequestedAt: 'DESC' },
      }),
      this.tenantRepo.find(),
    ]);
    const nameMap = new Map(tenants.map((t) => [t.id, t.name]));
    return subs
      .filter((s) => nameMap.has(s.tenantId))
      .map((s) => Object.assign(Object.create(Object.getPrototypeOf(s)), s, {
        tenantName: nameMap.get(s.tenantId)!,
      }) as SubscriptionRow);
  }
}
