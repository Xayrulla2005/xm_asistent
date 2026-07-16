import { useCallback, useEffect, useState } from 'react';
import { Plus, Edit, Trash2, X, Search, Scissors } from 'lucide-react';
import { BeautyCatalog, getBeautyServices, createBeautyService, updateBeautyService, deleteBeautyService } from '../../api/beauty.api';
import { useToastStore } from '../../stores/toast.store';

const fmt = (n: number) => Number(n).toLocaleString('uz-UZ') + " so'm";

type Form = { name: string; category: string; duration: string; price: string; isActive: boolean };
const EMPTY: Form = { name: '', category: '', duration: '60', price: '', isActive: true };

const CATEGORIES = ['Soch', 'Tirnoq', 'Yuz', 'Massaj', 'Boshqa'];

export default function BeautyServices() {
  const addToast = useToastStore((s) => s.toast);
  const [services, setServices] = useState<BeautyCatalog[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState<BeautyCatalog | null>(null);
  const [form,     setForm]     = useState<Form>(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [confirm,  setConfirm]  = useState<BeautyCatalog | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getBeautyServices()
      .then(setServices)
      .catch(() => addToast('Yuklab bo\'lmadi'))
      .finally(() => setLoading(false));
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (s: BeautyCatalog) => {
    setEditing(s);
    setForm({ name: s.name, category: s.category ?? '', duration: String(s.duration), price: String(s.price), isActive: s.isActive });
    setModal(true);
  };
  const closeModal = () => { setModal(false); setEditing(null); };

  const save = async () => {
    if (!form.name.trim() || !form.price) return addToast('Nom va narx kiritilishi shart');
    setSaving(true);
    try {
      const dto = { name: form.name.trim(), category: form.category || undefined, duration: Number(form.duration) || 60, price: Number(form.price), isActive: form.isActive };
      if (editing) { await updateBeautyService(editing.id, dto); addToast('Yangilandi'); }
      else          { await createBeautyService(dto);             addToast('Qo\'shildi'); }
      closeModal();
      load();
    } catch { addToast('Xatolik yuz berdi'); }
    finally { setSaving(false); }
  };

  const remove = async (s: BeautyCatalog) => {
    try { await deleteBeautyService(s.id); addToast('O\'chirildi'); load(); }
    catch { addToast('O\'chirib bo\'lmadi'); }
    finally { setConfirm(null); }
  };

  const visible = services.filter((s) => {
    const q = search.toLowerCase();
    return (
      (!catFilter || s.category === catFilter) &&
      (s.name.toLowerCase().includes(q) || (s.category ?? '').toLowerCase().includes(q))
    );
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Xizmatlar katalogi</h2>
          <p className="page-subtitle">{services.length} ta xizmat</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Qo'shish</button>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input className="search-input" placeholder="Xizmat nomi..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="">Barcha kategoriya</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /></div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Xizmat nomi</th><th>Kategoriya</th><th>Davomiyligi</th><th>Narxi</th><th>Holat</th><th>Amallar</th></tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id} style={{ opacity: s.isActive ? 1 : 0.55 }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Scissors size={13} color="#fff" />
                      </span>
                      <strong>{s.name}</strong>
                    </div>
                  </td>
                  <td>{s.category ? <span className="badge badge--active" style={{ fontSize: '0.75rem' }}>{s.category}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td>{s.duration} min</td>
                  <td className="amount-cell">{fmt(Number(s.price))}</td>
                  <td>
                    <span className={`badge ${s.isActive ? 'badge--active' : 'badge--inactive'}`}>
                      {s.isActive ? 'Faol' : 'Nofaol'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-icon" title="Tahrirlash" onClick={() => openEdit(s)}><Edit size={15} /></button>
                      <button className="btn-icon btn-icon--danger" title="O'chirish" onClick={() => setConfirm(s)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Xizmat topilmadi</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Xizmatni tahrirlash' : 'Yangi xizmat'}</h3>
              <button className="btn-icon" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Xizmat nomi *</label>
                <input className="form-input" placeholder="Masalan: Soch kesish" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Kategoriya</label>
                  <select className="form-input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                    <option value="">Tanlang</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Davomiyligi (min)</label>
                  <input className="form-input" type="number" min={5} step={5} placeholder="60" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Narxi (so'm) *</label>
                <input className="form-input" type="number" min={0} placeholder="50000" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
                  Faol (mijozlarga ko'rinadi)
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
            <div className="modal-body"><p><strong>{confirm.name}</strong> xizmatini o'chirasizmi?</p></div>
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
