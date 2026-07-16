import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Palette, Receipt, ShoppingCart,
  Lock, Globe, Save, Upload, Check, CreditCard, LayoutGrid, TrendingUp,
  Users, HardDrive, Zap,
} from 'lucide-react';
import { useTenantStore } from '../stores/tenant.store';
import { useConfigStore } from '../stores/config.store';
import { useAuthStore } from '../stores/auth.store';
import { useToastStore } from '../stores/toast.store';
import { useFeaturesStore } from '../stores/features.store';
import { getWizardConfig, updateWizardConfig, getPublicDefaults, WizardConfig } from '../api/wizard.api';
import { getMySubscription, getMyLimits, Subscription, UsageLimits } from '../api/billing.api';
import api from '../api/axios';

type Tab = 'biznes' | 'pos' | 'chek' | 'korinish' | 'parol' | 'billing' | 'modullar';

const TABS: { key: Tab; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { key: 'biznes',   label: 'Biznes',    Icon: Building2   },
  { key: 'modullar', label: 'Modullar',  Icon: LayoutGrid  },
  { key: 'pos',      label: 'POS',       Icon: ShoppingCart },
  { key: 'chek',     label: 'Chek',      Icon: Receipt      },
  { key: 'korinish', label: "Ko'rinish", Icon: Palette      },
  { key: 'billing',  label: 'Billing',   Icon: CreditCard   },
  { key: 'parol',    label: 'Parol',     Icon: Lock         },
];

const COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444',
  '#f59e0b','#10b981','#3b82f6','#06b6d4',
  '#0ea5e9','#14b8a6','#84cc16','#f97316',
];

const CARD_STYLES = [
  { key: 'grid_no_photo',    label: "Rasm yo'q (grid)",     desc: '3-4 ustun, faqat nom + narx' },
  { key: 'grid_photo_small', label: 'Kichik rasm (grid)',   desc: '3 ustun, 80px rasm' },
  { key: 'grid_photo_large', label: 'Katta rasm (grid)',    desc: '2 ustun, 128px rasm' },
  { key: 'list',             label: "Ro'yxat",              desc: 'Jadval uslubi, to\'liq qator' },
];

const PAY_METHODS = [
  { key: 'cash',     label: 'Naqd' },
  { key: 'card',     label: 'Karta' },
  { key: 'credit',   label: 'Nasiya' },
  { key: 'mixed',    label: 'Aralash' },
  { key: 'transfer', label: "O'tkazma" },
];

const CURRENCIES = [
  { key: 'uzs', label: "So'm (UZS)" },
  { key: 'usd', label: 'Dollar (USD)' },
  { key: 'rub', label: "Rubl (RUB)" },
];

const RECEIPT_SIZES = [
  { key: '58mm',  label: '58 mm' },
  { key: '80mm',  label: '80 mm' },
  { key: 'a4',    label: 'A4' },
];

const DISCOUNT_MODES = [
  { key: 'percent', label: 'Foiz (%)' },
  { key: 'amount',  label: "Summa (so'm)" },
  { key: 'both',    label: 'Ikkalasi' },
];

const MODULE_LABELS: Record<string, string> = {
  pos:                     'Sotuv (POS)',
  products:                'Mahsulotlar',
  sales:                   'Sotuv tarixi',
  warehouse:               'Sklad',
  customers:               'Mijozlar',
  payments:                "To'lovlar",
  reports:                 'Hisobotlar',
  employees:               'Xodimlar',
  branches:                'Filiallar',
  portal:                  'Mijoz portali',
  patients:                'Bemorlar',
  appointments:            'Qabullar',
  doctors:                 'Shifokorlar',
  pharmacy:                'Dorixona',
  prescriptions:           'Retseptlar',
  students:                'Talabalar',
  courses:                 'Kurslar',
  teachers:                "O'qituvchilar",
  attendance:              'Davomat',
  edu_payments:            "Oylik to'lov",
  menu:                    'Menyu',
  orders:                  'Buyurtmalar',
  kitchen:                 'Oshxona',
  tables:                  'Stollar',
  gym_members:             "A'zolar",
  gym_plans:               'Obuna rejalari',
  gym_checkin:             'Kirish nazorati',
  beauty_appointments:     'Qabullar',
  beauty_masters:          'Masterlar',
  beauty_services_catalog: 'Xizmatlar katalogi',
  auto_orders:             'Servis buyurtmalari',
  auto_vehicles:           'Avtomobillar',
};

export default function Settings() {
  const tenantId    = useTenantStore((s) => s.tenantId);
  const config      = useConfigStore((s) => s.config);
  const fetchConfig = useConfigStore((s) => s.fetchConfig);
  const authUser    = useAuthStore((s) => s.user);
  const addToast    = useToastStore((s) => s.toast);
  const hasFeature  = useFeaturesStore((s) => s.hasFeature);
  const navigate    = useNavigate();

  const isStarter = hasFeature('dashboard_charts');

  const [tab, setTab]         = useState<Tab>('biznes');
  const [cfg, setCfg]         = useState<WizardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // Biznes tab
  const [companyName,    setCompanyName]    = useState('');
  const [companyPhone,   setCompanyPhone]   = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [logoUrl,        setLogoUrl]        = useState('');
  const [logoUploading,  setLogoUploading]  = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  // POS tab
  const [posCardStyle,        setPosCardStyle]        = useState('grid_no_photo');
  const [posShowCategories,   setPosShowCategories]   = useState(true);
  const [posBarcode,          setPosBarcode]          = useState(true);
  const [posCustomer,         setPosCustomer]         = useState(true);
  const [posDiscount,         setPosDiscount]         = useState(true);
  const [posMarkupAllowed,    setPosMarkupAllowed]    = useState(false);
  const [posPaymentMethods,   setPosPaymentMethods]   = useState<string[]>(['cash','card','credit']);
  const [posCurrencies,       setPosCurrencies]       = useState<string[]>(['uzs']);
  const [posCustomerRequired, setPosCustomerRequired] = useState('optional');
  const [discountMode,        setDiscountMode]        = useState('percent');

  // Chek tab
  const [receiptSize,        setReceiptSize]        = useState('80mm');
  const [receiptShowLogo,    setReceiptShowLogo]    = useState(true);
  const [receiptShowPhone,   setReceiptShowPhone]   = useState(true);
  const [receiptShowAddress, setReceiptShowAddress] = useState(true);
  const [receiptShowQr,      setReceiptShowQr]      = useState(false);
  const [receiptFooter,      setReceiptFooter]      = useState('');

  // Ko'rinish tab
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [darkMode,     setDarkMode]     = useState(true);
  const [customColor,  setCustomColor]  = useState('');

  // Parol tab
  const [currentPw,  setCurrentPw]  = useState('');
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [pwSaving,   setPwSaving]   = useState(false);
  const [pwError,    setPwError]    = useState('');
  const [showCur,    setShowCur]    = useState(false);
  const [showNew,    setShowNew]    = useState(false);

  // Billing tab
  const [sub,        setSub]        = useState<Subscription | null>(null);
  const [limits,     setLimits]     = useState<UsageLimits | null>(null);
  const [subLoading, setSubLoading] = useState(false);

  // Modullar tab
  const [allModules,      setAllModules]      = useState<string[]>([]);
  const [activeModules,   setActiveModules]   = useState<Set<string>>(new Set());
  const [modulesSaving,   setModulesSaving]   = useState(false);

  const toastShown = useRef(false);

  // ── Load config ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tenantId) return;
    toastShown.current = false;
    setLoading(true);
    getWizardConfig(tenantId)
      .then((c) => {
        setCfg(c);
        setCompanyName(c.companyName ?? '');
        setCompanyPhone(c.companyPhone ?? '');
        setCompanyAddress(c.companyAddress ?? '');
        setLogoUrl(c.logoUrl ?? '');
        setPosCardStyle(c.posCardStyle ?? 'grid_no_photo');
        setPosShowCategories(c.posShowCategories ?? true);
        setPosBarcode(c.posBarcode ?? true);
        setPosCustomer(c.posCustomer ?? true);
        setPosDiscount(c.posDiscount ?? true);
        setPosMarkupAllowed(c.posMarkupAllowed ?? false);
        setPosPaymentMethods(c.posPaymentMethods ?? ['cash','card','credit']);
        setPosCurrencies(c.posCurrencies ?? ['uzs']);
        setPosCustomerRequired(c.posCustomerRequired ?? 'optional');
        setDiscountMode(c.discountMode ?? 'percent');
        setReceiptSize(c.receiptSize ?? '80mm');
        setReceiptShowLogo(c.receiptShowLogo ?? true);
        setReceiptShowPhone(c.receiptShowPhone ?? true);
        setReceiptShowAddress(c.receiptShowAddress ?? true);
        setReceiptShowQr(c.receiptShowQr ?? false);
        setReceiptFooter(c.receiptFooter ?? '');
        setPrimaryColor(c.theme?.primaryColor ?? '#6366f1');
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status !== 404 && !toastShown.current) {
          toastShown.current = true;
          addToast("Sozlamalar yuklashda xatolik");
        }
      })
      .finally(() => setLoading(false));
  }, [tenantId]);

  // Load billing when switching to billing tab
  useEffect(() => {
    if (tab !== 'billing' || !tenantId || sub) return;
    setSubLoading(true);
    Promise.all([getMySubscription(tenantId), getMyLimits(tenantId)])
      .then(([s, l]) => { setSub(s); setLimits(l); })
      .catch(() => {})
      .finally(() => setSubLoading(false));
  }, [tab, tenantId]);

  // Load module list when switching to modullar tab
  useEffect(() => {
    if (tab !== 'modullar' || !tenantId || allModules.length) return;
    getWizardConfig(tenantId).then((c) => {
      const active = new Set(c.modules.filter((m: string) => m !== 'settings'));
      setActiveModules(active);
      return getPublicDefaults(c.industry).then((defaults) => {
        const all = defaults.modules.filter((m: string) => m !== 'settings');
        const merged = [...new Set([...all, ...active])].filter((m) => m !== 'settings');
        setAllModules(merged);
      }).catch(() => {
        setAllModules(c.modules.filter((m: string) => m !== 'settings'));
      });
    }).catch(() => {});
  }, [tab, tenantId]);

  const handleModulesSave = async () => {
    setModulesSaving(true);
    try {
      await updateWizardConfig(tenantId, { modules: [...activeModules, 'settings'] });
      await fetchConfig(tenantId);
      addToast('Modullar saqlandi', 'success');
    } catch {
      addToast('Saqlashda xatolik');
    } finally { setModulesSaving(false); }
  };

  const toggleActiveModule = (m: string) =>
    setActiveModules((prev) => {
      const next = new Set(prev);
      if (next.has(m)) { next.delete(m); } else { next.add(m); }
      return next;
    });

  // ── Save helpers ──────────────────────────────────────────────────────────
  const save = async (patch: object) => {
    setSaving(true);
    try {
      await api.patch(`/wizard/${tenantId}`, patch);
      await fetchConfig(tenantId);
      addToast('Saqlandi', 'success');
    } catch {
      addToast('Saqlashda xatolik yuz berdi');
    } finally { setSaving(false); }
  };

  const handleBiznesSave = (e: FormEvent) => {
    e.preventDefault();
    save({ companyName, companyPhone, companyAddress, logoUrl });
  };

  const handlePosSave = (e: FormEvent) => {
    e.preventDefault();
    save({
      posCardStyle, posShowCategories, posBarcode, posCustomer,
      posDiscount, posMarkupAllowed, posPaymentMethods, posCurrencies,
      posCustomerRequired, discountMode,
    });
  };

  const handleChekSave = (e: FormEvent) => {
    e.preventDefault();
    save({ receiptSize, receiptShowLogo, receiptShowPhone, receiptShowAddress, receiptShowQr, receiptFooter });
  };

  const handleColorSave = () => {
    save({ theme: { primaryColor: primaryColor } });
  };

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post<{ url: string }>('/upload/logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLogoUrl(data.url);
      addToast('Logo yuklandi', 'success');
    } catch {
      addToast('Logo yuklashda xatolik');
    } finally { setLogoUploading(false); }
  };

  const handlePwSave = async (e: FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (newPw !== confirmPw) { setPwError("Yangi parollar mos emas"); return; }
    if (newPw.length < 6)    { setPwError("Parol kamida 6 ta belgi bo'lishi kerak"); return; }
    setPwSaving(true);
    try {
      await api.patch('/auth/change-password', { currentPassword: currentPw, newPassword: newPw });
      addToast("Parol muvaffaqiyatli o'zgartirildi", 'success');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPwError(msg ?? "Xatolik yuz berdi");
    } finally { setPwSaving(false); }
  };

  const toggleMethod = (m: string) =>
    setPosPaymentMethods((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  const toggleCurrency = (c: string) =>
    setPosCurrencies((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const slug = config?.slug ?? '';

  if (loading) return <div className="page"><p className="state-msg">Yuklanmoqda...</p></div>;

  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Sozlamalar</h2>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            {cfg?.theme?.shopName ?? companyName ?? 'CRM sozlamalari'}
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="settings-tabs">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            className={`settings-tab${tab === key ? ' active' : ''}`}
            onClick={() => setTab(key)}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── BIZNES TAB ──────────────────────────────────────────────────────── */}
      {tab === 'biznes' && (
        <form onSubmit={handleBiznesSave} className="settings-card">
          <div className="settings-section-title">Biznes ma'lumotlari</div>

          {/* Logo */}
          <div className="field">
            <label>Logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: 72, height: 72, borderRadius: 12, overflow: 'hidden',
                  background: 'var(--sidebar-bg)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {logoUrl
                  ? <img src={logoUrl.startsWith('http') ? logoUrl : `/api${logoUrl}`} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <Building2 size={28} style={{ color: 'var(--text-muted)' }} />
                }
              </div>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  ref={logoRef}
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                />
                <button type="button" className="btn-secondary" onClick={() => logoRef.current?.click()} disabled={logoUploading}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                  <Upload size={13} /> {logoUploading ? 'Yuklanmoqda...' : 'Logo yuklash'}
                </button>
                {logoUrl && (
                  <button type="button" className="btn-secondary" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
                    onClick={() => setLogoUrl('')}>
                    Olib tashlash
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="field">
            <label>Do'kon / Kompaniya nomi</label>
            <input type="text" placeholder="XM Savdo" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div className="field">
            <label>Telefon raqam</label>
            <input type="tel" placeholder="+998 90 000 00 00" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} />
          </div>
          <div className="field">
            <label>Manzil</label>
            <input type="text" placeholder="Toshkent, Chilonzor 5" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
          </div>

          {slug && (
            <div className="field">
              <label>Portal URL</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="text" value={`/client/${slug}`} readOnly style={{ color: 'var(--text-muted)', cursor: 'default' }} />
                <a href={`/client/${slug}`} target="_blank" rel="noreferrer" className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                  <Globe size={13} /> Ko'rish
                </a>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Mijozlar ushbu URL orqali portal'ga kiradi. Slug o'zgartirib bo'lmaydi.
              </div>
            </div>
          )}

          <div className="settings-footer">
            <button type="submit" className="btn-primary" disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Save size={14} /> {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      )}

      {/* ── POS TAB ─────────────────────────────────────────────────────────── */}
      {tab === 'pos' && (
        <form onSubmit={handlePosSave} className="settings-card">
          <div className="settings-section-title">POS kassa sozlamalari</div>

          {/* Card style */}
          <div className="field">
            <label>Mahsulot karta uslubi</label>
            <div className="settings-radio-grid">
              {CARD_STYLES.map((s) => (
                <label key={s.key} className={`settings-radio-card${posCardStyle === s.key ? ' active' : ''}`}>
                  <input type="radio" name="posCardStyle" value={s.key}
                    checked={posCardStyle === s.key} onChange={() => setPosCardStyle(s.key)} />
                  <div className="settings-radio-label">{s.label}</div>
                  <div className="settings-radio-desc">{s.desc}</div>
                </label>
              ))}
            </div>
          </div>

          {/* To'lov usullari */}
          <div className="field">
            <label>To'lov usullari</label>
            <div className="settings-check-row">
              {PAY_METHODS.map((m) => (
                <label key={m.key} className={`settings-chip${posPaymentMethods.includes(m.key) ? ' active' : ''}`}>
                  <input type="checkbox" checked={posPaymentMethods.includes(m.key)}
                    onChange={() => toggleMethod(m.key)} style={{ display: 'none' }} />
                  {posPaymentMethods.includes(m.key) && <Check size={11} />}
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          {/* Valyutalar */}
          <div className="field">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              Valyutalar
              {!isStarter && <span style={{ fontSize: '0.7rem', background: 'rgba(99,102,241,0.12)', color: '#6366f1', borderRadius: 4, padding: '0.1rem 0.4rem' }}>STARTER</span>}
            </label>
            {!isStarter ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '0.5rem 0' }}>
                <Lock size={13} /> Bir valyuta — bepul. Ko'p valyuta uchun Starter kerak.
              </div>
            ) : (
              <div className="settings-check-row">
                {CURRENCIES.map((c) => (
                  <label key={c.key} className={`settings-chip${posCurrencies.includes(c.key) ? ' active' : ''}`}>
                    <input type="checkbox" checked={posCurrencies.includes(c.key)}
                      onChange={() => toggleCurrency(c.key)} style={{ display: 'none' }} />
                    {posCurrencies.includes(c.key) && <Check size={11} />}
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Chegirma */}
          <div className="field">
            <label>Chegirma usuli</label>
            <div className="settings-check-row">
              {DISCOUNT_MODES.map((d) => (
                <label key={d.key} className={`settings-chip${discountMode === d.key ? ' active' : ''}`}>
                  <input type="radio" name="discountMode" value={d.key}
                    checked={discountMode === d.key} onChange={() => setDiscountMode(d.key)} style={{ display: 'none' }} />
                  {discountMode === d.key && <Check size={11} />}
                  {d.label}
                </label>
              ))}
            </div>
          </div>

          {/* Mijoz majburiy */}
          <div className="field">
            <label>Mijoz tanlash</label>
            <div className="settings-check-row">
              {[
                { key: 'required', label: 'Majburiy' },
                { key: 'optional', label: 'Ixtiyoriy' },
                { key: 'hidden',   label: "Ko'rsatilmasin" },
              ].map((o) => (
                <label key={o.key} className={`settings-chip${posCustomerRequired === o.key ? ' active' : ''}`}>
                  <input type="radio" name="posCustomerRequired" value={o.key}
                    checked={posCustomerRequired === o.key} onChange={() => setPosCustomerRequired(o.key)} style={{ display: 'none' }} />
                  {posCustomerRequired === o.key && <Check size={11} />}
                  {o.label}
                </label>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="settings-toggle-group">
            {[
              { val: posShowCategories, set: setPosShowCategories, label: "Kategoriyalarni ko'rsatish", locked: false },
              { val: posBarcode,        set: setPosBarcode,        label: 'Barcode scanner',             locked: false },
              { val: posCustomer,       set: setPosCustomer,       label: 'Mijoz qidirish',              locked: false },
              { val: posDiscount,       set: setPosDiscount,       label: 'Chegirma',                    locked: false },
              { val: posMarkupAllowed,  set: setPosMarkupAllowed,  label: "Narx ustiga qo'shish (markup)", locked: !isStarter },
            ].map(({ val, set, label, locked }) => (
              <div key={label} className="settings-toggle-row" style={{ opacity: locked ? 0.5 : 1 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {label}
                  {locked && <Lock size={11} style={{ color: '#6366f1' }} />}
                </span>
                <button type="button" className={`settings-toggle${val && !locked ? ' on' : ''}`}
                  onClick={() => !locked && set(!val)} disabled={locked}>
                  <span className="settings-toggle-knob" />
                </button>
              </div>
            ))}
          </div>

          <div className="settings-footer">
            <button type="submit" className="btn-primary" disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Save size={14} /> {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      )}

      {/* ── CHEK TAB ────────────────────────────────────────────────────────── */}
      {tab === 'chek' && (
        <form onSubmit={handleChekSave} className="settings-card">
          <div className="settings-section-title">Chek sozlamalari</div>

          <div className="field">
            <label>Chek o'lchami</label>
            <div className="settings-check-row">
              {RECEIPT_SIZES.map((s) => (
                <label key={s.key} className={`settings-chip${receiptSize === s.key ? ' active' : ''}`}>
                  <input type="radio" name="receiptSize" value={s.key}
                    checked={receiptSize === s.key} onChange={() => setReceiptSize(s.key)} style={{ display: 'none' }} />
                  {receiptSize === s.key && <Check size={11} />}
                  {s.label}
                </label>
              ))}
            </div>
          </div>

          <div className="settings-toggle-group">
            {[
              { val: receiptShowLogo,    set: setReceiptShowLogo,    label: "Logotip ko'rsatish",  locked: false },
              { val: receiptShowPhone,   set: setReceiptShowPhone,   label: 'Telefon ko\'rsatish', locked: false },
              { val: receiptShowAddress, set: setReceiptShowAddress, label: 'Manzil ko\'rsatish',  locked: false },
              { val: receiptShowQr,      set: setReceiptShowQr,      label: 'QR kod ko\'rsatish',  locked: !isStarter },
            ].map(({ val, set, label, locked }) => (
              <div key={label} className="settings-toggle-row" style={{ opacity: locked ? 0.5 : 1 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {label}
                  {locked && <Lock size={11} style={{ color: '#6366f1' }} />}
                </span>
                <button type="button" className={`settings-toggle${val && !locked ? ' on' : ''}`}
                  onClick={() => !locked && set(!val)} disabled={locked}>
                  <span className="settings-toggle-knob" />
                </button>
              </div>
            ))}
          </div>

          <div className="field">
            <label>Chek pastki yozuvi</label>
            <textarea
              placeholder="Xaridingiz uchun rahmat! Yana tashrif buyuring."
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="settings-footer">
            <button type="submit" className="btn-primary" disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Save size={14} /> {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      )}

      {/* ── KO'RINISH TAB ───────────────────────────────────────────────────── */}
      {tab === 'korinish' && (
        <div className="settings-card">
          <div className="settings-section-title">Interfeys ko'rinishi</div>

          <div className="field">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              Asosiy rang
              {!isStarter && <span style={{ fontSize: '0.7rem', background: 'rgba(99,102,241,0.12)', color: '#6366f1', borderRadius: 4, padding: '0.1rem 0.4rem' }}>STARTER</span>}
            </label>
            {!isStarter ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <Lock size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Rang sozlash Starter tarifidan boshlab mavjud</span>
              </div>
            ) : (
              <>
                <div className="settings-color-grid">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`settings-color-dot${primaryColor === c ? ' active' : ''}`}
                      style={{ background: c }}
                      onClick={() => setPrimaryColor(c)}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.75rem' }}>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    style={{ width: 36, height: 36, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 6 }}
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#6366f1"
                    style={{ width: 110 }}
                  />
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: primaryColor, border: '1px solid var(--border)' }} />
                </div>
              </>
            )}
          </div>

          {isStarter && (
            <div style={{ marginTop: '1.5rem' }}>
              <button className="btn-primary" onClick={handleColorSave} disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Save size={14} /> {saving ? 'Saqlanmoqda...' : 'Rangni saqlash'}
              </button>
            </div>
          )}

          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <div className="settings-section-title" style={{ marginBottom: '0.75rem' }}>Haqida</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <div>Foydalanuvchi: <strong style={{ color: 'var(--text)' }}>{authUser?.email ?? '—'}</strong></div>
              <div>Rol: <strong style={{ color: 'var(--text)' }}>{authUser?.role ?? '—'}</strong></div>
              <div>Tenant ID: <code style={{ fontSize: '0.72rem' }}>{tenantId}</code></div>
              {slug && <div>Slug: <code style={{ fontSize: '0.72rem' }}>{slug}</code></div>}
              <div>Industry: <strong style={{ color: 'var(--text)' }}>{cfg?.industry ?? '—'}</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODULLAR TAB ────────────────────────────────────────────────────── */}
      {tab === 'modullar' && (
        <div className="settings-card">
          <div className="settings-section-title">Faol modullar</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Yoqilgan modullar navigatsiya menyusida ko'rinadi. Sozlamalar moduli har doim faol.
          </div>

          {allModules.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Yuklanmoqda...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {allModules.map((m) => {
                const on = activeModules.has(m);
                return (
                  <div key={m} className="settings-toggle-row">
                    <span>{MODULE_LABELS[m] ?? m}</span>
                    <button
                      type="button"
                      className={`settings-toggle${on ? ' on' : ''}`}
                      onClick={() => toggleActiveModule(m)}
                    >
                      <span className="settings-toggle-knob" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="settings-footer">
            <button className="btn-primary" onClick={handleModulesSave} disabled={modulesSaving}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Save size={14} /> {modulesSaving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </div>
      )}

      {/* ── BILLING TAB ─────────────────────────────────────────────────────── */}
      {tab === 'billing' && (
        <div className="settings-card" style={{ maxWidth: 560 }}>
          <div className="settings-section-title">Obuna va billing</div>

          {subLoading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>Yuklanmoqda...</div>
          ) : sub ? (
            <>
              {/* Plan badge */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '1rem 1.25rem', borderRadius: 10,
                background: sub.plan === 'pro' ? 'rgba(99,102,241,0.08)' : sub.plan === 'starter' ? 'rgba(16,185,129,0.07)' : 'rgba(245,158,11,0.08)',
                border: `1px solid ${sub.plan === 'pro' ? 'rgba(99,102,241,0.2)' : sub.plan === 'starter' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
                marginBottom: '1.5rem',
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 10,
                  background: sub.plan === 'pro' ? '#6366f1' : sub.plan === 'starter' ? '#10b981' : '#f59e0b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <TrendingUp size={20} color="#fff" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {sub.plan === 'trial' ? '14-kunlik sinov' : sub.plan === 'starter' ? 'Starter' : 'Pro'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {sub.status === 'trial' && sub.trialEndsAt
                      ? `Tugash sanasi: ${new Date(sub.trialEndsAt).toLocaleDateString('uz-UZ')}`
                      : sub.nextPaymentAt
                      ? `Keyingi to'lov: ${new Date(sub.nextPaymentAt).toLocaleDateString('uz-UZ')}`
                      : sub.status === 'suspended' ? 'To\'lov to\'xtatilgan' : 'Faol'}
                  </div>
                </div>
                {sub.priceUzs > 0 && (
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                      {sub.priceUzs.toLocaleString()} so'm
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      / {sub.billingCycle === 'monthly' ? 'oy' : 'yil'}
                    </div>
                  </div>
                )}
              </div>

              {/* Usage bars */}
              {limits && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  {[
                    { icon: Users, label: 'Xodimlar', current: sub.currentUsers, max: sub.usersLimit, pct: limits.percentages.users },
                    { icon: Zap,   label: 'API chaqiruvlar', current: sub.currentApiCalls, max: sub.apiCallsLimit, pct: limits.percentages.apiCalls },
                    { icon: HardDrive, label: 'Saqlash', current: Math.round(sub.storageLimit * (limits.percentages.storage / 100)), max: sub.storageLimit, pct: limits.percentages.storage, unit: 'MB' },
                  ].map(({ icon: Icon, label, current, max, pct, unit }) => (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
                          <Icon size={13} /> {label}
                        </span>
                        <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {current} / {max}{unit ? ` ${unit}` : ''}
                        </span>
                      </div>
                      <div style={{ height: 6, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 99,
                          background: pct > 85 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#10b981',
                          width: `${Math.min(pct, 100)}%`, transition: 'width 0.4s',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                className="btn-primary"
                onClick={() => navigate('/subscription')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <CreditCard size={14} /> Tarifni boshqarish
              </button>
            </>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Obuna ma'lumotlari yuklanmadi.{' '}
              <button className="btn-secondary" onClick={() => navigate('/subscription')}>
                Ko'rish
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── PAROL TAB ───────────────────────────────────────────────────────── */}
      {tab === 'parol' && (
        <div className="settings-card" style={{ maxWidth: 420 }}>
          <div className="settings-section-title">Parolni o'zgartirish</div>
          <form onSubmit={handlePwSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pwError && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '0.65rem 1rem', color: '#ef4444', fontSize: '0.85rem' }}>
                {pwError}
              </div>
            )}

            {[
              { label: 'Joriy parol',   val: currentPw, set: setCurrentPw, show: showCur, setShow: setShowCur },
              { label: 'Yangi parol',   val: newPw,     set: setNewPw,     show: showNew, setShow: setShowNew },
              { label: 'Tasdiqlash',    val: confirmPw, set: setConfirmPw, show: showNew, setShow: setShowNew },
            ].map(({ label, val, set, show, setShow }, i) => (
              <div key={label} className="field">
                <label>{label}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={show ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    required
                    style={{ paddingRight: '2.5rem', width: '100%', boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.9rem' }}
                    tabIndex={-1}
                  >
                    {show ? '●' : '○'}
                  </button>
                </div>
              </div>
            ))}

            <button type="submit" className="btn-primary" disabled={pwSaving}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Lock size={14} /> {pwSaving ? "O'zgartirilmoqda..." : "Parolni o'zgartirish"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
