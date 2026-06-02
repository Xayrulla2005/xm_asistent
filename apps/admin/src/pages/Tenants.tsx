import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bar, CartesianGrid, Cell, ComposedChart,
  Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import api from '../api/axios';
import { useAuthStore } from '../stores/auth.store';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  industry?: string | null;
  moduleCount?: number;
}

interface WeeklyPoint { date: string; revenue: number; salesCount: number; }
interface TopProduct  { name: string; totalQty: number; totalRevenue: number; }

interface TenantStats {
  totalSales: number;
  totalRevenue: number;
  totalProducts: number;
  totalCustomers: number;
  avgOrderValue: number;
  monthlyRevenue: number;
  lastActivity: string | null;
  weeklyChart: WeeklyPoint[];
  topProducts: TopProduct[];
  paymentBreakdown: { cash: number; card: number; credit: number };
}

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  wizardConfig: {
    industry: string;
    modules: string[];
    roles: string[];
    theme: WizardTheme;
    receipt: WizardReceipt;
    dashboard: { widgets: string[] };
  } | null;
  stats: TenantStats;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const INDUSTRIES_VISUAL = [
  { value: 'retail',     emoji: '🏪', label: "Savdo (Retail)",  desc: "Do'kon, supermarket, optom" },
  { value: 'clinic',     emoji: '🏥', label: 'Klinika',         desc: 'Tibbiy klinika, poliklinika' },
  { value: 'education',  emoji: '🎓', label: "Ta'lim",          desc: "O'quv markazi, kurslar" },
  { value: 'restaurant', emoji: '🍽️', label: 'Restoran',        desc: 'Cafe, restoran, fast food' },
];

const DASHBOARD_WIDGETS = [
  { key: 'revenue',     emoji: '💰', label: 'Kunlik daromad',     desc: 'Bugungi jami sotuv' },
  { key: 'todaySales',  emoji: '🛒', label: 'Bugungi sotuvlar',   desc: 'Sotuv soni va miqdori' },
  { key: 'customers',   emoji: '👥', label: 'Mijozlar',           desc: 'Aktiv mijozlar soni' },
  { key: 'lowStock',    emoji: '📦', label: 'Kam qoldiq',         desc: 'Tugab borayotgan tovarlar' },
  { key: 'weeklyChart', emoji: '📊', label: 'Haftalik grafik',    desc: 'Sotuv dinamikasi grafigi' },
  { key: 'bestSelling', emoji: '🏆', label: "Eng ko'p sotilgan", desc: "TOP mahsulotlar ro'yxati" },
];

const RECEIPT_FIELDS = [
  { key: 'logo',      label: "Do'kon logosi",  required: false },
  { key: 'storeName', label: "Do'kon nomi",    required: true  },
  { key: 'address',   label: 'Manzil',         required: false },
  { key: 'phone',     label: 'Telefon',        required: false },
  { key: 'barcode',   label: 'Barcode',        required: false },
  { key: 'discount',  label: 'Chegirma',       required: false },
  { key: 'change',    label: 'Qaytim',         required: false },
];

const INDUSTRY_PRESETS: Record<string, { modules: string[]; roles: string[] }> = {
  retail:     { modules: ['pos', 'products', 'customers', 'payments', 'warehouse', 'sales', 'reports', 'suppliers'],    roles: ['admin', 'cashier', 'warehouse_manager', 'accountant', 'sales_manager'] },
  clinic:     { modules: ['pos', 'products', 'patients', 'appointments', 'doctors', 'pharmacy', 'payments', 'reports'], roles: ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'accountant'] },
  education:  { modules: ['pos', 'products', 'students', 'courses', 'teachers', 'attendance', 'payments', 'schedule'],  roles: ['admin', 'teacher', 'student', 'receptionist', 'accountant', 'curator'] },
  restaurant: { modules: ['pos', 'products', 'orders', 'kitchen', 'tables', 'delivery', 'payments', 'warehouse'],       roles: ['admin', 'waiter', 'cook', 'cashier', 'delivery_courier', 'warehouse_manager'] },
};

const MODULE_META: Record<string, { label: string; emoji: string }> = {
  pos:          { emoji: '🖥️',  label: 'Sotuv (POS)' },
  products:     { emoji: '📦',  label: 'Mahsulotlar' },
  sales:        { emoji: '🛒',  label: 'Sotuv tarixi' },
  warehouse:    { emoji: '🏭',  label: 'Sklad' },
  customers:    { emoji: '👥',  label: 'Mijozlar' },
  payments:     { emoji: '💳',  label: "To'lovlar" },
  reports:      { emoji: '📊',  label: 'Hisobotlar' },
  suppliers:    { emoji: '🚚',  label: "Ta'minotchilar" },
  patients:     { emoji: '🏥',  label: 'Bemorlar' },
  appointments: { emoji: '📅',  label: 'Qabullar' },
  doctors:      { emoji: '👨‍⚕️', label: 'Shifokorlar' },
  pharmacy:     { emoji: '💊',  label: 'Dorixona' },
  students:     { emoji: '🎓',  label: "O'quvchilar" },
  courses:      { emoji: '📚',  label: 'Kurslar' },
  teachers:     { emoji: '👨‍🏫', label: "O'qituvchilar" },
  attendance:   { emoji: '✅',  label: 'Davomat' },
  schedule:     { emoji: '🗓️', label: 'Jadval' },
  orders:       { emoji: '🧾',  label: 'Buyurtmalar' },
  kitchen:      { emoji: '👨‍🍳', label: 'Oshxona' },
  tables:       { emoji: '🪑',  label: 'Stollar' },
  delivery:     { emoji: '🚴',  label: 'Yetkazib berish' },
};

const ROLE_META: Record<string, { label: string; emoji: string }> = {
  admin:             { emoji: '👑',   label: 'Admin' },
  cashier:           { emoji: '💰',   label: 'Kassir' },
  warehouse_manager: { emoji: '🏭',   label: 'Sklad boshqaruvchi' },
  accountant:        { emoji: '📒',   label: 'Buxgalter' },
  sales_manager:     { emoji: '🤝',   label: 'Sotuv menejeri' },
  doctor:            { emoji: '👨‍⚕️', label: 'Shifokor' },
  nurse:             { emoji: '👩‍⚕️', label: 'Hamshira' },
  receptionist:      { emoji: '🖥️',  label: 'Qabulchi' },
  pharmacist:        { emoji: '💊',   label: 'Dorixonachi' },
  teacher:           { emoji: '👨‍🏫', label: "O'qituvchi" },
  student:           { emoji: '🎓',   label: "O'quvchi" },
  curator:           { emoji: '📋',   label: 'Kurator' },
  waiter:            { emoji: '🍽️',  label: 'Ofitsiant' },
  cook:              { emoji: '👨‍🍳', label: 'Oshpaz' },
  delivery_courier:  { emoji: '🛵',   label: 'Yetkazuvchi' },
};

const COLOR_PRESETS = [
  '#6366f1', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#ec4899', '#1e3a8a',
];

const STEP_LABELS = ['Soha', 'Dashboard', 'Modullar', 'Chek', 'Rollar', 'Dizayn'];
const STEP_DESCS  = [
  'Biznesingiz sohasini tanlang',
  'Dashboard vidjеtlarini sozlang',
  'Qaysi modullar kerak?',
  "Chek ko'rinishini sozlang",
  'Xodimlar rollarini belgilang',
  "CRM ko'rinishini moslashtiring",
];

const INDUSTRY_LABEL: Record<string, string> = Object.fromEntries(
  INDUSTRIES_VISUAL.map((i) => [i.value, i.label]),
);

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));

const timeAgo = (date: string | null): string => {
  if (!date) return "Ma'lumot yo'q";
  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'Az vaqt oldin';
  if (hours < 24) return `${hours} soat oldin`;
  return `${Math.floor(hours / 24)} kun oldin`;
};

// ── Permission data (mirrors backend) ─────────────────────────────────────────

const PERMISSION_LABELS: Record<string, string> = {
  pos:             'POS sotuv',
  sales:           'Sotuv tarixi',
  customers:       'Mijozlar',
  payments:        "To'lovlar",
  warehouse:       'Sklad',
  products:        'Mahsulotlar',
  reports:         'Hisobotlar',
  suppliers:       "Ta'minotchilar",
  deliveries:      'Yetkazib berish',
  settings:        'Sozlamalar',
  users:           'Xodimlar boshqaruvi',
  delete:          "O'chirish huquqi",
  patients:        'Bemorlar',
  appointments:    'Qabullar',
  medical_records: 'Tibbiy kartalar',
  pharmacy:        'Dorixona',
  lab:             'Laboratoriya',
  students:        "O'quvchilar",
  courses:         'Kurslar',
  attendance:      'Davomat',
  exams:           'Imtihonlar',
  certificates:    'Sertifikatlar',
  schedule:        'Jadval',
  menu:            'Menyu',
  orders:          'Buyurtmalar',
  kitchen:         'Oshxona',
  tables:          'Stollar',
};

interface FrontendRolePerm {
  modules: string[];
  canDeleteData: boolean;
  canAccessSettings: boolean;
}

const ROLE_PERMS: Record<string, Record<string, FrontendRolePerm>> = {
  retail: {
    admin:             { modules: ['*'], canDeleteData: true,  canAccessSettings: true  },
    cashier:           { modules: ['pos','sales','customers','payments'],              canDeleteData: false, canAccessSettings: false },
    warehouse_manager: { modules: ['warehouse','products','suppliers'],                canDeleteData: false, canAccessSettings: false },
    accountant:        { modules: ['payments','reports','sales'],                      canDeleteData: false, canAccessSettings: false },
    sales_manager:     { modules: ['sales','customers','reports','pos'],               canDeleteData: false, canAccessSettings: false },
    courier:           { modules: ['deliveries'],                                      canDeleteData: false, canAccessSettings: false },
  },
  clinic: {
    admin:          { modules: ['*'], canDeleteData: true,  canAccessSettings: true  },
    doctor:         { modules: ['patients','appointments','medical_records'],          canDeleteData: false, canAccessSettings: false },
    nurse:          { modules: ['patients','appointments'],                            canDeleteData: false, canAccessSettings: false },
    receptionist:   { modules: ['appointments','patients','payments'],                 canDeleteData: false, canAccessSettings: false },
    pharmacist:     { modules: ['pharmacy'],                                           canDeleteData: false, canAccessSettings: false },
    lab_technician: { modules: ['lab','patients'],                                     canDeleteData: false, canAccessSettings: false },
    accountant:     { modules: ['payments','reports'],                                 canDeleteData: false, canAccessSettings: false },
  },
  education: {
    admin:        { modules: ['*'], canDeleteData: true,  canAccessSettings: true  },
    teacher:      { modules: ['students','attendance','exams','courses','schedule'],   canDeleteData: false, canAccessSettings: false },
    receptionist: { modules: ['students','payments','schedule'],                       canDeleteData: false, canAccessSettings: false },
    accountant:   { modules: ['payments','reports'],                                   canDeleteData: false, canAccessSettings: false },
    curator:      { modules: ['students','attendance','courses','certificates'],       canDeleteData: false, canAccessSettings: false },
  },
  restaurant: {
    admin:            { modules: ['*'], canDeleteData: true,  canAccessSettings: true  },
    waiter:           { modules: ['orders','tables','menu'],                           canDeleteData: false, canAccessSettings: false },
    cook:             { modules: ['orders','kitchen','menu'],                          canDeleteData: false, canAccessSettings: false },
    cashier:          { modules: ['payments','orders','tables'],                       canDeleteData: false, canAccessSettings: false },
    delivery_courier: { modules: ['deliveries','orders'],                              canDeleteData: false, canAccessSettings: false },
    accountant:       { modules: ['payments','reports'],                               canDeleteData: false, canAccessSettings: false },
  },
};

// ── Interfaces ─────────────────────────────────────────────────────────────────

interface WizardReceipt {
  fields: string[];
  width: '58mm' | '80mm';
  thankYouText: string;
}

interface WizardTheme {
  shopName: string;
  address: string;
  phone: string;
  logo: string;
  primaryColor: string;
  style: 'modern' | 'classic' | 'minimal';
  darkMode: boolean;
}

interface WizardData {
  industry: string;
  dashboardWidgets: string[];
  modules: string[];
  receipt: WizardReceipt;
  roles: string[];
  theme: WizardTheme;
  customPermissions: Record<string, string[]>;
}

function freshData(): WizardData {
  const preset = INDUSTRY_PRESETS['retail'];
  return {
    industry: 'retail',
    dashboardWidgets: ['revenue', 'todaySales', 'lowStock', 'weeklyChart'],
    modules: preset.modules,
    receipt: { fields: ['storeName', 'address', 'phone', 'discount', 'change'], width: '80mm', thankYouText: 'Rahmat! Qaytib keling!' },
    roles: preset.roles,
    theme: { shopName: '', address: '', phone: '', logo: '', primaryColor: '#6366f1', style: 'modern', darkMode: false },
    customPermissions: {},
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function WizardSidebar({ step, onGoTo }: { step: number; onGoTo: (s: number) => void }) {
  return (
    <div className="wz-sidebar">
      <div className="wz-sidebar-title">CRM Yaratish</div>
      <div className="wz-steps">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const isDone   = n < step;
          const isActive = n === step;
          return (
            <div
              key={n}
              className={`wz-step${isActive ? ' wz-step--active' : ''}${isDone ? ' wz-step--done' : ''}`}
              onClick={() => isDone && onGoTo(n)}
              style={{ cursor: isDone ? 'pointer' : 'default' }}
            >
              <div className="wz-step-num">{isDone ? '✓' : n}</div>
              <div className="wz-step-label">{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReceiptPreview({ receipt, theme }: { receipt: WizardReceipt; theme: WizardTheme }) {
  const has = (f: string) => receipt.fields.includes(f);
  return (
    <div className="wz-preview-wrap">
      <div className="wz-preview-box">
        {has('logo') && (
          <div className="wz-preview-center">
            {theme.logo
              ? <img src={theme.logo} alt="logo" style={{ height: 36, marginBottom: 6 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              : <div className="wz-preview-logo">LOGO</div>
            }
          </div>
        )}
        {has('storeName') && <div className="wz-preview-center wz-preview-shop">{theme.shopName || "Do'kon nomi"}</div>}
        {has('address')   && theme.address && <div className="wz-preview-center" style={{ fontSize: '0.7rem', opacity: 0.7 }}>{theme.address}</div>}
        {has('phone')     && theme.phone   && <div className="wz-preview-center" style={{ fontSize: '0.7rem', opacity: 0.7 }}>{theme.phone}</div>}
        <hr className="wz-preview-divider" />
        <div className="wz-preview-row"><span>Chek:</span><span>#0001</span></div>
        <div className="wz-preview-row"><span>Sana:</span><span>{new Date().toLocaleDateString('uz-UZ')}</span></div>
        <hr className="wz-preview-divider" />
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontWeight: 600 }}>Coca Cola 0.5L</div>
          <div className="wz-preview-row" style={{ opacity: 0.7 }}><span>2 × 8,000</span><span>16,000</span></div>
        </div>
        {has('discount') && <div className="wz-preview-row" style={{ color: '#10b981' }}><span>Chegirma:</span><span>-1,000</span></div>}
        <div className="wz-preview-total wz-preview-row"><span>To'landi:</span><span>15,000 so'm</span></div>
        {has('change')   && <div className="wz-preview-row"><span>Qaytim:</span><span>5,000</span></div>}
        <hr className="wz-preview-divider" />
        <div className="wz-preview-thanks">{receipt.thankYouText || 'Rahmat!'}</div>
      </div>
    </div>
  );
}

const STYLE_SIDEBAR: Record<string, React.CSSProperties> = {
  modern:  { borderRadius: '0 12px 12px 0' },
  classic: { borderRadius: 0, borderRight: '2px solid rgba(255,255,255,0.25)' },
  minimal: { background: 'transparent', borderRight: '1px solid rgba(255,255,255,0.2)' },
};

const STYLE_CARD: Record<string, React.CSSProperties> = {
  modern:  { borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' },
  classic: { borderRadius: 3, border: '1px solid rgba(0,0,0,0.12)', boxShadow: 'none' },
  minimal: { borderRadius: 0, border: 'none', borderBottom: '2px solid', boxShadow: 'none', background: 'transparent' },
};

const STYLE_BTN: Record<string, React.CSSProperties> = {
  modern:  { borderRadius: 6 },
  classic: { borderRadius: 3 },
  minimal: { borderRadius: 99 },
};

function CrmPreview({ theme }: { theme: WizardTheme }) {
  const primary = theme.primaryColor || '#6366f1';
  const s       = theme.style || 'modern';
  const bg      = theme.darkMode ? '#0f172a' : '#f8fafc';
  const textPrimary = theme.darkMode ? '#f1f5f9' : '#0f172a';
  const textMuted   = theme.darkMode ? '#94a3b8' : '#64748b';
  const cardBg      = theme.darkMode ? '#1e293b' : '#fff';

  return (
    <div className="wz-crm-preview" data-style={s}>
      <div className="wz-crm-preview-bar" style={{ background: primary, color: '#fff' }}>
        {theme.shopName || "Do'kon"}
      </div>
      <div style={{ display: 'flex', height: 220 }}>
        <div
          className="wz-crm-preview-nav"
          style={{ width: 110, background: s === 'minimal' ? 'transparent' : primary, borderRight: `1px solid ${s === 'minimal' ? 'var(--border,#e2e8f0)' : 'transparent'}`, ...STYLE_SIDEBAR[s] }}
        >
          {['Dashboard', 'Sotuv (POS)', 'Mahsulotlar', 'Mijozlar'].map((item, i) => (
            <div
              key={item}
              className={`wz-crm-preview-item${i === 0 ? ' wz-crm-preview-item--active' : ''}`}
              style={i === 0
                ? { background: s === 'minimal' ? 'transparent' : 'rgba(255,255,255,0.2)', color: s === 'minimal' ? primary : '#fff', fontWeight: 700 }
                : { color: s === 'minimal' ? textMuted : 'rgba(255,255,255,0.65)' }
              }
            >
              {item}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, padding: '0.75rem', background: bg }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.6rem', color: textPrimary }}>
            Dashboard
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
            {[['Daromad', '1,240,000'], ['Sotuvlar', '24']].map(([label, val]) => (
              <div key={label} style={{
                background: cardBg,
                borderTop: `3px solid ${primary}`,
                padding: '0.4rem 0.5rem',
                ...STYLE_CARD[s],
                ...(s === 'minimal' ? { borderBottomColor: primary } : {}),
              }}>
                <div style={{ fontSize: '0.55rem', color: textMuted }}>{label}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: textPrimary }}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <button style={{
              fontSize: '0.6rem', padding: '0.2rem 0.5rem',
              background: primary, color: '#fff', border: 'none', cursor: 'default',
              ...STYLE_BTN[s],
            }}>
              + Yangi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Logo upload component ──────────────────────────────────────────────────────

function LogoUpload({
  value, onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef               = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragover,  setDragover]  = useState(false);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post<{ url: string }>('/upload/logo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange(data.url);
    } catch {
      alert('Yuklashda xatolik. Faqat PNG/JPG/SVG (max 2MB)');
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragover(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  return (
    <div>
      {value && (
        <div className="logo-upload-row">
          <img
            src={value.startsWith('/uploads/') ? `http://localhost:3000${value}` : value}
            alt="logo preview"
            className="logo-preview"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <button className="logo-remove-btn" onClick={() => onChange('')}>
            Olib tashlash
          </button>
        </div>
      )}

      <div
        className={`logo-upload-area${dragover ? ' dragover' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
        onDragLeave={() => setDragover(false)}
        onDrop={onDrop}
      >
        <div className="logo-upload-icon">{uploading ? '⏳' : '📷'}</div>
        <div className="logo-upload-text">
          {uploading ? 'Yuklanmoqda...' : 'Logo yuklang — PNG, JPG, SVG (max 2MB)'}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
          style={{ display: 'none' }}
          onChange={onFileChange}
        />
      </div>

      <div className="logo-url-sep">Yoki URL kiriting:</div>
      <input
        className="wz-input"
        type="url"
        placeholder="https://example.com/logo.png"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// ── Role card with permissions accordion ──────────────────────────────────────

function RoleCard({
  roleKey, active, required, industry, allModules, customPermissions, onToggle, onTogglePerm,
}: {
  roleKey: string; active: boolean; required: boolean;
  industry: string; allModules: string[];
  customPermissions: Record<string, string[]>;
  onToggle: () => void;
  onTogglePerm: (role: string, module: string) => void;
}) {
  const r       = ROLE_META[roleKey];
  const perm    = ROLE_PERMS[industry]?.[roleKey];
  const isAdmin = perm?.modules[0] === '*';

  // Effective allowed list: custom override or default (intersected with allModules)
  const defaultAllowed = isAdmin
    ? allModules
    : (perm?.modules ?? []).filter((m) => allModules.includes(m));
  const effectiveAllowed = customPermissions[roleKey] ?? defaultAllowed;

  return (
    <div
      className={`wz-card${active ? ' wz-card--active' : ''}${required ? ' wz-card--required' : ''}`}
      onClick={onToggle}
    >
      {required
        ? <div className="wz-card-badge">Majburiy</div>
        : active && <div className="wz-card-check">✓</div>
      }
      <div className="wz-card-icon">{r?.emoji ?? '👤'}</div>
      <div className="wz-card-title">{r?.label ?? roleKey}</div>

      {active && perm && (
        <div className="wz-perms-accordion" onClick={(e) => e.stopPropagation()}>
          <div className="wz-perms-title">▾ Ruxsatlar:</div>

          {allModules.map((m) => {
            const on = isAdmin || effectiveAllowed.includes(m);
            return (
              <div key={m} className={`wz-perm-item ${on ? 'wz-perm-item--allow' : 'wz-perm-item--deny'}`}>
                <span>{on ? '✅' : '❌'}</span>
                <span style={{ flex: 1 }}>{PERMISSION_LABELS[m] ?? m}</span>
                <label className="wz-perm-toggle" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={isAdmin}
                    onChange={() => onTogglePerm(roleKey, m)}
                  />
                  <span className="wz-perm-toggle-slider" />
                </label>
              </div>
            );
          })}

          {/* Read-only special permissions */}
          <div className={`wz-perm-item ${perm.canDeleteData ? 'wz-perm-item--allow' : 'wz-perm-item--deny'}`}>
            <span>{perm.canDeleteData ? '✅' : '❌'}</span>
            <span style={{ flex: 1 }}>{PERMISSION_LABELS['delete']}</span>
          </div>
          <div className={`wz-perm-item ${perm.canAccessSettings ? 'wz-perm-item--allow' : 'wz-perm-item--deny'}`}>
            <span>{perm.canAccessSettings ? '✅' : '❌'}</span>
            <span style={{ flex: 1 }}>{PERMISSION_LABELS['settings']}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tenant detail modal ────────────────────────────────────────────────────────

const DAY_UZ = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];
const PIE_COLORS = ['#10b981', '#6366f1', '#f59e0b'];
const TAB_LABELS: Record<string, string> = { umumiy: 'Umumiy', statistika: 'Statistika', modullar: 'Modullar', dizayn: 'Dizayn' };

function TenantDetailModal({
  detail, onClose, onEdit, onDelete,
}: {
  detail: TenantDetail;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [tab, setTab]               = useState<'umumiy' | 'statistika' | 'modullar' | 'dizayn'>('umumiy');
  const [localModules, setLocal]    = useState(detail.wizardConfig?.modules ?? []);
  const [localTheme, setLocalTheme] = useState<WizardTheme>({
    shopName:     detail.wizardConfig?.theme?.shopName     ?? detail.name,
    address:      detail.wizardConfig?.theme?.address      ?? '',
    phone:        detail.wizardConfig?.theme?.phone        ?? '',
    logo:         detail.wizardConfig?.theme?.logo         ?? '',
    primaryColor: detail.wizardConfig?.theme?.primaryColor ?? '#6366f1',
    style:        (detail.wizardConfig?.theme?.style as WizardTheme['style']) ?? 'modern',
    darkMode:     detail.wizardConfig?.theme?.darkMode     ?? false,
  });
  const [saving, setSaving] = useState(false);

  const wc       = detail.wizardConfig;
  const s        = detail.stats;
  const industry = wc?.industry ?? 'retail';
  const allMods  = INDUSTRY_PRESETS[industry]?.modules ?? [];

  const chartData = (s.weeklyChart ?? []).map((d) => ({
    ...d, day: DAY_UZ[new Date(d.date + 'T00:00:00').getDay()],
  }));

  const pieData = [
    { name: 'Naqd',   value: s.paymentBreakdown?.cash   ?? 0 },
    { name: 'Karta',  value: s.paymentBreakdown?.card   ?? 0 },
    { name: 'Nasiya', value: s.paymentBreakdown?.credit ?? 0 },
  ].filter((d) => d.value > 0);

  const toggleModule = async (key: string) => {
    if (['pos', 'products'].includes(key)) return;
    const prev = localModules;
    const next = prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key];
    setLocal(next);
    try { await api.patch(`/wizard/${detail.id}`, { modules: next }); }
    catch { setLocal(prev); }
  };

  const saveDesign = async () => {
    setSaving(true);
    try { await api.patch(`/wizard/${detail.id}`, { theme: localTheme }); }
    finally { setSaving(false); }
  };

  return (
    <div className="td-modal" onClick={onClose}>
      <div className="td-inner" onClick={(e) => e.stopPropagation()}>

        {/* HEADER */}
        <div className="td-header">
          <span className="td-header-title">{detail.name}</span>
          {wc && <span className="industry-badge">{INDUSTRY_LABEL[industry] ?? industry}</span>}
          <span className={`status-dot status-dot--${detail.isActive ? 'active' : 'inactive'}`}>
            {detail.isActive ? '● Faol' : '● Nofaol'}
          </span>
          <div className="td-header-actions">
            <button className="btn-secondary" onClick={onEdit}>Tahrirlash</button>
            <button className="btn-danger" onClick={onDelete}>O'chirish</button>
            <button className="td-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* TAB BAR */}
        <div className="td-tabs">
          {(['umumiy', 'statistika', 'modullar', 'dizayn'] as const).map((t) => (
            <div key={t} className={`td-tab${tab === t ? ' td-tab--active' : ''}`} onClick={() => setTab(t)}>
              {TAB_LABELS[t]}
            </div>
          ))}
        </div>

        {/* BODY */}
        <div className="td-body">

          {/* ── TAB 1: UMUMIY ── */}
          {tab === 'umumiy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="tenant-info-block">
                <div className="tenant-info-row"><span>Do'kon nomi:</span><span>{detail.name}</span></div>
                <div className="tenant-info-row"><span>Slug:</span><code>{detail.slug}</code></div>
                <div className="tenant-info-row"><span>Soha:</span><span className="industry-badge">{INDUSTRY_LABEL[industry] ?? industry}</span></div>
                <div className="tenant-info-row"><span>Yaratilgan:</span><span>{new Date(detail.createdAt).toLocaleDateString('uz-UZ')}</span></div>
                <div className="tenant-info-row"><span>Oxirgi faollik:</span><span>{timeAgo(s.lastActivity)}</span></div>
              </div>

              {wc && (
                <>
                  <div>
                    <div className="tenant-section-title" style={{ marginBottom: '0.5rem' }}>MODULLAR</div>
                    <div className="tenant-module-tags">
                      {wc.modules.map((m) => <span key={m} className="module-tag">{MODULE_META[m]?.label ?? m}</span>)}
                    </div>
                  </div>
                  <div>
                    <div className="tenant-section-title" style={{ marginBottom: '0.5rem' }}>ROLLAR</div>
                    <div className="tenant-module-tags">
                      {wc.roles.map((r) => <span key={r} className="role-tag">{ROLE_META[r]?.label ?? r}</span>)}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── TAB 2: STATISTIKA ── */}
          {tab === 'statistika' && (
            <div>
              {/* 4 stat cards */}
              <div className="td-stat-cards">
                {[
                  { icon: '💰', val: `${fmt(s.totalRevenue)} so'm`,    label: 'Jami tushum' },
                  { icon: '🛒', val: `${s.totalSales} ta`,              label: 'Jami sotuvlar' },
                  { icon: '👥', val: `${s.totalCustomers} ta`,          label: 'Mijozlar' },
                  { icon: '📊', val: `${fmt(s.avgOrderValue)} so'm`,    label: "O'rtacha chek" },
                ].map((c) => (
                  <div key={c.label} className="td-stat-card">
                    <div className="td-stat-card-icon">{c.icon}</div>
                    <div className="td-stat-card-val">{c.val}</div>
                    <div className="td-stat-card-label">{c.label}</div>
                  </div>
                ))}
              </div>

              {/* Charts row */}
              <div className="td-charts-row">
                {/* Weekly bar+line chart */}
                <div className="td-chart-box">
                  <div className="td-chart-title">Haftalik ko'rsatkich (oxirgi 7 kun)</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                        tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                        formatter={(v: unknown, name: unknown) => name === 'Tushum' ? [`${fmt(v as number)} so'm`, name as string] : [`${v}`, name as string]}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar yAxisId="left" dataKey="revenue" name="Tushum" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      <Line yAxisId="right" type="monotone" dataKey="salesCount" name="Sotuvlar" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Payment pie */}
                <div className="td-chart-box">
                  <div className="td-chart-title">To'lov taqsimoti</div>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={70} labelLine={false}
                          label={({ name, percent }: { name?: string; percent?: number }) =>
                            (percent ?? 0) > 0.05 ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%` : ''
                          }
                        >
                          {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                          formatter={(v: unknown) => [`${v}%`, '']} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Sotuvlar mavjud emas
                    </div>
                  )}
                </div>
              </div>

              {/* Top products */}
              {(s.topProducts ?? []).length > 0 && (
                <div className="td-chart-box">
                  <div className="td-chart-title">Top 5 mahsulot</div>
                  <table className="td-top-products">
                    <thead>
                      <tr><th>#</th><th>Mahsulot</th><th>Sotilgan</th><th>Tushum</th></tr>
                    </thead>
                    <tbody>
                      {s.topProducts.map((p, i) => (
                        <tr key={p.name}>
                          <td style={{ color: 'var(--text-muted)', width: 32 }}>{i + 1}</td>
                          <td style={{ fontWeight: 500 }}>{p.name}</td>
                          <td>{p.totalQty} dona</td>
                          <td>{fmt(p.totalRevenue)} so'm</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: MODULLAR ── */}
          {tab === 'modullar' && (
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Toggle bosib modul qo'shing yoki olib tashlang. O'zgarishlar darhol saqlanadi.
              </p>
              <div className="td-module-list">
                {allMods.map((key) => {
                  const m        = MODULE_META[key];
                  const required = key === 'pos' || key === 'products';
                  const on       = localModules.includes(key);
                  return (
                    <div key={key} className="td-module-item">
                      <div className="td-module-info">
                        <div className="td-module-name">{m?.emoji} {m?.label ?? key}</div>
                        <div className="td-module-sub">{required ? 'Majburiy modul' : 'Ixtiyoriy modul'}</div>
                      </div>
                      <label className="wz-toggle td-module-toggle" style={{ pointerEvents: required ? 'none' : 'auto', opacity: required ? 0.5 : 1 }}>
                        <input type="checkbox" checked={on} disabled={required} onChange={() => toggleModule(key)} />
                        <span className="wz-toggle-slider" />
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TAB 4: DIZAYN ── */}
          {tab === 'dizayn' && (
            <div className="td-design-panel">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="wz-form-group">
                  <label className="wz-label">Do'kon nomi</label>
                  <input className="wz-input" value={localTheme.shopName} onChange={(e) => setLocalTheme((t) => ({ ...t, shopName: e.target.value }))} />
                </div>
                <div className="wz-form-group">
                  <label className="wz-label">Logo</label>
                  <LogoUpload value={localTheme.logo} onChange={(url) => setLocalTheme((t) => ({ ...t, logo: url }))} />
                </div>
                <div className="wz-form-group">
                  <label className="wz-label">Asosiy rang</label>
                  <div className="wz-color-grid">
                    {COLOR_PRESETS.map((color) => (
                      <button key={color} type="button"
                        className={`wz-color-swatch${localTheme.primaryColor === color ? ' wz-color-swatch--active' : ''}`}
                        style={{ background: color }}
                        onClick={() => setLocalTheme((t) => ({ ...t, primaryColor: color }))}
                      />
                    ))}
                    <input type="color" className="wz-color-swatch" style={{ padding: 0, cursor: 'pointer' }}
                      value={localTheme.primaryColor}
                      onChange={(e) => setLocalTheme((t) => ({ ...t, primaryColor: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="wz-form-group">
                  <label className="wz-label">Uslub</label>
                  <div className="wz-style-grid">
                    {(['modern', 'classic', 'minimal'] as const).map((st) => (
                      <div key={st}
                        className={`wz-style-card${localTheme.style === st ? ' wz-style-card--active' : ''}`}
                        onClick={() => setLocalTheme((t) => ({ ...t, style: st }))}
                      >
                        {{ modern: 'Zamonaviy', classic: 'Klassik', minimal: 'Minimal' }[st]}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="wz-form-group">
                  <label className="wz-label">Rejim</label>
                  <div className="wz-dark-toggle">
                    <div className={`wz-dark-option${!localTheme.darkMode ? ' wz-dark-option--active' : ''}`} onClick={() => setLocalTheme((t) => ({ ...t, darkMode: false }))}>☀️ Yorug'</div>
                    <div className={`wz-dark-option${localTheme.darkMode ? ' wz-dark-option--active' : ''}`}  onClick={() => setLocalTheme((t) => ({ ...t, darkMode: true }))}>🌙 Qorong'i</div>
                  </div>
                </div>
                <button className="btn-primary" onClick={saveDesign} disabled={saving} style={{ alignSelf: 'flex-start' }}>
                  {saving ? 'Saqlanmoqda...' : '💾 Saqlash'}
                </button>
              </div>
              <div>
                <div className="tenant-section-title" style={{ marginBottom: '0.75rem' }}>PREVIEW</div>
                <CrmPreview theme={localTheme} />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Delete confirm dialog ──────────────────────────────────────────────────────

function DeleteConfirmDialog({
  name, deleting, onCancel, onConfirm,
}: {
  name: string; deleting: boolean;
  onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-icon">⚠️</div>
        <h3>Diqqat!</h3>
        <p><strong>"{name}"</strong> CRM ni o'chirasizmi?</p>
        <p className="confirm-warning">Bu amalni qaytarib bo'lmaydi. Barcha ma'lumotlar o'chadi.</p>
        <div className="confirm-actions">
          <button className="btn-secondary" onClick={onCancel} disabled={deleting}>Bekor</button>
          <button className="btn-danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? "O'chirilmoqda..." : "Ha, o'chir"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Tenants() {
  const user = useAuthStore((s) => s.user);
  const [tenants,    setTenants]    = useState<Tenant[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [showWizard,       setShowWizard]       = useState(false);
  const [step,             setStep]             = useState(1);
  const [data,             setData]             = useState<WizardData>(freshData);
  const [submitting,       setSubmitting]       = useState(false);
  const [formError,        setFormError]        = useState('');
  const [editingTenantId,  setEditingTenantId]  = useState<string | null>(null);
  const [detailTenant,     setDetailTenant]     = useState<TenantDetail | null>(null);
  const [showDetail,       setShowDetail]       = useState(false);
  const [detailLoading,    setDetailLoading]    = useState(false);
  const [deleteTarget,     setDeleteTarget]     = useState<Tenant | null>(null);
  const [deleting,         setDeleting]         = useState(false);

  const fetchTenants = async () => {
    try {
      const { data: res } = await api.get<Tenant[]>('/tenants');
      setTenants(res);
    } catch {
      setError("Ma'lumot yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTenants(); }, []);

  const openWizard  = () => {
    setEditingTenantId(null);
    setData(freshData());
    setStep(1);
    setFormError('');
    setShowWizard(true);
  };
  const closeWizard = () => {
    setShowWizard(false);
    setEditingTenantId(null);
  };

  const handleView = async (id: string) => {
    setDetailLoading(true);
    try {
      const { data: res } = await api.get<TenantDetail>(`/tenants/${id}`);
      setDetailTenant(res);
      setShowDetail(true);
    } catch { setError("Detail yuklab bo'lmadi"); }
    finally { setDetailLoading(false); }
  };

  const handleEdit = async (id: string) => {
    setDetailLoading(true);
    try {
      const { data: res } = await api.get<TenantDetail>(`/tenants/${id}`);
      const wc = res.wizardConfig;
      setData(wc ? {
        industry:          wc.industry,
        dashboardWidgets:  wc.dashboard?.widgets ?? [],
        modules:           wc.modules,
        receipt:           wc.receipt  ?? freshData().receipt,
        roles:             wc.roles,
        theme:             { ...freshData().theme, ...wc.theme },
        customPermissions: {},
      } : freshData());
      setShowDetail(false);
      setEditingTenantId(id);
      setStep(1);
      setFormError('');
      setShowWizard(true);
    } catch { setError("Tahrirlash uchun yuklab bo'lmadi"); }
    finally { setDetailLoading(false); }
  };

  const toggleStatus = async (t: Tenant) => {
    try {
      await api.patch(`/tenants/${t.id}`, { isActive: !t.isActive });
      setTenants((ts) => ts.map((x) => x.id === t.id ? { ...x, isActive: !x.isActive } : x));
    } catch { /* silent */ }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/tenants/${deleteTarget.id}`);
      setTenants((ts) => ts.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
      setShowDetail(false);
    } catch { setError("O'chirishda xatolik"); }
    finally { setDeleting(false); }
  };

  const changeIndustry = (industry: string) => {
    const preset = INDUSTRY_PRESETS[industry] ?? { modules: [], roles: [] };
    setData((d) => ({ ...d, industry, modules: preset.modules, roles: preset.roles, customPermissions: {} }));
  };

  const toggleWidget = (key: string) =>
    setData((d) => ({
      ...d,
      dashboardWidgets: d.dashboardWidgets.includes(key)
        ? d.dashboardWidgets.filter((w) => w !== key)
        : [...d.dashboardWidgets, key],
    }));

  const toggleModule = (key: string) => {
    if (key === 'pos' || key === 'products') return;
    setData((d) => ({
      ...d,
      modules: d.modules.includes(key)
        ? d.modules.filter((m) => m !== key)
        : [...d.modules, key],
    }));
  };

  const toggleRole = (key: string) => {
    if (key === 'admin') return;
    setData((d) => ({
      ...d,
      roles: d.roles.includes(key)
        ? d.roles.filter((r) => r !== key)
        : [...d.roles, key],
    }));
  };

  const togglePermission = (roleKey: string, moduleKey: string) => {
    setData((d) => {
      const perm = ROLE_PERMS[d.industry]?.[roleKey];
      const defaultAllowed = perm?.modules[0] === '*'
        ? d.modules
        : (perm?.modules ?? []).filter((m) => d.modules.includes(m));
      const current = d.customPermissions[roleKey] ?? defaultAllowed;
      const next = current.includes(moduleKey)
        ? current.filter((m) => m !== moduleKey)
        : [...current, moduleKey];
      return { ...d, customPermissions: { ...d.customPermissions, [roleKey]: next } };
    });
  };

  const toggleReceiptField = (key: string) => {
    if (key === 'storeName') return;
    setData((d) => ({
      ...d,
      receipt: {
        ...d.receipt,
        fields: d.receipt.fields.includes(key)
          ? d.receipt.fields.filter((f) => f !== key)
          : [...d.receipt.fields, key],
      },
    }));
  };

  const setTheme   = (p: Partial<WizardTheme>)   => setData((d) => ({ ...d, theme:   { ...d.theme,   ...p } }));
  const setReceipt = (p: Partial<WizardReceipt>) => setData((d) => ({ ...d, receipt: { ...d.receipt, ...p } }));

  const handleSubmit = async () => {
    if (!user) return;
    setFormError('');
    setSubmitting(true);
    const hasCustomPerms = Object.keys(data.customPermissions).length > 0;
    const wizardPayload = {
      industry:  data.industry,
      modules:   data.modules,
      roles:     data.roles,
      theme:     data.theme,
      dashboard: { widgets: data.dashboardWidgets },
      receipt:   data.receipt,
      ...(hasCustomPerms && { permissions: data.customPermissions }),
    };
    try {
      if (editingTenantId) {
        await api.patch(`/tenants/${editingTenantId}`, { name: data.theme.shopName });
        await api.patch(`/wizard/${editingTenantId}`, wizardPayload);
      } else {
        const { data: tenant } = await api.post<Tenant>('/tenants', {
          name:    data.theme.shopName,
          ownerId: user.id,
        });
        await api.post('/wizard/configure', { tenantId: tenant.id, ...wizardPayload });
      }
      closeWizard();
      fetchTenants();
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const preset = INDUSTRY_PRESETS[data.industry] ?? { modules: [], roles: [] };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Tenants</h2>
        <button className="btn-primary" onClick={openWizard}>+ Yangi CRM</button>
      </div>

      {loading && <p className="state-msg">Yuklanmoqda...</p>}
      {error   && <p className="state-msg state-msg--error">{error}</p>}

      {detailLoading && <p className="state-msg">Yuklanmoqda...</p>}

      {!loading && !error && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nomi</th>
                <th>Soha</th>
                <th>Modullar</th>
                <th>Status</th>
                <th>Yaratilgan</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Hech qanday tenant topilmadi</td></tr>
              ) : tenants.map((t) => (
                <tr key={t.id}>
                  <td>
                    <button className="tenant-name-link" onClick={() => handleView(t.id)}>{t.name}</button>
                  </td>
                  <td>
                    {t.industry
                      ? <span className="industry-badge">{INDUSTRY_LABEL[t.industry] ?? t.industry}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>
                    }
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {t.moduleCount ? `${t.moduleCount} ta` : '—'}
                  </td>
                  <td>
                    <button
                      className={`status-toggle status-toggle--${t.isActive ? 'active' : 'inactive'}`}
                      onClick={() => toggleStatus(t)}
                    >
                      {t.isActive ? '● Faol' : '● Nofaol'}
                    </button>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {new Date(t.createdAt).toLocaleDateString('uz-UZ')}
                  </td>
                  <td>
                    <div className="action-btns">
                      <button
                        className="action-btn action-btn--view"
                        onClick={() => handleView(t.id)}
                        title="Ko'rish"
                      >
                        Ko'rish
                      </button>
                      <button
                        className="action-btn action-btn--edit"
                        onClick={() => handleEdit(t.id)}
                        title="Tahrirlash"
                      >
                        Tahrirlash
                      </button>
                      <button
                        className="action-btn action-btn--delete"
                        onClick={() => setDeleteTarget(t)}
                        title="O'chirish"
                      >
                        O'chirish
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showDetail && detailTenant && (
        <TenantDetailModal
          detail={detailTenant}
          onClose={() => setShowDetail(false)}
          onEdit={() => handleEdit(detailTenant.id)}
          onDelete={() => { setShowDetail(false); setDeleteTarget({ id: detailTenant.id, name: detailTenant.name, slug: detailTenant.slug, isActive: detailTenant.isActive, createdAt: detailTenant.createdAt }); }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          name={deleteTarget.name}
          deleting={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={executeDelete}
        />
      )}

      {showWizard && (
        <div className="wz-overlay">
          <WizardSidebar step={step} onGoTo={setStep} />

          <div className="wz-content">
            <div className="wz-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2>{STEP_LABELS[step - 1]}</h2>
                <p>{STEP_DESCS[step - 1]}</p>
              </div>
              <button
                onClick={closeWizard}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}
              >
                ✕
              </button>
            </div>

            <div className="wz-body">
              {formError && <p className="form-error" style={{ marginBottom: '1.25rem' }}>{formError}</p>}

              {/* Step 1 — Soha */}
              {step === 1 && (
                <div className="wz-grid-2">
                  {INDUSTRIES_VISUAL.map((ind) => (
                    <div
                      key={ind.value}
                      className={`wz-card${data.industry === ind.value ? ' wz-card--active' : ''}`}
                      onClick={() => changeIndustry(ind.value)}
                    >
                      {data.industry === ind.value && <div className="wz-card-check">✓</div>}
                      <div className="wz-card-icon">{ind.emoji}</div>
                      <div className="wz-card-title">{ind.label}</div>
                      <div className="wz-card-desc">{ind.desc}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 2 — Dashboard */}
              {step === 2 && (
                <div className="wz-grid-3">
                  {DASHBOARD_WIDGETS.map((w) => {
                    const active = data.dashboardWidgets.includes(w.key);
                    return (
                      <div
                        key={w.key}
                        className={`wz-card${active ? ' wz-card--active' : ''}`}
                        onClick={() => toggleWidget(w.key)}
                      >
                        {active && <div className="wz-card-check">✓</div>}
                        <div className="wz-card-icon">{w.emoji}</div>
                        <div className="wz-card-title">{w.label}</div>
                        <div className="wz-card-desc">{w.desc}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Step 3 — Modullar */}
              {step === 3 && (
                <div className="wz-grid-3">
                  {preset.modules.map((key) => {
                    const m        = MODULE_META[key];
                    const active   = data.modules.includes(key);
                    const required = key === 'pos' || key === 'products';
                    return (
                      <div
                        key={key}
                        className={`wz-card${active ? ' wz-card--active' : ''}${required ? ' wz-card--required' : ''}`}
                        onClick={() => toggleModule(key)}
                      >
                        {required
                          ? <div className="wz-card-badge">Majburiy</div>
                          : active && <div className="wz-card-check">✓</div>
                        }
                        <div className="wz-card-icon">{m?.emoji ?? '📦'}</div>
                        <div className="wz-card-title">{m?.label ?? key}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Step 4 — Chek */}
              {step === 4 && (
                <div className="wz-receipt-layout">
                  <div>
                    <div className="wz-toggle-list" style={{ marginBottom: '1.5rem' }}>
                      {RECEIPT_FIELDS.map((f) => {
                        const checked = data.receipt.fields.includes(f.key);
                        return (
                          <div key={f.key} className={`wz-toggle-item${f.required ? ' wz-toggle-item--required' : ''}`}>
                            <div>
                              <div className="wz-toggle-label">{f.label}</div>
                              {f.required && <div className="wz-toggle-sub">Har doim ko'rinadi</div>}
                            </div>
                            <label className="wz-toggle">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={f.required}
                                onChange={() => toggleReceiptField(f.key)}
                              />
                              <span className="wz-toggle-slider" />
                            </label>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <div className="wz-label">Chek kenglik</div>
                      <div className="wz-width-group">
                        {(['58mm', '80mm'] as const).map((w) => (
                          <button
                            key={w}
                            type="button"
                            className={`wz-width-btn${data.receipt.width === w ? ' wz-width-btn--active' : ''}`}
                            onClick={() => setReceipt({ width: w })}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="wz-form-group">
                      <label className="wz-label">Xayrli so'z</label>
                      <input
                        className="wz-input"
                        type="text"
                        value={data.receipt.thankYouText}
                        onChange={(e) => setReceipt({ thankYouText: e.target.value })}
                        placeholder="Rahmat! Qaytib keling!"
                      />
                    </div>
                  </div>
                  <ReceiptPreview receipt={data.receipt} theme={data.theme} />
                </div>
              )}

              {/* Step 5 — Rollar (with permissions accordion) */}
              {step === 5 && (
                <div className="wz-grid-3">
                  {preset.roles.map((key) => {
                    const active   = data.roles.includes(key);
                    const required = key === 'admin';
                    return (
                      <RoleCard
                        key={key}
                        roleKey={key}
                        active={active}
                        required={required}
                        industry={data.industry}
                        allModules={data.modules}
                        customPermissions={data.customPermissions}
                        onToggle={() => toggleRole(key)}
                        onTogglePerm={togglePermission}
                      />
                    );
                  })}
                </div>
              )}

              {/* Step 6 — Dizayn */}
              {step === 6 && (
                <div className="wz-design-layout">
                  <div>
                    <div className="wz-form-group">
                      <label className="wz-label">Do'kon nomi *</label>
                      <input className="wz-input" type="text" placeholder="Alisher Dokon"
                        value={data.theme.shopName} onChange={(e) => setTheme({ shopName: e.target.value })} autoFocus />
                    </div>
                    <div className="wz-form-group">
                      <label className="wz-label">Manzil</label>
                      <input className="wz-input" type="text" placeholder="Toshkent, Chilonzor 5"
                        value={data.theme.address} onChange={(e) => setTheme({ address: e.target.value })} />
                    </div>
                    <div className="wz-form-group">
                      <label className="wz-label">Telefon</label>
                      <input className="wz-input" type="text" placeholder="+998 90 000 00 00"
                        value={data.theme.phone} onChange={(e) => setTheme({ phone: e.target.value })} />
                    </div>
                    <div className="wz-form-group">
                      <label className="wz-label">Logo</label>
                      <LogoUpload value={data.theme.logo} onChange={(url) => setTheme({ logo: url })} />
                    </div>
                    <div className="wz-form-group">
                      <label className="wz-label">Asosiy rang</label>
                      <div className="wz-color-grid">
                        {COLOR_PRESETS.map((color) => (
                          <button
                            key={color} type="button"
                            className={`wz-color-swatch${data.theme.primaryColor === color ? ' wz-color-swatch--active' : ''}`}
                            style={{ background: color }}
                            onClick={() => setTheme({ primaryColor: color })}
                          />
                        ))}
                        <input
                          type="color" className="wz-color-swatch" style={{ padding: 0, cursor: 'pointer' }}
                          value={data.theme.primaryColor}
                          onChange={(e) => setTheme({ primaryColor: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="wz-form-group">
                      <label className="wz-label">Uslub</label>
                      <div className="wz-style-grid">
                        {(['modern', 'classic', 'minimal'] as const).map((s) => (
                          <div key={s}
                            className={`wz-style-card${data.theme.style === s ? ' wz-style-card--active' : ''}`}
                            onClick={() => setTheme({ style: s })}
                          >
                            {{ modern: 'Zamonaviy', classic: 'Klassik', minimal: 'Minimal' }[s]}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="wz-form-group">
                      <label className="wz-label">Rejim</label>
                      <div className="wz-dark-toggle">
                        <div className={`wz-dark-option${!data.theme.darkMode ? ' wz-dark-option--active' : ''}`} onClick={() => setTheme({ darkMode: false })}>☀️ Yorug'</div>
                        <div className={`wz-dark-option${data.theme.darkMode ? ' wz-dark-option--active' : ''}`}  onClick={() => setTheme({ darkMode: true })}>🌙 Qorong'i</div>
                      </div>
                    </div>
                  </div>
                  <CrmPreview theme={data.theme} />
                </div>
              )}
            </div>

            <div className="wz-footer">
              <div>
                {step > 1 && (
                  <button type="button" className="btn-secondary" onClick={() => setStep(step - 1)}>
                    ← Orqaga
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{step} / {STEP_LABELS.length}</span>
                {step < STEP_LABELS.length ? (
                  <button type="button" className="btn-primary" onClick={() => setStep(step + 1)}>
                    Keyingi →
                  </button>
                ) : (
                  <button
                    type="button" className="btn-primary"
                    disabled={submitting || !data.theme.shopName.trim()}
                    onClick={handleSubmit}
                  >
                    {submitting
                      ? (editingTenantId ? 'Saqlanmoqda...' : 'Yaratilmoqda...')
                      : (editingTenantId ? '💾 Saqlash' : '🚀 CRM Yaratish')
                    }
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
