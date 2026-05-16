import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useConfigStore } from '../stores/config.store';
import { useTenantStore } from '../stores/tenant.store';
import api from '../api/axios';

const SELECTED_TENANT_KEY = 'crm_selectedTenant';

interface TenantOption {
  id: string;
  name: string;
  slug: string;
}

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const fetchConfig = useConfigStore((s) => s.fetchConfig);
  const setTenantId = useTenantStore((s) => s.setTenantId);

  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>(
    localStorage.getItem(SELECTED_TENANT_KEY) ?? ''
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenantsLoading, setTenantsLoading] = useState(true);

  useEffect(() => {
    api.get<TenantOption[]>('/tenants')
      .then((r) => {
        const list = r.data;
        setTenants(list);
        // Agar tanlov yo'q bo'lsa va bitta tenant bo'lsa — avtomatik tanlash
        if (!selectedTenant && list.length === 1) {
          setSelectedTenant(list[0].id);
          localStorage.setItem(SELECTED_TENANT_KEY, list[0].id);
        }
        // Agar tanlov yo'q bo'lsa va ko'p tenant bo'lsa — birinchisini tanlash
        if (!selectedTenant && list.length > 1) {
          setSelectedTenant(list[0].id);
          localStorage.setItem(SELECTED_TENANT_KEY, list[0].id);
        }
      })
      .catch(() => setTenants([]))
      .finally(() => setTenantsLoading(false));
  }, []);

  const handleTenantChange = (id: string) => {
    setSelectedTenant(id);
    localStorage.setItem(SELECTED_TENANT_KEY, id);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) {
      setError('Iltimos, tenant tanlang');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      setTenantId(selectedTenant);
      await fetchConfig(selectedTenant);
      navigate('/dashboard');
    } catch {
      setError("Email yoki parol noto'g'ri");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-card">
        <div className="login-brand">
          <span style={{ fontSize: '2rem' }}>■</span>
          <h2 className="login-title">Savdo CRM</h2>
        </div>

        {error && <p className="login-error">{error}</p>}

        <div className="field">
          <label>Kompaniya</label>
          {tenantsLoading ? (
            <select disabled>
              <option>Yuklanmoqda...</option>
            </select>
          ) : (
            <select
              value={selectedTenant}
              onChange={(e) => handleTenantChange(e.target.value)}
              required
            >
              {tenants.length === 0 && (
                <option value="">Tenant topilmadi</option>
              )}
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="email@example.com"
          />
        </div>

        <div className="field">
          <label>Parol</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
        </div>

        <button type="submit" disabled={loading || tenantsLoading} className="login-btn">
          {loading ? 'Kirish...' : 'Kirish'}
        </button>
      </form>
    </div>
  );
}
