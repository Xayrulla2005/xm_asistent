import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import api from '../api/axios';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLog {
  id:          string;
  tenantId:    string | null;
  tenantName:  string | null;
  action:      string;
  entity:      string | null;
  entityId:    string | null;
  entityLabel: string | null;
  actorEmail:  string | null;
  actorRole:   string | null;
  ipAddress:   string | null;
  before:      Record<string, unknown> | null;
  after:       Record<string, unknown> | null;
  meta:        Record<string, unknown> | null;
  createdAt:   string;
}

interface AuditStats {
  total:    number;
  today:    number;
  byAction: { action: string; count: number }[];
  byEntity: { entity: string; count: number }[];
}

interface PagedResult {
  data:  AuditLog[];
  total: number;
  page:  number;
  limit: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_COLOR: Record<string, string> = {
  CREATE:         '#10b981',
  UPDATE:         '#3b82f6',
  DELETE:         '#ef4444',
  LOGIN:          '#8b5cf6',
  LOGOUT:         '#6b7280',
  EXPORT:         '#f59e0b',
  IMPORT:         '#06b6d4',
  TOKEN_REFRESH:  '#94a3b8',
};

const ENTITY_LABEL: Record<string, string> = {
  sale:        'Sotuv',
  product:     'Mahsulot',
  customer:    'Mijoz',
  employee:    'Xodim',
  branch:      'Filial',
  transfer:    "Ko'chirma",
  tenant:      'Tenant',
  wizard:      'Sozlama',
  auth:        'Auth',
  payment:     "To'lov",
  bug:         'Xato',
  bug_comment: 'Izoh',
  debt:        'Qarz',
  supplier:    'Yetkazuvchi',
  delivery:    'Yetkazma',
};

const ACTION_LABEL: Record<string, string> = {
  CREATE:         'Yaratildi',
  UPDATE:         'Yangilandi',
  DELETE:         "O'chirildi",
  LOGIN:          'Kirdi',
  LOGOUT:         'Chiqdi',
  EXPORT:         'Export',
  IMPORT:         'Import',
  TOKEN_REFRESH:  'Token',
};

const ALL_ACTIONS  = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT'];
const ALL_ENTITIES = ['sale', 'product', 'customer', 'employee', 'branch', 'transfer', 'tenant', 'wizard', 'auth', 'payment', 'bug', 'debt'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleString('uz-UZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function fmtShort(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Hozir';
  if (diffMin < 60) return `${diffMin} daqiqa oldin`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} soat oldin`;
  return fmt(iso);
}

function ActionBadge({ action }: { action: string }) {
  const color = ACTION_COLOR[action] ?? '#6b7280';
  return (
    <span style={{
      display: 'inline-block', padding: '0.15rem 0.55rem', borderRadius: 99,
      fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em',
      background: color + '20', color,
    }}>
      {ACTION_LABEL[action] ?? action}
    </span>
  );
}

function EntityBadge({ entity }: { entity: string | null }) {
  if (!entity) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  return (
    <span style={{
      display: 'inline-block', padding: '0.12rem 0.45rem', borderRadius: 5,
      fontSize: '0.72rem', fontWeight: 600,
      background: 'rgba(99,102,241,0.12)', color: '#6366f1',
    }}>
      {ENTITY_LABEL[entity] ?? entity}
    </span>
  );
}

// ─── JSON Viewer ─────────────────────────────────────────────────────────────

function JsonBlock({ data, label }: { data: Record<string, unknown> | null; label: string }) {
  if (!data) return null;
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', marginBottom: '0.35rem' }}>
        {label}
      </div>
      <pre style={{
        margin: 0, padding: '0.65rem 0.85rem', borderRadius: 8,
        background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)',
        fontSize: '0.7rem', color: 'var(--text)', overflowX: 'auto',
        whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 220,
        overflowY: 'auto', lineHeight: 1.6, fontFamily: 'monospace',
      }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

// ─── Detail Drawer ───────────────────────────────────────────────────────────

function AuditDrawer({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const color = ACTION_COLOR[log.action] ?? '#6b7280';

  const field = (label: string, val: string | null | undefined) => {
    if (!val) return null;
    return (
      <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', padding: '0.35rem 0', borderBottom: '1px solid var(--border)' }}>
        <span style={{ flex: '0 0 42%', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
        <span style={{ flex: 1, color: 'var(--text)', wordBreak: 'break-all' }}>{val}</span>
      </div>
    );
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 900 }}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(560px, 100vw)', background: 'var(--card-bg, #fff)',
        boxShadow: '-4px 0 28px rgba(0,0,0,0.15)',
        zIndex: 901, display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              <ActionBadge action={log.action} />
              <EntityBadge entity={log.entity} />
            </div>
            <h3 style={{ margin: 0, fontSize: '0.97rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.4 }}>
              {log.entityLabel ?? log.entityId ?? log.entity ?? log.action}
            </h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {fmt(log.createdAt)}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', color: 'var(--text-muted)', lineHeight: 1, flexShrink: 0 }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Actor */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '0.75rem 0.9rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              AMALGA OSHIRUVCHI
            </div>
            {field('Email',    log.actorEmail)}
            {field('Rol',      log.actorRole)}
            {field('IP manba', log.ipAddress)}
            {!log.actorEmail && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tizim / anonim</span>
            )}
          </div>

          {/* Entity */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '0.75rem 0.9rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              OB'EKT
            </div>
            {field('Tur',     ENTITY_LABEL[log.entity ?? ''] ?? log.entity)}
            {field('ID',      log.entityId)}
            {field('Nomi',    log.entityLabel)}
            {field('Tenant',  log.tenantName ?? log.tenantId)}
          </div>

          {/* Before / After */}
          {(log.before || log.after) && (
            <div style={{ border: `1px solid ${color}33`, borderRadius: 10, padding: '0.75rem 0.9rem', background: color + '08' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color, letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                MA'LUMOTLAR
              </div>
              <JsonBlock data={log.before} label="SO'ROV (request body)" />
              <JsonBlock data={log.after}  label="NATIJA (response)" />
            </div>
          )}

          {/* Meta */}
          {log.meta && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '0.75rem 0.9rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                META
              </div>
              {field('Metod', log.meta.method as string)}
              {field('URL',   log.meta.url   as string)}
              {field('ID',    log.id)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const LIMIT = 30;

export default function AuditPage() {
  const [logs,    setLogs]    = useState<AuditLog[]>([]);
  const [total,   setTotal]   = useState(0);
  const [stats,   setStats]   = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected,setSelected]= useState<AuditLog | null>(null);
  const [page,    setPage]    = useState(1);

  const [search,      setSearch]      = useState('');
  const [filterAction,setFilterAction]= useState('');
  const [filterEntity,setFilterEntity]= useState('');
  const [filterFrom,  setFilterFrom]  = useState('');
  const [filterTo,    setFilterTo]    = useState('');

  const searchRef  = useRef(search);
  const debounceRef= useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const load = useCallback(async () => {
    try {
      const params: Record<string, string | number> = { page, limit: LIMIT };
      if (searchRef.current) params.search = searchRef.current;
      if (filterAction)      params.action = filterAction;
      if (filterEntity)      params.entity = filterEntity;
      if (filterFrom)        params.from   = filterFrom;
      if (filterTo)          params.to     = filterTo;

      const [logsRes, statsRes] = await Promise.all([
        api.get<PagedResult>('/audit', { params }),
        api.get<AuditStats>('/audit/stats'),
      ]);
      setLogs(logsRes.data.data);
      setTotal(logsRes.data.total);
      setStats(statsRes.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, filterAction, filterEntity, filterFrom, filterTo]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    searchRef.current = val;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setLoading(true);
      void load();
    }, 400);
  };

  const clearFilters = () => {
    setSearch(''); searchRef.current = '';
    setFilterAction('');
    setFilterEntity('');
    setFilterFrom('');
    setFilterTo('');
    setPage(1);
  };

  const hasFilters = search || filterAction || filterEntity || filterFrom || filterTo;

  // ── Stat cards ──────────────────────────────────────────────────────────────
  const topAction = stats?.byAction[0];
  const topEntity = stats?.byEntity[0];

  const statCards = [
    { label: 'Jami amallar',   value: stats?.total ?? 0,   color: '#6366f1' },
    { label: 'Bugungi amallar',value: stats?.today ?? 0,   color: '#10b981' },
    { label: 'Eng ko\'p harakat', value: topAction ? `${ACTION_LABEL[topAction.action] ?? topAction.action} (${topAction.count})` : '—', color: ACTION_COLOR[topAction?.action ?? ''] ?? '#6b7280' },
    { label: 'Eng faol ob\'ekt',  value: topEntity ? `${ENTITY_LABEL[topEntity.entity] ?? topEntity.entity} (${topEntity.count})` : '—', color: '#6366f1' },
  ];

  const inputSt: CSSProperties = {
    padding: '0.3rem 0.55rem', borderRadius: 6,
    border: '1px solid var(--border, #e5e7eb)',
    background: 'var(--input-bg, #f9fafb)', color: 'var(--text, #111)',
    fontSize: '0.82rem',
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Audit Jurnali</h2>
        <button
          onClick={() => { setLoading(true); void load(); }}
          style={{ padding: '0.4rem 0.9rem', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text)' }}
        >
          Yangilash
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {statCards.map((c) => (
          <div key={c.label} className="card" style={{ padding: '0.85rem', textAlign: 'center' }}>
            <div style={{ fontSize: typeof c.value === 'number' ? '1.7rem' : '1rem', fontWeight: 800, color: c.color, lineHeight: 1.2 }}>
              {c.value}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.3 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '0.65rem 1rem', marginBottom: '0.85rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="search"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Chek raqami, foydalanuvchi, ID..."
          style={{ ...inputSt, minWidth: 210, flex: '1 1 210px' }}
        />

        <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1); }} style={inputSt}>
          <option value="">Barcha amallar</option>
          {ALL_ACTIONS.map((a) => (
            <option key={a} value={a}>{ACTION_LABEL[a] ?? a}</option>
          ))}
        </select>

        <select value={filterEntity} onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }} style={inputSt}>
          <option value="">Barcha ob'ektlar</option>
          {ALL_ENTITIES.map((e) => (
            <option key={e} value={e}>{ENTITY_LABEL[e] ?? e}</option>
          ))}
        </select>

        <input
          type="date"
          value={filterFrom}
          onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }}
          style={inputSt}
          title="Boshlanish sanasi"
        />
        <input
          type="date"
          value={filterTo}
          onChange={(e) => { setFilterTo(e.target.value); setPage(1); }}
          style={inputSt}
          title="Tugash sanasi"
        />

        {hasFilters && (
          <button
            onClick={clearFilters}
            style={{ padding: '0.3rem 0.7rem', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
          >
            Tozalash
          </button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {total.toLocaleString()} ta yozuv
        </span>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda…</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Yozuvlar topilmadi</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--table-head, #f8fafc)' }}>
                  {['Vaqt', 'Foydalanuvchi', 'Harakat', "Ob'ekt", 'Nomi / Chek', 'Tenant', ''].map((h) => (
                    <th key={h} style={{ padding: '0.55rem 0.7rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.73rem', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelected(log)}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--row-hover, #f8fafc)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '0.5rem 0.7rem', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text)' }}>
                        {fmtShort(log.createdAt)}
                      </div>
                      <div style={{ fontSize: '0.68rem', marginTop: 1 }}>
                        {new Date(log.createdAt).toLocaleTimeString('uz-UZ')}
                      </div>
                    </td>
                    <td style={{ padding: '0.5rem 0.7rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.actorEmail ? (
                        <div>
                          <div style={{ fontWeight: 500, color: 'var(--text)', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {log.actorEmail}
                          </div>
                          {log.actorRole && (
                            <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: 1 }}>{log.actorRole}</div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Tizim</span>
                      )}
                    </td>
                    <td style={{ padding: '0.5rem 0.7rem' }}>
                      <ActionBadge action={log.action} />
                    </td>
                    <td style={{ padding: '0.5rem 0.7rem' }}>
                      <EntityBadge entity={log.entity} />
                    </td>
                    <td style={{ padding: '0.5rem 0.7rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.entityLabel ? (
                        <span style={{ fontWeight: 500, color: 'var(--text)', fontFamily: log.entityLabel.startsWith('Chek') ? 'monospace' : 'inherit', fontSize: log.entityLabel.startsWith('Chek') ? '0.78rem' : '0.8rem' }}>
                          {log.entityLabel}
                        </span>
                      ) : log.entityId ? (
                        <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.72rem' }}>
                          {log.entityId.slice(0, 12)}…
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '0.5rem 0.7rem', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {log.tenantName ?? log.tenantId ?? '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.7rem' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelected(log); }}
                        style={{ padding: '0.2rem 0.55rem', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.73rem', color: 'var(--text-muted)' }}
                      >
                        Ko'rish
                      </button>
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            style={{ padding: '0.3rem 0.75rem', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', opacity: page <= 1 ? 0.4 : 1 }}
          >
            ← Oldingi
          </button>
          <span style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={{ padding: '0.3rem 0.75rem', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontSize: '0.8rem', opacity: page >= totalPages ? 0.4 : 1 }}
          >
            Keyingi →
          </button>
        </div>
      )}

      {/* Detail Drawer */}
      {selected && <AuditDrawer log={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
