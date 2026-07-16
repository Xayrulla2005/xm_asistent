import { useCallback, useEffect, useState } from 'react';
import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
  ResponsiveContainer,
} from 'recharts';
import { useAuthStore } from '../stores/auth.store';
import { useTenantStore } from '../stores/tenant.store';
import { useConfigStore } from '../stores/config.store';
import { getDashboardStats, getIndustryDashboardStats, DashboardStats } from '../api/dashboard.api';

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

function detectIndustry(industry?: string): string {
  if (!industry) return 'retail';
  const i = industry.toLowerCase();
  if (i.includes('restaurant') || i.includes('cafe') || i.includes('food')) return 'restaurant';
  if (i.includes('clinic') || i.includes('hospital') || i.includes('medical')) return 'clinic';
  if (i.includes('education') || i.includes('school') || i.includes('course')) return 'education';
  if (i.includes('gym') || i.includes('sport') || i.includes('fitness')) return 'fitness';
  if (i.includes('beauty') || i.includes('salon') || i.includes('nail')) return 'beauty';
  if (i.includes('auto') || i.includes('car') || i.includes('servis')) return 'auto';
  return 'retail';
}

// ── shared components ──────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="dash-loading">
      <div className="dash-spinner" />
    </div>
  );
}

function StatCard({ label, value, change, accent, sub }: { label: string; value: string; change?: number; accent: string; sub?: string }) {
  const up = (change ?? 0) > 0;
  return (
    <div className="dash-stat-card" style={{ borderTop: `3px solid ${accent}` }}>
      <p className="dash-stat-label">{label}</p>
      <p className="dash-stat-value">{value}</p>
      {sub && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0' }}>{sub}</p>}
      {change !== undefined && change !== 0 && (
        <p className={`dash-stat-change ${up ? 'up' : 'down'}`}>
          {up ? '↑' : '↓'} {Math.abs(change)}%
          <span className="dash-stat-vs"> o'tgan kunga</span>
        </p>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="dash-section-title" style={{ padding: '1rem 1rem 0.6rem' }}>{children}</p>;
}

function EmptyRow({ cols }: { cols: number }) {
  return <tr><td colSpan={cols} className="dash-empty-row">Ma'lumot yo'q</td></tr>;
}

function WeekBar({ data, valueKey, label, color = 'var(--primary)' }: {
  data: { date: string; [k: string]: number | string }[];
  valueKey: string;
  label: string;
  color?: string;
}) {
  const chartData = data.map((d) => ({ kun: DAY_UZ[new Date(d.date + 'T00:00:00').getDay()], val: d[valueKey] }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="kun" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
        <Bar dataKey="val" name={label} fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── RETAIL DASHBOARD ───────────────────────────────────────────────────────
function RetailDashboard({ stats }: { stats: DashboardStats }) {
  const chartData = (stats.weeklyChart ?? []).map((d) => ({
    kun:     DAY_UZ[new Date(d.date + 'T00:00:00').getDay()],
    tushum:  d.revenue,
    sotuvlar: d.salesCount,
  }));
  const pieData = [
    { name: 'Naqd',   value: stats.paymentBreakdown.cash.amount   },
    { name: 'Karta',  value: stats.paymentBreakdown.card.amount   },
    { name: 'Nasiya', value: stats.paymentBreakdown.credit.amount },
  ].filter((d) => d.value > 0);

  return (
    <>
      <div className="dash-cards">
        <StatCard label="Bugungi tushum"  value={fmt(stats.cards.todayRevenue)} change={stats.cards.todayRevenueChange} accent="var(--primary)" />
        <StatCard label="Yalpi foyda"     value={fmt(stats.cards.grossProfit)}  change={stats.cards.grossProfitChange}  accent="#10b981" />
        <StatCard label="Naqd tushum"     value={fmt(stats.cards.cashTotal)}    change={stats.cards.cashChange}         accent="#8b5cf6" />
        <StatCard label="Qarzga savdo"    value={fmt(stats.cards.debtTotal)}    change={stats.cards.debtChange}         accent="#f59e0b" />
      </div>

      <div className="dash-charts">
        <div className="dash-chart-main">
          <p className="dash-section-title">Haftalik tushum</p>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="kun" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                tickFormatter={(v) => v >= 1_000_000 ? (v/1_000_000).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'k' : String(v)}
                axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
                formatter={(v: unknown, name: unknown) => name === 'Tushum' ? fmt(v as number) : [(v as number)+' ta', name as string]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="tushum" name="Tushum" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Line yAxisId="right" type="monotone" dataKey="sotuvlar" name="Sotuvlar" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="dash-chart-pie">
          <p className="dash-section-title">To'lov taqsimoti</p>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="42%" outerRadius={80} labelLine={false}
                  label={({ name, percent }: { name?: string; percent?: number }) => (percent ?? 0) > 0.05 ? `${name} ${((percent ?? 0)*100).toFixed(0)}%` : ''}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} formatter={(v: unknown) => fmt(v as number)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="dash-empty">Bugun sotuvlar yo'q</div>}
        </div>
      </div>

      <div className="dash-tables">
        <div className="dash-table-card">
          <SectionTitle>So'nggi sotuvlar</SectionTitle>
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead><tr><th>Vaqt</th><th>Mijoz</th><th>To'lov</th><th>Summa</th></tr></thead>
              <tbody>
                {stats.recentSales.map((s) => (
                  <tr key={s.id}>
                    <td className="time-badge">{new Date(s.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.customerName}</td>
                    <td><span className="badge badge--active">{s.paymentType}</span></td>
                    <td className="amount-cell">{fmt(s.totalAmount)}</td>
                  </tr>
                ))}
                {stats.recentSales.length === 0 && <EmptyRow cols={4} />}
              </tbody>
            </table>
          </div>
        </div>
        <div className="dash-table-card">
          <SectionTitle>Eng ko'p sotilgan</SectionTitle>
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead><tr><th>Mahsulot</th><th>Miqdor</th><th>Foyda</th></tr></thead>
              <tbody>
                {stats.bestSelling.map((b) => (
                  <tr key={b.productId}>
                    <td style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.productName}</td>
                    <td>{b.totalQty} {b.unit}</td>
                    <td className="amount-cell" style={{ color: '#10b981' }}>{fmt(b.totalProfit)}</td>
                  </tr>
                ))}
                {stats.bestSelling.length === 0 && <EmptyRow cols={3} />}
              </tbody>
            </table>
          </div>
        </div>
        <div className="dash-table-card">
          <SectionTitle>Kam qoldiq</SectionTitle>
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead><tr><th>Mahsulot</th><th>Qoldiq</th><th>Holat</th></tr></thead>
              <tbody>
                {stats.lowStock.map((p) => (
                  <tr key={p.id}>
                    <td style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</td>
                    <td>{p.quantity}/{p.minStock} {p.unit}</td>
                    <td><span className={`badge ${p.status === 'critical' ? 'badge--inactive' : 'badge--warning'}`}>{p.status === 'critical' ? 'Kritik' : 'Kam'}</span></td>
                  </tr>
                ))}
                {stats.lowStock.length === 0 && <EmptyRow cols={3} />}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// ── RESTAURANT DASHBOARD ───────────────────────────────────────────────────
function RestaurantDashboard({ data }: { data: Record<string, unknown> }) {
  const todayOrders  = (data.todayOrders  as number) ?? 0;
  const todayRevenue = (data.todayRevenue as number) ?? 0;
  const pending      = (data.pending      as number) ?? 0;
  const cooking      = (data.cooking      as number) ?? 0;
  const weekly       = (data.weeklyChart  as { date: string; orderCount: number; revenue: number }[]) ?? [];
  const topDishes    = (data.topDishes    as { name: string; totalQty: number; totalRevenue: number }[]) ?? [];
  const recent       = (data.recentOrders as { id: string; tableNumber: string | null; customerName: string | null; total: number; status: string; createdAt: string }[]) ?? [];

  const STATUS_CLR: Record<string, string> = { pending: '#f59e0b', cooking: '#6366f1', ready: '#10b981', paid: '#64748b', cancelled: '#ef4444' };
  const STATUS_LBL: Record<string, string> = { pending: 'Kutilmoqda', cooking: 'Pishirilmoqda', ready: 'Tayyor', paid: "To'langan", cancelled: 'Bekor' };

  return (
    <>
      <div className="dash-cards">
        <StatCard label="Bugungi buyurtmalar" value={String(todayOrders)} accent="var(--primary)" />
        <StatCard label="Bugungi tushum"       value={fmt(todayRevenue)}  accent="#10b981" />
        <StatCard label="Kutilmoqda"           value={String(pending)}    accent="#f59e0b" sub="Diqqat talab qiladi" />
        <StatCard label="Pishirilmoqda"        value={String(cooking)}    accent="#6366f1" />
      </div>

      <div className="dash-charts">
        <div className="dash-chart-main">
          <p className="dash-section-title">Haftalik buyurtmalar</p>
          <WeekBar data={weekly as { date: string; [k: string]: number | string }[]} valueKey="orderCount" label="Buyurtmalar" color="var(--primary)" />
        </div>
        <div className="dash-chart-pie">
          <p className="dash-section-title">Eng mashhur taomlar</p>
          <div style={{ padding: '0 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {topDishes.slice(0, 6).map((d, i) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.84rem' }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700, flexShrink: 0 }}>{i+1}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                <span style={{ fontWeight: 600, color: 'var(--primary)', flexShrink: 0 }}>{d.totalQty} ta</span>
              </div>
            ))}
            {topDishes.length === 0 && <p className="dash-empty">Ma'lumot yo'q</p>}
          </div>
        </div>
      </div>

      <div className="dash-tables">
        <div className="dash-table-card" style={{ gridColumn: '1 / -1' }}>
          <SectionTitle>So'nggi buyurtmalar</SectionTitle>
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead><tr><th>Stol</th><th>Mijoz</th><th>Summa</th><th>Holat</th><th>Vaqt</th></tr></thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td>{o.tableNumber ? `Stol ${o.tableNumber}` : '—'}</td>
                    <td>{o.customerName ?? '—'}</td>
                    <td className="amount-cell">{fmt(Number(o.total))}</td>
                    <td><span style={{ fontSize: '0.75rem', fontWeight: 600, color: STATUS_CLR[o.status] ?? '#64748b', background: (STATUS_CLR[o.status] ?? '#64748b') + '18', padding: '0.2rem 0.6rem', borderRadius: 12 }}>{STATUS_LBL[o.status] ?? o.status}</span></td>
                    <td className="time-badge">{new Date(o.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
                {recent.length === 0 && <EmptyRow cols={5} />}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// ── CLINIC DASHBOARD ───────────────────────────────────────────────────────
function ClinicDashboard({ data }: { data: Record<string, unknown> }) {
  const todayCount     = (data.todayCount     as number) ?? 0;
  const scheduled      = (data.scheduled      as number) ?? 0;
  const completedToday = (data.completedToday as number) ?? 0;
  const todayFee       = (data.todayFee       as number) ?? 0;
  const weekly         = (data.weeklyChart    as { date: string; count: number }[]) ?? [];
  const recent         = (data.recentAppointments as { id: string; patientName: string | null; doctorName: string | null; date: string; time: string; status: string; fee: number }[]) ?? [];

  const ST_CLR: Record<string, string> = { scheduled: '#6366f1', completed: '#10b981', cancelled: '#ef4444', no_show: '#94a3b8', in_progress: '#f59e0b' };
  const ST_LBL: Record<string, string> = { scheduled: 'Rejalashtirilgan', completed: 'Tugallangan', cancelled: 'Bekor', no_show: 'Kelmadi', in_progress: 'Jarayonda' };

  return (
    <>
      <div className="dash-cards">
        <StatCard label="Bugungi qabullar"  value={String(todayCount)}     accent="var(--primary)" />
        <StatCard label="Navbatda"          value={String(scheduled)}      accent="#6366f1" />
        <StatCard label="Bugun yakunlandi" value={String(completedToday)} accent="#10b981" />
        <StatCard label="Bugungi daromad"   value={fmt(todayFee)}          accent="#f59e0b" />
      </div>

      <div className="dash-charts">
        <div className="dash-chart-main">
          <p className="dash-section-title">Haftalik qabullar</p>
          <WeekBar data={weekly as { date: string; [k: string]: number | string }[]} valueKey="count" label="Qabullar" color="var(--primary)" />
        </div>
        <div className="dash-chart-pie" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p className="dash-section-title">Bugun ko'rsatkichlari</p>
          <div style={{ padding: '0 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {[
              { label: 'Jami belgilangan', value: todayCount,     color: 'var(--primary)' },
              { label: 'Navbatda',         value: scheduled,      color: '#6366f1' },
              { label: 'Yakunlandi',       value: completedToday, color: '#10b981' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontWeight: 700, color }}>{value}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, background: color, width: todayCount > 0 ? `${Math.round(value/todayCount*100)}%` : '0%', transition: 'width 0.6s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dash-tables">
        <div className="dash-table-card" style={{ gridColumn: '1 / -1' }}>
          <SectionTitle>So'nggi qabullar</SectionTitle>
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead><tr><th>Bemor</th><th>Shifokor</th><th>Sana</th><th>Vaqt</th><th>Holat</th><th>To'lov</th></tr></thead>
              <tbody>
                {recent.map((a) => (
                  <tr key={a.id}>
                    <td>{a.patientName ?? '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{a.doctorName ?? '—'}</td>
                    <td style={{ fontSize: '0.82rem' }}>{a.date}</td>
                    <td className="time-badge">{a.time}</td>
                    <td><span style={{ fontSize: '0.75rem', fontWeight: 600, color: ST_CLR[a.status] ?? '#64748b', background: (ST_CLR[a.status] ?? '#64748b') + '18', padding: '0.2rem 0.6rem', borderRadius: 12 }}>{ST_LBL[a.status] ?? a.status}</span></td>
                    <td className="amount-cell">{Number(a.fee) > 0 ? fmt(Number(a.fee)) : '—'}</td>
                  </tr>
                ))}
                {recent.length === 0 && <EmptyRow cols={6} />}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// ── EDUCATION DASHBOARD ────────────────────────────────────────────────────
function EducationDashboard({ data }: { data: Record<string, unknown> }) {
  const totalActive   = (data.totalActive   as number) ?? 0;
  const totalExpected = (data.totalExpected as number) ?? 0;
  const totalPaid     = (data.totalPaid     as number) ?? 0;
  const paidCount     = (data.paidCount     as number) ?? 0;
  const pendingCount  = (data.pendingCount  as number) ?? 0;
  const partialCount  = (data.partialCount  as number) ?? 0;
  const weekly        = (data.weeklyNewStudents as { date: string; count: number }[]) ?? [];
  const recent        = (data.recentPayments as { id: string; studentName: string; courseName: string; month: string; amount: number; paidAmount: number; status: string }[]) ?? [];

  const collectRate = totalExpected > 0 ? Math.round(totalPaid / totalExpected * 100) : 0;
  const ST_CLR: Record<string, string> = { paid: '#10b981', pending: '#f59e0b', partial: '#6366f1', overdue: '#ef4444' };
  const ST_LBL: Record<string, string> = { paid: "To'langan", pending: 'Kutilmoqda', partial: "Qisman to'langan", overdue: 'Muddati o\'tgan' };

  return (
    <>
      <div className="dash-cards">
        <StatCard label="Faol talabalar"   value={String(totalActive)}   accent="var(--primary)" />
        <StatCard label="Oylik to'lov kutilmoqda" value={String(pendingCount + partialCount)} accent="#f59e0b" sub="joriy oy" />
        <StatCard label="To'lov yig'ish"   value={`${collectRate}%`}     accent="#10b981" sub={`${fmt(totalPaid)} / ${fmt(totalExpected)}`} />
        <StatCard label="To'langan"        value={String(paidCount)}      accent="#10b981" />
      </div>

      <div className="dash-charts">
        <div className="dash-chart-main">
          <p className="dash-section-title">Yangi talabalar (haftalik)</p>
          <WeekBar data={weekly as { date: string; [k: string]: number | string }[]} valueKey="count" label="Yangi talabalar" color="var(--primary)" />
        </div>
        <div className="dash-chart-pie" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p className="dash-section-title">Joriy oy to'lovlari</p>
          <div style={{ padding: '0 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Yig'ish darajasi</span>
                <span style={{ fontWeight: 700, color: collectRate >= 80 ? '#10b981' : collectRate >= 50 ? '#f59e0b' : '#ef4444' }}>{collectRate}%</span>
              </div>
              <div style={{ height: 10, borderRadius: 5, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 5, background: collectRate >= 80 ? '#10b981' : collectRate >= 50 ? '#f59e0b' : '#ef4444', width: `${collectRate}%`, transition: 'width 0.6s' }} />
              </div>
            </div>
            {[
              { label: "To'langan",  value: paidCount,              color: '#10b981' },
              { label: 'Qisman',     value: partialCount,           color: '#6366f1' },
              { label: 'Kutilmoqda', value: pendingCount,           color: '#f59e0b' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  {label}
                </span>
                <span style={{ fontWeight: 700, color }}>{value} ta</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dash-tables">
        <div className="dash-table-card" style={{ gridColumn: '1 / -1' }}>
          <SectionTitle>So'nggi to'lovlar</SectionTitle>
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead><tr><th>Talaba</th><th>Kurs</th><th>Oy</th><th>Kerak</th><th>To'landi</th><th>Holat</th></tr></thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id}>
                    <td>{p.studentName}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{p.courseName || '—'}</td>
                    <td style={{ fontSize: '0.82rem' }}>{p.month}</td>
                    <td className="amount-cell">{fmt(Number(p.amount))}</td>
                    <td className="amount-cell" style={{ color: '#10b981' }}>{fmt(Number(p.paidAmount))}</td>
                    <td><span style={{ fontSize: '0.75rem', fontWeight: 600, color: ST_CLR[p.status] ?? '#64748b', background: (ST_CLR[p.status] ?? '#64748b') + '18', padding: '0.2rem 0.6rem', borderRadius: 12 }}>{ST_LBL[p.status] ?? p.status}</span></td>
                  </tr>
                ))}
                {recent.length === 0 && <EmptyRow cols={6} />}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// ── GYM / FITNESS DASHBOARD ───────────────────────────────────────────────
function GymDashboard({ data }: { data: Record<string, unknown> }) {
  const totalActive    = (data.totalActive    as number) ?? 0;
  const totalExpired   = (data.totalExpired   as number) ?? 0;
  const expiring7      = (data.expiringIn7Days as number) ?? 0;
  const todayCheckins  = (data.todayCheckins  as number) ?? 0;
  const newThisMonth   = (data.newThisMonth   as number) ?? 0;
  const weekly         = (data.weeklyCheckins as { date: string; count: number }[]) ?? [];
  const recentCheckins = (data.recentCheckins as { id: string; memberName: string; checkedAt: string }[]) ?? [];

  return (
    <>
      <div className="dash-cards">
        <StatCard label="Faol a'zolar"       value={String(totalActive)}  accent="var(--primary)" />
        <StatCard label="Bugun kirishdi"      value={String(todayCheckins)} accent="#10b981" />
        <StatCard label="7 kunda muddati tugaydi" value={String(expiring7)}   accent="#f59e0b" sub={expiring7 > 0 ? 'Ogohlantiring!' : 'Hammasi yaxshi'} />
        <StatCard label="Bu oy yangi a'zolar" value={String(newThisMonth)} accent="#6366f1" />
      </div>

      {expiring7 > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.84rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <strong>{expiring7} ta a'zo</strong> obunasi keyingi 7 kun ichida tugaydi. Ularni xabardor qiling.
        </div>
      )}

      <div className="dash-charts">
        <div className="dash-chart-main">
          <p className="dash-section-title">Haftalik kirish soni</p>
          <WeekBar data={weekly as { date: string; [k: string]: number | string }[]} valueKey="count" label="Kirishlar" color="var(--primary)" />
        </div>
        <div className="dash-chart-pie" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p className="dash-section-title">A'zolar holati</p>
          <div style={{ padding: '0 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {[
              { label: 'Faol',             value: totalActive,  color: '#10b981' },
              { label: 'Muddati tugagan',  value: totalExpired, color: '#ef4444' },
              { label: 'Tez tugaydi (7d)', value: expiring7,    color: '#f59e0b' },
            ].map(({ label, value, color }) => {
              const total = totalActive + totalExpired || 1;
              return (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{ fontWeight: 700, color }}>{value}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: color, width: `${Math.round(value/total*100)}%`, transition: 'width 0.6s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="dash-tables">
        <div className="dash-table-card" style={{ gridColumn: '1 / -1' }}>
          <SectionTitle>Bugungi kirishlar</SectionTitle>
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead><tr><th>#</th><th>A'zo</th><th>Vaqt</th></tr></thead>
              <tbody>
                {recentCheckins.map((c, i) => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{i + 1}</td>
                    <td><strong>{c.memberName}</strong></td>
                    <td className="time-badge">{new Date(c.checkedAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
                {recentCheckins.length === 0 && <EmptyRow cols={3} />}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// ── BEAUTY / SALON DASHBOARD ─────────────────────────────────────────────
function BeautyDashboard({ data }: { data: Record<string, unknown> }) {
  const todayCount     = (data.todayCount     as number) ?? 0;
  const scheduled      = (data.scheduled      as number) ?? 0;
  const inProgress     = (data.inProgress     as number) ?? 0;
  const completedToday = (data.completedToday as number) ?? 0;
  const todayFee       = (data.todayFee       as number) ?? 0;
  const weekly         = (data.weeklyChart    as { date: string; count: number }[]) ?? [];
  const topMasters     = (data.topMasters     as { name: string; count: number; revenue: number }[]) ?? [];
  const topServices    = (data.topServices    as { name: string; count: number; revenue: number }[]) ?? [];
  const recent         = (data.recent         as { id: string; clientName: string; masterName: string | null; serviceName: string | null; date: string; timeSlot: string; status: string; fee: number }[]) ?? [];

  const ST_CLR: Record<string, string> = { scheduled: '#6366f1', in_progress: '#f59e0b', completed: '#10b981', cancelled: '#ef4444', no_show: '#94a3b8' };
  const ST_LBL: Record<string, string> = { scheduled: 'Navbatda', in_progress: 'Jarayonda', completed: 'Tugallandi', cancelled: 'Bekor', no_show: 'Kelmadi' };

  return (
    <>
      <div className="dash-cards">
        <StatCard label="Bugungi qabullar"   value={String(todayCount)}     accent="var(--primary)" />
        <StatCard label="Navbatda"            value={String(scheduled)}      accent="#6366f1" />
        <StatCard label="Jarayonda"           value={String(inProgress)}     accent="#f59e0b" />
        <StatCard label="Bugungi daromad"     value={fmt(todayFee)}          accent="#10b981" sub={`${completedToday} ta tugallandi`} />
      </div>

      <div className="dash-charts">
        <div className="dash-chart-main">
          <p className="dash-section-title">Haftalik qabullar</p>
          <WeekBar data={weekly as { date: string; [k: string]: number | string }[]} valueKey="count" label="Qabullar" color="var(--primary)" />
        </div>
        <div className="dash-chart-pie">
          <p className="dash-section-title">Top masterlar (hafta)</p>
          <div style={{ padding: '0 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {topMasters.map((m, i) => (
              <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem' }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.67rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                <span style={{ fontWeight: 600, color: 'var(--primary)', flexShrink: 0 }}>{m.count} ta</span>
              </div>
            ))}
            {topMasters.length === 0 && <p className="dash-empty">Bu hafta qabul yo'q</p>}
          </div>
          <p className="dash-section-title" style={{ padding: '0 1rem', marginTop: '0.5rem' }}>Top xizmatlar</p>
          <div style={{ padding: '0 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {topServices.map((s) => (
              <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{s.name}</span>
                <span style={{ fontWeight: 700, color: '#10b981', flexShrink: 0, marginLeft: '0.5rem' }}>{fmt(s.revenue)}</span>
              </div>
            ))}
            {topServices.length === 0 && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Ma'lumot yo'q</p>}
          </div>
        </div>
      </div>

      <div className="dash-tables">
        <div className="dash-table-card" style={{ gridColumn: '1 / -1' }}>
          <SectionTitle>So'nggi qabullar</SectionTitle>
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead><tr><th>Mijoz</th><th>Master</th><th>Xizmat</th><th>Vaqt</th><th>Holat</th><th>Narx</th></tr></thead>
              <tbody>
                {recent.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.clientName}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{a.masterName ?? '—'}</td>
                    <td style={{ fontSize: '0.82rem' }}>{a.serviceName ?? '—'}</td>
                    <td className="time-badge">{a.date} {a.timeSlot}</td>
                    <td><span style={{ fontSize: '0.74rem', fontWeight: 600, color: ST_CLR[a.status] ?? '#64748b', background: (ST_CLR[a.status] ?? '#64748b') + '18', padding: '0.2rem 0.55rem', borderRadius: 12 }}>{ST_LBL[a.status] ?? a.status}</span></td>
                    <td className="amount-cell">{Number(a.fee) > 0 ? fmt(Number(a.fee)) : '—'}</td>
                  </tr>
                ))}
                {recent.length === 0 && <EmptyRow cols={6} />}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// ── AUTO SERVIS DASHBOARD ─────────────────────────────────────────────────
function AutoDashboard({ data }: { data: Record<string, unknown> }) {
  const active       = (data.active       as number) ?? 0;
  const received     = (data.received     as number) ?? 0;
  const diagnosing   = (data.diagnosing   as number) ?? 0;
  const inProgress   = (data.inProgress   as number) ?? 0;
  const ready        = (data.ready        as number) ?? 0;
  const totalToday   = (data.totalToday   as number) ?? 0;
  const weekRevenue  = (data.weekRevenue  as number) ?? 0;
  const weeklyRev    = (data.weeklyRevenue as { date: string; revenue: number }[]) ?? [];
  const topWorkItems = (data.topWorkItems  as { name: string; count: number }[]) ?? [];
  const recent       = (data.recent        as { id: string; vehicleInfo: string | null; plateNumber: string | null; customerName: string; status: string; totalCost: number; createdAt: string }[]) ?? [];

  const ST_CLR: Record<string, string> = { received: '#64748b', diagnosing: '#6366f1', in_progress: '#f59e0b', ready: '#10b981', delivered: '#94a3b8' };
  const ST_LBL: Record<string, string> = { received: 'Qabul', diagnosing: 'Diagnostika', in_progress: 'Tamirlashda', ready: 'Tayyor', delivered: 'Topshirildi' };

  return (
    <>
      <div className="dash-cards">
        <StatCard label="Bugun qabul qilindi" value={String(totalToday)} accent="var(--primary)" />
        <StatCard label="Faol buyurtmalar"    value={String(active)}     accent="#6366f1" />
        <StatCard label="Tayyor / kutmoqda"   value={String(ready)}      accent="#10b981" sub={ready > 0 ? 'Mijozni chaqiring!' : 'Hammasi topshirilgan'} />
        <StatCard label="Haftalik tushum"     value={fmt(weekRevenue)}   accent="#f59e0b" />
      </div>

      {/* Kanban status pipeline */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.65rem', marginBottom: '1rem' }}>
        {[
          { label: 'Qabul',       count: received,   color: '#64748b' },
          { label: 'Diagnostika', count: diagnosing,  color: '#6366f1' },
          { label: 'Tamirlashda', count: inProgress,  color: '#f59e0b' },
          { label: 'Tayyor',      count: ready,       color: '#10b981' },
        ].map(({ label, count, color }) => (
          <div key={label} style={{ background: 'var(--card-bg)', border: `1px solid ${color}30`, borderTop: `3px solid ${color}`, borderRadius: 10, padding: '0.75rem 1rem', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
            <p style={{ margin: '0.3rem 0 0', fontSize: '1.8rem', fontWeight: 800, color }}>{count}</p>
          </div>
        ))}
      </div>

      <div className="dash-charts">
        <div className="dash-chart-main">
          <p className="dash-section-title">Haftalik tushum</p>
          <WeekBar data={weeklyRev as { date: string; [k: string]: number | string }[]} valueKey="revenue" label="Tushum" color="var(--primary)" />
        </div>
        <div className="dash-chart-pie">
          <p className="dash-section-title">Eng ko'p bajarilgan ishlar</p>
          <div style={{ padding: '0 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {topWorkItems.map((w, i) => (
              <div key={w.name} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem' }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.67rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</span>
                <span style={{ fontWeight: 600, flexShrink: 0, color: 'var(--text-muted)', fontSize: '0.78rem' }}>{w.count} ta</span>
              </div>
            ))}
            {topWorkItems.length === 0 && <p className="dash-empty">Bu hafta buyurtma yo'q</p>}
          </div>
        </div>
      </div>

      <div className="dash-tables">
        <div className="dash-table-card" style={{ gridColumn: '1 / -1' }}>
          <SectionTitle>So'nggi buyurtmalar</SectionTitle>
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead><tr><th>Avtomobil</th><th>Mijoz</th><th>Holat</th><th>Summa</th><th>Sana</th></tr></thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <strong style={{ fontSize: '0.84rem' }}>{o.vehicleInfo ?? 'Avtomobil'}</strong>
                        {o.plateNumber && <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', background: 'var(--bg)', padding: '0.1rem 0.4rem', borderRadius: 4, border: '1px solid var(--border)' }}>{o.plateNumber}</span>}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, fontSize: '0.84rem' }}>{o.customerName}</td>
                    <td><span style={{ fontSize: '0.74rem', fontWeight: 600, color: ST_CLR[o.status] ?? '#64748b', background: (ST_CLR[o.status] ?? '#64748b') + '18', padding: '0.2rem 0.55rem', borderRadius: 12 }}>{ST_LBL[o.status] ?? o.status}</span></td>
                    <td className="amount-cell">{Number(o.totalCost) > 0 ? fmt(Number(o.totalCost)) : '—'}</td>
                    <td className="time-badge">{new Date(o.createdAt).toLocaleDateString('uz-UZ')}</td>
                  </tr>
                ))}
                {recent.length === 0 && <EmptyRow cols={5} />}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// ── GENERIC FALLBACK DASHBOARD ─────────────────────────────────────────────
function GenericDashboard({ industryName }: { industryName: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
      <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Dashboard</p>
      <p style={{ fontSize: '0.9rem' }}>{industryName} uchun batafsil statistika tez orada qo'shiladi.</p>
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const user     = useAuthStore((s) => s.user);
  const tenantId = useTenantStore((s) => s.tenantId);
  const config   = useConfigStore((s) => s.config);

  const industry = detectIndustry(config?.industry);
  const isRetail = industry === 'retail';

  const [retailStats, setRetailStats]   = useState<DashboardStats | null>(null);
  const [industryData, setIndustryData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error,   setError]             = useState('');
  const [dateMode, setDateMode]         = useState<DateMode>('today');

  const load = useCallback(() => {
    if (!tenantId) return;
    setLoading(true);
    setError('');

    const promise = isRetail
      ? getDashboardStats(tenantId, modeToDate(dateMode)).then((d) => { setRetailStats(d); setIndustryData(null); })
      : getIndustryDashboardStats(industry).then((d) => { setIndustryData(d as Record<string, unknown>); setRetailStats(null); });

    promise
      .catch(() => setError("Ma'lumot yuklanmadi. Server yoki tarmoqni tekshiring."))
      .finally(() => setLoading(false));
  }, [tenantId, industry, isRetail, dateMode]);

  useEffect(() => { load(); }, [load]);

  const INDUSTRY_NAMES: Record<string, string> = {
    retail: 'Savdo', restaurant: 'Restoran', clinic: 'Klinika',
    education: "Ta'lim", fitness: 'Fitnes', beauty: "Go'zallik", auto: 'Auto servis',
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-subtitle">Xush kelibsiz, {user?.email}</p>
        </div>
        {isRetail ? (
          <div className="dash-date-tabs">
            {(['today', 'yesterday'] as DateMode[]).map((m) => (
              <button key={m} className={'dash-date-tab' + (dateMode === m ? ' dash-date-tab--active' : '')} onClick={() => setDateMode(m)}>
                {m === 'today' ? 'Bugun' : 'Kecha'}
              </button>
            ))}
          </div>
        ) : (
          <button className="btn-secondary" onClick={load} style={{ fontSize: '0.82rem' }}>Yangilash</button>
        )}
      </div>

      {loading && <Spinner />}
      {!loading && error && <p className="dash-error">{error}</p>}

      {!loading && !error && (
        <>
          {industry === 'retail'     && retailStats   && <RetailDashboard     stats={retailStats} />}
          {industry === 'restaurant' && industryData  && <RestaurantDashboard data={industryData} />}
          {industry === 'clinic'     && industryData  && <ClinicDashboard     data={industryData} />}
          {industry === 'education'  && industryData  && <EducationDashboard  data={industryData} />}
          {industry === 'fitness'    && industryData  && <GymDashboard        data={industryData} />}
          {industry === 'beauty'    && industryData  && <BeautyDashboard     data={industryData} />}
          {industry === 'auto'      && industryData  && <AutoDashboard       data={industryData} />}
          {!retailStats && !industryData && <GenericDashboard industryName={INDUSTRY_NAMES[industry] ?? industry} />}
        </>
      )}
    </div>
  );
}
