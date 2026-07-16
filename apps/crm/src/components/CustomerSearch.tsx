import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { getCustomers, createCustomer, Customer } from '../api/customers.api';
import { useTenantStore } from '../stores/tenant.store';

interface Props {
  value:        Customer | null;
  onChange:     (c: Customer | null) => void;
  required?:    boolean;
  placeholder?: string;
}

const fmt = (n: number) => Number(n).toLocaleString('uz-UZ') + " so'm";

export default function CustomerSearch({ value, onChange, required, placeholder }: Props) {
  const tenantId = useTenantStore((s) => s.tenantId);

  const [query,       setQuery]       = useState('');
  const [all,         setAll]         = useState<Customer[]>([]);
  const [results,     setResults]     = useState<Customer[]>([]);
  const [open,        setOpen]        = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName,     setNewName]     = useState('');
  const [newPhone,    setNewPhone]    = useState('');
  const [saving,      setSaving]      = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    getCustomers(tenantId).then(setAll).catch(() => {});
  }, [tenantId]);

  const runSearch = (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    const filtered = all
      .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone ?? '').includes(q))
      .slice(0, 8);
    setResults(filtered);
    setOpen(true);
  };

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => runSearch(q), 300);
  };

  const pick = (c: Customer) => {
    onChange(c);
    setQuery('');
    setOpen(false);
    setShowAddForm(false);
  };

  const handleAddNew = () => {
    setNewName(query.trim());
    setShowAddForm(true);
    setOpen(false);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const c = await createCustomer({
        tenantId,
        name:  newName.trim(),
        phone: newPhone.trim() || undefined,
      });
      // Reload customer list
      getCustomers(tenantId).then(setAll).catch(() => {});
      pick(c);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  if (value) {
    return (
      <div className="customer-chip">
        <div className="customer-chip-avatar">{value.name[0]?.toUpperCase() ?? '?'}</div>
        <div className="customer-chip-info">
          <span className="customer-chip-name">{value.name}</span>
          {value.phone && <span className="customer-chip-phone">{value.phone}</span>}
          {Number(value.totalDebt) > 0 && (
            <span className="customer-chip-debt">Nasiya: {fmt(Number(value.totalDebt))}</span>
          )}
        </div>
        <button
          type="button"
          className="customer-chip-remove"
          onClick={() => onChange(null)}
          aria-label="Mijozni olib tashlash"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        className="cs-input"
        placeholder={placeholder ?? 'Ism yoki telefon...'}
        value={query}
        onChange={handleInput}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onFocus={() => { if (results.length) setOpen(true); }}
        required={required}
      />

      {open && (
        <div className="customer-search-dropdown">
          {results.map((c) => (
            <button key={c.id} type="button" className="cs-option" onMouseDown={() => pick(c)}>
              <span className="cs-option-avatar">{c.name[0]?.toUpperCase() ?? '?'}</span>
              <span className="cs-option-info">
                <span className="cs-option-name">{c.name}</span>
                {c.phone && <span className="cs-option-phone">{c.phone}</span>}
              </span>
              {Number(c.totalDebt) > 0 && (
                <span className="cs-option-debt">{fmt(Number(c.totalDebt))}</span>
              )}
            </button>
          ))}
          <button type="button" className="cs-add-option" onMouseDown={handleAddNew}>
            + "{query.trim() || '...'}" — yangi mijoz qo'shish
          </button>
        </div>
      )}

      {showAddForm && (
        <form className="cs-inline-form" onSubmit={handleSave}>
          <div className="field">
            <label>Ism *</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Alisher Karimov"
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label>Telefon</label>
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="+998 90 123 45 67"
            />
          </div>
          <div className="cs-inline-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowAddForm(false)}
            >
              Bekor
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving || !newName.trim()}
            >
              {saving ? '...' : 'Saqlash va tanlash'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
