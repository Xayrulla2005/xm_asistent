import { useState } from 'react';
import { reportBug } from '../utils/bugReporter';

export default function BugReportButton() {
  const [open,    setOpen]    = useState(false);
  const [text,    setText]    = useState('');
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    if (!text.trim()) return;
    setLoading(true);
    reportBug(
      { message: text.trim() },
      'Foydalanuvchi xabari',
      { type: 'user_report', url: window.location.pathname },
    );
    setLoading(false);
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setText('');
      setOpen(false);
    }, 2000);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Muammoni xabar qilish"
        style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem',
          width: 40, height: 40, borderRadius: '50%',
          background: 'var(--primary, #2563eb)', color: '#fff',
          border: 'none', cursor: 'pointer', fontSize: '1.1rem',
          fontWeight: 700, boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1,
        }}
      >
        ?
      </button>

      {open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1001,
          }}
        >
          <div style={{
            background: 'var(--bg, #fff)', borderRadius: 10, padding: '1.5rem',
            width: 400, maxWidth: '92vw',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}>
            <h3 style={{ margin: '0 0 0.75rem', color: 'var(--text, #111)', fontSize: '1rem' }}>
              Muammoni xabar qilish
            </h3>

            {sent ? (
              <p style={{ color: '#16a34a', textAlign: 'center', padding: '1.25rem 0', margin: 0 }}>
                ✓ Xabar yuborildi. Rahmat!
              </p>
            ) : (
              <>
                <textarea
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Muammoni tasvirlab bering…"
                  rows={4}
                  style={{
                    width: '100%', boxSizing: 'border-box', resize: 'vertical',
                    padding: '0.5rem 0.75rem', borderRadius: 6,
                    border: '1px solid var(--border, #e5e7eb)',
                    background: 'var(--input-bg, #f9fafb)',
                    color: 'var(--text, #111)', fontSize: '0.875rem',
                    fontFamily: 'inherit',
                  }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setOpen(false)}
                    style={{
                      padding: '0.4rem 1rem', borderRadius: 6,
                      border: '1px solid var(--border, #e5e7eb)',
                      background: 'transparent', cursor: 'pointer',
                      color: 'var(--text, #111)', fontSize: '0.875rem',
                    }}
                  >
                    Bekor qilish
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !text.trim()}
                    style={{
                      padding: '0.4rem 1rem', borderRadius: 6, border: 'none',
                      background: 'var(--primary, #2563eb)', color: '#fff',
                      cursor: loading || !text.trim() ? 'not-allowed' : 'pointer',
                      opacity: loading || !text.trim() ? 0.6 : 1,
                      fontSize: '0.875rem',
                    }}
                  >
                    {loading ? 'Yuborilmoqda…' : 'Yuborish'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
