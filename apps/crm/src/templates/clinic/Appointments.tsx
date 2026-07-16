import { useEffect, useState } from 'react';
import { Plus, CalendarDays, Clock, User, Stethoscope, Edit, Trash2, X, Check } from 'lucide-react';
import {
  Appointment, getAppointments, getAppointmentStats,
  createAppointment, updateAppointment, deleteAppointment,
} from '../../api/clinic.api';
import { getDoctors, Doctor } from '../../api/clinic.api';
import { useToastStore } from '../../stores/toast.store';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  scheduled:  { label: 'Rejalashtirilgan', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
  completed:  { label: 'Bajarildi',        color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  cancelled:  { label: 'Bekor qilindi',    color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  no_show:    { label: "Kelmadi",          color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
};

const APPT_TYPES = ['Konsultatsiya', 'Tekshiruv', 'Davolash', 'Protsedura', 'Operatsiya', 'Boshqa'];

type FormData = {
  patientName: string; doctorId: string; doctorName: string;
  specialty: string; date: string; time: string;
  duration: string; type: string; notes: string; fee: string;
};

const EMPTY: FormData = {
  patientName: '', doctorId: '', doctorName: '', specialty: '',
  date: new Date().toISOString().slice(0, 10),
  time: '09:00', duration: '30', type: '', notes: '', fee: '',
};

export default function Appointments() {
  const addToast = useToastStore((s) => s.toast);
  const [list,    setList]    = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [stats,   setStats]   = useState<{ total: number; today: number; scheduled: number; completed: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [form,    setForm]    = useState<FormData>(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [confirm, setConfirm] = useState<Appointment | null>(null);
  const [dateFilter, setDateFilter] = useState('');

  const load = (date?: string) => {
    setLoading(true);
    Promise.all([
      getAppointments(date || undefined),
      getAppointmentStats(),
      getDoctors(),
    ])
      .then(([appts, st, docs]) => { setList(appts); setStats(st); setDoctors(docs); })
      .catch(() => addToast('Yuklab bo\'lmadi'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (a: Appointment) => {
    setEditing(a);
    setForm({
      patientName: a.patientName ?? '', doctorId: a.doctorId ?? '',
      doctorName: a.doctorName ?? '', specialty: a.specialty ?? '',
      date: a.date, time: a.time.slice(0, 5),
      duration: String(a.duration), type: a.type ?? '',
      notes: a.notes ?? '', fee: String(a.fee ?? ''),
    });
    setModal(true);
  };

  const handleDoctorChange = (id: string) => {
    const doc = doctors.find((d) => d.id === id);
    setForm((prev) => ({
      ...prev,
      doctorId: id,
      doctorName: doc ? `${doc.firstName} ${doc.lastName}` : '',
      specialty:  doc?.specialty ?? '',
      fee:        doc ? String(doc.consultationFee) : prev.fee,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientName.trim() || !form.date || !form.time) {
      addToast('Bemor ismi, sana va vaqt kiritilishi shart'); return;
    }
    setSaving(true);
    const dto = { ...form, duration: parseInt(form.duration) || 30, fee: parseFloat(form.fee) || 0 };
    try {
      if (editing) {
        const updated = await updateAppointment(editing.id, dto);
        setList((prev) => prev.map((a) => a.id === updated.id ? updated : a));
        addToast('Qabul yangilandi', 'success');
      } else {
        const created = await createAppointment(dto);
        setList((prev) => [created, ...prev]);
        addToast("Qabul qo'shildi", 'success');
      }
      setModal(false);
    } catch { addToast('Xatolik yuz berdi'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (a: Appointment, status: string) => {
    try {
      const updated = await updateAppointment(a.id, { status: status as Appointment['status'] });
      setList((prev) => prev.map((x) => x.id === updated.id ? updated : x));
    } catch { addToast('Xatolik'); }
  };

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await deleteAppointment(confirm.id);
      setList((prev) => prev.filter((a) => a.id !== confirm.id));
      addToast("Qabul o'chirildi", 'success');
    } catch { addToast('Xatolik'); }
    finally { setConfirm(null); }
  };

  const f = (key: keyof FormData, val: string) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleDateFilter = (v: string) => {
    setDateFilter(v);
    load(v || undefined);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Qabullar</h2>
        <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={15} /> Qabul qo'shish
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {[
            { label: 'Jami qabullar', value: stats.total, color: '#6366f1' },
            { label: 'Bugungi', value: stats.today, color: '#3b82f6' },
            { label: 'Rejalashtirilgan', value: stats.scheduled, color: '#f59e0b' },
            { label: 'Bajarilgan', value: stats.completed, color: '#10b981' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card" style={{ padding: '0.75rem 1rem', borderTop: `3px solid ${color}` }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
        <CalendarDays size={16} style={{ color: 'var(--text-muted)' }} />
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => handleDateFilter(e.target.value)}
          style={{ width: 180 }}
        />
        {dateFilter && (
          <button className="btn-secondary" style={{ fontSize: '0.78rem' }} onClick={() => handleDateFilter('')}>
            Filterni tozalash
          </button>
        )}
      </div>

      {loading ? (
        <p className="state-msg">Yuklanmoqda...</p>
      ) : list.length === 0 ? (
        <p className="state-msg">Qabullar topilmadi</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Sana / Vaqt</th>
                <th>Bemor</th>
                <th>Shifokor</th>
                <th>Turi</th>
                <th>Narx</th>
                <th>Holat</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => {
                const st = STATUS_LABELS[a.status] ?? STATUS_LABELS.scheduled;
                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{a.date}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={11} /> {a.time.slice(0, 5)} · {a.duration} min
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <User size={13} style={{ color: 'var(--text-muted)' }} /> {a.patientName ?? '—'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Stethoscope size={13} style={{ color: 'var(--text-muted)' }} />
                        <div>
                          <div style={{ fontSize: '0.84rem' }}>{a.doctorName ?? '—'}</div>
                          {a.specialty && <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{a.specialty}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{a.type ?? '—'}</td>
                    <td style={{ fontWeight: 500 }}>
                      {a.fee > 0 ? `${Number(a.fee).toLocaleString()} so'm` : '—'}
                    </td>
                    <td>
                      <select
                        value={a.status}
                        onChange={(e) => handleStatusChange(a, e.target.value)}
                        style={{
                          border: `1px solid ${st.color}44`,
                          background: st.bg, color: st.color,
                          borderRadius: 20, padding: '0.2rem 0.6rem',
                          fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem' }} onClick={() => openEdit(a)}><Edit size={13} /></button>
                        <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem', color: '#ef4444' }} onClick={() => setConfirm(a)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>{editing ? 'Qabulni tahrirlash' : "Yangi qabul qo'shish"}</h3>
              <button onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1.25rem' }}>
              <div className="field">
                <label>Bemor ismi *</label>
                <input type="text" placeholder="Alisher Karimov" value={form.patientName} onChange={(e) => f('patientName', e.target.value)} required />
              </div>
              <div className="field">
                <label>Shifokor</label>
                <select value={form.doctorId} onChange={(e) => handleDoctorChange(e.target.value)}>
                  <option value="">Tanlang (ixtiyoriy)</option>
                  {doctors.filter((d) => d.isActive).map((d) => (
                    <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName} — {d.specialty}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Sana *</label>
                  <input type="date" value={form.date} onChange={(e) => f('date', e.target.value)} required />
                </div>
                <div className="field">
                  <label>Vaqt *</label>
                  <input type="time" value={form.time} onChange={(e) => f('time', e.target.value)} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Davomiyligi (daqiqa)</label>
                  <input type="number" placeholder="30" min="5" max="480" value={form.duration} onChange={(e) => f('duration', e.target.value)} />
                </div>
                <div className="field">
                  <label>Narxi (so'm)</label>
                  <input type="number" placeholder="50000" value={form.fee} onChange={(e) => f('fee', e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label>Turi</label>
                <select value={form.type} onChange={(e) => f('type', e.target.value)}>
                  <option value="">Tanlang</option>
                  {APPT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
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
              <h3>Qabul o'chirish</h3>
              <button onClick={() => setConfirm(null)}><X size={18} /></button>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                <strong>{confirm.patientName}</strong> bemorning {confirm.date} sanasidagi qabulini o'chirishni tasdiqlaysizmi?
              </p>
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
