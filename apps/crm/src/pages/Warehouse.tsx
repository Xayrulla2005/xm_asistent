import { FormEvent, useEffect, useState } from 'react';
import {
  getWarehouseLogs,
  getWarehouseStats,
  getLowStockProducts,
  createWarehouseLog,
  WarehouseLog,
  WarehouseStats,
  WarehouseLogType,
} from '../api/warehouse.api';
import { getProducts, Product } from '../api/products.api';
import { useTenantStore } from '../stores/tenant.store';

const fmt = (n: number) => n.toLocaleString('uz-UZ') + " so'm";

const TYPE_MAP: Record<WarehouseLogType, { label: string; cls: string; color: string }> = {
  income:  { label: 'Kirim', cls: 'badge--active',   color: '#10b981' },
  expense: { label: 'Chiqim', cls: 'badge--inactive', color: '#ef4444' },
};

type FilterType = 'all' | WarehouseLogType;

interface FormState {
  productId: string;
  type: WarehouseLogType;
  quantity: string;
  price: string;
  reason: string;
}

const emptyForm = (): FormState => ({
  productId: '',
  type: 'income',
  quantity: '',
  price: '',
  reason: '',
});

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('uz-UZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function Warehouse() {
  const tenantId = useTenantStore((s) => s.tenantId);

  const [logs, setLogs]           = useState<WarehouseLog[]>([]);
  const [stats, setStats]         = useState<WarehouseStats | null>(null);
  const [lowStock, setLowStock]   = useState<Product[]>([]);
  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const [filter, setFilter] = useState<FilterType>('all');

  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState<FormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState('');

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      getWarehouseLogs(tenantId),
      getWarehouseStats(tenantId),
      getLowStockProducts(tenantId),
    ])
      .then(([l, s, ls]) => { setLogs(l); setStats(s); setLowStock(ls); })
      .catch(() => setError("Ma'lumot yuklashda xatolik"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAll();
    getProducts(tenantId).then(setProducts).catch(() => {});
  }, [tenantId]);

  const filtered = filter === 'all' ? logs : logs.filter((l) => l.type === filter);

  const selectedProduct = products.find((p) => p.id === form.productId);
  const previewAmount   = selectedProduct
    ? Number(form.price || 0) * Number(form.quantity || 0)
    : 0;

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.productId) { setFormError('Mahsulot tanlang'); return; }
    setFormError('');
    setSubmitting(true);
    try {
      await createWarehouseLog({
        tenantId,
        productId: form.productId,
        type:      form.type,
        quantity:  Number(form.quantity),
        price:     Number(form.price),
        reason:    form.reason || undefined,
      });
      setShowModal(false);
      setForm(emptyForm());
      fetchAll();
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = () => { setForm(emptyForm()); setFormError(''); setShowModal(true); };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Sklad</h2>
        <button className="btn-primary" onClick={openModal}>+ Kirim qo'shish</button>
      </div>

      {/* Stat cards */}
      <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#10b98120', color: '#10b981' }}></div>
          <div className="stat-info">
            <p className="stat-label">Jami kirim</p>
            <p className="stat-value">{stats ? fmt(stats.totalIncome) : '—'}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ef444420', color: '#ef4444' }}></div>
          <div className="stat-info">
            <p className="stat-label">Jami chiqim</p>
            <p className="stat-value">{stats ? fmt(stats.totalExpense) : '—'}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f59e0b20', color: '#f59e0b' }}></div>
          <div className="stat-info">
            <p className="stat-label">Kam qolgan</p>
            <p className="stat-value">{stats ? `${stats.lowStockCount} xil` : '—'}</p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs">
        {([
          { key: 'all',     label: 'Barchasi' },
          { key: 'income',  label: 'Kirim' },
          { key: 'expense', label: 'Chiqim' },
        ] as const).map((f) => (
          <button
            key={f.key}
            className={'filter-tab' + (filter === f.key ? ' filter-tab--active' : '')}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <p className="state-msg">Yuklanmoqda...</p>}
      {error   && <p className="state-msg state-msg--error">{error}</p>}

      {!loading && !error && (
        <>
          {/* Asosiy log jadvali */}
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Mahsulot</th>
                  <th>Turi</th>
                  <th>Miqdor</th>
                  <th>Narx</th>
                  <th>Jami</th>
                  <th>Sabab</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      Hali yozuv yo'q
                    </td>
                  </tr>
                ) : (
                  filtered.map((l) => {
                    const t = TYPE_MAP[l.type];
                    return (
                      <tr key={l.id}>
                        <td className="text-muted" style={{ fontSize: '0.85rem' }}>{formatTime(l.createdAt)}</td>
                        <td className="product-name">{l.productName}</td>
                        <td><span className={'badge ' + t.cls}>{t.label}</span></td>
                        <td>{l.quantity} ta</td>
                        <td className="text-muted">{fmt(Number(l.price))}</td>
                        <td className="amount-cell" style={{ color: t.color }}>
                          {l.type === 'income' ? '+' : '−'}{fmt(Number(l.totalAmount))}
                        </td>
                        <td className="text-muted">{l.reason || '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Kam qolgan mahsulotlar */}
          {lowStock.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ color: '#f59e0b', marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: 700 }}>
                Kam qolgan mahsulotlar ({lowStock.length} xil)
              </h3>
              <div className="table-wrap" style={{ border: '1px solid #f59e0b40', borderRadius: '10px' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mahsulot</th>
                      <th>Kategoriya</th>
                      <th>Birlik</th>
                      <th>Qolgan miqdor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.map((p) => (
                      <tr key={p.id} style={{ background: p.quantity === 0 ? 'var(--badge-inactive-bg)' : 'var(--badge-warning-bg)' }}>
                        <td className="product-name">{p.name}</td>
                        <td><span className="category-tag">{p.category}</span></td>
                        <td className="text-muted">{p.unit}</td>
                        <td>
                          <span className={'stock-badge ' + (p.quantity === 0 ? 'stock-badge--low' : 'stock-badge--low')}>
                            {p.quantity} {p.unit}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Sklad kirim / chiqim</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreate} className="modal-form">
              {formError && <p className="form-error">{formError}</p>}

              <div className="field">
                <label>Mahsulot</label>
                <select
                  value={form.productId}
                  onChange={(e) => {
                    const p = products.find((x) => x.id === e.target.value);
                    setForm({ ...form, productId: e.target.value, price: p ? String(p.price) : '' });
                  }}
                  required
                  autoFocus
                >
                  <option value="">— Tanlang —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (mavjud: {p.quantity} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Turi</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as WarehouseLogType })}
                >
                  <option value="income">Kirim</option>
                  <option value="expense">Chiqim</option>
                </select>
              </div>

              <div className="form-row">
                <div className="field">
                  <label>Miqdor</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="10"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Narx (so'm)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="50000"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    required
                  />
                </div>
              </div>

              {previewAmount > 0 && (
                <div className="amount-preview">
                  Jami: <strong>{fmt(previewAmount)}</strong>
                </div>
              )}

              <div className="field">
                <label>Sabab (ixtiyoriy)</label>
                <input
                  type="text"
                  placeholder="Yetkazib beruvchidan keldi..."
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
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
