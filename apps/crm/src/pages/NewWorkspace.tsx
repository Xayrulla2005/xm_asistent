import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuthStore } from '../stores/auth.store';

export default function NewWorkspace() {
  const navigate      = useNavigate();
  const setDirectAuth = useAuthStore((s) => s.setDirectAuth);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.post<{
          tenantId: string;
          accessToken: string;
          refreshToken: string;
        }>('/tenants/new-workspace');

        if (cancelled) return;

        localStorage.setItem('crm_accessToken',  data.accessToken);
        localStorage.setItem('crm_refreshToken', data.refreshToken);
        localStorage.setItem('crm_tenantId',     data.tenantId);
        setDirectAuth(data.accessToken);

        navigate(`/wizard/${data.tenantId}`, { replace: true });
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message;
        if (msg === 'Sizda allaqachon aktiv CRM mavjud') {
          // Race condition — already has tenant, go to dashboard
          navigate('/dashboard', { replace: true });
          return;
        }
        setError(msg ?? "CRM yaratishda xatolik yuz berdi");
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#080810', color: '#fff', gap: 16,
    }}>
      {error ? (
        <>
          <div style={{ color: '#ef4444', fontSize: '0.95rem' }}>{error}</div>
          <button
            onClick={() => navigate('/', { replace: true })}
            style={{
              marginTop: 8, padding: '0.5rem 1.25rem',
              background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)',
              borderRadius: 8, color: '#a78bfa', cursor: 'pointer', fontSize: '0.85rem',
            }}
          >
            Bosh sahifaga qaytish
          </button>
        </>
      ) : (
        <>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'conic-gradient(#8b5cf6 0deg, transparent 240deg)',
            animation: 'spin 0.9s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            Yangi CRM tayyorlanmoqda...
          </p>
        </>
      )}
    </div>
  );
}
