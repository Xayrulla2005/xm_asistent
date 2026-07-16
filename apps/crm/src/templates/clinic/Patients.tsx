import { useEffect, useState } from 'react';
import { Search, Plus, User, Phone, Calendar, Edit, Trash2, X } from 'lucide-react';
import {
  Patient, getPatients, createPatient, updatePatient, deletePatient,
} from '../../api/clinic.api';
import { useToastStore } from '../../stores/toast.store';

const GENDERS = [
  { key: 'male',   label: 'Erkak' },
  { key: 'female', label: 'Ayol' },
];

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

type FormData = {
  firstName: string; lastName: string; phone: string;
  dateOfBirth: string; gender: string; bloodType: string;
  address: string; notes: string;
};

const EMPTY: FormData = {
  firstName: '', lastName: '', phone: '', dateOfBirth: '',
  gender: '', bloodType: '', address: '', notes: '',
};

function fullName(p: Patient) { return `${p.firstName} ${p.lastName}`; }

function age(dob: string | null): string {
  if (!dob) return '—';
  const y = new Date().getFullYear() - new Date(dob).getFullYear();
  return `${y} yosh`;
}

export default function Patients() {
  const addToast = useToastStore((s) => s.toast);
  const [list,    setList]    = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form,    setForm]    = useState<FormData>(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [confirm, setConfirm] = useState<Patient | null>(null);

  const load = (q?: string) => {
    setLoading(true);
    getPatients(q)
      .then(setList)
      .catch(() => addToast('Yuklab bo\'lib bo\'lmadi'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (p: Patient) => {
    setEditing(p);
    setForm({
      firstName: p.firstName, lastName: p.lastName, phone: p.phone ?? '',
      dateOfBirth: p.dateOfBirth ?? '', gender: p.gender ?? '',
      bloodType: p.bloodType ?? '', address: p.address ?? '', notes: p.notes ?? '',
    });
    setModal(true);
  };

  const handleSearch = (v: string) => {
    setSearch(v);
    if (!v) load();
  };
  const handleSearchSubmit = (e: React.FormEvent) => { e.preventDefault(); load(search || undefined); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      addToast('Ism va familiya kiritilishi shart'); return;
    }
    setSaving(true);
    try {
      if (editing) {
        const updated = await updatePatient(editing.id, form);
        setList((prev) => prev.map((p) => p.id === updated.id ? updated : p));
        addToast('Bemor yangilandi', 'success');
      } else {
        const created = await createPatient(form);
        setList((prev) => [created, ...prev]);
        addToast("Bemor qo'shildi", 'success');
      }
      setModal(false);
    } catch {
      addToast('Xatolik yuz berdi');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await deletePatient(confirm.id);
      setList((prev) => prev.filter((p) => p.id !== confirm.id));
      addToast("Bemor o'chirildi", 'success');
    } catch {
      addToast('Xatolik yuz berdi');
    } finally { setConfirm(null); }
  };

  const f = (key: keyof FormData, val: string) => setForm((prev) => ({ ...prev, [key]: val }));

  const filtered = list.filter((p) =>
    !search || fullName(p).toLowerCase().includes(search.toLowerCase()) || (p.phone ?? '').includes(search)
  );

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Bemorlar</h2>
        <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={15} /> Bemor qo'shish
        </button>
      </div>

      <form onSubmit={handleSearchSubmit} style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Ism, telefon bo'yicha qidirish..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ paddingLeft: '2.2rem', width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <button type="submit" className="btn-secondary">Qidirish</button>
      </form>

      {loading ? (
        <p className="state-msg">Yuklanmoqda...</p>
      ) : filtered.length === 0 ? (
        <p className="state-msg">Bemorlar topilmadi</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Bemor</th>
                <th>Telefon</th>
                <th>Yoshi</th>
                <th>Qon guruhi</th>
                <th>Jins</th>
                <th>Holat</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <User size={14} style={{ color: 'var(--primary)' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{fullName(p)}</div>
                        {p.address && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.address}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    {p.phone
                      ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.84rem' }}><Phone size={12} />{p.phone}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>
                    }
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.84rem' }}>
                      {p.dateOfBirth && <Calendar size={12} />}{age(p.dateOfBirth)}
                    </span>
                  </td>
                  <td>
                    {p.bloodType
                      ? <span className="badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>{p.bloodType}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>
                    }
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>
                    {p.gender === 'male' ? 'Erkak' : p.gender === 'female' ? 'Ayol' : '—'}
                  </td>
                  <td>
                    <span className={p.isActive ? 'badge--active' : 'badge--inactive'} style={{ padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600 }}>
                      {p.isActive ? 'Faol' : 'Nofaol'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem' }} onClick={() => openEdit(p)}><Edit size={13} /></button>
                      <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem', color: '#ef4444' }} onClick={() => setConfirm(p)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>{editing ? 'Bemorni tahrirlash' : "Yangi bemor qo'shish"}</h3>
              <button onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Ism *</label>
                  <input type="text" placeholder="Alisher" value={form.firstName} onChange={(e) => f('firstName', e.target.value)} required />
                </div>
                <div className="field">
                  <label>Familiya *</label>
                  <input type="text" placeholder="Karimov" value={form.lastName} onChange={(e) => f('lastName', e.target.value)} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Telefon</label>
                  <input type="tel" placeholder="+998 90 000 00 00" value={form.phone} onChange={(e) => f('phone', e.target.value)} />
                </div>
                <div className="field">
                  <label>Tug'ilgan sana</label>
                  <input type="date" value={form.dateOfBirth} onChange={(e) => f('dateOfBirth', e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Jins</label>
                  <select value={form.gender} onChange={(e) => f('gender', e.target.value)}>
                    <option value="">Tanlang</option>
                    {GENDERS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Qon guruhi</label>
                  <select value={form.bloodType} onChange={(e) => f('bloodType', e.target.value)}>
                    <option value="">Tanlang</option>
                    {BLOOD_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Manzil</label>
                <input type="text" placeholder="Toshkent, Yunusobod" value={form.address} onChange={(e) => f('address', e.target.value)} />
              </div>
              <div className="field">
                <label>Izoh</label>
                <textarea placeholder="Bemor haqida qo'shimcha ma'lumot..." value={form.notes} onChange={(e) => f('notes', e.target.value)} rows={2} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Bekor</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h3>Bemorni o'chirish</h3>
              <button onClick={() => setConfirm(null)}><X size={18} /></button>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <p style={{ marginBottom: '1.25rem', color: 'var(--text-muted)' }}>
                <strong>{fullName(confirm)}</strong> bemorni o'chirishni tasdiqlaysizmi?
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
