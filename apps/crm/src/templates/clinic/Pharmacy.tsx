import { useEffect, useState } from 'react';
import { Plus, Search, Package, AlertTriangle, Edit, Trash2, X, Minus } from 'lucide-react';
import {
  Medicine, getMedicines, createMedicine, updateMedicine,
  deleteMedicine, adjustMedicineStock,
} from '../../api/clinic.api';
import { useToastStore } from '../../stores/toast.store';

const CATEGORIES = ['Antibiotik', 'Analgetik', 'Antivirus', 'Vitamin', 'Qon bosimiga', 'Antihistamin', 'Diabet', 'Boshqa'];
const UNITS = ['dona', 'quti', 'litr', 'ml', 'gramm', 'kapsul', 'blister'];

type FormData = {
  name: string; category: string; unit: string;
  price: string; stock: string; minStock: string;
  manufacturer: string; expiryDate: string;
};

const EMPTY: FormData = {
  name: '', category: '', unit: 'dona', price: '', stock: '0', minStock: '5',
  manufacturer: '', expiryDate: '',
};

export default function Pharmacy() {
  const addToast = useToastStore((s) => s.toast);
  const [list,    setList]    = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [form,    setForm]    = useState<FormData>(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [confirm, setConfirm] = useState<Medicine | null>(null);
  const [stockModal, setStockModal] = useState<Medicine | null>(null);
  const [stockDelta, setStockDelta] = useState('');

  const load = (q?: string) => {
    setLoading(true);
    getMedicines(q)
      .then(setList)
      .catch(() => addToast('Yuklab bo\'lmadi'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSearchSubmit = (e: React.FormEvent) => { e.preventDefault(); load(search || undefined); };
  const handleSearchChange = (v: string) => { setSearch(v); if (!v) load(); };

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (m: Medicine) => {
    setEditing(m);
    setForm({
      name: m.name, category: m.category ?? '', unit: m.unit ?? 'dona',
      price: String(m.price), stock: String(m.stock), minStock: String(m.minStock),
      manufacturer: m.manufacturer ?? '', expiryDate: m.expiryDate ?? '',
    });
    setModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { addToast('Dori nomi kiritilishi shart'); return; }
    setSaving(true);
    const dto = {
      name: form.name, category: form.category, unit: form.unit,
      price: parseFloat(form.price) || 0,
      stock: parseFloat(form.stock) || 0,
      minStock: parseFloat(form.minStock) || 5,
      manufacturer: form.manufacturer, expiryDate: form.expiryDate || null,
    };
    try {
      if (editing) {
        const updated = await updateMedicine(editing.id, dto);
        setList((prev) => prev.map((m) => m.id === updated.id ? updated : m));
        addToast('Dori yangilandi', 'success');
      } else {
        const created = await createMedicine(dto);
        setList((prev) => [created, ...prev]);
        addToast("Dori qo'shildi", 'success');
      }
      setModal(false);
    } catch { addToast('Xatolik yuz berdi'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await deleteMedicine(confirm.id);
      setList((prev) => prev.filter((m) => m.id !== confirm.id));
      addToast("Dori o'chirildi", 'success');
    } catch { addToast('Xatolik'); }
    finally { setConfirm(null); }
  };

  const handleStockAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockModal) return;
    const delta = parseFloat(stockDelta);
    if (isNaN(delta)) { addToast("To'g'ri qiymat kiriting"); return; }
    try {
      const updated = await adjustMedicineStock(stockModal.id, delta);
      setList((prev) => prev.map((m) => m.id === updated.id ? updated : m));
      addToast('Miqdor yangilandi', 'success');
      setStockModal(null);
      setStockDelta('');
    } catch { addToast('Xatolik'); }
  };

  const f = (key: keyof FormData, val: string) => setForm((prev) => ({ ...prev, [key]: val }));

  const lowStock = list.filter((m) => Number(m.stock) <= Number(m.minStock));
  const filtered = search
    ? list.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()) || (m.category ?? '').toLowerCase().includes(search.toLowerCase()))
    : list;

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Dorixona</h2>
        <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={15} /> Dori qo'shish
        </button>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem',
        }}>
          <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <span style={{ fontSize: '0.84rem' }}>
            <strong>{lowStock.length} ta dori</strong> kam qoldi: {lowStock.slice(0, 3).map((m) => m.name).join(', ')}{lowStock.length > 3 ? '...' : ''}
          </span>
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Dori nomi yoki kategoriya..." value={search}
            onChange={(e) => handleSearchChange(e.target.value)} style={{ paddingLeft: '2.2rem', width: '100%', boxSizing: 'border-box' }} />
        </div>
        <button type="submit" className="btn-secondary">Qidirish</button>
      </form>

      {loading ? (
        <p className="state-msg">Yuklanmoqda...</p>
      ) : filtered.length === 0 ? (
        <p className="state-msg">Dorilar topilmadi</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Dori nomi</th>
                <th>Kategoriya</th>
                <th>Miqdor</th>
                <th>Narxi</th>
                <th>Muddati</th>
                <th>Ishlab chiqaruvchi</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const isLow = Number(m.stock) <= Number(m.minStock);
                return (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Package size={14} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontWeight: 500 }}>{m.name}</span>
                      </div>
                    </td>
                    <td>
                      {m.category
                        ? <span className="badge" style={{ background: 'rgba(99,102,241,0.08)', color: 'var(--primary)', border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.75rem' }}>{m.category}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>
                      }
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, color: isLow ? '#f59e0b' : 'var(--text)' }}>
                          {Number(m.stock)} {m.unit ?? 'dona'}
                        </span>
                        {isLow && <AlertTriangle size={13} style={{ color: '#f59e0b' }} />}
                        <button className="btn-secondary" style={{ padding: '0.15rem 0.4rem', fontSize: '0.72rem' }}
                          onClick={() => { setStockModal(m); setStockDelta(''); }}>
                          +/-
                        </button>
                      </div>
                    </td>
                    <td style={{ fontWeight: 500 }}>{Number(m.price).toLocaleString()} so'm</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{m.expiryDate ?? '—'}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{m.manufacturer ?? '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem' }} onClick={() => openEdit(m)}><Edit size={13} /></button>
                        <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem', color: '#ef4444' }} onClick={() => setConfirm(m)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>{editing ? "Dorini tahrirlash" : "Yangi dori qo'shish"}</h3>
              <button onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1.25rem' }}>
              <div className="field">
                <label>Nomi *</label>
                <input type="text" placeholder="Paracetamol 500mg" value={form.name} onChange={(e) => f('name', e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Kategoriya</label>
                  <select value={form.category} onChange={(e) => f('category', e.target.value)}>
                    <option value="">Tanlang</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>O'lchov birligi</label>
                  <select value={form.unit} onChange={(e) => f('unit', e.target.value)}>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Narxi (so'm)</label>
                  <input type="number" placeholder="2500" value={form.price} onChange={(e) => f('price', e.target.value)} />
                </div>
                <div className="field">
                  <label>Miqdor</label>
                  <input type="number" placeholder="100" value={form.stock} onChange={(e) => f('stock', e.target.value)} />
                </div>
                <div className="field">
                  <label>Minimum miqdor</label>
                  <input type="number" placeholder="5" value={form.minStock} onChange={(e) => f('minStock', e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Ishlab chiqaruvchi</label>
                  <input type="text" placeholder="Pharmstandard" value={form.manufacturer} onChange={(e) => f('manufacturer', e.target.value)} />
                </div>
                <div className="field">
                  <label>Yaroqlilik muddati</label>
                  <input type="date" value={form.expiryDate} onChange={(e) => f('expiryDate', e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Bekor</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock adjust modal */}
      {stockModal && (
        <div className="modal-overlay" onClick={() => setStockModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 340 }}>
            <div className="modal-header">
              <h3>Miqdorni o'zgartirish</h3>
              <button onClick={() => setStockModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleStockAdjust} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <strong>{stockModal.name}</strong> — joriy: <strong>{Number(stockModal.stock)} {stockModal.unit ?? 'dona'}</strong>
              </div>
              <div className="field">
                <label>O'zgartirish (+qo'shish / -ayirish)</label>
                <input type="number" placeholder="+10 yoki -5" value={stockDelta} onChange={(e) => setStockDelta(e.target.value)} autoFocus />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setStockModal(null)}>Bekor</button>
                <button type="submit" className="btn-primary">Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <div className="modal-header">
              <h3>Dorini o'chirish</h3>
              <button onClick={() => setConfirm(null)}><X size={18} /></button>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                <strong>{confirm.name}</strong>ni o'chirishni tasdiqlaysizmi?
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
