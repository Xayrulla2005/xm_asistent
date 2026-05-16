import { FormEvent, useEffect, useState } from 'react';
import {
  getProducts,
  createProduct,
  deleteProduct,
  Product,
} from '../api/products.api';
import { useTenantStore } from '../stores/tenant.store';

const fmt = (n: number) => n.toLocaleString('uz-UZ') + " so'm";

const UNITS = ['dona', 'kg', 'litr', 'metr', 'quti'];

interface FormState {
  name: string;
  price: string;
  quantity: string;
  category: string;
  unit: string;
}

const emptyForm = (): FormState => ({
  name: '',
  price: '',
  quantity: '',
  category: '',
  unit: 'dona',
});

export default function Products() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [search, setSearch] = useState('');

  const fetchProducts = () => {
    setLoading(true);
    getProducts(tenantId)
      .then(setProducts)
      .catch(() => setError("Ma'lumot yuklashda xatolik"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, [tenantId]);

  const filtered = search
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.category.toLowerCase().includes(search.toLowerCase()),
      )
    : products;

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await createProduct({
        tenantId,
        name: form.name,
        price: Number(form.price),
        quantity: Number(form.quantity),
        category: form.category,
        unit: form.unit,
      });
      setShowModal(false);
      setForm(emptyForm());
      fetchProducts();
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" ni o'chirishni tasdiqlaysizmi?`)) return;
    try {
      await deleteProduct(id);
      fetchProducts();
    } catch {
      alert("O'chirishda xatolik");
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">📦 Mahsulotlar</h2>
        <button className="btn-primary" onClick={() => { setShowModal(true); setFormError(''); setForm(emptyForm()); }}>
          + Mahsulot qo'shish
        </button>
      </div>

      <div className="toolbar">
        <input
          type="search"
          className="search-input"
          placeholder="Nomi yoki kategoriya..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="toolbar-count">{filtered.length} ta mahsulot</span>
      </div>

      {loading && <p className="state-msg">Yuklanmoqda...</p>}
      {error && <p className="state-msg state-msg--error">{error}</p>}

      {!loading && !error && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nomi</th>
                <th>Kategoriya</th>
                <th>Narxi</th>
                <th>Miqdori</th>
                <th>Birlik</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    {search ? 'Topilmadi' : "Hali mahsulot yo'q"}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id}>
                    <td className="product-name">{p.name}</td>
                    <td><span className="category-tag">{p.category}</span></td>
                    <td className="amount-cell">{fmt(Number(p.price))}</td>
                    <td>
                      <span className={'stock-badge ' + (p.quantity < 10 ? 'stock-badge--low' : 'stock-badge--ok')}>
                        {p.quantity}
                      </span>
                    </td>
                    <td className="text-muted">{p.unit}</td>
                    <td>
                      <button
                        className="btn-icon"
                        onClick={() => handleDelete(p.id, p.name)}
                        title="O'chirish"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Yangi mahsulot</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreate} className="modal-form">
              {formError && <p className="form-error">{formError}</p>}

              <div className="field">
                <label>Nomi</label>
                <input
                  type="text"
                  placeholder="iPhone 15 Pro"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="form-row">
                <div className="field">
                  <label>Narxi (so'm)</label>
                  <input
                    type="number"
                    placeholder="12000000"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Miqdori</label>
                  <input
                    type="number"
                    placeholder="10"
                    min="0"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="field">
                  <label>Kategoriya</label>
                  <input
                    type="text"
                    placeholder="Elektronika"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Birlik</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Bekor
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
