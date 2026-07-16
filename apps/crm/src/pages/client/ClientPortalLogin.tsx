import { FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { customerLogin, saveSession } from '../../api/client-portal.api';

export default function ClientPortalLogin() {
  const { slug }  = useParams<{ slug: string }>();
  const navigate  = useNavigate();

  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!slug) return;
    setError('');
    setLoading(true);
    try {
      const result = await customerLogin(slug, phone, password);
      saveSession(slug, result.accessToken, result.customer);
      navigate(`/client/${slug}/portal`, { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : "Telefon yoki parol noto'g'ri");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cp-auth-bg">
      <div className="cp-auth-card">

        <Link to={`/client/${slug}`} className="cp-back-link">
          ← Orqaga
        </Link>

        <div className="cp-auth-logo">XM</div>
        <h1 className="cp-auth-title">Kirish</h1>
        <p className="cp-auth-sub">Telefon raqamingiz va parolingizni kiriting</p>

        {error && <div className="cp-auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="cp-auth-form">
          <div className="cp-field">
            <label className="cp-label">Telefon raqam</label>
            <input
              className="cp-input"
              type="tel"
              placeholder="+998901234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="cp-field">
            <label className="cp-label">Parol</label>
            <div className="cp-pw-wrap">
              <input
                className="cp-input"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="cp-pw-toggle"
                onClick={() => setShowPw((v) => !v)}
                tabIndex={-1}
              >
                {showPw ? '●' : '○'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="cp-btn cp-btn--primary cp-btn--full"
            disabled={loading}
          >
            {loading ? 'Yuklanmoqda...' : 'Kirish'}
          </button>
        </form>

        <p className="cp-auth-hint">
          Parolni admin tomonidan olasiz. Muammo bo'lsa do'koningiz bilan bog'laning.
        </p>
      </div>
    </div>
  );
}
