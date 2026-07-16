import { FormEvent, useEffect, useState } from 'react';
import {
  ClinicPortalData,
  ClinicAppointmentData,
  ClinicPrescriptionData,
  getClinicData,
  bookClinicAppointment,
} from '../../../api/client-portal.api';

const APPT_STATUS_LABEL: Record<string, string> = {
  scheduled:  'Rejalashtirilgan',
  completed:  'Bajarildi',
  cancelled:  'Bekor',
  no_show:    'Kelmadi',
};

const APPT_STATUS_COLOR: Record<string, string> = {
  scheduled:  '#3b82f6',
  completed:  '#10b981',
  cancelled:  '#ef4444',
  no_show:    '#6b7280',
};

const RX_STATUS_COLOR: Record<string, string> = {
  active:    '#10b981',
  completed: '#6b7280',
  cancelled: '#ef4444',
};

const fmt     = (n: number) => Number(n).toLocaleString('uz-UZ') + " so'm";
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' });

interface Props {
  token: string;
  color: string;
  slug:  string;
}

const TODAY = new Date().toISOString().slice(0, 10);

export default function ClinicPortalDashboard({ token, color, slug }: Props) {
  const [data,    setData]    = useState<ClinicPortalData | null>(null);
  const [tab,     setTab]     = useState<'appointments' | 'book' | 'prescriptions' | 'profile'>('appointments');
  const [loading, setLoading] = useState(true);

  // Booking state
  const [bName,    setBName]    = useState('');
  const [bPhone,   setBPhone]   = useState('');
  const [bDate,    setBDate]    = useState(TODAY);
  const [bTime,    setBTime]    = useState('09:00');
  const [bSpec,    setBSpec]    = useState('');
  const [bNotes,   setBNotes]   = useState('');
  const [bLoading, setBLoading] = useState(false);
  const [bError,   setBError]   = useState('');
  const [bSuccess, setBSuccess] = useState(false);

  useEffect(() => {
    getClinicData(token)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '2rem' }}>
        Yuklanmoqda...
      </div>
    );
  }

  const handleBook = async (e: FormEvent) => {
    e.preventDefault();
    setBError(''); setBSuccess(false); setBLoading(true);
    try {
      await bookClinicAppointment(slug, {
        patientName:  bName,
        patientPhone: bPhone,
        date:         bDate,
        time:         bTime,
        specialty:    bSpec || undefined,
        notes:        bNotes || undefined,
      });
      setBSuccess(true);
      setBName(''); setBPhone(''); setBSpec(''); setBNotes('');
    } catch (err: unknown) {
      setBError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Xatolik yuz berdi');
    } finally {
      setBLoading(false);
    }
  };

  if (!data?.patient) {
    return (
      <div style={{
        textAlign: 'center', color: 'rgba(255,255,255,0.35)', padding: '2.5rem',
        fontSize: '0.9rem',
      }}>
        Siz hali klinika bemorlar ro'yxatida topilmadingiz.
      </div>
    );
  }

  const { patient, appointments, prescriptions } = data;
  const upcoming = appointments.filter((a) => a.status === 'scheduled');
  const past     = appointments.filter((a) => a.status !== 'scheduled');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Tab nav */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
        {([
          ['appointments',  'Qabullar'],
          ['book',          'Navbat olish'],
          ['prescriptions', 'Retseptlar'],
          ['profile',       'Profil'],
        ] as const).map(([key, label]) => (
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

      {/* Navbat olish */}
      {tab === 'book' && (
        <form onSubmit={handleBook} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {bSuccess && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: 10, background: '#10b98120', border: '1px solid #10b98140', color: '#10b981', fontWeight: 600, fontSize: '0.88rem' }}>
              Navbat muvaffaqiyatli olindi. Administratordan tasdiqlash kutilmoqda.
            </div>
          )}
          {bError && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: 10, background: '#ef444420', border: '1px solid #ef444440', color: '#ef4444', fontSize: '0.85rem' }}>
              {bError}
            </div>
          )}
          {[
            { label: 'Ism Familiya', val: bName,  set: setBName,  ph: 'Alisher Karimov', type: 'text', req: true  },
            { label: 'Telefon',      val: bPhone, set: setBPhone, ph: '+998901234567',   type: 'tel',  req: true  },
            { label: 'Mutaxassis',   val: bSpec,  set: setBSpec,  ph: 'Terapevt, Kardiolog...', type: 'text', req: false },
          ].map(({ label, val, set, ph, type, req }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.4)' }}>
                {label.toUpperCase()}
              </label>
              <input
                type={type} value={val} required={req} placeholder={ph}
                onChange={(e) => set(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 8, padding: '0.55rem 0.75rem', color: '#fff', fontSize: '0.88rem',
                  outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
                }}
              />
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {[
              { label: 'Sana', val: bDate, set: setBDate, type: 'date', min: TODAY },
              { label: 'Vaqt', val: bTime, set: setBTime, type: 'time', min: undefined },
            ].map(({ label, val, set, type, min }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.4)' }}>
                  {label.toUpperCase()}
                </label>
                <input
                  type={type} value={val} min={min} required
                  onChange={(e) => set(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 8, padding: '0.55rem 0.75rem', color: '#fff', fontSize: '0.88rem',
                    outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.4)' }}>
              IZOH (IXTIYORIY)
            </label>
            <textarea
              value={bNotes} onChange={(e) => setBNotes(e.target.value)} rows={2}
              placeholder="Shikoyat, savollar..."
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8, padding: '0.55rem 0.75rem', color: '#fff', fontSize: '0.88rem',
                outline: 'none', fontFamily: 'inherit', resize: 'vertical',
              }}
            />
          </div>
          <button type="submit" disabled={bLoading} style={{
            padding: '0.75rem', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: color, color: '#fff', fontWeight: 700, fontSize: '0.9rem',
            opacity: bLoading ? 0.6 : 1,
          }}>
            {bLoading ? 'Saqlanmoqda...' : 'Navbat olish'}
          </button>
        </form>
      )}

      {/* Qabullar */}
      {tab === 'appointments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {upcoming.length > 0 && (
            <Section label="KELGUSI QABULLAR">
              {upcoming.map((a) => (
                <AppointmentCard key={a.id} appt={a} color={color} />
              ))}
            </Section>
          )}
          {past.length > 0 && (
            <Section label="O'TGAN QABULLAR">
              {past.slice(0, 20).map((a) => (
                <AppointmentCard key={a.id} appt={a} color={color} />
              ))}
            </Section>
          )}
          {appointments.length === 0 && (
            <Empty text="Qabullar yo'q" />
          )}
        </div>
      )}

      {/* Retseptlar */}
      {tab === 'prescriptions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {prescriptions.length === 0 ? (
            <Empty text="Retseptlar yo'q" />
          ) : prescriptions.map((rx) => (
            <PrescriptionCard key={rx.id} rx={rx} color={color} />
          ))}
        </div>
      )}

      {/* Profil */}
      {tab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <InfoRow label="Ism"         value={`${patient.firstName} ${patient.lastName}`} />
          <InfoRow label="Telefon"     value={patient.phone ?? '—'} />
          <InfoRow label="Tug'ilgan"   value={patient.dateOfBirth ?? '—'} />
          <InfoRow label="Jinsi"       value={patient.gender ?? '—'} />
          <InfoRow label="Qon guruhi"  value={patient.bloodType ?? '—'} />
          <InfoRow label="Manzil"      value={patient.address ?? '—'} />
          {patient.notes && (
            <div style={{
              marginTop: '0.5rem', padding: '0.75rem 1rem', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic',
            }}>
              {patient.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AppointmentCard({ appt, color }: { appt: ClinicAppointmentData; color: string }) {
  const statusColor = APPT_STATUS_COLOR[appt.status] ?? '#6b7280';
  return (
    <div style={{
      borderRadius: 10, padding: '0.9rem 1rem', marginBottom: '0.4rem',
      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            {appt.type ?? 'Qabul'}
            {appt.specialty && (
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginLeft: '0.4rem' }}>
                — {appt.specialty}
              </span>
            )}
          </div>
          {appt.doctorName && (
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
              Shifokor: {appt.doctorName}
            </div>
          )}
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
            {fmtDate(appt.date)} · {appt.time} · {appt.duration} daqiqa
          </div>
          {appt.notes && (
            <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.35)', marginTop: 4, fontStyle: 'italic' }}>
              {appt.notes}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{
            fontSize: '0.7rem', padding: '0.15rem 0.55rem', borderRadius: 99,
            background: statusColor + '25', color: statusColor, fontWeight: 700,
          }}>
            {APPT_STATUS_LABEL[appt.status] ?? appt.status}
          </span>
          {Number(appt.fee) > 0 && (
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color }}>{fmt(Number(appt.fee))}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function PrescriptionCard({ rx, color }: { rx: ClinicPrescriptionData; color: string }) {
  const [open, setOpen] = useState(false);
  const statusColor = RX_STATUS_COLOR[rx.status] ?? '#6b7280';
  return (
    <div style={{
      borderRadius: 10, border: '1px solid rgba(255,255,255,0.09)',
      background: 'rgba(255,255,255,0.04)', overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.85rem 1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit',
        }}
      >
        <div style={{ textAlign: 'left', flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
            {rx.diagnosis ?? 'Retsept'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
            {rx.doctorName} · {fmtDate(rx.date)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            fontSize: '0.68rem', padding: '0.12rem 0.5rem', borderRadius: 99,
            background: statusColor + '25', color: statusColor, fontWeight: 700,
          }}>
            {rx.status === 'active' ? 'Faol' : rx.status === 'completed' ? 'Tugatilgan' : 'Bekor'}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{open ? '∧' : '∨'}</span>
        </div>
      </button>

      {open && (
        <div style={{ padding: '0 1rem 0.9rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {rx.notes && (
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', padding: '0.6rem 0' }}>
              {rx.notes}
            </div>
          )}
          <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {rx.items.map((item, i) => (
              <div key={i} style={{
                borderRadius: 8, padding: '0.6rem 0.75rem',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.84rem', color }}>
                  {item.medicineName}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                  {item.dosage} · {item.frequency} · {item.days} kun
                </div>
                {item.notes && (
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 2, fontStyle: 'italic' }}>
                    {item.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em',
        color: 'rgba(255,255,255,0.35)', marginBottom: '0.5rem',
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '0.55rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
      fontSize: '0.85rem',
    }}>
      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '2.5rem', fontSize: '0.9rem' }}>
      {text}
    </div>
  );
}
