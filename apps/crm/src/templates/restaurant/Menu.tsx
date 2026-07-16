import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, UtensilsCrossed, Clock, Edit, Trash2, X, Star } from 'lucide-react';
import { MenuItem, getMenu, createMenuItem, updateMenuItem, deleteMenuItem } from '../../api/restaurant.api';
import { useToastStore } from '../../stores/toast.store';

const CATEGORIES = ['Asosiy taom', 'Salatlar', 'Sho\'rvalar', 'Ichimliklar', 'Desertlar', 'Nonlar', 'Grillar', 'Fastfood'];

type FormData = {
  name: string; category: string; description: string;
  price: string; preparationTime: string; isPopular: boolean;
};
const EMPTY: FormData = { name: '', category: '', description: '', price: '', preparationTime: '15', isPopular: false };

export default function Menu() {
  const addToast = useToastStore((s) => s.toast);
  const [list,    setList]    = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form,    setForm]    = useState<FormData>(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [confirm, setConfirm] = useState<MenuItem | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getMenu(undefined, catFilter || undefined)
      .then(setList)
      .catch(() => addToast('Yuklab bo\'lmadi'))
      .finally(() => setLoading(false));
  }, [catFilter, addToast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (m: MenuItem) => {
    setEditing(m);
    setForm({ name: m.name, category: m.category ?? '', description: m.description ?? '', price: String(m.price), preparationTime: String(m.preparationTime), isPopular: m.isPopular });
    setModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { addToast('Taom nomi kiritilishi shart'); return; }
    setSaving(true);
    const dto = { ...form, price: parseFloat(form.price) || 0, preparationTime: parseInt(form.preparationTime) || 15 };
    try {
      if (editing) {
        const updated = await updateMenuItem(editing.id, dto);
        setList((prev) => prev.map((m) => m.id === updated.id ? updated : m));
        addToast('Yangilandi', 'success');
      } else {
        const created = await createMenuItem(dto);
        setList((prev) => [...prev, created]);
        addToast("Qo'shildi", 'success');
      }
      setModal(false);
    } catch { addToast('Xatolik'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await deleteMenuItem(confirm.id);
      setList((prev) => prev.filter((m) => m.id !== confirm.id));
      addToast("O'chirildi", 'success');
    } catch { addToast('Xatolik'); }
    finally { setConfirm(null); }
  };

  const toggleAvailable = async (m: MenuItem) => {
    try {
      const updated = await updateMenuItem(m.id, { isAvailable: !m.isAvailable });
      setList((prev) => prev.map((x) => x.id === updated.id ? updated : x));
    } catch { addToast('Xatolik'); }
  };

  const f = (key: keyof FormData, val: string | boolean) => setForm((prev) => ({ ...prev, [key]: val }));
  const filtered = search ? list.filter((m) => m.name.toLowerCase().includes(search.toLowerCase())) : list;
  const categories = [...new Set(list.map((m) => m.category).filter(Boolean))] as string[];

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Menyu</h2>
        <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={15} /> Taom qo'shish
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 340 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Taom nomi..." value={search}
            onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()}
            style={{ paddingLeft: '2.2rem', width: '100%', boxSizing: 'border-box' }} />
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={{ width: 180 }}>
          <option value="">Barcha kategoriyalar</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? <p className="state-msg">Yuklanmoqda...</p>
       : filtered.length === 0 ? <p className="state-msg">Taomlar topilmadi</p>
       : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {filtered.map((m) => (
            <div key={m.id} className="card" style={{ opacity: m.isAvailable ? 1 : 0.55 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UtensilsCrossed size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <span style={{ fontWeight: 600 }}>{m.name}</span>
                  {m.isPopular && <Star size={13} style={{ color: '#f59e0b' }} />}
                </div>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => openEdit(m)}><Edit size={12} /></button>
                  <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', color: '#ef4444' }} onClick={() => setConfirm(m)}><Trash2 size={12} /></button>
                </div>
              </div>
              {m.category && (
                <span className="badge" style={{ fontSize: '0.72rem', background: 'rgba(99,102,241,0.08)', color: 'var(--primary)', border: '1px solid rgba(99,102,241,0.2)', marginBottom: '0.5rem', display: 'inline-block' }}>
                  {m.category}
                </span>
              )}
              {m.description && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem', lineHeight: 1.4 }}>{m.description}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>{Number(m.price).toLocaleString()} so'm</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {m.preparationTime > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={11} />{m.preparationTime} min</span>}
                  <button
                    className="btn-secondary"
                    style={{ padding: '0.2rem 0.6rem', fontSize: '0.73rem', color: m.isAvailable ? '#10b981' : '#94a3b8', borderColor: m.isAvailable ? 'rgba(16,185,129,0.3)' : 'var(--border)' }}
                    onClick={() => toggleAvailable(m)}
                  >
                    {m.isAvailable ? 'Mavjud' : 'Mavjud emas'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3>{editing ? 'Taomni tahrirlash' : "Yangi taom qo'shish"}</h3>
              <button onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1.25rem' }}>
              <div className="field"><label>Nomi *</label><input type="text" placeholder="Osh" value={form.name} onChange={(e) => f('name', e.target.value)} required /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Kategoriya</label>
                  <select value={form.category} onChange={(e) => f('category', e.target.value)}>
                    <option value="">Tanlang</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Tayyorlash vaqti (min)</label>
                  <input type="number" value={form.preparationTime} onChange={(e) => f('preparationTime', e.target.value)} />
                </div>
              </div>
              <div className="field"><label>Narxi (so'm) *</label><input type="number" placeholder="35000" value={form.price} onChange={(e) => f('price', e.target.value)} required /></div>
              <div className="field"><label>Tavsif</label><textarea value={form.description} onChange={(e) => f('description', e.target.value)} rows={2} style={{ resize: 'vertical' }} /></div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.84rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isPopular} onChange={(e) => f('isPopular', e.target.checked)} />
                Mashhur taom (yulduzcha bilan belgilanadi)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Bekor</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <div className="modal-header"><h3>Taomni o'chirish</h3><button onClick={() => setConfirm(null)}><X size={18} /></button></div>
            <div style={{ padding: '1.25rem' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}><strong>{confirm.name}</strong>ni o'chirishni tasdiqlaysizmi?</p>
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
