import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { Lock, Mail, Server, ShieldCheck } from 'lucide-react';
import api from '../api/axios';
import { useAuthStore } from '../stores/auth.store';
import { useConfigStore } from '../stores/config.store';
import { useTenantStore } from '../stores/tenant.store';
import { getTenantSlug } from '../utils/subdomain';

const TENANT_KEY = 'crm_tenantId';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function LoginForm({ onSuccess }: { onSuccess: (tenantId: string) => void }) {
  const login         = useAuthStore((s) => s.login);
  const setDirectAuth = useAuthStore((s) => s.setDirectAuth);
  const fetchConfig   = useConfigStore((s) => s.fetchConfig);
  const setTenantId   = useTenantStore((s) => s.setTenantId);
  const navigate      = useNavigate();

  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [showPw,        setShowPw]        = useState(false);
  const [error,         setError]         = useState('');
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setError('');
      try {
        const { data } = await api.post<{
          accessToken: string; refreshToken: string;
          tenantId: string | null; needsWizard: boolean;
        }>('/auth/google-login', { token: tokenResponse.access_token });
        localStorage.setItem('crm_accessToken',  data.accessToken);
        localStorage.setItem('crm_refreshToken', data.refreshToken);
        setDirectAuth(data.accessToken);
        if (data.needsWizard || !data.tenantId) {
          navigate('/new-workspace');
          return;
        }
        localStorage.setItem(TENANT_KEY, data.tenantId);
        setTenantId(data.tenantId);
        await fetchConfig(data.tenantId);
        navigate('/dashboard');
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setError(typeof msg === 'string' ? msg : "Google orqali kirishda xatolik yuz berdi");
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => setError("Google login bekor qilindi"),
    flow: 'implicit',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const tenantId = await login(email, password);
      if (!tenantId) {
        // No linked CRM — create new workspace automatically
        navigate('/new-workspace');
        return;
      }
      setTenantId(tenantId);
      onSuccess(tenantId);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const knownBackend = typeof msg === 'string' && msg !== 'Invalid credentials' && msg !== 'Unauthorized';
      setError(knownBackend ? msg : "Email yoki parol noto'g'ri");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reg-card">
      <div className="reg-brand-row">
        <div className="reg-logo-glow">XM</div>
        <div>
          <h1 className="reg-h1">Xush kelibsiz</h1>
          <p className="reg-sub">Hisobingizga kiring</p>
        </div>
      </div>

      {error && <div className="reg-error">{error}</div>}

      <button
        type="button"
        className="reg-google-btn"
        onClick={() => { setError(''); googleLogin(); }}
        disabled={googleLoading || loading}
      >
        <GoogleIcon />
        {googleLoading ? 'Yuklanmoqda...' : 'Google orqali kirish'}
      </button>

      <div className="auth-divider"><span>yoki email bilan</span></div>

      <form
        onSubmit={handleSubmit}
        autoComplete="on"
        style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}
      >
        <div className="reg-field">
          <label className="reg-label">Email</label>
          <div className="reg-input-wrap">
            <Mail size={16} className="reg-icon" />
            <input
              className="reg-input"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@example.com"
              autoFocus
            />
          </div>
        </div>

        <div className="reg-field">
          <label className="reg-label">Parol</label>
          <div className="reg-pw-input-wrap">
            <input
              className="reg-input reg-input--pw"
              type={showPw ? 'text' : 'password'}
              name="current-password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
            <button
              type="button"
              className="reg-pw-eye"
              onClick={() => setShowPw((p) => !p)}
              tabIndex={-1}
              aria-label={showPw ? "Parolni yashirish" : "Parolni ko'rsatish"}
            >
              <EyeIcon open={showPw} />
            </button>
          </div>
        </div>

        <button type="submit" className="reg-glow-btn" disabled={loading}>
          {loading ? 'Kirish...' : 'Kirish'}
        </button>
      </form>

      <p className="reg-link-row">
        Hisobingiz yo'qmi? <Link to="/register">Bepul boshlash →</Link>
      </p>

      <div className="reg-trust-badges">
        <div className="reg-trust-badge"><ShieldCheck size={11} /> SSL himoyalangan</div>
        <div className="reg-trust-badge"><Lock size={11} /> Ma'lumotlar shifrlanadi</div>
        <div className="reg-trust-badge"><Server size={11} /> 24/7 Backup</div>
      </div>
    </div>
  );
}

export default function Login() {
  const navigate    = useNavigate();
  const setTenantId = useTenantStore((s) => s.setTenantId);
  const fetchConfig = useConfigStore((s) => s.fetchConfig);
  const [subdomainInfo, setSubdomainInfo] = useState<{ name: string; logoUrl: string | null } | null>(null);

  useEffect(() => {
    // Auto-redirect if already logged in
    const token = localStorage.getItem('crm_accessToken');
    const tid   = localStorage.getItem(TENANT_KEY);
    if (token && tid) {
      try {
        const p = JSON.parse(atob(token.split('.')[1]));
        if (!p.exp || p.exp * 1000 > Date.now()) {
          setTenantId(tid);
          fetchConfig(tid).then(() => navigate('/dashboard'));
          return;
        }
      } catch { /* invalid token — fall through to login */ }
      localStorage.removeItem('crm_accessToken');
      localStorage.removeItem('crm_refreshToken');
    }

    // Subdomain detection — pre-fetch tenant branding when on {slug}.domain.com
    const slug = getTenantSlug();
    if (slug) {
      api.get<{ id: string; name: string; slug: string; logoUrl: string | null }>(
        `/tenants/public/by-slug/${encodeURIComponent(slug)}`
      )
        .then(r => setSubdomainInfo({ name: r.data.name, logoUrl: r.data.logoUrl }))
        .catch(() => { /* slug not found — show generic login */ });
    }
  }, []);

  const handleSuccess = async (tenantId: string) => {
    await fetchConfig(tenantId);
    navigate('/dashboard');
  };

  return (
    <div className="reg-bg">
      <div className="reg-glow-1" />
      <div className="reg-glow-2" />
      <div className="reg-glow-3" />
      <div className="reg-scroll">
        {subdomainInfo && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '0.5rem', marginBottom: '1.5rem',
          }}>
            {subdomainInfo.logoUrl && (
              <img src={subdomainInfo.logoUrl} alt="logo" style={{ height: 48, objectFit: 'contain', borderRadius: 8 }} />
            )}
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e2e8f0' }}>
              {subdomainInfo.name} CRM
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Hisobingizga kirish
            </div>
          </div>
        )}
        <LoginForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
