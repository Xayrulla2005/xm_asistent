import { useEffect, useRef, useState } from 'react';
import { X, RefreshCw, DollarSign, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import {
  EduPayment, PaymentStats,
  getPayments, getPaymentStats, generatePayments, recordPayment,
} from '../../api/education.api';
import { useToastStore } from '../../stores/toast.store';

const thisMonth = () => new Date().toISOString().slice(0, 7);

const STATUS_META: Record<string, { label: string; color: string }> = {
  paid:    { label: "To'landi",  color: '#10b981' },
  partial: { label: 'Qisman',    color: '#f59e0b' },
  pending: { label: 'Kutilmoqda', color: '#6366f1' },
  overdue: { label: 'Muddati o\'tgan', color: '#ef4444' },
};

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));

export default function Payments() {
  const addToast = useToastStore((s) => s.toast);
  const [month,    setMonth]    = useState(thisMonth());
  const [list,     setList]     = useState<EduPayment[]>([]);
  const [stats,    setStats]    = useState<PaymentStats | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [payModal, setPayModal] = useState<EduPayment | null>(null);
  const [genLoading, setGenLoading] = useState(false);

  // pay form
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('naqd');
  const [payNotes,  setPayNotes]  = useState('');
  const [paying,    setPaying]    = useState(false);

  const amountRef = useRef<HTMLInputElement>(null);

  const load = async (m: string) => {
    setLoading(true);
    try {
      const [ps, st] = await Promise.all([getPayments(m), getPaymentStats(m)]);
      setList(ps); setStats(st);
    } catch { addToast('Yuklab bo\'lmadi'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(month); }, [month]);

  const handleGenerate = async () => {
    setGenLoading(true);
    try {
      const res = await generatePayments(month);
      addToast(`${res.created} ta yangi to'lov yaratildi (${res.skipped} ta mavjud)`, 'success');
      load(month);
    } catch { addToast('Xatolik'); }
    finally { setGenLoading(false); }
  };

  const openPay = (p: EduPayment) => {
    const remaining = p.amount - p.paidAmount;
    setPayAmount(String(remaining > 0 ? remaining : p.amount));
    setPayMethod('naqd'); setPayNotes('');
    setPayModal(p);
    setTimeout(() => amountRef.current?.focus(), 80);
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModal) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) { addToast("Summa kiriting"); return; }
    setPaying(true);
    try {
      const updated = await recordPayment(payModal.id, amount, payMethod, payNotes || undefined);
      setList((prev) => prev.map((p) => p.id === updated.id ? updated : p));
      if (stats) {
        const ps = await getPaymentStats(month);
        setStats(ps);
      }
      addToast("To'lov qabul qilindi", 'success');
      setPayModal(null);
    } catch { addToast('Xatolik'); }
    finally { setPaying(false); }
  };

  const statCards = stats ? [
    { label: "Jami to'lov",     value: fmt(stats.total) + ' so\'m', icon: DollarSign,    color: '#6366f1' },
    { label: "To'langan",       value: fmt(stats.paid)  + ' so\'m', icon: CheckCircle2, color: '#10b981' },
    { label: 'Qolgan',          value: fmt(stats.pending) + ' so\'m', icon: AlertCircle, color: '#ef4444' },
    { label: "To'lagan talabalar", value: `${stats.paidCount} / ${stats.count}`, icon: Clock, color: '#f59e0b' },
  ] : [];

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Oylik to'lovlar</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ maxWidth: 160 }} />
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            onClick={handleGenerate} disabled={genLoading}>
            <RefreshCw size={13} />{genLoading ? 'Yaratilmoqda...' : 'Yaratish'}
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {statCards.map((s) => (
            <div key={s.label} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={17} style={{ color: s.color }} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {stats && stats.total > 0 && (
        <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Yig'im progressi</span>
            <span style={{ fontWeight: 600 }}>{Math.round((stats.paid / stats.total) * 100)}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, background: '#10b981', width: `${Math.min(100, (stats.paid / stats.total) * 100)}%`, transition: 'width 0.4s' }} />
          </div>
        </div>
      )}

      {loading ? <p className="state-msg">Yuklanmoqda...</p>
       : list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <p style={{ marginBottom: '0.75rem' }}>Ushbu oy uchun to'lovlar topilmadi</p>
          <button className="btn-primary" onClick={handleGenerate} disabled={genLoading}>
            {genLoading ? 'Yaratilmoqda...' : "To'lovlarni yaratish"}
          </button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Talaba</th>
                <th>Kurs</th>
                <th style={{ textAlign: 'right' }}>Summa</th>
                <th style={{ textAlign: 'right' }}>To'langan</th>
                <th style={{ textAlign: 'right' }}>Qolgan</th>
                <th>Holat</th>
                <th>Usul</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const st = STATUS_META[p.status] ?? STATUS_META.pending;
                const remaining = p.amount - p.paidAmount;
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.studentName}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{p.courseName || '—'}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.amount)}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#10b981', fontWeight: 600 }}>{fmt(p.paidAmount)}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: remaining > 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: remaining > 0 ? 600 : 400 }}>
                      {remaining > 0 ? fmt(remaining) : '0'}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.74rem', fontWeight: 600, color: st.color, background: st.color + '18', padding: '0.2rem 0.5rem', borderRadius: 10, whiteSpace: 'nowrap' }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.paymentMethod || '—'}</td>
                    <td>
                      {p.status !== 'paid' && (
                        <button className="btn-primary" style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem' }} onClick={() => openPay(p)}>
                          To'lash
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pay modal */}
      {payModal && (
        <div className="modal-overlay" onClick={() => setPayModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h3>To'lov qabul qilish</h3>
              <button onClick={() => setPayModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handlePay} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '0.75rem', fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{payModal.studentName}</div>
                <div style={{ color: 'var(--text-muted)' }}>{payModal.courseName} — {payModal.month}</div>
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Jami: <strong>{fmt(payModal.amount)}</strong></span>
                  <span>To'langan: <strong style={{ color: '#10b981' }}>{fmt(payModal.paidAmount)}</strong></span>
                  <span>Qolgan: <strong style={{ color: '#ef4444' }}>{fmt(payModal.amount - payModal.paidAmount)}</strong></span>
                </div>
              </div>

              <div className="field">
                <label>Summa (so'm) *</label>
                <input ref={amountRef} type="number" required min={1} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
              </div>
              <div className="field">
                <label>To'lov usuli</label>
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  <option value="naqd">Naqd</option>
                  <option value="karta">Karta</option>
                  <option value="transfer">Bank transfer</option>
                  <option value="click">Click/Payme</option>
                </select>
              </div>
              <div className="field">
                <label>Izoh</label>
                <input type="text" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Ixtiyoriy izoh..." />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn-secondary" onClick={() => setPayModal(null)}>Bekor</button>
                <button type="submit" className="btn-primary" disabled={paying}>{paying ? 'Saqlanmoqda...' : 'Tasdiqlash'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
