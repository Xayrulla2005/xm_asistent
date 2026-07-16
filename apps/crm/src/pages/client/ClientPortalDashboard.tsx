import { FormEvent, lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getStoredToken, getStoredCustomer, clearSession,
  getPortalProfile, getPortalPage, updatePortalProfile,
  getPortalPurchases, getPortalDebts,
  PortalCustomer, PortalSale, PortalDebt, PortalTenant,
} from '../../api/client-portal.api';

const BeautyPortalDashboard  = lazy(() => import('./portals/BeautyPortalDashboard'));
const FitnessPortalDashboard = lazy(() => import('./portals/FitnessPortalDashboard'));
const ClinicPortalDashboard  = lazy(() => import('./portals/ClinicPortalDashboard'));

type Tab = 'purchases' | 'debts' | 'profile';

const PAY_LABEL: Record<string, string> = {
  cash: 'Naqd', card: 'Karta', credit: 'Nasiya',
  mixed: 'Aralash', partial: 'Qisman', transfer: "O'tkazma",
};

const DEBT_STATUS_LABEL: Record<string, string> = {
  pending: 'Kutilmoqda', partial: "Qisman to'langan",
  paid: "To'langan", cancelled: 'Bekor',
};

const fmt       = (n: number) => Number(n).toLocaleString('uz-UZ') + " so'm";
const fmtDate   = (s: string) =>
  new Date(s).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtTime   = (s: string) =>
  new Date(s).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

// Bonus level based on total purchases
function getBonusLevel(total: number) {
  if (total >= 10_000_000) return { name: 'VIP',       color: '#f59e0b', min: 10_000_000 };
  if (total >= 3_000_000)  return { name: 'Gold',      color: '#eab308', min: 3_000_000  };
  if (total >= 1_000_000)  return { name: 'Silver',    color: '#94a3b8', min: 1_000_000  };
  return                          { name: 'Standart',  color: '#6366f1', min: 0           };
}

export default function ClientPortalDashboard() {
  const { slug }   = useParams<{ slug: string }>();
  const navigate   = useNavigate();

  const [customer,   setCustomer]   = useState<PortalCustomer | null>(getStoredCustomer(slug ?? ''));
  const [tenant,     setTenant]     = useState<PortalTenant | null>(null);
  const [purchases,  setPurchases]  = useState<PortalSale[]>([]);
  const [debts,      setDebts]      = useState<PortalDebt[]>([]);
  const [tab,        setTab]        = useState<Tab>('purchases');
  const [loading,    setLoading]    = useState(true);
  const [expandedSale, setExpanded] = useState<string | null>(null);

  // Profile edit
  const [editMode,   setEditMode]   = useState(false);
  const [editName,   setEditName]   = useState('');
  const [editAddr,   setEditAddr]   = useState('');
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState('');

  const token = getStoredToken(slug ?? '');

  // Auth guard
  useEffect(() => {
    if (!token) navigate(`/client/${slug}/login`, { replace: true });
  }, [token, navigate, slug]);

  // Fetch data
  useEffect(() => {
    if (!token || !slug) return;
    setLoading(true);
    Promise.all([
      getPortalProfile(token),
      getPortalPurchases(token),
      getPortalDebts(token),
      getPortalPage(slug).catch(() => null),
    ])
      .then(([prof, sales, dts, page]) => {
        setCustomer(prof);
        setPurchases(sales);
        setDebts(dts);
        if (page?.tenant) setTenant(page.tenant);
      })
      .catch(() => {
        clearSession(slug);
        navigate(`/client/${slug}/login`, { replace: true });
      })
      .finally(() => setLoading(false));
  }, [token, slug]);

  const handleLogout = () => {
    if (!slug) return;
    clearSession(slug);
    navigate(`/client/${slug}`, { replace: true });
  };

  const startEdit = () => {
    setEditName(customer?.name ?? '');
    setEditAddr(customer?.address ?? '');
    setSaveError('');
    setEditMode(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true); setSaveError('');
    try {
      const updated = await updatePortalProfile(token, { name: editName, address: editAddr });
      setCustomer((c) => c ? { ...c, ...updated } : c);
      setEditMode(false);
    } catch {
      setSaveError('Saqlashda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  if (!customer) return null;

  const totalPurchased = purchases
    .filter((s) => s.status !== 'cancelled')
    .reduce((sum, s) => sum + Number(s.totalAmount), 0);
  const activeDebts    = debts.filter((d) => d.status === 'pending' || d.status === 'partial');
  const totalDebt      = activeDebts.reduce((sum, d) => sum + Number(d.remainingAmount), 0);
  const level          = getBonusLevel(totalPurchased);

  return (
    <div className="cp-dash">

      {/* Top bar */}
      <header className="cp-dash-header">
        <div className="cp-dash-brand">XM Portal</div>
        <button className="cp-logout-btn" onClick={handleLogout}>Chiqish</button>
      </header>

      {loading ? (
        <div className="cp-full-center"><div className="cp-spinner" /></div>
      ) : (
        <main className="cp-dash-main">

          {/* Profile card */}
          <div className="cp-profile-card">
            <div className="cp-avatar-lg">{customer.name[0].toUpperCase()}</div>
            <div className="cp-profile-info">
              <div className="cp-profile-name">{customer.name}</div>
              <div className="cp-profile-phone">{customer.phone}</div>
              <span className="cp-level-badge" style={{ background: level.color + '22', color: level.color, borderColor: level.color + '44' }}>
                {level.name}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="cp-stats-row">
            <div className="cp-stat-box">
              <div className="cp-stat-val">{purchases.length}</div>
              <div className="cp-stat-lbl">Xaridlar</div>
            </div>
            <div className="cp-stat-box">
              <div className="cp-stat-val cp-stat-val--green">{fmt(totalPurchased)}</div>
              <div className="cp-stat-lbl">Jami xarid</div>
            </div>
            <div className={`cp-stat-box${totalDebt > 0 ? ' cp-stat-box--danger' : ''}`}>
              <div className={`cp-stat-val${totalDebt > 0 ? ' cp-stat-val--red' : ''}`}>
                {totalDebt > 0 ? fmt(totalDebt) : '—'}
              </div>
              <div className="cp-stat-lbl">Qarz</div>
            </div>
          </div>

          {/* Industry-specific dashboards */}
          {(tenant?.industry === 'beauty' || tenant?.industry === 'fitness' || tenant?.industry === 'clinic') && slug && token && (
            <div style={{ marginTop: '0.5rem' }}>
              <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Yuklanmoqda...</div>}>
                {tenant.industry === 'beauty' && (
                  <BeautyPortalDashboard
                    token={token}
                    slug={slug}
                    color={tenant.primaryColor ?? '#ec4899'}
                  />
                )}
                {tenant.industry === 'fitness' && (
                  <FitnessPortalDashboard
                    token={token}
                    slug={slug}
                    color={tenant.primaryColor ?? '#10b981'}
                  />
                )}
                {tenant.industry === 'clinic' && (
                  <ClinicPortalDashboard
                    token={token}
                    color={tenant.primaryColor ?? '#6366f1'}
                  />
                )}
              </Suspense>
            </div>
          )}

          {/* Tabs — shown for retail and other non-specialized industries */}
          {(!tenant?.industry || (tenant.industry !== 'beauty' && tenant.industry !== 'fitness' && tenant.industry !== 'clinic')) && (<>
          <div className="cp-tabs">
            {(['purchases', 'debts', 'profile'] as Tab[]).map((t) => (
              <button
                key={t}
                className={`cp-tab${tab === t ? ' cp-tab--active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t === 'purchases' ? 'Xaridlar'
                 : t === 'debts'   ? `Qarzlar${activeDebts.length > 0 ? ` (${activeDebts.length})` : ''}`
                 : 'Profil'}
              </button>
            ))}
          </div>

          {/* ── Xaridlar ─────────────────────────────────────────────────────── */}
          {tab === 'purchases' && (
            <div className="cp-list">
              {purchases.length === 0 ? (
                <div className="cp-empty">Hali xarid yo'q</div>
              ) : purchases.map((s) => {
                const isExp = expandedSale === s.id;
                return (
                  <div key={s.id} className="cp-sale-card">
                    <div className="cp-sale-head" onClick={() => setExpanded(isExp ? null : s.id)}>
                      <div className="cp-sale-icon">
                        {s.paymentType === 'credit' || s.paymentType === 'partial' ? '◈' : '◇'}
                      </div>
                      <div className="cp-sale-mid">
                        <div className="cp-sale-num">#{s.id.slice(-8).toUpperCase()}</div>
                        <div className="cp-sale-date">{fmtDate(s.createdAt)} {fmtTime(s.createdAt)}</div>
                      </div>
                      <div className="cp-sale-right">
                        <div className="cp-sale-amount">{fmt(Number(s.totalAmount))}</div>
                        <span className={`cp-badge${s.status === 'cancelled' ? ' cp-badge--red' : ''}`}>
                          {PAY_LABEL[s.paymentType] ?? s.paymentType}
                        </span>
                      </div>
                      <span className="cp-chevron">{isExp ? '∧' : '∨'}</span>
                    </div>
                    {isExp && (
                      <div className="cp-sale-body">
                        {s.items.map((item, i) => (
                          <div key={i} className="cp-item-row">
                            <span className="cp-item-name">{item.name}</span>
                            <span className="cp-item-qty">{item.quantity} ta</span>
                            <span className="cp-item-price">{fmt(item.price * item.quantity)}</span>
                          </div>
                        ))}
                        <div className="cp-sale-total">
                          <span>Jami:</span>
                          <strong>{fmt(Number(s.totalAmount))}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Qarzlar ──────────────────────────────────────────────────────── */}
          {tab === 'debts' && (
            <div className="cp-list">
              {debts.length === 0 ? (
                <div className="cp-empty">Qarz yo'q</div>
              ) : debts.map((d) => {
                const isPaid  = d.status === 'paid';
                const isCanc  = d.status === 'cancelled';
                return (
                  <div key={d.id} className={`cp-debt-card${isPaid ? ' cp-debt-card--paid' : ''}`}>
                    <div className="cp-debt-row">
                      <div>
                        <div className="cp-debt-id">#{d.saleId.slice(-8).toUpperCase()}</div>
                        <div className="cp-debt-date">{fmtDate(d.createdAt)}</div>
                      </div>
                      <div className="cp-debt-right">
                        <div className={`cp-debt-amount${isPaid || isCanc ? ' cp-debt-amount--muted' : ' cp-debt-amount--red'}`}>
                          {fmt(Number(d.remainingAmount))}
                        </div>
                        <span className={`cp-badge${isPaid ? ' cp-badge--green' : isCanc ? ' cp-badge--muted' : ' cp-badge--red'}`}>
                          {DEBT_STATUS_LABEL[d.status] ?? d.status}
                        </span>
                      </div>
                    </div>
                    {Number(d.originalAmount) !== Number(d.remainingAmount) && !isPaid && (
                      <div className="cp-debt-orig">
                        Asl qarz: {fmt(Number(d.originalAmount))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Profil ───────────────────────────────────────────────────────── */}
          {tab === 'profile' && (
            <div className="cp-profile-tab">
              {!editMode ? (
                <>
                  <div className="cp-profile-field">
                    <span className="cp-profile-field-lbl">Ism</span>
                    <span className="cp-profile-field-val">{customer.name}</span>
                  </div>
                  <div className="cp-profile-field">
                    <span className="cp-profile-field-lbl">Telefon</span>
                    <span className="cp-profile-field-val">{customer.phone}</span>
                  </div>
                  <div className="cp-profile-field">
                    <span className="cp-profile-field-lbl">Manzil</span>
                    <span className="cp-profile-field-val">{customer.address || '—'}</span>
                  </div>
                  <div className="cp-profile-field">
                    <span className="cp-profile-field-lbl">Daraja</span>
                    <span className="cp-level-badge" style={{ background: level.color + '22', color: level.color }}>
                      {level.name}
                    </span>
                  </div>
                  <button className="cp-btn cp-btn--outline cp-btn--full" onClick={startEdit}>
                    Tahrirlash
                  </button>
                </>
              ) : (
                <form onSubmit={handleSave} className="cp-edit-form">
                  {saveError && <div className="cp-auth-error">{saveError}</div>}
                  <div className="cp-field">
                    <label className="cp-label">Ism</label>
                    <input
                      className="cp-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="cp-field">
                    <label className="cp-label">Manzil</label>
                    <input
                      className="cp-input"
                      value={editAddr}
                      onChange={(e) => setEditAddr(e.target.value)}
                      placeholder="Toshkent, Chilonzor"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" className="cp-btn cp-btn--outline" style={{ flex: 1 }}
                      onClick={() => setEditMode(false)}>
                      Bekor
                    </button>
                    <button type="submit" className="cp-btn cp-btn--primary" style={{ flex: 1 }}
                      disabled={saving}>
                      {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
          </>)}

        </main>
      )}
    </div>
  );
}
