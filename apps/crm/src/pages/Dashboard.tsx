import { useEffect, useState } from 'react';
import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
  ResponsiveContainer,
} from 'recharts';
import { useAuthStore } from '../stores/auth.store';
import { useTenantStore } from '../stores/tenant.store';
import { getDashboardStats, DashboardStats } from '../api/dashboard.api';

// ── helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) => Number(n).toLocaleString('uz-UZ') + " so'm";
const DAY_UZ = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];
const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b'];

type DateMode = 'today' | 'yesterday' | 'week';

function modeToDate(mode: DateMode): string {
  const d = new Date();
  if (mode === 'yesterday') d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ── sub-components ─────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="dash-loading">
      <div className="dash-spinner" />
    </div>
  );
}

function StatCard({
  label, value, change, accent,
}: { label: string; value: string; change: number; accent: string }) {
  const up = change > 0;
  return (
    <div className="dash-stat-card" style={{ borderTop: `3px solid ${accent}` }}>
      <p className="dash-stat-label">{label}</p>
      <p className="dash-stat-value">{value}</p>
      {change !== 0 && (
        <p className={`dash-stat-change ${up ? 'up' : 'down'}`}>
          {up ? '↑' : '↓'} {Math.abs(change)}%
          <span className="dash-stat-vs"> o'tgan kunga</span>
        </p>
      )}
    </div>
  );
}

function PayTypeLabel({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    cash:   { label: 'Naqd',   cls: 'badge--active' },
    card:   { label: 'Karta',  cls: 'badge--warning' },
    credit: { label: 'Nasiya', cls: 'badge--inactive' },
  };
  const { label, cls } = map[type] ?? { label: type, cls: 'badge--active' };
  return <span className={`badge ${cls}`}>{label}</span>;
}

// ── main ───────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const user     = useAuthStore((s) => s.user);
  const tenantId = useTenantStore((s) => s.tenantId);

  const [stats,    setStats]    = useState<DashboardStats | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [dateMode, setDateMode] = useState<DateMode>('today');

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    setError('');
    getDashboardStats(tenantId, modeToDate(dateMode))
      .then(setStats)
      .catch(() => setError("Ma'lumot yuklanmadi. Server yoki tarmoqni tekshiring."))
      .finally(() => setLoading(false));
  }, [tenantId, dateMode]);

  // ── chart data ────────────────────────────────────────────────────────────
  const chartData = (stats?.weeklyChart ?? []).map((d) => ({
    kun:     DAY_UZ[new Date(d.date).getDay()],
    tushum:  d.revenue,
    sotuvlar: d.salesCount,
  }));

  const pieData = stats
    ? [
        { name: 'Naqd',   value: stats.paymentBreakdown.cash.amount   },
        { name: 'Karta',  value: stats.paymentBreakdown.card.amount   },
        { name: 'Nasiya', value: stats.paymentBreakdown.credit.amount },
      ].filter((d) => d.value > 0)
    : [];

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="page">

      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-subtitle">Xush kelibsiz, {user?.email}</p>
        </div>
        <div className="dash-date-tabs">
          {(['today', 'yesterday', 'week'] as DateMode[]).map((m) => (
            <button
              key={m}
              className={'dash-date-tab' + (dateMode === m ? ' dash-date-tab--active' : '')}
              onClick={() => setDateMode(m)}
            >
              {m === 'today' ? 'Bugun' : m === 'yesterday' ? 'Kecha' : 'Shu hafta'}
            </button>
          ))}
        </div>
      </div>

      {/* Loading / Error */}
      {loading && <Spinner />}
      {!loading && error && <p className="dash-error">{error}</p>}

      {!loading && !error && stats && (
        <>
          {/* ── 1. Stat cards (2×2) ─────────────────────────────────────── */}
          <div className="dash-cards">
            <StatCard
              label="Bugungi tushum"
              value={fmt(stats.cards.todayRevenue)}
              change={stats.cards.todayRevenueChange}
              accent="var(--primary)"
            />
            <StatCard
              label="Yalpi foyda"
              value={fmt(stats.cards.grossProfit)}
              change={stats.cards.grossProfitChange}
              accent="#10b981"
            />
            <StatCard
              label="Naqd tushum"
              value={fmt(stats.cards.cashTotal)}
              change={stats.cards.cashChange}
              accent="#8b5cf6"
            />
            <StatCard
              label="Qarzga savdo"
              value={fmt(stats.cards.debtTotal)}
              change={stats.cards.debtChange}
              accent="#f59e0b"
            />
          </div>

          {/* ── 2. Charts ───────────────────────────────────────────────── */}
          <div className="dash-charts">

            {/* Haftalik ComposedChart */}
            <div className="dash-chart-main">
              <p className="dash-section-title">Haftalik tushum</p>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="kun"
                    tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                    tickFormatter={(v) => v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(0) + 'k' : String(v)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
                    formatter={(v: unknown, name: unknown) => name === 'Tushum' ? fmt(v as number) : [(v as number) + ' ta', name as string]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="left" dataKey="tushum" name="Tushum" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Line yAxisId="right" type="monotone" dataKey="sotuvlar" name="Sotuvlar" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* PieChart */}
            <div className="dash-chart-pie">
              <p className="dash-section-title">To'lov taqsimoti</p>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="42%"
                      outerRadius={80}
                      labelLine={false}
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        (percent ?? 0) > 0.05 ? `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%` : ''
                      }
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
                      formatter={(v: unknown) => fmt(v as number)}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="dash-empty">Bugun sotuvlar yo'q</div>
              )}
            </div>
          </div>

          {/* ── 3. Tables ───────────────────────────────────────────────── */}
          <div className="dash-tables">

            {/* So'nggi sotuvlar */}
            <div className="dash-table-card">
              <p className="dash-section-title" style={{ padding: '1rem 1rem 0.6rem' }}>
                So'nggi sotuvlar
              </p>
              <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Vaqt</th>
                      <th>Mijoz</th>
                      <th>To'lov</th>
                      <th>Summa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentSales.map((s) => (
                      <tr key={s.id}>
                        <td className="time-badge">
                          {new Date(s.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.customerName}
                        </td>
                        <td><PayTypeLabel type={s.paymentType} /></td>
                        <td className="amount-cell">{fmt(s.totalAmount)}</td>
                      </tr>
                    ))}
                    {stats.recentSales.length === 0 && (
                      <tr><td colSpan={4} className="dash-empty-row">Ma'lumot yo'q</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Eng ko'p sotilgan */}
            <div className="dash-table-card">
              <p className="dash-section-title" style={{ padding: '1rem 1rem 0.6rem' }}>
                Eng ko'p sotilgan
              </p>
              <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mahsulot</th>
                      <th>Miqdor</th>
                      <th>Foyda</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.bestSelling.map((b) => (
                      <tr key={b.productId}>
                        <td className="product-name" style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {b.productName}
                        </td>
                        <td>{b.totalQty} {b.unit}</td>
                        <td className="amount-cell" style={{ color: '#10b981' }}>{fmt(b.totalProfit)}</td>
                      </tr>
                    ))}
                    {stats.bestSelling.length === 0 && (
                      <tr><td colSpan={3} className="dash-empty-row">Ma'lumot yo'q</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Kam qoldiq */}
            <div className="dash-table-card">
              <p className="dash-section-title" style={{ padding: '1rem 1rem 0.6rem' }}>
                Kam qoldiq
              </p>
              <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mahsulot</th>
                      <th>Qoldiq</th>
                      <th>Holat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.lowStock.map((p) => (
                      <tr key={p.id}>
                        <td className="product-name" style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </td>
                        <td>{p.quantity}/{p.minStock} {p.unit}</td>
                        <td>
                          <span className={`badge ${p.status === 'critical' ? 'badge--inactive' : 'badge--warning'}`}>
                            {p.status === 'critical' ? 'Kritik' : 'Kam'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {stats.lowStock.length === 0 && (
                      <tr><td colSpan={3} className="dash-empty-row">Barcha mahsulotlar yetarli</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
