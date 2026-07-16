import { FormEvent, useEffect, useState } from 'react';
import {
  getPayments,
  getPaymentStats,
  createPayment,
  updatePaymentStatus,
  Payment,
  PaymentStats,
  PaymentType,
  PaymentMethod,
  PaymentStatus,
} from '../api/payments.api';
import { useTenantStore } from '../stores/tenant.store';

const fmt = (n: number) => n.toLocaleString('uz-UZ') + " so'm";

const TYPE_MAP: Record<PaymentType, { label: string; cls: string }> = {
  income:  { label: 'Kirim',  cls: 'badge--active' },
  expense: { label: 'Chiqim', cls: 'badge--inactive' },
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash:   'Naqd',
  card:   'Karta',
  credit: 'Nasiya',
};

const STATUS_MAP: Record<PaymentStatus, { label: string; cls: string }> = {
  completed: { label: "To'langan",  cls: 'badge--active' },
  pending:   { label: 'Kutilmoqda', cls: 'badge--warning' },
  cancelled: { label: 'Bekor',      cls: 'badge--inactive' },
};

type FilterType = 'all' | 'income' | 'expense' | 'pending';

interface FormState {
  customerName: string;
  amount: string;
  type: PaymentType;
  method: PaymentMethod;
  description: string;
}

const emptyForm = (): FormState => ({
  customerName: '',
  amount: '',
  type: 'income',
  method: 'cash',
  description: '',
});

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('uz-UZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function Payments() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filter, setFilter] = useState<FilterType>('all');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      getPayments(tenantId),
      getPaymentStats(tenantId),
    ])
      .then(([p, s]) => { setPayments(p); setStats(s); })
      .catch(() => setError("Ma'lumot yuklashda xatolik"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, [tenantId]);

  const filtered = (() => {
    if (filter === 'all')     return payments;
    if (filter === 'pending') return payments.filter((p) => p.status === 'pending');
    return payments.filter((p) => p.type === filter);
  })();

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await createPayment({
        tenantId,
        customerName: form.customerName,
        amount: Number(form.amount),
        type: form.type,
        method: form.method,
        description: form.description || undefined,
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

  const handleStatus = async (id: string, status: PaymentStatus) => {
    try {
      await updatePaymentStatus(id, status);
      fetchAll();
    } catch {
      alert('Status yangilashda xatolik');
    }
  };

  const openModal = () => { setForm(emptyForm()); setFormError(''); setShowModal(true); };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">To'lovlar</h2>
        <button className="btn-primary" onClick={openModal}>+ Yangi to'lov</button>
      </div>

      {/* Stats cards */}
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
            <p className="stat-label">Kutilayotgan</p>
            <p className="stat-value">{stats ? `${stats.pendingCount} ta` : '—'}</p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs">
        {([
          { key: 'all',     label: 'Barchasi' },
          { key: 'income',  label: 'Kirim' },
          { key: 'expense', label: 'Chiqim' },
          { key: 'pending', label: 'Kutilayotgan' },
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
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Sana</th>
                <th>Mijoz</th>
                <th>Summa</th>
                <th>Turi</th>
                <th>Usul</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    {"To'lov yo'q"}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const type   = TYPE_MAP[p.type];
                  const status = STATUS_MAP[p.status];
                  return (
                    <tr key={p.id}>
                      <td className="text-muted" style={{ fontSize: '0.85rem' }}>{formatTime(p.createdAt)}</td>
                      <td className="product-name">
                        {p.customerName}
                        {p.description && (
                          <span className="text-muted" style={{ fontSize: '0.78rem', display: 'block', fontWeight: 400 }}>
                            {p.description}
                          </span>
                        )}
                      </td>
                      <td className="amount-cell" style={{ color: p.type === 'income' ? '#10b981' : '#ef4444' }}>
                        {p.type === 'income' ? '+' : '−'}{fmt(Number(p.amount))}
                      </td>
                      <td><span className={'badge ' + type.cls}>{type.label}</span></td>
                      <td className="text-muted">{METHOD_LABELS[p.method]}</td>
                      <td><span className={'badge ' + status.cls}>{status.label}</span></td>
                      <td>
                        {p.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button
                              className="btn-icon"
                              title="Tasdiqlash"
                              onClick={() => handleStatus(p.id, 'completed')}
                            >OK</button>
                            <button
                              className="btn-icon"
                              title="Bekor qilish"
                              onClick={() => handleStatus(p.id, 'cancelled')}
                            >X</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Yangi to'lov</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreate} className="modal-form">
              {formError && <p className="form-error">{formError}</p>}

              <div className="field">
                <label>Mijoz ismi *</label>
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
                <label>Summa (so'm) *</label>
                <input
                  type="number"
                  min="1"
                  placeholder="500000"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="field">
                  <label>Turi</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as PaymentType })}
                  >
                    <option value="income">Kirim</option>
                    <option value="expense">Chiqim</option>
                  </select>
                </div>
                <div className="field">
                  <label>Usul</label>
                  <select
                    value={form.method}
                    onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod })}
                  >
                    <option value="cash">Naqd</option>
                    <option value="card">Karta</option>
                    <option value="credit">Nasiya</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Izoh (ixtiyoriy)</label>
                <input
                  type="text"
                  placeholder="Mahsulot uchun to'lov..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
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
