import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { WizardConfig } from '../wizard/entities/wizard-config.entity';
import { Subscription } from '../billing/entities/subscription.entity';

// ─── Public types ─────────────────────────────────────────────────────────────

export type ActivityPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface OverviewData {
  totalUsers:        number;
  totalCustomers:    number;
  totalTenants:      number;
  activeTenants:     number;
  planDistribution:  { trial: number; starter: number; pro: number };
  monthlyRevenue:    number;
}

export interface ActivityData {
  labels:      string[];
  logins:      number[];
  apiCalls:    number[];
  activeUsers: number[];
}

export interface ServerData {
  cpuUsage:          number;
  memoryUsed:        number;
  memoryTotal:       number;
  uptime:            number;
  requestsPerMinute: number;
  activeConnections: number;
}

export interface TenantStatRow {
  id:            string;
  name:          string;
  industry:      string | null;
  userCount:     number;
  customerCount: number;
  lastActive:    string | null;
}

// ─── Internal raw query row types ─────────────────────────────────────────────

interface BucketRow {
  bucket:       string | number;
  logins:       string | number;
  active_users: string | number;
}

interface EmpStatRow {
  tenantId:   string;
  userCount:  string | number;
  lastActive: string | null;
}

interface CustStatRow {
  tenantId:      string;
  customerCount: string | number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS_UZ = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
const DAYS_UZ   = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class AnalyticsService {
  // ── In-memory metrics ──────────────────────────────────────────────────────
  private requestTimestamps: number[] = [];
  private connections = 0;
  private cpuSample = { usage: process.cpuUsage(), time: Date.now() };

  constructor(
    @InjectRepository(Employee)     private readonly empRepo:    Repository<Employee>,
    @InjectRepository(Customer)     private readonly custRepo:   Repository<Customer>,
    @InjectRepository(Tenant)       private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(WizardConfig) private readonly wizardRepo: Repository<WizardConfig>,
    @InjectRepository(Subscription) private readonly subRepo:    Repository<Subscription>,
    private readonly dataSource: DataSource,
  ) {}

  // Called by middleware on every request
  trackRequest(): void {
    const now = Date.now();
    this.requestTimestamps.push(now);
    // Keep only last 60 seconds
    this.requestTimestamps = this.requestTimestamps.filter((t) => t > now - 60_000);
  }

  incrementConnections(): void { this.connections++; }
  decrementConnections(): void { this.connections = Math.max(0, this.connections - 1); }

  // ── GET /analytics/overview ────────────────────────────────────────────────

  async getOverview(): Promise<OverviewData> {
    const [totalUsers, totalCustomers, totalTenants, activeTenants, subs] = await Promise.all([
      this.empRepo.count(),
      this.custRepo.count(),
      this.tenantRepo.count(),
      this.tenantRepo.count({ where: { isActive: true } }),
      this.subRepo.find({ select: ['plan', 'priceUzs', 'status'] }),
    ]);

    const planDistribution = { trial: 0, starter: 0, pro: 0 };
    let monthlyRevenue = 0;
    for (const s of subs) {
      const key = (s.plan as string).toLowerCase() as 'trial' | 'starter' | 'pro';
      if (key in planDistribution) planDistribution[key]++;
      if (s.status === 'active') monthlyRevenue += s.priceUzs ?? 0;
    }

    return { totalUsers, totalCustomers, totalTenants, activeTenants, planDistribution, monthlyRevenue };
  }

  // ── GET /analytics/activity?period= ───────────────────────────────────────

  async getActivity(period: ActivityPeriod): Promise<ActivityData> {
    const now = new Date();

    switch (period) {
      case 'daily':   return this.buildDaily(now);
      case 'weekly':  return this.buildPeriod(now, 7,  'date');
      case 'monthly': return this.buildPeriod(now, 30, 'date');
      case 'yearly':  return this.buildYearly(now);
    }
  }

  private async buildDaily(now: Date): Promise<ActivityData> {
    const rows = await this.dataSource.query<BucketRow[]>(`
      SELECT
        EXTRACT(HOUR FROM "updatedAt")::int AS bucket,
        COUNT(*)::int                       AS logins,
        COUNT(DISTINCT id)::int             AS active_users
      FROM employees
      WHERE "updatedAt" >= NOW() - INTERVAL '24 hours'
      GROUP BY bucket
      ORDER BY bucket
    `);

    const map = new Map(rows.map((r) => [Number(r.bucket), { l: Number(r.logins), a: Number(r.active_users) }]));
    const labels:      string[] = [];
    const logins:      number[] = [];
    const activeUsers: number[] = [];

    for (let h = 0; h < 24; h++) {
      labels.push(`${String(h).padStart(2, '0')}:00`);
      logins.push(map.get(h)?.l ?? 0);
      activeUsers.push(map.get(h)?.a ?? 0);
    }
    return { labels, logins, apiCalls: new Array(24).fill(0) as number[], activeUsers };
  }

  private async buildPeriod(now: Date, days: number, _groupBy: 'date'): Promise<ActivityData> {
    const from = new Date(now.getTime() - days * 86_400_000);
    const rows = await this.dataSource.query<BucketRow[]>(`
      SELECT
        "updatedAt"::date::text       AS bucket,
        COUNT(*)::int                 AS logins,
        COUNT(DISTINCT id)::int       AS active_users
      FROM employees
      WHERE "updatedAt" >= $1
      GROUP BY "updatedAt"::date
      ORDER BY bucket
    `, [from]);

    const map = new Map(rows.map((r) => [String(r.bucket), { l: Number(r.logins), a: Number(r.active_users) }]));
    const labels:      string[] = [];
    const logins:      number[] = [];
    const activeUsers: number[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d   = new Date(now.getTime() - i * 86_400_000);
      const key = d.toISOString().slice(0, 10);

      if (days === 7) {
        labels.push(DAYS_UZ[d.getDay()]);
      } else {
        labels.push(`${d.getDate()}/${d.getMonth() + 1}`);
      }
      logins.push(map.get(key)?.l ?? 0);
      activeUsers.push(map.get(key)?.a ?? 0);
    }
    return { labels, logins, apiCalls: new Array(days).fill(0) as number[], activeUsers };
  }

  private async buildYearly(now: Date): Promise<ActivityData> {
    const from = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const rows = await this.dataSource.query<BucketRow[]>(`
      SELECT
        DATE_TRUNC('month', "updatedAt")::date::text AS bucket,
        COUNT(*)::int                                AS logins,
        COUNT(DISTINCT id)::int                      AS active_users
      FROM employees
      WHERE "updatedAt" >= $1
      GROUP BY DATE_TRUNC('month', "updatedAt")
      ORDER BY bucket
    `, [from]);

    // bucket comes back as 'YYYY-MM-DD' (first day of month)
    const map = new Map(rows.map((r) => [String(r.bucket).slice(0, 7), { l: Number(r.logins), a: Number(r.active_users) }]));
    const labels:      string[] = [];
    const logins:      number[] = [];
    const activeUsers: number[] = [];

    for (let i = 11; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      labels.push(MONTHS_UZ[d.getMonth()]);
      logins.push(map.get(key)?.l ?? 0);
      activeUsers.push(map.get(key)?.a ?? 0);
    }
    return { labels, logins, apiCalls: new Array(12).fill(0) as number[], activeUsers };
  }

  // ── GET /analytics/server ──────────────────────────────────────────────────

  getServer(): ServerData {
    const mem     = process.memoryUsage();
    const now     = Date.now();
    const elapsed = now - this.cpuSample.time;
    const diff    = process.cpuUsage(this.cpuSample.usage);
    this.cpuSample = { usage: process.cpuUsage(), time: now };

    const cpuMs   = (diff.user + diff.system) / 1_000;
    const cpuUsage = elapsed > 10 ? Math.min(100, Math.round((cpuMs / elapsed) * 100)) : 0;

    return {
      cpuUsage,
      memoryUsed:        Math.round(mem.heapUsed  / 1_048_576),
      memoryTotal:       Math.round(mem.heapTotal / 1_048_576),
      uptime:            Math.floor(process.uptime()),
      requestsPerMinute: this.requestTimestamps.length,
      activeConnections: this.connections,
    };
  }

  // ── GET /analytics/tenants ─────────────────────────────────────────────────

  async getTenantStats(): Promise<TenantStatRow[]> {
    const [tenants, wizardConfigs, empRows, custRows] = await Promise.all([
      this.tenantRepo.find({ order: { createdAt: 'DESC' } }),
      this.wizardRepo.find(),
      this.dataSource.query<EmpStatRow[]>(`
        SELECT
          "tenantId",
          COUNT(*)::int          AS "userCount",
          MAX("updatedAt")::text AS "lastActive"
        FROM employees
        GROUP BY "tenantId"
      `),
      this.dataSource.query<CustStatRow[]>(`
        SELECT
          "tenantId",
          COUNT(*)::int AS "customerCount"
        FROM customers
        GROUP BY "tenantId"
      `),
    ]);

    const wizardMap = new Map(wizardConfigs.map((wc) => [wc.tenantId, wc.industry]));
    const empMap    = new Map(empRows.map((r) => [r.tenantId, { userCount: Number(r.userCount), lastActive: r.lastActive }]));
    const custMap   = new Map(custRows.map((r) => [r.tenantId, Number(r.customerCount)]));

    return tenants.map((t) => ({
      id:            t.id,
      name:          t.name,
      industry:      wizardMap.get(t.id) ?? null,
      userCount:     empMap.get(t.id)?.userCount     ?? 0,
      customerCount: custMap.get(t.id)               ?? 0,
      lastActive:    empMap.get(t.id)?.lastActive    ?? null,
    }));
  }
}
