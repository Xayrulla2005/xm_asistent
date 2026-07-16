import { useEffect, useRef, useState } from 'react';
import { reportBug } from '../utils/bugReporter';

const MODULES = ['POS', 'Mijozlar', 'Mahsulotlar', 'Hisobotlar', 'Xodimlar', 'Billing', 'Dashboard', 'Boshqa'];

const PRIORITIES = [
  { value: 'P1', label: 'Tizim ishlamayapti', color: '#ef4444' },
  { value: 'P2', label: 'Muhim xato',         color: '#f59e0b' },
  { value: 'P3', label: 'Kichik muammo',       color: '#3b82f6' },
];

export default function BugReportButton() {
  const [open,     setOpen]     = useState(false);
  const [title,    setTitle]    = useState('');
  const [desc,     setDesc]     = useState('');
  const [module,   setModule]   = useState('');
  const [priority, setPriority] = useState('P3');
  const [sent,     setSent]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [titleErr, setTitleErr] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Focus title on open
  useEffect(() => {
    if (open) setTimeout(() => titleRef.current?.focus(), 50);
  }, [open]);

  const setClose = () => {
    setOpen(false);
    setTitle('');
    setDesc('');
    setModule('');
    setPriority('P3');
    setSent(false);
    setTitleErr(false);
  };

  const handleSubmit = () => {
    if (!title.trim()) { setTitleErr(true); titleRef.current?.focus(); return; }
    setLoading(true);
    reportBug(
      { message: title.trim(), stack: undefined },
      undefined,
      {
        type:          'user_report',
        url:           window.location.pathname,
        title:         title.trim(),
        description:   desc.trim() || undefined,
        moduleAffected:module       || undefined,
        priority,
        source:        'frontend',
      },
    );
    setLoading(false);
    setSent(true);
    setTimeout(() => setClose(), 2500);
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        title="Muammoni xabar qilish"
        aria-label="Xato bildirish"
        style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem',
          width: 42, height: 42, borderRadius: '50%',
          background: 'var(--primary, #2563eb)', color: '#fff',
          border: 'none', cursor: 'pointer',
          boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.15rem', lineHeight: 1,
        }}
      >
        ?
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bug-modal-title"
          onClick={(e) => { if (e.target === e.currentTarget) setClose(); }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1001, padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'var(--card-bg, #fff)', borderRadius: 12,
              padding: '1.5rem', width: '100%', maxWidth: 460,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 id="bug-modal-title" style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text, #111)' }}>
                Muammo haqida xabar
              </h3>
              <button
                onClick={setClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--text-muted, #6b7280)', lineHeight: 1, padding: '0 0.25rem' }}
              >
                ×
              </button>
            </div>

            {sent ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
                <p style={{ color: '#16a34a', margin: 0, fontWeight: 600 }}>
                  Xabaringiz qabul qilindi!
                </p>
                <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: '0.82rem', margin: '0.4rem 0 0' }}>
                  Tez orada ko'rib chiqamiz.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>

                {/* Title — required */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text, #111)', marginBottom: '0.3rem' }}>
                    Nima bo'ldi? <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    ref={titleRef}
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setTitleErr(false); }}
                    placeholder="Masalan: Sotuv saqlanmayapti"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '0.45rem 0.65rem', borderRadius: 7,
                      border: `1px solid ${titleErr ? '#ef4444' : 'var(--border, #e5e7eb)'}`,
                      background: 'var(--input-bg, #f9fafb)',
                      color: 'var(--text, #111)', fontSize: '0.875rem', fontFamily: 'inherit',
                    }}
                  />
                  {titleErr && (
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#ef4444' }}>
                      Sarlavha kiritish majburiy
                    </p>
                  )}
                </div>

                {/* Module */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text, #111)', marginBottom: '0.3rem' }}>
                    Qaysi bo'limda?
                  </label>
                  <select
                    value={module}
                    onChange={(e) => setModule(e.target.value)}
                    style={{
                      width: '100%', padding: '0.45rem 0.65rem', borderRadius: 7,
                      border: '1px solid var(--border, #e5e7eb)',
                      background: 'var(--input-bg, #f9fafb)',
                      color: 'var(--text, #111)', fontSize: '0.875rem', fontFamily: 'inherit',
                    }}
                  >
                    <option value="">-- Tanlang (ixtiyoriy) --</option>
                    {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text, #111)', marginBottom: '0.4rem' }}>
                    Muhimlik darajasi
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {PRIORITIES.map((p) => (
                      <label key={p.value} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          type="radio"
                          name="priority"
                          value={p.value}
                          checked={priority === p.value}
                          onChange={() => setPriority(p.value)}
                          style={{ accentColor: p.color }}
                        />
                        <span style={{ fontWeight: priority === p.value ? 700 : 400, color: priority === p.value ? p.color : 'var(--text, #111)' }}>
                          {p.label}
                        </span>
                        <span style={{
                          marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 700,
                          padding: '0.1rem 0.4rem', borderRadius: 5,
                          background: p.color + '22', color: p.color,
                        }}>
                          {p.value}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text, #111)', marginBottom: '0.3rem' }}>
                    Batafsil (ixtiyoriy)
                  </label>
                  <textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Qachon va qanday vaziyatda yuz berdi? Qanday qadam bosganingizda..."
                    rows={3}
                    style={{
                      width: '100%', boxSizing: 'border-box', resize: 'vertical',
                      padding: '0.45rem 0.65rem', borderRadius: 7,
                      border: '1px solid var(--border, #e5e7eb)',
                      background: 'var(--input-bg, #f9fafb)',
                      color: 'var(--text, #111)', fontSize: '0.875rem', fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                  <button
                    onClick={setClose}
                    style={{
                      padding: '0.45rem 1rem', borderRadius: 7,
                      border: '1px solid var(--border, #e5e7eb)',
                      background: 'transparent', cursor: 'pointer',
                      color: 'var(--text, #111)', fontSize: '0.875rem',
                    }}
                  >
                    Bekor qilish
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{
                      padding: '0.45rem 1.25rem', borderRadius: 7, border: 'none',
                      background: 'var(--primary, #2563eb)', color: '#fff',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.7 : 1, fontSize: '0.875rem', fontWeight: 600,
                    }}
                  >
                    {loading ? 'Yuborilmoqda…' : 'Yuborish'}
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
