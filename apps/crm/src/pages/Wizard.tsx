import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, Clock,
  ShoppingCart, Heart, BookOpen, Utensils,
  Scissors, Activity, Car, Building2, ChevronRight,
} from 'lucide-react';
import { getWizardConfig, submitWizardSetup } from '../api/wizard.api';
import { useConfigStore } from '../stores/config.store';
import { useTenantStore } from '../stores/tenant.store';
import api from '../api/axios';

// ── Constants ─────────────────────────────────────────────────────────────────

const MODULE_LABELS: Record<string, string> = {
  pos:          'Sotuv (POS)',
  products:     'Mahsulotlar',
  sales:        'Sotuv tarixi',
  warehouse:    'Sklad',
  customers:    'Mijozlar',
  payments:     "To'lovlar",
  reports:      'Hisobotlar',
  employees:    'Xodimlar',
  branches:     'Filiallar',
  portal:       'Mijoz portali',
  settings:     'Sozlamalar',
  patients:     'Bemorlar',
  appointments: 'Qabullar',
  doctors:      'Shifokorlar',
  pharmacy:     'Dorixona',
  prescriptions:'Retseptlar',
  students:     'Talabalar',
  courses:      'Kurslar',
  teachers:     "O'qituvchilar",
  attendance:   'Davomat',
  edu_payments: "Oylik to'lov",
  menu:         'Menyu',
  orders:       'Buyurtmalar',
  kitchen:      'Oshxona',
  tables:       'Stollar',
  gym_members:  "A'zolar",
  gym_plans:    'Obuna rejalari',
  gym_checkin:  'Kirish nazorati',
  beauty_appointments:     'Qabullar (beauty)',
  beauty_masters:          'Masterlar',
  beauty_services_catalog: 'Xizmatlar katalogi',
  auto_orders:             'Servis buyurtmalari',
  auto_vehicles:           'Avtomobillar bazasi',
};

// Nav preview items per industry — what the mini CRM sidebar will show
const INDUSTRY_PREVIEW_NAV: Record<string, string[]> = {
  retail:       ['Dashboard', 'Sotuv (POS)', 'Mahsulotlar', 'Mijozlar'],
  clinic:       ['Dashboard', 'Bemorlar', 'Qabullar', 'Retseptlar'],
  education:    ['Dashboard', 'Talabalar', 'Kurslar', 'Davomat'],
  restaurant:   ['Dashboard', 'Menyu', 'Buyurtmalar', 'Stollar'],
  beauty:       ['Dashboard', 'Qabullar', 'Masterlar', 'Xizmatlar'],
  fitness:      ['Dashboard', "A'zolar", 'Obuna rejalari', 'Kirish nazorati'],
  auto:         ['Dashboard', 'Servis buyurtmalari', 'Avtomobillar', 'Sklad'],
  construction: ['Dashboard', 'Mijozlar', 'Sklad', 'Xodimlar'],
};

const INDUSTRIES = [
  {
    key:     'retail',
    name:    "Savdo do'kon",
    desc:    'Supermarket, ulgurji, chakana savdo',
    Icon:    ShoppingCart,
    color:   '#3b82f6',
    modules: ['pos','sales','warehouse','customers','payments','products','employees','reports','branches','portal','settings'] as string[],
    roles:   ['admin','cashier','warehouse_manager','sales_manager','accountant'],
  },
  {
    key:     'clinic',
    name:    'Klinika / Tibbiyot',
    desc:    'Bemorlar, qabullar, retseptlar',
    Icon:    Heart,
    color:   '#ef4444',
    modules: ['patients','appointments','doctors','pharmacy','prescriptions','employees','reports','settings'] as string[],
    roles:   ['admin','doctor','nurse','receptionist','pharmacist','accountant'],
  },
  {
    key:     'education',
    name:    "Ta'lim markazi",
    desc:    "Kurslar, talabalar, oylik to'lovlar",
    Icon:    BookOpen,
    color:   '#8b5cf6',
    modules: ['students','courses','teachers','attendance','edu_payments','employees','reports','settings'] as string[],
    roles:   ['admin','teacher','receptionist','accountant','curator'],
  },
  {
    key:     'restaurant',
    name:    'Restoran / Kafe',
    desc:    'Menyu, buyurtmalar, oshxona, stollar',
    Icon:    Utensils,
    color:   '#f59e0b',
    modules: ['menu','orders','kitchen','tables','payments','employees','reports','settings'] as string[],
    roles:   ['admin','waiter','cook','cashier','delivery_courier'],
  },
  {
    key:     'beauty',
    name:    "Go'zallik saloni",
    desc:    'Qabullar, masterlar, xizmatlar',
    Icon:    Scissors,
    color:   '#ec4899',
    modules: ['beauty_appointments','beauty_masters','beauty_services_catalog','customers','employees','reports','settings'] as string[],
    roles:   ['admin','cashier','receptionist'],
  },
  {
    key:     'fitness',
    name:    'Fitnes / Sport zali',
    desc:    "A'zolar, abonementlar, kirish nazorati",
    Icon:    Activity,
    color:   '#10b981',
    modules: ['gym_members','gym_plans','gym_checkin','employees','reports','settings'] as string[],
    roles:   ['admin','trainer','receptionist','accountant'],
  },
  {
    key:     'auto',
    name:    'Auto servis',
    desc:    "Servis buyurtmalari, avtomobillar, ta'mir",
    Icon:    Car,
    color:   '#6366f1',
    modules: ['auto_orders','auto_vehicles','customers','products','warehouse','employees','reports','settings'] as string[],
    roles:   ['admin','mechanic','receptionist','accountant'],
  },
  {
    key:     'construction',
    name:    'Qurilish',
    desc:    'Loyihalar, materiallar, xodimlar',
    Icon:    Building2,
    color:   '#64748b',
    modules: ['customers','payments','employees','warehouse','products','reports','settings'] as string[],
    roles:   ['admin','accountant','foreman'],
  },
] as const;

type IndustryKey = (typeof INDUSTRIES)[number]['key'];

const STEP_LABELS     = ['Soha', 'Kompaniya', 'Yaratilmoqda'];
const STEP_DESCS_SIDE = ['Biznes turini tanlang', "Ma'lumot kiriting", 'CRM sozlanmoqda'];

// ── CRM Preview ───────────────────────────────────────────────────────────────

function CrmPreview({ color, name, industry }: { color: string; name: string; industry: IndustryKey | null }) {
  const navItems = (industry ? INDUSTRY_PREVIEW_NAV[industry] : null) ?? ['Dashboard', 'Sotuv', 'Mahsulot', 'Mijozlar'];
  return (
    <div className="wz-preview-mock">
      <div className="wz-preview-topbar" style={{ background: color }}>
        <div className="wz-preview-dot" />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name || 'Kompaniya nomi'}
        </span>
      </div>
      <div style={{ display: 'flex', height: 150 }}>
        <div className="wz-preview-sidebar" style={{ background: color }}>
          {navItems.map((label) => (
            <div
              key={label}
              className={`wz-preview-nav-item${label === 'Dashboard' ? ' wz-preview-nav-item--active' : ''}`}
            >
              {label}
            </div>
          ))}
        </div>
        <div className="wz-preview-content">
          <div className="wz-preview-cards">
            {[0, 1].map((i) => (
              <div key={i} className="wz-preview-card" style={{ borderTopColor: color }}>
                <div className="wz-preview-card-line wz-preview-card-line--wide" />
                <div className="wz-preview-card-line" style={{ background: color, opacity: 0.65 }} />
              </div>
            ))}
          </div>
          <div className="wz-preview-table">
            {[80, 52, 68].map((w, i) => (
              <div
                key={i}
                className="wz-preview-table-row"
                style={{ width: `${w}%`, marginBottom: i < 2 ? 7 : 0 }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Generating animation ──────────────────────────────────────────────────────

function GeneratingScreen({ industry }: { industry: IndustryKey | null }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const ind = INDUSTRIES.find((i) => i.key === industry);
  const messages = [
    `${ind?.name ?? 'Biznes'} konfiguratsiyasi sozlanmoqda`,
    'Modullar va ruxsatlar o\'rnatilmoqda',
    'CRM interfeysi generatsiya qilinmoqda',
    'Deyarli tayyor...',
  ];

  useEffect(() => {
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % messages.length), 1600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="wz-gen-screen">
      <div
        className="wz-gen-conic"
        style={{ '--ind-color': ind?.color ?? '#8b5cf6' } as React.CSSProperties}
      >
        <div className="wz-gen-conic-inner" />
      </div>
      <div className="wz-gen-msg">{messages[msgIdx]}</div>
      <div className="wz-gen-dots">
        <span /><span /><span />
      </div>
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export default function Wizard() {
  const { tenantId = '' } = useParams<{ tenantId: string }>();
  const navigate      = useNavigate();
  const setTenantIdFn = useTenantStore((s) => s.setTenantId);
  const fetchConfig   = useConfigStore((s) => s.fetchConfig);

  const [step,        setStep]        = useState<1 | 2 | 3>(1);
  const [done,        setDone]        = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [trialEnds,   setTrialEnds]   = useState('');
  const [openLoading, setOpenLoading] = useState(false);
  const submittedRef  = useRef(false);
  const autoAdvRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedIndustry, setSelectedIndustry] = useState<IndustryKey | null>(null);
  const [companyName,      setCompanyName]       = useState('');
  const [companyPhone,     setCompanyPhone]      = useState('');
  const [selectedModules,  setSelectedModules]   = useState<Set<string>>(new Set());

  // Guard: no tenantId → can't proceed
  useEffect(() => {
    if (!tenantId) {
      setSubmitError("URL noto'g'ri: tenant ID topilmadi");
      return;
    }
    getWizardConfig(tenantId)
      .then((cfg) => {
        // Redirect if wizard is already completed
        if (cfg?.wizardCompleted || cfg?.status === 'active') {
          setTenantIdFn(tenantId);
          fetchConfig(tenantId).catch(() => {});
          navigate('/dashboard', { replace: true });
        }
      })
      .catch(() => { /* wizard not configured yet — stay on page */ });
  }, [tenantId]);

  // Cleanup auto-advance timer on unmount
  useEffect(() => () => { if (autoAdvRef.current) clearTimeout(autoAdvRef.current); }, []);

  const handleSubmit = useCallback(async () => {
    if (!tenantId) { setSubmitError("Tenant ID topilmadi"); setStep(2); return; }
    const industry = INDUSTRIES.find((i) => i.key === selectedIndustry);
    if (!industry) {
      // selectedIndustry became null — fallback to step 1
      setStep(1);
      submittedRef.current = false;
      return;
    }
    setSubmitError('');
    try {
      await submitWizardSetup({
        tenantId,
        industry:            industry.key,
        modules:             [...selectedModules, 'settings'],
        roles:               [...industry.roles],
        companyName:         companyName.trim(),
        companyPhone:        companyPhone.trim(),
        companyAddress:      '',
        logoUrl:             '',
        language:            'uz',
        currency:            'uzs',
        workingHoursStart:   '09:00',
        workingHoursEnd:     '18:00',
        workingDays:         ['du', 'se', 'ch', 'pa', 'ju'],
        primaryColor:        industry.color,
        themeStyle:          'modern',
        receiptFooter:       "Xaridingiz uchun rahmat!",
        posCardStyle:        'grid_no_photo',
        posShowCategories:   false,
        posBarcode:          false,
        posCustomer:         true,
        posDiscount:         true,
        posPaymentMethods:   ['cash'],
        posCurrencies:       ['uzs'],
        posMarkupAllowed:    false,
        posCustomerRequired: 'credit_only',
        employees:           [],
      });

      try {
        const sub = await api.get<{ trialEndsAt?: string }>(`/billing/${tenantId}`);
        if (sub.data.trialEndsAt) {
          setTrialEnds(new Date(sub.data.trialEndsAt).toLocaleDateString('uz-UZ'));
        }
      } catch { /* non-blocking */ }

      setDone(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setSubmitError(typeof msg === 'string' ? msg : "Xatolik yuz berdi. Qayta urinib ko'ring.");
      submittedRef.current = false;
      setStep(2);
    }
  }, [tenantId, selectedIndustry, companyName, companyPhone]);

  useEffect(() => {
    if (step === 3 && !submittedRef.current) {
      submittedRef.current = true;
      handleSubmit();
    }
  }, [step, handleSubmit]);

  const handleNext = () => { if (step < 3) setStep((s) => (s + 1) as 1 | 2 | 3); };
  const handleBack = () => {
    if (step > 1 && step < 3) setStep((s) => (s - 1) as 1 | 2 | 3);
  };

  const handleGoToCrm = async () => {
    setOpenLoading(true);
    try {
      setTenantIdFn(tenantId);
      await fetchConfig(tenantId);
      navigate('/dashboard');
    } catch {
      // fetchConfig failed — still navigate, config will use fallback
      navigate('/dashboard');
    } finally {
      setOpenLoading(false);
    }
  };

  const handleSelectIndustry = (key: IndustryKey) => {
    const ind = INDUSTRIES.find((i) => i.key === key);
    setSelectedIndustry(key);
    setSelectedModules(new Set(ind?.modules.filter((m) => m !== 'settings') ?? []));
    if (autoAdvRef.current) clearTimeout(autoAdvRef.current);
    autoAdvRef.current = setTimeout(() => { setStep(2); }, 650);
  };

  const toggleModule = (m: string) =>
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(m)) { next.delete(m); } else { next.add(m); }
      return next;
    });

  const canNext = () => {
    if (step === 1) return selectedIndustry !== null;
    if (step === 2) return companyName.trim().length >= 2;
    return false;
  };

  const activeIndustry = INDUSTRIES.find((i) => i.key === selectedIndustry);

  // All possible modules for the selected industry (excluding 'settings')
  const visibleModules = activeIndustry
    ? activeIndustry.modules.filter((m) => m !== 'settings')
    : [];
  // Modules user has actually selected (for success screen)
  const chosenModules = visibleModules.filter((m) => selectedModules.has(m));

  return (
    <div className="wz-page">
      <div className="wz-glow-1" />
      <div className="wz-glow-2" />

      {/* Mobile bar */}
      <div className="wz-mobile-bar">
        <div className="wz-mob-brand">XM</div>
        <div className="wz-mob-steps">
          {STEP_LABELS.slice(0, 2).map((label, i) => {
            const num    = i + 1;
            const isDone = done || num < step;
            const isAct  = !done && num === step;
            return (
              <div
                key={num}
                className={`wz-mob-step${isAct ? ' wz-mob-step--active' : ''}${isDone ? ' wz-mob-step--done' : ''}`}
              >
                <div className="wz-mob-dot">
                  {isDone ? <CheckCircle2 size={10} /> : num}
                </div>
                <span>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sidebar */}
      <aside className="wz-sidebar">
        <div className="wz-sidebar-brand">
          <div className="wz-sidebar-brand-icon">XM</div>
          <div>
            <div className="wz-sidebar-brand-name">XM Asistent</div>
            <div className="wz-sidebar-brand-sub">CRM yaratish</div>
          </div>
        </div>

        <nav className="wz-sidebar-nav">
          {STEP_LABELS.slice(0, 2).map((label, i) => {
            const num    = i + 1;
            const isDone = done || num < step;
            const isAct  = !done && num === step;
            return (
              <div
                key={num}
                className={[
                  'wz-step-item',
                  isAct  ? 'wz-step-item--active' : '',
                  isDone ? 'wz-step-item--done'   : '',
                ].filter(Boolean).join(' ')}
              >
                <div className="wz-step-num">
                  {isDone ? <CheckCircle2 size={13} /> : num}
                </div>
                <div className="wz-step-text">
                  <div className="wz-step-label">{label}</div>
                  <div className="wz-step-desc">{STEP_DESCS_SIDE[i]}</div>
                </div>
              </div>
            );
          })}
        </nav>

        {activeIndustry && !done && (
          <div className="wz-sidebar-industry">
            <activeIndustry.Icon size={13} />
            <span>{activeIndustry.name}</span>
          </div>
        )}

        {/* Sidebar module preview (step 2+) */}
        {activeIndustry && step >= 2 && !done && (
          <div className="wz-sidebar-modules">
            <div className="wz-sidebar-modules-title">
              Tanlangan ({chosenModules.length})
            </div>
            {chosenModules.slice(0, 6).map((m) => (
              <div key={m} className="wz-sidebar-module-item">
                <CheckCircle2 size={10} style={{ color: activeIndustry.color, flexShrink: 0 }} />
                <span>{MODULE_LABELS[m] ?? m}</span>
              </div>
            ))}
            {chosenModules.length > 6 && (
              <div className="wz-sidebar-module-item" style={{ color: 'rgba(255,255,255,0.28)' }}>
                + {chosenModules.length - 6} ta yana
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="wz-main">
        <div className="wz-body">

          {/* Step header */}
          {!done && step !== 3 && (
            <div className="wz-step-head">
              {step > 1 && (
                <button className="wz-back-icon" onClick={handleBack}>
                  <ArrowLeft size={15} />
                </button>
              )}
              <div>
                <div className="wz-step-eyebrow">Qadam {step} / 2</div>
                <h2 className="wz-header-title">
                  {step === 1 ? 'Biznesingiz sohasini tanlang' : "Kompaniya ma'lumotlari"}
                </h2>
                <p className="wz-header-desc">
                  {step === 1
                    ? 'Sohangizga mos modullar va rollar avtomatik sozlanadi'
                    : 'Ikkita maydon — keyin CRM tayyor bo\'ladi'}
                </p>
              </div>
            </div>
          )}

          {submitError && (
            <div className="wz-error-block" role="alert">
              {submitError}
            </div>
          )}

          {/* SUCCESS */}
          {done && (
            <div className="wz-success">
              <div className="wz-success-ring">
                <CheckCircle2 size={38} color="#10b981" strokeWidth={1.5} />
              </div>
              <h2 className="wz-success-title">CRM muvaffaqiyatli yaratildi</h2>
              <p className="wz-success-sub">
                <strong style={{ color: '#fff' }}>{companyName || activeIndustry?.name}</strong>{' '}
                uchun {activeIndustry?.name} CRM sozlandi.
              </p>

              {/* Module list */}
              {activeIndustry && (
                <div className="wz-success-modules">
                  {chosenModules.map((m) => (
                    <div key={m} className="wz-success-module-item">
                      <CheckCircle2 size={11} style={{ color: '#10b981', flexShrink: 0 }} />
                      <span>{MODULE_LABELS[m] ?? m}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="wz-info-card wz-info-card--green">
                <div className="wz-info-label">14 kunlik bepul sinov faollashtirildi</div>
                {trialEnds
                  ? <div className="wz-info-sub">Tugash sanasi: {trialEnds}</div>
                  : <div className="wz-info-sub">Ushbu muddat ichida barcha PRO funksiyalar mavjud</div>}
              </div>

              <div className="wz-info-card wz-info-card--amber">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                  <Clock size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div className="wz-info-label">Keyinchalik sozlash mumkin</div>
                    <div className="wz-info-sub">Logo, rang, ish vaqti, chek matni — Sozlamalar bo'limida</div>
                  </div>
                </div>
              </div>

              <button className="wz-cta-btn" onClick={handleGoToCrm} disabled={openLoading}>
                {openLoading ? 'Yuklanmoqda...' : 'CRM ni ochish'}
                {!openLoading && <ChevronRight size={16} style={{ marginLeft: 6 }} />}
              </button>
            </div>
          )}

          {/* STEP 3 — Generating */}
          {!done && step === 3 && (
            <GeneratingScreen industry={selectedIndustry} />
          )}

          {/* STEP 1 — Industry selection */}
          {!done && step === 1 && (
            <div className="wz-industry-grid">
              {INDUSTRIES.map((ind) => {
                const selected    = selectedIndustry === ind.key;
                const previewMods = ind.modules.filter((m) => m !== 'settings').slice(0, 4);
                return (
                  <button
                    key={ind.key}
                    className={`wz-industry-card${selected ? ' wz-industry-card--selected' : ''}`}
                    style={selected ? {
                      '--ind-color': ind.color,
                      '--ind-bg': `${ind.color}18`,
                    } as React.CSSProperties : undefined}
                    onClick={() => handleSelectIndustry(ind.key)}
                  >
                    <div
                      className="wz-industry-icon"
                      style={{
                        background: selected ? `${ind.color}28` : 'rgba(255,255,255,0.07)',
                        color:      selected ? ind.color : 'rgba(255,255,255,0.45)',
                        boxShadow:  selected ? `0 0 16px ${ind.color}30` : 'none',
                      }}
                    >
                      <ind.Icon size={22} strokeWidth={1.8} />
                    </div>
                    <div className="wz-industry-name">{ind.name}</div>
                    <div className="wz-industry-desc">{ind.desc}</div>

                    {/* Module chips — shows what user will get */}
                    <div className="wz-mod-chips">
                      {previewMods.map((m) => (
                        <span
                          key={m}
                          className="wz-mod-chip"
                          style={selected ? { background: `${ind.color}22`, color: ind.color } : undefined}
                        >
                          {MODULE_LABELS[m] ?? m}
                        </span>
                      ))}
                      {ind.modules.length - 1 > previewMods.length && (
                        <span className="wz-mod-chip wz-mod-chip--more">
                          +{ind.modules.length - 1 - previewMods.length}
                        </span>
                      )}
                    </div>

                    {selected && (
                      <div className="wz-industry-check" style={{ background: ind.color }}>
                        <CheckCircle2 size={9} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* STEP 2 — Company info */}
          {!done && step === 2 && (
            <div className="wz-two-col">
              <div className="wz-form-col">
                <div className="wz-field">
                  <label className="wz-label">Kompaniya nomi *</label>
                  <input
                    className="wz-input"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={
                      activeIndustry?.key === 'clinic'     ? 'Masalan: Shifa klinikasi'
                      : activeIndustry?.key === 'education' ? "Masalan: Bilim o'quv markazi"
                      : activeIndustry?.key === 'restaurant'? 'Masalan: Lazzat restoran'
                      : 'Masalan: Alisher Supermarket'
                    }
                    autoFocus
                    maxLength={60}
                    onKeyDown={(e) => { if (e.key === 'Enter' && canNext()) handleNext(); }}
                  />
                  <span className="wz-hint">
                    CRM bosh sahifasi va cheklarda ko'rinadi. Keyinchalik o'zgartirish mumkin.
                  </span>
                </div>

                <div className="wz-field">
                  <label className="wz-label">
                    Telefon raqam <span className="wz-optional">(ixtiyoriy)</span>
                  </label>
                  <input
                    className="wz-input"
                    type="tel"
                    value={companyPhone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^\d+\s-]/g, '');
                      setCompanyPhone(val);
                    }}
                    onFocus={() => { if (!companyPhone) setCompanyPhone('+998 '); }}
                    onBlur={() => { if (companyPhone.trim() === '+998' || companyPhone.trim() === '+998 ') setCompanyPhone(''); }}
                    placeholder="+998 90 000 00 00"
                    maxLength={20}
                  />
                  <span className="wz-hint">Chek va mijozlarga ko'rinadi.</span>
                </div>

                {/* Selected industry with change link */}
                {activeIndustry && (
                  <div
                    className="wz-ind-badge"
                    style={{
                      borderColor: `${activeIndustry.color}40`,
                      background:  `${activeIndustry.color}0d`,
                    }}
                  >
                    <activeIndustry.Icon size={13} style={{ color: activeIndustry.color, flexShrink: 0 }} />
                    <span style={{ color: activeIndustry.color, fontWeight: 600 }}>
                      {activeIndustry.name}
                    </span>
                    <button
                      className="wz-change-ind"
                      onClick={() => {
                        if (autoAdvRef.current) clearTimeout(autoAdvRef.current);
                        setStep(1);
                      }}
                      type="button"
                    >
                      O'zgartirish
                    </button>
                  </div>
                )}

                {/* Module selection — user toggles what they want */}
                {visibleModules.length > 0 && (
                  <div className="wz-mod-list">
                    <div className="wz-mod-list-title" style={{ marginBottom: '0.5rem' }}>
                      Modullarni tanlang
                      <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', marginLeft: '0.5rem' }}>
                        ({selectedModules.size} ta tanlangan)
                      </span>
                    </div>
                    <div className="wz-mod-list-grid">
                      {visibleModules.map((m) => {
                        const on = selectedModules.has(m);
                        return (
                          <button
                            key={m}
                            type="button"
                            className="wz-mod-list-item"
                            onClick={() => toggleModule(m)}
                            style={{
                              cursor: 'pointer',
                              background: on ? `${activeIndustry?.color ?? '#10b981'}1a` : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${on ? (activeIndustry?.color ?? '#10b981') + '60' : 'rgba(255,255,255,0.1)'}`,
                              borderRadius: 8, padding: '0.45rem 0.65rem',
                              width: '100%', textAlign: 'left',
                              display: 'flex', alignItems: 'center', gap: '0.45rem',
                              transition: 'all 0.15s',
                            }}
                          >
                            <span style={{
                              width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                              background: on ? (activeIndustry?.color ?? '#10b981') : 'rgba(255,255,255,0.1)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'background 0.15s',
                            }}>
                              {on && <CheckCircle2 size={9} color="#fff" />}
                            </span>
                            <span style={{ fontSize: '0.82rem', color: on ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                              {MODULE_LABELS[m] ?? m}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: '0.71rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem' }}>
                      Sozlamalar moduli har doim yoqilgan holda qoladi
                    </div>
                  </div>
                )}
              </div>

              <div className="wz-preview-col">
                <div className="wz-preview-sticky">
                  <div className="wz-preview-label">Ko'rinish</div>
                  <CrmPreview
                    color={activeIndustry?.color ?? '#3b82f6'}
                    name={companyName}
                    industry={selectedIndustry}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!done && step !== 3 && (
          <div className="wz-footer">
            <button
              className="wz-back-btn"
              onClick={handleBack}
              disabled={step === 1}
            >
              <ArrowLeft size={15} />
              Orqaga
            </button>
            <button
              className={`wz-next-btn${selectedIndustry && step === 1 ? ' wz-next-btn--ready' : ''}`}
              onClick={handleNext}
              disabled={!canNext()}
            >
              {step === 2 ? 'CRM Yaratish' : 'Keyingisi'}
              {step === 1 && selectedIndustry && <ChevronRight size={15} style={{ marginLeft: 4 }} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
