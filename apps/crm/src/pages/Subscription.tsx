import { useEffect, useState } from 'react';
import { useTenantStore } from '../stores/tenant.store';
import {
  BillingCycle, ClickPaymentResult, PaymentHistoryItem, PaymentHistoryStatus,
  PaymentMethod, PlanType, SubStatus, Subscription, UsageLimits,
  cancelPlanRequest, createClickPayment, createPaymePayment,
  getMyLimits, getMyPaymentHistory, getMySubscription, requestPlanChange,
} from '../api/billing.api';

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<PlanType, string> = {
  trial:   'Sinov',
  starter: 'Starter',
  pro:     'Pro',
};

const PLAN_COLORS: Record<PlanType, string> = {
  trial:   '#6b7280',
  starter: '#2563eb',
  pro:     '#7c3aed',
};

const STATUS_LABELS: Record<SubStatus, string> = {
  active:    'Faol',
  trial:     'Sinov davri',
  suspended: 'Bloklangan',
  cancelled: 'Bekor qilingan',
};

const STATUS_COLORS: Record<SubStatus, string> = {
  active:    '#16a34a',
  trial:     '#f59e0b',
  suspended: '#ef4444',
  cancelled: '#6b7280',
};

const CYCLE_LABELS: Record<string, string> = {
  monthly: 'Oylik',
  yearly:  'Yillik',
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  click:  'Click',
  payme:  'Payme',
  manual: "Qo'lda",
};

const PAY_STATUS_COLORS: Record<PaymentHistoryStatus, string> = {
  success: '#16a34a',
  pending: '#f59e0b',
  failed:  '#ef4444',
};

const PAY_STATUS_LABELS: Record<PaymentHistoryStatus, string> = {
  success: 'Muvaffaq',
  pending: 'Kutilmoqda',
  failed:  'Xato',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt     = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));
const fmtUzs  = (n: number) => `${fmt(n)} so'm`;
const fmtUsd  = (n: number) => n === 0 ? 'Bepul' : `$${n}`;
const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';
const fmtDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

function trialDaysLeft(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000));
}

function barColor(pct: number): string {
  if (pct >= 80) return '#ef4444';
  if (pct >= 60) return '#f59e0b';
  return '#16a34a';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '0.18rem 0.6rem',
      borderRadius: 99, fontSize: '0.76rem', fontWeight: 600,
      background: color + '22', color,
    }}>
      {label}
    </span>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
      <span style={{ color: 'var(--text-muted, #6b7280)', fontSize: '0.87rem' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{children}</span>
    </div>
  );
}

function ProgressBar({ label, current, limit, unit }: { label: string; current: number; limit: number; unit?: string }) {
  const isUnlimited = limit >= 999;
  const pct = isUnlimited ? 0 : (limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0);
  const color = barColor(pct);
  const fmtNum = (n: number) => new Intl.NumberFormat('uz-UZ').format(n);

  return (
    <div style={{ marginBottom: '1.1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.87rem' }}>
        <span style={{ fontWeight: 500 }}>{label}</span>
        {isUnlimited ? (
          <span style={{ color: '#16a34a', fontWeight: 600 }}>Cheksiz</span>
        ) : (
          <span style={{ color, fontWeight: 600 }}>
            {unit ? `${fmtNum(current)} / ${fmtNum(limit)} ${unit}` : `${fmtNum(current)} / ${fmtNum(limit)}`}
            <span style={{ fontSize: '0.74rem', marginLeft: 6, color: 'var(--text-muted)', fontWeight: 400 }}>
              ({pct}%)
            </span>
          </span>
        )}
      </div>
      {!isUnlimited && (
        <div style={{ height: 10, background: 'var(--border, #e2e8f0)', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 5, transition: 'width 0.4s ease' }} />
        </div>
      )}
    </div>
  );
}

// ─── Plan info (for upgrade modal) ───────────────────────────────────────────

const PLAN_ORDER: Record<PlanType, number> = { trial: 0, starter: 1, pro: 2 };

interface PlanMeta {
  label: string; color: string;
  users: number; apiCalls: number; storage: number;
  priceMonthly: number; priceYearly: number;
}

// Prices in UZS — must match PLAN_LIMITS in billing.service.ts
const PLAN_META: Record<PlanType, PlanMeta> = {
  trial:   { label: 'Sinov',   color: '#6b7280', users: 3,  apiCalls: 500,     storage: 500,    priceMonthly: 0,           priceYearly: 0           },
  starter: { label: 'Starter', color: '#2563eb', users: 10, apiCalls: 10_000,  storage: 2_000,  priceMonthly: 128_000,     priceYearly: 1_280_000   },
  pro:     { label: 'Pro',     color: '#7c3aed', users: 50, apiCalls: 100_000, storage: 10_000, priceMonthly: 640_000,     priceYearly: 6_400_000   },
};

const ALL_PLANS: PlanType[] = ['trial', 'starter', 'pro'];

// ─── Upgrade modal ────────────────────────────────────────────────────────────

type ModalStep = 'select' | 'payment';

interface UpgradeModalProps {
  sub:     Subscription;
  onClose: () => void;
  onDone:  (updated: Subscription) => void;
}

function UpgradeModal({ sub, onClose, onDone }: UpgradeModalProps) {
  const [step,       setStep]       = useState<ModalStep>('select');
  const [plan,       setPlan]       = useState<PlanType>(sub.plan);
  const [cycle,      setCycle]      = useState<BillingCycle>('monthly');
  const [saving,     setSaving]     = useState(false);
  const [payUrl,     setPayUrl]     = useState('');
  const [error,      setError]      = useState('');

  const meta      = PLAN_META[plan];
  const price     = cycle === 'yearly' ? meta.priceYearly : meta.priceMonthly;
  const canSelect = (p: PlanType) => PLAN_ORDER[p] > PLAN_ORDER[sub.plan];

  const handleContinue = async () => {
    setSaving(true); setError('');
    try {
      await requestPlanChange(sub.tenantId, plan, cycle);
      setStep('payment');
    } catch { setError("Xatolik yuz berdi. Qayta urinib ko'ring."); }
    finally   { setSaving(false); }
  };

  const handleClick = async () => {
    setSaving(true); setError('');
    try {
      const res: ClickPaymentResult = await createClickPayment(sub.tenantId, price, plan, cycle);
      setPayUrl(res.payment_url);
      window.open(res.payment_url, '_blank', 'noopener,noreferrer');
    } catch { setError("Click to'lov URL yaratishda xatolik."); }
    finally   { setSaving(false); }
  };

  const handlePayme = async () => {
    setSaving(true); setError('');
    try {
      const res = await createPaymePayment(sub.tenantId, price, plan, cycle);
      setPayUrl(res.payment_url);
      window.open(res.payment_url, '_blank', 'noopener,noreferrer');
    } catch { setError("Payme to'lov URL yaratishda xatolik."); }
    finally   { setSaving(false); }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--card-bg, #fff)', borderRadius: 14, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>
            {step === 'select' ? "Tarif rejasini o'zgartirish" : "To'lov usulini tanlang"}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* ── Step 1: Plan selection ── */}
        {step === 'select' && (
          <>
            {/* Plan cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.6rem', marginBottom: '1rem' }}>
              {ALL_PLANS.map((p) => {
                const m   = PLAN_META[p];
                const sel = plan === p;
                const dis = !canSelect(p);
                const pLabel = cycle === 'yearly' ? fmtUzs(m.priceYearly) : fmtUzs(m.priceMonthly);
                return (
                  <div
                    key={p}
                    onClick={() => !dis && setPlan(p)}
                    style={{
                      border:       `2px solid ${sel ? m.color : 'var(--border, #e2e8f0)'}`,
                      borderRadius: 10, padding: '0.7rem 0.8rem',
                      cursor:       dis ? 'not-allowed' : 'pointer',
                      opacity:      dis ? 0.45 : 1,
                      background:   sel ? m.color + '11' : 'transparent',
                      transition:   'border-color 0.15s, background 0.15s',
                      position:     'relative',
                    }}
                  >
                    {p === sub.plan && (
                      <span style={{ position: 'absolute', top: 6, right: 6, fontSize: '0.65rem', background: m.color + '22', color: m.color, borderRadius: 99, padding: '0.1rem 0.35rem', fontWeight: 700 }}>
                        Joriy
                      </span>
                    )}
                    <div style={{ fontWeight: 700, color: m.color, marginBottom: 3 }}>{m.label}</div>
                    <div style={{ fontSize: '0.77rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                      {m.users === 999 ? 'Cheksiz' : m.users} xodim<br />
                      {new Intl.NumberFormat('uz-UZ').format(m.apiCalls)} API<br />
                      {m.storage >= 1000 ? `${m.storage / 1000} GB` : `${m.storage} MB`}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: m.color, marginTop: '0.35rem' }}>
                      {pLabel}{m.priceMonthly > 0 ? (cycle === 'monthly' ? '/oy' : '/yil') : ''}
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
                    flex: 1, padding: '0.45rem', borderRadius: 8, cursor: 'pointer',
                    border:     `2px solid ${cycle === c ? 'var(--primary, #2563eb)' : 'var(--border, #e2e8f0)'}`,
                    background: cycle === c ? 'var(--primary-bg, #2563eb11)' : 'transparent',
                    fontWeight: cycle === c ? 700 : 400,
                    color:      cycle === c ? 'var(--primary, #2563eb)' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  }}
                >
                  {c === 'monthly' ? 'Oylik' : 'Yillik'}
                  {c === 'yearly' && (
                    <span style={{ fontSize: '0.68rem', background: '#16a34a22', color: '#16a34a', borderRadius: 99, padding: '0.1rem 0.35rem', fontWeight: 700 }}>
                      2 oy bepul
                    </span>
                  )}
                </button>
              ))}
            </div>

            {error && <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: '0 0 0.75rem' }}>{error}</p>}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn-secondary"
                onClick={onClose}
                style={{ flex: 1 }}
              >
                Bekor
              </button>
              <button
                className="btn-primary"
                style={{ flex: 2 }}
                disabled={saving || !canSelect(plan)}
                onClick={handleContinue}
              >
                {saving ? 'Yuklanmoqda...' : "So'rov yuborish →"}
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: Payment method ── */}
        {step === 'payment' && (
          <>
            <div style={{ background: 'var(--bg, #f8fafc)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.87rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tarif:</span>
                <span style={{ fontWeight: 700, color: PLAN_META[plan].color }}>{PLAN_META[plan].label}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Narx:</span>
                <span style={{ fontWeight: 700 }}>{price === 0 ? 'Bepul' : fmtUzs(price)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Davr:</span>
                <span>{cycle === 'yearly' ? 'Yillik' : 'Oylik'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
              <button
                className="btn-primary"
                style={{ padding: '0.75rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                disabled={saving}
                onClick={handleClick}
              >
                <span style={{ fontWeight: 800 }}>CLICK</span> orqali to'lash
              </button>
              <button
                className="btn-secondary"
                style={{ padding: '0.75rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                disabled={saving}
                onClick={handlePayme}
              >
                <span style={{ fontWeight: 800, color: '#00bcd4' }}>Payme</span> orqali to'lash
              </button>
            </div>

            {payUrl && (
              <div style={{ background: '#16a34a11', border: '1px solid #16a34a', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text)', marginBottom: '0.75rem' }}>
                To'lov sahifasi yangi oynada ochildi.
                <br />
                <span style={{ color: 'var(--text-muted)' }}>To'lov amalga oshgach, admin tasdiqlaydi va tarif yangilanadi.</span>
              </div>
            )}

            {error && <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: '0 0 0.75rem' }}>{error}</p>}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-secondary" onClick={() => setStep('select')} style={{ flex: 1 }}>← Orqaga</button>
              <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Yopish</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SubscriptionPage() {
  const tenantId = useTenantStore((s) => s.tenantId);

  const [sub,          setSub]          = useState<Subscription | null>(null);
  const [limits,       setLimits]       = useState<UsageLimits | null>(null);
  const [history,      setHistory]      = useState<PaymentHistoryItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [showUpgrade,  setShowUpgrade]  = useState(false);
  const [cancelling,   setCancelling]   = useState(false);

  const reload = () => {
    if (!tenantId) return;
    setLoading(true);
    setError('');
    Promise.all([
      getMySubscription(tenantId),
      getMyLimits(tenantId),
      getMyPaymentHistory(tenantId),
    ])
      .then(([s, l, h]) => { setSub(s); setLimits(l); setHistory(h); })
      .catch(() => setError("Ma'lumot yuklab bo'lmadi"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancelRequest = async () => {
    if (!sub) return;
    setCancelling(true);
    try {
      const updated = await cancelPlanRequest(sub.tenantId);
      setSub((prev) => prev ? { ...prev, ...updated } : prev);
    } catch { /* silent */ }
    finally { setCancelling(false); }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header"><h2 className="page-title">Obuna & To'lov</h2></div>
        <p className="state-msg">Yuklanmoqda...</p>
      </div>
    );
  }

  if (error || !sub) {
    return (
      <div className="page">
        <div className="page-header"><h2 className="page-title">Obuna & To'lov</h2></div>
        <p className="state-msg">{error || "Ma'lumot topilmadi"}</p>
      </div>
    );
  }

  const planColor = PLAN_COLORS[sub.plan];
  const daysLeft  = trialDaysLeft(sub.trialEndsAt);

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Obuna & To'lov</h2>
        {sub.status !== 'suspended' && !sub.pendingPlan && (
          <button className="btn-primary" onClick={() => setShowUpgrade(true)} style={{ fontSize: '0.85rem' }}>
            ↑ Tarif o'zgartirish
          </button>
        )}
      </div>

      {/* ══ PENDING REQUEST banner ══════════════════════════════════════════ */}
      {sub.pendingPlan && (
        <div style={{
          background: '#f59e0b11', border: '1px solid #f59e0b',
          borderRadius: 10, padding: '0.85rem 1.25rem', marginBottom: '1.25rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem',
        }}>
          <div>
            <span>
              Siz{' '}
              <Badge label={PLAN_LABELS[sub.pendingPlan]} color={PLAN_COLORS[sub.pendingPlan]} />
              {' '}tarifiga o'tish so'rovi yubordingiz — <strong>admin ko'rib chiqmoqda</strong>
            </span>
          </div>
          <button
            className="btn-secondary"
            style={{ fontSize: '0.82rem' }}
            disabled={cancelling}
            onClick={handleCancelRequest}
          >
            {cancelling ? '...' : 'Bekor qilish'}
          </button>
        </div>
      )}

      {/* ══ SECTION 3: Suspended warning (shown prominently at top) ═══════════ */}
      {sub.status === 'suspended' && (
        <div style={{
          background: '#ef444411',
          border: '2px solid #ef4444',
          borderRadius: 12,
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start',
        }}>
          <div>
            <h3 style={{ margin: '0 0 0.35rem', color: '#ef4444', fontSize: '1.05rem' }}>
              Hisobingiz bloklangan
            </h3>
            <p style={{ margin: '0 0 0.5rem', color: 'var(--text-muted)', fontSize: '0.87rem' }}>
              Obuna to'lovi amalga oshirilmagan yoki muammo yuzaga kelgan. Hizmatdan foydalanishni davom ettirish uchun iltimos admin bilan bog'laning.
            </p>
            <p style={{ margin: 0, fontSize: '0.87rem' }}>
              <a href="mailto:admin@xmasistent.uz" style={{ color: '#ef4444', fontWeight: 600 }}>admin@xmasistent.uz</a>
            </p>
          </div>
        </div>
      )}

      {/* ══ SECTION 1: Current plan ══════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: planColor }}>{PLAN_LABELS[sub.plan]}</span>
            <Badge label={PLAN_LABELS[sub.plan]} color={planColor} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {sub.status === 'trial' ? (
              <Badge label={`Sinov — ${daysLeft} kun qoldi`} color="#f59e0b" />
            ) : (
              <Badge label={STATUS_LABELS[sub.status]} color={STATUS_COLORS[sub.status]} />
            )}
          </div>
        </div>

        <div style={{ borderRadius: 8, overflow: 'hidden' }}>
          <InfoRow label="Tarif rejasi">
            <Badge label={PLAN_LABELS[sub.plan]} color={planColor} />
          </InfoRow>
          <InfoRow label="To'lov davri">
            {CYCLE_LABELS[sub.billingCycle] ?? sub.billingCycle}
          </InfoRow>
          <InfoRow label="Narx">
            {sub.priceUzs > 0 ? (
              <span style={{ fontWeight: 700, color: planColor }}>
                {fmtUzs(sub.priceUzs)}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>
                  /{sub.billingCycle === 'yearly' ? 'yil' : 'oy'}
                </span>
              </span>
            ) : (
              <span style={{ color: '#16a34a', fontWeight: 700 }}>Bepul</span>
            )}
          </InfoRow>
          <InfoRow label="Joriy davr">
            {fmtDate(sub.currentPeriodStart)} → {fmtDate(sub.currentPeriodEnd)}
          </InfoRow>
          {sub.trialEndsAt && sub.status === 'trial' && (
            <InfoRow label="Sinov tugaydi">
              <span style={{ color: daysLeft <= 3 ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>
                {fmtDate(sub.trialEndsAt)} ({daysLeft} kun qoldi)
              </span>
            </InfoRow>
          )}
          <InfoRow label="Keyingi to'lov">
            {sub.nextPaymentAt ? (
              <span style={{ color: new Date(sub.nextPaymentAt) < new Date() ? '#ef4444' : 'inherit' }}>
                {fmtDate(sub.nextPaymentAt)}
              </span>
            ) : '—'}
          </InfoRow>
          {sub.lastPaymentAt && (
            <InfoRow label="Oxirgi to'lov">
              {fmtDate(sub.lastPaymentAt)}
              {sub.lastPaymentAmount != null && (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.83rem', marginLeft: 6 }}>
                  ({fmtUzs(sub.lastPaymentAmount)})
                </span>
              )}
            </InfoRow>
          )}
        </div>
      </div>

      {/* ══ SECTION 2: Usage limits ══════════════════════════════════════════ */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1.1rem', fontSize: '0.95rem', fontWeight: 600 }}>Foydalanish chegaralari</h3>

        <ProgressBar
          label="Foydalanuvchilar"
          current={limits?.percentages.users !== undefined ? sub.currentUsers : 0}
          limit={sub.usersLimit}
        />
        <ProgressBar
          label="API chaqiruvlar (oylik)"
          current={sub.currentApiCalls}
          limit={sub.apiCallsLimit}
        />
        <ProgressBar
          label="Xotira"
          current={0}
          limit={sub.storageLimit}
          unit="MB"
        />

        {limits && (
          <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: 'var(--bg, #f8fafc)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {!limits.usersOk && <div style={{ color: '#ef4444' }}>Foydalanuvchilar chegarasiga yetdingiz</div>}
            {!limits.apiCallsOk && <div style={{ color: '#ef4444', marginTop: 2 }}>API chaqiruvlar chegarasiga yetdingiz</div>}
            {limits.usersOk && limits.apiCallsOk && <div style={{ color: '#16a34a' }}>✓ Barcha ko'rsatkichlar normal</div>}
          </div>
        )}
      </div>

      {/* ══ SECTION 4: Payment history ══════════════════════════════════════ */}
      <div className="card">
        <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 600 }}>To'lovlar tarixi</h3>

        {history.length === 0 ? (
          <p className="state-msg" style={{ textAlign: 'left', padding: 0, margin: 0 }}>To'lov tarixi mavjud emas</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Miqdor</th>
                  <th>Usul</th>
                  <th>Holat</th>
                  <th>Tranzaksiya ID</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                      {fmtDateTime(h.paidAt ?? h.createdAt)}
                    </td>
                    <td style={{ fontWeight: 600 }}>{fmtUzs(h.amount)}</td>
                    <td>{METHOD_LABELS[h.method]}</td>
                    <td>
                      <Badge
                        label={PAY_STATUS_LABELS[h.status]}
                        color={PAY_STATUS_COLORS[h.status]}
                      />
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {h.transactionId ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ UPGRADE MODAL ═══════════════════════════════════════════════════ */}
      {showUpgrade && (
        <UpgradeModal
          sub={sub}
          onClose={() => setShowUpgrade(false)}
          onDone={(updated) => {
            setSub((prev) => prev ? { ...prev, ...updated } : prev);
            setShowUpgrade(false);
          }}
        />
      )}
    </div>
  );
}
