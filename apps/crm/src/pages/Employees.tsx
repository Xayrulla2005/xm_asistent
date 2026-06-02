import { FormEvent, useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { useAuthStore } from '../stores/auth.store';

type EmployeeRole = 'admin' | 'manager' | 'cashier' | 'warehouse';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: EmployeeRole;
  isActive: boolean;
  tenantId: string;
  createdAt: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: EmployeeRole;
}

const ROLE_META: Record<EmployeeRole, { label: string; color: string; bg: string }> = {
  admin:     { label: 'Admin',    color: '#7c3aed', bg: '#ede9fe' },
  manager:   { label: 'Menejer', color: '#1d4ed8', bg: '#dbeafe' },
  cashier:   { label: 'Kassir',  color: '#059669', bg: '#d1fae5' },
  warehouse: { label: 'Sklad',   color: '#d97706', bg: '#fef3c7' },
};

const EMPTY_FORM: FormData = {
  firstName: '', lastName: '', email: '', password: '', role: 'cashier',
};

export default function Employees() {
  const user = useAuthStore((s) => s.user);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [form, setForm]           = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]  = useState('');
  const [openMenu, setOpenMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Employee[]>('/employees');
      setEmployees(data);
    } catch {
      setError("Xodimlarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (emp: Employee) => {
    setEditTarget(emp);
    setForm({
      firstName: emp.firstName,
      lastName:  emp.lastName,
      email:     emp.email,
      password:  '',
      role:      emp.role,
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditTarget(null); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      if (editTarget) {
        const payload: Partial<FormData> = { ...form };
        if (!payload.password) delete payload.password;
        await api.patch(`/employees/${editTarget.id}`, payload);
      } else {
        await api.post('/employees', form);
      }
      closeModal();
      fetchEmployees();
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (emp: Employee) => {
    try {
      await api.patch(`/employees/${emp.id}`, { isActive: !emp.isActive });
      setEmployees((prev) => prev.map((e) => e.id === emp.id ? { ...e, isActive: !e.isActive } : e));
    } catch { /* silent */ }
  };

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`"${emp.firstName} ${emp.lastName}" ni o'chirmoqchimisiz?`)) return;
    try {
      await api.delete(`/employees/${emp.id}`);
      setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
    } catch { /* silent */ }
  };

  const set = (p: Partial<FormData>) => setForm((f) => ({ ...f, ...p }));

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Xodimlar</h2>
        {canManage && (
          <button className="btn-primary" onClick={openCreate}>+ Yangi xodim</button>
        )}
      </div>

      {loading && <p className="state-msg">Yuklanmoqda...</p>}
      {error   && <p className="state-msg state-msg--error">{error}</p>}

      {!loading && !error && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Ism Familiya</th>
                <th>Email</th>
                <th>Lavozim</th>
                <th>Holat</th>
                <th>Kirilgan</th>
                {canManage && <th>Amallar</th>}
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    Hech qanday xodim topilmadi
                  </td>
                </tr>
              ) : employees.map((emp) => {
                const rm = ROLE_META[emp.role] ?? ROLE_META.cashier;
                return (
                  <tr key={emp.id} style={{ opacity: emp.isActive ? 1 : 0.55 }}>
                    <td style={{ fontWeight: 600 }}>
                      {emp.firstName} {emp.lastName}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{emp.email}</td>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '0.2rem 0.65rem',
                        borderRadius: 6, fontSize: '0.76rem', fontWeight: 600,
                        color: rm.color, background: rm.bg,
                      }}>
                        {rm.label}
                      </span>
                    </td>
                    <td>
                      {canManage ? (
                        <button
                          className={`status-toggle status-toggle--${emp.isActive ? 'active' : 'inactive'}`}
                          onClick={() => toggleActive(emp)}
                        >
                          {emp.isActive ? '● Faol' : '● Bloklangan'}
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: emp.isActive ? '#059669' : '#dc2626' }}>
                          {emp.isActive ? '● Faol' : '● Bloklangan'}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {new Date(emp.createdAt).toLocaleDateString('uz-UZ')}
                    </td>
                    {canManage && (
                      <td>
                        <button
                          className="dots-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openMenu?.id === emp.id) { setOpenMenu(null); return; }
                            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                            setOpenMenu({ id: emp.id, x: rect.right - 180, y: rect.bottom + 4 });
                          }}
                        >
                          ⋯
                        </button>
                        {openMenu?.id === emp.id && (
                          <div
                            className="dots-menu"
                            ref={menuRef}
                            style={{ top: openMenu.y, left: openMenu.x }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button className="dots-menu-item" onClick={() => { openEdit(emp); setOpenMenu(null); }}>
                              ✏️ Tahrirlash
                            </button>
                            <button className="dots-menu-item" onClick={() => { toggleActive(emp); setOpenMenu(null); }}>
                              {emp.isActive ? '🔴 Bloklash' : '🟢 Faollashtirish'}
                            </button>
                            <button className="dots-menu-item dots-menu-item--danger" onClick={() => { handleDelete(emp); setOpenMenu(null); }}>
                              🗑️ O'chirish
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editTarget ? 'Xodimni tahrirlash' : 'Yangi xodim'}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {formError && (
                <p style={{ color: '#dc2626', fontSize: '0.85rem', background: '#fee2e2', padding: '0.6rem 0.9rem', borderRadius: 8, margin: 0 }}>
                  {formError}
                </p>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Ism *</label>
                  <input
                    type="text" required value={form.firstName}
                    onChange={(e) => set({ firstName: e.target.value })}
                    placeholder="Alibek"
                  />
                </div>
                <div className="field">
                  <label>Familiya *</label>
                  <input
                    type="text" required value={form.lastName}
                    onChange={(e) => set({ lastName: e.target.value })}
                    placeholder="Rahimov"
                  />
                </div>
              </div>

              <div className="field">
                <label>Email *</label>
                <input
                  type="email" required value={form.email}
                  onChange={(e) => set({ email: e.target.value })}
                  placeholder="alibek@example.com"
                />
              </div>

              <div className="field">
                <label>{editTarget ? 'Yangi parol (ixtiyoriy)' : 'Parol *'}</label>
                <input
                  type="password"
                  required={!editTarget}
                  minLength={6}
                  value={form.password}
                  onChange={(e) => set({ password: e.target.value })}
                  placeholder={editTarget ? 'O\'zgartirmaslik uchun bo\'sh qoldiring' : 'Kamida 6 ta belgi'}
                />
              </div>

              <div className="field">
                <label>Lavozim *</label>
                <select value={form.role} onChange={(e) => set({ role: e.target.value as EmployeeRole })}>
                  <option value="manager">Menejer</option>
                  <option value="cashier">Kassir</option>
                  <option value="warehouse">Sklad xodimi</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={closeModal} disabled={submitting}>
                  Bekor
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saqlanmoqda...' : (editTarget ? 'Saqlash' : 'Qo\'shish')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
