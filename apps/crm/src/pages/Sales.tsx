import { useCallback, useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import {
  getSales, getReceipt, getAllReturns, updateReturnStatus,
  Sale, SaleItem, ReceiptData, SaleReturn,
} from '../api/sales.api';
import { useTenantStore } from '../stores/tenant.store';
import { useFeaturesStore } from '../stores/features.store';
import ReceiptModal from '../components/ReceiptModal';
import UpgradeBanner from '../components/UpgradeBanner';

type AuditTab = 'all' | 'sales' | 'returns' | 'system';

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Naqd', card: 'Karta', credit: 'Nasiya',
  mixed: 'Aralash', partial: 'Qisman', transfer: "O'tkazma",
};

function fmtDate(iso: string): string {
  const d   = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day   = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff  = today.getTime() - day.getTime();
  if (diff === 0) return 'BUGUN';
  if (diff === 86_400_000) return 'KECHA';
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}

function fmtMoney(n: number): string {
  return n.toLocaleString('uz-UZ') + " so'm";
}

function groupByDate<T extends { createdAt: string }>(list: T[]): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const item of list) {
    const key = fmtDate(item.createdAt);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries());
}

// Unified event type for the "Barchasi" timeline
interface TimelineEvent {
  id:        string;
  createdAt: string; // alias of time, required for groupByDate
  type:      'sale' | 'return';
  title:     string;
  person:    string;
  time:      string;
  amount:    number;
  status:    string;
  color:     string;
  raw:       Sale | SaleReturn;
}

function buildTimeline(sales: Sale[], returns: SaleReturn[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  for (const s of sales) {
    events.push({
      id: s.id, type: 'sale',
      createdAt: s.createdAt,
      title: 'Sotuv',
      person: s.customerName || 'Noma\'lum',
      time: s.createdAt,
      amount: Number(s.totalAmount),
      status: s.status,
      color: s.status === 'cancelled' ? '#ef4444' : s.status === 'completed' ? '#10b981' : '#f59e0b',
      raw: s,
    });
  }
  for (const r of returns) {
    if (r.status !== 'approved') continue; // pending/rejected stay only in Qaytarishlar tab
    const ts = typeof r.createdAt === 'string' ? r.createdAt : (r.createdAt as Date).toISOString();
    events.push({
      id: r.id, type: 'return',
      createdAt: ts,
      title: 'Qaytarish (tasdiqlangan)',
      person: '—',
      time: ts,
      amount: Number(r.totalRefund),
      status: r.status,
      color: '#10b981',
      raw: r,
    });
  }
  events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  return events;
}

const STATUS_LABEL: Record<string, string> = {
  completed: "To'langan",
  pending:   'Kutilmoqda',
  cancelled: 'Bekor',
  approved:  'Tasdiqlandi',
  rejected:  'Rad etildi',
};

const RETURN_STATUS_CLS: Record<string, string> = {
  pending:  'badge--warning',
  approved: 'badge--active',
  rejected: 'badge--inactive',
};

export default function Sales() {
  const tenantId   = useTenantStore((s) => s.tenantId);
  const hasFeature = useFeaturesStore((s) => s.hasFeature);

  const isStarter       = hasFeature('sales_date_filter');  // Starter+
  const canReturns      = hasFeature('sales_returns_view'); // Pro
  const canApprove      = hasFeature('sales_return_approve');
  const canReceiptView  = hasFeature('sales_receipt_view');
  const canSystemLog    = hasFeature('sales_system_log');

  const [tab,      setTab]      = useState<AuditTab>('all');

  // Reset to 'all' if current tab becomes locked (plan downgrade)
  useEffect(() => {
    if ((tab === 'sales' && !isStarter) || ((tab === 'returns' || tab === 'system') && !canReturns)) {
      setTab('all');
    }
  }, [isStarter, canReturns]);
  const [sales,    setSales]    = useState<Sale[]>([]);
  const [returns,  setReturns]  = useState<SaleReturn[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');

  // Receipt modal
  const [receipt,      setReceipt]      = useState<ReceiptData | null>(null);
  const [receiptLoad,  setReceiptLoad]  = useState(false);
  const [showReceipt,  setShowReceipt]  = useState(false);

  // Return detail modal
  const [detailReturn, setDetailReturn] = useState<SaleReturn | null>(null);
  const [approving,    setApproving]    = useState(false);

  // Sale detail modal
  const [detailSale, setDetailSale] = useState<Sale | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([
        getSales(tenantId),
        canReturns ? getAllReturns(tenantId) : Promise.resolve([]),
      ]);
      setSales(s);
      setReturns(r);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [tenantId, canReturns]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openReceipt = async (saleId: string) => {
    setReceiptLoad(true);
    try {
      const r = await getReceipt(saleId);
      setReceipt(r);
      setShowReceipt(true);
    } catch { alert("Chekni yuklashda xatolik"); }
    finally { setReceiptLoad(false); }
  };

  const handleReturnAction = async (id: string, status: 'approved' | 'rejected') => {
    setApproving(true);
    try {
      await updateReturnStatus(id, status);
      setDetailReturn(null);
      fetchAll();
    } catch { alert('Xatolik yuz berdi'); }
    finally { setApproving(false); }
  };

  // ── Filtered data ──────────────────────────────────────────────────────────

  const q = search.toLowerCase();

  const filteredSales = sales.filter((s) =>
    !q || s.id.toLowerCase().includes(q) || s.customerName.toLowerCase().includes(q)
  );

  const filteredReturns = returns.filter((r) =>
    !q || r.id.toLowerCase().includes(q) || r.saleId.toLowerCase().includes(q)
  );

  const timeline = buildTimeline(filteredSales, filteredReturns);
  const totalCount = sales.length + returns.length;

  // ── Tabs config ────────────────────────────────────────────────────────────

  const TABS: { key: AuditTab; label: string; count?: number; requireStarter?: boolean; requirePro?: boolean }[] = [
    { key: 'all',     label: 'Barchasi',     count: totalCount },
    { key: 'sales',   label: 'Sotuvlar',     count: isStarter ? sales.length : undefined,     requireStarter: true },
    { key: 'returns', label: 'Qaytarishlar', count: canReturns ? returns.length : undefined,  requirePro: true },
    { key: 'system',  label: 'Tizim',        requirePro: true },
  ];

  // ── Renders ────────────────────────────────────────────────────────────────

  function renderDateGroup<T extends { id: string; createdAt: string }>(
    groups: [string, T[]][],
    renderItem: (item: T) => React.ReactNode,
  ) {
    if (groups.length === 0) return <p className="state-msg">Yozuvlar yo'q</p>;
    return (
      <>
        {groups.map(([date, items]) => (
          <div key={date}>
            <div className="audit-date-header">
              <span className="audit-date-label">{date}</span>
              <span className="audit-date-count">{items.length} ta</span>
            </div>
            <div className="audit-group">
              {items.map(renderItem)}
            </div>
          </div>
        ))}
      </>
    );
  }

  // ── All tab: unified timeline ──────────────────────────────────────────────

  function renderAllTab() {
    const grouped = groupByDate(timeline);
    return renderDateGroup(grouped, (ev) => (
      <div key={ev.id} className="audit-event" onClick={() => {
        if (ev.type === 'sale') setDetailSale(ev.raw as Sale);
        else setDetailReturn(ev.raw as SaleReturn);
      }}>
        <div className="audit-event-icon" style={{ background: `${ev.color}18`, color: ev.color }}>
          {ev.type === 'sale' ? '↗' : '↩'}
        </div>
        <div className="audit-event-body">
          <div className="audit-event-title">{ev.title}</div>
          <div className="audit-event-meta">
            <span>{ev.person}</span>
            <span className="audit-dot">·</span>
            <span>{fmtTime(ev.time)}</span>
          </div>
        </div>
        <div className="audit-event-right">
          <span style={{ color: ev.color, fontWeight: 700, fontSize: '0.9rem' }}>
            {fmtMoney(ev.amount)}
          </span>
          <span className={`badge ${ev.status === 'completed' || ev.status === 'approved' ? 'badge--active' : ev.status === 'pending' ? 'badge--warning' : 'badge--inactive'}`} style={{ fontSize: '0.7rem' }}>
            {STATUS_LABEL[ev.status] ?? ev.status}
          </span>
        </div>
      </div>
    ));
  }

  // ── Sotuvlar tab ──────────────────────────────────────────────────────────

  function renderSalesTab() {
    if (!isStarter) return <UpgradeBanner feature="Sotuvlar jurnali" requiredPlan="STARTER" compact />;
    const grouped = groupByDate(filteredSales);
    return renderDateGroup(grouped, (s) => {
      const isPaid = s.status === 'completed';
      const isCanc = s.status === 'cancelled';
      return (
        <div key={s.id} className="audit-sale-card" onClick={() => setDetailSale(s)}>
          <div className="audit-sale-meta">
            <span className="audit-sale-id">#{s.id.slice(0, 8).toUpperCase()}</span>
            <span className={`badge ${isPaid ? 'badge--active' : isCanc ? 'badge--inactive' : 'badge--warning'}`} style={{ fontSize: '0.72rem' }}>
              {STATUS_LABEL[s.status]}
            </span>
            <span className="text-muted" style={{ fontSize: '0.78rem' }}>{fmtTime(s.createdAt)}</span>
          </div>
          <div className="audit-sale-body">
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.85rem' }}>
                {s.customerName || 'Noma\'lum mijoz'}
              </div>
              <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                {s.items.slice(0, 2).map((i) => i.name).join(', ')}
                {s.items.length > 2 && ` +${s.items.length - 2}`}
                {' · '}{PAYMENT_LABELS[s.paymentType] ?? s.paymentType}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                {fmtMoney(Number(s.totalAmount))}
              </div>
              <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                {canReceiptView && (
                  <button className="btn-sm btn-secondary" style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem' }}
                    onClick={(e) => { e.stopPropagation(); openReceipt(s.id); }}>
                    {receiptLoad ? '...' : 'Chek'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    });
  }

  // ── Qaytarishlar tab ─────────────────────────────────────────────────────

  function renderReturnsTab() {
    if (!canReturns) return <UpgradeBanner feature="Qaytarishlar boshqaruvi" requiredPlan="PRO" compact />;
    const pending  = filteredReturns.filter((r) => r.status === 'pending');
    const resolved = filteredReturns.filter((r) => r.status !== 'pending');

    const renderReturn = (r: SaleReturn) => (
      <div key={r.id} className="audit-return-card" onClick={() => setDetailReturn(r)}>
        <div className="audit-return-header">
          <div>
            <span className="audit-return-id">#{r.id.slice(0, 12).toUpperCase()}</span>
            <span className={`badge ${RETURN_STATUS_CLS[r.status]}`} style={{ fontSize: '0.72rem', marginLeft: '0.5rem' }}>
              {STATUS_LABEL[r.status]}
            </span>
          </div>
          <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>
            {fmtMoney(Number(r.totalRefund))}
            <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.72rem', marginLeft: '0.3rem' }}>qaytarish</span>
          </span>
        </div>
        <div className="audit-return-meta text-muted" style={{ fontSize: '0.78rem' }}>
          Asl savdo: <span style={{ color: 'var(--primary)', fontWeight: 600 }}>#{r.saleId.slice(0, 8).toUpperCase()}</span>
          <span style={{ margin: '0 0.3rem' }}>·</span>{fmtTime(r.createdAt)}
        </div>
        <div className="audit-return-items">
          {r.items.map((item, i) => (
            <div key={i} className="audit-return-item">
              <span className="audit-return-item-icon">↩</span>
              <span>× {item.quantity} dona</span>
              <span style={{ marginLeft: 'auto' }}>{fmtMoney(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="audit-return-actions" onClick={(e) => e.stopPropagation()}>
          <button className="btn-sm btn-secondary" onClick={() => setDetailReturn(r)}>
            Chekni ko'rish
          </button>
          {r.status === 'pending' && canApprove && (
            <>
              <button className="btn-sm btn-primary" disabled={approving}
                onClick={() => handleReturnAction(r.id, 'approved')}>
                {approving ? '...' : 'Tasdiqlash'}
              </button>
              <button className="btn-sm btn-danger btn-sm--outline" disabled={approving}
                onClick={() => handleReturnAction(r.id, 'rejected')}>
                Rad etish
              </button>
            </>
          )}
        </div>
      </div>
    );

    return (
      <>
        {pending.length > 0 && (
          <div>
            <div className="audit-date-header">
              <span className="audit-date-label" style={{ color: '#f59e0b' }}>KUTILAYOTGAN</span>
              <span className="audit-date-count">{pending.length} ta</span>
            </div>
            <div className="audit-group">{pending.map(renderReturn)}</div>
          </div>
        )}
        {resolved.length > 0 && (
          <div>
            <div className="audit-date-header">
              <span className="audit-date-label" style={{ color: '#10b981' }}>TASDIQLANGAN</span>
              <span className="audit-date-count">{resolved.length} ta</span>
            </div>
            <div className="audit-group">{resolved.map(renderReturn)}</div>
          </div>
        )}
        {filteredReturns.length === 0 && <p className="state-msg">Qaytarishlar yo'q</p>}
      </>
    );
  }

  // ── Tizim tab ────────────────────────────────────────────────────────────

  function renderSystemTab() {
    if (!canSystemLog) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <Lock size={32} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: '0.75rem' }} />
          <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '0.5rem' }}>Pro tarif kerak</div>
          <p className="text-muted" style={{ fontSize: '0.85rem', maxWidth: 320, margin: '0 auto 1rem' }}>
            Xodimlar harakatlari, tizimga kirish/chiqish va narx o'zgarishlarini kuzatish uchun Pro tarifga o'ting.
          </p>
          <UpgradeBanner feature="Tizim loglari" requiredPlan="PRO" compact />
        </div>
      );
    }
    // Pro users: show basic system events derived from sales data (login events would need a real audit log backend)
    const sysEvents = [
      ...sales.slice(0, 20).map((s) => ({
        id: `sale-sys-${s.id}`,
        type: 'Sotuv yaratildi',
        user: s.customerName || 'Kassir',
        time: s.createdAt,
        icon: '↗',
        color: '#10b981',
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    const grouped = groupByDate(sysEvents.map((e) => ({ ...e, createdAt: e.time })));
    return renderDateGroup(grouped, (ev) => (
      <div key={ev.id} className="audit-event">
        <div className="audit-event-icon" style={{ background: `${ev.color}18`, color: ev.color }}>
          {ev.icon}
        </div>
        <div className="audit-event-body">
          <div className="audit-event-title">{ev.type}</div>
          <div className="audit-event-meta">
            <span>{ev.user}</span>
            <span className="audit-dot">·</span>
            <span>{fmtTime(ev.time)}</span>
          </div>
        </div>
      </div>
    ));
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Sotuv Jurnali</h2>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
            {loading ? 'Yuklanmoqda...' : `${totalCount} ta yozuv`}
          </p>
        </div>
      </div>

      {/* Search */}
      <input
        type="search"
        className="search-input"
        style={{ marginBottom: '1rem', maxWidth: 520 }}
        placeholder="Savdo raqami, mijoz nomi bo'yicha qidirish..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Tabs — hide locked tabs entirely */}
      <div className="filter-tabs" style={{ marginBottom: '1.25rem' }}>
        {TABS.map((t) => {
          const locked = (t.requirePro && !canReturns) || (t.requireStarter && !isStarter);
          if (locked) return null;
          return (
            <button
              key={t.key}
              className={`filter-tab${tab === t.key ? ' filter-tab--active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {t.count != null && t.count > 0 && (
                <span style={{ marginLeft: '0.35rem', fontSize: '0.72rem', opacity: 0.7 }}>({t.count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="dash-loading"><div className="dash-spinner" /></div>
      ) : (
        <div className="audit-content">
          {tab === 'all'     && renderAllTab()}
          {tab === 'sales'   && renderSalesTab()}
          {tab === 'returns' && renderReturnsTab()}
          {tab === 'system'  && renderSystemTab()}
        </div>
      )}

      {/* ── Sale detail modal ──────────────────────────────────────── */}
      {detailSale && (
        <div className="modal-overlay" onClick={() => setDetailSale(null)}>
          <div className="modal" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Sotuv #{detailSale.id.slice(0, 8).toUpperCase()}</h3>
              <button className="modal-close" onClick={() => setDetailSale(null)}>×</button>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div><span className="text-muted">Vaqt: </span>{new Date(detailSale.createdAt).toLocaleString('uz-UZ')}</div>
                <div><span className="text-muted">Mijoz: </span>{detailSale.customerName || '—'}</div>
                <div><span className="text-muted">To'lov: </span>{PAYMENT_LABELS[detailSale.paymentType] ?? detailSale.paymentType}</div>
                <div>
                  <span className="text-muted">Status: </span>
                  <span className={`badge ${detailSale.status === 'completed' ? 'badge--active' : detailSale.status === 'cancelled' ? 'badge--inactive' : 'badge--warning'}`}>
                    {STATUS_LABEL[detailSale.status]}
                  </span>
                </div>
              </div>
              {(() => {
                const items = detailSale.items as SaleItem[];
                const hasDiscount = items.some((i) => (i.discount ?? 0) > 0);
                const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
                const totalDisc = items.reduce((s, i) => s + (i.discount ?? 0), 0);
                return (
                  <>
                    <div className="table-wrap">
                      <table className="table" style={{ fontSize: '0.82rem' }}>
                        <thead>
                          <tr>
                            <th>Nomi</th>
                            <th style={{ textAlign: 'right' }}>Narx</th>
                            <th style={{ textAlign: 'right' }}>Miqdor</th>
                            {hasDiscount && <th style={{ textAlign: 'right', color: '#ef4444' }}>Chegirma</th>}
                            <th style={{ textAlign: 'right' }}>Jami</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((i, idx) => {
                            const lineTotal = i.price * i.quantity - (i.discount ?? 0);
                            return (
                              <tr key={idx}>
                                <td>{i.name}</td>
                                <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{fmtMoney(i.price)}</td>
                                <td style={{ textAlign: 'right' }}>{i.quantity}</td>
                                {hasDiscount && (
                                  <td style={{ textAlign: 'right', color: '#ef4444' }}>
                                    {(i.discount ?? 0) > 0 ? `-${fmtMoney(i.discount ?? 0)}` : '—'}
                                  </td>
                                )}
                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtMoney(lineTotal)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '0.75rem', background: 'var(--bg)', borderRadius: 8, fontSize: '0.87rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                        <span>Subtotal</span>
                        <span>{fmtMoney(subtotal)}</span>
                      </div>
                      {totalDisc > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                          <span>Chegirma</span>
                          <span>-{fmtMoney(totalDisc)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.35rem', marginTop: '0.1rem' }}>
                        <span>Jami</span>
                        <span style={{ color: 'var(--primary)' }}>{fmtMoney(Number(detailSale.totalAmount))}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        <span>To'lov usuli</span>
                        <span>{PAYMENT_LABELS[detailSale.paymentType] ?? detailSale.paymentType}</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="modal-actions" style={{ padding: '0 1.5rem 1.5rem', gap: '0.5rem' }}>
              <button className="btn-secondary" onClick={() => setDetailSale(null)}>Yopish</button>
              {canReceiptView && (
                <button className="btn-secondary" onClick={() => openReceipt(detailSale.id)}>
                  {receiptLoad ? '...' : 'Chekni ko\'rish'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Return detail modal ──────────────────────────────────────── */}
      {detailReturn && (
        <div className="modal-overlay" onClick={() => setDetailReturn(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Qaytarish #{detailReturn.id.slice(0, 8).toUpperCase()}</h3>
              <button className="modal-close" onClick={() => setDetailReturn(null)}>×</button>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className={`badge ${RETURN_STATUS_CLS[detailReturn.status]}`}>{STATUS_LABEL[detailReturn.status]}</span>
                <span className="text-muted" style={{ fontSize: '0.82rem' }}>{new Date(detailReturn.createdAt).toLocaleString('uz-UZ')}</span>
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                <span className="text-muted">Asl savdo: </span>
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>#{detailReturn.saleId.slice(0, 8).toUpperCase()}</span>
              </div>
              {detailReturn.reason && (
                <div style={{ fontSize: '0.85rem' }}>
                  <span className="text-muted">Sabab: </span>{detailReturn.reason}
                </div>
              )}
              <div className="table-wrap">
                <table className="table" style={{ fontSize: '0.82rem' }}>
                  <thead>
                    <tr><th>Mahsulot</th><th>Miqdor</th><th style={{ textAlign: 'right' }}>Summa</th></tr>
                  </thead>
                  <tbody>
                    {detailReturn.items.map((i, idx) => (
                      <tr key={idx}>
                        <td>{i.name}</td>
                        <td>{i.quantity}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtMoney(i.price * i.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', padding: '0.5rem 0.75rem', background: 'var(--bg)', borderRadius: 8 }}>
                <span>Jami qaytarish</span>
                <span style={{ color: 'var(--primary)' }}>{fmtMoney(Number(detailReturn.totalRefund))}</span>
              </div>
            </div>
            <div className="modal-actions" style={{ padding: '0 1.5rem 1.5rem', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={() => setDetailReturn(null)}>Yopish</button>
              {canReceiptView && (
                <button className="btn-secondary" onClick={() => openReceipt(detailReturn.saleId)}>
                  Chekni ko'rish
                </button>
              )}
              {detailReturn.status === 'pending' && canApprove && (
                <>
                  <button className="btn-primary" disabled={approving}
                    onClick={() => handleReturnAction(detailReturn.id, 'approved')}>
                    {approving ? '...' : 'Tasdiqlash'}
                  </button>
                  <button className="btn-danger" disabled={approving}
                    onClick={() => handleReturnAction(detailReturn.id, 'rejected')}>
                    Rad etish
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Receipt modal ─────────────────────────────────────────────── */}
      {showReceipt && receipt && (
        <ReceiptModal
          sale={receipt}
          onClose={() => { setShowReceipt(false); setReceipt(null); }}
        />
      )}
    </div>
  );
}
