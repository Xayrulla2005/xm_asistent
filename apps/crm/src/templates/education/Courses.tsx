import { useEffect, useState } from 'react';
import { Plus, BookOpen, User, Clock, Edit, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { Course, getCourses, createCourse, updateCourse, deleteCourse } from '../../api/education.api';
import { Teacher, getTeachers } from '../../api/education.api';
import { useToastStore } from '../../stores/toast.store';

const LEVELS = ["Boshlang'ich", "O'rta", "Yuqori", 'A1', 'A2', 'B1', 'B2', 'C1'];

type FormData = {
  name: string; description: string; teacherId: string; teacherName: string;
  durationMonths: string; monthlyFee: string; schedule: string;
  level: string; maxStudents: string;
};
const EMPTY: FormData = {
  name: '', description: '', teacherId: '', teacherName: '',
  durationMonths: '3', monthlyFee: '', schedule: '', level: '', maxStudents: '20',
};

export default function Courses() {
  const addToast = useToastStore((s) => s.toast);
  const [list,     setList]     = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState<Course | null>(null);
  const [form,     setForm]     = useState<FormData>(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [confirm,  setConfirm]  = useState<Course | null>(null);

  useEffect(() => {
    Promise.all([getCourses(), getTeachers()])
      .then(([c, t]) => { setList(c); setTeachers(t); })
      .catch(() => addToast('Yuklab bo\'lmadi'))
      .finally(() => setLoading(false));
  }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (c: Course) => {
    setEditing(c);
    setForm({
      name: c.name, description: c.description ?? '', teacherId: c.teacherId ?? '',
      teacherName: c.teacherName ?? '', durationMonths: String(c.durationMonths),
      monthlyFee: String(c.monthlyFee), schedule: c.schedule ?? '',
      level: c.level ?? '', maxStudents: String(c.maxStudents),
    });
    setModal(true);
  };

  const handleTeacherChange = (id: string) => {
    const t = teachers.find((x) => x.id === id);
    setForm((prev) => ({ ...prev, teacherId: id, teacherName: t ? `${t.firstName} ${t.lastName}` : '' }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { addToast('Kurs nomi kiritilishi shart'); return; }
    setSaving(true);
    const dto = {
      ...form,
      durationMonths: parseInt(form.durationMonths) || 1,
      monthlyFee: parseFloat(form.monthlyFee) || 0,
      maxStudents: parseInt(form.maxStudents) || 20,
    };
    try {
      if (editing) {
        const updated = await updateCourse(editing.id, dto);
        setList((prev) => prev.map((c) => c.id === updated.id ? updated : c));
        addToast('Kurs yangilandi', 'success');
      } else {
        const created = await createCourse(dto);
        setList((prev) => [...prev, created]);
        addToast("Kurs qo'shildi", 'success');
      }
      setModal(false);
    } catch { addToast('Xatolik'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await deleteCourse(confirm.id);
      setList((prev) => prev.filter((c) => c.id !== confirm.id));
      addToast("Kurs o'chirildi", 'success');
    } catch { addToast('Xatolik'); }
    finally { setConfirm(null); }
  };

  const toggleActive = async (c: Course) => {
    try {
      const updated = await updateCourse(c.id, { isActive: !c.isActive });
      setList((prev) => prev.map((x) => x.id === updated.id ? updated : x));
    } catch { addToast('Xatolik'); }
  };

  const f = (key: keyof FormData, val: string) => setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Kurslar</h2>
        <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={15} /> Kurs qo'shish
        </button>
      </div>

      {loading ? <p className="state-msg">Yuklanmoqda...</p>
       : list.length === 0 ? <p className="state-msg">Kurslar topilmadi</p>
       : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {list.map((c) => (
            <div key={c.id} className="card" style={{ opacity: c.isActive ? 1 : 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BookOpen size={16} style={{ color: 'var(--primary)' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.name}</div>
                    {c.level && <span className="badge" style={{ fontSize: '0.7rem', background: 'rgba(139,92,246,0.08)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)' }}>{c.level}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => toggleActive(c)}>
                    {c.isActive ? <ToggleRight size={14} style={{ color: '#10b981' }} /> : <ToggleLeft size={14} />}
                  </button>
                  <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => openEdit(c)}><Edit size={12} /></button>
                  <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', color: '#ef4444' }} onClick={() => setConfirm(c)}><Trash2 size={12} /></button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {c.teacherName && <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><User size={12} />{c.teacherName}</span>}
                {c.schedule && <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Clock size={12} />{c.schedule}</span>}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                  <span>{c.durationMonths} oy</span>
                  {c.monthlyFee > 0 && <strong style={{ color: 'var(--text)' }}>{Number(c.monthlyFee).toLocaleString()} so'm/oy</strong>}
                </div>
                {c.maxStudents > 0 && <span>Maks. o'quvchi: {c.maxStudents}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>{editing ? 'Kursni tahrirlash' : "Yangi kurs qo'shish"}</h3>
              <button onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1.25rem' }}>
              <div className="field"><label>Kurs nomi *</label><input type="text" placeholder="Ingliz tili (Boshlang'ich)" value={form.name} onChange={(e) => f('name', e.target.value)} required /></div>
              <div className="field">
                <label>O'qituvchi</label>
                <select value={form.teacherId} onChange={(e) => handleTeacherChange(e.target.value)}>
                  <option value="">Tanlang</option>
                  {teachers.filter((t) => t.isActive).map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName} — {t.subject}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="field"><label>Davomiyligi (oy)</label><input type="number" value={form.durationMonths} onChange={(e) => f('durationMonths', e.target.value)} /></div>
                <div className="field"><label>Oylik to'lov</label><input type="number" value={form.monthlyFee} onChange={(e) => f('monthlyFee', e.target.value)} /></div>
                <div className="field"><label>Maks. o'quvchi</label><input type="number" value={form.maxStudents} onChange={(e) => f('maxStudents', e.target.value)} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Daraja</label>
                  <select value={form.level} onChange={(e) => f('level', e.target.value)}>
                    <option value="">Tanlang</option>
                    {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="field"><label>Dars jadvali</label><input type="text" placeholder="Du-Chor-Ju 15:00" value={form.schedule} onChange={(e) => f('schedule', e.target.value)} /></div>
              </div>
              <div className="field"><label>Tavsif</label><textarea value={form.description} onChange={(e) => f('description', e.target.value)} rows={2} style={{ resize: 'vertical' }} /></div>
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
              <h3>Kursni o'chirish</h3>
              <button onClick={() => setConfirm(null)}><X size={18} /></button>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}><strong>{confirm.name}</strong> kursini o'chirishni tasdiqlaysizmi?</p>
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
