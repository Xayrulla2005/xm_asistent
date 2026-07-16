import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
  BarChart, Bar, Cell,
} from 'recharts';
import api from '../api/axios';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface OverviewData {
  totalUsers:           number;
  totalCustomers:       number;
  totalTenants:         number;
  activeTenants:        number;
  planDistribution:     { trial: number; starter: number; pro: number };
  monthlyRevenue:       number;
  newTenantsThisMonth:  number;
  churnedThisMonth:     number;
}

interface ActivityData {
  labels:      string[];
  logins:      number[];
  apiCalls:    number[];
  activeUsers: number[];
}

interface MrrPoint {
  month:   string;
  mrr:     number;
  tenants: number;
}

interface IndustryBreakdown {
  industry: string;
  count:    number;
  revenue:  number;
}

interface ServerData {
  cpuUsage:          number;
  memoryUsed:        number;
  memoryTotal:       number;
  uptime:            number;
  requestsPerMinute: number;
  activeConnections: number;
}

interface TenantStatRow {
  id:            string;
  name:          string;
  industry:      string | null;
  userCount:     number;
  customerCount: number;
  lastActive:    string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIODS: { key: Period; label: string }[] = [
  { key: 'daily',   label: 'Kunlik'   },
  { key: 'weekly',  label: 'Haftalik' },
  { key: 'monthly', label: 'Oylik'    },
  { key: 'yearly',  label: 'Yillik'   },
];

const INDUSTRY_LABEL: Record<string, string> = {
  retail:     'Savdo',
  restaurant: 'Restoran',
  clinic:     'Klinika',
  education:  "Ta'lim",
  fitness:    'Fitnes',
  beauty:     "Go'zallik",
  auto:       'Avtoservis',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3_600);
  const m = Math.floor((seconds % 3_600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d} kun`);
  if (h > 0) parts.push(`${h} soat`);
  if (m > 0) parts.push(`${m} daqiqa`);
  return parts.length ? parts.join(' ') : '< 1 daqiqa';
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const h  = Math.floor(ms / 3_600_000);
  if (h < 1)  return 'Az vaqt oldin';
  if (h < 24) return `${h} soat oldin`;
  return `${Math.floor(h / 24)} kun oldin`;
}

function barColor(pct: number): string {
  if (pct < 50) return '#16a34a';
  if (pct < 80) return '#f59e0b';
  return '#ef4444';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color,
}: {
  label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="card" style={{ borderTop: `3px solid ${color}`, minWidth: 0 }}>
      <div style={{ fontSize: '1.85rem', fontWeight: 700, color, lineHeight: 1.15 }}>{value}</div>
      <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
      {sub && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 3, opacity: 0.75 }}>{sub}</div>
      )}
    </div>
  );
}

function ProgressBar({
  label, value, max, unit, color,
}: {
  label: string; value: number; max: number; unit?: string; color: string;
}) {
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontWeight: 600 }}>
          {unit ? `${value} / ${max} ${unit}` : `${pct}%`}
        </span>
      </div>
      <div style={{ height: 10, background: 'var(--border, #e2e8f0)', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: color, borderRadius: 5,
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 600, letterSpacing: '0.03em' }}>
      {children}
    </h3>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Statistics() {
  const [overview,          setOverview]          = useState<OverviewData | null>(null);
  const [activity,          setActivity]          = useState<ActivityData | null>(null);
  const [serverStats,       setServerStats]        = useState<ServerData | null>(null);
  const [tenantStats,       setTenantStats]        = useState<TenantStatRow[]>([]);
  const [mrrTrend,          setMrrTrend]           = useState<MrrPoint[]>([]);
  const [industryBreakdown, setIndustryBreakdown]  = useState<IndustryBreakdown[]>([]);
  const [period,       setPeriod]       = useState<Period>('weekly');
  const [initLoading,  setInitLoading]  = useState(true);
  const [actLoading,   setActLoading]   = useState(false);
  const [error,        setError]        = useState('');
  const [sortCol,      setSortCol]      = useState<'userCount' | 'customerCount'>('userCount');

  const serverTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Initial load: overview + tenants + default activity ───────────────────
  useEffect(() => {
    Promise.all([
      api.get<OverviewData>('/analytics/overview').then((r) => r.data),
      api.get<ActivityData>('/analytics/activity?period=weekly').then((r) => r.data),
      api.get<TenantStatRow[]>('/analytics/tenants').then((r) => r.data),
      api.get<MrrPoint[]>('/analytics/mrr-trend').then((r) => r.data).catch(() => []),
      api.get<IndustryBreakdown[]>('/analytics/industry-breakdown').then((r) => r.data).catch(() => []),
    ])
      .then(([ov, act, ts, mrr, ind]) => {
        setOverview(ov);
        setActivity(act);
        setTenantStats(ts);
        setMrrTrend(mrr);
        setIndustryBreakdown(ind);
      })
      .catch(() => setError("Ma'lumot yuklab bo'lmadi"))
      .finally(() => setInitLoading(false));
  }, []);

  // ── Re-fetch activity on period change ────────────────────────────────────
  useEffect(() => {
    if (initLoading) return;
    setActLoading(true);
    api.get<ActivityData>(`/analytics/activity?period=${period}`)
      .then((r) => { setActivity(r.data); })
      .catch(() => {/* keep previous */})
      .finally(() => setActLoading(false));
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Server stats: poll every 5 s ─────────────────────────────────────────
  useEffect(() => {
    const fetchServer = () => {
      api.get<ServerData>('/analytics/server')
        .then((r) => setServerStats(r.data))
        .catch(() => {/* keep last value */});
    };
    fetchServer();
    serverTimerRef.current = setInterval(fetchServer, 5_000);
    return () => {
      if (serverTimerRef.current) clearInterval(serverTimerRef.current);
    };
  }, []);

  // ── Activity chart data (recharts format) ─────────────────────────────────
  const chartData = useMemo(
    () =>
      activity
        ? activity.labels.map((label, i) => ({
            label,
            logins:      activity.logins[i]      ?? 0,
            activeUsers: activity.activeUsers[i] ?? 0,
          }))
        : [],
    [activity],
  );

  const xInterval =
    chartData.length <= 12 ? 0 : Math.floor(chartData.length / 8);

  // ── Sorted tenant table ───────────────────────────────────────────────────
  const sortedTenants = useMemo(
    () => [...tenantStats].sort((a, b) => b[sortCol] - a[sortCol]),
    [tenantStats, sortCol],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  if (initLoading) {
    return (
      <div className="page">
        <div className="page-header"><h2 className="page-title">Statistika</h2></div>
        <p className="state-msg">Yuklanmoqda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header"><h2 className="page-title">Statistika</h2></div>
        <p className="state-msg state-msg--error">{error}</p>
      </div>
    );
  }

  const cpuPct   = serverStats?.cpuUsage ?? 0;
  const memUsed  = serverStats?.memoryUsed  ?? 0;
  const memTotal = serverStats?.memoryTotal ?? 1;
  const memPct   = Math.round((memUsed / memTotal) * 100);

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Statistika</h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Server ishlash vaqti: {serverStats ? formatUptime(serverStats.uptime) : '...'}
        </span>
      </div>

      {/* ══ SECTION 1: Overview cards ══════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <StatCard
          label="Jami foydalanuvchilar"
          value={overview?.totalUsers ?? 0}
          color="#2563eb"
          sub="Barcha tenantlar bo'yicha"
        />
        <StatCard
          label="Jami mijozlar"
          value={overview?.totalCustomers ?? 0}
          color="#8b5cf6"
          sub="Ro'yxatdan o'tgan"
        />
        <StatCard
          label="Tenantlar"
          value={overview?.totalTenants ?? 0}
          color="#16a34a"
          sub={`${overview?.activeTenants ?? 0} faol · ${(overview?.totalTenants ?? 0) - (overview?.activeTenants ?? 0)} nofaol`}
        />
        <StatCard
          label="Server uptime"
          value={serverStats ? formatUptime(serverStats.uptime) : '...'}
          color="#f59e0b"
          sub={serverStats ? `${serverStats.requestsPerMinute} so'rov/daqiqa` : ''}
        />
        <StatCard
          label="Oylik daromad (MRR)"
          value={overview ? (overview.monthlyRevenue > 0 ? `${(overview.monthlyRevenue ?? 0).toLocaleString('uz-UZ')} so'm` : "0 so'm") : '...'}
          color="#10b981"
          sub="Faol obunalar"
        />
        <StatCard
          label="Bu oyda yangi"
          value={overview?.newTenantsThisMonth ?? 0}
          color="#06b6d4"
          sub="Yangi tenantlar"
        />
        <StatCard
          label="Bu oyda to'xtatilgan"
          value={overview?.churnedThisMonth ?? 0}
          color="#ef4444"
          sub="Suspended obunalar"
        />
      </div>

      {/* ══ Plan taqsimoti ══════════════════════════════════════════════════ */}
      {overview?.planDistribution && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <SectionTitle>Tarif rejasi taqsimoti</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
            {/* Bar chart */}
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={[
                  { plan: 'Trial',   count: overview.planDistribution.trial,   color: '#94a3b8' },
                  { plan: 'Starter', count: overview.planDistribution.starter, color: '#3b82f6' },
                  { plan: 'Pro',     count: overview.planDistribution.pro,     color: '#8b5cf6' },
                ]}
                margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e2e8f0)" vertical={false} />
                <XAxis dataKey="plan" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${Number(v)} tenant`, 'Soni']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {[
                    { plan: 'Trial',   color: '#94a3b8' },
                    { plan: 'Starter', color: '#3b82f6' },
                    { plan: 'Pro',     color: '#8b5cf6' },
                  ].map((entry) => (
                    <Cell key={entry.plan} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Legend cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[
                { label: 'Trial',   count: overview.planDistribution.trial,   color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
                { label: 'Starter', count: overview.planDistribution.starter, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
                { label: 'Pro',     count: overview.planDistribution.pro,     color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
              ].map(({ label, count, color, bg }) => {
                const total = overview.planDistribution.trial + overview.planDistribution.starter + overview.planDistribution.pro || 1;
                const pct   = Math.round((count / total) * 100);
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 8, background: bg }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '0.83rem', fontWeight: 500 }}>{label}</span>
                    <span style={{ fontWeight: 700, color }}>{count}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 36, textAlign: 'right' }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ MRR + Industry breakdown ════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>

        {/* MRR trend */}
        {mrrTrend.length > 0 && (
          <div className="card">
            <SectionTitle>MRR Trend (12 oy)</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={mrrTrend} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e2e8f0)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(v)}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`${v.toLocaleString('uz-UZ')} so'm`, 'MRR']}
                />
                <Line type="monotone" dataKey="mrr" stroke="#10b981" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Industry breakdown */}
        {industryBreakdown.length > 0 && (
          <div className="card">
            <SectionTitle>Soha bo'yicha tenantlar</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={industryBreakdown.slice(0, 8)}
                layout="vertical"
                margin={{ top: 0, right: 15, left: 0, bottom: 0 }}
              >
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis
                  type="category" dataKey="industry"
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={75}
                  tickFormatter={(v: string) => INDUSTRY_LABEL[v] ?? v}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number, _name: string, props: { payload?: { revenue?: number } }) => [
                    `${v} tenant${props.payload?.revenue ? ` · ${props.payload.revenue.toLocaleString('uz-UZ')} so'm` : ''}`,
                    '',
                  ]}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ══ SECTION 2: Activity chart with period tabs ══════════════════════ */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <SectionTitle>Foydalanuvchi faolligi</SectionTitle>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: 6,
                  border: '1px solid var(--border, #e2e8f0)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: period === p.key ? 700 : 400,
                  background: period === p.key ? 'var(--primary, #2563eb)' : 'transparent',
                  color:      period === p.key ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.15s ease',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {actLoading ? (
          <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Yuklanmoqda...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e2e8f0)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'var(--text-muted, #6b7280)' }}
                axisLine={false}
                tickLine={false}
                interval={xInterval}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-muted, #6b7280)' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--card-bg, #fff)',
                  border: '1px solid var(--border, #e2e8f0)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="logins"
                name="Loginlar"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="activeUsers"
                name="Faol foydalanuvchilar"
                stroke="#16a34a"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ══ SECTION 3: Server load (live) ═══════════════════════════════════ */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <SectionTitle>Server holati</SectionTitle>
          <span style={{
            fontSize: '0.72rem',
            padding: '0.15rem 0.5rem',
            borderRadius: 99,
            background: '#16a34a22',
            color: '#16a34a',
            fontWeight: 600,
          }}>
            ● Jonli · har 5s yangilanadi
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {/* Left: progress bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <ProgressBar
              label="CPU yuklanish"
              value={cpuPct}
              max={100}
              color={barColor(cpuPct)}
            />
            <ProgressBar
              label="RAM ishlatilmoqda"
              value={memUsed}
              max={memTotal}
              unit="MB"
              color={barColor(memPct)}
            />
          </div>

          {/* Right: numeric metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {[
              { label: "So'rov/daqiqa", value: serverStats?.requestsPerMinute ?? 0, color: '#6366f1' },
              { label: 'Faol ulanishlar', value: serverStats?.activeConnections ?? 0, color: '#0ea5e9' },
              { label: 'RAM ishlatilgan', value: `${memUsed} MB`, color: '#8b5cf6' },
              { label: 'Uptime', value: serverStats ? formatUptime(serverStats.uptime) : '...', color: '#f59e0b' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                padding: '0.6rem 0.75rem',
                borderRadius: 8,
                background: color + '11',
                border: `1px solid ${color}33`,
              }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ SECTION 4: Tenant activity table ════════════════════════════════ */}
      <div className="card">
        <SectionTitle>Tenant faolligi</SectionTitle>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nomi</th>
                <th>Soha</th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setSortCol('userCount')}
                >
                  Xodimlar {sortCol === 'userCount' ? '↓' : ''}
                </th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setSortCol('customerCount')}
                >
                  Mijozlar {sortCol === 'customerCount' ? '↓' : ''}
                </th>
                <th>Oxirgi faollik</th>
              </tr>
            </thead>
            <tbody>
              {sortedTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Tenantlar topilmadi
                  </td>
                </tr>
              ) : sortedTenants.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 500 }}>{t.name}</td>
                  <td>
                    {t.industry
                      ? <span className="industry-badge">{INDUSTRY_LABEL[t.industry] ?? t.industry}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>
                    }
                  </td>
                  <td>
                    <span style={{ fontWeight: t.userCount > 0 ? 600 : 400 }}>
                      {t.userCount}
                    </span>
                  </td>
                  <td>{t.customerCount}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {timeAgo(t.lastActive)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
