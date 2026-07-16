import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, UserCheck, RefreshCw } from 'lucide-react';
import { GymCheckIn, GymMember, getCheckins, getGymMembers, checkIn } from '../../api/gym.api';
import { useToastStore } from '../../stores/toast.store';

const today = () => new Date().toISOString().slice(0, 10);

export default function GymCheckInPage() {
  const addToast = useToastStore((s) => s.toast);
  const [checkins,  setCheckins]  = useState<GymCheckIn[]>([]);
  const [members,   setMembers]   = useState<GymMember[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [date,      setDate]      = useState(today());
  const [checking,  setChecking]  = useState<string | null>(null); // memberId being checked in
  const searchRef   = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getCheckins(undefined, date), getGymMembers()])
      .then(([c, m]) => { setCheckins(c); setMembers(m.filter((x) => x.status === 'active')); })
      .catch(() => addToast('Yuklab bo\'lmadi'))
      .finally(() => setLoading(false));
  }, [date, addToast]);

  useEffect(() => { load(); }, [load]);

  const alreadyIn = new Set(checkins.map((c) => c.memberId));

  const filtered = search.trim()
    ? members.filter((m) => {
        const q = search.toLowerCase();
        return `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) || (m.phone ?? '').includes(q);
      })
    : members;

  const handleCheckIn = async (member: GymMember) => {
    if (alreadyIn.has(member.id)) {
      addToast(`${member.firstName} bugun allaqachon kirganda`);
      return;
    }
    setChecking(member.id);
    try {
      const record = await checkIn(member.id);
      setCheckins((prev) => [record, ...prev]);
      addToast(`${member.firstName} ${member.lastName} — kirish qayd qilindi`, 'success');
      setSearch('');
      searchRef.current?.focus();
    } catch { addToast('Xatolik'); }
    finally { setChecking(null); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Kirish nazorati</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.65rem' }} />
          <button className="btn-secondary" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem' }}>
            <RefreshCw size={13} /> Yangilash
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Left: member search + quick check-in */}
        <div>
          <div style={{ fontWeight: 600, marginBottom: '0.65rem', fontSize: '0.9rem' }}>A'zo qidirish va kirish</div>
          <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              ref={searchRef}
              type="text"
              placeholder="Ism yoki telefon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              style={{ paddingLeft: '2.2rem', width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: 480, overflowY: 'auto' }}>
            {loading ? <p className="state-msg">Yuklanmoqda...</p>
             : filtered.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '1rem 0' }}>A'zo topilmadi</p>
             : filtered.map((m) => {
              const done = alreadyIn.has(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={checking === m.id || done}
                  onClick={() => handleCheckIn(m)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.6rem 0.85rem', borderRadius: 10, border: '1px solid',
                    borderColor: done ? 'rgba(16,185,129,0.3)' : 'var(--border)',
                    background: done ? 'rgba(16,185,129,0.06)' : 'var(--card-bg)',
                    cursor: done ? 'default' : 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.firstName} {m.lastName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.phone ?? m.planName ?? '—'}</div>
                  </div>
                  {done ? (
                    <span style={{ color: '#10b981', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <UserCheck size={14} /> Kirdi
                    </span>
                  ) : checking === m.id ? (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>...</span>
                  ) : (
                    <span className="btn-primary" style={{ fontSize: '0.78rem', padding: '0.2rem 0.65rem', borderRadius: 8 }}>Kirish</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: today's check-in log */}
        <div>
          <div style={{ fontWeight: 600, marginBottom: '0.65rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {date === today() ? 'Bugungi kirishlar' : `${new Date(date).toLocaleDateString('uz-UZ')} — kirishlar`}
            <span style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', borderRadius: 12, padding: '0.1rem 0.55rem', fontSize: '0.78rem', fontWeight: 700 }}>
              {checkins.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: 520, overflowY: 'auto' }}>
            {checkins.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '2rem 0' }}>Hali kirish yo'q</p>
            ) : checkins.map((c, i) => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.5rem 0.75rem', borderRadius: 8,
                background: i % 2 === 0 ? 'var(--bg-secondary)' : 'transparent',
                fontSize: '0.84rem',
              }}>
                <span style={{ color: '#10b981', flexShrink: 0 }}><UserCheck size={15} /></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{c.memberName}</div>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', flexShrink: 0 }}>
                  {new Date(c.checkedAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
