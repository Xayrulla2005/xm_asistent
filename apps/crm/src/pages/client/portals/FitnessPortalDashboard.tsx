import { useEffect, useState } from 'react';
import {
  GymMembershipData, GymPlanData,
  getGymMembership, getPublicGymPlans,
} from '../../../api/client-portal.api';

const STATUS_COLOR: Record<string, string> = {
  active:    '#10b981',
  expired:   '#ef4444',
  frozen:    '#3b82f6',
  cancelled: '#6b7280',
};

const STATUS_LABEL: Record<string, string> = {
  active:    'Faol',
  expired:   'Muddati tugagan',
  frozen:    "Muzlatilgan",
  cancelled: 'Bekor',
};

const fmt     = (n: number) => Number(n).toLocaleString('uz-UZ') + " so'm";
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (d: string) => new Date(d).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

interface Props {
  token:  string;
  slug:   string;
  color:  string;
}

export default function FitnessPortalDashboard({ token, slug, color }: Props) {
  const [data,     setData]     = useState<GymMembershipData | null>(null);
  const [plans,    setPlans]    = useState<GymPlanData[]>([]);
  const [tab,      setTab]      = useState<'membership' | 'checkins' | 'plans'>('membership');
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      getGymMembership(token),
      getPublicGymPlans(slug),
    ])
      .then(([m, p]) => { setData(m); setPlans(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, slug]);

  if (loading) {
    return <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '2rem' }}>Yuklanmoqda...</div>;
  }

  const { member, recentCheckins, plan } = data ?? { member: null, recentCheckins: [], plan: null };

  // Days remaining
  let daysLeft: number | null = null;
  if (member?.expiresAt) {
    daysLeft = Math.ceil((new Date(member.expiresAt).getTime() - Date.now()) / 86_400_000);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Tab nav */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
        {([['membership', "A'zolik"], ['checkins', 'Tashrif tarixi'], ['plans', 'Rejalari']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '0.4rem 0.9rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.82rem',
              background: tab === key ? color : 'rgba(255,255,255,0.06)',
              color: tab === key ? '#fff' : 'rgba(255,255,255,0.55)',
              fontWeight: tab === key ? 600 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Membership tab */}
      {tab === 'membership' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {!member ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', padding: '2.5rem', fontSize: '0.9rem' }}>
              Siz hali gym a'zosi sifatida ro'yxatdan o'tmagansiz.
            </div>
          ) : (
            <>
              {/* Member card */}
              <div style={{
                borderRadius: 14, padding: '1.25rem',
                background: `linear-gradient(135deg, ${color}30, ${color}10)`,
                border: `1px solid ${color}40`,
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: color, marginBottom: '0.75rem' }}>
                  A'ZOLIK KARTASI
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 4 }}>
                  {member.firstName} {member.lastName}
                </div>
                {member.phone && (
                  <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>{member.phone}</div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.07em' }}>HOLAT</div>
                    <span style={{
                      fontSize: '0.8rem', fontWeight: 700, padding: '0.15rem 0.6rem', borderRadius: 99,
                      background: (STATUS_COLOR[member.status] ?? '#6b7280') + '25',
                      color: STATUS_COLOR[member.status] ?? '#6b7280',
                    }}>
                      {STATUS_LABEL[member.status] ?? member.status}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.07em' }}>REJA</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{member.planName ?? '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.07em' }}>KIRISH SONI</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color }}>{member.totalCheckins}</div>
                  </div>
                </div>
              </div>

              {/* Validity */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <InfoBox label="A'zolik boshlanishi" value={fmtDate(member.joinedAt)} color={color} />
                <InfoBox label="A'zolik tugashi" value={fmtDate(member.expiresAt)} color={color} />
              </div>

              {daysLeft !== null && (
                <div style={{
                  padding: '0.75rem 1rem', borderRadius: 10, border: `1px solid ${daysLeft <= 7 ? '#ef4444' : color}40`,
                  background: daysLeft <= 7 ? 'rgba(239,68,68,0.08)' : `${color}10`,
                  fontSize: '0.85rem', textAlign: 'center',
                }}>
                  {daysLeft > 0
                    ? <><span style={{ fontWeight: 700, color: daysLeft <= 7 ? '#ef4444' : color }}>{daysLeft} kun</span> qoldi</>
                    : <span style={{ color: '#ef4444', fontWeight: 600 }}>A'zolik muddati tugagan</span>
                  }
                </div>
              )}

              {member.notes && (
                <div style={{
                  padding: '0.75rem 1rem', borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)', fontStyle: 'italic',
                }}>
                  {member.notes}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Checkins tab */}
      {tab === 'checkins' && (
        <div>
          {recentCheckins.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', padding: '2rem', fontSize: '0.9rem' }}>
              Hali tashrif yo'q
            </div>
          ) : (
            recentCheckins.map((c) => (
              <div key={c.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.65rem 0.9rem', borderRadius: 8, marginBottom: '0.4rem',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                    {new Date(c.checkedAt).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' })}
                  </div>
                  {c.note && <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{c.note}</div>}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>
                  {fmtTime(c.checkedAt)}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Plans tab */}
      {tab === 'plans' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {plans.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', padding: '2rem', fontSize: '0.9rem' }}>
              Rejalari hali qo'shilmagan
            </div>
          ) : (
            plans.map((p) => {
              const isActive = plan?.id === p.id;
              return (
                <div key={p.id} style={{
                  borderRadius: 12, padding: '0.9rem 1.1rem',
                  border: `1px solid ${isActive ? color : 'rgba(255,255,255,0.1)'}`,
                  background: isActive ? `${color}12` : 'rgba(255,255,255,0.04)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isActive ? color : undefined }}>
                        {p.name}
                        {isActive && <span style={{ fontSize: '0.68rem', marginLeft: '0.5rem', opacity: 0.7 }}>(sizning reja)</span>}
                      </div>
                      {p.description && (
                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>{p.description}</div>
                      )}
                      <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                        {p.durationDays} kun
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, color, fontSize: '1rem', whiteSpace: 'nowrap', marginLeft: '1rem' }}>
                      {fmt(p.price)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function InfoBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: '0.7rem 0.9rem', borderRadius: 10,
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontWeight: 600, fontSize: '0.88rem', color }}>{value}</div>
    </div>
  );
}
