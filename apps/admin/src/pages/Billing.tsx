import { useEffect, useMemo, useState } from 'react';
import {
  BillingCycle, BillingStats, ChangePlanPayload, PaymentHistoryItem,
  PaymentMethod, PlanType, RecordPaymentPayload, SubStatus, Subscription,
  approvePlanChange, changePlan, getBillingAll, getBillingStats,
  getPendingRequests, getPaymentHistory, recordPayment,
  reactivateTenant, rejectPlanChange, suspendTenant,
} from '../api/billing.api';

// ─── Plan metadata ────────────────────────────────────────────────────────────

interface PlanMeta {
  label:        string;
  color:        string;
  users:        number;
  storage:      number;
  apiCalls:     number;
  priceMonthly: number;
  priceYearly:  number;
}

const PLANS: Record<PlanType, PlanMeta> = {
  trial:   { label: 'Sinov (Trial)', color: '#6b7280', users: 3,  storage: 500,    apiCalls: 500,    priceMonthly: 0,         priceYearly: 0           },
  starter: { label: 'Starter',       color: '#2563eb', users: 10, storage: 2_000,  apiCalls: 10_000, priceMonthly: 128_000,   priceYearly: 1_280_000   },
  pro:     { label: 'Pro',           color: '#7c3aed', users: 50, storage: 10_000, apiCalls: 100_000,priceMonthly: 640_000,   priceYearly: 6_400_000   },
};

const STATUS_LABELS: Record<SubStatus, string> = {
  active:    'Faol',
  trial:     'Sinov',
  suspended: 'Bloklangan',
  cancelled: 'Bekor',
};
const STATUS_COLORS: Record<SubStatus, string> = {
  active:    '#16a34a',
  trial:     '#f59e0b',
  suspended: '#ef4444',
  cancelled: '#6b7280',
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  click:  'Click',
  payme:  'Payme',
  manual: "Qo'lda",
};

const ALL_PLANS: PlanType[] = ['trial', 'starter', 'pro'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt    = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));
const fmtUzs = (n: number) => `${fmt(n)} so'm`;
const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

function usagePct(current: number, limit: number): number {
  return limit > 0 ? Math.round((current / limit) * 100) : 0;
}
function usageColor(pct: number): string {
  return pct >= 80 ? '#ef4444' : pct >= 60 ? '#f59e0b' : 'var(--text)';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '0.15rem 0.55rem',
      borderRadius: 99, fontSize: '0.75rem', fontWeight: 600,
      background: color + '22', color,
    }}>
      {label}
    </span>
  );
}

function StatCard({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div className="card" style={{ borderTop: `3px solid ${color}`, minWidth: 0 }}>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, color, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2, opacity: 0.75 }}>{sub}</div>}
    </div>
  );
}

// ─── Plan Change Modal ────────────────────────────────────────────────────────

function PlanModal({
  sub, onClose, onSaved,
}: {
  sub:     Subscription;
  onClose: () => void;
  onSaved: (updated: Subscription) => void;
}) {
  const [plan,    setPlan]    = useState<PlanType>(sub.plan);
  const [cycle,   setCycle]   = useState<BillingCycle>(sub.billingCycle);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const meta  = PLANS[plan];
  const price = cycle === 'yearly' ? meta.priceYearly : meta.priceMonthly;

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const payload: ChangePlanPayload = { plan, cycle };
      const updated = await changePlan(sub.tenantId, payload);
      onSaved(updated);
      onClose();
    } catch { setError("Saqlashda xatolik yuz berdi"); }
    finally   { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="confirm-dialog" style={{ maxWidth: 560, width: '95vw' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 0.25rem' }}>Tarif rejasini o'zgartirish</h3>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {sub.tenantName}
        </p>

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem', marginBottom: '1rem' }}>
          {ALL_PLANS.map((p) => {
            const m      = PLANS[p];
            const sel    = plan === p;
            const pLabel = m.priceMonthly === 0 ? 'Bepul' : cycle === 'yearly' ? fmtUzs(m.priceYearly) : fmtUzs(m.priceMonthly);
            return (
              <div
                key={p}
                onClick={() => setPlan(p)}
                style={{
                  border:       `2px solid ${sel ? m.color : 'var(--border)'}`,
                  borderRadius: 10, padding: '0.75rem', cursor: 'pointer',
                  background:   sel ? m.color + '11' : 'transparent',
                  transition:   'border-color 0.15s, background 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: m.color }}>{m.label}</span>
                  {sel && <span style={{ fontSize: '0.7rem', color: m.color }}>✓ Tanlandi</span>}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  👤 {m.users === 999 ? 'Cheksiz' : m.users} xodim<br />
                  📞 {fmt(m.apiCalls)} API<br />
                  💾 {m.storage >= 1000 ? `${m.storage / 1000} GB` : `${m.storage} MB`}
                </div>
                <div style={{ marginTop: '0.4rem', fontWeight: 600, fontSize: '0.85rem', color: m.color }}>
                  {pLabel}{cycle === 'monthly' && m.priceMonthly > 0 ? '/oy' : cycle === 'yearly' && m.priceYearly > 0 ? '/yil' : ''}
                </div>
              </div>
            );
          })}
        </div>

        {/* Billing cycle */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {(['monthly', 'yearly'] as BillingCycle[]).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              style={{
                flex: 1, padding: '0.5rem', borderRadius: 8,
                border:     `2px solid ${cycle === c ? '#2563eb' : 'var(--border)'}`,
                background: cycle === c ? '#2563eb22' : 'transparent',
                cursor: 'pointer', fontWeight: cycle === c ? 700 : 400,
                color: cycle === c ? '#2563eb' : 'var(--text)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              }}
            >
              {c === 'monthly' ? 'Oylik' : 'Yillik'}
              {c === 'yearly' && <span style={{ fontSize: '0.7rem', background: '#16a34a22', color: '#16a34a', borderRadius: 99, padding: '0.1rem 0.4rem', fontWeight: 700 }}>2 oy bepul</span>}
            </button>
          ))}
        </div>

        {/* Summary */}
        <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Tanlangan tarif:</span>
            <span style={{ fontWeight: 700, color: PLANS[plan].color }}>{PLANS[plan].label}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ color: 'var(--text-muted)' }}>Narx:</span>
            <span style={{ fontWeight: 700 }}>{price === 0 ? 'Bepul' : fmtUzs(price)}</span>
          </div>
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: '0 0 0.75rem' }}>{error}</p>}

        <div className="confirm-actions">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Bekor</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saqlanmoqda...' : '💾 Saqlash'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Payment Modal ────────────────────────────────────────────────────────────

function PaymentModal({
  sub, onClose, onSaved,
}: {
  sub:     Subscription;
  onClose: () => void;
  onSaved: (updated: Subscription) => void;
}) {
  const [amount,  setAmount]  = useState('');
  const [method,  setMethod]  = useState<PaymentMethod>('manual');
  const [txId,    setTxId]    = useState('');
  const [desc,    setDesc]    = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const handleSave = async () => {
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) { setError("To'lov miqdorini kiriting"); return; }
    setSaving(true); setError('');
    try {
      const payload: RecordPaymentPayload = {
        amount: amt, method,
        ...(txId ? { transactionId: txId } : {}),
        ...(desc ? { description: desc } : {}),
      };
      await recordPayment(sub.tenantId, payload);
      // refresh subscription after payment
      const updated = await import('../api/billing.api').then((m) => m.getBilling(sub.tenantId));
      onSaved(updated);
      onClose();
    } catch { setError("To'lovni saqlashda xatolik"); }
    finally   { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="confirm-dialog" style={{ maxWidth: 420, width: '95vw' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 0.25rem' }}>To'lov qo'shish</h3>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{sub.tenantName}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Miqdor (UZS) *</label>
            <input
              className="input"
              type="number"
              min="0"
              placeholder="99000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>To'lov usuli</label>
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} style={{ width: '100%' }}>
              {(['click', 'payme', 'manual'] as PaymentMethod[]).map((m) => (
                <option key={m} value={m}>{METHOD_LABELS[m]}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Tranzaksiya ID (ixtiyoriy)</label>
            <input className="input" type="text" placeholder="TXN-12345" value={txId} onChange={(e) => setTxId(e.target.value)} style={{ width: '100%' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Izoh (ixtiyoriy)</label>
            <input className="input" type="text" placeholder="Oylik to'lov — iyun 2026" value={desc} onChange={(e) => setDesc(e.target.value)} style={{ width: '100%' }} />
          </div>
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: '0.75rem 0 0' }}>{error}</p>}

        <div className="confirm-actions" style={{ marginTop: '1.25rem' }}>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Bekor</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saqlanmoqda...' : '💳 To\'lovni saqlash'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Payment History Modal ────────────────────────────────────────────────────

function HistoryModal({ tenantId, tenantName, onClose }: { tenantId: string; tenantName: string; onClose: () => void }) {
  const [history,  setHistory]  = useState<PaymentHistoryItem[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    getPaymentHistory(tenantId)
      .then(setHistory)
      .finally(() => setLoading(false));
  }, [tenantId]);

  const STATUS_COLOR: Record<string, string> = { success: '#16a34a', pending: '#f59e0b', failed: '#ef4444' };
  const STATUS_LABEL: Record<string, string> = { success: 'Muvaffaq', pending: 'Kutilmoqda', failed: 'Xato' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="td-inner" style={{ maxWidth: 640, width: '95vw', maxHeight: '80vh', overflowY: 'auto', borderRadius: 14, background: 'var(--card-bg)', padding: '1.5rem' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>To'lovlar tarixi — {tenantName}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>
        {loading ? (
          <p className="state-msg">Yuklanmoqda...</p>
        ) : history.length === 0 ? (
          <p className="state-msg">To'lovlar mavjud emas</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Sana</th><th>Miqdor</th><th>Usul</th><th>Holat</th><th>Tranzaksiya</th></tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{fmtDate(h.paidAt ?? h.createdAt)}</td>
                    <td style={{ fontWeight: 600 }}>{fmtUzs(h.amount)}</td>
                    <td>{METHOD_LABELS[h.method]}</td>
                    <td><Badge label={STATUS_LABEL[h.status] ?? h.status} color={STATUS_COLOR[h.status] ?? '#6b7280'} /></td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{h.transactionId ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Billing() {
  const [subs,         setSubs]         = useState<Subscription[]>([]);
  const [stats,        setStats]        = useState<BillingStats | null>(null);
  const [pending,      setPending]      = useState<Subscription[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  // Modals
  const [planTarget,    setPlanTarget]    = useState<Subscription | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<Subscription | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Subscription | null>(null);

  // In-progress suspend/reactivate + approve/reject
  const [toggling,    setToggling]    = useState<Set<string>>(new Set());
  const [processing,  setProcessing]  = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [subsData, statsData, pendingData] = await Promise.all([
        getBillingAll(),
        getBillingStats(),
        getPendingRequests(),
      ]);
      setSubs(subsData);
      setStats(statsData);
      setPending(pendingData);
    } catch {
      setError("Ma'lumot yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateSub = (updated: Subscription) =>
    setSubs((prev) => prev.map((s) => s.tenantId === updated.tenantId ? { ...s, ...updated } : s));

  const handleApprove = async (sub: Subscription) => {
    setProcessing((p) => new Set(p).add(sub.tenantId));
    try {
      await approvePlanChange(sub.tenantId);
      setPending((prev) => prev.filter((r) => r.tenantId !== sub.tenantId));
      await load();
    } catch { /* silent */ }
    finally { setProcessing((p) => { const n = new Set(p); n.delete(sub.tenantId); return n; }); }
  };

  const handleReject = async (sub: Subscription) => {
    setProcessing((p) => new Set(p).add(sub.tenantId));
    try {
      await rejectPlanChange(sub.tenantId);
      setPending((prev) => prev.filter((r) => r.tenantId !== sub.tenantId));
    } catch { /* silent */ }
    finally { setProcessing((p) => { const n = new Set(p); n.delete(sub.tenantId); return n; }); }
  };

  const handleToggle = async (sub: Subscription) => {
    setToggling((p) => new Set(p).add(sub.tenantId));
    try {
      const updated = sub.status === 'suspended'
        ? await reactivateTenant(sub.tenantId)
        : await suspendTenant(sub.tenantId);
      updateSub({ ...sub, ...updated, tenantName: sub.tenantName });
    } catch { /* silent */ }
    finally {
      setToggling((p) => { const n = new Set(p); n.delete(sub.tenantId); return n; });
    }
  };

  // Stats derived values
  const totalMonthlyRevenue = useMemo(
    () => subs.filter((s) => s.status === 'active').reduce((sum, s) => sum + Number(s.priceUzs), 0),
    [subs],
  );

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Billing</h2>
        <button className="btn-secondary" onClick={load} style={{ fontSize: '0.82rem' }}>↻ Yangilash</button>
      </div>

      {error   && <p className="state-msg state-msg--error">{error}</p>}
      {loading && <p className="state-msg">Yuklanmoqda...</p>}

      {/* ══ SECTION 1: Stats bar ════════════════════════════════════════════ */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <StatCard label="Oylik daromad (MRR)"   value={fmtUzs(totalMonthlyRevenue)}  color="#16a34a" />
          <StatCard label="Faol obunalar"          value={stats?.activeCount    ?? 0}   color="#2563eb" />
          <StatCard label="Sinov davri"            value={stats?.trialCount     ?? 0}   color="#f59e0b" sub={`${stats?.overdueCount ?? 0} muddati o'tgan`} />
          <StatCard label="Bloklangan"             value={stats?.suspendedCount ?? 0}   color="#ef4444" />
        </div>
      )}

      {/* ══ PENDING REQUESTS section ════════════════════════════════════════ */}
      {!loading && pending.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            background: '#f59e0b11', border: '1px solid #f59e0b',
            borderRadius: '10px 10px 0 0',
            padding: '0.75rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <span style={{ fontSize: '1rem' }}>⏳</span>
            <span style={{ fontWeight: 600, color: '#f59e0b' }}>
              {pending.length} ta tarif o'zgartirish so'rovi kutilmoqda
            </span>
          </div>
          <div className="table-wrap" style={{ margin: 0, borderRadius: '0 0 10px 10px', border: '1px solid #f59e0b', borderTop: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Tenant nomi</th>
                  <th>Joriy tarif</th>
                  <th>So'ralgan tarif</th>
                  <th>So'rov vaqti</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((req) => {
                  const isProc = processing.has(req.tenantId);
                  const pendingColor = PLANS[req.pendingPlan!].color;
                  return (
                    <tr key={req.tenantId}>
                      <td style={{ fontWeight: 500 }}>{req.tenantName}</td>
                      <td><Badge label={PLANS[req.plan].label} color={PLANS[req.plan].color} /></td>
                      <td>
                        <Badge label={PLANS[req.pendingPlan!].label} color={pendingColor} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 6 }}>
                          {req.pendingCycle === 'yearly' ? 'Yillik' : 'Oylik'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {req.pendingRequestedAt ? new Date(req.pendingRequestedAt).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td>
                        <div className="action-btns">
                          <button
                            className="action-btn action-btn--view"
                            style={{ background: '#16a34a22', color: '#16a34a', borderColor: '#16a34a44' }}
                            disabled={isProc}
                            onClick={() => handleApprove(req)}
                          >
                            {isProc ? '...' : '✓ Tasdiqlash'}
                          </button>
                          <button
                            className="action-btn action-btn--delete"
                            disabled={isProc}
                            onClick={() => handleReject(req)}
                          >
                            {isProc ? '...' : '✗ Rad etish'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ SECTION 2: Subscriptions table ══════════════════════════════════ */}
      {!loading && !error && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Obunalar</h3>
          </div>
          <div className="table-wrap" style={{ margin: 0, borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Tenant nomi</th>
                  <th>Tarif</th>
                  <th>Holat</th>
                  <th>Foydalanuvchilar</th>
                  <th>API chaqiruvlar</th>
                  <th>Narx</th>
                  <th>Keyingi to'lov</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {subs.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      Obunalar mavjud emas
                    </td>
                  </tr>
                ) : subs.map((sub) => {
                  const uPct = usagePct(sub.currentUsers, sub.usersLimit);
                  const aPct = usagePct(sub.currentApiCalls, sub.apiCallsLimit);
                  const isToggling = toggling.has(sub.tenantId);

                  return (
                    <tr key={sub.id}>
                      {/* Tenant name */}
                      <td>
                        <button
                          className="tenant-name-link"
                          onClick={() => setHistoryTarget(sub)}
                          title="To'lovlar tarixini ko'rish"
                        >
                          {sub.tenantName}
                        </button>
                      </td>

                      {/* Plan */}
                      <td>
                        <Badge label={PLANS[sub.plan].label} color={PLANS[sub.plan].color} />
                      </td>

                      {/* Status */}
                      <td>
                        <Badge label={STATUS_LABELS[sub.status]} color={STATUS_COLORS[sub.status]} />
                      </td>

                      {/* Users */}
                      <td style={{ color: usageColor(uPct), fontVariantNumeric: 'tabular-nums' }}>
                        {sub.currentUsers} / {sub.usersLimit === 999 ? '∞' : sub.usersLimit}
                        {uPct >= 80 && <span style={{ fontSize: '0.7rem', marginLeft: 4 }}>({uPct}%)</span>}
                      </td>

                      {/* API calls */}
                      <td style={{ color: usageColor(aPct), fontVariantNumeric: 'tabular-nums', fontSize: '0.83rem' }}>
                        {fmt(sub.currentApiCalls)} / {sub.apiCallsLimit >= 999_999 ? '∞' : fmt(sub.apiCallsLimit)}
                        {aPct >= 80 && <span style={{ fontSize: '0.7rem', marginLeft: 4 }}>({aPct}%)</span>}
                      </td>

                      {/* Price */}
                      <td style={{ fontWeight: 600 }}>
                        {sub.priceUzs === 0 ? 'Bepul' : fmtUzs(sub.priceUzs)}
                        {sub.priceUzs > 0 && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>
                            /{sub.billingCycle === 'yearly' ? 'yil' : 'oy'}
                          </span>
                        )}
                      </td>

                      {/* Next payment */}
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {fmtDate(sub.nextPaymentAt)}
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="action-btns">
                          <button
                            className="action-btn action-btn--edit"
                            onClick={() => setPlanTarget(sub)}
                            title="Tarif o'zgartirish"
                          >
                            Tarif
                          </button>
                          <button
                            className="action-btn action-btn--view"
                            onClick={() => setPaymentTarget(sub)}
                            title="To'lov qo'shish"
                          >
                            To'lov
                          </button>
                          <button
                            className={`action-btn ${sub.status === 'suspended' ? 'action-btn--view' : 'action-btn--delete'}`}
                            disabled={isToggling}
                            onClick={() => handleToggle(sub)}
                            title={sub.status === 'suspended' ? 'Faollashtirish' : 'Bloklash'}
                          >
                            {isToggling ? '...' : sub.status === 'suspended' ? 'Faol' : 'Blok'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ SECTION 3: Plan change modal ════════════════════════════════════ */}
      {planTarget && (
        <PlanModal
          sub={planTarget}
          onClose={() => setPlanTarget(null)}
          onSaved={(updated) => {
            updateSub({ ...planTarget, ...updated, tenantName: planTarget.tenantName });
            load(); // refresh stats too
          }}
        />
      )}

      {/* ══ SECTION 4: Payment modal ════════════════════════════════════════ */}
      {paymentTarget && (
        <PaymentModal
          sub={paymentTarget}
          onClose={() => setPaymentTarget(null)}
          onSaved={(updated) => {
            updateSub({ ...paymentTarget, ...updated, tenantName: paymentTarget.tenantName });
            load();
          }}
        />
      )}

      {/* ══ Payment history modal ════════════════════════════════════════════ */}
      {historyTarget && (
        <HistoryModal
          tenantId={historyTarget.tenantId}
          tenantName={historyTarget.tenantName}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  );
}
