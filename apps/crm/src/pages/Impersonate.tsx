import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useTenantStore } from '../stores/tenant.store';
import { useConfigStore } from '../stores/config.store';
import { generateCrmConfig } from '../api/crm-engine.api';

function parseJwt(token: string): { sub: string; tenantId: string | null; impersonated?: boolean } | null {
  try {
    const p = JSON.parse(atob(token.split('.')[1]));
    if (p.exp && p.exp * 1000 < Date.now()) return null;
    return { sub: p.sub, tenantId: p.tenantId ?? null, impersonated: p.impersonated ?? false };
  } catch { return null; }
}

// Module-level set so React StrictMode's unmount→remount doesn't re-trigger the flow.
// Each unique token is processed exactly once per page lifetime.
const _processed = new Set<string>();

export default function Impersonate() {
  const [params] = useSearchParams();
  const navigate  = useNavigate();
  const [error, setError] = useState('');

  const setDirectAuth = useAuthStore((s) => s.setDirectAuth);
  const setTenantId   = useTenantStore((s) => s.setTenantId);
  const clearConfig   = useConfigStore((s) => s.clearConfig);
  const fetchConfig   = useConfigStore((s) => s.fetchConfig);

  useEffect(() => {
    const token = params.get('token') ?? '';
    if (!token) { setError("Token topilmadi"); return; }
    if (_processed.has(token)) return;
    _processed.add(token);

    const payload = parseJwt(token);
    if (!payload) { setError("Token yaroqsiz yoki muddati o'tgan"); return; }
    if (!payload.tenantId) { setError("Bu foydalanuvchiga tenant biriktirilmagan"); return; }

    // 1. Write session to storage before anything else (axios interceptor reads from here)
    localStorage.setItem('crm_accessToken', token);
    localStorage.setItem('crm_impersonated', 'true');
    localStorage.removeItem('crm_refreshToken');
    localStorage.removeItem('crm_sessionToken');

    // 2. Update in-memory stores
    setDirectAuth(token);
    setTenantId(payload.tenantId);
    clearConfig(); // evict previous tenant's config

    // 3. Remove token from URL immediately (security)
    window.history.replaceState({}, '', '/impersonate');

    // 4. Force-regenerate CRM config from latest wizard (fixes stale retail configs),
    //    then read it back. On any error, fall through to fetchConfig which reads DB as-is.
    generateCrmConfig()
      .then(() => fetchConfig(payload.tenantId!))
      .catch(() => fetchConfig(payload.tenantId!))
      .then(() => navigate('/dashboard', { replace: true }))
      .catch(() => navigate('/dashboard', { replace: true }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', flexDirection: 'column', gap: '1rem',
        fontFamily: 'system-ui, sans-serif', background: '#0f172a', color: '#e2e8f0',
      }}>
        <div style={{ fontSize: '2.5rem' }}>!</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f87171' }}>Kirish mumkin emas</div>
        <div style={{ fontSize: '0.9rem', color: '#94a3b8', textAlign: 'center', maxWidth: 320 }}>{error}</div>
        <button
          onClick={() => navigate('/login', { replace: true })}
          style={{
            marginTop: '0.5rem', padding: '0.55rem 1.5rem', borderRadius: 8,
            background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: 500,
          }}
        >
          Loginga qaytish
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', flexDirection: 'column', gap: '1rem',
      fontFamily: 'system-ui, sans-serif', background: '#0f172a', color: '#94a3b8',
    }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid #1e293b', borderTopColor: '#6366f1',
        borderRadius: '50%', animation: 'spin 0.75s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ fontSize: '0.95rem' }}>CRM konfiguratsiyasi yangilanmoqda...</div>
    </div>
  );
}
