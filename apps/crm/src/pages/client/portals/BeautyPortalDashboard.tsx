import React, { FormEvent, useEffect, useState } from 'react';
import {
  BeautyAppointment, ServiceCatalogItem,
  getBeautyAppointments, getPublicServiceCatalog, bookBeautyAppointment,
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

const TODAY = new Date().toISOString().slice(0, 10);

export default function BeautyPortalDashboard({ token, slug, color }: Props) {
  const [appointments, setAppointments] = useState<BeautyAppointment[]>([]);
  const [services,     setServices]     = useState<ServiceCatalogItem[]>([]);
  const [tab,          setTab]          = useState<'appointments' | 'services' | 'book'>('appointments');
  const [loading,      setLoading]      = useState(true);

  // Booking form state
  const [bookName,    setBookName]    = useState('');
  const [bookPhone,   setBookPhone]   = useState('');
  const [bookDate,    setBookDate]    = useState(TODAY);
  const [bookTime,    setBookTime]    = useState('10:00');
  const [bookService, setBookService] = useState('');
  const [bookNotes,   setBookNotes]   = useState('');
  const [bookLoading, setBookLoading] = useState(false);
  const [bookError,   setBookError]   = useState('');
  const [bookSuccess, setBookSuccess] = useState(false);

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

  const handleBook = async (e: FormEvent) => {
    e.preventDefault();
    setBookError(''); setBookSuccess(false); setBookLoading(true);
    const chosen = services.find((s) => s.id === bookService);
    try {
      await bookBeautyAppointment(slug, {
        clientName:  bookName,
        clientPhone: bookPhone,
        serviceId:   bookService || undefined,
        serviceName: chosen?.name,
        date:        bookDate,
        timeSlot:    bookTime,
        notes:       bookNotes || undefined,
      });
      setBookSuccess(true);
      setBookName(''); setBookPhone(''); setBookNotes(''); setBookService('');
      // Refresh appointment list
      getBeautyAppointments(token).then(setAppointments).catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xatolik yuz berdi';
      setBookError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? msg);
    } finally {
      setBookLoading(false);
    }
  };

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
        {([['appointments', 'Qabullar'], ['book', 'Navbat olish'], ['services', 'Xizmatlar narxi']] as const).map(([key, label]) => (
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

      {/* Navbat olish tab */}
      {tab === 'book' && (
        <form onSubmit={handleBook} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {bookSuccess && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: 10, background: '#10b98120', border: '1px solid #10b98140', color: '#10b981', fontWeight: 600, fontSize: '0.88rem' }}>
              Navbat muvaffaqiyatli olindi. Tasdiqlash SMS keladi.
            </div>
          )}
          {bookError && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: 10, background: '#ef444420', border: '1px solid #ef444440', color: '#ef4444', fontSize: '0.85rem' }}>
              {bookError}
            </div>
          )}
          <BookField label="Ismingiz">
            <input value={bookName} onChange={(e) => setBookName(e.target.value)} required placeholder="Alisher Karimov" />
          </BookField>
          <BookField label="Telefon raqam">
            <input value={bookPhone} onChange={(e) => setBookPhone(e.target.value)} required placeholder="+998901234567" type="tel" />
          </BookField>
          <BookField label="Xizmat (ixtiyoriy)">
            <select value={bookService} onChange={(e) => setBookService(e.target.value)}>
              <option value="">— Tanlang —</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name} — {Number(s.price).toLocaleString('uz-UZ')} so'm</option>
              ))}
            </select>
          </BookField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <BookField label="Sana">
              <input type="date" value={bookDate} min={TODAY} onChange={(e) => setBookDate(e.target.value)} required />
            </BookField>
            <BookField label="Vaqt">
              <input type="time" value={bookTime} onChange={(e) => setBookTime(e.target.value)} required />
            </BookField>
          </div>
          <BookField label="Izoh (ixtiyoriy)">
            <textarea value={bookNotes} onChange={(e) => setBookNotes(e.target.value)} placeholder="Qo'shimcha ma'lumot..." rows={2} />
          </BookField>
          <button
            type="submit"
            disabled={bookLoading}
            style={{
              padding: '0.75rem', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: color, color: '#fff', fontWeight: 700, fontSize: '0.9rem',
              opacity: bookLoading ? 0.6 : 1,
            }}
          >
            {bookLoading ? 'Saqlanmoqda...' : 'Navbat olish'}
          </button>
        </form>
      )}

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

function BookField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <label style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.4)' }}>
        {label.toUpperCase()}
      </label>
      <div style={{
        borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)',
        background: 'rgba(255,255,255,0.06)',
      }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {React.Children.map(children as any, (child) =>
          React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<React.HTMLAttributes<HTMLElement>>, {
                style: {
                  width: '100%', background: 'none', border: 'none', outline: 'none',
                  padding: '0.55rem 0.75rem', color: '#fff', fontSize: '0.88rem',
                  fontFamily: 'inherit', resize: 'vertical',
                },
              })
            : child
        )}
      </div>
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
