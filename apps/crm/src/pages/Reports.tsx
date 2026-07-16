import { useCallback, useEffect, useState } from 'react';
import { getSales, getAllReturns, exportSalesExcel, Sale, SaleReturn } from '../api/sales.api';
import { getCustomers, Customer, exportCustomersExcel } from '../api/customers.api';
import { getProducts, exportProductsExcel, Product } from '../api/products.api';
import { useTenantStore } from '../stores/tenant.store';
import { useFeaturesStore } from '../stores/features.store';
import { useConfigStore } from '../stores/config.store';
import { DEFAULT_CUSTOMER_LEVELS, CustomerLevel } from '../api/crm-engine.api';
import { getIndustryDashboardStats } from '../api/dashboard.api';
import UpgradeBanner from '../components/UpgradeBanner';

// ── Industry detection ────────────────────────────────────────────────────────

type IndustryKey = 'retail' | 'restaurant' | 'clinic' | 'education' | 'fitness' | 'beauty' | 'auto';

function detectIndustry(raw?: string): IndustryKey {
  const s = (raw ?? '').toLowerCase();
  if (s.includes('restaurant') || s.includes('cafe') || s.includes('oshxona')) return 'restaurant';
  if (s.includes('clinic') || s.includes('hospital') || s.includes('klinika')) return 'clinic';
  if (s.includes('edu') || s.includes('school') || s.includes('maktab') || s.includes('kurs')) return 'education';
  if (s.includes('fitness') || s.includes('gym') || s.includes('sport')) return 'fitness';
  if (s.includes('beauty') || s.includes('salon') || s.includes('nail') || s.includes('spa')) return 'beauty';
  if (s.includes('auto') || s.includes('car') || s.includes('servis')) return 'auto';
  return 'retail';
}

const COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#84cc16'];

// ── Industry-specific report sub-component ────────────────────────────────────

function IndustryReport({ industry }: { industry: IndustryKey }) {
  const [stats, setStats]   = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getIndustryDashboardStats(industry)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [industry]);

  const fmt = (n: number) => Math.round(n).toLocaleString('uz-UZ') + " so'm";
  const fmtN = (n: number) => n.toLocaleString('uz-UZ');

  if (loading) return <div className="dash-loading"><div className="dash-spinner" /></div>;
  if (!stats)  return <p className="state-msg">Ma'lumot yuklanmadi</p>;

  // ── Beauty ──────────────────────────────────────────────────────────────────
  if (industry === 'beauty') {
    const todayCount     = stats.todayCount     as number ?? 0;
    const completedToday = stats.completedToday as number ?? 0;
    const todayFee       = stats.todayFee       as number ?? 0;
    const weekly = (stats.weeklyChart as { date: string; count: number; revenue: number }[]) ?? [];
    const topMasters  = (stats.topMasters  as { name: string; count: number }[])  ?? [];
    const topServices = (stats.topServices as { name: string; revenue: number }[]) ?? [];
    const maxRev = Math.max(...weekly.map((w) => w.revenue), 1);
    const weekRevenue = weekly.reduce((s, w) => s + w.revenue, 0);

    return (
      <div className="page">
        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <div>
            <h2 className="page-title">Gozellik saloni — hisobot</h2>
            <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text-muted)' }}>Oxirgi 7 kun statistikasi</p>
          </div>
        </div>

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem', marginBottom: '1rem' }}>
          {[
            { label: 'Bugungi qabullar', value: `${todayCount} ta` },
            { label: 'Bajarilgan', value: `${completedToday} ta` },
            { label: "Bugungi tushum", value: fmt(todayFee) },
            { label: 'Haftalik tushum', value: fmt(weekRevenue) },
          ].map((c) => (
            <div key={c.label} className="dash-stat-card">
              <p className="dash-stat-label" style={{ margin: '0 0 0.5rem' }}>{c.label}</p>
              <p className="dash-stat-value" style={{ margin: 0 }}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Weekly chart + Top masters */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
          <div className="dash-table-card" style={{ padding: '1rem 1.25rem' }}>
            <p className="dash-section-title" style={{ margin: '0 0 0.75rem' }}>Haftalik tushum</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
              {weekly.map((w, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '100%', height: Math.max(4, (w.revenue / maxRev) * 90) + 'px', background: 'var(--primary)', borderRadius: '3px 3px 0 0', opacity: 0.85 }} title={`${w.count} ta qabul, ${fmt(w.revenue)}`} />
                  <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 3 }}>{w.date?.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="dash-table-card" style={{ padding: '1rem 1.25rem' }}>
            <p className="dash-section-title" style={{ margin: '0 0 0.75rem' }}>Top masterlar</p>
            {topMasters.slice(0, 5).map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.83rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: COLORS[i % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>{m.name}</span>
                </div>
                <span style={{ color: 'var(--text-muted)' }}>{fmtN(m.count)} ta</span>
              </div>
            ))}
            {topMasters.length === 0 && <p className="state-msg">Ma'lumot yo'q</p>}
          </div>
        </div>

        {/* Top services */}
        <div className="dash-table-card">
          <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
            <p className="dash-section-title" style={{ margin: 0 }}>Top xizmatlar (tushum bo'yicha)</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead><tr><th>#</th><th>Xizmat nomi</th><th style={{ textAlign: 'right' }}>Tushum</th></tr></thead>
              <tbody>
                {topServices.map((s, i) => (
                  <tr key={i}>
                    <td style={{ width: 36, color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>{fmt(s.revenue)}</td>
                  </tr>
                ))}
                {topServices.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Ma'lumot yo'q</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ── Auto ───────────────────────────────────────────────────────────────────
  if (industry === 'auto') {
    const received   = stats.received   as number ?? 0;
    const diagnosing = stats.diagnosing as number ?? 0;
    const inProgress = stats.inProgress as number ?? 0;
    const ready      = stats.ready      as number ?? 0;
    const weekRevenue = stats.weekRevenue as number ?? 0;
    const weekly = (stats.weeklyRevenue as { date: string; count: number; revenue: number }[]) ?? [];
    const topWorkItems = (stats.topWorkItems as { name: string; count: number; revenue: number }[]) ?? [];
    const maxRev = Math.max(...weekly.map((w) => w.revenue), 1);

    return (
      <div className="page">
        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <div>
            <h2 className="page-title">Avtoservis — hisobot</h2>
            <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text-muted)' }}>Buyurtmalar va tushum statistikasi</p>
          </div>
        </div>

        {/* Pipeline cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem', marginBottom: '1rem' }}>
          {[
            { label: 'Qabul qilindi', value: `${received} ta`, color: '#6366f1' },
            { label: 'Diagnostika', value: `${diagnosing} ta`, color: '#f59e0b' },
            { label: 'Tamirlashda', value: `${inProgress} ta`, color: '#8b5cf6' },
            { label: 'Tayyor', value: `${ready} ta`, color: '#10b981' },
          ].map((c) => (
            <div key={c.label} className="dash-stat-card" style={{ borderTop: `3px solid ${c.color}` }}>
              <p className="dash-stat-label" style={{ margin: '0 0 0.5rem' }}>{c.label}</p>
              <p className="dash-stat-value" style={{ margin: 0, color: c.color }}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Weekly revenue chart */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
          <div className="dash-table-card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <p className="dash-section-title" style={{ margin: 0 }}>Haftalik tushum</p>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)' }}>{fmt(weekRevenue)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
              {weekly.map((w, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '100%', height: Math.max(4, (w.revenue / maxRev) * 90) + 'px', background: 'var(--primary)', borderRadius: '3px 3px 0 0', opacity: 0.85 }} title={`${fmt(w.revenue)}`} />
                  <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 3 }}>{w.date?.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="dash-table-card" style={{ padding: '1rem 1.25rem' }}>
            <p className="dash-section-title" style={{ margin: '0 0 0.75rem' }}>Faol buyurtmalar</p>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 80 }}>
              <span style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--primary)' }}>{received + diagnosing + inProgress}</span>
            </div>
            <p style={{ textAlign: 'center', margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>jami faol buyurtma</p>
          </div>
        </div>

        {/* Top work items */}
        <div className="dash-table-card">
          <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
            <p className="dash-section-title" style={{ margin: 0 }}>Top ish turlari</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead><tr><th>#</th><th>Ish turi</th><th style={{ textAlign: 'right' }}>Soni</th><th style={{ textAlign: 'right' }}>Tushum</th></tr></thead>
              <tbody>
                {topWorkItems.map((w, i) => (
                  <tr key={i}>
                    <td style={{ width: 36, color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{w.name}</td>
                    <td style={{ textAlign: 'right' }}>{fmtN(w.count)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>{fmt(w.revenue)}</td>
                  </tr>
                ))}
                {topWorkItems.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Ma'lumot yo'q</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ── Restaurant ─────────────────────────────────────────────────────────────
  if (industry === 'restaurant') {
    const todayOrders   = stats.todayOrders   as number ?? 0;
    const todayRevenue  = stats.todayRevenue  as number ?? 0;
    const pending       = stats.pending       as number ?? 0;
    const totalActive   = stats.totalActive   as number ?? 0;
    const weekly = (stats.weeklyRevenue as { date: string; count: number; revenue: number }[]) ?? [];
    const topDishes = (stats.topDishes as { name: string; count: number; revenue: number }[]) ?? [];
    const maxRev = Math.max(...weekly.map((w) => w.revenue), 1);

    return (
      <div className="page">
        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <h2 className="page-title">Restoran — hisobot</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem', marginBottom: '1rem' }}>
          {[
            { label: 'Bugungi buyurtmalar', value: `${todayOrders} ta` },
            { label: 'Bugungi tushum', value: fmt(todayRevenue) },
            { label: 'Kutilmoqda', value: `${pending} ta` },
            { label: 'Faol buyurtmalar', value: `${totalActive} ta` },
          ].map((c) => (
            <div key={c.label} className="dash-stat-card">
              <p className="dash-stat-label" style={{ margin: '0 0 0.5rem' }}>{c.label}</p>
              <p className="dash-stat-value" style={{ margin: 0 }}>{c.value}</p>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.85rem' }}>
          <div className="dash-table-card" style={{ padding: '1rem 1.25rem' }}>
            <p className="dash-section-title" style={{ margin: '0 0 0.75rem' }}>Haftalik tushum</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
              {weekly.map((w, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '100%', height: Math.max(4, (w.revenue / maxRev) * 90) + 'px', background: 'var(--primary)', borderRadius: '3px 3px 0 0', opacity: 0.85 }} />
                  <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 3 }}>{w.date?.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="dash-table-card" style={{ padding: '1rem 1.25rem' }}>
            <p className="dash-section-title" style={{ margin: '0 0 0.75rem' }}>Top taomlar</p>
            {topDishes.slice(0, 5).map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.83rem' }}>
                <span style={{ fontWeight: 600 }}>{d.name}</span>
                <span style={{ color: 'var(--text-muted)' }}>{fmtN(d.count)} ta</span>
              </div>
            ))}
            {topDishes.length === 0 && <p className="state-msg">Ma'lumot yo'q</p>}
          </div>
        </div>
      </div>
    );
  }

  // ── Clinic ─────────────────────────────────────────────────────────────────
  if (industry === 'clinic') {
    const todayCount    = stats.todayCount    as number ?? 0;
    const todayRevenue  = stats.todayRevenue  as number ?? 0;
    const completed     = stats.completed     as number ?? 0;
    const weekRevenue   = stats.weekRevenue   as number ?? 0;
    const weekly = (stats.weeklyRevenue as { date: string; count: number; revenue: number }[]) ?? [];
    const topDoctors = (stats.topDoctors as { name: string; count: number }[]) ?? [];
    const maxRev = Math.max(...weekly.map((w) => w.revenue), 1);

    return (
      <div className="page">
        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <h2 className="page-title">Klinika — hisobot</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem', marginBottom: '1rem' }}>
          {[
            { label: "Bugungi qabullar", value: `${todayCount} ta` },
            { label: 'Bajarilgan', value: `${completed} ta` },
            { label: "Bugungi tushum", value: fmt(todayRevenue) },
            { label: 'Haftalik tushum', value: fmt(weekRevenue) },
          ].map((c) => (
            <div key={c.label} className="dash-stat-card">
              <p className="dash-stat-label" style={{ margin: '0 0 0.5rem' }}>{c.label}</p>
              <p className="dash-stat-value" style={{ margin: 0 }}>{c.value}</p>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.85rem' }}>
          <div className="dash-table-card" style={{ padding: '1rem 1.25rem' }}>
            <p className="dash-section-title" style={{ margin: '0 0 0.75rem' }}>Haftalik qabullar</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
              {weekly.map((w, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '100%', height: Math.max(4, (w.count / Math.max(...weekly.map((x) => x.count), 1)) * 90) + 'px', background: 'var(--primary)', borderRadius: '3px 3px 0 0', opacity: 0.85 }} title={`${w.count} qabul`} />
                  <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 3 }}>{w.date?.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="dash-table-card" style={{ padding: '1rem 1.25rem' }}>
            <p className="dash-section-title" style={{ margin: '0 0 0.75rem' }}>Top shifokorlar</p>
            {topDoctors.slice(0, 5).map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.83rem' }}>
                <span style={{ fontWeight: 600 }}>{d.name}</span>
                <span style={{ color: 'var(--text-muted)' }}>{fmtN(d.count)} ta</span>
              </div>
            ))}
            {topDoctors.length === 0 && <p className="state-msg">Ma'lumot yo'q</p>}
          </div>
        </div>
      </div>
    );
  }

  // ── Education ──────────────────────────────────────────────────────────────
  if (industry === 'education') {
    const totalStudents  = stats.totalStudents  as number ?? 0;
    const activeStudents = stats.activeStudents as number ?? 0;
    const monthPayments  = stats.monthPayments  as number ?? 0;
    const debtStudents   = stats.debtStudents   as number ?? 0;
    const weekly = (stats.weeklyPayments as { date: string; count: number; revenue: number }[]) ?? [];
    const topCourses = (stats.topCourses as { name: string; count: number }[]) ?? [];
    const maxVal = Math.max(...weekly.map((w) => w.revenue), 1);

    return (
      <div className="page">
        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <h2 className="page-title">Ta'lim markazi — hisobot</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem', marginBottom: '1rem' }}>
          {[
            { label: "Jami o'quvchilar", value: `${totalStudents} ta` },
            { label: "Faol o'quvchilar", value: `${activeStudents} ta` },
            { label: "Bu oy to'lovlar", value: fmt(monthPayments) },
            { label: 'Qarzdorlar', value: `${debtStudents} ta`, warn: true },
          ].map((c) => (
            <div key={c.label} className="dash-stat-card">
              <p className="dash-stat-label" style={{ margin: '0 0 0.5rem' }}>{c.label}</p>
              <p className="dash-stat-value" style={{ margin: 0, color: c.warn ? '#ef4444' : undefined }}>{c.value}</p>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.85rem' }}>
          <div className="dash-table-card" style={{ padding: '1rem 1.25rem' }}>
            <p className="dash-section-title" style={{ margin: '0 0 0.75rem' }}>Haftalik to'lovlar</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
              {weekly.map((w, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '100%', height: Math.max(4, (w.revenue / maxVal) * 90) + 'px', background: 'var(--primary)', borderRadius: '3px 3px 0 0', opacity: 0.85 }} />
                  <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 3 }}>{w.date?.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="dash-table-card" style={{ padding: '1rem 1.25rem' }}>
            <p className="dash-section-title" style={{ margin: '0 0 0.75rem' }}>Top kurslar</p>
            {topCourses.slice(0, 5).map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.83rem' }}>
                <span style={{ fontWeight: 600 }}>{c.name}</span>
                <span style={{ color: 'var(--text-muted)' }}>{fmtN(c.count)} ta</span>
              </div>
            ))}
            {topCourses.length === 0 && <p className="state-msg">Ma'lumot yo'q</p>}
          </div>
        </div>
      </div>
    );
  }

  // ── Fitness/Gym ────────────────────────────────────────────────────────────
  if (industry === 'fitness') {
    const totalMembers   = stats.totalMembers   as number ?? 0;
    const activeMembers  = stats.activeMembers  as number ?? 0;
    const expiringSoon   = stats.expiringSoon   as number ?? 0;
    const weekCheckins   = stats.weekCheckins   as number ?? 0;
    const weekly = (stats.weeklyCheckins as { date: string; count: number }[]) ?? [];
    const maxCount = Math.max(...weekly.map((w) => w.count), 1);

    return (
      <div className="page">
        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <h2 className="page-title">Fitness markazi — hisobot</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem', marginBottom: '1rem' }}>
          {[
            { label: "Jami a'zolar", value: `${totalMembers} ta` },
            { label: "Faol a'zolar", value: `${activeMembers} ta` },
            { label: "Muddati tugayapti", value: `${expiringSoon} ta`, warn: expiringSoon > 0 },
            { label: 'Haftalik kirish', value: `${weekCheckins} ta` },
          ].map((c) => (
            <div key={c.label} className="dash-stat-card">
              <p className="dash-stat-label" style={{ margin: '0 0 0.5rem' }}>{c.label}</p>
              <p className="dash-stat-value" style={{ margin: 0, color: c.warn ? '#f59e0b' : undefined }}>{c.value}</p>
            </div>
          ))}
        </div>
        <div className="dash-table-card" style={{ padding: '1rem 1.25rem' }}>
          <p className="dash-section-title" style={{ margin: '0 0 0.75rem' }}>Haftalik kirish grafigi</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
            {weekly.map((w, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', height: Math.max(4, (w.count / maxCount) * 90) + 'px', background: 'var(--primary)', borderRadius: '3px 3px 0 0', opacity: 0.85 }} title={`${w.count} kirish`} />
                <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 3 }}>{w.date?.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <p className="state-msg">Bu soha uchun hisobotlar tayyorlanmoqda</p>;
}

// ── Formatting ────────────────────────────────────────────────────────────────

const fmtPct  = (n: number) => (isFinite(n) ? n.toFixed(1) : '0') + '%';
const fmtSign = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(1) + '%';

function makeFmt(currency: string) {
  return (n: number) => {
    const v = Math.round(n);
    if (currency === 'usd') return '$' + v.toLocaleString('en-US');
    if (currency === 'rub') return v.toLocaleString('ru-RU') + ' ₽';
    if (currency === 'eur') return '€' + v.toLocaleString('en-US');
    return v.toLocaleString('uz-UZ') + " so'm";
  };
}

const MONTHS_UZ = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'];

type Period = 'today' | 'week' | 'month' | 'year';

function getPeriodDates(period: Period): { from: Date; to: Date; prev: { from: Date; to: Date } } {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === 'today') {
    const prev = new Date(today); prev.setDate(prev.getDate() - 1);
    return { from: today, to: now, prev: { from: prev, to: new Date(today.getTime() - 1) } };
  }
  if (period === 'week') {
    const from = new Date(today); from.setDate(from.getDate() - 6);
    const pFrom = new Date(from); pFrom.setDate(pFrom.getDate() - 7);
    const pTo   = new Date(from.getTime() - 1);
    return { from, to: now, prev: { from: pFrom, to: pTo } };
  }
  if (period === 'month') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const pFrom = new Date(from); pFrom.setMonth(pFrom.getMonth() - 1);
    const pTo   = new Date(from.getTime() - 1);
    return { from, to: now, prev: { from: pFrom, to: pTo } };
  }
  // year
  const from  = new Date(today.getFullYear(), 0, 1);
  const pFrom = new Date(from); pFrom.setFullYear(pFrom.getFullYear() - 1);
  const pTo   = new Date(from.getTime() - 1);
  return { from, to: now, prev: { from: pFrom, to: pTo } };
}

function getCustomerLevel(total: number, levels: CustomerLevel[]): CustomerLevel {
  const sorted = [...levels].sort((a, b) => b.minAmount - a.minAmount);
  return sorted.find((l) => total >= l.minAmount) ?? levels[0];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Reports() {
  const tenantId   = useTenantStore((s) => s.tenantId);
  const hasFeature = useFeaturesStore((s) => s.hasFeature);
  const crmConfig  = useConfigStore((s) => s.config);

  // Non-retail industries get their own dedicated report view
  const industry = detectIndustry(crmConfig?.industry);
  if (industry !== 'retail') return <IndustryReport industry={industry} />;

  const canExcelSales     = hasFeature('sales_excel_export');
  const canExcelCustomers = hasFeature('customers_excel_export');
  const canExcelProducts  = hasFeature('products_excel_export');
  const canDateFilter     = hasFeature('sales_date_filter');
  const canReturns        = hasFeature('sales_returns_view');

  const currency = (crmConfig?.currency ?? 'uzs').toLowerCase();
  const fmt    = makeFmt(currency);
  const fmtUsd = (n: number) => fmt(Math.round(n * 100)); // fmtUsd(x/100) == fmt(x)

  const customerLevels: CustomerLevel[] = crmConfig?.customerLevels ?? DEFAULT_CUSTOMER_LEVELS;

  const [allSales,   setAllSales]   = useState<Sale[]>([]);
  const [allReturns, setAllReturns] = useState<SaleReturn[]>([]);
  const [customers,  setCustomers]  = useState<Customer[]>([]);
  const [products,   setProducts]   = useState<Product[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [period,     setPeriod]     = useState<Period>('month');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [s, c, p, r] = await Promise.all([
      getSales(tenantId).catch(() => [] as Sale[]),
      getCustomers(tenantId).catch(() => [] as Customer[]),
      getProducts(tenantId).catch(() => [] as Product[]),
      canReturns ? getAllReturns(tenantId).catch(() => [] as SaleReturn[]) : Promise.resolve([] as SaleReturn[]),
    ]);
    setAllSales(s); setCustomers(c); setProducts(p); setAllReturns(r);
    setLoading(false);
  }, [tenantId, canReturns]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Period filtering ────────────────────────────────────────────────────────

  const { from, to, prev } = getPeriodDates(period);

  const filterSales = (list: Sale[], f: Date, t: Date) =>
    list.filter((s) => { const d = new Date(s.createdAt); return d >= f && d <= t && s.status !== 'cancelled'; });

  const sales     = filterSales(allSales, from, to);
  const prevSales = filterSales(allSales, prev.from, prev.to);

  const approvedReturns = allReturns.filter(
    (r) => r.status === 'approved' && new Date(r.createdAt) >= from && new Date(r.createdAt) <= to
  );

  // ── Product lookup ──────────────────────────────────────────────────────────

  const productLookup = new Map<string, Product>(products.map((p) => [p.id, p]));

  // ── Core calculations ───────────────────────────────────────────────────────

  function calcStats(saleList: Sale[]) {
    let revenue = 0, cost = 0;
    for (const s of saleList) {
      revenue += Number(s.totalAmount);
      for (const item of (s.items ?? [])) {
        const cp = productLookup.get(item.productId)?.costPrice ?? 0;
        cost += cp * item.quantity;
      }
    }
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { revenue, cost, profit, margin, count: saleList.length };
  }

  const cur  = calcStats(sales);
  const prev_ = calcStats(prevSales);

  const returnTotal = approvedReturns.reduce((sum, r) => sum + Number(r.totalRefund), 0);
  const netRevenue  = cur.revenue - returnTotal;
  const netProfit   = cur.profit  - returnTotal;

  const revChange  = prev_.revenue > 0 ? ((cur.revenue - prev_.revenue) / prev_.revenue) * 100 : 0;
  const cntChange  = prev_.count   > 0 ? ((cur.count   - prev_.count)   / prev_.count)   * 100 : 0;
  const avgSale    = cur.count > 0 ? cur.revenue / cur.count : 0;

  // ── Payment breakdown ───────────────────────────────────────────────────────

  const paymentMap = new Map<string, number>();
  for (const s of sales) {
    const key = s.paymentType;
    paymentMap.set(key, (paymentMap.get(key) ?? 0) + Number(s.totalAmount));
  }
  const paymentEntries = [...paymentMap.entries()].sort(([, a], [, b]) => b - a);
  const PAYMENT_LABELS: Record<string, string> = {
    cash: 'Naqd pul', card: 'Karta', transfer: "O'tkazma",
    credit: 'Nasiya', partial: 'Qisman', mixed: 'Aralash',
  };

  // ── Chart data (dynamic) ────────────────────────────────────────────────────

  const chartData: { label: string; value: number; retVal: number }[] = [];
  if (period === 'today') {
    for (let h = 0; h < 24; h++) {
      const val = sales
        .filter((s) => new Date(s.createdAt).getHours() === h)
        .reduce((sum, s) => sum + Number(s.totalAmount), 0);
      chartData.push({ label: `${h}:00`, value: val, retVal: 0 });
    }
  } else if (period === 'week') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' });
      const val = sales.filter((s) => {
        const sd = new Date(s.createdAt);
        return sd.getDate() === d.getDate() && sd.getMonth() === d.getMonth();
      }).reduce((sum, s) => sum + Number(s.totalAmount), 0);
      chartData.push({ label, value: val, retVal: 0 });
    }
  } else if (period === 'month') {
    for (let day = 1; day <= new Date().getDate(); day++) {
      const val = sales.filter((s) => new Date(s.createdAt).getDate() === day)
        .reduce((sum, s) => sum + Number(s.totalAmount), 0);
      chartData.push({ label: `${day}`, value: val, retVal: 0 });
    }
  } else {
    for (let m = 0; m < 12; m++) {
      const val = sales.filter((s) => new Date(s.createdAt).getMonth() === m)
        .reduce((sum, s) => sum + Number(s.totalAmount), 0);
      chartData.push({ label: MONTHS_UZ[m], value: val, retVal: 0 });
    }
  }
  const maxChart = Math.max(...chartData.map((d) => d.value), 1);

  // ── Top products ────────────────────────────────────────────────────────────

  const topProductMap = new Map<string, {
    name: string; qty: number; orderCount: number; revenue: number; cost: number;
  }>();
  for (const s of sales) {
    for (const item of (s.items ?? [])) {
      const cp  = productLookup.get(item.productId)?.costPrice ?? 0;
      const rev = Number(item.price) * item.quantity - (item.discount ?? 0);
      const ex  = topProductMap.get(item.productId) ?? { name: item.name, qty: 0, orderCount: 0, revenue: 0, cost: 0 };
      ex.qty        += item.quantity;
      ex.orderCount += 1;
      ex.revenue    += rev;
      ex.cost       += cp * item.quantity;
      topProductMap.set(item.productId, ex);
    }
  }
  const topProducts = [...topProductMap.values()]
    .map((p) => ({ ...p, profit: p.revenue - p.cost, margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  const maxProductRevenue = topProducts[0]?.revenue ?? 1;

  // ── Categories ──────────────────────────────────────────────────────────────

  const catMap = new Map<string, { revenue: number; cost: number; count: number }>();
  for (const s of sales) {
    for (const item of (s.items ?? [])) {
      const prod = productLookup.get(item.productId);
      const cat  = prod?.category || 'Boshqa';
      const rev  = Number(item.price) * item.quantity - (item.discount ?? 0);
      const cp   = (prod?.costPrice ?? 0) * item.quantity;
      const ex   = catMap.get(cat) ?? { revenue: 0, cost: 0, count: 0 };
      ex.revenue += rev; ex.cost += cp; ex.count += 1;
      catMap.set(cat, ex);
    }
  }
  const categories = [...catMap.entries()]
    .map(([name, v]) => ({ name, ...v, profit: v.revenue - v.cost, margin: v.revenue > 0 ? ((v.revenue - v.cost) / v.revenue) * 100 : 0 }))
    .sort((a, b) => b.revenue - a.revenue);
  const maxCatRevenue = categories[0]?.revenue ?? 1;

  // ── Yearly panorama ─────────────────────────────────────────────────────────

  const yearSales   = filterSales(allSales, new Date(new Date().getFullYear(), 0, 1), new Date());
  const yearReturns = allReturns.filter((r) => r.status === 'approved' && new Date(r.createdAt).getFullYear() === new Date().getFullYear());

  const monthlyStats = MONTHS_UZ.map((label, m) => {
    const ms = yearSales.filter((s) => new Date(s.createdAt).getMonth() === m);
    const mr = yearReturns.filter((r) => new Date(r.createdAt).getMonth() === m);
    const revenue = ms.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    let cost = 0;
    for (const s of ms) for (const item of (s.items ?? [])) { cost += (productLookup.get(item.productId)?.costPrice ?? 0) * item.quantity; }
    const retTotal = mr.reduce((sum, r) => sum + Number(r.totalRefund), 0);
    return { label, revenue, netRevenue: revenue - retTotal, profit: revenue - cost, count: ms.length, returns: retTotal, m };
  });
  const maxYearRevenue = Math.max(...monthlyStats.map((m) => m.revenue), 1);

  // ── Customer statistics ─────────────────────────────────────────────────────

  const customerPurchaseMap = new Map<string, { name: string; total: number; count: number }>();
  for (const s of allSales.filter((s) => s.status !== 'cancelled')) {
    const key = s.customerId ?? s.customerName ?? '';
    if (!key) continue;
    const ex = customerPurchaseMap.get(key) ?? { name: s.customerName || 'Noma\'lum', total: 0, count: 0 };
    ex.total += Number(s.totalAmount); ex.count += 1;
    customerPurchaseMap.set(key, ex);
  }
  const topCustomers = [...customerPurchaseMap.values()].sort((a, b) => b.total - a.total).slice(0, 8);
  const levelDist = new Map<string, number>();
  for (const cust of customers) {
    const lvl = getCustomerLevel(customerPurchaseMap.get(cust.id)?.total ?? 0, customerLevels);
    levelDist.set(lvl.name, (levelDist.get(lvl.name) ?? 0) + 1);
  }

  // ── Export ──────────────────────────────────────────────────────────────────

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };
  const handleExportSales = async () => {
    try { downloadBlob(await exportSalesExcel(tenantId, canDateFilter ? from.toISOString() : undefined, canDateFilter ? to.toISOString() : undefined), `sotuvlar_${new Date().toISOString().slice(0, 10)}.xlsx`); }
    catch { /* silent */ }
  };
  const handleExportCustomers = async () => {
    try { downloadBlob(await exportCustomersExcel(tenantId), `mijozlar_${new Date().toISOString().slice(0, 10)}.xlsx`); }
    catch { /* silent */ }
  };
  const handleExportProducts = async () => {
    try { downloadBlob(await exportProductsExcel(tenantId), `mahsulotlar_${new Date().toISOString().slice(0, 10)}.xlsx`); }
    catch { /* silent */ }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const changeColor = (n: number) => n >= 0 ? '#10b981' : '#ef4444';
  const changeBg    = (n: number) => n >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';

  const today = new Date();
  const dateLabel = period === 'year'
    ? `${today.getFullYear()} yil`
    : period === 'month'
    ? `${today.getFullYear()} M${String(today.getMonth() + 1).padStart(2, '0')}`
    : period === 'week'
    ? 'Oxirgi 7 kun'
    : today.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <div>
          <h2 className="page-title">Savdo tahlili</h2>
          <p className="page-subtitle" style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text-muted)' }}>{dateLabel}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="filter-tabs" style={{ margin: 0 }}>
            {(['today', 'week', 'month', 'year'] as Period[]).map((p) => (
              <button key={p} className={`filter-tab${period === p ? ' filter-tab--active' : ''}`}
                onClick={() => setPeriod(p)} disabled={p !== 'today' && !canDateFilter && p !== 'week'}>
                {p === 'today' ? 'Bugun' : p === 'week' ? 'Hafta' : p === 'month' ? 'Oy' : 'Yil'}
              </button>
            ))}
          </div>
          {canExcelSales ? (
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', fontSize: '0.83rem' }}
              onClick={handleExportSales}>
              Excel
            </button>
          ) : (
            <UpgradeBanner feature="Excel" requiredPlan="STARTER" compact />
          )}
        </div>
      </div>

      {loading ? (
        <div className="dash-loading"><div className="dash-spinner" /></div>
      ) : (
        <>
          {/* ── Stats cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem', marginBottom: '1rem' }}>
            {[
              { label: 'Haqiqiy tushum', value: fmtUsd(netRevenue / 100), sub: returnTotal > 0 ? `Qaytarish: -${fmtUsd(returnTotal / 100)}` : "Qaytarish yo'q", change: revChange },
              { label: 'Sof foyda', value: fmtUsd(netProfit / 100), sub: `Margin: ${fmtPct(cur.margin)}`, change: null },
              { label: 'Savdolar soni', value: `${cur.count} ta`, sub: `O'rtacha: ${fmtUsd(avgSale / 100)}`, change: cntChange },
              { label: 'Qaytarishlar', value: `${approvedReturns.length} ta`, sub: approvedReturns.length === 0 ? 'Hammasi yaxshi' : `Jami: ${fmtUsd(returnTotal / 100)}`, change: null },
            ].map((card) => (
              <div key={card.label} className="dash-stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <p className="dash-stat-label" style={{ margin: 0 }}>{card.label}</p>
                  {card.change !== null && Math.abs(card.change) > 0.1 && (
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 5, color: changeColor(card.change), background: changeBg(card.change) }}>
                      {fmtSign(card.change)}
                    </span>
                  )}
                </div>
                <p className="dash-stat-value" style={{ margin: '0 0 0.25rem' }}>{card.value}</p>
                <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--text-muted)' }}>{card.sub}</p>
              </div>
            ))}
          </div>

          {/* ── Payment breakdown + Chart ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.85rem', marginBottom: '1rem' }}>

            {/* Payment */}
            <div className="dash-table-card" style={{ padding: '1rem 1.25rem' }}>
              {paymentEntries.map(([type, amount]) => {
                const pct = cur.revenue > 0 ? (amount / cur.revenue) * 100 : 0;
                const color = type === 'cash' ? '#10b981' : type === 'credit' ? '#ef4444' : type === 'card' ? '#6366f1' : '#f59e0b';
                return (
                  <div key={type} style={{ marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{PAYMENT_LABELS[type] ?? type}</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color }}>{fmtPct(pct)}</span>
                    </div>
                    <p style={{ margin: '0 0 0.3rem', fontSize: '1.15rem', fontWeight: 700, color }}>{fmtUsd(amount / 100)}</p>
                    <div style={{ height: 5, borderRadius: 3, background: 'var(--border)' }}>
                      <div style={{ height: '100%', borderRadius: 3, background: color, width: pct + '%', transition: 'width 0.4s' }} />
                    </div>
                  </div>
                );
              })}
              {paymentEntries.length === 0 && <p className="state-msg">Ma'lumot yo'q</p>}
            </div>

            {/* Chart */}
            <div className="dash-table-card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div>
                  <p className="dash-section-title" style={{ margin: 0 }}>Tushum dinamikasi</p>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{period === 'year' ? 'Oylar bo\'yicha' : period === 'month' ? 'Kunlar bo\'yicha' : period === 'week' ? 'Kunlar bo\'yicha' : 'Soatlar bo\'yicha'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--primary)', display: 'inline-block' }} /> Tushum
                </div>
              </div>
              {maxChart > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 100, overflowX: 'auto' }}>
                  {chartData.filter((d) => d.value > 0 || period !== 'today').map((d, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: period === 'month' ? 16 : period === 'year' ? 32 : 22, flex: 1 }}>
                      <div style={{ width: '100%', height: Math.max(3, (d.value / maxChart) * 88) + 'px', background: 'var(--primary)', borderRadius: '3px 3px 0 0', opacity: 0.8 }} title={`${d.label}: ${fmtUsd(d.value / 100)}`} />
                      {chartData.length <= 31 && (
                        <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap' }}>{d.label}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {maxChart === 1 && <p className="state-msg">Ma'lumot yo'q</p>}
            </div>
          </div>

          {/* ── Top products + Categories ── */}
          {(topProducts.length > 0 || categories.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>

              {/* Top products */}
              <div className="dash-table-card">
                <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p className="dash-section-title" style={{ margin: 0 }}>Top mahsulotlar</p>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{period === 'year' ? 'Yil' : period === 'month' ? 'Oy' : period === 'week' ? 'Hafta' : 'Bugun'}</span>
                </div>
                <div style={{ padding: '0.35rem 0' }}>
                  {topProducts.map((p, i) => (
                    <div key={i} style={{ padding: '0.5rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <span style={{ width: 22, height: 22, borderRadius: '50%', background: i < 3 ? ['#f59e0b','#94a3b8','#cd7f32'][i] : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: i < 3 ? '#fff' : 'var(--text-muted)', flexShrink: 0 }}>{i + 1}</span>
                        <span style={{ flex: 1, fontSize: '0.83rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                        <span style={{ fontSize: '0.73rem', fontWeight: 700, color: p.margin >= 20 ? '#10b981' : p.margin >= 10 ? '#f59e0b' : '#ef4444' }}>{fmtPct(p.margin)}</span>
                        <span style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--text)' }}>{fmtUsd(p.revenue / 100)}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', paddingLeft: 30 }}>
                        <div style={{ height: 3, flex: 1, borderRadius: 2, background: 'var(--border)', alignSelf: 'center' }}>
                          <div style={{ height: '100%', borderRadius: 2, background: 'var(--primary)', width: (p.revenue / maxProductRevenue * 100) + '%' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.85rem', paddingLeft: 30, marginTop: '0.2rem' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{p.qty.toLocaleString()} ta sotildi</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{p.orderCount} savdo</span>
                        <span style={{ fontSize: '0.68rem', color: '#10b981' }}>Foyda: {fmtUsd(p.profit / 100)}</span>
                      </div>
                    </div>
                  ))}
                  {topProducts.length === 0 && <p className="state-msg">Ma'lumot yo'q</p>}
                </div>
              </div>

              {/* Categories */}
              <div className="dash-table-card">
                <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p className="dash-section-title" style={{ margin: 0 }}>Kategoriyalar</p>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{period === 'year' ? 'Yil' : period === 'month' ? 'Oy' : period === 'week' ? 'Hafta' : 'Bugun'}</span>
                </div>

                {/* Donut-style visual */}
                {categories.length > 0 && (
                  <div style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                      <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                        {(() => {
                          const COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#84cc16'];
                          let offset = 0;
                          return categories.slice(0, 6).map((cat, i) => {
                            const pct = cur.revenue > 0 ? (cat.revenue / cur.revenue) * 100 : 0;
                            const el = (
                              <circle key={cat.name} cx="18" cy="18" r="15.9"
                                fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="3.8"
                                strokeDasharray={`${pct * 0.999} ${100 - pct * 0.999}`}
                                strokeDashoffset={-offset} />
                            );
                            offset += pct;
                            return el;
                          });
                        })()}
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>Jami</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text)' }}>{fmtUsd(cur.revenue / 100)}</span>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      {(() => {
                        const COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#84cc16'];
                        return categories.slice(0, 6).map((cat, i) => {
                          const pct = cur.revenue > 0 ? (cat.revenue / cur.revenue) * 100 : 0;
                          return (
                            <div key={cat.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', marginBottom: '0.2rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                                <span style={{ color: 'var(--text)' }}>{cat.name}</span>
                              </div>
                              <span style={{ fontWeight: 600, color: 'var(--text)' }}>{fmtPct(pct)}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                {/* Category detail rows */}
                <div style={{ padding: '0.35rem 0', borderTop: '1px solid var(--border)' }}>
                  {(() => {
                    const COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#84cc16'];
                    return categories.map((cat, i) => {
                      const pct = cur.revenue > 0 ? (cat.revenue / cur.revenue) * 100 : 0;
                      return (
                        <div key={cat.name} style={{ padding: '0.5rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                              <span style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text)' }}>{cat.name}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.73rem', fontWeight: 700, color: COLORS[i % COLORS.length] }}>{fmtPct(pct)}</span>
                              <span style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--text)' }}>{fmtUsd(cat.revenue / 100)}</span>
                            </div>
                          </div>
                          <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', marginBottom: '0.2rem' }}>
                            <div style={{ height: '100%', borderRadius: 2, background: COLORS[i % COLORS.length], width: (cat.revenue / maxCatRevenue * 100) + '%', transition: 'width 0.4s' }} />
                          </div>
                          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            <span>{cat.count} savdo</span>
                            <span style={{ color: '#10b981' }}>Foyda: {fmtUsd(cat.profit / 100)}</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                  {categories.length === 0 && <p className="state-msg">Ma'lumot yo'q</p>}
                </div>
              </div>
            </div>
          )}

          {/* ── Oylik panorama (always shows full year) ── */}
          <div className="dash-table-card" style={{ marginBottom: '1rem' }}>
            <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="dash-section-title" style={{ margin: 0 }}>{today.getFullYear()} — oylik panorama</p>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Har oy uchun tushum va qaytarishlar</span>
              </div>
            </div>

            {/* Year bar chart */}
            <div style={{ padding: '1rem 1.25rem 0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
                {monthlyStats.map((m) => (
                  <div key={m.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '100%', height: Math.max(2, (m.revenue / maxYearRevenue) * 76) + 'px', background: m.m === today.getMonth() ? 'var(--primary)' : 'rgba(99,102,241,0.35)', borderRadius: '3px 3px 0 0', transition: 'height 0.4s' }} title={`${m.label}: ${fmtUsd(m.revenue / 100)}`} />
                    {m.returns > 0 && (
                      <div style={{ width: '100%', height: Math.max(1, (m.returns / maxYearRevenue) * 76) + 'px', background: '#ef4444', borderRadius: '0 0 2px 2px', marginTop: 1 }} />
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', marginTop: 4 }}>
                {monthlyStats.map((m) => (
                  <div key={m.m} style={{ flex: 1, textAlign: 'center', fontSize: '0.6rem', color: m.m === today.getMonth() ? 'var(--primary)' : 'var(--text-muted)', fontWeight: m.m === today.getMonth() ? 700 : 400 }}>{m.label}</div>
                ))}
              </div>
            </div>

            {/* Monthly table */}
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ fontSize: '0.83rem' }}>
                <thead>
                  <tr>
                    <th>Oy</th>
                    <th style={{ textAlign: 'right' }}>Tushum</th>
                    <th style={{ textAlign: 'right' }}>Haqiqiy</th>
                    <th style={{ textAlign: 'right' }}>Foyda</th>
                    <th style={{ textAlign: 'right' }}>Savdo</th>
                    <th style={{ textAlign: 'right' }}>Qaytarish</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyStats.map((m) => (
                    <tr key={m.m} style={{ background: m.m === today.getMonth() ? 'var(--primary-light, rgba(99,102,241,0.07))' : undefined }}>
                      <td style={{ fontWeight: m.m === today.getMonth() ? 700 : 400 }}>
                        {m.label}
                        {m.m === today.getMonth() && <span style={{ marginLeft: '0.35rem', fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 700 }}>joriy</span>}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{m.revenue > 0 ? fmt(m.revenue) : '—'}</td>
                      <td style={{ textAlign: 'right' }}>{m.revenue > 0 ? fmt(m.netRevenue) : '—'}</td>
                      <td style={{ textAlign: 'right', color: m.profit > 0 ? '#10b981' : 'var(--text-muted)' }}>
                        {m.revenue > 0 ? (
                          <>{fmt(m.profit)} <span style={{ fontSize: '0.73rem' }}>({fmtPct(m.profit / m.revenue * 100)})</span></>
                        ) : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>{m.count > 0 ? `${m.count} ta` : '—'}</td>
                      <td style={{ textAlign: 'right', color: m.returns > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                        {m.returns > 0 ? `-${fmt(m.returns)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Margin tahlili ── */}
          {categories.length > 0 && (
            <div className="dash-table-card" style={{ marginBottom: '1rem' }}>
              <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
                <p className="dash-section-title" style={{ margin: 0 }}>Margin tahlili</p>
              </div>
              <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Umumiy margin</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: cur.margin >= 20 ? '#10b981' : cur.margin >= 10 ? '#f59e0b' : '#ef4444' }}>{fmtPct(cur.margin)}</div>
                  <div style={{ fontSize: '0.73rem', color: cur.margin >= 20 ? '#10b981' : '#f59e0b', marginTop: '0.2rem' }}>{cur.margin >= 20 ? 'Yaxshi' : cur.margin >= 10 ? "O'rtacha" : 'Past'}</div>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)', padding: '0 1rem' }}>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Yalpi foyda</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>{fmtUsd(cur.profit / 100)}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>qaytarishsiz</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Sof foyda</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>{fmtUsd(netProfit / 100)}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>qaytarishlar ayirilgan</div>
                </div>
              </div>
              <div style={{ padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Kategoriya bo'yicha margin</div>
                {(() => {
                  const COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#84cc16'];
                  return categories.map((cat, i) => (
                    <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.65rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 120 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: '0.78rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
                      </div>
                      <div style={{ flex: 1, height: 12, borderRadius: 6, background: 'var(--border)', position: 'relative' }}>
                        <div style={{ position: 'absolute', inset: 0, borderRadius: 6, background: '#10b981', width: Math.min(cat.margin, 100) + '%', transition: 'width 0.4s' }} />
                        <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: '0.62rem', fontWeight: 700, color: '#fff', zIndex: 1 }}>{fmtPct(cat.margin)}</span>
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', minWidth: 80, textAlign: 'right' }}>{fmtUsd(cat.revenue / 100)}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* ── Mijozlar statistikasi ── */}
          {topCustomers.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
              <div className="dash-table-card">
                <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p className="dash-section-title" style={{ margin: 0 }}>Top mijozlar</p>
                  <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Jami xaridlar bo'yicha</span>
                </div>
                <div style={{ padding: '0.35rem 0' }}>
                  {topCustomers.map((c, i) => {
                    const lvl = getCustomerLevel(c.total, customerLevels);
                    const maxTotal = topCustomers[0]?.total ?? 1;
                    return (
                      <div key={i} style={{ padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ width: 18, fontSize: '0.73rem', color: 'var(--text-muted)', flexShrink: 0, fontWeight: 700 }}>{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                            <span style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                            <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.05rem 0.3rem', borderRadius: 4, background: lvl.color + '22', color: lvl.color, border: `1px solid ${lvl.color}44`, flexShrink: 0 }}>{lvl.name}</span>
                          </div>
                          <div style={{ height: 4, borderRadius: 2, background: 'var(--border)' }}>
                            <div style={{ height: '100%', borderRadius: 2, background: lvl.color, width: (c.total / maxTotal * 100) + '%' }} />
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '0.83rem', fontWeight: 700 }}>{fmtUsd(c.total / 100)}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{c.count} ta</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="dash-table-card">
                <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
                  <p className="dash-section-title" style={{ margin: 0 }}>Daraja taqsimoti</p>
                </div>
                <div style={{ padding: '1rem 1.25rem' }}>
                  {customerLevels.map((lvl) => {
                    const count = levelDist.get(lvl.name) ?? 0;
                    const pct = customers.length > 0 ? (count / customers.length) * 100 : 0;
                    return (
                      <div key={lvl.name} style={{ marginBottom: '0.9rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: lvl.color, display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.83rem', fontWeight: 600 }}>{lvl.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{count} ta</span>
                            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', minWidth: 35, textAlign: 'right' }}>{fmtPct(pct)}</span>
                          </div>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: 'var(--border)' }}>
                          <div style={{ height: '100%', borderRadius: 3, background: lvl.color, width: pct + '%', transition: 'width 0.4s' }} />
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {lvl.minAmount > 0 ? `${fmt(lvl.minAmount)} dan` : 'Boshlang\'ich daraja'}
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Jami mijozlar</span>
                    <span style={{ fontWeight: 700 }}>{customers.length} ta</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Excel exports ── */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {[
              { label: 'Sotuvlar', can: canExcelSales, handler: handleExportSales },
              { label: 'Mijozlar', can: canExcelCustomers, handler: handleExportCustomers },
              { label: 'Mahsulotlar', can: canExcelProducts, handler: handleExportProducts },
            ].map(({ label, can, handler }) => (
              <div key={label} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.85rem 1.25rem', minWidth: 160 }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                {can ? (
                  <button className="btn-primary" style={{ fontSize: '0.83rem', padding: '0.45rem 1rem', width: '100%' }} onClick={handler}>
                    Excel yuklab olish
                  </button>
                ) : (
                  <UpgradeBanner feature={`${label} export`} requiredPlan="STARTER" compact />
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
