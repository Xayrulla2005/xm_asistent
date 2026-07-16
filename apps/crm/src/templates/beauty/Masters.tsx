import { useCallback, useEffect, useState } from 'react';
import { Plus, Edit, Trash2, X, Search, Star } from 'lucide-react';
import { BeautyMaster, getBeautyMasters, createBeautyMaster, updateBeautyMaster, deleteBeautyMaster } from '../../api/beauty.api';
import { useToastStore } from '../../stores/toast.store';

type Form = { firstName: string; lastName: string; phone: string; specialty: string; isActive: boolean; notes: string };
const EMPTY: Form = { firstName: '', lastName: '', phone: '', specialty: '', isActive: true, notes: '' };

const SPECIALTIES = ['Soch ustasi', 'Tirnoq ustasi', 'Vizajist', 'Massajchi', 'Barvaychi', 'Kosmetolog'];

export default function BeautyMasters() {
  const addToast = useToastStore((s) => s.toast);
  const [masters, setMasters] = useState<BeautyMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState<BeautyMaster | null>(null);
  const [form,    setForm]    = useState<Form>(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [confirm, setConfirm] = useState<BeautyMaster | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getBeautyMasters()
      .then(setMasters)
      .catch(() => addToast('Yuklab bo\'lmadi'))
      .finally(() => setLoading(false));
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (m: BeautyMaster) => {
    setEditing(m);
    setForm({ firstName: m.firstName, lastName: m.lastName, phone: m.phone ?? '', specialty: m.specialty ?? '', isActive: m.isActive, notes: m.notes ?? '' });
    setModal(true);
  };
  const closeModal = () => { setModal(false); setEditing(null); };

  const save = async () => {
    if (!form.firstName.trim()) return addToast('Ism kiritilishi shart');
    setSaving(true);
    try {
      const dto = { firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone: form.phone || undefined, specialty: form.specialty || undefined, isActive: form.isActive, notes: form.notes || undefined };
      if (editing) { await updateBeautyMaster(editing.id, dto); addToast('Yangilandi'); }
      else          { await createBeautyMaster(dto);             addToast('Qo\'shildi'); }
      closeModal();
      load();
    } catch { addToast('Xatolik yuz berdi'); }
    finally { setSaving(false); }
  };

  const remove = async (m: BeautyMaster) => {
    try { await deleteBeautyMaster(m.id); addToast('O\'chirildi'); load(); }
    catch { addToast('O\'chirib bo\'lmadi'); }
    finally { setConfirm(null); }
  };

  const visible = masters.filter((m) => {
    const q = search.toLowerCase();
    return `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) || (m.phone ?? '').includes(q) || (m.specialty ?? '').toLowerCase().includes(q);
  });

  const initials = (m: BeautyMaster) => `${m.firstName[0] ?? ''}${m.lastName[0] ?? ''}`.toUpperCase();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Masterlar</h2>
          <p className="page-subtitle">{masters.filter((m) => m.isActive).length} ta faol master</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Qo'shish</button>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input className="search-input" placeholder="Ism, telefon, mutaxassislik..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem', padding: '0 0 1rem' }}>
          {visible.map((m) => (
            <div key={m.id} className="card" style={{ opacity: m.isActive ? 1 : 0.6, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                  {initials(m)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, margin: 0, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.firstName} {m.lastName}</p>
                  {m.specialty && <p style={{ margin: '0.1rem 0 0', fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600 }}>{m.specialty}</p>}
                  {m.phone    && <p style={{ margin: '0.1rem 0 0', fontSize: '0.8rem',  color: 'var(--text-muted)' }}>{m.phone}</p>}
                </div>
                <span className={`badge ${m.isActive ? 'badge--active' : 'badge--inactive'}`} style={{ flexShrink: 0 }}>{m.isActive ? 'Faol' : 'Nofaol'}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <Star size={13} />
                <span>Jami qabullar: <strong style={{ color: 'var(--text)' }}>{m.totalAppointments}</strong></span>
              </div>

              {m.notes && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, background: 'var(--bg)', padding: '0.4rem 0.6rem', borderRadius: 6 }}>{m.notes}</p>}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                <button className="btn-secondary" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => openEdit(m)}><Edit size={13} /> Tahrirlash</button>
                <button className="btn-icon btn-icon--danger" onClick={() => setConfirm(m)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {visible.length === 0 && <p style={{ color: 'var(--text-muted)', padding: '2rem', gridColumn: '1/-1', textAlign: 'center' }}>Master topilmadi</p>}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Masterni tahrirlash' : 'Yangi master'}</h3>
              <button className="btn-icon" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Ism *</label>
                  <input className="form-input" placeholder="Ism" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Familiya</label>
                  <input className="form-input" placeholder="Familiya" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Telefon</label>
                  <input className="form-input" placeholder="+998 90 000 00 00" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Mutaxassislik</label>
                  <select className="form-input" value={form.specialty} onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}>
                    <option value="">Tanlang</option>
                    {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                    <option value="__other">Boshqa</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Izoh</label>
                <textarea className="form-input" rows={2} placeholder="Qo'shimcha ma'lumot..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
                  Faol
                </label>
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
            <div className="modal-body"><p><strong>{confirm.firstName} {confirm.lastName}</strong>ni o'chirasizmi?</p></div>
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
