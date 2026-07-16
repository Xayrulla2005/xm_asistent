import { useCallback, useEffect, useState } from 'react';
import { Plus, X, Search, ChevronLeft, ChevronRight, Clock, User, Scissors, Check, Ban } from 'lucide-react';
import {
  BeautyAppointment, BeautyCatalog, BeautyMaster, AppointmentStats,
  getAppointmentStats, getBeautyAppointments,
  createBeautyAppointment, updateBeautyAppointment, deleteBeautyAppointment,
  getBeautyMasters, getBeautyServices,
} from '../../api/beauty.api';
import { useToastStore } from '../../stores/toast.store';

const fmt = (n: number) => Number(n).toLocaleString('uz-UZ') + " so'm";
const TODAY = () => new Date().toISOString().slice(0, 10);

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  scheduled:   { label: 'Navbatda',     color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  in_progress: { label: 'Jarayonda',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  completed:   { label: 'Tugallandi',   color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  cancelled:   { label: 'Bekor',        color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
  no_show:     { label: 'Kelmadi',      color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
};

const TIMES = Array.from({ length: 26 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
}).filter((t) => t <= '20:30');

type Form = {
  clientName: string; clientPhone: string;
  masterId: string; serviceId: string;
  date: string; timeSlot: string;
  status: BeautyAppointment['status'];
  notes: string; fee: string;
};
const EMPTY_FORM = (): Form => ({
  clientName: '', clientPhone: '', masterId: '', serviceId: '',
  date: TODAY(), timeSlot: '10:00',
  status: 'scheduled', notes: '', fee: '',
});

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function BeautyAppointments() {
  const addToast = useToastStore((s) => s.toast);
  const [appointments, setAppointments] = useState<BeautyAppointment[]>([]);
  const [masters,   setMasters]   = useState<BeautyMaster[]>([]);
  const [services,  setServices]  = useState<BeautyCatalog[]>([]);
  const [stats,     setStats]     = useState<AppointmentStats | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [date,      setDate]      = useState(TODAY());
  const [masterFilter, setMasterFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search,    setSearch]    = useState('');
  const [modal,     setModal]     = useState(false);
  const [editing,   setEditing]   = useState<BeautyAppointment | null>(null);
  const [form,      setForm]      = useState<Form>(EMPTY_FORM());
  const [saving,    setSaving]    = useState(false);
  const [confirm,   setConfirm]   = useState<BeautyAppointment | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      getBeautyAppointments(date, masterFilter || undefined, statusFilter || undefined),
      getAppointmentStats(),
      getBeautyMasters(),
      getBeautyServices(),
    ])
      .then(([appts, st, mst, svc]) => { setAppointments(appts); setStats(st); setMasters(mst); setServices(svc); })
      .catch(() => addToast('Yuklab bo\'lmadi'))
      .finally(() => setLoading(false));
  }, [date, masterFilter, statusFilter, addToast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM()); setModal(true); };
  const openEdit = (a: BeautyAppointment) => {
    setEditing(a);
    setForm({
      clientName: a.clientName, clientPhone: a.clientPhone ?? '',
      masterId: a.masterId ?? '', serviceId: a.serviceId ?? '',
      date: a.date, timeSlot: a.timeSlot, status: a.status,
      notes: a.notes ?? '', fee: String(a.fee ?? a.servicePrice ?? ''),
    });
    setModal(true);
  };
  const closeModal = () => { setModal(false); setEditing(null); };

  const onServiceChange = (id: string) => {
    const svc = services.find((s) => s.id === id);
    setForm((f) => ({ ...f, serviceId: id, fee: svc ? String(svc.price) : f.fee }));
  };

  const onMasterChange = (id: string) => {
    const m = masters.find((x) => x.id === id);
    setForm((f) => ({ ...f, masterId: id }));
    void m; // just record the id; masterName resolved server-side
  };

  const save = async () => {
    if (!form.clientName.trim()) return addToast('Mijoz ismi kiritilishi shart');
    if (!form.timeSlot)          return addToast('Vaqt tanlanishi shart');
    setSaving(true);
    try {
      const master  = masters.find((m) => m.id === form.masterId);
      const service = services.find((s) => s.id === form.serviceId);
      const dto = {
        clientName: form.clientName.trim(),
        clientPhone: form.clientPhone || undefined,
        masterId: form.masterId || undefined,
        masterName: master ? `${master.firstName} ${master.lastName}` : undefined,
        serviceId: form.serviceId || undefined,
        serviceName: service?.name,
        servicePrice: service?.price ?? 0,
        date: form.date,
        timeSlot: form.timeSlot,
        duration: service?.duration ?? 60,
        status: form.status,
        notes: form.notes || undefined,
        fee: Number(form.fee) || service?.price || 0,
      };
      if (editing) { await updateBeautyAppointment(editing.id, dto); addToast('Yangilandi'); }
      else          { await createBeautyAppointment(dto);             addToast('Qabul qo\'shildi'); }
      closeModal();
      load();
    } catch { addToast('Xatolik yuz berdi'); }
    finally { setSaving(false); }
  };

  const quickStatus = async (a: BeautyAppointment, status: BeautyAppointment['status']) => {
    try { await updateBeautyAppointment(a.id, { status }); addToast('Holat yangilandi'); load(); }
    catch { addToast('Xatolik'); }
  };

  const remove = async (a: BeautyAppointment) => {
    try { await deleteBeautyAppointment(a.id); addToast('O\'chirildi'); load(); }
    catch { addToast('O\'chirib bo\'lmadi'); }
    finally { setConfirm(null); }
  };

  const visible = appointments.filter((a) => {
    const q = search.toLowerCase();
    return a.clientName.toLowerCase().includes(q) || (a.masterName ?? '').toLowerCase().includes(q) || (a.serviceName ?? '').toLowerCase().includes(q);
  });

  const DAY_UZ = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
  const dateObj = new Date(date + 'T00:00:00');
  const dateLabel = `${date} — ${DAY_UZ[dateObj.getDay()]}`;

  return (
    <div className="page">
      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          {[
            { label: 'Bugungi qabullar', value: stats.todayCount, color: 'var(--primary)' },
            { label: 'Navbatda',          value: stats.scheduled,  color: '#6366f1' },
            { label: 'Tugallandi',        value: stats.completedToday, color: '#10b981' },
            { label: 'Bugungi daromad',   value: fmt(stats.todayFee),  color: '#f59e0b', isStr: true },
          ].map(({ label, value, color, isStr }) => (
            <div key={label} className="stat-mini" style={{ borderTop: `3px solid ${color}` }}>
              <p className="stat-mini-label">{label}</p>
              <p className="stat-mini-value" style={{ color }}>{isStr ? value : value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="page-header">
        <div>
          <h2 className="page-title">Qabullar</h2>
          <p className="page-subtitle">{dateLabel} — {visible.length} ta qabul</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Qabul qo'shish</button>
      </div>

      {/* Date nav + filters */}
      <div className="filters-bar" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button className="btn-icon" onClick={() => setDate(addDays(date, -1))}><ChevronLeft size={16} /></button>
          <input type="date" className="form-input" style={{ width: 150 }} value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="btn-icon" onClick={() => setDate(addDays(date, 1))}><ChevronRight size={16} /></button>
          <button className="btn-secondary" style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }} onClick={() => setDate(TODAY())}>Bugun</button>
        </div>
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input className="search-input" placeholder="Mijoz, master, xizmat..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={masterFilter} onChange={(e) => setMasterFilter(e.target.value)}>
          <option value="">Barcha masterlar</option>
          {masters.map((m) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
        </select>
        <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Barcha holatlar</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /></div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Vaqt</th><th>Mijoz</th><th>Master</th><th>Xizmat</th><th>Davomiyligi</th><th>Narx</th><th>Holat</th><th>Amallar</th></tr>
            </thead>
            <tbody>
              {visible
                .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
                .map((a) => {
                  const sm = STATUS_META[a.status] ?? STATUS_META.scheduled;
                  return (
                    <tr key={a.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.95rem' }}>
                          <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                          {a.timeSlot}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <User size={13} style={{ color: 'var(--text-muted)' }} />
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem' }}>{a.clientName}</p>
                            {a.clientPhone && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.clientPhone}</p>}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.83rem' }}>{a.masterName ?? '—'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem' }}>
                          <Scissors size={12} style={{ color: 'var(--text-muted)' }} />
                          {a.serviceName ?? '—'}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{a.duration} min</td>
                      <td className="amount-cell">{Number(a.fee) > 0 ? fmt(Number(a.fee)) : '—'}</td>
                      <td>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: sm.color, background: sm.bg, padding: '0.22rem 0.65rem', borderRadius: 12 }}>{sm.label}</span>
                      </td>
                      <td>
                        <div className="row-actions">
                          {a.status === 'scheduled' && (
                            <button className="btn-icon" title="Boshlash" onClick={() => quickStatus(a, 'in_progress')} style={{ color: '#f59e0b' }}>
                              <Clock size={14} />
                            </button>
                          )}
                          {a.status === 'in_progress' && (
                            <button className="btn-icon" title="Tugallash" onClick={() => quickStatus(a, 'completed')} style={{ color: '#10b981' }}>
                              <Check size={14} />
                            </button>
                          )}
                          {(a.status === 'scheduled' || a.status === 'in_progress') && (
                            <button className="btn-icon" title="Bekor" onClick={() => quickStatus(a, 'cancelled')} style={{ color: '#ef4444' }}>
                              <Ban size={14} />
                            </button>
                          )}
                          <button className="btn-icon" title="Tahrirlash" onClick={() => openEdit(a)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button className="btn-icon btn-icon--danger" title="O'chirish" onClick={() => setConfirm(a)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              {visible.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>Bu kun uchun qabullar yo'q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Qabulni tahrirlash' : 'Yangi qabul'}</h3>
              <button className="btn-icon" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Mijoz ismi *</label>
                  <input className="form-input" placeholder="F.I.Sh." value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefon</label>
                  <input className="form-input" placeholder="+998..." value={form.clientPhone} onChange={(e) => setForm((f) => ({ ...f, clientPhone: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Master</label>
                  <select className="form-input" value={form.masterId} onChange={(e) => onMasterChange(e.target.value)}>
                    <option value="">Master tanlang</option>
                    {masters.filter((m) => m.isActive).map((m) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Xizmat</label>
                  <select className="form-input" value={form.serviceId} onChange={(e) => onServiceChange(e.target.value)}>
                    <option value="">Xizmat tanlang</option>
                    {services.filter((s) => s.isActive).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.duration}min)</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Sana</label>
                  <input type="date" className="form-input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Vaqt *</label>
                  <select className="form-input" value={form.timeSlot} onChange={(e) => setForm((f) => ({ ...f, timeSlot: e.target.value }))}>
                    {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Narx (so'm)</label>
                  <input type="number" className="form-input" min={0} placeholder="0" value={form.fee} onChange={(e) => setForm((f) => ({ ...f, fee: e.target.value }))} />
                </div>
                {editing && (
                  <div className="form-group">
                    <label className="form-label">Holat</label>
                    <select className="form-input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BeautyAppointment['status'] }))}>
                      {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                )}
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
            <div className="modal-header"><h3>Qabulni o'chirish</h3><button className="btn-icon" onClick={() => setConfirm(null)}><X size={18} /></button></div>
            <div className="modal-body"><p><strong>{confirm.clientName}</strong> — {confirm.date} {confirm.timeSlot} qabulini o'chirasizmi?</p></div>
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
