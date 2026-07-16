import { useEffect, useState } from 'react';
import { Plus, User, Phone, Edit, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { Teacher, getTeachers, createTeacher, updateTeacher, deleteTeacher } from '../../api/education.api';
import { useToastStore } from '../../stores/toast.store';

const SUBJECTS = [
  "Ingliz tili", "Rus tili", "Matematika", "Fizika", "Kimyo", "Biologiya",
  "Dasturlash", "Dizayn", "Musiqa", "Sport", "Tarix", "Adabiyot",
];

type FormData = { firstName: string; lastName: string; phone: string; subject: string; salary: string; schedule: string; };
const EMPTY: FormData = { firstName: '', lastName: '', phone: '', subject: '', salary: '', schedule: '' };

export default function Teachers() {
  const addToast = useToastStore((s) => s.toast);
  const [list,    setList]    = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form,    setForm]    = useState<FormData>(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [confirm, setConfirm] = useState<Teacher | null>(null);

  useEffect(() => {
    getTeachers()
      .then(setList)
      .catch(() => addToast('Yuklab bo\'lmadi'))
      .finally(() => setLoading(false));
  }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (t: Teacher) => {
    setEditing(t);
    setForm({ firstName: t.firstName, lastName: t.lastName, phone: t.phone ?? '', subject: t.subject ?? '', salary: String(t.salary ?? ''), schedule: t.schedule ?? '' });
    setModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim()) { addToast('Ism kiritilishi shart'); return; }
    setSaving(true);
    const dto = { ...form, salary: parseFloat(form.salary) || 0 };
    try {
      if (editing) {
        const updated = await updateTeacher(editing.id, dto);
        setList((prev) => prev.map((t) => t.id === updated.id ? updated : t));
        addToast("O'qituvchi yangilandi", 'success');
      } else {
        const created = await createTeacher(dto);
        setList((prev) => [...prev, created]);
        addToast("O'qituvchi qo'shildi", 'success');
      }
      setModal(false);
    } catch { addToast('Xatolik'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await deleteTeacher(confirm.id);
      setList((prev) => prev.filter((t) => t.id !== confirm.id));
      addToast("O'qituvchi o'chirildi", 'success');
    } catch { addToast('Xatolik'); }
    finally { setConfirm(null); }
  };

  const toggleActive = async (t: Teacher) => {
    try {
      const updated = await updateTeacher(t.id, { isActive: !t.isActive });
      setList((prev) => prev.map((x) => x.id === updated.id ? updated : x));
    } catch { addToast('Xatolik'); }
  };

  const f = (key: keyof FormData, val: string) => setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">O'qituvchilar</h2>
        <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={15} /> O'qituvchi qo'shish
        </button>
      </div>

      {loading ? <p className="state-msg">Yuklanmoqda...</p>
       : list.length === 0 ? <p className="state-msg">O'qituvchilar topilmadi</p>
       : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>O'qituvchi</th><th>Fan</th><th>Telefon</th><th>Dars jadvali</th><th>Maosh</th><th>Holat</th><th></th></tr></thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={14} style={{ color: 'var(--primary)' }} />
                      </div>
                      <span style={{ fontWeight: 500 }}>{t.firstName} {t.lastName}</span>
                    </div>
                  </td>
                  <td>
                    {t.subject
                      ? <span className="badge" style={{ background: 'rgba(99,102,241,0.08)', color: 'var(--primary)', border: '1px solid rgba(99,102,241,0.2)' }}>{t.subject}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ fontSize: '0.83rem' }}>
                    {t.phone ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Phone size={11} />{t.phone}</span> : '—'}
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{t.schedule ?? '—'}</td>
                  <td style={{ fontWeight: 500 }}>{t.salary > 0 ? `${Number(t.salary).toLocaleString()} so'm` : '—'}</td>
                  <td>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600, background: t.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(148,163,184,0.1)', color: t.isActive ? '#10b981' : '#94a3b8' }}>
                      {t.isActive ? 'Faol' : 'Nofaol'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button className="btn-secondary" style={{ padding: '0.3rem 0.5rem' }} onClick={() => toggleActive(t)}>
                        {t.isActive ? <ToggleRight size={14} style={{ color: '#10b981' }} /> : <ToggleLeft size={14} />}
                      </button>
                      <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem' }} onClick={() => openEdit(t)}><Edit size={13} /></button>
                      <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem', color: '#ef4444' }} onClick={() => setConfirm(t)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>{editing ? "O'qituvchini tahrirlash" : "Yangi o'qituvchi qo'shish"}</h3>
              <button onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field"><label>Ism *</label><input type="text" value={form.firstName} onChange={(e) => f('firstName', e.target.value)} required /></div>
                <div className="field"><label>Familiya</label><input type="text" value={form.lastName} onChange={(e) => f('lastName', e.target.value)} /></div>
              </div>
              <div className="field">
                <label>Fan / Yo'nalish</label>
                <select value={form.subject} onChange={(e) => f('subject', e.target.value)}>
                  <option value="">Tanlang</option>
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field"><label>Telefon</label><input type="tel" value={form.phone} onChange={(e) => f('phone', e.target.value)} /></div>
                <div className="field"><label>Maosh (so'm)</label><input type="number" value={form.salary} onChange={(e) => f('salary', e.target.value)} /></div>
              </div>
              <div className="field"><label>Dars jadvali</label><input type="text" placeholder="Du-Chor-Ju 10:00-18:00" value={form.schedule} onChange={(e) => f('schedule', e.target.value)} /></div>
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
            <div className="modal-header">
              <h3>O'qituvchini o'chirish</h3>
              <button onClick={() => setConfirm(null)}><X size={18} /></button>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}><strong>{confirm.firstName} {confirm.lastName}</strong>ni o'chirishni tasdiqlaysizmi?</p>
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
