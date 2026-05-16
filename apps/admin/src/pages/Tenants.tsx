import { FormEvent, useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuthStore } from '../stores/auth.store';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
}

// ── Presets ─────────────────────────────────────────────────────────────────
const INDUSTRY_PRESETS: Record<string, { modules: string[]; roles: string[] }> = {
  retail: {
    modules: ['sales', 'warehouse', 'customers', 'payments', 'deliveries', 'reports', 'loyalty', 'suppliers'],
    roles: ['admin', 'cashier', 'warehouse_manager', 'courier', 'accountant', 'sales_manager'],
  },
  clinic: {
    modules: ['patients', 'appointments', 'doctors', 'pharmacy', 'lab', 'payments', 'reports', 'medical_records'],
    roles: ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'accountant'],
  },
  education: {
    modules: ['students', 'courses', 'teachers', 'attendance', 'payments', 'exams', 'certificates', 'schedule', 'reports'],
    roles: ['admin', 'teacher', 'student', 'receptionist', 'accountant', 'curator'],
  },
  restaurant: {
    modules: ['menu', 'orders', 'kitchen', 'tables', 'delivery', 'payments', 'warehouse', 'reports', 'reservations'],
    roles: ['admin', 'waiter', 'cook', 'cashier', 'delivery_courier', 'warehouse_manager', 'accountant'],
  },
};

const MODULE_META: Record<string, { label: string; emoji: string }> = {
  sales:           { emoji: '🛒', label: 'Sotuv' },
  warehouse:       { emoji: '📦', label: 'Sklad' },
  customers:       { emoji: '👥', label: 'Mijozlar' },
  payments:        { emoji: '💳', label: "To'lovlar" },
  deliveries:      { emoji: '🚚', label: 'Yetkazib berish' },
  reports:         { emoji: '📊', label: 'Hisobotlar' },
  loyalty:         { emoji: '🎁', label: 'Sodiqlik dasturi' },
  suppliers:       { emoji: '🏭', label: "Ta'minotchilar" },
  patients:        { emoji: '🏥', label: 'Bemorlar' },
  appointments:    { emoji: '📅', label: 'Qabullar' },
  doctors:         { emoji: '👨‍⚕️', label: 'Shifokorlar' },
  pharmacy:        { emoji: '💊', label: 'Dorixona' },
  lab:             { emoji: '🔬', label: 'Laboratoriya' },
  medical_records: { emoji: '📋', label: 'Tibbiy kartalar' },
  students:        { emoji: '🎓', label: "O'quvchilar" },
  courses:         { emoji: '📚', label: 'Kurslar' },
  teachers:        { emoji: '👨‍🏫', label: "O'qituvchilar" },
  attendance:      { emoji: '✅', label: 'Davomat' },
  exams:           { emoji: '📝', label: 'Imtihonlar' },
  certificates:    { emoji: '🏆', label: 'Sertifikatlar' },
  schedule:        { emoji: '🗓️', label: 'Jadval' },
  menu:            { emoji: '🍽️', label: 'Menyu' },
  orders:          { emoji: '🧾', label: 'Buyurtmalar' },
  kitchen:         { emoji: '👨‍🍳', label: 'Oshxona' },
  tables:          { emoji: '🪑', label: 'Stollar' },
  delivery:        { emoji: '🚚', label: 'Yetkazib berish' },
  reservations:    { emoji: '📞', label: 'Bronlar' },
};

const ROLE_META: Record<string, { label: string; emoji: string }> = {
  admin:             { emoji: '👑',    label: 'Admin' },
  cashier:           { emoji: '💰',    label: 'Kassir' },
  warehouse_manager: { emoji: '📦',    label: 'Sklad boshqaruvchi' },
  courier:           { emoji: '🚴',    label: 'Kuryer' },
  accountant:        { emoji: '📒',    label: 'Buxgalter' },
  sales_manager:     { emoji: '🤝',    label: 'Sotuv menejeri' },
  doctor:            { emoji: '👨‍⚕️',  label: 'Shifokor' },
  nurse:             { emoji: '👩‍⚕️',  label: 'Hamshira' },
  receptionist:      { emoji: '🖥️',   label: 'Qabulchi' },
  pharmacist:        { emoji: '💊',    label: 'Dorixonachi' },
  lab_technician:    { emoji: '🔬',    label: 'Laborant' },
  teacher:           { emoji: '👨‍🏫',  label: "O'qituvchi" },
  student:           { emoji: '🎓',    label: "O'quvchi" },
  curator:           { emoji: '📋',    label: 'Kurator' },
  waiter:            { emoji: '🍽️',   label: 'Ofitsiant' },
  cook:              { emoji: '👨‍🍳',  label: 'Oshpaz' },
  delivery_courier:  { emoji: '🛵',    label: 'Yetkazuvchi' },
};

const INDUSTRIES = [
  { value: 'retail',     label: '🏪 Savdo (Retail)' },
  { value: 'clinic',     label: '🏥 Klinika' },
  { value: 'education',  label: "🎓 Ta'lim" },
  { value: 'restaurant', label: '🍽️ Restoran' },
];

const COLOR_PRESETS = [
  { color: '#3b82f6', label: "Ko'k" },
  { color: '#10b981', label: 'Yashil' },
  { color: '#ef4444', label: 'Qizil' },
  { color: '#8b5cf6', label: 'Binafsha' },
  { color: '#f59e0b', label: "To'q sariq" },
  { color: '#1e3a8a', label: "To'q ko'k" },
];

const STEP_LABELS = ['Asosiy', 'Modullar', 'Rollar', 'Dizayn', 'Tasdiqlash'];

// ── Helpers ──────────────────────────────────────────────────────────────────
function moduleName(key: string) {
  const m = MODULE_META[key];
  return m ? `${m.emoji} ${m.label}` : key;
}

function roleName(key: string) {
  const r = ROLE_META[key];
  return r ? `${r.emoji} ${r.label}` : key;
}

function industryLabel(value: string) {
  return INDUSTRIES.find((i) => i.value === value)?.label ?? value;
}

function presetFor(industry: string) {
  return INDUSTRY_PRESETS[industry] ?? { modules: [], roles: [] };
}

// ── Subcomponents ─────────────────────────────────────────────────────────────
function StepIndicator({ step }: { step: number }) {
  return (
    <div className="wizard-steps">
      {STEP_LABELS.map((label, i) => (
        <div
          key={i}
          className={
            'wizard-step' +
            (i + 1 === step ? ' wizard-step--active' : i + 1 < step ? ' wizard-step--done' : '')
          }
        >
          <div className="wizard-step-circle">{i + 1 < step ? '✓' : i + 1}</div>
          <span className="wizard-step-label">{label}</span>
          {i < STEP_LABELS.length - 1 && <div className="wizard-step-line" />}
        </div>
      ))}
    </div>
  );
}

function CheckGroup({
  keys,
  meta,
  selected,
  onChange,
}: {
  keys: string[];
  meta: Record<string, { label: string; emoji: string }>;
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  const allSelected = keys.every((k) => selected.includes(k));
  const toggleAll = () => onChange(allSelected ? [] : [...keys]);

  return (
    <div>
      <button type="button" className="select-all-btn" onClick={toggleAll}>
        {allSelected ? 'Hammasini olib tashlash' : 'Hammasini tanlash'}
      </button>
      <div className="check-group">
        {keys.map((key) => {
          const m = meta[key];
          const checked = selected.includes(key);
          return (
            <label key={key} className={'check-item' + (checked ? ' check-item--checked' : '')}>
              <input type="checkbox" checked={checked} onChange={() => toggle(key)} />
              <span className="check-emoji">{m?.emoji}</span>
              {m?.label ?? key}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function SummaryChips({ items, meta }: { items: string[]; meta: Record<string, { label: string; emoji: string }> }) {
  return (
    <div className="summary-chips">
      {items.map((key) => {
        const m = meta[key];
        return (
          <span key={key} className="summary-chip">
            {m?.emoji} {m?.label ?? key}
          </span>
        );
      })}
    </div>
  );
}

// ── WizardData ────────────────────────────────────────────────────────────────
interface WizardTheme {
  primaryColor: string;
  logo: string;
  bgType: 'solid' | 'gradient' | 'image';
  darkMode: boolean;
}

interface WizardData {
  name: string;
  industry: string;
  modules: string[];
  roles: string[];
  theme: WizardTheme;
}

const DEFAULT_THEME: WizardTheme = {
  primaryColor: '#3b82f6',
  logo: '',
  bgType: 'solid',
  darkMode: false,
};

const DEFAULT_INDUSTRY = 'retail';

function freshData(): WizardData {
  const preset = presetFor(DEFAULT_INDUSTRY);
  return {
    name: '',
    industry: DEFAULT_INDUSTRY,
    modules: preset.modules,
    roles: preset.roles,
    theme: { ...DEFAULT_THEME },
  };
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Tenants() {
  const user = useAuthStore((s) => s.user);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(freshData);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchTenants = async () => {
    try {
      const { data } = await api.get<Tenant[]>('/tenants');
      setTenants(data);
    } catch {
      setError("Ma'lumot yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTenants(); }, []);

  const openModal = () => {
    setData(freshData());
    setStep(1);
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const changeIndustry = (industry: string) => {
    const preset = presetFor(industry);
    setData((d) => ({ ...d, industry, modules: preset.modules, roles: preset.roles }));
  };

  const canNext = () => {
    if (step === 1) return data.name.trim().length > 0;
    if (step === 2) return data.modules.length > 0;
    if (step === 3) return data.roles.length > 0;
    return true; // steps 4 (Dizayn) and 5 (Tasdiqlash) are always OK
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFormError('');
    setSubmitting(true);
    try {
      const { data: tenant } = await api.post<Tenant>('/tenants', {
        name: data.name,
        ownerId: user.id,
      });
      await api.post('/wizard/configure', {
        tenantId: tenant.id,
        industry: data.industry,
        modules: data.modules,
        roles: data.roles,
        theme: data.theme,
      });
      closeModal();
      fetchTenants();
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const setTheme = (patch: Partial<WizardTheme>) =>
    setData((d) => ({ ...d, theme: { ...d.theme, ...patch } }));

  const preset = presetFor(data.industry);

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Tenants</h2>
        <button className="btn-primary" onClick={openModal}>+ Yangi CRM</button>
      </div>

      {loading && <p className="state-msg">Yuklanmoqda...</p>}
      {error && <p className="state-msg state-msg--error">{error}</p>}

      {!loading && !error && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Status</th>
                <th>CreatedAt</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Hech qanday tenant topilmadi
                  </td>
                </tr>
              ) : (
                tenants.map((t) => (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td><code className="slug">{t.slug}</code></td>
                    <td>
                      <span className={'badge ' + (t.isActive ? 'badge--active' : 'badge--inactive')}>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{new Date(t.createdAt).toLocaleDateString('uz-UZ')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Yangi CRM yaratish</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <StepIndicator step={step} />

            <form onSubmit={handleSubmit} className="modal-form">
              {formError && <p className="form-error">{formError}</p>}

              {/* Step 1 — Asosiy */}
              {step === 1 && (
                <div className="wizard-body">
                  <div className="field">
                    <label>Tenant nomi</label>
                    <input
                      type="text"
                      placeholder="Masalan: Alisher Dokon"
                      value={data.name}
                      onChange={(e) => setData({ ...data, name: e.target.value })}
                      autoFocus
                    />
                  </div>
                  <div className="field">
                    <label>Soha</label>
                    <select value={data.industry} onChange={(e) => changeIndustry(e.target.value)}>
                      {INDUSTRIES.map((i) => (
                        <option key={i.value} value={i.value}>{i.label}</option>
                      ))}
                    </select>
                  </div>
                  <p className="wizard-hint" style={{ marginTop: '0.75rem' }}>
                    Sohani tanlasangiz, modullar va rollar avtomatik sozlanadi.
                  </p>
                </div>
              )}

              {/* Step 2 — Modullar */}
              {step === 2 && (
                <div className="wizard-body">
                  <p className="wizard-hint">
                    {industryLabel(data.industry)} uchun modullar —{' '}
                    <strong>{data.modules.length}/{preset.modules.length}</strong> tanlangan
                  </p>
                  <CheckGroup
                    keys={preset.modules}
                    meta={MODULE_META}
                    selected={data.modules}
                    onChange={(modules) => setData({ ...data, modules })}
                  />
                </div>
              )}

              {/* Step 3 — Rollar */}
              {step === 3 && (
                <div className="wizard-body">
                  <p className="wizard-hint">
                    {industryLabel(data.industry)} uchun rollar —{' '}
                    <strong>{data.roles.length}/{preset.roles.length}</strong> tanlangan
                  </p>
                  <CheckGroup
                    keys={preset.roles}
                    meta={ROLE_META}
                    selected={data.roles}
                    onChange={(roles) => setData({ ...data, roles })}
                  />
                </div>
              )}

              {/* Step 4 — Dizayn */}
              {step === 4 && (
                <div className="wizard-body">
                  <div className="field">
                    <label>Asosiy rang</label>
                    <div className="color-presets">
                      {COLOR_PRESETS.map(({ color, label }) => (
                        <button
                          key={color}
                          type="button"
                          className={'color-preset' + (data.theme.primaryColor === color ? ' color-preset--active' : '')}
                          style={{ background: color }}
                          title={label}
                          onClick={() => setTheme({ primaryColor: color })}
                        />
                      ))}
                      <input
                        type="color"
                        className="color-custom"
                        value={data.theme.primaryColor}
                        onChange={(e) => setTheme({ primaryColor: e.target.value })}
                        title="Maxsus rang"
                      />
                    </div>
                    <div className="color-preview" style={{ background: data.theme.primaryColor }}>
                      {data.theme.primaryColor}
                    </div>
                  </div>

                  <div className="field">
                    <label>Logo URL (ixtiyoriy)</label>
                    <input
                      type="url"
                      placeholder="https://example.com/logo.png"
                      value={data.theme.logo}
                      onChange={(e) => setTheme({ logo: e.target.value })}
                    />
                    {data.theme.logo && (
                      <img
                        src={data.theme.logo}
                        alt="logo"
                        style={{ height: 40, marginTop: 8, borderRadius: 6, objectFit: 'contain' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                  </div>

                  <div className="form-row">
                    <div className="field">
                      <label>Fon turi</label>
                      <select
                        value={data.theme.bgType}
                        onChange={(e) => setTheme({ bgType: e.target.value as WizardTheme['bgType'] })}
                      >
                        <option value="solid">Tekis rang</option>
                        <option value="gradient">Gradient</option>
                        <option value="image">Rasmli</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Dark mode default</label>
                      <select
                        value={data.theme.darkMode ? 'true' : 'false'}
                        onChange={(e) => setTheme({ darkMode: e.target.value === 'true' })}
                      >
                        <option value="false">Yo'q (Yorug')</option>
                        <option value="true">Ha (Qorong'i)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5 — Tasdiqlash */}
              {step === 5 && (
                <div className="wizard-body">
                  <div className="summary">
                    <div className="summary-row">
                      <span className="summary-label">Nomi</span>
                      <span className="summary-value summary-value--bold">{data.name}</span>
                    </div>
                    <div className="summary-row">
                      <span className="summary-label">Soha</span>
                      <span className="summary-value">{industryLabel(data.industry)}</span>
                    </div>
                    <div className="summary-row summary-row--col">
                      <span className="summary-label">Modullar ({data.modules.length})</span>
                      <SummaryChips items={data.modules} meta={MODULE_META} />
                    </div>
                    <div className="summary-row summary-row--col">
                      <span className="summary-label">Rollar ({data.roles.length})</span>
                      <SummaryChips items={data.roles} meta={ROLE_META} />
                    </div>
                    <div className="summary-row">
                      <span className="summary-label">Asosiy rang</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span
                          style={{
                            width: 18, height: 18, borderRadius: '50%',
                            background: data.theme.primaryColor,
                            border: '2px solid var(--border)',
                            display: 'inline-block',
                          }}
                        />
                        {data.theme.primaryColor}
                      </span>
                    </div>
                    <div className="summary-row">
                      <span className="summary-label">Fon turi</span>
                      <span className="summary-value">
                        {{ solid: 'Tekis rang', gradient: 'Gradient', image: 'Rasmli' }[data.theme.bgType]}
                      </span>
                    </div>
                    <div className="summary-row">
                      <span className="summary-label">Dark mode</span>
                      <span className="summary-value">{data.theme.darkMode ? "Ha" : "Yo'q"}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="modal-actions">
                {step > 1 && (
                  <button type="button" className="btn-secondary" onClick={() => setStep(step - 1)}>
                    Orqaga
                  </button>
                )}
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Bekor
                </button>
                {step < 5 ? (
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={!canNext()}
                    onClick={() => setStep(step + 1)}
                  >
                    Keyingi
                  </button>
                ) : (
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'Yaratilmoqda...' : 'CRM Yaratish'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
