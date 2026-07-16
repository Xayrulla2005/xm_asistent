import { useEffect, useState } from 'react';
import { Plus, Users, Edit, Trash2, X } from 'lucide-react';
import { RestTable, getTables, createTable, updateTable, deleteTable } from '../../api/restaurant.api';
import { useToastStore } from '../../stores/toast.store';

const TABLE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  free:     { label: 'Bosh',    color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  occupied: { label: 'Band',    color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  reserved: { label: 'Bron',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  cleaning: { label: 'Tozalanmoqda', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
};

type FormData = { number: string; capacity: string; zone: string; };
const EMPTY: FormData = { number: '', capacity: '4', zone: '' };

export default function Tables() {
  const addToast = useToastStore((s) => s.toast);
  const [list,    setList]    = useState<RestTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState<RestTable | null>(null);
  const [form,    setForm]    = useState<FormData>(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [confirm, setConfirm] = useState<RestTable | null>(null);

  useEffect(() => {
    getTables().then(setList).catch(() => addToast('Yuklab bo\'lmadi')).finally(() => setLoading(false));
  }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (t: RestTable) => {
    setEditing(t);
    setForm({ number: t.number, capacity: String(t.capacity), zone: t.zone ?? '' });
    setModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.number.trim()) { addToast('Stol raqami kiritilishi shart'); return; }
    setSaving(true);
    const dto = { ...form, capacity: parseInt(form.capacity) || 4 };
    try {
      if (editing) {
        const updated = await updateTable(editing.id, dto);
        setList((prev) => prev.map((t) => t.id === updated.id ? updated : t));
        addToast('Yangilandi', 'success');
      } else {
        const created = await createTable(dto);
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
      await deleteTable(confirm.id);
      setList((prev) => prev.filter((t) => t.id !== confirm.id));
      addToast("O'chirildi", 'success');
    } catch { addToast('Xatolik'); }
    finally { setConfirm(null); }
  };

  const changeStatus = async (t: RestTable, status: string) => {
    try {
      const updated = await updateTable(t.id, { status });
      setList((prev) => prev.map((x) => x.id === updated.id ? updated : x));
    } catch { addToast('Xatolik'); }
  };

  const f = (key: keyof FormData, val: string) => setForm((prev) => ({ ...prev, [key]: val }));
  const stats = { free: list.filter((t) => t.status === 'free').length, occupied: list.filter((t) => t.status === 'occupied').length };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Stollar</h2>
        <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={15} /> Stol qo'shish
        </button>
      </div>

      {/* Mini stats */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Jami stollar', value: list.length, color: '#6366f1' },
          { label: 'Bosh', value: stats.free, color: '#10b981' },
          { label: 'Band', value: stats.occupied, color: '#ef4444' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '0 0 auto' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 700, color }}>{value}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      {loading ? <p className="state-msg">Yuklanmoqda...</p>
       : list.length === 0 ? <p className="state-msg">Stollar topilmadi</p>
       : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.85rem' }}>
          {list.map((t) => {
            const st = TABLE_STATUS[t.status] ?? TABLE_STATUS.free;
            return (
              <div key={t.id} className="card" style={{ border: `2px solid ${st.color}44`, padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>Stol {t.number}</div>
                    {t.zone && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.zone}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button className="btn-secondary" style={{ padding: '0.25rem 0.4rem' }} onClick={() => openEdit(t)}><Edit size={12} /></button>
                    <button className="btn-secondary" style={{ padding: '0.25rem 0.4rem', color: '#ef4444' }} onClick={() => setConfirm(t)}><Trash2 size={12} /></button>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <Users size={13} /> {t.capacity} kishi
                </div>
                <select
                  value={t.status}
                  onChange={(e) => changeStatus(t, e.target.value)}
                  style={{ width: '100%', border: `1px solid ${st.color}44`, background: st.bg, color: st.color, borderRadius: 20, padding: '0.3rem 0.6rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  {Object.entries(TABLE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h3>{editing ? 'Stolni tahrirlash' : "Yangi stol qo'shish"}</h3>
              <button onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field"><label>Raqami *</label><input type="text" placeholder="1" value={form.number} onChange={(e) => f('number', e.target.value)} required /></div>
                <div className="field"><label>Sig'im (kishi)</label><input type="number" placeholder="4" min="1" value={form.capacity} onChange={(e) => f('capacity', e.target.value)} /></div>
              </div>
              <div className="field"><label>Zona (xona)</label><input type="text" placeholder="Asosiy zal, Terasda..." value={form.zone} onChange={(e) => f('zone', e.target.value)} /></div>
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
            <div className="modal-header"><h3>Stolni o'chirish</h3><button onClick={() => setConfirm(null)}><X size={18} /></button></div>
            <div style={{ padding: '1.25rem' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Stol <strong>{confirm.number}</strong>ni o'chirishni tasdiqlaysizmi?</p>
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
