import { useCallback, useEffect, useState } from 'react';
import { Plus, X, Search, ChevronRight, Wrench, Car, AlertCircle } from 'lucide-react';
import {
  AutoServiceOrder, AutoVehicle, OrderStats, WorkItem,
  getOrderStats, getAutoOrders, createAutoOrder, updateAutoOrder, deleteAutoOrder, advanceAutoOrder,
  getAutoVehicles,
} from '../../api/auto.api';
import { useToastStore } from '../../stores/toast.store';

const fmt = (n: number) => Number(n).toLocaleString('uz-UZ') + " so'm";

const STATUS_CHAIN: AutoServiceOrder['status'][] = ['received', 'diagnosing', 'in_progress', 'ready', 'delivered'];
const STATUS_META: Record<string, { label: string; color: string; bg: string; next?: string }> = {
  received:    { label: 'Qabul qilindi',   color: '#64748b', bg: 'rgba(100,116,139,0.1)', next: 'Diagnostika' },
  diagnosing:  { label: 'Diagnostika',     color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  next: 'Ishga olish' },
  in_progress: { label: 'Tamirlashda',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', next: 'Tayyor' },
  ready:       { label: 'Tayyor',          color: '#10b981', bg: 'rgba(16,185,129,0.1)', next: 'Topshirish' },
  delivered:   { label: 'Topshirildi',     color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
};

const KANBAN_COLS: { key: AutoServiceOrder['status']; label: string; color: string }[] = [
  { key: 'received',    label: 'Qabul',      color: '#64748b' },
  { key: 'diagnosing',  label: 'Diagnostika', color: '#6366f1' },
  { key: 'in_progress', label: 'Tamirlash',  color: '#f59e0b' },
  { key: 'ready',       label: 'Tayyor',     color: '#10b981' },
];

type Form = {
  customerName: string; customerPhone: string;
  vehicleId: string; plateNumber: string; vehicleInfo: string;
  description: string; mechanics: string;
  estimatedAt: string; notes: string;
};
const EMPTY_FORM = (): Form => ({
  customerName: '', customerPhone: '', vehicleId: '', plateNumber: '', vehicleInfo: '',
  description: '', mechanics: '', estimatedAt: '', notes: '',
});

type ViewMode = 'kanban' | 'table';

export default function AutoServiceOrders() {
  const addToast = useToastStore((s) => s.toast);
  const [orders,   setOrders]   = useState<AutoServiceOrder[]>([]);
  const [vehicles, setVehicles] = useState<AutoVehicle[]>([]);
  const [stats,    setStats]    = useState<OrderStats | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState<AutoServiceOrder | null>(null);
  const [form,     setForm]     = useState<Form>(EMPTY_FORM());
  const [saving,   setSaving]   = useState(false);
  const [confirm,  setConfirm]  = useState<AutoServiceOrder | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getAutoOrders(statusFilter || undefined), getOrderStats(), getAutoVehicles()])
      .then(([ord, st, veh]) => { setOrders(ord); setStats(st); setVehicles(veh); })
      .catch(() => addToast('Yuklab bo\'lmadi'))
      .finally(() => setLoading(false));
  }, [statusFilter, addToast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM()); setModal(true); };
  const openEdit = (o: AutoServiceOrder) => {
    setEditing(o);
    setForm({
      customerName: o.customerName, customerPhone: o.customerPhone ?? '',
      vehicleId: o.vehicleId ?? '', plateNumber: o.plateNumber ?? '', vehicleInfo: o.vehicleInfo ?? '',
      description: o.description, mechanics: (o.mechanics ?? []).join(', '),
      estimatedAt: o.estimatedAt ?? '', notes: o.notes ?? '',
    });
    setModal(true);
  };
  const closeModal = () => { setModal(false); setEditing(null); };

  const onVehicleChange = (id: string) => {
    const v = vehicles.find((x) => x.id === id);
    setForm((f) => ({
      ...f,
      vehicleId: id,
      customerName: v?.customerName ?? f.customerName,
      customerPhone: v?.customerPhone ?? f.customerPhone,
      plateNumber: v?.plateNumber ?? '',
      vehicleInfo: v ? `${v.brand} ${v.model}${v.year ? ' ' + v.year : ''}` : '',
    }));
  };

  const save = async () => {
    if (!form.customerName.trim()) return addToast('Mijoz ismi kiritilishi shart');
    if (!form.description.trim())  return addToast('Muammo tavsifi kiritilishi shart');
    setSaving(true);
    try {
      const dto = {
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone || undefined,
        vehicleId: form.vehicleId || undefined,
        plateNumber: form.plateNumber || undefined,
        vehicleInfo: form.vehicleInfo || undefined,
        description: form.description.trim(),
        mechanics: form.mechanics ? form.mechanics.split(',').map((s) => s.trim()).filter(Boolean) : [],
        estimatedAt: form.estimatedAt || undefined,
        notes: form.notes || undefined,
      };
      if (editing) { await updateAutoOrder(editing.id, dto); addToast('Yangilandi'); }
      else          { await createAutoOrder(dto);             addToast('Buyurtma yaratildi'); }
      closeModal();
      load();
    } catch { addToast('Xatolik yuz berdi'); }
    finally { setSaving(false); }
  };

  const advance = async (o: AutoServiceOrder) => {
    try {
      await advanceAutoOrder(o.id);
      const nextIdx = STATUS_CHAIN.indexOf(o.status) + 1;
      addToast(nextIdx < STATUS_CHAIN.length ? `Holat: ${STATUS_META[STATUS_CHAIN[nextIdx]]?.label}` : 'Topshirildi');
      load();
    } catch { addToast('Xatolik'); }
  };

  const remove = async (o: AutoServiceOrder) => {
    try { await deleteAutoOrder(o.id); addToast('O\'chirildi'); load(); }
    catch { addToast('O\'chirib bo\'lmadi'); }
    finally { setConfirm(null); }
  };

  const detail = orders.find((o) => o.id === detailId);
  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return (
      o.customerName.toLowerCase().includes(q) ||
      (o.plateNumber ?? '').toLowerCase().includes(q) ||
      (o.vehicleInfo ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="page">
      {/* Stats cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          {[
            { label: 'Bugun qabul', value: stats.totalToday,  color: 'var(--primary)' },
            { label: 'Kutilmoqda',  value: stats.received,    color: '#64748b' },
            { label: 'Diagnostika', value: stats.diagnosing,  color: '#6366f1' },
            { label: 'Tamirlashda', value: stats.inProgress,  color: '#f59e0b' },
            { label: 'Tayyor',      value: stats.ready,       color: '#10b981' },
          ].map(({ label, value, color }) => (
            <div key={label} className="stat-mini" style={{ borderTop: `3px solid ${color}` }}>
              <p className="stat-mini-label">{label}</p>
              <p className="stat-mini-value" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="page-header">
        <div>
          <h2 className="page-title">Servis buyurtmalari</h2>
          <p className="page-subtitle">{filtered.length} ta buyurtma</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <button onClick={() => setViewMode('kanban')} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: viewMode === 'kanban' ? 'var(--primary)' : 'transparent', color: viewMode === 'kanban' ? '#fff' : 'var(--text)', border: 'none', cursor: 'pointer' }}>Kanban</button>
            <button onClick={() => setViewMode('table')}  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: viewMode === 'table'  ? 'var(--primary)' : 'transparent', color: viewMode === 'table'  ? '#fff' : 'var(--text)', border: 'none', cursor: 'pointer' }}>Jadval</button>
          </div>
          <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Yangi buyurtma</button>
        </div>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input className="search-input" placeholder="Mijoz, raqam, marka..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Barcha holatlar</option>
          {STATUS_CHAIN.map((k) => <option key={k} value={k}>{STATUS_META[k].label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /></div>
      ) : viewMode === 'kanban' ? (
        /* ── KANBAN VIEW ── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', alignItems: 'start' }}>
          {KANBAN_COLS.map((col) => {
            const colOrders = filtered.filter((o) => o.status === col.key);
            return (
              <div key={col.key} style={{ background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: col.color }}>{col.label}</span>
                  <span style={{ background: col.color + '20', color: col.color, borderRadius: 99, padding: '0.1rem 0.55rem', fontSize: '0.78rem', fontWeight: 700 }}>{colOrders.length}</span>
                </div>
                <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: 80 }}>
                  {colOrders.map((o) => (
                    <div key={o.id} className="card" style={{ padding: '0.75rem', cursor: 'pointer', userSelect: 'none' }} onClick={() => setDetailId(o.id)}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Car size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{o.vehicleInfo ?? 'Avtomobil'}</span>
                        </div>
                        {o.plateNumber && (
                          <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', background: 'var(--bg)', padding: '0.1rem 0.4rem', borderRadius: 4, border: '1px solid var(--border)', flexShrink: 0 }}>{o.plateNumber}</span>
                        )}
                      </div>
                      <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{o.description.slice(0, 60)}{o.description.length > 60 ? '…' : ''}</p>
                      <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', fontWeight: 600 }}>{o.customerName}</p>
                      {Number(o.totalCost) > 0 && <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>{fmt(Number(o.totalCost))}</p>}
                      {col.key !== 'delivered' && (
                        <button
                          className="btn-secondary"
                          style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.75rem', padding: '0.3rem' }}
                          onClick={(e) => { e.stopPropagation(); advance(o); }}
                        >
                          {STATUS_META[o.status]?.next ?? 'Keyingi bosqich'} <ChevronRight size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  {colOrders.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', padding: '1rem 0' }}>Bo'sh</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── TABLE VIEW ── */
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Buyurtma</th><th>Mijoz</th><th>Holat</th><th>Summa</th><th>Muddati</th><th>Amallar</th></tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const sm = STATUS_META[o.status] ?? STATUS_META.received;
                return (
                  <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => setDetailId(o.id)}>
                    <td>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Car size={13} style={{ color: 'var(--text-muted)' }} />
                          <strong style={{ fontSize: '0.85rem' }}>{o.vehicleInfo ?? 'Avtomobil'}</strong>
                          {o.plateNumber && <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: 'var(--bg)', padding: '0.1rem 0.4rem', borderRadius: 4, border: '1px solid var(--border)' }}>{o.plateNumber}</span>}
                        </div>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{o.description.slice(0, 50)}{o.description.length > 50 ? '…' : ''}</p>
                      </div>
                    </td>
                    <td>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.84rem' }}>{o.customerName}</p>
                      {o.customerPhone && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{o.customerPhone}</p>}
                    </td>
                    <td><span style={{ fontSize: '0.75rem', fontWeight: 600, color: sm.color, background: sm.bg, padding: '0.22rem 0.65rem', borderRadius: 12 }}>{sm.label}</span></td>
                    <td className="amount-cell">{Number(o.totalCost) > 0 ? fmt(Number(o.totalCost)) : '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: o.estimatedAt && new Date(o.estimatedAt) < new Date() && o.status !== 'delivered' ? '#ef4444' : 'var(--text-muted)' }}>
                      {o.estimatedAt ?? '—'}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="row-actions">
                        {o.status !== 'delivered' && (
                          <button className="btn-icon" title={STATUS_META[o.status]?.next} style={{ color: '#6366f1' }} onClick={() => advance(o)}>
                            <ChevronRight size={15} />
                          </button>
                        )}
                        <button className="btn-icon" title="Tahrirlash" onClick={() => openEdit(o)}>
                          <Wrench size={14} />
                        </button>
                        <button className="btn-icon btn-icon--danger" title="O'chirish" onClick={() => setConfirm(o)}>
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>Buyurtma topilmadi</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Detail Drawer ── */}
      {detail && (
        <div className="modal-overlay" onClick={() => setDetailId(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Car size={18} />
                {detail.vehicleInfo ?? 'Buyurtma'} {detail.plateNumber ? `— ${detail.plateNumber}` : ''}
              </h3>
              <button className="btn-icon" onClick={() => setDetailId(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.5rem', fontSize: '0.84rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Mijoz</span><p style={{ margin: '0.1rem 0 0', fontWeight: 600 }}>{detail.customerName}</p></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Telefon</span><p style={{ margin: '0.1rem 0 0' }}>{detail.customerPhone ?? '—'}</p></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Holat</span>
                  <p style={{ margin: '0.1rem 0 0' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: STATUS_META[detail.status]?.color, background: STATUS_META[detail.status]?.bg, padding: '0.2rem 0.6rem', borderRadius: 12 }}>
                      {STATUS_META[detail.status]?.label}
                    </span>
                  </p>
                </div>
                <div><span style={{ color: 'var(--text-muted)' }}>Muddati</span><p style={{ margin: '0.1rem 0 0' }}>{detail.estimatedAt ?? '—'}</p></div>
                {detail.mechanics && detail.mechanics.length > 0 && (
                  <div style={{ gridColumn: '1/-1' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Ustalar</span>
                    <p style={{ margin: '0.1rem 0 0' }}>{detail.mechanics.join(', ')}</p>
                  </div>
                )}
                <div style={{ gridColumn: '1/-1' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Muammo tavsifi</span>
                  <p style={{ margin: '0.1rem 0 0', lineHeight: 1.5 }}>{detail.description}</p>
                </div>
              </div>

              {detail.workItems && detail.workItems.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Ishlar va ehtiyot qismlar</p>
                  <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ textAlign: 'left', padding: '0.3rem 0', color: 'var(--text-muted)', fontWeight: 600 }}>Nomi</th>
                        <th style={{ textAlign: 'center', padding: '0.3rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Turi</th>
                        <th style={{ textAlign: 'right', padding: '0.3rem 0', color: 'var(--text-muted)', fontWeight: 600 }}>Miqdor</th>
                        <th style={{ textAlign: 'right', padding: '0.3rem 0', color: 'var(--text-muted)', fontWeight: 600 }}>Narx</th>
                        <th style={{ textAlign: 'right', padding: '0.3rem 0', color: 'var(--text-muted)', fontWeight: 600 }}>Jami</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.workItems.map((wi: WorkItem, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.35rem 0' }}>{wi.name}</td>
                          <td style={{ textAlign: 'center', padding: '0.35rem 0.5rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, background: wi.type === 'work' ? 'rgba(99,102,241,0.1)' : 'rgba(245,158,11,0.1)', color: wi.type === 'work' ? '#6366f1' : '#f59e0b', padding: '0.1rem 0.4rem', borderRadius: 8 }}>
                              {wi.type === 'work' ? 'Ish' : 'Qism'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', padding: '0.35rem 0' }}>{wi.qty}</td>
                          <td style={{ textAlign: 'right', padding: '0.35rem 0' }}>{fmt(wi.price)}</td>
                          <td style={{ textAlign: 'right', padding: '0.35rem 0', fontWeight: 700 }}>{fmt(wi.qty * wi.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={4} style={{ padding: '0.5rem 0', fontWeight: 700, textAlign: 'right' }}>Jami:</td>
                        <td style={{ padding: '0.5rem 0', fontWeight: 700, textAlign: 'right', color: 'var(--primary)', fontSize: '0.95rem' }}>{fmt(Number(detail.totalCost))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {detail.notes && (
                <div style={{ marginTop: '0.75rem', background: 'var(--bg)', padding: '0.6rem 0.75rem', borderRadius: 8, fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', gap: '0.4rem' }}>
                  <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                  {detail.notes}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDetailId(null)}>Yopish</button>
              <button className="btn-secondary" onClick={() => { setDetailId(null); openEdit(detail); }}>Tahrirlash</button>
              {detail.status !== 'delivered' && (
                <button className="btn-primary" onClick={() => { advance(detail); setDetailId(null); }}>
                  {STATUS_META[detail.status]?.next ?? 'Keyingi'} <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Buyurtmani tahrirlash' : 'Yangi servis buyurtmasi'}</h3>
              <button className="btn-icon" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Mavjud avtomobildan tanlang</label>
                <select className="form-input" value={form.vehicleId} onChange={(e) => onVehicleChange(e.target.value)}>
                  <option value="">Yangi / qo'lda kiriting</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.brand} {v.model} {v.plateNumber ? `— ${v.plateNumber}` : ''} ({v.customerName})</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Davlat raqami</label>
                  <input className="form-input" placeholder="01 A 000 AA" style={{ fontFamily: 'monospace' }} value={form.plateNumber} onChange={(e) => setForm((f) => ({ ...f, plateNumber: e.target.value.toUpperCase() }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Avtomobil (marka model yil)</label>
                  <input className="form-input" placeholder="Chevrolet Cobalt 2022" value={form.vehicleInfo} onChange={(e) => setForm((f) => ({ ...f, vehicleInfo: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Mijoz ismi *</label>
                  <input className="form-input" placeholder="F.I.Sh." value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefon</label>
                  <input className="form-input" placeholder="+998..." value={form.customerPhone} onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Muammo tavsifi *</label>
                <textarea className="form-input" rows={3} placeholder="Mijoz topshirgan muammo, shikoyat..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Ustalar (vergul bilan)</label>
                  <input className="form-input" placeholder="Jasur, Bobur" value={form.mechanics} onChange={(e) => setForm((f) => ({ ...f, mechanics: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Taxminiy tayyor sana</label>
                  <input type="date" className="form-input" value={form.estimatedAt} onChange={(e) => setForm((f) => ({ ...f, estimatedAt: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Izoh</label>
                <textarea className="form-input" rows={2} placeholder="Qo'shimcha..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>Bekor</button>
              <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>O'chirishni tasdiqlash</h3><button className="btn-icon" onClick={() => setConfirm(null)}><X size={18} /></button></div>
            <div className="modal-body"><p><strong>{confirm.vehicleInfo ?? 'Buyurtma'}</strong> o'chirasizmi? Bu amal qaytarib bo'lmaydi.</p></div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setConfirm(null)}>Bekor</button>
              <button className="btn-danger" onClick={() => remove(confirm)}>O'chirish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
