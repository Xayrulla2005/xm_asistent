import { useEffect, useState } from 'react';
import { Plus, Search, GraduationCap, Phone, Edit, Trash2, X } from 'lucide-react';
import { Student, getStudents, createStudent, updateStudent, deleteStudent } from '../../api/education.api';
import { Course, getCourses } from '../../api/education.api';
import { useToastStore } from '../../stores/toast.store';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active:     { label: 'Faol',     color: '#10b981' },
  inactive:   { label: 'Nofaol',   color: '#94a3b8' },
  graduated:  { label: 'Bitirgan', color: '#6366f1' },
  expelled:   { label: 'Chiqarib yuborilgan', color: '#ef4444' },
};

const LEVELS = ["Boshlang'ich", "O'rta", "Yuqori", 'A1', 'A2', 'B1', 'B2', 'C1'];

type FormData = {
  firstName: string; lastName: string; phone: string; parentPhone: string;
  courseId: string; courseName: string; group: string; level: string;
  monthlyFee: string; enrolledAt: string; notes: string;
};
const EMPTY: FormData = {
  firstName: '', lastName: '', phone: '', parentPhone: '',
  courseId: '', courseName: '', group: '', level: '',
  monthlyFee: '', enrolledAt: '', notes: '',
};

export default function Students() {
  const addToast = useToastStore((s) => s.toast);
  const [list,    setList]    = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form,    setForm]    = useState<FormData>(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [confirm, setConfirm] = useState<Student | null>(null);

  const load = (q?: string) => {
    setLoading(true);
    Promise.all([getStudents(q), getCourses()])
      .then(([s, c]) => { setList(s); setCourses(c); })
      .catch(() => addToast('Yuklab bo\'lmadi'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (s: Student) => {
    setEditing(s);
    setForm({
      firstName: s.firstName, lastName: s.lastName, phone: s.phone ?? '',
      parentPhone: s.parentPhone ?? '', courseId: s.courseId ?? '',
      courseName: s.courseName ?? '', group: s.group ?? '', level: s.level ?? '',
      monthlyFee: String(s.monthlyFee ?? ''), enrolledAt: s.enrolledAt ?? '', notes: s.notes ?? '',
    });
    setModal(true);
  };

  const handleCourseChange = (id: string) => {
    const c = courses.find((x) => x.id === id);
    setForm((prev) => ({
      ...prev, courseId: id, courseName: c?.name ?? '',
      monthlyFee: c ? String(c.monthlyFee) : prev.monthlyFee,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim()) { addToast('Ism kiritilishi shart'); return; }
    setSaving(true);
    const dto = { ...form, monthlyFee: parseFloat(form.monthlyFee) || 0 };
    try {
      if (editing) {
        const updated = await updateStudent(editing.id, dto);
        setList((prev) => prev.map((s) => s.id === updated.id ? updated : s));
        addToast("O'quvchi yangilandi", 'success');
      } else {
        const created = await createStudent(dto);
        setList((prev) => [created, ...prev]);
        addToast("O'quvchi qo'shildi", 'success');
      }
      setModal(false);
    } catch { addToast('Xatolik'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await deleteStudent(confirm.id);
      setList((prev) => prev.filter((s) => s.id !== confirm.id));
      addToast("O'quvchi o'chirildi", 'success');
    } catch { addToast('Xatolik'); }
    finally { setConfirm(null); }
  };

  const f = (key: keyof FormData, val: string) => setForm((prev) => ({ ...prev, [key]: val }));
  const filtered = search
    ? list.filter((s) => `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) || (s.phone ?? '').includes(search))
    : list;

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">O'quvchilar</h2>
        <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={15} /> O'quvchi qo'shish
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Ism yoki telefon..." value={search}
            onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '2.2rem', width: '100%', boxSizing: 'border-box' }} />
        </div>
      </div>

      {loading ? <p className="state-msg">Yuklanmoqda...</p>
       : filtered.length === 0 ? <p className="state-msg">O'quvchilar topilmadi</p>
       : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>O'quvchi</th>
                <th>Telefon</th>
                <th>Kurs / Guruh</th>
                <th>Daraja</th>
                <th>Oylik to'lov</th>
                <th>Holat</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const st = STATUS_MAP[s.status] ?? STATUS_MAP.active;
                return (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <GraduationCap size={13} style={{ color: 'var(--primary)' }} />
                        </div>
                        <span style={{ fontWeight: 500 }}>{s.firstName} {s.lastName}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.83rem' }}>
                      {s.phone
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Phone size={11} />{s.phone}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ fontSize: '0.83rem' }}>
                      <div>{s.courseName ?? '—'}</div>
                      {s.group && <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{s.group}</div>}
                    </td>
                    <td>
                      {s.level
                        ? <span className="badge" style={{ background: 'rgba(139,92,246,0.08)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)' }}>{s.level}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ fontWeight: 500 }}>{s.monthlyFee > 0 ? `${Number(s.monthlyFee).toLocaleString()} so'm` : '—'}</td>
                    <td>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600, background: `${st.color}18`, color: st.color }}>
                        {st.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem' }} onClick={() => openEdit(s)}><Edit size={13} /></button>
                        <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem', color: '#ef4444' }} onClick={() => setConfirm(s)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>{editing ? "O'quvchini tahrirlash" : "Yangi o'quvchi qo'shish"}</h3>
              <button onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field"><label>Ism *</label><input type="text" value={form.firstName} onChange={(e) => f('firstName', e.target.value)} required /></div>
                <div className="field"><label>Familiya</label><input type="text" value={form.lastName} onChange={(e) => f('lastName', e.target.value)} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field"><label>Telefon</label><input type="tel" value={form.phone} onChange={(e) => f('phone', e.target.value)} /></div>
                <div className="field"><label>Ota-ona telefoni</label><input type="tel" value={form.parentPhone} onChange={(e) => f('parentPhone', e.target.value)} /></div>
              </div>
              <div className="field">
                <label>Kurs</label>
                <select value={form.courseId} onChange={(e) => handleCourseChange(e.target.value)}>
                  <option value="">Tanlang</option>
                  {courses.filter((c) => c.isActive).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Guruh</label>
                  <input type="text" placeholder="G-101" value={form.group} onChange={(e) => f('group', e.target.value)} />
                </div>
                <div className="field">
                  <label>Daraja</label>
                  <select value={form.level} onChange={(e) => f('level', e.target.value)}>
                    <option value="">Tanlang</option>
                    {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Oylik to'lov</label>
                  <input type="number" value={form.monthlyFee} onChange={(e) => f('monthlyFee', e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Qabul sanasi</label>
                  <input type="date" value={form.enrolledAt} onChange={(e) => f('enrolledAt', e.target.value)} />
                </div>
                <div className="field">
                  <label>Holat</label>
                  <select value={(editing as Student | null)?.status ?? 'active'} onChange={(e) => setEditing((prev) => prev ? { ...prev, status: e.target.value } : prev)}>
                    {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Izoh</label>
                <textarea value={form.notes} onChange={(e) => f('notes', e.target.value)} rows={2} style={{ resize: 'vertical' }} />
              </div>
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
              <h3>O'quvchini o'chirish</h3>
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
