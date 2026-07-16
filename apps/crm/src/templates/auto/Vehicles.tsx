import { useCallback, useEffect, useState } from 'react';
import { Plus, Edit, Trash2, X, Search, Car } from 'lucide-react';
import { AutoVehicle, getAutoVehicles, createAutoVehicle, updateAutoVehicle, deleteAutoVehicle } from '../../api/auto.api';
import { useToastStore } from '../../stores/toast.store';

type Form = {
  customerName: string; customerPhone: string;
  brand: string; model: string; year: string;
  plateNumber: string; color: string; vin: string; notes: string;
};
const EMPTY: Form = { customerName: '', customerPhone: '', brand: '', model: '', year: '', plateNumber: '', color: '', vin: '', notes: '' };

const BRANDS = ['Chevrolet', 'Nexia', 'Matiz', 'Cobalt', 'Lacetti', 'Captiva', 'Equinox', 'Toyota', 'Hyundai', 'Kia', 'BMW', 'Mercedes-Benz', 'Volkswagen', 'Daewoo', 'Honda', 'Nissan', 'Boshqa'];

export default function AutoVehicles() {
  const addToast = useToastStore((s) => s.toast);
  const [vehicles, setVehicles] = useState<AutoVehicle[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState<AutoVehicle | null>(null);
  const [form,     setForm]     = useState<Form>(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [confirm,  setConfirm]  = useState<AutoVehicle | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getAutoVehicles(search || undefined)
      .then(setVehicles)
      .catch(() => addToast('Yuklab bo\'lmadi'))
      .finally(() => setLoading(false));
  }, [search, addToast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (v: AutoVehicle) => {
    setEditing(v);
    setForm({
      customerName: v.customerName, customerPhone: v.customerPhone ?? '',
      brand: v.brand, model: v.model, year: v.year ? String(v.year) : '',
      plateNumber: v.plateNumber ?? '', color: v.color ?? '', vin: v.vin ?? '', notes: v.notes ?? '',
    });
    setModal(true);
  };
  const closeModal = () => { setModal(false); setEditing(null); };

  const save = async () => {
    if (!form.customerName.trim()) return addToast('Mijoz ismi kiritilishi shart');
    if (!form.brand.trim() || !form.model.trim()) return addToast('Mashina markasi va modeli kiritilishi shart');
    setSaving(true);
    try {
      const dto = {
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone || undefined,
        brand: form.brand.trim(),
        model: form.model.trim(),
        year: form.year ? Number(form.year) : undefined,
        plateNumber: form.plateNumber || undefined,
        color: form.color || undefined,
        vin: form.vin || undefined,
        notes: form.notes || undefined,
      };
      if (editing) { await updateAutoVehicle(editing.id, dto); addToast('Yangilandi'); }
      else          { await createAutoVehicle(dto);             addToast('Qo\'shildi'); }
      closeModal();
      load();
    } catch { addToast('Xatolik yuz berdi'); }
    finally { setSaving(false); }
  };

  const remove = async (v: AutoVehicle) => {
    try { await deleteAutoVehicle(v.id); addToast('O\'chirildi'); load(); }
    catch { addToast('O\'chirib bo\'lmadi'); }
    finally { setConfirm(null); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Avtomobillar bazasi</h2>
          <p className="page-subtitle">{vehicles.length} ta avtomobil</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Qo'shish</button>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input className="search-input" placeholder="Davlat raqami, marka, mijoz..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /></div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Avtomobil</th><th>Davlat raqami</th><th>Rangı</th><th>Mijoz</th><th>Telefon</th><th>VIN</th><th>Amallar</th></tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Car size={15} color="#fff" />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem' }}>{v.brand} {v.model}</p>
                        {v.year && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{v.year}-yil</p>}
                      </div>
                    </div>
                  </td>
                  <td>
                    {v.plateNumber
                      ? <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.05em', background: 'var(--bg)', padding: '0.15rem 0.5rem', borderRadius: 4, border: '1px solid var(--border)' }}>{v.plateNumber}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>
                    {v.color
                      ? <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.83rem' }}>
                          <span style={{ width: 12, height: 12, borderRadius: '50%', background: v.color.startsWith('#') ? v.color : 'var(--border)', border: '1px solid var(--border)', flexShrink: 0 }} />
                          {v.color}
                        </div>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ fontWeight: 600 }}>{v.customerName}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{v.customerPhone ?? '—'}</td>
                  <td style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{v.vin ?? '—'}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-icon" title="Tahrirlash" onClick={() => openEdit(v)}><Edit size={15} /></button>
                      <button className="btn-icon btn-icon--danger" title="O'chirish" onClick={() => setConfirm(v)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {vehicles.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>Avtomobil topilmadi</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Avtomobilni tahrirlash' : 'Yangi avtomobil'}</h3>
              <button className="btn-icon" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.6rem' }}>Mijoz ma'lumotlari</p>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Mijoz ismi *</label>
                  <input className="form-input" placeholder="F.I.Sh." value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefon</label>
                  <input className="form-input" placeholder="+998..." value={form.customerPhone} onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))} />
                </div>
              </div>

              <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0.75rem 0 0.6rem' }}>Avtomobil ma'lumotlari</p>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Marka *</label>
                  <select className="form-input" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}>
                    <option value="">Tanlang</option>
                    {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Model *</label>
                  <input className="form-input" placeholder="Masalan: Gentra" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Davlat raqami</label>
                  <input className="form-input" placeholder="01 A 000 AA" value={form.plateNumber} onChange={(e) => setForm((f) => ({ ...f, plateNumber: e.target.value.toUpperCase() }))} style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Yili</label>
                  <input type="number" className="form-input" min={1990} max={new Date().getFullYear()} placeholder="2020" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Rang</label>
                  <input className="form-input" placeholder="Oq, Qora, Kumush..." value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">VIN</label>
                  <input className="form-input" placeholder="17 belgili VIN" value={form.vin} maxLength={17} onChange={(e) => setForm((f) => ({ ...f, vin: e.target.value.toUpperCase() }))} style={{ fontFamily: 'monospace', fontSize: '0.82rem' }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Izoh</label>
                <textarea className="form-input" rows={2} placeholder="Qo'shimcha ma'lumot..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>Bekor</button>
              <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>O'chirishni tasdiqlash</h3><button className="btn-icon" onClick={() => setConfirm(null)}><X size={18} /></button></div>
            <div className="modal-body"><p><strong>{confirm.brand} {confirm.model}</strong> ({confirm.plateNumber ?? 'raqamsiz'}) ni o'chirasizmi?</p></div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setConfirm(null)}>Bekor</button>
              <button className="btn-danger" onClick={() => remove(confirm)}>O'chirish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
