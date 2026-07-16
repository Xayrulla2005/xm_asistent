import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useTenantStore } from '../stores/tenant.store';

function parseJwt(token: string): { sub: string; tenantId: string | null; impersonated?: boolean } | null {
  try {
    const p = JSON.parse(atob(token.split('.')[1]));
    if (p.exp && p.exp * 1000 < Date.now()) return null;
    return { sub: p.sub, tenantId: p.tenantId ?? null, impersonated: p.impersonated ?? false };
  } catch { return null; }
}

export default function Impersonate() {
  const [params] = useSearchParams();
  const navigate  = useNavigate();
  const [error, setError] = useState('');
  const done = useRef(false);

  const setDirectAuth  = useAuthStore((s) => s.setDirectAuth);
  const setTenantId    = useTenantStore((s) => s.setTenantId);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const token = params.get('token');
    if (!token) { setError("Token topilmadi"); return; }

    const payload = parseJwt(token);
    if (!payload) { setError("Token yaroqsiz yoki muddati o'tgan"); return; }
    if (!payload.tenantId) { setError("Bu foydalanuvchiga tenant biriktirilmagan"); return; }

    // Store impersonation token — treated as a regular access token
    localStorage.setItem('crm_accessToken', token);
    localStorage.setItem('crm_impersonated', 'true');
    localStorage.removeItem('crm_refreshToken');
    localStorage.removeItem('crm_sessionToken');

    setDirectAuth(token);
    setTenantId(payload.tenantId);

    // Clear token from URL for security, then go to dashboard
    window.history.replaceState({}, '', '/dashboard');
    navigate('/dashboard', { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '1rem', fontFamily: 'sans-serif' }}>
        <div style={{ color: '#ef4444', fontWeight: 600 }}>{error}</div>
        <button
          onClick={() => navigate('/', { replace: true })}
          style={{ padding: '0.5rem 1.25rem', borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          Loginga qaytish
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', color: '#6b7280' }}>
      CRM ochilmoqda...
    </div>
  );
}
