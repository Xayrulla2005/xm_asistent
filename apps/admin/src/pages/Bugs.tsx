import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import api from '../api/axios';
import { useAuthStore } from '../stores/auth.store';

// ─── Types ────────────────────────────────────────────────────────────────────

type BugType   = 'frontend_error' | 'api_error' | 'user_report';
type BugStatus = 'new' | 'open' | 'in_progress' | 'testing' | 'resolved' | 'closed' | 'reopened';
type Priority  = 'P1' | 'P2' | 'P3' | 'P4';

interface Bug {
  id:             string;
  tenantId:       string | null;
  tenantName:     string | null;
  type:           BugType;
  message:        string;
  title:          string | null;
  description:    string | null;
  stack:          string | null;
  url:            string | null;
  userEmail:      string | null;
  status:         BugStatus;
  priority:       Priority;
  source:         string | null;
  moduleAffected: string | null;
  assignedTo:     string | null;
  resolvedAt:     string | null;
  slaDeadline:    string | null;
  resolutionNote: string | null;
  method:         string | null;
  statusCode:     number | null;
  createdAt:      string;
}

interface BugStats {
  total:        number;
  new:          number;
  in_progress:  number;
  resolved:     number;
  p1p2Open:     number;
  slaBreached:  number;
  resolvedToday:number;
  byTenant: { tenantId: string; tenantName: string | null; count: number }[];
}

interface BugComment {
  id:          string;
  bugId:       string;
  authorEmail: string | null;
  body:        string;
  createdAt:   string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<BugType, string> = {
  frontend_error: 'Frontend',
  api_error:      'API',
  user_report:    'Foydalanuvchi',
};

const STATUS_LABEL: Record<BugStatus, string> = {
  new:         'Yangi',
  open:        'Ochiq',
  in_progress: 'Jarayonda',
  testing:     'Testda',
  resolved:    'Hal qilindi',
  closed:      'Yopildi',
  reopened:    'Qayta ochildi',
};

const STATUS_COLOR: Record<BugStatus, string> = {
  new:         '#ef4444',
  open:        '#f97316',
  in_progress: '#f59e0b',
  testing:     '#8b5cf6',
  resolved:    '#10b981',
  closed:      '#6b7280',
  reopened:    '#dc2626',
};

const PRIORITY_COLOR: Record<Priority, string> = {
  P1: '#ef4444',
  P2: '#f59e0b',
  P3: '#3b82f6',
  P4: '#9ca3af',
};

const PRIORITY_LABEL: Record<Priority, string> = {
  P1: 'Kritik',
  P2: "Muhim",
  P3: "O'rta",
  P4: 'Past',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleString('uz-UZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '0.15rem 0.5rem',
      borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
      background: color + '22', color,
    }}>
      {label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const color = PRIORITY_COLOR[priority] ?? '#9ca3af';
  return (
    <span style={{
      display: 'inline-block', padding: '0.1rem 0.4rem',
      borderRadius: 5, fontSize: '0.72rem', fontWeight: 800,
      background: color + '22', color, letterSpacing: '0.03em',
    }}>
      {priority}
    </span>
  );
}

function SlaBadge({ slaDeadline }: { slaDeadline: string | null }) {
  if (!slaDeadline) return <span style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '0.75rem' }}>—</span>;
  const past = new Date(slaDeadline) < new Date();
  return (
    <span style={{
      fontSize: '0.75rem', fontWeight: 600,
      color: past ? '#ef4444' : 'var(--text-muted, #6b7280)',
    }}>
      {past ? '⚠ ' : ''}{fmt(slaDeadline)}
    </span>
  );
}

// ─── Comment Drawer ───────────────────────────────────────────────────────────

function BugDrawer({
  bug,
  onClose,
  onUpdate,
}: {
  bug: Bug;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Pick<Bug, 'status' | 'assignedTo' | 'priority' | 'resolutionNote'>>) => Promise<void>;
}) {
  const user = useAuthStore((s) => s.user);
  const [comments,    setComments]    = useState<BugComment[]>([]);
  const [newComment,  setNewComment]  = useState('');
  const [saving,      setSaving]      = useState(false);
  const [resNote,     setResNote]     = useState(bug.resolutionNote ?? '');
  const [localStatus, setLocalStatus] = useState<BugStatus>(bug.status);
  const [errMsg,      setErrMsg]      = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Keep localStatus in sync when the parent updates the bug prop
  useEffect(() => { setLocalStatus(bug.status); }, [bug.status]);

  useEffect(() => {
    api.get<BugComment[]>(`/bugs/${bug.id}/comments`)
      .then((r) => setComments(r.data))
      .catch(() => {});
  }, [bug.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // ESC to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleStatusChange = async (status: BugStatus) => {
    const prev = localStatus;
    setLocalStatus(status);
    setSaving(true);
    setErrMsg(null);
    try {
      await onUpdate(bug.id, {
        status,
        resolutionNote: (status === 'resolved' || status === 'closed') ? resNote || undefined : undefined,
      });
    } catch (e: unknown) {
      setLocalStatus(prev);
      const msg = e instanceof Error ? e.message : String(e);
      setErrMsg(`Status o'zgartirilmadi: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const sendComment = async () => {
    if (!newComment.trim()) return;
    setSaving(true);
    try {
      const r = await api.post<BugComment>(`/bugs/${bug.id}/comments`, { body: newComment.trim() });
      setComments((prev) => [...prev, r.data]);
      setNewComment('');
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const field = (label: string, val: ReactNode) => (
    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', padding: '0.4rem 0', borderBottom: '1px solid var(--border, #f0f0f0)' }}>
      <span style={{ flex: '0 0 38%', color: 'var(--text-muted, #6b7280)', fontWeight: 500 }}>{label}</span>
      <span style={{ flex: 1, color: 'var(--text, #111)', wordBreak: 'break-all' }}>{val ?? '—'}</span>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 900 }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(520px, 100vw)', background: 'var(--card-bg, #fff)',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
        zIndex: 901, display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border, #e5e7eb)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
              <PriorityBadge priority={bug.priority ?? 'P3'} />
              <Badge label={STATUS_LABEL[bug.status] ?? bug.status} color={STATUS_COLOR[bug.status] ?? '#6b7280'} />
              <Badge label={TYPE_LABEL[bug.type] ?? bug.type} color="#6366f1" />
            </div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text, #111)', lineHeight: 1.4 }}>
              {bug.title ?? bug.message}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: 'var(--text-muted, #6b7280)', lineHeight: 1, flexShrink: 0 }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* ── Xato joyi (Error location) ── */}
          {(() => {
            const firstAt = bug.stack
              ? bug.stack
                  .split('\n')
                  .map(l => l.trim())
                  .filter(l =>
                    l.startsWith('at ') &&
                    !l.includes('node_modules') &&
                    !l.includes('react-dom') &&
                    !l.includes('react.development') &&
                    !l.includes('chunk-') &&
                    !l.includes('webpack')
                  )[0] ?? null
              : null;

            const location = firstAt
              ? firstAt
                  .replace(/^at\s+/, '')
                  .replace(/webpack-internal:\/\/\/(\.\/)?/, '')
                  .replace(/\?t=\d+/, '')
              : null;

            const hasApiInfo = !!(bug.method || bug.statusCode);
            const hasUrl = !!(bug.url?.trim());

            if (!location && !hasApiInfo && !hasUrl) return null;

            return (
              <div style={{ border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '0.75rem 0.9rem', background: 'rgba(239,68,68,0.07)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ef4444', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>
                  XATO JOYI
                </div>

                {/* API request badges + url */}
                {hasApiInfo && (
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: (location || hasUrl) ? '0.5rem' : 0, flexWrap: 'wrap' }}>
                    {bug.method && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 5, background: '#3b82f6', color: '#fff' }}>
                        {bug.method.toUpperCase()}
                      </span>
                    )}
                    {bug.statusCode && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 5, background: (bug.statusCode ?? 0) >= 500 ? '#ef4444' : '#f59e0b', color: '#fff' }}>
                        {bug.statusCode}
                      </span>
                    )}
                    {hasUrl && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text)', background: 'rgba(0,0,0,0.15)', padding: '0.15rem 0.45rem', borderRadius: 5, wordBreak: 'break-all', fontFamily: 'monospace' }}>
                        {bug.url}
                      </span>
                    )}
                  </div>
                )}

                {/* Frontend page URL */}
                {!hasApiInfo && hasUrl && (
                  <div style={{ marginBottom: location ? '0.5rem' : 0, fontSize: '0.78rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Sahifa: </span>
                    <span style={{ color: 'var(--text)', fontFamily: 'monospace', background: 'rgba(0,0,0,0.15)', padding: '0.1rem 0.4rem', borderRadius: 4, wordBreak: 'break-all' }}>
                      {bug.url}
                    </span>
                  </div>
                )}

                {/* First stack frame */}
                {location && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0, marginTop: '0.18rem' }}>at</span>
                    <span style={{ fontSize: '0.73rem', color: '#a78bfa', background: 'rgba(139,92,246,0.15)', padding: '0.25rem 0.5rem', borderRadius: 6, wordBreak: 'break-all', lineHeight: 1.5, flex: 1, border: '1px solid rgba(139,92,246,0.25)', fontFamily: 'monospace' }}>
                      {location}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Xato xabari ── */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.65rem 0.85rem', background: 'rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>XATO XABARI</div>
            <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text)', lineHeight: 1.5, wordBreak: 'break-word', fontFamily: 'monospace' }}>
              {bug.message}
            </p>
          </div>

          {/* ── Stack trace (full) ── */}
          {bug.stack && (
            <details>
              <summary style={{ cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, userSelect: 'none', padding: '0.3rem 0' }}>
                To'liq stack trace ko'rish
              </summary>
              <pre style={{
                marginTop: '0.5rem', padding: '0.75rem', borderRadius: 8,
                background: 'rgba(0,0,0,0.2)', fontSize: '0.7rem',
                overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                color: 'var(--text)', lineHeight: 1.6,
                maxHeight: 260, overflowY: 'auto',
                border: '1px solid var(--border)',
              }}>
                {bug.stack.split('\n').map((line, i) => {
                  const isAt = line.trim().startsWith('at ');
                  const isFirst = isAt && !line.includes('node_modules') && !line.includes('react-dom') && !line.includes('chunk-');
                  return (
                    <span key={i} style={{ display: 'block', color: isFirst ? '#a78bfa' : isAt ? 'var(--text-muted)' : '#f87171', fontWeight: isFirst ? 600 : 400 }}>
                      {line}
                    </span>
                  );
                })}
              </pre>
            </details>
          )}

          {/* ── Tafsilotlar ── */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted, #9ca3af)', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>TAFSILOTLAR</div>
            {field('Tenant',         bug.tenantName ?? bug.tenantId)}
            {field('Foydalanuvchi',  bug.userEmail)}
            {field('Modul',          bug.moduleAffected)}
            {field('Manba',          bug.source)}
            {field("Zimmasida",      bug.assignedTo)}
            {field('SLA muddati',    bug.slaDeadline ? <SlaBadge slaDeadline={bug.slaDeadline} /> : null)}
            {field("Hal qilingan",   bug.resolvedAt ? fmt(bug.resolvedAt) : null)}
            {field('Yaratilgan',     fmt(bug.createdAt))}
          </div>

          {/* Description */}
          {bug.description && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted, #9ca3af)', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>TAVSIF</div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text, #111)', lineHeight: 1.6 }}>{bug.description}</p>
            </div>
          )}

          {/* Actions */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted, #9ca3af)', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>HARAKATLAR</div>
            {errMsg && (
              <div style={{ marginBottom: '0.6rem', padding: '0.45rem 0.7rem', borderRadius: 7, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', fontSize: '0.78rem', color: '#ef4444', fontWeight: 500 }}>
                {errMsg}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {(['new','open','in_progress','testing','resolved','closed','reopened'] as BugStatus[]).map((s) => (
                <button
                  key={s}
                  disabled={saving || localStatus === s}
                  onClick={() => handleStatusChange(s)}
                  style={{
                    padding: '0.3rem 0.7rem', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: '0.75rem', fontWeight: 600,
                    background: localStatus === s ? (STATUS_COLOR[s] ?? '#6b7280') : (STATUS_COLOR[s] ?? '#6b7280') + '22',
                    color:      localStatus === s ? '#fff' : (STATUS_COLOR[s] ?? '#6b7280'),
                    opacity:    saving ? 0.6 : 1,
                  }}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>

            {/* Assign to me */}
            {bug.status !== 'resolved' && bug.status !== 'closed' && (
              <button
                disabled={saving}
                onClick={() => {
                  setSaving(true);
                  setErrMsg(null);
                  onUpdate(bug.id, { assignedTo: user?.email ?? 'admin' })
                    .catch((e: unknown) => {
                      const msg = e instanceof Error ? e.message : String(e);
                      setErrMsg(`Zimmasiga olishda xato: ${msg}`);
                    })
                    .finally(() => setSaving(false));
                }}
                style={{
                  padding: '0.35rem 0.85rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600,
                  border: '1px solid var(--border, #e5e7eb)', background: 'transparent',
                  cursor: 'pointer', color: 'var(--text, #111)', opacity: saving ? 0.6 : 1,
                }}
              >
                O'z zimmasiga olish
              </button>
            )}

            {/* Resolution note (when resolving/closing) */}
            {(localStatus === 'resolved' || localStatus === 'closed') && (
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text, #111)' }}>
                  Yechim izohi
                </label>
                <textarea
                  value={resNote}
                  onChange={(e) => setResNote(e.target.value)}
                  placeholder="Qanday hal qilindi..."
                  rows={2}
                  style={{
                    width: '100%', boxSizing: 'border-box', resize: 'vertical',
                    padding: '0.4rem 0.6rem', borderRadius: 7, fontSize: '0.82rem',
                    border: '1px solid var(--border, #e5e7eb)',
                    background: 'var(--input-bg, #f9fafb)', color: 'var(--text, #111)', fontFamily: 'inherit',
                  }}
                />
                <button
                  disabled={saving}
                  onClick={() => { setSaving(true); onUpdate(bug.id, { resolutionNote: resNote }).finally(() => setSaving(false)); }}
                  style={{
                    marginTop: '0.4rem', padding: '0.3rem 0.8rem', borderRadius: 6,
                    border: 'none', background: '#10b981', color: '#fff',
                    cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, opacity: saving ? 0.6 : 1,
                  }}
                >
                  Saqlash
                </button>
              </div>
            )}
          </div>

          {/* Comments */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted, #9ca3af)', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              IZOHLAR ({comments.length})
            </div>

            {comments.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #9ca3af)', margin: '0 0 0.75rem' }}>Izohlar yo'q</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.75rem' }}>
                {comments.map((c) => (
                  <div key={c.id} style={{
                    background: 'var(--bg, #f8fafc)', borderRadius: 8,
                    padding: '0.6rem 0.75rem', fontSize: '0.83rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text, #111)', fontSize: '0.78rem' }}>
                        {c.authorEmail ?? 'Admin'}
                      </span>
                      <span style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '0.72rem' }}>
                        {fmt(c.createdAt)}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text, #111)', lineHeight: 1.5 }}>{c.body}</p>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendComment(); } }}
                placeholder="Izoh qo'shish…"
                style={{
                  flex: 1, padding: '0.4rem 0.65rem', borderRadius: 7, fontSize: '0.82rem',
                  border: '1px solid var(--border, #e5e7eb)',
                  background: 'var(--input-bg, #f9fafb)', color: 'var(--text, #111)', fontFamily: 'inherit',
                }}
              />
              <button
                disabled={saving || !newComment.trim()}
                onClick={() => void sendComment()}
                style={{
                  padding: '0.4rem 0.85rem', borderRadius: 7, border: 'none',
                  background: 'var(--primary, #2563eb)', color: '#fff',
                  cursor: saving || !newComment.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '0.82rem', fontWeight: 600, opacity: saving || !newComment.trim() ? 0.5 : 1,
                }}
              >
                Yuborish
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BugsPage() {
  const [bugs,       setBugs]       = useState<Bug[]>([]);
  const [total,      setTotal]      = useState(0);
  const [stats,      setStats]      = useState<BugStats | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState<Bug | null>(null);

  const [filterStatus,   setFilterStatus]   = useState<BugStatus | ''>('');
  const [filterType,     setFilterType]     = useState<BugType   | ''>('');
  const [filterPriority, setFilterPriority] = useState<Priority  | ''>('');
  const [filterTenant,   setFilterTenant]   = useState('');
  const [page,           setPage]           = useState(1);
  const LIMIT = 25;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const params: Record<string, string | number> = { page, limit: LIMIT };
      if (filterStatus)   params.status   = filterStatus;
      if (filterType)     params.type     = filterType;
      if (filterPriority) params.priority = filterPriority;
      if (filterTenant)   params.tenantId = filterTenant;

      const [bugsRes, statsRes] = await Promise.all([
        api.get<unknown>('/bugs', { params }),
        api.get<BugStats>('/bugs/stats'),
      ]);
      // Handle both paginated {data,total} and legacy flat array responses
      const raw = bugsRes.data as ({ data: Bug[]; total: number } & Bug[]);
      const list: Bug[]  = Array.isArray(raw) ? (raw as Bug[]) : ((raw as { data: Bug[] }).data ?? []);
      const count: number = Array.isArray(raw) ? (statsRes.data.total ?? list.length) : ((raw as { total?: number }).total ?? list.length);
      setBugs(list);
      setTotal(count);
      setStats(statsRes.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, filterPriority, filterTenant, page]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    timerRef.current = setInterval(() => { void load(); }, 60_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [load]);

  const handleUpdate = async (id: string, patch: Partial<Pick<Bug, 'status' | 'assignedTo' | 'priority' | 'resolutionNote'>>) => {
    const res = await api.patch(`/bugs/${id}`, patch);
    console.log('[BugUpdate] success', res.data);
    await load();
    setSelected((prev) => prev?.id === id ? { ...prev, ...patch } : prev);
  };

  const clearFilters = () => {
    setFilterStatus('');
    setFilterType('');
    setFilterPriority('');
    setFilterTenant('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / LIMIT);

  const statCards = [
    { label: 'Jami',           value: stats?.total       ?? 0, color: '#2563eb',  alert: false },
    { label: 'Yangi',          value: stats?.new         ?? 0, color: '#ef4444',  alert: (stats?.new ?? 0) > 0 },
    { label: 'P1/P2 (ochiq)',  value: stats?.p1p2Open    ?? 0, color: '#ef4444',  alert: (stats?.p1p2Open ?? 0) > 0 },
    { label: 'SLA buzildi',    value: stats?.slaBreached ?? 0, color: '#f59e0b',  alert: (stats?.slaBreached ?? 0) > 0 },
    { label: 'Bugun hal',      value: stats?.resolvedToday ?? 0, color: '#10b981', alert: false },
    { label: 'Jarayonda',      value: stats?.in_progress ?? 0, color: '#f59e0b',  alert: false },
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

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {statCards.map((c) => (
          <div
            key={c.label}
            className="card"
            style={{
              padding: '0.85rem', textAlign: 'center',
              border: c.alert ? `2px solid ${c.color}` : '1px solid var(--border, #e5e7eb)',
            }}
          >
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #6b7280)', marginTop: 2, lineHeight: 1.3 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '0.65rem 1rem', marginBottom: '0.85rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value as BugStatus | ''); setPage(1); }}
          style={{ padding: '0.3rem 0.5rem', borderRadius: 6, border: '1px solid var(--border, #e5e7eb)', fontSize: '0.82rem', background: 'var(--input-bg, #f9fafb)', color: 'var(--text, #111)' }}>
          <option value="">Barcha statuslar</option>
          {(['new','open','in_progress','testing','resolved','closed','reopened'] as BugStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>

        <select value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value as Priority | ''); setPage(1); }}
          style={{ padding: '0.3rem 0.5rem', borderRadius: 6, border: '1px solid var(--border, #e5e7eb)', fontSize: '0.82rem', background: 'var(--input-bg, #f9fafb)', color: 'var(--text, #111)' }}>
          <option value="">Barcha prioritetlar</option>
          {(['P1','P2','P3','P4'] as Priority[]).map((p) => (
            <option key={p} value={p}>{p} — {PRIORITY_LABEL[p]}</option>
          ))}
        </select>

        <select value={filterType} onChange={(e) => { setFilterType(e.target.value as BugType | ''); setPage(1); }}
          style={{ padding: '0.3rem 0.5rem', borderRadius: 6, border: '1px solid var(--border, #e5e7eb)', fontSize: '0.82rem', background: 'var(--input-bg, #f9fafb)', color: 'var(--text, #111)' }}>
          <option value="">Barcha turlar</option>
          <option value="frontend_error">Frontend</option>
          <option value="api_error">API</option>
          <option value="user_report">Foydalanuvchi</option>
        </select>

        <select value={filterTenant} onChange={(e) => { setFilterTenant(e.target.value); setPage(1); }}
          style={{ padding: '0.3rem 0.5rem', borderRadius: 6, border: '1px solid var(--border, #e5e7eb)', fontSize: '0.82rem', background: 'var(--input-bg, #f9fafb)', color: 'var(--text, #111)' }}>
          <option value="">Barcha tenantlar</option>
          {stats?.byTenant.map((t) => (
            <option key={t.tenantId} value={t.tenantId}>
              {t.tenantName ?? t.tenantId} ({t.count})
            </option>
          ))}
        </select>

        {(filterStatus || filterType || filterPriority || filterTenant) && (
          <button
            onClick={clearFilters}
            style={{ padding: '0.3rem 0.7rem', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
          >
            Tozalash
          </button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted, #6b7280)' }}>
          {total} ta xato
        </span>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Yuklanmoqda…</div>
        ) : bugs.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Xatolar topilmadi</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border, #e5e7eb)', background: 'var(--table-head, #f8fafc)' }}>
                  {['Pri', 'Sarlavha', 'Tur', 'Modul', 'Status', 'Tenant', 'Foydalanuvchi', 'SLA', 'Vaqt', ''].map((h) => (
                    <th key={h} style={{ padding: '0.55rem 0.65rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted, #6b7280)', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bugs.map((bug) => (
                  <tr
                    key={bug.id}
                    onClick={() => setSelected(bug)}
                    style={{ borderBottom: '1px solid var(--border, #e5e7eb)', cursor: 'pointer' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--row-hover, #f8fafc)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '0.55rem 0.65rem' }}>
                      <PriorityBadge priority={bug.priority ?? 'P3'} />
                    </td>
                    <td style={{ padding: '0.55rem 0.65rem', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                      {bug.title ?? bug.message}
                    </td>
                    <td style={{ padding: '0.55rem 0.65rem' }}>
                      <Badge label={TYPE_LABEL[bug.type] ?? bug.type} color="#6366f1" />
                    </td>
                    <td style={{ padding: '0.55rem 0.65rem', color: 'var(--text-muted, #6b7280)', whiteSpace: 'nowrap' }}>
                      {bug.moduleAffected ?? '—'}
                    </td>
                    <td style={{ padding: '0.55rem 0.65rem' }}>
                      <Badge label={STATUS_LABEL[bug.status] ?? bug.status} color={STATUS_COLOR[bug.status] ?? '#6b7280'} />
                    </td>
                    <td style={{ padding: '0.55rem 0.65rem', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted, #6b7280)' }}>
                      {bug.tenantName ?? bug.tenantId ?? '—'}
                    </td>
                    <td style={{ padding: '0.55rem 0.65rem', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted, #6b7280)' }}>
                      {bug.userEmail ?? '—'}
                    </td>
                    <td style={{ padding: '0.55rem 0.65rem', whiteSpace: 'nowrap' }}>
                      <SlaBadge slaDeadline={bug.slaDeadline} />
                    </td>
                    <td style={{ padding: '0.55rem 0.65rem', whiteSpace: 'nowrap', color: 'var(--text-muted, #6b7280)' }}>
                      {fmt(bug.createdAt)}
                    </td>
                    <td style={{ padding: '0.55rem 0.65rem' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {bug.status === 'new' && (
                          <button
                            onClick={() => void handleUpdate(bug.id, { status: 'in_progress' })}
                            style={{ padding: '0.2rem 0.45rem', borderRadius: 4, border: 'none', background: '#f59e0b', color: '#fff', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}
                          >
                            Olish
                          </button>
                        )}
                        {bug.status !== 'resolved' && bug.status !== 'closed' && (
                          <button
                            onClick={() => void handleUpdate(bug.id, { status: 'resolved' })}
                            style={{ padding: '0.2rem 0.45rem', borderRadius: 4, border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            style={{ padding: '0.3rem 0.75rem', borderRadius: 6, border: '1px solid var(--border, #e5e7eb)', background: 'transparent', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', opacity: page <= 1 ? 0.4 : 1 }}
          >
            ← Oldingi
          </button>
          <span style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: 'var(--text-muted, #6b7280)' }}>
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={{ padding: '0.3rem 0.75rem', borderRadius: 6, border: '1px solid var(--border, #e5e7eb)', background: 'transparent', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontSize: '0.8rem', opacity: page >= totalPages ? 0.4 : 1 }}
          >
            Keyingi →
          </button>
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <BugDrawer
          bug={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
