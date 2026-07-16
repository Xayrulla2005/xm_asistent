import { useEffect, useState } from 'react';
import { Plus, Stethoscope, Phone, Edit, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { Doctor, getDoctors, createDoctor, updateDoctor, deleteDoctor } from '../../api/clinic.api';
import { useToastStore } from '../../stores/toast.store';

const SPECIALTIES = [
  'Terapevt', 'Pediatr', 'Kardiolog', 'Nevrolog', 'Jarroh', 'Ginekolog',
  'Okulist', 'Stomatolog', 'Dermatolog', 'Urolog', 'Endokrinolog', 'Psixiatr',
];

type FormData = {
  firstName: string; lastName: string; phone: string;
  specialty: string; consultationFee: string; schedule: string;
};

const EMPTY: FormData = {
  firstName: '', lastName: '', phone: '', specialty: '', consultationFee: '', schedule: '',
};

export default function Doctors() {
  const addToast = useToastStore((s) => s.toast);
  const [list,    setList]    = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [form,    setForm]    = useState<FormData>(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [confirm, setConfirm] = useState<Doctor | null>(null);

  useEffect(() => {
    getDoctors()
      .then(setList)
      .catch(() => addToast("Yuklab bo'lmadi"))
      .finally(() => setLoading(false));
  }, []);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (d: Doctor) => {
    setEditing(d);
    setForm({
      firstName: d.firstName, lastName: d.lastName, phone: d.phone ?? '',
      specialty: d.specialty ?? '', consultationFee: String(d.consultationFee ?? ''),
      schedule: d.schedule ?? '',
    });
    setModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim()) { addToast('Ism kiritilishi shart'); return; }
    setSaving(true);
    const dto = { ...form, consultationFee: parseFloat(form.consultationFee) || 0 };
    try {
      if (editing) {
        const updated = await updateDoctor(editing.id, dto);
        setList((prev) => prev.map((d) => d.id === updated.id ? updated : d));
        addToast('Shifokor yangilandi', 'success');
      } else {
        const created = await createDoctor(dto);
        setList((prev) => [...prev, created]);
        addToast("Shifokor qo'shildi", 'success');
      }
      setModal(false);
    } catch { addToast('Xatolik yuz berdi'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await deleteDoctor(confirm.id);
      setList((prev) => prev.filter((d) => d.id !== confirm.id));
      addToast("Shifokor o'chirildi", 'success');
    } catch { addToast('Xatolik'); }
    finally { setConfirm(null); }
  };

  const toggleActive = async (d: Doctor) => {
    try {
      const updated = await updateDoctor(d.id, { isActive: !d.isActive });
      setList((prev) => prev.map((x) => x.id === updated.id ? updated : x));
    } catch { addToast('Xatolik'); }
  };

  const f = (key: keyof FormData, val: string) => setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Shifokorlar</h2>
        <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={15} /> Shifokor qo'shish
        </button>
      </div>

      {loading ? (
        <p className="state-msg">Yuklanmoqda...</p>
      ) : list.length === 0 ? (
        <p className="state-msg">Shifokorlar topilmadi</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {list.map((d) => (
            <div key={d.id} className="card" style={{ opacity: d.isActive ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: 'rgba(99,102,241,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Stethoscope size={20} style={{ color: 'var(--primary)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>Dr. {d.firstName} {d.lastName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: 2 }}>{d.specialty ?? '—'}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button className="btn-secondary" style={{ padding: '0.3rem 0.5rem' }} onClick={() => toggleActive(d)}>
                    {d.isActive
                      ? <ToggleRight size={15} style={{ color: '#10b981' }} />
                      : <ToggleLeft size={15} />
                    }
                  </button>
                  <button className="btn-secondary" style={{ padding: '0.3rem 0.5rem' }} onClick={() => openEdit(d)}><Edit size={13} /></button>
                  <button className="btn-secondary" style={{ padding: '0.3rem 0.5rem', color: '#ef4444' }} onClick={() => setConfirm(d)}><Trash2 size={13} /></button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {d.phone && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Phone size={12} /> {d.phone}
                  </span>
                )}
                {d.consultationFee > 0 && (
                  <span>Qabul narxi: <strong style={{ color: 'var(--text)' }}>{Number(d.consultationFee).toLocaleString()} so'm</strong></span>
                )}
                {d.schedule && <span style={{ fontSize: '0.75rem' }}>{d.schedule}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3>{editing ? 'Shifokorni tahrirlash' : "Yangi shifokor qo'shish"}</h3>
              <button onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Ism *</label>
                  <input type="text" placeholder="Jasur" value={form.firstName} onChange={(e) => f('firstName', e.target.value)} required />
                </div>
                <div className="field">
                  <label>Familiya *</label>
                  <input type="text" placeholder="Ismoilov" value={form.lastName} onChange={(e) => f('lastName', e.target.value)} required />
                </div>
              </div>
              <div className="field">
                <label>Mutaxassislik</label>
                <select value={form.specialty} onChange={(e) => f('specialty', e.target.value)}>
                  <option value="">Tanlang</option>
                  {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Telefon</label>
                  <input type="tel" placeholder="+998 90 000 00 00" value={form.phone} onChange={(e) => f('phone', e.target.value)} />
                </div>
                <div className="field">
                  <label>Qabul narxi (so'm)</label>
                  <input type="number" placeholder="50000" value={form.consultationFee} onChange={(e) => f('consultationFee', e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label>Ish jadvali</label>
                <input type="text" placeholder="Du-Ju 9:00-18:00, Sha 9:00-14:00" value={form.schedule} onChange={(e) => f('schedule', e.target.value)} />
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
              <h3>Shifokorni o'chirish</h3>
              <button onClick={() => setConfirm(null)}><X size={18} /></button>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                <strong>Dr. {confirm.firstName} {confirm.lastName}</strong>ni o'chirishni tasdiqlaysizmi?
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
