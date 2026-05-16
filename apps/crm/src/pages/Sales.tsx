import { FormEvent, useEffect, useState } from 'react';
import {
  getSales,
  createSale,
  updateSaleStatus,
  Sale,
  PaymentType,
  SaleStatus,
} from '../api/sales.api';
import { getProducts, Product } from '../api/products.api';
import { useTenantStore } from '../stores/tenant.store';

const fmt = (n: number) => n.toLocaleString('uz-UZ') + " so'm";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  completed: { label: "To'langan",  cls: 'badge--active' },
  pending:   { label: 'Kutilmoqda', cls: 'badge--warning' },
  cancelled: { label: 'Bekor',      cls: 'badge--inactive' },
};

const PAYMENT_LABELS: Record<string, string> = {
  cash:   'Naqd',
  card:   'Karta',
  credit: 'Nasiya',
};

type FilterType = 'all' | SaleStatus;

interface FormState {
  customerName: string;
  productId: string;
  quantity: string;
  paymentType: PaymentType;
}

const emptyForm = (): FormState => ({
  customerName: '',
  productId: '',
  quantity: '1',
  paymentType: 'cash',
});

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Sales() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filter, setFilter] = useState<FilterType>('all');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchSales = () => {
    setLoading(true);
    getSales(tenantId)
      .then(setSales)
      .catch(() => setError("Ma'lumot yuklashda xatolik"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSales();
    getProducts(tenantId).then(setProducts).catch(() => {});
  }, [tenantId]);

  const filtered = filter === 'all' ? sales : sales.filter((s) => s.status === filter);
  const total = filtered.reduce(
    (sum, s) => sum + (s.status !== 'cancelled' ? Number(s.totalAmount) : 0),
    0,
  );

  const selectedProduct = products.find((p) => p.id === form.productId);
  const previewAmount = selectedProduct
    ? Number(selectedProduct.price) * Number(form.quantity || 0)
    : 0;

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.productId) { setFormError('Mahsulot tanlang'); return; }
    setFormError('');
    setSubmitting(true);
    try {
      await createSale({
        tenantId,
        customerName: form.customerName,
        paymentType: form.paymentType,
        items: [
          {
            productId: form.productId,
            name: selectedProduct!.name,
            price: Number(selectedProduct!.price),
            quantity: Number(form.quantity),
          },
        ],
      });
      setShowModal(false);
      setForm(emptyForm());
      fetchSales();
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: SaleStatus) => {
    try {
      await updateSaleStatus(id, status);
      fetchSales();
    } catch {
      alert('Status yangilashda xatolik');
    }
  };

  const openModal = () => {
    setForm(emptyForm());
    setFormError('');
    setShowModal(true);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">🛒 Sotuvlar</h2>
        <button className="btn-primary" onClick={openModal}>+ Yangi sotuv</button>
      </div>

      <div className="filter-tabs">
        {(['all', 'completed', 'pending', 'cancelled'] as const).map((f) => (
          <button
            key={f}
            className={'filter-tab' + (filter === f ? ' filter-tab--active' : '')}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Barchasi' : STATUS_MAP[f].label}
          </button>
        ))}
      </div>

      {loading && <p className="state-msg">Yuklanmoqda...</p>}
      {error && <p className="state-msg state-msg--error">{error}</p>}

      {!loading && !error && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Vaqt</th>
                <th>Mijoz</th>
                <th>To'lov</th>
                <th>Summa</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    {filter !== 'all' ? 'Topilmadi' : "Hali sotuv yo'q"}
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const st = STATUS_MAP[s.status] ?? { label: s.status, cls: '' };
                  return (
                    <tr key={s.id}>
                      <td className="text-muted" style={{ fontSize: '0.85rem' }}>{formatTime(s.createdAt)}</td>
                      <td className="product-name">{s.customerName}</td>
                      <td className="text-muted">{PAYMENT_LABELS[s.paymentType] ?? s.paymentType}</td>
                      <td className="amount-cell">{fmt(Number(s.totalAmount))}</td>
                      <td><span className={'badge ' + st.cls}>{st.label}</span></td>
                      <td>
                        {s.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button
                              className="btn-icon"
                              title="To'langan deb belgilash"
                              onClick={() => handleStatusChange(s.id, 'completed')}
                            >
                              ✅
                            </button>
                            <button
                              className="btn-icon"
                              title="Bekor qilish"
                              onClick={() => handleStatusChange(s.id, 'cancelled')}
                            >
                              ❌
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3} className="tfoot-label">Jami ({filtered.length} sotuv)</td>
                  <td className="amount-cell tfoot-total">{fmt(total)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Yangi sotuv</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreate} className="modal-form">
              {formError && <p className="form-error">{formError}</p>}

              <div className="field">
                <label>Mijoz ismi</label>
                <input
                  type="text"
                  placeholder="Alisher Karimov"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="field">
                <label>Mahsulot</label>
                <select
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                  required
                >
                  <option value="">— Tanlang —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {fmt(Number(p.price))} ({p.quantity} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="field">
                  <label>Miqdori</label>
                  <input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>To'lov turi</label>
                  <select
                    value={form.paymentType}
                    onChange={(e) => setForm({ ...form, paymentType: e.target.value as PaymentType })}
                  >
                    <option value="cash">Naqd</option>
                    <option value="card">Karta</option>
                    <option value="credit">Nasiya</option>
                  </select>
                </div>
              </div>

              {previewAmount > 0 && (
                <div className="amount-preview">
                  Jami: <strong>{fmt(previewAmount)}</strong>
                </div>
              )}

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
