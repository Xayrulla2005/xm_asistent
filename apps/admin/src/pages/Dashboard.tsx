import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuthStore } from '../stores/auth.store';

interface BugStats {
  total:       number;
  new:         number;
  in_progress: number;
  resolved:    number;
}

export default function Dashboard() {
  const user     = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [bugStats, setBugStats] = useState<BugStats | null>(null);

  useEffect(() => {
    api.get<BugStats>('/bugs/stats')
      .then((r) => setBugStats(r.data))
      .catch(() => {/* ignore */});
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Dashboard</h2>
      </div>

      <div className="card">
        <h3>Xush kelibsiz, Admin!</h3>
        <p style={{ color: '#666', margin: '0.5rem 0 1.5rem' }}>
          Bu XM asistent boshqaruv paneli.
        </p>
        {user && (
          <div className="info-block">
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Rol:</strong> {user.role}</p>
          </div>
        )}
      </div>

      {/* Bug stats widget */}
      {bugStats !== null && (
        <div
          className="card"
          style={{ marginTop: '1.5rem', cursor: 'pointer' }}
          onClick={() => navigate('/bugs')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0 }}>Bug Tracker</h3>
            {bugStats.new > 0 && (
              <span style={{
                background: '#ef4444', color: '#fff', borderRadius: 99,
                padding: '0.15rem 0.6rem', fontSize: '0.78rem', fontWeight: 700,
              }}>
                {bugStats.new} yangi
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
            {[
              { label: 'Jami',        value: bugStats.total,       color: '#2563eb' },
              { label: 'Yangi',       value: bugStats.new,         color: '#ef4444' },
              { label: 'Jarayonda',   value: bugStats.in_progress, color: '#f59e0b' },
              { label: 'Hal qilindi', value: bugStats.resolved,    color: '#16a34a' },
            ].map((c) => (
              <div key={c.label} style={{ textAlign: 'center', padding: '0.5rem', borderRadius: 8, background: c.color + '11' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: c.color }}>{c.value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #6b7280)', marginTop: 2 }}>{c.label}</div>
              </div>
            ))}
          </div>

          <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #6b7280)' }}>
            Batafsil ko'rish uchun bosing →
          </p>
        </div>
      )}
    </div>
  );
}
