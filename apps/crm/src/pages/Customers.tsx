import { FormEvent, useEffect, useState } from 'react';
import {
  getCustomers,
  createCustomer,
  Customer,
} from '../api/customers.api';
import { useTenantStore } from '../stores/tenant.store';

const fmt = (n: number) => n.toLocaleString('uz-UZ') + " so'm";

interface FormState {
  name: string;
  phone: string;
  address: string;
}

const emptyForm = (): FormState => ({ name: '', phone: '', address: '' });

export default function Customers() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchCustomers = () => {
    setLoading(true);
    getCustomers(tenantId)
      .then(setCustomers)
      .catch(() => setError("Ma'lumot yuklashda xatolik"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCustomers(); }, [tenantId]);

  const filtered = search
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.phone ?? '').includes(search),
      )
    : customers;

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await createCustomer({
        tenantId,
        name: form.name,
        phone: form.phone || undefined,
        address: form.address || undefined,
      });
      setShowModal(false);
      setForm(emptyForm());
      fetchCustomers();
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
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
        <h2 className="page-title">👥 Mijozlar</h2>
        <button className="btn-primary" onClick={openModal}>+ Mijoz qo'shish</button>
      </div>

      <div className="toolbar">
        <input
          type="search"
          className="search-input"
          placeholder="Ism yoki telefon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="toolbar-count">{filtered.length} ta mijoz</span>
      </div>

      {loading && <p className="state-msg">Yuklanmoqda...</p>}
      {error && <p className="state-msg state-msg--error">{error}</p>}

      {!loading && !error && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Mijoz</th>
                <th>Telefon</th>
                <th>Manzil</th>
                <th>Qarzdorlik</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    {search ? 'Topilmadi' : "Hali mijoz yo'q"}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="customer-cell">
                        <span className="customer-avatar">{c.name[0].toUpperCase()}</span>
                        {c.name}
                      </div>
                    </td>
                    <td className="phone-cell">{c.phone || '—'}</td>
                    <td className="text-muted">{c.address || '—'}</td>
                    <td className={Number(c.totalDebt) > 0 ? 'amount-cell' : 'text-muted'}>
                      {Number(c.totalDebt) > 0 ? fmt(Number(c.totalDebt)) : '—'}
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
              <h3>Yangi mijoz</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreate} className="modal-form">
              {formError && <p className="form-error">{formError}</p>}

              <div className="field">
                <label>Ismi *</label>
                <input
                  type="text"
                  placeholder="Alisher Karimov"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="field">
                <label>Telefon</label>
                <input
                  type="tel"
                  placeholder="+998 90 123 45 67"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div className="field">
                <label>Manzil</label>
                <input
                  type="text"
                  placeholder="Toshkent, Chilonzor"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
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
