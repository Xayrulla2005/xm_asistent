import { useCallback, useEffect, useState } from 'react';
import { Plus, ChevronDown, X, Minus, Trash2 } from 'lucide-react';
import {
  RestOrder, RestTable, MenuItem, OrderItem,
  getOrders, createOrder, updateOrder, deleteOrder,
  getTables, getMenu, getOrderStats,
} from '../../api/restaurant.api';
import { useToastStore } from '../../stores/toast.store';

const STATUS_META: Record<string, { label: string; color: string; next: string | null }> = {
  pending:  { label: 'Kutilmoqda',     color: '#f59e0b', next: 'cooking' },
  cooking:  { label: 'Tayyorlanmoqda', color: '#6366f1', next: 'ready' },
  ready:    { label: 'Tayyor',         color: '#10b981', next: 'paid' },
  paid:     { label: "To'langan",      color: '#64748b', next: null },
  cancelled:{ label: 'Bekor',          color: '#ef4444', next: null },
};

const PAYMENT_METHODS = ['cash', 'card', 'transfer'];
const PM_LABELS: Record<string, string> = { cash: 'Naqd', card: 'Karta', transfer: "O'tkazma" };

export default function Orders() {
  const addToast = useToastStore((s) => s.toast);
  const [orders,  setOrders]  = useState<RestOrder[]>([]);
  const [tables,  setTables]  = useState<RestTable[]>([]);
  const [menu,    setMenu]    = useState<MenuItem[]>([]);
  const [stats,   setStats]   = useState({ total: 0, pending: 0, cooking: 0, today: 0 });
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('');
  const [modal,   setModal]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [confirm, setConfirm] = useState<RestOrder | null>(null);

  // New order form
  const [tableId,  setTableId]  = useState('');
  const [customer, setCustomer] = useState('');
  const [payMethod,setPayMethod] = useState('cash');
  const [notes,    setNotes]    = useState('');
  const [items,    setItems]    = useState<OrderItem[]>([]);
  const [menuSearch, setMenuSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      getOrders(filter || undefined),
      getOrderStats(),
    ])
      .then(([o, s]) => { setOrders(o); setStats(s); })
      .catch(() => addToast('Yuklab bo\'lmadi'))
      .finally(() => setLoading(false));
  }, [filter, addToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    getTables().then(setTables).catch(() => {});
    getMenu().then(setMenu).catch(() => {});
  }, []);

  const openCreate = () => {
    setTableId(''); setCustomer(''); setPayMethod('cash'); setNotes(''); setItems([]); setMenuSearch('');
    setModal(true);
  };

  const addItem = (m: MenuItem) => {
    setItems((prev) => {
      const exists = prev.find((i) => i.menuItemId === m.id);
      if (exists) return prev.map((i) => i.menuItemId === m.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { menuItemId: m.id, name: m.name, price: m.price, qty: 1 }];
    });
  };
  const changeQty = (menuItemId: string, delta: number) => {
    setItems((prev) => prev.map((i) => i.menuItemId === menuItemId ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
  };
  const removeItem = (menuItemId: string) => setItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId));

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) { addToast('Kamida 1 ta taom tanlang'); return; }
    setSaving(true);
    try {
      const table = tables.find((t) => t.id === tableId);
      const order = await createOrder({
        tableId: tableId || undefined,
        tableNumber: table?.number,
        items,
        paymentMethod: payMethod,
        customerName: customer || undefined,
        notes: notes || undefined,
      });
      setOrders((prev) => [order, ...prev]);
      addToast("Buyurtma yaratildi", 'success');
      getOrderStats().then(setStats).catch(() => {});
      setModal(false);
    } catch { addToast('Xatolik'); }
    finally { setSaving(false); }
  };

  const advance = async (order: RestOrder) => {
    const meta = STATUS_META[order.status];
    if (!meta?.next) return;
    try {
      const updated = await updateOrder(order.id, { status: meta.next });
      setOrders((prev) => prev.map((o) => o.id === updated.id ? updated : o));
    } catch { addToast('Xatolik'); }
  };

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await deleteOrder(confirm.id);
      setOrders((prev) => prev.filter((o) => o.id !== confirm.id));
      addToast("O'chirildi", 'success');
    } catch { addToast('Xatolik'); }
    finally { setConfirm(null); }
  };

  const filteredMenu = menuSearch
    ? menu.filter((m) => m.isAvailable && m.name.toLowerCase().includes(menuSearch.toLowerCase()))
    : menu.filter((m) => m.isAvailable);

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Buyurtmalar</h2>
        <button className="btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={15} /> Yangi buyurtma
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Bugun', value: stats.today, color: '#6366f1' },
          { label: 'Kutilmoqda', value: stats.pending, color: '#f59e0b' },
          { label: 'Pishirilmoqda', value: stats.cooking, color: '#8b5cf6' },
          { label: 'Jami', value: stats.total, color: '#64748b' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '0 0 auto' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{value}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['', ...Object.keys(STATUS_META)].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={filter === s ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>
            {s ? STATUS_META[s].label : 'Barchasi'}
          </button>
        ))}
      </div>

      {loading ? <p className="state-msg">Yuklanmoqda...</p>
       : orders.length === 0 ? <p className="state-msg">Buyurtmalar topilmadi</p>
       : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr>
              <th>Stol</th><th>Mijoz</th><th>Taomlar</th>
              <th>Summa</th><th>To'lov</th><th>Holat</th><th>Amallar</th>
            </tr></thead>
            <tbody>
              {orders.map((o) => {
                const meta = STATUS_META[o.status] ?? STATUS_META.pending;
                return (
                  <tr key={o.id}>
                    <td>{o.tableNumber ? `Stol ${o.tableNumber}` : '—'}</td>
                    <td>{o.customerName || '—'}</td>
                    <td style={{ maxWidth: 220 }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {o.items.map((i) => `${i.name} x${i.qty}`).join(', ')}
                      </div>
                    </td>
                    <td><strong>{Number(o.total).toLocaleString()} so'm</strong></td>
                    <td style={{ fontSize: '0.8rem' }}>{PM_LABELS[o.paymentMethod ?? 'cash'] ?? o.paymentMethod}</td>
                    <td>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: meta.color, background: meta.color + '18', padding: '0.2rem 0.6rem', borderRadius: 12, whiteSpace: 'nowrap' }}>
                        {meta.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {meta.next && (
                          <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => advance(o)}>
                            <ChevronDown size={12} /> {STATUS_META[meta.next]?.label}
                          </button>
                        )}
                        <button className="btn-secondary" style={{ padding: '0.25rem 0.4rem', color: '#ef4444' }} onClick={() => setConfirm(o)}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680, width: '96vw' }}>
            <div className="modal-header">
              <h3>Yangi buyurtma</h3>
              <button onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', padding: '1.25rem' }}>
                {/* Left: menu */}
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '0.65rem', fontSize: '0.9rem' }}>Menyu</div>
                  <input type="text" placeholder="Taom qidirish..." value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', marginBottom: '0.65rem' }} />
                  <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {filteredMenu.map((m) => (
                      <button key={m.id} type="button" onClick={() => addItem(m)}
                        className="btn-secondary"
                        style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0.75rem', fontSize: '0.82rem', textAlign: 'left' }}>
                        <span>{m.name}</span>
                        <span style={{ color: 'var(--primary)', fontWeight: 600, flexShrink: 0 }}>{Number(m.price).toLocaleString()}</span>
                      </button>
                    ))}
                    {filteredMenu.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Taom topilmadi</p>}
                  </div>
                </div>
                {/* Right: order summary + fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>Tanlangan taomlar</div>
                    {items.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Hali tanlangan emas</p>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: 180, overflowY: 'auto' }}>
                      {items.map((item) => (
                        <div key={item.menuItemId} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', background: 'var(--bg-secondary)', borderRadius: 8, padding: '0.35rem 0.6rem' }}>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                          <button type="button" className="btn-secondary" style={{ padding: '0.1rem 0.35rem' }} onClick={() => changeQty(item.menuItemId, -1)}><Minus size={11} /></button>
                          <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 600 }}>{item.qty}</span>
                          <button type="button" className="btn-secondary" style={{ padding: '0.1rem 0.35rem' }} onClick={() => changeQty(item.menuItemId, 1)}><Plus size={11} /></button>
                          <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.1rem' }} onClick={() => removeItem(item.menuItemId)}><Trash2 size={11} /></button>
                        </div>
                      ))}
                    </div>
                    {items.length > 0 && (
                      <div style={{ fontWeight: 700, marginTop: '0.5rem', textAlign: 'right', color: 'var(--primary)' }}>
                        Jami: {total.toLocaleString()} so'm
                      </div>
                    )}
                  </div>
                  <div className="field">
                    <label>Stol</label>
                    <select value={tableId} onChange={(e) => setTableId(e.target.value)}>
                      <option value="">— stol tanlanmagan —</option>
                      {tables.filter((t) => t.status !== 'occupied').map((t) => (
                        <option key={t.id} value={t.id}>Stol {t.number}{t.zone ? ` (${t.zone})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Mijoz ismi</label>
                    <input type="text" placeholder="Ixtiyoriy" value={customer} onChange={(e) => setCustomer(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>To'lov usuli</label>
                    <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                      {PAYMENT_METHODS.map((p) => <option key={p} value={p}>{PM_LABELS[p]}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Izoh</label>
                    <input type="text" placeholder="Ixtiyoriy" value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', padding: '1rem 1.25rem', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Bekor</button>
                <button type="submit" className="btn-primary" disabled={saving || items.length === 0}>{saving ? 'Yaratilmoqda...' : 'Buyurtma yaratish'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 340 }}>
            <div className="modal-header"><h3>Buyurtmani o'chirish</h3><button onClick={() => setConfirm(null)}><X size={18} /></button></div>
            <div style={{ padding: '1.25rem' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Stol <strong>{confirm.tableNumber ?? '—'}</strong> buyurtmasini o'chirishni tasdiqlaysizmi?</p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setConfirm(null)}>Bekor</button>
                <button className="btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={handleDelete}>O'chirish</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
