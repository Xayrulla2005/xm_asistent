import { ClipboardEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { Mail, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { sendEmailOtp, verifyOtp } from '../api/otp.api';
import { registerTenant } from '../api/wizard.api';
import { useAuthStore } from '../stores/auth.store';
import { useTenantStore } from '../stores/tenant.store';
import { useConfigStore } from '../stores/config.store';

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcStrength(pw: string): { bars: number; label: string; color: string } {
  let s = 0;
  if (pw.length >= 6)          s++;
  if (pw.length >= 10)         s++;
  if (/[A-Z]/.test(pw))        s++;
  if (/[0-9]/.test(pw))        s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const lvl = [
    { bars: 1, label: 'Zaif',     color: '#ef4444' },
    { bars: 1, label: 'Zaif',     color: '#f97316' },
    { bars: 2, label: "O'rtacha", color: '#eab308' },
    { bars: 3, label: 'Yaxshi',   color: '#22c55e' },
    { bars: 4, label: "A'lo",     color: '#10b981' },
  ];
  return { ...lvl[Math.min(s, 4)], bars: Math.min(s + 1, 5) };
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function fmt2(n: number) { return n.toString().padStart(2, '0'); }

type Step = 1 | 'google-pw' | 2 | 3;

// ── Icons ─────────────────────────────────────────────────────────────────────

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

// Parol input: ko'z tugmasi + to'g'ri autocomplete
function PwInput({
  value, onChange, placeholder, className = '', autoComplete = 'new-password',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="reg-pw-input-wrap">
      <input
        className={`reg-input reg-input--pw ${className}`}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        name={autoComplete}
      />
      <button
        type="button"
        className="reg-pw-eye"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
        aria-label={show ? "Parolni yashirish" : "Parolni ko'rsatish"}
      >
        <EyeIcon open={show} />
      </button>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Register() {
  const navigate      = useNavigate();
  const setDirectAuth = useAuthStore((s) => s.setDirectAuth);
  const setTenantId   = useTenantStore((s) => s.setTenantId);
  const tenantId      = useTenantStore((s) => s.tenantId);

  const [step,    setStep]    = useState<Step>(1);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  // Email form
  const [email,        setEmail]        = useState('');
  const [pw,           setPw]           = useState('');
  const [conf,         setConf]         = useState('');
  const [emailBlurred, setEmailBlurred] = useState(false);
  const [confBlurred,  setConfBlurred]  = useState(false);

  // Google flow
  const [googleToken,     setGoogleToken]     = useState('');
  const [googleEmail,     setGoogleEmail]     = useState('');
  const [googleFirstName, setGoogleFirstName] = useState('');
  const [googlePw,        setGooglePw]        = useState('');
  const [googleConf,      setGoogleConf]      = useState('');
  const [googleConfBlur,  setGoogleConfBlur]  = useState(false);

  // Email OTP
  const [otp,        setOtp]        = useState<string[]>(Array(6).fill(''));
  const [otpErr,     setOtpErr]     = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [timerSecs,  setTimerSecs]  = useState(300);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpRefs  = useRef<Array<HTMLInputElement | null>>(Array(6).fill(null));

  const emailOk       = emailRe.test(email);
  const emailHint     = emailBlurred && email && !emailOk ? "Email formati noto'g'ri" : '';
  const confHint      = confBlurred && conf && conf !== pw ? 'Parollar mos kelmadi' : '';
  const confOk        = conf !== '' && conf === pw;
  const strength      = pw.length > 0 ? calcStrength(pw) : null;

  const googlePwStrength = googlePw.length > 0 ? calcStrength(googlePw) : null;
  const googleConfHint   = googleConfBlur && googleConf && googleConf !== googlePw ? 'Parollar mos kelmadi' : '';
  const googleConfOk     = googleConf !== '' && googleConf === googlePw;

  const timerMin    = Math.floor(timerSecs / 60);
  const timerSec    = timerSecs % 60;
  const timerUrgent = timerSecs <= 60 && timerSecs > 0;
  const dotStep     = step === 1 ? 1 : step === 'google-pw' ? 1 : step === 2 ? 2 : 3;

  useEffect(() => {
    if (step !== 2) return;
    setTimerSecs(300);
    timerRef.current = setInterval(() => {
      setTimerSecs((p) => { if (p <= 1) { clearInterval(timerRef.current!); return 0; } return p - 1; });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  useEffect(() => {
    if (step === 2) setTimeout(() => otpRefs.current[0]?.focus(), 120);
  }, [step]);

  // ── Google OAuth ──────────────────────────────────────────────────────────

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError('');
      try {
        const res = await globalThis.fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const info = await res.json() as { sub: string; email?: string; given_name?: string };
        setGoogleToken(tokenResponse.access_token);
        setGoogleEmail(info.email ?? '');
        setGoogleFirstName(info.given_name ?? '');
        setGooglePw('');
        setGoogleConf('');
        setGoogleConfBlur(false);
        setError('');
        setStep('google-pw');
      } catch {
        setError("Google ma'lumotlarini olishda xatolik yuz berdi");
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError("Google login bekor qilindi yoki xatolik yuz berdi"),
    flow: 'implicit',
  });

  const handleGoogleSetPassword = async () => {
    if (googlePw.length < 6)    { setError("Parol kamida 6 ta belgi bo'lishi kerak"); return; }
    if (googlePw !== googleConf) { setError('Parollar mos kelmadi'); return; }
    setError('');
    setLoading(true);
    try {
      const r = await registerTenant({
        googleToken: googleToken,
        email:       googleEmail,
        firstName:   googleFirstName,
        password:    googlePw,
      });
      localStorage.setItem('crm_accessToken',  r.accessToken);
      localStorage.setItem('crm_refreshToken', r.refreshToken);
      setDirectAuth(r.accessToken);
      setTenantId(r.tenantId);

      if (r.isExistingUser) {
        await useConfigStore.getState().fetchConfig(r.tenantId);
        navigate('/dashboard');
        return;
      }
      setStep(3);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : "Ro'yxatdan o'tishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  // ── Email OTP ─────────────────────────────────────────────────────────────

  const handleSendOtp = async () => {
    setError('');
    if (!emailOk)       { setError("Email formati noto'g'ri"); return; }
    if (pw.length < 6)  { setError("Parol kamida 6 ta belgi bo'lishi kerak"); return; }
    if (pw !== conf)    { setError('Parollar mos kelmadi'); return; }
    setLoading(true);
    try {
      await sendEmailOtp(email);
      setOtpErr('');
      setOtp(Array(6).fill(''));  // har doim bo'sh — foydalanuvchi o'zi kiritadi
      setStep(2);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'OTP yuborishda xatolik. API ishlamasligi mumkin.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOtp = () => {
    const code = otp.join('');
    if (code.length === 6) handleVerify(code);
  };

  const doEmailRegister = async () => {
    try {
      const r = await registerTenant({ email: email.trim(), password: pw });
      localStorage.setItem('crm_accessToken',  r.accessToken);
      localStorage.setItem('crm_refreshToken', r.refreshToken);
      setDirectAuth(r.accessToken);
      setTenantId(r.tenantId);
      setStep(3);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg    = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (status === 409) {
        setOtpErr(typeof msg === 'string' ? msg : "Bu email allaqachon ro'yxatdan o'tilgan.");
        setTimeout(() => navigate('/'), 2500);
        return;
      }
      setOtpErr(typeof msg === 'string' ? msg : "Ro'yxatdan o'tishda xatolik");
    }
  };

  const handleVerify = async (code: string) => {
    setOtpLoading(true);
    setOtpErr('');
    try {
      const res = await verifyOtp(email, code);
      if (res.valid) {
        await doEmailRegister();
      } else {
        const left = res.attemptsLeft;
        setOtpErr(left > 0
          ? `Noto'g'ri kod. ${left} ta urinish qoldi`
          : 'Urinishlar tugadi. Yangi kod oling');
        setOtp(Array(6).fill(''));
        setTimeout(() => otpRefs.current[0]?.focus(), 50);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setOtpErr(typeof msg === 'string' ? msg : 'Tekshirishda xatolik yuz berdi');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next  = [...otp];
    next[idx]   = digit;
    setOtp(next);
    setOtpErr('');
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
    if (next.every((d) => d !== '') && digit) handleVerify(next.join(''));
  };

  const handleOtpKey = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  };

  const handleOtpPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!digits) return;
    const next = [...otp];
    for (let i = 0; i < digits.length; i++) next[i] = digits[i];
    setOtp(next);
    otpRefs.current[Math.min(digits.length, 5)]?.focus();
    if (digits.length === 6) handleVerify(digits);
  };

  const handleResend = async () => {
    setOtpErr('');
    setLoading(true);
    try {
      await sendEmailOtp(email);
      setOtp(Array(6).fill(''));
      setTimerSecs(300);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimerSecs((p) => { if (p <= 1) { clearInterval(timerRef.current!); return 0; } return p - 1; });
      }, 1000);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch {
      setOtpErr('Qayta yuborishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="reg-bg">
      <div className="reg-glow-1" />
      <div className="reg-glow-2" />
      <div className="reg-glow-3" />

      <div className="reg-scroll">
        <div className="reg-card">

          {/* Brand */}
          <div className="reg-brand-row">
            <div className="reg-logo-glow">XM</div>
            <div>
              <h1 className="reg-h1">XM Assistant</h1>
              <p className="reg-sub">Biznesingizni boshlang</p>
            </div>
          </div>

          {/* Progress dots */}
          <div className="reg-progress">
            {([1, 2, 3] as const).map((i) => (
              <div
                key={i}
                className={
                  'reg-dot' +
                  (dotStep === i ? ' reg-dot--active' : '') +
                  (dotStep > i  ? ' reg-dot--done'   : '')
                }
              />
            ))}
          </div>

          {/* ════ STEP 1 — Asosiy forma ════ */}
          {step === 1 && (
            <div className="reg-step">
              <h2 className="reg-step-title">Hisob yaratish</h2>

              {error && <div className="reg-error">{error}</div>}

              {/* Google — to'g'ridan-to'g'ri popup, email/parol shart emas */}
              <button
                type="button"
                className="reg-google-btn"
                onClick={() => { setError(''); googleLogin(); }}
                disabled={loading}
              >
                <GoogleIcon />
                {loading ? 'Yuklanmoqda...' : 'Google orqali davom etish'}
              </button>

              <div className="auth-divider"><span>yoki email bilan</span></div>

              {/* Email */}
              <div className="reg-field">
                <label className="reg-label">Email *</label>
                <div className="reg-input-wrap">
                  <Mail size={16} className="reg-icon" />
                  <input
                    className={`reg-input${emailHint ? ' reg-input--err' : ''}`}
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmailBlurred(true)}
                    placeholder="email@example.com"
                    autoFocus
                  />
                </div>
                {emailHint && <span className="reg-hint-err">{emailHint}</span>}
              </div>

              {/* Parol — ko'z icon bilan */}
              <div className="reg-field">
                <label className="reg-label">Parol *</label>
                <PwInput
                  value={pw}
                  onChange={setPw}
                  placeholder="Kamida 6 ta belgi"
                />
                {strength && (
                  <div className="reg-pw-wrap">
                    <div className="reg-pw-bar">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="reg-pw-seg"
                          style={{ background: i <= strength.bars ? strength.color : 'rgba(255,255,255,0.1)' }} />
                      ))}
                    </div>
                    <span className="reg-pw-label" style={{ color: strength.color }}>{strength.label}</span>
                  </div>
                )}
              </div>

              {/* Parolni tasdiqlash — ko'z icon bilan */}
              <div className="reg-field">
                <label className="reg-label">Parolni tasdiqlang *</label>
                <PwInput
                  value={conf}
                  onChange={(v) => { setConf(v); setConfBlurred(true); }}
                  placeholder="Parolni qayta kiriting"
                  className={confHint ? 'reg-input--err' : ''}
                />
                {confHint && <span className="reg-hint-err">{confHint}</span>}
                {confOk   && <span className="reg-hint-ok">✓ Parollar mos</span>}
              </div>

              <button className="reg-glow-btn" onClick={handleSendOtp} disabled={loading}>
                {loading ? 'Yuborilmoqda...' : 'Kod yuborish'}
              </button>

              <p className="reg-link-row">
                Hisobingiz bormi? <Link to="/">Kirish →</Link>
              </p>
            </div>
          )}

          {/* ════ GOOGLE-PW — Parol o'rnatish ════ */}
          {step === 'google-pw' && (
            <div className="reg-step">
              {/* Google foydalanuvchi kartasi */}
              <div className="reg-google-user-card">
                <div className="reg-google-user-avatar">
                  {googleFirstName ? googleFirstName[0].toUpperCase() : 'G'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                    {googleFirstName || 'Google foydalanuvchi'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.1rem' }}>
                    {googleEmail}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </div>
              </div>

              <div>
                <h2 className="reg-step-title" style={{ marginBottom: '0.2rem' }}>Parol o'rnating</h2>
                <p className="reg-step-sub">
                  XM Assistant uchun shaxsiy parol belgilang.<br/>
                  Keyingi safar email bilan ham kirishingiz mumkin.
                </p>
              </div>

              {error && <div className="reg-error">{error}</div>}

              {/* Parol — ko'z icon bilan */}
              <div className="reg-field">
                <label className="reg-label">Parol *</label>
                <PwInput
                  value={googlePw}
                  onChange={setGooglePw}
                  placeholder="Kamida 6 ta belgi"
                />
                {googlePwStrength && (
                  <div className="reg-pw-wrap">
                    <div className="reg-pw-bar">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="reg-pw-seg"
                          style={{ background: i <= googlePwStrength.bars ? googlePwStrength.color : 'rgba(255,255,255,0.1)' }} />
                      ))}
                    </div>
                    <span className="reg-pw-label" style={{ color: googlePwStrength.color }}>{googlePwStrength.label}</span>
                  </div>
                )}
              </div>

              {/* Tasdiqlash — ko'z icon bilan */}
              <div className="reg-field">
                <label className="reg-label">Parolni tasdiqlang *</label>
                <PwInput
                  value={googleConf}
                  onChange={(v) => { setGoogleConf(v); setGoogleConfBlur(true); }}
                  placeholder="Parolni qayta kiriting"
                  className={googleConfHint ? 'reg-input--err' : ''}
                />
                {googleConfHint && <span className="reg-hint-err">{googleConfHint}</span>}
                {googleConfOk   && <span className="reg-hint-ok">✓ Parollar mos</span>}
              </div>

              <button
                className="reg-glow-btn"
                onClick={handleGoogleSetPassword}
                disabled={loading || googlePw.length < 6 || googlePw !== googleConf}
              >
                {loading ? 'Yuklanmoqda...' : 'Davom etish'}
              </button>

              <button
                className="reg-back-btn"
                onClick={() => { setStep(1); setError(''); setGoogleToken(''); }}
              >
                ← Orqaga
              </button>
            </div>
          )}

          {/* ════ STEP 2 — Email OTP ════ */}
          {step === 2 && (
            <div className="reg-step">
              <h2 className="reg-step-title">Kodni tasdiqlang</h2>
              <p className="reg-step-sub"><Mail size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Emailga 6 xonali kod yuborildi</p>
              <p className="reg-email-badge">{email}</p>

              <div className="reg-otp-grid">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    className={`reg-otp-box${digit ? ' reg-otp-box--filled' : ''}${otpErr ? ' reg-otp-box--error' : ''}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKey(i, e)}
                    onPaste={i === 0 ? handleOtpPaste : undefined}
                    disabled={otpLoading}
                    autoComplete="one-time-code"
                  />
                ))}
              </div>

              {otpErr && <div className="reg-error" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 6 }}><XCircle size={14} />{otpErr}</div>}

              {otpLoading && (
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                  Tekshirilmoqda...
                </p>
              )}

              {/* Tasdiqlash tugmasi */}
              <button
                className="reg-glow-btn"
                onClick={handleSubmitOtp}
                disabled={otpLoading || otp.some((d) => !d)}
              >
                {otpLoading ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
              </button>

              {timerSecs > 0 ? (
                <p className={`reg-timer${timerUrgent ? ' reg-timer--urgent' : ''}`}>
                  <Clock size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Kod amal qiladi: {fmt2(timerMin)}:{fmt2(timerSec)}
                </p>
              ) : (
                <button className="reg-resend-btn" onClick={handleResend} disabled={loading}>
                  {loading ? 'Yuborilmoqda...' : <><RefreshCw size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Qayta yuborish</>}
                </button>
              )}

              <button
                className="reg-back-btn"
                onClick={() => { setStep(1); setOtpErr(''); setError(''); }}
              >
                ← Orqaga
              </button>
            </div>
          )}

          {/* ════ STEP 3 — Muvaffaqiyat ════ */}
          {step === 3 && (
            <div className="reg-step" style={{ alignItems: 'center', textAlign: 'center', padding: '1rem 0' }}>
              <CheckCircle size={56} color="#10b981" style={{ marginBottom: '0.5rem' }} />
              <h2 className="reg-step-title" style={{ fontSize: '1.3rem' }}>Hisob yaratildi!</h2>
              <p className="reg-step-sub" style={{ marginBottom: '1.5rem' }}>Endi CRM ingizni sozlang</p>
              <button className="reg-glow-btn" onClick={() => navigate(`/wizard/${tenantId}`)}>
                Boshlash →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
