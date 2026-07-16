import { useEffect, useState } from 'react';
import {
  BeautyAppointment, ServiceCatalogItem,
  getBeautyAppointments, getPublicServiceCatalog,
} from '../../../api/client-portal.api';

const STATUS_LABEL: Record<string, string> = {
  scheduled:   "Kutilmoqda",
  in_progress: "Jarayonda",
  completed:   "Bajarildi",
  cancelled:   "Bekor",
  no_show:     "Kelmadi",
};

const STATUS_COLOR: Record<string, string> = {
  scheduled:   '#3b82f6',
  in_progress: '#f59e0b',
  completed:   '#10b981',
  cancelled:   '#ef4444',
  no_show:     '#6b7280',
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' });

const fmt = (n: number) => Number(n).toLocaleString('uz-UZ') + " so'm";

interface Props {
  token:    string;
  slug:     string;
  color:    string;
}

export default function BeautyPortalDashboard({ token, slug, color }: Props) {
  const [appointments, setAppointments] = useState<BeautyAppointment[]>([]);
  const [services,     setServices]     = useState<ServiceCatalogItem[]>([]);
  const [tab,          setTab]          = useState<'appointments' | 'services'>('appointments');
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    Promise.all([
      getBeautyAppointments(token),
      getPublicServiceCatalog(slug),
    ])
      .then(([appts, svcs]) => {
        setAppointments(appts);
        setServices(svcs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, slug]);

  const upcoming = appointments.filter((a) => a.status === 'scheduled' || a.status === 'in_progress');
  const past     = appointments.filter((a) => a.status === 'completed' || a.status === 'cancelled' || a.status === 'no_show');

  const grouped = services.reduce<Record<string, ServiceCatalogItem[]>>((acc, s) => {
    const cat = s.category ?? 'Umumiy';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Tab nav */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
        {([['appointments', 'Qabullar'], ['services', 'Xizmatlar narxi']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '0.4rem 1rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.85rem',
              background: tab === key ? color : 'rgba(255,255,255,0.06)',
              color: tab === key ? '#fff' : 'rgba(255,255,255,0.55)',
              fontWeight: tab === key ? 600 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '2rem' }}>Yuklanmoqda...</div>
      ) : tab === 'appointments' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {upcoming.length > 0 && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>
                KELGUSI QABULLAR
              </div>
              {upcoming.map((a) => (
                <AppointmentCard key={a.id} appt={a} color={color} />
              ))}
            </div>
          )}

          {past.length > 0 && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem', marginTop: '0.5rem' }}>
                O'TGAN QABULLAR
              </div>
              {past.slice(0, 10).map((a) => (
                <AppointmentCard key={a.id} appt={a} color={color} />
              ))}
            </div>
          )}

          {appointments.length === 0 && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', padding: '2.5rem', fontSize: '0.9rem' }}>
              Qabullar yo'q. CRM orqali navbat olishingiz mumkin.
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: '0.4rem' }}>
                {cat.toUpperCase()}
              </div>
              {items.map((s) => (
                <div key={s.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.88rem' }}>{s.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                      {s.duration} daqiqa
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                    {fmt(s.price)}
                  </div>
                </div>
              ))}
            </div>
          ))}
          {services.length === 0 && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', padding: '2rem', fontSize: '0.9rem' }}>
              Xizmatlar ro'yxati hali to'ldirilmagan.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AppointmentCard({ appt, color }: { appt: BeautyAppointment; color: string }) {
  const statusColor = STATUS_COLOR[appt.status] ?? '#6b7280';
  return (
    <div style={{
      borderRadius: 10, padding: '0.85rem 1rem', marginBottom: '0.5rem',
      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            {appt.serviceName ?? 'Xizmat'}
          </div>
          {appt.masterName && (
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
              Master: {appt.masterName}
            </div>
          )}
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
            {fmtDate(appt.date)} · {appt.timeSlot} · {appt.duration} daqiqa
          </div>
          {appt.notes && (
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: 4, fontStyle: 'italic' }}>
              {appt.notes}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{
            fontSize: '0.7rem', padding: '0.15rem 0.55rem', borderRadius: 99,
            background: statusColor + '25', color: statusColor, fontWeight: 700,
          }}>
            {STATUS_LABEL[appt.status] ?? appt.status}
          </span>
          {appt.servicePrice > 0 && (
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color }}>
              {fmt(appt.servicePrice)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
