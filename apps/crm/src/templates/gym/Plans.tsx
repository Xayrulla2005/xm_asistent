import { useCallback, useEffect, useState } from 'react';
import { Plus, Edit, Trash2, X, Clock, DollarSign } from 'lucide-react';
import { GymPlan, getGymPlans, createGymPlan, updateGymPlan, deleteGymPlan } from '../../api/gym.api';
import { useToastStore } from '../../stores/toast.store';

type FormData = { name: string; description: string; durationDays: string; price: string; isActive: boolean };
const EMPTY: FormData = { name: '', description: '', durationDays: '30', price: '', isActive: true };

const DURATION_PRESETS = [
  { days: 7,   label: '1 hafta'  },
  { days: 30,  label: '1 oy'     },
  { days: 90,  label: '3 oy'     },
  { days: 180, label: '6 oy'     },
  { days: 365, label: '1 yil'    },
];

export default function GymPlans() {
  const addToast = useToastStore((s) => s.toast);
  const [plans,   setPlans]   = useState<GymPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState<GymPlan | null>(null);
  const [form,    setForm]    = useState<FormData>(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [confirm, setConfirm] = useState<GymPlan | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getGymPlans()
      .then(setPlans)
      .catch(() => addToast('Yuklab bo\'lmadi'))
      .finally(() => setLoading(false));
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (p: GymPlan) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description ?? '', durationDays: String(p.durationDays), price: String(p.price), isActive: p.isActive });
    setModal(true);
  };

  const f = (k: keyof FormData, v: string | boolean) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { addToast('Reja nomi kiritilishi shart'); return; }
    if (!form.price)        { addToast('Narx kiritilishi shart');      return; }
    setSaving(true);
    const dto = { ...form, durationDays: parseInt(form.durationDays) || 30, price: parseFloat(form.price) || 0 };
    try {
      if (editing) {
        const updated = await updateGymPlan(editing.id, dto);
        setPlans((prev) => prev.map((p) => p.id === updated.id ? updated : p));
        addToast('Yangilandi', 'success');
      } else {
        const created = await createGymPlan(dto);
        setPlans((prev) => [...prev, created].sort((a, b) => a.durationDays - b.durationDays));
        addToast("Qo'shildi", 'success');
      }
      setModal(false);
    } catch { addToast('Xatolik'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await deleteGymPlan(confirm.id);
      setPlans((prev) => prev.filter((p) => p.id !== confirm.id));
      addToast("O'chirildi", 'success');
    } catch { addToast('Xatolik'); }
    finally { setConfirm(null); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Obuna rejalari</h2>
        <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={15} /> Yangi reja
        </button>
      </div>

      {loading ? <p className="state-msg">Yuklanmoqda...</p>
       : plans.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          <DollarSign size={40} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.4 }} />
          <p style={{ margin: 0 }}>Hali reja qo'shilmagan</p>
          <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={openAdd}>Birinchi rejani yaratish</button>
        </div>
       ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {plans.map((p) => (
            <div key={p.id} className="card" style={{ opacity: p.isActive ? 1 : 0.55, position: 'relative' }}>
              {!p.isActive && (
                <span style={{ position: 'absolute', top: '0.65rem', right: '0.65rem', fontSize: '0.7rem', background: 'rgba(100,116,139,0.15)', color: '#64748b', padding: '0.15rem 0.5rem', borderRadius: 10 }}>
                  Nofaol
                </span>
              )}
              <div style={{ marginBottom: '0.85rem' }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.25rem' }}>{p.name}</div>
                {p.description && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{p.description}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  <Clock size={13} /> {p.durationDays} kun
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>
                  {Number(p.price).toLocaleString()} so'm
                </div>
              </div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Kunlik: {Math.round(Number(p.price) / p.durationDays).toLocaleString()} so'm/kun
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => openEdit(p)}><Edit size={13} /></button>
                <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', color: '#ef4444' }} onClick={() => setConfirm(p)}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>{editing ? 'Rejani tahrirlash' : 'Yangi reja'}</h3>
              <button onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1.25rem' }}>
              <div className="field"><label>Nomi *</label><input type="text" value={form.name} onChange={(e) => f('name', e.target.value)} placeholder="Oylik obuna" required /></div>
              <div className="field"><label>Tavsif</label><textarea value={form.description} onChange={(e) => f('description', e.target.value)} rows={2} style={{ resize: 'vertical' }} /></div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 500, display: 'block', marginBottom: '0.5rem' }}>Davomiylik</label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  {DURATION_PRESETS.map((d) => (
                    <button key={d.days} type="button"
                      onClick={() => f('durationDays', String(d.days))}
                      style={{
                        fontSize: '0.78rem', padding: '0.25rem 0.65rem', borderRadius: 20, cursor: 'pointer', border: '1px solid',
                        background: form.durationDays === String(d.days) ? 'var(--primary)' : 'transparent',
                        color: form.durationDays === String(d.days) ? '#fff' : 'var(--text-muted)',
                        borderColor: form.durationDays === String(d.days) ? 'var(--primary)' : 'var(--border)',
                      }}>
                      {d.label}
                    </button>
                  ))}
                </div>
                <input type="number" min="1" value={form.durationDays} onChange={(e) => f('durationDays', e.target.value)} placeholder="30" />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>kun</span>
              </div>
              <div className="field"><label>Narxi (so'm) *</label><input type="number" value={form.price} onChange={(e) => f('price', e.target.value)} placeholder="350000" required /></div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.84rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => f('isActive', e.target.checked)} />
                Faol (yangi a'zolar tanlashi mumkin)
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
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 340 }}>
            <div className="modal-header"><h3>Rejani o'chirish</h3><button onClick={() => setConfirm(null)}><X size={18} /></button></div>
            <div style={{ padding: '1.25rem' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}><strong>{confirm.name}</strong> rejasini o'chirishni tasdiqlaysizmi?</p>
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
