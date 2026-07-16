import { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw, Clock, ChefHat, CheckCircle, Timer, Wifi } from 'lucide-react';
import { RestOrder, getKitchenOrders, updateOrder } from '../../api/restaurant.api';
import { useToastStore } from '../../stores/toast.store';

const POLL_INTERVAL = 6000; // 6 seconds

const KITCHEN_STATUSES = ['pending', 'cooking', 'ready'] as const;
type KitchenStatus = typeof KITCHEN_STATUSES[number];

const STATUS_META: Record<KitchenStatus, {
  label: string; color: string; bg: string;
  icon: React.ReactNode; next: string; nextLabel: string;
}> = {
  pending: {
    label: 'Kutilmoqda',     color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',
    icon: <Timer size={15} />, next: 'cooking', nextLabel: 'Pishirishni boshlash',
  },
  cooking: {
    label: 'Tayyorlanmoqda', color: '#6366f1', bg: 'rgba(99,102,241,0.08)',
    icon: <ChefHat size={15} />, next: 'ready', nextLabel: 'Tayyor deb belgilash',
  },
  ready: {
    label: 'Tayyor',         color: '#10b981', bg: 'rgba(16,185,129,0.08)',
    icon: <CheckCircle size={15} />, next: 'paid', nextLabel: "Berildi (to'lashga)",
  },
};

function elapsed(createdAt: string) {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (diff < 1) return 'Az oldin';
  if (diff < 60) return `${diff} min`;
  return `${Math.floor(diff / 60)}s ${diff % 60}m`;
}

function isOld(createdAt: string): boolean {
  return (Date.now() - new Date(createdAt).getTime()) > 20 * 60 * 1000; // > 20 min
}

export default function Kitchen() {
  const addToast = useToastStore((s) => s.toast);
  const [orders,      setOrders]      = useState<RestOrder[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [countdown,   setCountdown]   = useState(POLL_INTERVAL / 1000);
  const [live,        setLive]        = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cdRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getKitchenOrders();
      setOrders(data);
      setLastRefresh(Date.now());
      setCountdown(POLL_INTERVAL / 1000);
    } catch { if (!silent) addToast('Yuklab bo\'lmadi'); }
    finally { if (!silent) setLoading(false); }
  }, []);

  // Initial load
  useEffect(() => { load(); }, [load]);

  // Auto-poll
  useEffect(() => {
    if (!live) {
      if (pollRef.current) clearInterval(pollRef.current);
      if (cdRef.current)   clearInterval(cdRef.current);
      return;
    }
    pollRef.current = setInterval(() => load(true), POLL_INTERVAL);
    cdRef.current   = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (cdRef.current)   clearInterval(cdRef.current);
    };
  }, [live, load]);

  const advance = async (order: RestOrder) => {
    const meta = STATUS_META[order.status as KitchenStatus];
    if (!meta?.next) return;
    try {
      const updated = await updateOrder(order.id, { status: meta.next });
      const stillInKitchen = KITCHEN_STATUSES.includes(updated.status as KitchenStatus);
      setOrders((prev) =>
        stillInKitchen
          ? prev.map((o) => o.id === updated.id ? updated : o)
          : prev.filter((o) => o.id !== updated.id)
      );
    } catch { addToast('Xatolik yuz berdi'); }
  };

  const columns: KitchenStatus[] = ['pending', 'cooking', 'ready'];
  const refreshTime = new Date(lastRefresh).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Oshxona ekrani</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            <Clock size={12} />
            <span>{loading ? 'Yuklanmoqda...' : `Yangilandi: ${refreshTime}`}</span>
            {live && !loading && (
              <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <Wifi size={11} />
                {countdown}s
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={live ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setLive((v) => !v)}
            style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Wifi size={13} />
            {live ? 'Jonli' : 'Pauza'}
          </button>
          <button className="btn-secondary" onClick={() => load()} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Yangilash
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {columns.map((status) => {
          const meta = STATUS_META[status];
          const col  = orders.filter((o) => o.status === status);
          return (
            <div key={status}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.75rem', background: meta.bg, borderRadius: '10px 10px 0 0', borderBottom: `2px solid ${meta.color}` }}>
                <span style={{ color: meta.color }}>{meta.icon}</span>
                <span style={{ fontWeight: 700, color: meta.color, fontSize: '0.9rem' }}>{meta.label}</span>
                <span style={{ marginLeft: 'auto', background: meta.color, color: '#fff', borderRadius: 20, padding: '0.1rem 0.55rem', fontSize: '0.78rem', fontWeight: 700 }}>{col.length}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingTop: '0.75rem', minHeight: 120 }}>
                {col.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '2rem 0', opacity: 0.6 }}>
                    Buyurtma yo'q
                  </div>
                )}
                {col.map((o) => {
                  const old = isOld(o.createdAt);
                  return (
                    <div key={o.id} className="card" style={{ padding: '0.85rem', borderLeft: `3px solid ${old ? '#ef4444' : meta.color}`, position: 'relative' }}>
                      {old && (
                        <div style={{ position: 'absolute', top: 6, right: 6, fontSize: '0.65rem', color: '#ef4444', fontWeight: 700, background: 'rgba(239,68,68,0.12)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
                          Kechikgan!
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                          {o.tableNumber ? `Stol ${o.tableNumber}` : 'Takeaway'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: old ? '#ef4444' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: old ? 700 : 400 }}>
                          <Clock size={11} /> {elapsed(o.createdAt)}
                        </span>
                      </div>
                      {o.customerName && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.45rem' }}>{o.customerName}</div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '0.65rem' }}>
                        {o.items.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem' }}>
                            <span style={{ fontWeight: 500 }}>{item.name}</span>
                            <span style={{ fontWeight: 700, color: meta.color }}>×{item.qty}</span>
                          </div>
                        ))}
                      </div>
                      {o.notes && (
                        <div style={{ fontSize: '0.75rem', fontStyle: 'italic', color: '#f59e0b', marginBottom: '0.5rem', padding: '0.3rem 0.5rem', background: 'rgba(245,158,11,0.08)', borderRadius: 6 }}>
                          {o.notes}
                        </div>
                      )}
                      <button
                        className="btn-primary"
                        style={{ width: '100%', fontSize: '0.78rem', padding: '0.45rem', background: meta.color, borderColor: meta.color }}
                        onClick={() => advance(o)}
                      >
                        {meta.nextLabel}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
