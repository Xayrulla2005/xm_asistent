import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFeaturesStore } from '../stores/features.store';

const PLAN_LABELS: Record<string, string> = {
  STARTER: 'Starter',
  PRO:     'Pro',
};

interface Props {
  feature:      string;
  requiredPlan: 'STARTER' | 'PRO';
  compact?:     boolean;
  description?: string;
}

export default function UpgradeBanner({ requiredPlan, compact, description }: Props) {
  const navigate = useNavigate();
  const flags = useFeaturesStore((s) => s.flags);
  const planLabel = PLAN_LABELS[requiredPlan] ?? requiredPlan;

  if (compact) {
    return (
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 10, padding: '0.7rem 1rem',
        }}
      >
        <Lock size={15} style={{ color: '#6366f1', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {description ?? `Bu xususiyat ${planLabel} tarifida mavjud`}
        </span>
        <button
          className="btn-primary"
          style={{ padding: '0.3rem 0.85rem', fontSize: '0.78rem', flexShrink: 0 }}
          onClick={() => navigate('/subscription')}
        >
          {planLabel} ga o'tish
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '3rem 1.5rem', textAlign: 'center',
        gap: '1rem',
      }}
    >
      <div
        style={{
          width: 52, height: 52, borderRadius: 14,
          background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Lock size={22} style={{ color: '#6366f1' }} />
      </div>

      <div>
        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.4rem' }}>
          {planLabel} tarifi kerak
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: 320, lineHeight: 1.6 }}>
          {description ?? `Bu xususiyat faqat ${planLabel} va undan yuqori tarif uchun mavjud.`}
        </div>
        {flags && (
          <div
            style={{
              display: 'inline-block', marginTop: '0.5rem',
              background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.2)',
              borderRadius: 6, padding: '0.2rem 0.65rem',
              fontSize: '0.72rem', color: 'var(--text-muted)',
            }}
          >
            Joriy tarif: Trial
          </div>
        )}
      </div>

      <button
        className="btn-primary"
        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        onClick={() => navigate('/subscription')}
      >
        {planLabel} ga o'tish →
      </button>
    </div>
  );
}
