import { useEffect, useState } from 'react';
import { Plus, FileText, Trash2, X, Search, Printer, PlusCircle, MinusCircle } from 'lucide-react';
import {
  Prescription, PrescriptionItem,
  getPrescriptions, createPrescription, deletePrescription,
  Patient, getPatients, Doctor, getDoctors, Medicine, getMedicines,
} from '../../api/clinic.api';
import { useToastStore } from '../../stores/toast.store';

const STATUS_META: Record<string, { label: string; color: string }> = {
  active:    { label: 'Faol',    color: '#10b981' },
  completed: { label: 'Bajarildi', color: '#6366f1' },
  cancelled: { label: 'Bekor',  color: '#ef4444' },
};

const today = () => new Date().toISOString().slice(0, 10);

export default function Prescriptions() {
  const addToast = useToastStore((s) => s.toast);
  const [list,    setList]    = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors,  setDoctors]  = useState<Doctor[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [modal,   setModal]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [detail,  setDetail]  = useState<Prescription | null>(null);
  const [confirm, setConfirm] = useState<Prescription | null>(null);

  // form
  const [fPatientId,  setFPatientId]  = useState('');
  const [fDoctorId,   setFDoctorId]   = useState('');
  const [fDate,       setFDate]       = useState(today());
  const [fDiagnosis,  setFDiagnosis]  = useState('');
  const [fNotes,      setFNotes]      = useState('');
  const [fItems,      setFItems]      = useState<PrescriptionItem[]>([]);

  useEffect(() => {
    Promise.all([
      getPrescriptions(),
      getPatients(),
      getDoctors(),
      getMedicines(),
    ]).then(([p, pts, docs, meds]) => {
      setList(p); setPatients(pts); setDoctors(docs); setMedicines(meds);
    }).catch(() => addToast('Yuklab bo\'lmadi'))
    .finally(() => setLoading(false));
  }, []);

  const openAdd = () => {
    setFPatientId(''); setFDoctorId(''); setFDate(today());
    setFDiagnosis(''); setFNotes(''); setFItems([]);
    setModal(true);
  };

  const addItem = () => setFItems((prev) => [...prev, { medicineId: '', medicineName: '', dosage: '', frequency: '3 mahal kuniga', days: 7 }]);
  const removeItem = (i: number) => setFItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof PrescriptionItem, val: string | number) =>
    setFItems((prev) => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  const setMedicine = (i: number, medId: string) => {
    const med = medicines.find((m) => m.id === medId);
    setFItems((prev) => prev.map((it, idx) => idx === i ? { ...it, medicineId: medId, medicineName: med?.name ?? '' } : it));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fItems.length === 0) { addToast('Kamida 1 ta dori qo\'shing'); return; }
    setSaving(true);
    const patient = patients.find((p) => p.id === fPatientId);
    const doctor  = doctors.find((d) => d.id === fDoctorId);
    try {
      const created = await createPrescription({
        patientId:   fPatientId || null,
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : '',
        doctorId:    fDoctorId || null,
        doctorName:  doctor ? `${doctor.firstName} ${doctor.lastName}` : '',
        date:        fDate,
        diagnosis:   fDiagnosis || null,
        notes:       fNotes || null,
        items:       fItems,
        status:      'active',
      });
      setList((prev) => [created, ...prev]);
      addToast("Retsept qo'shildi", 'success');
      setModal(false);
    } catch { addToast('Xatolik'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await deletePrescription(confirm.id);
      setList((prev) => prev.filter((p) => p.id !== confirm.id));
      if (detail?.id === confirm.id) setDetail(null);
      addToast("O'chirildi", 'success');
    } catch { addToast('Xatolik'); }
    finally { setConfirm(null); }
  };

  const printPrescription = (rx: Prescription) => {
    const rows = rx.items.map((i, n) =>
      `<tr><td>${n+1}</td><td><strong>${i.medicineName}</strong></td><td>${i.dosage}</td><td>${i.frequency}</td><td>${i.days} kun</td>${i.notes ? `<td>${i.notes}</td>` : '<td>—</td>'}</tr>`
    ).join('');
    const html = `<html><head><title>Retsept — ${rx.patientName}</title>
    <style>body{font-family:sans-serif;padding:24px;max-width:640px;margin:0 auto}h2{margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{padding:8px 10px;border:1px solid #e2e8f0;text-align:left;font-size:13px}th{background:#f8fafc}.row{display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px}.lb{color:#666}.sig{margin-top:32px;display:flex;justify-content:space-between}</style>
    </head><body>
    <h2>RETSEPT</h2>
    <div class="row"><span class="lb">Sana:</span><span>${rx.date}</span></div>
    <div class="row"><span class="lb">Bemor:</span><span>${rx.patientName || '—'}</span></div>
    <div class="row"><span class="lb">Shifokor:</span><span>${rx.doctorName || '—'}</span></div>
    ${rx.diagnosis ? `<div class="row"><span class="lb">Tashxis:</span><span>${rx.diagnosis}</span></div>` : ''}
    <table><thead><tr><th>№</th><th>Dori</th><th>Doza</th><th>Qabul</th><th>Muddat</th><th>Izoh</th></tr></thead>
    <tbody>${rows}</tbody></table>
    ${rx.notes ? `<p style="margin-top:12px;font-size:13px;color:#555">Izoh: ${rx.notes}</p>` : ''}
    <div class="sig"><div>Shifokor imzosi: __________</div><div>Bemor imzosi: __________</div></div>
    </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300); }
  };

  const filtered = search
    ? list.filter((r) => r.patientName.toLowerCase().includes(search.toLowerCase()) || (r.diagnosis ?? '').toLowerCase().includes(search.toLowerCase()))
    : list;

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Retseptlar</h2>
        <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={15} /> Yangi retsept
        </button>
      </div>

      <div style={{ position: 'relative', maxWidth: 380, marginBottom: '1rem' }}>
        <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input type="text" placeholder="Bemor yoki tashxis..." value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: '2.2rem', width: '100%', boxSizing: 'border-box' }} />
      </div>

      {loading ? <p className="state-msg">Yuklanmoqda...</p>
       : filtered.length === 0 ? <p className="state-msg">Retseptlar topilmadi</p>
       : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Sana</th><th>Bemor</th><th>Shifokor</th><th>Tashxis</th><th>Dorilar</th><th>Holat</th><th></th></tr></thead>
            <tbody>
              {filtered.map((rx) => {
                const st = STATUS_META[rx.status] ?? STATUS_META.active;
                return (
                  <tr key={rx.id} style={{ cursor: 'pointer' }} onClick={() => setDetail(rx)}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>{rx.date}</td>
                    <td style={{ fontWeight: 600 }}>{rx.patientName || '—'}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{rx.doctorName || '—'}</td>
                    <td style={{ fontSize: '0.82rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rx.diagnosis || '—'}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{rx.items.map((i) => i.medicineName).join(', ').slice(0, 60)}{rx.items.length > 2 ? '...' : ''}</td>
                    <td>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: st.color, background: st.color + '18', padding: '0.2rem 0.5rem', borderRadius: 10 }}>{st.label}</span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button className="btn-secondary" style={{ padding: '0.25rem 0.4rem' }} onClick={() => printPrescription(rx)} title="Chop etish"><Printer size={12} /></button>
                        <button className="btn-secondary" style={{ padding: '0.25rem 0.4rem', color: '#ef4444' }} onClick={() => setConfirm(rx)}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3><FileText size={16} style={{ display: 'inline', marginRight: '0.4rem' }} />Retsept</h3>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button className="btn-secondary" onClick={() => printPrescription(detail)} style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}>Chop etish</button>
                <button onClick={() => setDetail(null)}><X size={18} /></button>
              </div>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Bemor: </span><strong>{detail.patientName || '—'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Sana: </span>{detail.date}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Shifokor: </span>{detail.doctorName || '—'}</div>
                {detail.diagnosis && <div><span style={{ color: 'var(--text-muted)' }}>Tashxis: </span>{detail.diagnosis}</div>}
              </div>
              <div className="table-wrapper">
                <table className="table" style={{ fontSize: '0.82rem' }}>
                  <thead><tr><th>Dori</th><th>Doza</th><th>Qabul</th><th>Kun</th></tr></thead>
                  <tbody>
                    {detail.items.map((i, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{i.medicineName}</td>
                        <td>{i.dosage}</td>
                        <td>{i.frequency}</td>
                        <td>{i.days} kun</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {detail.notes && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Izoh: {detail.notes}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, width: '96vw' }}>
            <div className="modal-header">
              <h3>Yangi retsept</h3>
              <button onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1.25rem', maxHeight: '75vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Bemor</label>
                  <select value={fPatientId} onChange={(e) => setFPatientId(e.target.value)}>
                    <option value="">— Tanlang —</option>
                    {patients.filter((p) => p.isActive).map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Shifokor</label>
                  <select value={fDoctorId} onChange={(e) => setFDoctorId(e.target.value)}>
                    <option value="">— Tanlang —</option>
                    {doctors.filter((d) => d.isActive).map((d) => <option key={d.id} value={d.id}>{d.firstName} {d.lastName} — {d.specialty}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Sana *</label>
                  <input type="date" required value={fDate} onChange={(e) => setFDate(e.target.value)} />
                </div>
                <div className="field">
                  <label>Tashxis</label>
                  <input type="text" placeholder="ARVI, gipertenziya..." value={fDiagnosis} onChange={(e) => setFDiagnosis(e.target.value)} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Dorilar</span>
                  <button type="button" className="btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={addItem}>
                    <PlusCircle size={13} /> Dori qo'shish
                  </button>
                </div>
                {fItems.length === 0 && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Hali dori qo'shilmagan</p>}
                {fItems.map((item, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                    <select value={item.medicineId} onChange={(e) => setMedicine(i, e.target.value)} required>
                      <option value="">— Dori tanlang —</option>
                      {medicines.filter((m) => m.isActive).map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                    </select>
                    <input type="text" placeholder="Doza" value={item.dosage} onChange={(e) => updateItem(i, 'dosage', e.target.value)} required style={{ minWidth: 0 }} />
                    <input type="text" placeholder="Qabul" value={item.frequency} onChange={(e) => updateItem(i, 'frequency', e.target.value)} style={{ minWidth: 0 }} />
                    <input type="number" placeholder="Kun" value={item.days} min={1} onChange={(e) => updateItem(i, 'days', parseInt(e.target.value) || 1)} style={{ minWidth: 0 }} />
                    <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} onClick={() => removeItem(i)}>
                      <MinusCircle size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="field">
                <label>Izoh</label>
                <textarea value={fNotes} onChange={(e) => setFNotes(e.target.value)} rows={2} style={{ resize: 'vertical' }} placeholder="Qo'shimcha ko'rsatmalar..." />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Bekor</button>
                <button type="submit" className="btn-primary" disabled={saving || fItems.length === 0}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 340 }}>
            <div className="modal-header"><h3>O'chirish</h3><button onClick={() => setConfirm(null)}><X size={18} /></button></div>
            <div style={{ padding: '1.25rem' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}><strong>{confirm.patientName}</strong> bemorning retseptini o'chirasizmi?</p>
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
