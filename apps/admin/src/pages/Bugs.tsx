import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { useAuthStore } from '../stores/auth.store';

// ─── Types ────────────────────────────────────────────────────────────────────

type BugType   = 'frontend_error' | 'api_error' | 'user_report';
type BugStatus = 'new' | 'in_progress' | 'resolved';

interface Bug {
  id:         string;
  tenantId:   string | null;
  tenantName: string | null;
  type:       BugType;
  message:    string;
  stack:      string | null;
  url:        string | null;
  userEmail:  string | null;
  status:     BugStatus;
  assignedTo: string | null;
  resolvedAt: string | null;
  createdAt:  string;
}

interface BugStats {
  total:       number;
  new:         number;
  in_progress: number;
  resolved:    number;
  byTenant: { tenantId: string; tenantName: string | null; count: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<BugType, string> = {
  frontend_error: 'Frontend',
  api_error:      'API',
  user_report:    'Foydalanuvchi',
};

const STATUS_LABELS: Record<BugStatus, string> = {
  new:         'Yangi',
  in_progress: 'Jarayonda',
  resolved:    'Hal qilindi',
};

const STATUS_COLORS: Record<BugStatus, string> = {
  new:         '#ef4444',
  in_progress: '#f59e0b',
  resolved:    '#16a34a',
};

const TYPE_COLORS: Record<BugType, string> = {
  frontend_error: '#8b5cf6',
  api_error:      '#f97316',
  user_report:    '#0ea5e9',
};

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '0.15rem 0.55rem',
      borderRadius: 99, fontSize: '0.75rem', fontWeight: 600,
      background: color + '22', color,
    }}>
      {label}
    </span>
  );
}

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('uz-UZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function BugModal({
  bug, onClose, onUpdate,
}: {
  bug: Bug;
  onClose: () => void;
  onUpdate: (id: string, patch: { status?: BugStatus; assignedTo?: string }) => Promise<void>;
}) {
  const user    = useAuthStore((s) => s.user);
  const [saving, setSaving] = useState(false);

  const handle = async (patch: { status?: BugStatus; assignedTo?: string }) => {
    setSaving(true);
    await onUpdate(bug.id, patch);
    setSaving(false);
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '2rem 1rem', overflowY: 'auto', zIndex: 1000,
      }}
    >
      <div style={{
        background: 'var(--bg, #fff)', borderRadius: 10,
        width: '100%', maxWidth: 680,
        boxShadow: '0 8px 40px rgba(0,0,0,0.2)', padding: '1.5rem',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Badge label={TYPE_LABELS[bug.type]}     color={TYPE_COLORS[bug.type]} />
            <Badge label={STATUS_LABELS[bug.status]} color={STATUS_COLORS[bug.status]} />
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--text-muted, #6b7280)', lineHeight: 1 }}
          >×</button>
        </div>

        {/* Message */}
        <p style={{ margin: '0 0 1rem', fontWeight: 600, color: 'var(--text, #111)', wordBreak: 'break-word' }}>
          {bug.message}
        </p>

        {/* Meta grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted, #6b7280)', marginBottom: '1rem' }}>
          {bug.tenantName && <span><strong>Tenant:</strong> {bug.tenantName}</span>}
          {bug.userEmail  && <span><strong>Foydalanuvchi:</strong> {bug.userEmail}</span>}
          {bug.url        && <span><strong>Sahifa:</strong> {bug.url}</span>}
          {bug.assignedTo && <span><strong>Zimmasida:</strong> {bug.assignedTo}</span>}
          <span><strong>Vaqt:</strong> {fmt(bug.createdAt)}</span>
          {bug.resolvedAt && <span><strong>Hal qilindi:</strong> {fmt(bug.resolvedAt)}</span>}
        </div>

        {/* Stack trace */}
        {bug.stack && (
          <details style={{ marginBottom: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-muted, #6b7280)', marginBottom: '0.4rem' }}>
              Stack trace
            </summary>
            <pre style={{
              margin: 0, padding: '0.75rem', borderRadius: 6,
              background: 'var(--code-bg, #f1f5f9)', fontSize: '0.75rem',
              overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              color: 'var(--text, #111)',
            }}>
              {bug.stack}
            </pre>
          </details>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {bug.status !== 'in_progress' && bug.status !== 'resolved' && (
            <button
              disabled={saving}
              onClick={() => handle({ status: 'in_progress', assignedTo: user?.email ?? undefined })}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: 6, border: 'none',
                background: '#f59e0b', color: '#fff', cursor: 'pointer', fontSize: '0.82rem',
                opacity: saving ? 0.6 : 1,
              }}
            >
              O'z zimmasiga olish
            </button>
          )}
          {bug.status !== 'resolved' && (
            <button
              disabled={saving}
              onClick={() => handle({ status: 'resolved' })}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: 6, border: 'none',
                background: '#16a34a', color: '#fff', cursor: 'pointer', fontSize: '0.82rem',
                opacity: saving ? 0.6 : 1,
              }}
            >
              Hal qilindi
            </button>
          )}
          {bug.status === 'resolved' && (
            <button
              disabled={saving}
              onClick={() => handle({ status: 'new' })}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: 6,
                border: '1px solid var(--border, #e5e7eb)',
                background: 'transparent', cursor: 'pointer', fontSize: '0.82rem',
                color: 'var(--text, #111)', opacity: saving ? 0.6 : 1,
              }}
            >
              Qayta ochish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BugsPage() {
  const [bugs,       setBugs]       = useState<Bug[]>([]);
  const [stats,      setStats]      = useState<BugStats | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState<Bug | null>(null);
  const [filterStatus, setFilterStatus] = useState<BugStatus | ''>('');
  const [filterType,   setFilterType]   = useState<BugType   | ''>('');
  const [filterTenant, setFilterTenant] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status   = filterStatus;
      if (filterType)   params.type     = filterType;
      if (filterTenant) params.tenantId = filterTenant;

      const [bugsRes, statsRes] = await Promise.all([
        api.get<Bug[]>('/bugs', { params }),
        api.get<BugStats>('/bugs/stats'),
      ]);
      setBugs(bugsRes.data);
      setStats(statsRes.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, filterTenant]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  // Auto-refresh every 30 s
  useEffect(() => {
    timerRef.current = setInterval(() => { void load(); }, 30_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [load]);

  const handleUpdate = async (id: string, patch: { status?: BugStatus; assignedTo?: string }) => {
    await api.patch(`/bugs/${id}`, patch);
    await load();
    setSelected((prev) => prev ? { ...prev, ...patch } : null);
  };

  const statCards = [
    { label: 'Jami',        value: stats?.total       ?? 0, color: '#2563eb' },
    { label: 'Yangi',       value: stats?.new         ?? 0, color: '#ef4444' },
    { label: 'Jarayonda',   value: stats?.in_progress ?? 0, color: '#f59e0b' },
    { label: 'Hal qilindi', value: stats?.resolved    ?? 0, color: '#16a34a' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Bug Tracker</h2>
        <button
          onClick={() => { setLoading(true); void load(); }}
          style={{
            padding: '0.4rem 0.9rem', borderRadius: 6,
            border: '1px solid var(--border, #e5e7eb)',
            background: 'transparent', cursor: 'pointer', fontSize: '0.82rem',
            color: 'var(--text, #111)',
          }}
        >
          Yangilash
        </button>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {statCards.map((c) => (
          <div key={c.label} className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #6b7280)', marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as BugStatus | '')}
          style={{ padding: '0.35rem 0.6rem', borderRadius: 6, border: '1px solid var(--border, #e5e7eb)', fontSize: '0.85rem', background: 'var(--input-bg, #f9fafb)', color: 'var(--text, #111)' }}
        >
          <option value="">Barcha statuslar</option>
          <option value="new">Yangi</option>
          <option value="in_progress">Jarayonda</option>
          <option value="resolved">Hal qilindi</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as BugType | '')}
          style={{ padding: '0.35rem 0.6rem', borderRadius: 6, border: '1px solid var(--border, #e5e7eb)', fontSize: '0.85rem', background: 'var(--input-bg, #f9fafb)', color: 'var(--text, #111)' }}
        >
          <option value="">Barcha turlar</option>
          <option value="frontend_error">Frontend</option>
          <option value="api_error">API</option>
          <option value="user_report">Foydalanuvchi</option>
        </select>

        <select
          value={filterTenant}
          onChange={(e) => setFilterTenant(e.target.value)}
          style={{ padding: '0.35rem 0.6rem', borderRadius: 6, border: '1px solid var(--border, #e5e7eb)', fontSize: '0.85rem', background: 'var(--input-bg, #f9fafb)', color: 'var(--text, #111)' }}
        >
          <option value="">Barcha tenantlar</option>
          {stats?.byTenant.map((t) => (
            <option key={t.tenantId} value={t.tenantId}>
              {t.tenantName ?? t.tenantId} ({t.count})
            </option>
          ))}
        </select>

        {(filterStatus || filterType || filterTenant) && (
          <button
            onClick={() => { setFilterStatus(''); setFilterType(''); setFilterTenant(''); }}
            style={{ padding: '0.35rem 0.7rem', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '0.82rem' }}
          >
            Tozalash
          </button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-muted, #6b7280)' }}>
          {bugs.length} ta xato
        </span>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Yuklanmoqda…</div>
        ) : bugs.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Xatolar topilmadi</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border, #e5e7eb)', background: 'var(--table-head, #f8fafc)' }}>
                  {['Vaqt', 'Tenant', 'Tur', 'Xabar', 'Sahifa', 'Foydalanuvchi', 'Status', 'Amallar'].map((h) => (
                    <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted, #6b7280)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bugs.map((bug) => (
                  <tr
                    key={bug.id}
                    onClick={() => setSelected(bug)}
                    style={{
                      borderBottom: '1px solid var(--border, #e5e7eb)',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--row-hover, #f8fafc)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap', color: 'var(--text-muted, #6b7280)' }}>
                      {fmt(bug.createdAt)}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {bug.tenantName ?? bug.tenantId ?? '—'}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <Badge label={TYPE_LABELS[bug.type]} color={TYPE_COLORS[bug.type]} />
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {bug.message}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted, #6b7280)' }}>
                      {bug.url ?? '—'}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted, #6b7280)' }}>
                      {bug.userEmail ?? '—'}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <Badge label={STATUS_LABELS[bug.status]} color={STATUS_COLORS[bug.status]} />
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {bug.status === 'new' && (
                          <button
                            onClick={() => void handleUpdate(bug.id, { status: 'in_progress' })}
                            style={{ padding: '0.2rem 0.5rem', borderRadius: 4, border: 'none', background: '#f59e0b', color: '#fff', cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            Olish
                          </button>
                        )}
                        {bug.status !== 'resolved' && (
                          <button
                            onClick={() => void handleUpdate(bug.id, { status: 'resolved' })}
                            style={{ padding: '0.2rem 0.5rem', borderRadius: 4, border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            ✓
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <BugModal
          bug={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
