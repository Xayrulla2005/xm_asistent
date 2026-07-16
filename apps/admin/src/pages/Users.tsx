import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tenant {
  id:   string;
  name: string;
}

interface EmployeeRow {
  id:         string;
  firstName:  string;
  lastName:   string;
  email:      string;
  role:       string;
  isActive:   boolean;
  tenantId:   string;
  tenantName: string;
  createdAt:  string;
  updatedAt:  string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin:             'Admin',
  manager:           'Menejer',
  cashier:           'Kassir',
  warehouse:         'Skladchi',
  warehouse_manager: 'Sklad boshqaruvchi',
  accountant:        'Buxgalter',
  sales_manager:     'Sotuv menejeri',
  doctor:            'Shifokor',
  nurse:             'Hamshira',
  receptionist:      'Qabulchi',
  pharmacist:        'Dorixonachi',
  teacher:           "O'qituvchi",
  student:           "O'quvchi",
  curator:           'Kurator',
  waiter:            'Ofitsiant',
  cook:              'Oshpaz',
  delivery_courier:  'Yetkazuvchi',
};

const ROLE_COLORS: Record<string, string> = {
  admin:   '#6366f1',
  manager: '#8b5cf6',
  cashier: '#f59e0b',
  warehouse: '#10b981',
  warehouse_manager: '#10b981',
  accountant: '#3b82f6',
  sales_manager: '#ec4899',
};

function roleColor(role: string): string {
  return ROLE_COLORS[role] ?? '#6b7280';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('uz-UZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.15rem 0.5rem',
      borderRadius: 99,
      fontSize: '0.75rem',
      fontWeight: 600,
      background: color + '22',
      color,
    }}>
      {label}
    </span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Users() {
  const [employees,     setEmployees]     = useState<EmployeeRow[]>([]);
  const [tenants,       setTenants]       = useState<Tenant[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [filterTenant,  setFilterTenant]  = useState('');
  const [filterRole,    setFilterRole]    = useState('');
  const [filterStatus,  setFilterStatus]  = useState('');
  const [search,        setSearch]        = useState('');
  const [toggling,      setToggling]      = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: tenantList } = await api.get<Tenant[]>('/tenants');
      setTenants(tenantList);

      // Fetch employees for every tenant in parallel; skip tenants that fail
      const results = await Promise.allSettled(
        tenantList.map((t) =>
          api
            .get<Omit<EmployeeRow, 'tenantName'>[]>('/employees', {
              headers: { 'x-tenant-id': t.id },
            })
            .then((r) => r.data.map((e) => ({ ...e, tenantName: t.name }))),
        ),
      );

      const rows: EmployeeRow[] = results.flatMap((r) =>
        r.status === 'fulfilled' ? r.value : [],
      );
      setEmployees(rows);
    } catch {
      setError("Ma'lumot yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (emp: EmployeeRow) => {
    setToggling((prev) => new Set(prev).add(emp.id));
    try {
      await api.patch(
        `/employees/${emp.id}`,
        { isActive: !emp.isActive },
        { headers: { 'x-tenant-id': emp.tenantId } },
      );
      setEmployees((prev) =>
        prev.map((e) => e.id === emp.id ? { ...e, isActive: !e.isActive } : e),
      );
    } catch {
      // Silently fail — state unchanged
    } finally {
      setToggling((prev) => { const next = new Set(prev); next.delete(emp.id); return next; });
    }
  };

  // Distinct role values present in data
  const allRoles = useMemo(
    () => [...new Set(employees.map((e) => e.role))].sort(),
    [employees],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (filterTenant && e.tenantId !== filterTenant) return false;
      if (filterRole   && e.role !== filterRole)       return false;
      if (filterStatus === 'active'   && !e.isActive)  return false;
      if (filterStatus === 'inactive' &&  e.isActive)  return false;
      if (q) {
        const hay = `${e.firstName} ${e.lastName} ${e.email}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [employees, filterTenant, filterRole, filterStatus, search]);

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Foydalanuvchilar</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {loading ? '…' : `${filtered.length} / ${employees.length} xodim`}
        </span>
      </div>

      {/* ── Filter bar ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '0.75rem',
        marginBottom: '1.25rem', alignItems: 'center',
      }}>
        <input
          className="input"
          style={{ flex: '1 1 200px', minWidth: 0 }}
          placeholder="Ism, familiya yoki email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="input"
          style={{ flex: '0 1 180px' }}
          value={filterTenant}
          onChange={(e) => setFilterTenant(e.target.value)}
        >
          <option value="">Barcha tenantlar</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <select
          className="input"
          style={{ flex: '0 1 160px' }}
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="">Barcha rollar</option>
          {allRoles.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
          ))}
        </select>

        <select
          className="input"
          style={{ flex: '0 1 140px' }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Barcha status</option>
          <option value="active">Faol</option>
          <option value="inactive">Bloklangan</option>
        </select>
      </div>

      {loading && <p className="state-msg">Yuklanmoqda...</p>}
      {error   && <p className="state-msg state-msg--error">{error}</p>}

      {!loading && !error && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>To'liq ism</th>
                <th>Rol</th>
                <th>Tenant</th>
                <th>Status</th>
                <th>Oxirgi faollik</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Xodimlar topilmadi
                  </td>
                </tr>
              ) : filtered.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>
                      {emp.firstName} {emp.lastName}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {emp.email}
                    </div>
                  </td>

                  <td>
                    <Badge label={ROLE_LABELS[emp.role] ?? emp.role} color={roleColor(emp.role)} />
                  </td>

                  <td>
                    <span className="industry-badge">{emp.tenantName}</span>
                  </td>

                  <td>
                    <Badge
                      label={emp.isActive ? 'Faol' : 'Bloklangan'}
                      color={emp.isActive ? '#16a34a' : '#ef4444'}
                    />
                  </td>

                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {fmtDate(emp.updatedAt)}
                  </td>

                  <td>
                    <button
                      className={`action-btn ${emp.isActive ? 'action-btn--delete' : 'action-btn--view'}`}
                      disabled={toggling.has(emp.id)}
                      onClick={() => toggleActive(emp)}
                      title={emp.isActive ? 'Bloklash' : 'Blokdan chiqarish'}
                    >
                      {toggling.has(emp.id)
                        ? '...'
                        : emp.isActive ? 'Bloklash' : 'Faollashtirish'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
