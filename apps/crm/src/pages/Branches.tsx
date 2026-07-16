import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Pencil, Trash2, Package, ArrowLeftRight } from 'lucide-react';
import {
  Branch, BranchInventoryRow, BranchTransfer, CreateBranchPayload, CreateTransferPayload,
  getBranches, getBranchStats, getBranchInventory,
  createBranch, updateBranch, deleteBranch,
  createTransfer, getTransfers,
  BranchStats,
} from '../api/branches.api';
import { getProducts, Product } from '../api/products.api';
import { useTenantStore } from '../stores/tenant.store';

// ─── Constants ────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('uz-UZ');
const fmtDate = (iso: string) => new Date(iso).toLocaleString('uz-UZ', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

// ─── Empty form helper ────────────────────────────────────────────────────────

const emptyBranch = (): CreateBranchPayload => ({
  name: '', address: '', phone: '', managerName: '', notes: '', isActive: true,
});

// ─── Branch Card ──────────────────────────────────────────────────────────────

function BranchCard({
  branch, onEdit, onTransfer, onInventory, onDelete,
}: {
  branch: Branch;
  onEdit:      () => void;
  onTransfer:  () => void;
  onInventory: () => void;
  onDelete:    () => void;
}) {
  return (
    <div style={{
      background: 'var(--card-bg)', borderRadius: 12,
      border: `1.5px solid ${branch.isActive ? 'var(--border)' : 'var(--border)'}`,
      padding: '1.1rem 1.2rem',
      display: 'flex', flexDirection: 'column', gap: '0.75rem',
      opacity: branch.isActive ? 1 : 0.6,
      transition: 'box-shadow 0.15s',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)')}
    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '')}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', marginBottom: '0.15rem', wordBreak: 'break-word' }}>
            {branch.name}
          </div>
          {branch.managerName && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Mas'ul: {branch.managerName}
            </div>
          )}
        </div>
        <span style={{
          fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.55rem',
          borderRadius: 99, flexShrink: 0,
          background: branch.isActive ? '#d1fae5' : '#f3f4f6',
          color:      branch.isActive ? '#065f46' : '#6b7280',
        }}>
          {branch.isActive ? 'Faol' : 'Nofaol'}
        </span>
      </div>

      {/* Info rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        {branch.address && (
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0 }}>📍</span>
            <span style={{ wordBreak: 'break-word' }}>{branch.address}</span>
          </div>
        )}
        {branch.phone && (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <span>📞</span>
            <a href={`tel:${branch.phone}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
              {branch.phone}
            </a>
          </div>
        )}
        {branch.notes && (
          <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: 1.4 }}>
            {branch.notes}
          </div>
        )}
      </div>

      {/* Stats pill */}
      <div style={{
        display: 'flex', gap: '0.5rem', padding: '0.5rem 0.6rem',
        background: 'var(--bg)', borderRadius: 8, fontSize: '0.75rem',
      }}>
        <span style={{ flex: 1, textAlign: 'center', color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text)', fontSize: '0.88rem' }}>{fmt(branch.transferCount)}</strong>
          <br />ko'chirma
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <button onClick={onInventory} style={btnStyle('#6366f1')} title="Inventar"><Package size={14} style={{ marginRight: 4 }} />Inventar</button>
        <button onClick={onTransfer}  style={btnStyle('#3b82f6')} title="Ko'chirish"><ArrowLeftRight size={14} style={{ marginRight: 4 }} />Ko'chirish</button>
        <button onClick={onEdit}      style={btnStyle('#f59e0b')} title="Tahrirlash"><Pencil size={14} /></button>
        <button onClick={onDelete}    style={btnStyle('#ef4444')} title="O'chirish"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

function btnStyle(color: string): CSSProperties {
  return {
    flex: 1, minWidth: 60, padding: '0.35rem 0.5rem',
    borderRadius: 7, border: `1px solid ${color}22`,
    background: color + '18', color,
    cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
  };
}

// ─── Branch Form Modal ────────────────────────────────────────────────────────

function BranchModal({
  initial, onSave, onClose,
}: {
  initial?: Branch | null;
  onSave: (dto: CreateBranchPayload) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm]   = useState<CreateBranchPayload>(
    initial ? {
      name: initial.name, address: initial.address ?? '',
      phone: initial.phone ?? '', managerName: initial.managerName ?? '',
      notes: initial.notes ?? '', isActive: initial.isActive,
    } : emptyBranch()
  );
  const [saving, setSaving]   = useState(false);
  const [nameErr, setNameErr] = useState(false);

  const patch = (p: Partial<CreateBranchPayload>) => setForm((f) => ({ ...f, ...p }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setNameErr(true); return; }
    setSaving(true);
    try { await onSave({ ...form, name: form.name.trim() }); }
    finally { setSaving(false); }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...modalBox, maxWidth: 460 }}>
        <div style={modalHeader}>
          <h3 style={{ margin: 0 }}>{initial ? 'Filial tahrirlash' : 'Yangi filial'}</h3>
          <button onClick={onClose} style={closeBtn}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <Field label="Filial nomi *" error={nameErr ? 'Majburiy' : ''}>
            <input value={form.name}
              onChange={(e) => { patch({ name: e.target.value }); setNameErr(false); }}
              placeholder="Masalan: Chilonzor filiali"
              style={{ ...inputSt, borderColor: nameErr ? '#ef4444' : undefined }}
            />
          </Field>
          <Field label="Manzil">
            <input value={form.address} onChange={(e) => patch({ address: e.target.value })}
              placeholder="Ko'cha, uy raqami" style={inputSt} />
          </Field>
          <Field label="Telefon">
            <input value={form.phone} onChange={(e) => patch({ phone: e.target.value })}
              placeholder="+998 90 123 45 67" style={inputSt} />
          </Field>
          <Field label="Mas'ul shaxs">
            <input value={form.managerName} onChange={(e) => patch({ managerName: e.target.value })}
              placeholder="To'liq ismi" style={inputSt} />
          </Field>
          <Field label="Izoh">
            <textarea value={form.notes} onChange={(e) => patch({ notes: e.target.value })}
              placeholder="Qo'shimcha ma'lumot..." rows={2}
              style={{ ...inputSt, resize: 'vertical' }} />
          </Field>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={switchLabel(form.isActive ?? true)}>
              <input type="checkbox" checked={form.isActive ?? true}
                onChange={(e) => patch({ isActive: e.target.checked })} style={{ display: 'none' }} />
              <span style={switchKnob(form.isActive ?? true)} />
            </label>
            <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
              {form.isActive ? 'Faol' : 'Nofaol'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <button onClick={onClose} style={cancelBtn}>Bekor</button>
          <button onClick={handleSubmit} disabled={saving} style={saveBtn}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Transfer Modal ───────────────────────────────────────────────────────────

function TransferModal({
  branches, products, defaultFrom, onSave, onClose,
}: {
  branches:    Branch[];
  products:    Product[];
  defaultFrom: Branch | null;
  onSave:  (dto: CreateTransferPayload) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CreateTransferPayload>({
    fromBranchId: defaultFrom?.id ?? null,
    toBranchId:   null,
    productId:    '',
    quantity:     1,
    notes:        '',
  });
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState<Record<string, string>>({});

  const patch = (p: Partial<CreateTransferPayload>) => setForm((f) => ({ ...f, ...p }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.productId) e.productId = 'Mahsulot tanlang';
    if (!form.quantity || form.quantity < 1) e.quantity = "Miqdor 1 dan ko'p bo'lsin";
    if (!form.fromBranchId && !form.toBranchId) e.branch = "Kamida bir filial tanlanishi kerak";
    if (form.fromBranchId === form.toBranchId && form.fromBranchId) e.branch = 'Bir xil filial tanlolmaysiz';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try { await onSave(form); }
    finally { setSaving(false); }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...modalBox, maxWidth: 460 }}>
        <div style={modalHeader}>
          <h3 style={{ margin: 0 }}>Mahsulot ko'chirish</h3>
          <button onClick={onClose} style={closeBtn}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

          {/* Direction */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.5rem', alignItems: 'center' }}>
            <Field label="Qayerdan">
              <select value={form.fromBranchId ?? ''} onChange={(e) => patch({ fromBranchId: e.target.value || null })} style={inputSt}>
                <option value="">Bosh sklad</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <div style={{ textAlign: 'center', fontSize: '1.2rem', color: 'var(--text-muted)', paddingTop: '1.4rem' }}>→</div>
            <Field label="Qayerga">
              <select value={form.toBranchId ?? ''} onChange={(e) => patch({ toBranchId: e.target.value || null })} style={inputSt}>
                <option value="">Bosh sklad</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
          </div>
          {errors.branch && <p style={{ margin: 0, color: '#ef4444', fontSize: '0.75rem' }}>{errors.branch}</p>}

          {/* Product */}
          <Field label="Mahsulot" error={errors.productId}>
            <select value={form.productId} onChange={(e) => patch({ productId: e.target.value })} style={inputSt}>
              <option value="">-- Tanlang --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} (Sklad: {p.quantity ?? 0})
                </option>
              ))}
            </select>
          </Field>

          {/* Quantity */}
          <Field label="Miqdor" error={errors.quantity}>
            <input type="number" min={1} value={form.quantity}
              onChange={(e) => patch({ quantity: Number(e.target.value) })} style={inputSt} />
          </Field>

          {/* Notes */}
          <Field label="Izoh">
            <textarea value={form.notes ?? ''} onChange={(e) => patch({ notes: e.target.value })}
              placeholder="Ko'chirish sababi..." rows={2} style={{ ...inputSt, resize: 'vertical' }} />
          </Field>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <button onClick={onClose} style={cancelBtn}>Bekor</button>
          <button onClick={handleSubmit} disabled={saving} style={saveBtn}>{saving ? "Ko'chirilmoqda..." : "Ko'chirish"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Inventory Drawer ─────────────────────────────────────────────────────────

function InventoryDrawer({
  branch, onClose,
}: {
  branch: Branch;
  onClose: () => void;
}) {
  const [rows, setRows]     = useState<BranchInventoryRow[]>([]);
  const [loading, setLoad]  = useState(true);

  useEffect(() => {
    getBranchInventory(branch.id)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoad(false));
  }, [branch.id]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 800 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px, 100vw)',
        background: 'var(--card-bg)', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
        zIndex: 801, display: 'flex', flexDirection: 'column',
      }}>
        <div style={drawerHeader}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{branch.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Filial inventari</div>
          </div>
          <button onClick={onClose} style={closeBtn}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Yuklanmoqda...</div>
          ) : rows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Bu filialga hali mahsulot ko'chirilmagan
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Mahsulot', 'Kirim', 'Chiqim', 'Qoldiq'].map(h => (
                    <th key={h} style={{ padding: '0.4rem 0.5rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.productId} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 600, color: 'var(--text)' }}>{r.productName}</td>
                    <td style={{ padding: '0.5rem', color: '#10b981' }}>+{fmt(r.incoming)}</td>
                    <td style={{ padding: '0.5rem', color: '#ef4444' }}>-{fmt(r.outgoing)}</td>
                    <td style={{ padding: '0.5rem', fontWeight: 700, color: r.net > 0 ? 'var(--text)' : '#ef4444' }}>
                      {fmt(r.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Transfer History Tab ─────────────────────────────────────────────────────

function TransferHistory({ branches }: { branches: Branch[] }) {
  const [transfers, setTransfers] = useState<BranchTransfer[]>([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoad]      = useState(true);
  const [branchId,  setBranchId]  = useState('');
  const [page,      setPage]      = useState(1);
  const LIMIT = 20;

  const load = () => {
    setLoad(true);
    getTransfers({ branchId: branchId || undefined, page, limit: LIMIT })
      .then(r => { setTransfers(r.data); setTotal(r.total); })
      .catch(() => {})
      .finally(() => setLoad(false));
  };

  useEffect(() => { load(); }, [branchId, page]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={branchId} onChange={e => { setBranchId(e.target.value); setPage(1); }} style={inputSt}>
          <option value="">Barcha filiallar</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{total} ta ko'chirma</span>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--card-bg)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</div>
        ) : transfers.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ko'chirmalar yo'q</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                  {['Vaqt', 'Mahsulot', 'Miqdor', 'Qayerdan', 'Qayerga', 'Kim', 'Izoh'].map(h => (
                    <th key={h} style={{ padding: '0.5rem 0.7rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transfers.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.5rem 0.7rem', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{fmtDate(t.createdAt)}</td>
                    <td style={{ padding: '0.5rem 0.7rem', fontWeight: 600, color: 'var(--text)' }}>{t.productName}</td>
                    <td style={{ padding: '0.5rem 0.7rem', textAlign: 'center', fontWeight: 700, color: '#6366f1' }}>{fmt(t.quantity)}</td>
                    <td style={{ padding: '0.5rem 0.7rem', color: 'var(--text-muted)' }}>{t.fromBranch?.name ?? 'Bosh sklad'}</td>
                    <td style={{ padding: '0.5rem 0.7rem', color: 'var(--text-muted)' }}>{t.toBranch?.name ?? 'Bosh sklad'}</td>
                    <td style={{ padding: '0.5rem 0.7rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{t.initiatedBy ?? '—'}</td>
                    <td style={{ padding: '0.5rem 0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {Math.ceil(total / LIMIT) > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={pagerBtn(page <= 1)}>← Oldingi</button>
          <span style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{page}/{Math.ceil(total / LIMIT)}</span>
          <button disabled={page >= Math.ceil(total / LIMIT)} onClick={() => setPage(p => p + 1)} style={pagerBtn(page >= Math.ceil(total / LIMIT))}>Keyingi →</button>
        </div>
      )}
    </div>
  );
}

// ─── Helper: Form field wrapper ───────────────────────────────────────────────

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.3rem' }}>
        {label}
      </label>
      {children}
      {error && <p style={{ margin: '0.2rem 0 0', fontSize: '0.73rem', color: '#ef4444' }}>{error}</p>}
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const overlay: CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: '1rem',
};
const modalBox: CSSProperties = {
  background: 'var(--card-bg)', borderRadius: 12,
  padding: '1.5rem', width: '100%',
  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  maxHeight: '90vh', overflowY: 'auto',
};
const modalHeader: CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  marginBottom: '1.25rem',
};
const drawerHeader: CSSProperties = {
  padding: '1rem 1.25rem',
  borderBottom: '1px solid var(--border)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};
const closeBtn: CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: '1.3rem', color: 'var(--text-muted)', lineHeight: 1, padding: '0.2rem',
};
const inputSt: CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '0.45rem 0.65rem', borderRadius: 7,
  border: '1px solid var(--border)',
  background: 'var(--input-bg, var(--bg))', color: 'var(--text)',
  fontSize: '0.875rem', fontFamily: 'inherit',
};
const cancelBtn: CSSProperties = {
  padding: '0.45rem 1rem', borderRadius: 7,
  border: '1px solid var(--border)', background: 'transparent',
  cursor: 'pointer', color: 'var(--text)', fontSize: '0.875rem',
};
const saveBtn: CSSProperties = {
  padding: '0.45rem 1.25rem', borderRadius: 7, border: 'none',
  background: 'var(--primary, #2563eb)', color: '#fff',
  cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700,
};
const pagerBtn = (disabled: boolean): CSSProperties => ({
  padding: '0.3rem 0.75rem', borderRadius: 6,
  border: '1px solid var(--border)', background: 'transparent',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: '0.8rem', opacity: disabled ? 0.4 : 1, color: 'var(--text)',
});
const switchLabel = (on: boolean): CSSProperties => ({
  position: 'relative', display: 'inline-block',
  width: 40, height: 22, cursor: 'pointer',
});
const switchKnob = (on: boolean): CSSProperties => ({
  display: 'block', width: 40, height: 22, borderRadius: 11,
  background: on ? 'var(--primary, #2563eb)' : 'var(--border)',
  transition: 'background 0.2s', position: 'relative',
});

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'filiallar' | 'kochirishlar';

export default function Branches() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const [tab,       setTab]      = useState<Tab>('filiallar');
  const [branches,  setBranches] = useState<(Branch & { transferCount: number })[]>([]);
  const [products,  setProducts] = useState<Product[]>([]);
  const [stats,     setStats]    = useState<BranchStats | null>(null);
  const [loading,   setLoading]  = useState(true);
  const [error,     setError]    = useState('');

  // Modals
  const [editBranch,    setEditBranch]    = useState<Branch | null>(null);
  const [showForm,      setShowForm]      = useState(false);
  const [transferFrom,  setTransferFrom]  = useState<Branch | null>(null);
  const [showTransfer,  setShowTransfer]  = useState(false);
  const [inventoryView, setInventoryView] = useState<Branch | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<Branch | null>(null);
  const [deleting,      setDeleting]      = useState(false);

  const loadAll = async () => {
    try {
      const [b, s] = await Promise.all([getBranches(), getBranchStats()]);
      setBranches(b as (Branch & { transferCount: number })[]);
      setStats(s);
      setError('');
    } catch {
      setError("Ma'lumot yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    getProducts(tenantId).then(setProducts).catch(() => {});
    timerRef.current = setInterval(() => { void loadAll(); }, 60_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveBranch = async (dto: CreateBranchPayload) => {
    if (editBranch) {
      await updateBranch(editBranch.id, dto);
    } else {
      await createBranch(dto);
    }
    await loadAll();
    setShowForm(false);
    setEditBranch(null);
  };

  const handleTransfer = async (dto: CreateTransferPayload) => {
    await createTransfer({ ...dto });
    await loadAll();
    setShowTransfer(false);
    setTransferFrom(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBranch(deleteTarget.id);
      await loadAll();
      setDeleteTarget(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "O'chirishda xatolik";
      alert(msg);
    } finally {
      setDeleting(false);
    }
  };

  const statCards = [
    { label: 'Jami filiallar',  val: stats?.total          ?? 0, color: '#6366f1' },
    { label: 'Faol',            val: stats?.active         ?? 0, color: '#10b981' },
    { label: 'Bugun ko\'chirma', val: stats?.transfersToday ?? 0, color: '#f59e0b' },
    { label: 'Mahsulot turlari', val: products.length,           color: '#3b82f6' },
  ];

  return (
    <div className="page">

      {/* Header */}
      <div className="page-header">
        <h2 className="page-title">Filiallar</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setShowTransfer(true); setTransferFrom(null); }}
            style={{ padding: '0.4rem 0.85rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.84rem', color: 'var(--text)' }}
          >
            Mahsulot ko'chirish
          </button>
          <button
            onClick={() => { setEditBranch(null); setShowForm(true); }}
            className="btn-primary"
          >
            + Yangi filial
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {statCards.map(c => (
          <div key={c.label} className="card" style={{ padding: '0.9rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: c.color }}>{c.val}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.3 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        {([['filiallar', 'Filiallar'], ['kochirishlar', "Ko'chirmalar tarixi"]] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '0.5rem 1rem', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: tab === key ? 700 : 400,
              color: tab === key ? 'var(--primary, #2563eb)' : 'var(--text-muted)',
              borderBottom: tab === key ? '2px solid var(--primary, #2563eb)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >{label}</button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', borderRadius: 8, color: '#991b1b', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* TAB: Filiallar */}
      {tab === 'filiallar' && (
        loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Yuklanmoqda...</div>
        ) : branches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏪</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Hali filiallar yo'q.</p>
            <button onClick={() => { setEditBranch(null); setShowForm(true); }} className="btn-primary" style={{ marginTop: '0.75rem' }}>
              + Birinchi filialni qo'shish
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {branches.map(branch => (
              <BranchCard
                key={branch.id}
                branch={branch}
                onEdit={() => { setEditBranch(branch); setShowForm(true); }}
                onTransfer={() => { setTransferFrom(branch); setShowTransfer(true); }}
                onInventory={() => setInventoryView(branch)}
                onDelete={() => setDeleteTarget(branch)}
              />
            ))}
          </div>
        )
      )}

      {/* TAB: Ko'chirmalar */}
      {tab === 'kochirishlar' && (
        <TransferHistory branches={branches} />
      )}

      {/* Branch Form Modal */}
      {showForm && (
        <BranchModal
          initial={editBranch}
          onSave={handleSaveBranch}
          onClose={() => { setShowForm(false); setEditBranch(null); }}
        />
      )}

      {/* Transfer Modal */}
      {showTransfer && (
        <TransferModal
          branches={branches}
          products={products}
          defaultFrom={transferFrom}
          onSave={handleTransfer}
          onClose={() => { setShowTransfer(false); setTransferFrom(null); }}
        />
      )}

      {/* Inventory Drawer */}
      {inventoryView && (
        <InventoryDrawer
          branch={inventoryView}
          onClose={() => setInventoryView(null)}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
          <div style={{ ...modalBox, maxWidth: 380 }}>
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text)' }}>Filialni o'chirish</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 1.25rem' }}>
              <strong>"{deleteTarget.name}"</strong> filialni o'chirishni tasdiqlaysizmi?
              Bu amalni qaytarib bo'lmaydi.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteTarget(null)} style={cancelBtn}>Bekor</button>
              <button
                onClick={() => void handleDelete()}
                disabled={deleting}
                style={{ ...saveBtn, background: '#ef4444' }}
              >
                {deleting ? "O'chirilmoqda..." : "O'chirish"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
