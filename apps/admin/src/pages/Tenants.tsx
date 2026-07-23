import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  Bar, CartesianGrid, Cell, ComposedChart,
  Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Info, BarChart2, Database, CreditCard, LayoutGrid, Palette,
  Settings2, ShoppingCart, Receipt, Users,
  Package, UserCheck, ShoppingBag, Briefcase,
  CheckCircle2, Clock, AlertCircle, XCircle,
  TrendingUp, Calendar, Layers, Activity,
  Copy, Check, Trash2, Bug, Shield,
  UserCircle, Key, LogIn, ArrowLeft, MoreVertical,
  Stethoscope, GraduationCap, UtensilsCrossed, Dumbbell, Scissors, Wrench,
} from 'lucide-react';
import api from '../api/axios';
import { useAuthStore } from '../stores/auth.store';
import {
  WizardCfg, WizardCfgTheme, EmployeeRow,
  getWizardConfig, updateWizardConfig, generateCrm, getEmployees, patchEmployee,
  impersonateTenant,
} from '../api/wizard.api';
import { getBilling, getPaymentHistory, freezeTenant, unfreezeTenant } from '../api/billing.api';
import type { Subscription, PaymentHistoryItem } from '../api/billing.api';
import DeleteConfirmDialogExtracted from './tenants/DeleteConfirmDialog';

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
interface TenantBug   { id: string; type: string; message: string; status: string; userEmail: string | null; createdAt: string; url: string | null; }

interface TenantStats {
  totalSales: number;
  totalRevenue: number;
  totalProducts: number;
  totalCustomers: number;
  totalEmployees: number;
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
    posCardStyle?: string | null;
    language?: string;
    currency?: string;
    receiptSize?: string;
    workingHoursStart?: string;
    workingHoursEnd?: string;
  } | null;
  stats: TenantStats;
}

// ── Module feature definitions (for feature-selection modal) ──────────────────

interface ModuleFeat { key: string; label: string; desc: string; tier: 'free'|'starter'|'pro' }

const MODULE_FEATURES: Record<string, { label: string; desc: string; features: ModuleFeat[] }> = {
  products: {
    label: 'Mahsulotlar', desc: 'Tovarlar katalogi, narxlar va barcode',
    features: [
      { key:'catalog',      label:"Mahsulotlar ro'yxati",    desc:"Nomi, narx, miqdor, birlik ko'rish",          tier:'free'    },
      { key:'categories',   label:'Kategoriyalar',            desc:"Kategoriya tegi va filter",                   tier:'free'    },
      { key:'barcode',      label:'Barcode (skaner)',         desc:'Skaner orqali mahsulot qidirish va qo\'shish', tier:'starter' },
      { key:'minStock',     label:'Minimal qoldiq',          desc:'Kam qoldiq ogohlantirish',                    tier:'free'    },
      { key:'costPrice',    label:'Xarid narxi',             desc:'Tan narxini kuzatish va foyda hisoblash',     tier:'free'    },
      { key:'excel_export', label:"Excel eksport",           desc:"Mahsulotlar ro'yxatini .xlsx yuklash",        tier:'starter' },
      { key:'excel_import', label:"Excel import",            desc:"Ommaviy mahsulot yuklash .xlsx shablon bilan",tier:'starter' },
      { key:'image',        label:"Mahsulot rasmi",          desc:'Rasm yuklash, tovar galereya',                tier:'pro'     },
    ],
  },
  customers: {
    label: 'Mijozlar', desc: "Mijozlar bazasi, qarz va savdo tarixi (Starter dan boshlanadi)",
    features: [
      { key:'filter_sozlash',label:"Umumiy filtrlar (qidiruv + status)",     desc:"Barchasi/Qarzdorlar/To'langan va qidiruv paneli", tier:'starter' },
      { key:'excel_debtors', label:"Qarzdorlar ro'yxatini Excel",           desc:"Faqat qarzdorlarni .xlsx yuklash",               tier:'pro'     },
      { key:'date_filter',   label:"Savdolar (sana) filtri",                desc:"Sana oralig'ida sotuvlarni filtrlash + Excel",    tier:'pro'     },
      { key:'excel_all',     label:"Barcha mijozlar Excel",                 desc:"To'liq mijoz ma'lumotlari .xlsx yuklash",        tier:'pro'     },
      { key:'customer_sales',label:"Mijoz savdo tarixi",                    desc:"Mijozga bosib barcha sotuvlarni ko'rish",        tier:'pro'     },
      { key:'debt_detail',   label:"Faol qarzlar",                          desc:"Qarz ustiga bosib faol qarzlar ro'yxati",       tier:'pro'     },
      { key:'sale_detail',   label:"Savdo detali",                          desc:"Chek, qaytarish, to'lash, tarix",               tier:'pro'     },
      { key:'customer_excel',label:"Mijoz savdolari Excelga (sana filtri)", desc:"Sana oralig'i bilan savdolarni .xlsx yuklash",  tier:'pro'     },
      { key:'statistics',    label:"Mijoz statistikasi",                    desc:"Statistika tab: tushum, foyda, trend tahlili",  tier:'pro'     },
    ],
  },
  pos: {
    label: 'Sotuv (POS)', desc: 'Kassir paneli va sotuv terminali',
    features: [
      { key:'terminal',   label:'POS terminal',          desc:'Tovar qidirish va savatga qo\'shish', tier:'free' },
      { key:'cash',       label:'Naqd to\'lov',          desc:'Naqd pul qabul qilish',               tier:'free' },
      { key:'receipt',    label:'Chek chiqarish',        desc:'Sotuv cheki print/PDF',               tier:'free' },
      { key:'card',       label:'Karta to\'lov',         desc:'Karta orqali to\'lov',                tier:'free' },
      { key:'credit',     label:'Nasiya',                desc:'Qarzga sotuv',                        tier:'free' },
      { key:'barcode',    label:'Barcode skaneri',       desc:'Barcode orqali tovar qidirish',       tier:'free' },
      { key:'discount',   label:'Chegirma',              desc:'Foiz yoki summa chegirma',            tier:'free' },
      { key:'markup',     label:'Ustama narx',           desc:'Narxni oshirish imkoni',              tier:'free' },
    ],
  },
  sales: {
    label: 'Audit jurnali', desc: "Sotuvlar, qaytarishlar va tizim loglari tarixi",
    features: [
      { key:'sales_log',         label:"Sotuvlar jurnali",             desc:"Barcha sotuvlar ro'yxati va filtrlash",                tier:'starter' },
      { key:'returns_view',      label:"Qaytarishlar boshqaruvi",      desc:"Qaytarish so'rovlari, approve/reject qilish",           tier:'pro' },
      { key:'receipt_view',      label:"Chekni shu yerda ko'rish",     desc:"Sotuv chekini audit jurnali ichida ochish",            tier:'pro' },
      { key:'system_log',        label:"Tizim loglari",                desc:"Kirish/chiqish, xodim harakatlari, narx o'zgarishi",   tier:'pro' },
      { key:'notify_bell',       label:"Bildirishnomalar",             desc:"Qaytarish va mahsulot o'zgarishida dashboard bildirishi", tier:'pro' },
      { key:'notify_employee',   label:"Xodim o'zgarishi bildirishi",  desc:"Xodim qo'shilganda/o'chirilganda/yangilanganda xabar",    tier:'pro' },
    ],
  },
  reports: {
    label: 'Statistika', desc: 'Savdo tahlili, foyda, hisobotlar',
    features: [
      { key:'top_products',    label:'Top mahsulotlar',            desc:'Eng ko\'p sotilgan mahsulotlar, margin%, foyda',                    tier:'starter' },
      { key:'categories',      label:'Kategoriya tahlili',         desc:'Har kategoriya bo\'yicha tushum, foyda va ulush %',                 tier:'starter' },
      { key:'monthly_panorama',label:'Oylik panorama',             desc:'Yillik jadval: har oy tushum, foyda, savdo va qaytarishlar',        tier:'starter' },
      { key:'date_filter',     label:'Davr filtrlari (Oy/Yil)',    desc:'Oy va Yil davri filtrlari',                                         tier:'starter' },
      { key:'excel_sales',     label:'Savdo Excel',                desc:'Sotuvlar ro\'yxatini .xlsx formatda yuklab olish',                  tier:'starter' },
      { key:'excel_customers', label:'Mijozlar Excel',             desc:'Mijozlar ma\'lumotlarini .xlsx formatda yuklab olish',              tier:'starter' },
      { key:'excel_products',  label:'Mahsulotlar Excel',          desc:'Mahsulotlar ro\'yxatini .xlsx formatda yuklab olish',              tier:'starter' },
      { key:'returns_stat',    label:'Qaytarishlar statistikasi',  desc:'Qaytarish summasi va oylik panoramada qaytarishlar ko\'rsatiladi',  tier:'pro'     },
      { key:'customer_levels', label:'Mijozlar daraja taqsimoti',  desc:'Silver/Gold/Brilliant darajalari bo\'yicha mijozlar tahlili',      tier:'pro'     },
      { key:'margin_analysis', label:'Margin tahlili',             desc:'Umumiy margin %, yalpi va sof foyda, kategoriya margini',          tier:'pro'     },
    ],
  },
  warehouse: {
    label: 'Sklad', desc: 'Ombor hisobi va kirim-chiqim',
    features: [
      { key:'stock',    label:'Tovarlar qoldig\'i',       desc:'Hozirgi ombor holati',             tier:'starter' },
      { key:'low',      label:'Kam qoldiq ogohlantirish', desc:'Minimal ostiga tushganda xabar',   tier:'starter' },
      { key:'income',   label:'Kirim jarayoni',           desc:'Yangi tovar kiritish',             tier:'starter' },
      { key:'expense',  label:'Chiqim jarayoni',          desc:'Tovar chiqarish va hisobdan o\'chirish', tier:'starter' },
      { key:'excel',    label:'Excel eksport',            desc:'Ombor hisobi .xlsx',               tier:'starter' },
      { key:'supplier', label:"Ta'minotchilar bilan bog'liq", desc:"Yetkazuvchilardan kirim",     tier:'pro'     },
    ],
  },
  employees: {
    label: 'Xodimlar', desc: 'Xodimlar, rollar va ruxsatlar',
    features: [
      { key:'list',     label:'Xodimlar ro\'yxati',   desc:'Barcha xodimlarni ko\'rish',        tier:'starter' },
      { key:'roles',    label:'Rol tizimi',            desc:'Admin, kassir, sklad rollar',       tier:'starter' },
      { key:'perms',    label:'Ruxsatlar',             desc:'Har rolgа alohida ruxsatlar',       tier:'starter' },
      { key:'timesheet',label:'Ish vaqti kuzatish',   desc:'Kirish-chiqish vaqtlari',           tier:'pro'     },
      { key:'salary',   label:'Maosh hisobi',         desc:'Oylik hisobot va to\'lovlar',       tier:'pro'     },
    ],
  },
  branches: {
    label: 'Filiallar', desc: "Ko'p filial boshqaruvi va mahsulot ko'chirish (Pro)",
    features: [
      { key:'branch_list',   label:"Filiallar ro'yxati",       desc:"Filiallarni qo'shish, tahrirlash, o'chirish",          tier:'pro' },
      { key:'transfer',      label:"Mahsulot ko'chirish",      desc:"Filiallar orasida mahsulot ko'chirish operatsiyasi",    tier:'pro' },
      { key:'transfer_log',  label:"Ko'chirmalar tarixi",      desc:"Barcha ko'chirmalarning to'liq logi va filtrlash",      tier:'pro' },
      { key:'inventory',     label:"Filial inventari",         desc:"Har filialda qancha mahsulot borligini ko'rish",        tier:'pro' },
      { key:'manager',       label:"Mas'ul shaxs",             desc:"Har filialga mas'ul shaxs tayinlash",                  tier:'pro' },
      { key:'branch_stats',  label:"Filial statistikasi",      desc:"Har filial bo'yicha sotuv va ko'chirma hisoboti",      tier:'pro' },
    ],
  },
};

const TIER_COLOR = {
  free:    { label:'Tekin',   bg:'rgba(16,185,129,0.12)',  border:'rgba(16,185,129,0.4)',  text:'#10b981', badge:'#10b981' },
  starter: { label:'Starter', bg:'rgba(59,130,246,0.12)',  border:'rgba(59,130,246,0.4)',  text:'#3b82f6', badge:'#3b82f6' },
  pro:     { label:'Pro',     bg:'rgba(139,92,246,0.12)', border:'rgba(139,92,246,0.4)', text:'#8b5cf6', badge:'#8b5cf6' },
};

// ── Constants ──────────────────────────────────────────────────────────────────

const INDUSTRIES_VISUAL = [
  { value: 'retail',     label: "Savdo (Retail)",   desc: "Do'kon, supermarket, optom",    icon: ShoppingBag     },
  { value: 'restaurant', label: 'Restoran / Cafe',  desc: 'Cafe, restoran, fast food',     icon: UtensilsCrossed },
  { value: 'clinic',     label: 'Klinika',          desc: 'Tibbiy klinika, poliklinika',   icon: Stethoscope     },
  { value: 'education',  label: "Ta'lim markazi",   desc: "O'quv markazi, kurslar",        icon: GraduationCap   },
  { value: 'fitness',    label: 'Fitnes markaz',    desc: "Sport zali, a'zolik boshqaruvi", icon: Dumbbell       },
  { value: 'beauty',     label: "Go'zallik salon",  desc: 'Sartaroshxona, spa, nail',      icon: Scissors        },
  { value: 'auto',       label: 'Avtoservis',       desc: "Avtomobil ta'mirlash va servis", icon: Wrench         },
];

interface DashboardWidget { key: string; label: string; desc: string; defaultOn: boolean; wide?: boolean; }

const INDUSTRY_DASHBOARD_WIDGETS: Record<string, DashboardWidget[]> = {
  retail: [
    { key: 'revenue',      label: 'Kunlik daromad',      desc: 'Bugungi jami sotuv summasi',           defaultOn: true,  },
    { key: 'todaySales',   label: 'Bugungi sotuvlar',    desc: "Sotuv soni va o'rtacha chek",          defaultOn: true,  },
    { key: 'customers',    label: 'Mijozlar',            desc: 'Aktiv mijozlar va qarzdorlar',         defaultOn: true,  },
    { key: 'lowStock',     label: 'Kam qoldiq',          desc: 'Tugab borayotgan tovarlar',            defaultOn: true,  },
    { key: 'weeklyChart',  label: 'Haftalik grafik',     desc: 'Sotuv dinamikasi (7 kun)',             defaultOn: true,  wide: true },
    { key: 'bestSelling',  label: "Eng ko'p sotilgan",   desc: "TOP 5 mahsulotlar ro'yxati",           defaultOn: true,  wide: true },
  ],
  restaurant: [
    { key: 'rev',          label: 'Bugungi daromad',     desc: 'Jami sotuv va buyurtmalar summasi',    defaultOn: true,  },
    { key: 'activeOrders', label: 'Aktiv buyurtmalar',   desc: 'Hozir tayyorlanayotgan buyurtmalar',   defaultOn: true,  },
    { key: 'todayGuests',  label: 'Bugungi mehmonlar',   desc: "Tashrif buyurganlar va o'rtacha chek", defaultOn: true,  },
    { key: 'tableStatus',  label: 'Stol holati',         desc: "Band va bo'sh stollar real vaqtda",    defaultOn: true,  },
    { key: 'weeklyChart',  label: 'Haftalik daromad',    desc: 'Daromad dinamikasi (7 kun)',           defaultOn: true,  wide: true },
    { key: 'popularDishes',label: 'Mashhur taomlar',     desc: 'TOP sotilgan taomlar bugun',           defaultOn: true,  wide: true },
  ],
  clinic: [
    { key: 'todayAppts',   label: 'Bugungi qabullar',    desc: 'Rejalashtirilgan va tugallangan',      defaultOn: true,  },
    { key: 'waitingQueue', label: 'Navbat',              desc: 'Hozir kutayotgan bemorlar',            defaultOn: true,  },
    { key: 'rev',          label: 'Bugungi daromad',     desc: 'Qabul va dorixona tushumlari',         defaultOn: true,  },
    { key: 'doctorLoad',   label: 'Shifokorlar holati',  desc: "Har shifokorning band/bo'sh holati",   defaultOn: true,  },
    { key: 'weeklyChart',  label: 'Haftalik qabullar',   desc: 'Qabullar dinamikasi (7 kun)',          defaultOn: true,  wide: true },
    { key: 'topDoctors',   label: 'Top shifokorlar',     desc: "Eng ko'p qabul qilganlar",            defaultOn: true,  wide: true },
  ],
  education: [
    { key: 'activeStudents',label: "Aktiv o'quvchilar",  desc: "Guruhlarda o'qiyotganlar soni",        defaultOn: true,  },
    { key: 'todayClasses', label: 'Bugungi darslar',     desc: "Bugun bo'ladigan darslar soni",        defaultOn: true,  },
    { key: 'paymentStatus',label: "To'lovlar holati",    desc: "To'lagan, qarzdor va kutilmoqda",      defaultOn: true,  },
    { key: 'attendance',   label: 'Davomat',             desc: 'Bugungi davomat foizi',                defaultOn: true,  },
    { key: 'weeklyChart',  label: "Oylik to'lovlar",     desc: "To'lov dinamikasi grafigi",            defaultOn: true,  wide: true },
    { key: 'debtors',      label: 'Qarzdorlar',          desc: "Muddati o'tgan to'lovlar ro'yxati",    defaultOn: true,  wide: true },
  ],
  fitness: [
    { key: 'activeMembers', label: "Aktiv a'zolar",      desc: "Joriy oy aktiv obunasi borlar",        defaultOn: true,  },
    { key: 'todayCheckins', label: 'Bugungi kirishlar',   desc: 'Check-in soni va eng band soat',       defaultOn: true,  },
    { key: 'rev',           label: 'Bugungi daromad',    desc: "Obuna va qo'shimcha xizmatlar",        defaultOn: true,  },
    { key: 'expiringPlans', label: 'Obuna tugayotgan',   desc: "5 kun ichida tugaydigan a'zolar",      defaultOn: true,  },
    { key: 'weeklyChart',   label: 'Haftalik kirishlar',  desc: 'Check-in dinamikasi (7 kun)',          defaultOn: true,  wide: true },
    { key: 'peakHours',     label: 'Band soatlar',        desc: 'Kun bo\'yi eng gavjum vaqtlar',        defaultOn: true,  wide: true },
  ],
  beauty: [
    { key: 'todayAppts',    label: 'Bugungi qabullar',   desc: 'Rejalashtirilgan va kelganlar',        defaultOn: true,  },
    { key: 'freeSlots',     label: "Bo'sh slotlar",      desc: "Hozir band bo'lmagan masterlar",       defaultOn: true,  },
    { key: 'rev',           label: 'Bugungi daromad',    desc: 'Xizmatlar va mahsulotlar summasi',     defaultOn: true,  },
    { key: 'masterStatus',  label: 'Masterlar holati',   desc: "Hozir kim bo'sh, kim band",            defaultOn: true,  },
    { key: 'weeklyChart',   label: 'Haftalik grafik',    desc: 'Daromad dinamikasi (7 kun)',           defaultOn: true,  wide: true },
    { key: 'popularServices',label: 'Mashhur xizmatlar', desc: "Bugun eng ko'p buyurtilgan",           defaultOn: true,  wide: true },
  ],
  auto: [
    { key: 'activeOrders',  label: 'Aktiv buyurtmalar',  desc: "Ta'mirlanayotgan mashinalar",          defaultOn: true,  },
    { key: 'readyCars',     label: 'Tayyor mashinalar',  desc: 'Olishga tayyor va xabar berilgan',    defaultOn: true,  },
    { key: 'rev',           label: 'Bugungi daromad',    desc: 'Ish haqqi va qismlar summasi',        defaultOn: true,  },
    { key: 'mechanicLoad',  label: 'Mexaniklar holati',  desc: "Kim bo'sh, kimda nechta mashina",      defaultOn: true,  },
    { key: 'weeklyChart',   label: 'Haftalik grafik',    desc: 'Daromad dinamikasi (7 kun)',           defaultOn: true,  wide: true },
    { key: 'popularRepairs',label: "Mashhur ta'mirlashlar",desc: "Eng ko'p so'ralgan xizmatlar",       defaultOn: true,  wide: true },
  ],
};

// ── Admin retail module definitions (with tiers and inline config) ────────────

interface AdminModuleConfig { key: string; label: string; defaultOn: boolean }
interface AdminModule {
  key: string; label: string; desc: string;
  tier: 'majburiy' | 'tekin' | 'starter' | 'pro';
  config: AdminModuleConfig[];
}

const ADMIN_RETAIL_MODULES: AdminModule[] = [
  {
    key: 'pos', label: 'Sotuv (POS)', desc: 'Kassir paneli va sotuv terminali',
    tier: 'majburiy',
    config: [
      { key: 'cash',     label: 'Naqd to\'lov',     defaultOn: true  },
      { key: 'card',     label: 'Karta to\'lov',     defaultOn: true  },
      { key: 'credit',   label: 'Nasiya',            defaultOn: true  },
      { key: 'transfer', label: "O'tkazma",          defaultOn: false },
      { key: 'barcode',  label: 'Barcode skaneri',   defaultOn: false },
      { key: 'discount', label: 'Chegirma',          defaultOn: true  },
    ],
  },
  {
    key: 'products', label: 'Mahsulotlar', desc: 'Tovarlar katalogi va narxlar',
    tier: 'majburiy',
    config: [
      { key: 'categories', label: 'Kategoriyalar',   defaultOn: true  },
      { key: 'barcode',    label: 'Shtrix-kod',      defaultOn: false },
      { key: 'minStock',   label: 'Minimal qoldiq',  defaultOn: true  },
    ],
  },
  {
    key: 'customers', label: 'Mijozlar', desc: "Mijozlar bazasi va to'lovlar",
    tier: 'starter',
    config: [
      { key: 'debt',     label: 'Qarz kuzatish',     defaultOn: true  },
      { key: 'payments', label: "To'lov tarixi",     defaultOn: true  },
      { key: 'contacts', label: 'Kontaktlar',        defaultOn: true  },
      { key: 'birthday', label: "Tug'ilgan kun",     defaultOn: false },
    ],
  },
  {
    key: 'sales', label: 'Audit jurnali', desc: 'Barcha amallar tarixi va loglari',
    tier: 'starter',
    config: [
      { key: 'sales_log',   label: 'Sotuv loglari',        defaultOn: true  },
      { key: 'emp_log',     label: 'Xodim harakatlari',    defaultOn: true  },
      { key: 'prod_changes',label: "Tovar o'zgarishlari",  defaultOn: true  },
    ],
  },
  {
    key: 'reports', label: 'Statistika', desc: 'Excel, PDF hisobotlar va tahlil',
    tier: 'starter',
    config: [
      { key: 'excel',  label: 'Excel eksport',   defaultOn: true  },
      { key: 'pdf',    label: 'PDF eksport',     defaultOn: true  },
      { key: 'daily',  label: 'Kunlik hisobot',  defaultOn: false },
      { key: 'charts', label: 'Grafiklar',       defaultOn: true  },
    ],
  },
  {
    key: 'warehouse', label: 'Sklad', desc: 'Ombor hisobi va kirim-chiqim',
    tier: 'pro',
    config: [
      { key: 'low_stock', label: 'Kam qoldiq ogohlantirish', defaultOn: true  },
      { key: 'income_log',label: 'Kirim-chiqim loglari',     defaultOn: true  },
      { key: 'supplier',  label: "Ta'minotchilar",            defaultOn: false },
    ],
  },
  {
    key: 'employees', label: 'Xodimlar', desc: 'Xodimlar, rollar va ruxsatlar',
    tier: 'starter',
    config: [
      { key: 'roles',     label: 'Rol tizimi',          defaultOn: true  },
      { key: 'timesheet', label: 'Ish vaqti kuzatish',  defaultOn: false },
      { key: 'salary',    label: 'Maosh hisobi',        defaultOn: false },
    ],
  },
  {
    key: 'branches', label: 'Filiallar', desc: "Ko'p filial boshqaruvi, mahsulot ko'chirish",
    tier: 'pro',
    config: [
      { key: 'transfer_log', label: "Ko'chirma loglari",    defaultOn: true  },
      { key: 'inventory',    label: 'Filial inventari',     defaultOn: true  },
      { key: 'manager',      label: 'Mas\'ul shaxs',        defaultOn: false },
    ],
  },
];

const ADMIN_RESTAURANT_MODULES: AdminModule[] = [
  {
    key: 'menu', label: 'Menyu', desc: 'Taomlar, kategoriyalar, narxlar va rasmlar',
    tier: 'majburiy',
    config: [
      { key: 'categories',  label: 'Kategoriyalar',                   defaultOn: true  },
      { key: 'photos',      label: 'Taom rasmlari',                   defaultOn: true  },
      { key: 'modifiers',   label: "Qo'shimchalar (o'lchov, ta'm)",   defaultOn: false },
      { key: 'combo',       label: 'Kombinatsiyalar (Combo set)',      defaultOn: false },
    ],
  },
  {
    key: 'orders', label: 'Buyurtmalar', desc: "Qabul, holat kuzatish va yopish",
    tier: 'majburiy',
    config: [
      { key: 'table',    label: 'Stolga buyurtma',    defaultOn: true  },
      { key: 'takeaway', label: "Olib ketish",         defaultOn: true  },
      { key: 'delivery', label: 'Yetkazib berish',    defaultOn: false },
    ],
  },
  {
    key: 'tables', label: 'Stol boshqaruvi', desc: 'Zal sxemasi, band/bo\'sh holati va QR menyu',
    tier: 'tekin',
    config: [
      { key: 'floor_plan',   label: 'Zal sxemasi',               defaultOn: true  },
      { key: 'qr_order',     label: 'QR menyu (mijoz buyurtmasi)', defaultOn: false },
      { key: 'reservation',  label: 'Oldindan bron qilish',       defaultOn: false },
    ],
  },
  {
    key: 'kitchen', label: 'Oshxona ekrani (KDS)', desc: 'Real vaqtda buyurtmalar ekrani',
    tier: 'starter',
    config: [
      { key: 'timer',    label: 'Tayyorlash vaqti hisobi',         defaultOn: true  },
      { key: 'sections', label: "Bo'limlar (salatlar, grill...)",   defaultOn: false },
      { key: 'sound',    label: 'Yangi buyurtma tovush xabari',    defaultOn: true  },
    ],
  },
  {
    key: 'pos_cash', label: 'Kassa (POS)', desc: "To'lov qabul qilish va hisobni bo'lish",
    tier: 'tekin',
    config: [
      { key: 'cash',    label: 'Naqd',               defaultOn: true  },
      { key: 'card',    label: 'Karta',              defaultOn: true  },
      { key: 'split',   label: "Hisobni bo'lish",    defaultOn: false },
      { key: 'discount',label: 'Chegirma',           defaultOn: true  },
    ],
  },
  {
    key: 'delivery', label: 'Yetkazib berish', desc: 'Kuryer, zona va online buyurtmalar',
    tier: 'pro',
    config: [
      { key: 'couriers', label: 'Kuryerlar',           defaultOn: true  },
      { key: 'zones',    label: 'Yetkazish zonalari',  defaultOn: false },
      { key: 'tracking', label: 'Buyurtma kuzatish',   defaultOn: false },
    ],
  },
  {
    key: 'employees', label: 'Xodimlar', desc: 'Ofitsiant, oshpaz, kassir va rollar',
    tier: 'starter',
    config: [
      { key: 'shifts', label: 'Navbat jadvali',   defaultOn: false },
      { key: 'tips',   label: 'Choy puli hisobi', defaultOn: false },
    ],
  },
  {
    key: 'reports', label: 'Statistika', desc: 'Daromad, mashhur taomlar, soatlik tahlil',
    tier: 'starter',
    config: [
      { key: 'revenue',        label: 'Daromad hisoboti',          defaultOn: true  },
      { key: 'popular_dishes', label: 'Mashhur taomlar',           defaultOn: true  },
      { key: 'hourly',         label: "Eng band soatlar",          defaultOn: false },
      { key: 'waiter_stats',   label: 'Ofitsiant statistikasi',    defaultOn: false },
      { key: 'excel',          label: 'Excel eksport',             defaultOn: true  },
    ],
  },
];

const ADMIN_CLINIC_MODULES: AdminModule[] = [
  {
    key: 'patients', label: 'Bemorlar', desc: 'Profil, tibbiy tarix va murojaat logi',
    tier: 'majburiy',
    config: [
      { key: 'medical_history', label: 'Tibbiy tarix',             defaultOn: true  },
      { key: 'attachments',     label: 'Hujjat va tahlil fayllari', defaultOn: true  },
      { key: 'insurance',       label: "Sug'urta ma'lumotlari",     defaultOn: false },
    ],
  },
  {
    key: 'appointments', label: 'Qabullar', desc: 'Navbat jadvali, holat va eslatmalar',
    tier: 'majburiy',
    config: [
      { key: 'calendar',       label: 'Shifokor jadvali (kalendar)', defaultOn: true  },
      { key: 'sms_reminder',   label: 'SMS eslatma (1 kun oldin)',  defaultOn: false },
      { key: 'online_booking', label: 'Online bron (link orqali)',   defaultOn: false },
    ],
  },
  {
    key: 'doctors', label: 'Shifokorlar', desc: 'Ixtisoslik, qabul jadvali va kabinet',
    tier: 'majburiy',
    config: [
      { key: 'specializations', label: 'Ixtisosliklar',             defaultOn: true  },
      { key: 'schedule',        label: 'Qabul jadvali',             defaultOn: true  },
      { key: 'performance',     label: 'Shifokor statistikasi',     defaultOn: false },
    ],
  },
  {
    key: 'visits', label: 'Murojaat yozuvi', desc: 'Shikoyat, tashxis va davo rejasi',
    tier: 'tekin',
    config: [
      { key: 'diagnosis',      label: 'ICD-10 tashxis kodi',        defaultOn: false },
      { key: 'treatment_plan', label: 'Davo rejasi',                defaultOn: true  },
      { key: 'vitals',         label: "Ko'rsatkichlar (BP, temp)", defaultOn: true  },
    ],
  },
  {
    key: 'prescriptions', label: 'Retseptlar', desc: 'Dori buyurtma, chop etish va tarix',
    tier: 'starter',
    config: [
      { key: 'print',        label: 'Retsept chop etish',  defaultOn: true  },
      { key: 'drug_catalog', label: 'Dorilar katalogi',    defaultOn: true  },
    ],
  },
  {
    key: 'pharmacy', label: 'Dorixona', desc: "Dori qoldig'i, muddati va sotuv",
    tier: 'starter',
    config: [
      { key: 'stock',  label: "Dori qoldig'i",      defaultOn: true  },
      { key: 'expiry', label: 'Muddati kuzatish',   defaultOn: true  },
      { key: 'sales',  label: 'Dorixona sotuvlari', defaultOn: false },
    ],
  },
  {
    key: 'billing_clinic', label: "To'lovlar", desc: "Qabul narxi va to'lov tarixi",
    tier: 'tekin',
    config: [
      { key: 'cash',             label: 'Naqd',             defaultOn: true  },
      { key: 'card',             label: 'Karta',            defaultOn: true  },
      { key: 'debt',             label: 'Qarz kuzatish',   defaultOn: true  },
      { key: 'insurance_billing',label: "Sug'urta to'lovi", defaultOn: false },
    ],
  },
  {
    key: 'lab', label: 'Laboratoriya', desc: 'Tahlillar, natijalar va norma chegaralari',
    tier: 'pro',
    config: [
      { key: 'results',          label: 'Natijalar kiritish',       defaultOn: true  },
      { key: 'reference_ranges', label: 'Normalar va og\'ish belgisi', defaultOn: true  },
    ],
  },
  {
    key: 'employees', label: 'Xodimlar', desc: "Hamshiralar, qabulchilar va adminlar",
    tier: 'starter',
    config: [
      { key: 'roles',  label: 'Rol tizimi',         defaultOn: true  },
      { key: 'shifts', label: 'Navbat jadvali',     defaultOn: false },
    ],
  },
  {
    key: 'reports', label: 'Statistika', desc: "Shifokor yuklamasi, bemorlar oqimi, daromad",
    tier: 'starter',
    config: [
      { key: 'patient_flow', label: "Bemorlar oqimi",      defaultOn: true  },
      { key: 'doctor_load',  label: 'Shifokor yuklamasi',  defaultOn: true  },
      { key: 'revenue',      label: 'Daromad hisoboti',    defaultOn: true  },
      { key: 'excel',        label: 'Excel eksport',       defaultOn: true  },
    ],
  },
];

const ADMIN_EDUCATION_MODULES: AdminModule[] = [
  {
    key: 'students', label: "O'quvchilar", desc: "Ro'yxat, guruh, profil va ota-ona kontakti",
    tier: 'majburiy',
    config: [
      { key: 'groups',          label: 'Guruhlar',                    defaultOn: true  },
      { key: 'parent_contacts', label: 'Ota-ona kontakti',            defaultOn: true  },
      { key: 'id_cards',        label: 'ID karta chiqarish',          defaultOn: false },
    ],
  },
  {
    key: 'courses', label: 'Kurslar', desc: "Fanlar, daraja, muddat va narxlar",
    tier: 'majburiy',
    config: [
      { key: 'levels',     label: 'Darajalar (A1, A2, B1...)',  defaultOn: true  },
      { key: 'price_list', label: "Narxlar ro'yxati",           defaultOn: true  },
      { key: 'online',     label: 'Online kurslar',             defaultOn: false },
    ],
  },
  {
    key: 'teachers', label: "O'qituvchilar", desc: "Profil, jadval va fan bo'yicha yuklama",
    tier: 'majburiy',
    config: [
      { key: 'schedule',    label: 'Dars jadvali',              defaultOn: true  },
      { key: 'salary',      label: 'Maosh hisobi',              defaultOn: false },
      { key: 'performance', label: "O'qituvchi statistikasi",   defaultOn: false },
    ],
  },
  {
    key: 'attendance', label: 'Davomat', desc: "Yo'qlamalar va SMS xabarnoma",
    tier: 'tekin',
    config: [
      { key: 'sms_absent',    label: "SMS (kelmaganlar uchun)",   defaultOn: false },
      { key: 'qr_checkin',    label: 'QR kirish nazorati',        defaultOn: false },
      { key: 'monthly_report',label: 'Oylik davomat hisoboti',    defaultOn: true  },
    ],
  },
  {
    key: 'edu_payments', label: "To'lovlar", desc: "Oylik to'lov, qarz kuzatish va eslatma",
    tier: 'majburiy',
    config: [
      { key: 'debt_tracking',  label: "Qarz kuzatish",           defaultOn: true  },
      { key: 'sms_reminder',   label: "To'lov eslatmasi SMS",    defaultOn: false },
      { key: 'installment',    label: "Muddatli to'lov",         defaultOn: false },
      { key: 'discount',       label: "Chegirma va imtiyozlar",  defaultOn: false },
    ],
  },
  {
    key: 'schedule', label: 'Jadval', desc: "Dars jadvali, xonalar va to'qnashuv tekshiruvi",
    tier: 'starter',
    config: [
      { key: 'rooms',          label: 'Xonalar va sig\'imlar',       defaultOn: true  },
      { key: 'conflict_check', label: "Jadval to'qnashuvini aniqlash", defaultOn: true  },
    ],
  },
  {
    key: 'grades', label: 'Baholash', desc: 'Test natijalari va o\'quvchi progressi',
    tier: 'pro',
    config: [
      { key: 'tests',         label: 'Test va topshiriqlar',    defaultOn: true  },
      { key: 'progress_chart',label: 'Progress grafik',         defaultOn: true  },
      { key: 'certificates',  label: 'Sertifikat chiqarish',    defaultOn: false },
    ],
  },
  {
    key: 'employees', label: 'Xodimlar', desc: 'Qabulchi va admin xodimlar',
    tier: 'starter',
    config: [
      { key: 'roles',  label: 'Rol tizimi', defaultOn: true  },
    ],
  },
  {
    key: 'reports', label: 'Statistika', desc: "To'lov yig'imi, davomat, o'quvchilar oqimi",
    tier: 'starter',
    config: [
      { key: 'payment_collection', label: "To'lov yig'imi",        defaultOn: true  },
      { key: 'attendance_rate',    label: 'Davomat ko\'rsatgichi', defaultOn: true  },
      { key: 'student_flow',       label: "O'quvchilar oqimi",     defaultOn: true  },
      { key: 'excel',              label: 'Excel eksport',         defaultOn: true  },
    ],
  },
];

const ADMIN_FITNESS_MODULES: AdminModule[] = [
  {
    key: 'gym_members', label: "A'zolar", desc: "Profil, foto, kontakt va obuna holati",
    tier: 'majburiy',
    config: [
      { key: 'photos',       label: "A'zo fotosi",                   defaultOn: true  },
      { key: 'measurements', label: "Tana o'lchamlari kuzatish",     defaultOn: false },
      { key: 'goals',        label: 'Maqsad va yutuq kuzatish',      defaultOn: false },
    ],
  },
  {
    key: 'gym_plans', label: 'Obuna rejalari', desc: 'Narxlar, muddatlar va kirish darajalari',
    tier: 'majburiy',
    config: [
      { key: 'monthly',   label: 'Oylik',           defaultOn: true  },
      { key: 'quarterly', label: 'Chorak yillik',   defaultOn: true  },
      { key: 'annual',    label: 'Yillik',           defaultOn: true  },
      { key: 'day_pass',  label: 'Kunlik kirish',   defaultOn: false },
      { key: 'guest',     label: 'Mehmon kirishi',  defaultOn: false },
    ],
  },
  {
    key: 'gym_checkin', label: 'Kirish nazorati', desc: 'QR, RFID yoki telefon raqami orqali',
    tier: 'majburiy',
    config: [
      { key: 'qr',     label: 'QR kod',        defaultOn: true  },
      { key: 'phone',  label: 'Telefon raqami', defaultOn: true  },
      { key: 'rfid',   label: 'RFID karta',    defaultOn: false },
    ],
  },
  {
    key: 'trainers', label: 'Murabbiylar', desc: "Profil, ixtisoslik va individual mashg'ulotlar",
    tier: 'starter',
    config: [
      { key: 'specializations',   label: 'Ixtisosliklar',          defaultOn: true  },
      { key: 'personal_sessions', label: "Individual mashg'ulotlar", defaultOn: true  },
      { key: 'schedule',          label: 'Ish jadvali',             defaultOn: true  },
    ],
  },
  {
    key: 'classes', label: "Guruh mashg'ulotlar", desc: "Jadval, sig'im va bron qilish",
    tier: 'starter',
    config: [
      { key: 'schedule', label: "Mashg'ulot jadvali", defaultOn: true  },
      { key: 'capacity', label: "Sig'im nazorati",    defaultOn: true  },
      { key: 'booking',  label: 'Online bron',         defaultOn: false },
    ],
  },
  {
    key: 'pos_gym', label: 'Kassa', desc: "Obuna to'lov va qo'shimcha xizmatlar",
    tier: 'tekin',
    config: [
      { key: 'cash',        label: 'Naqd',                   defaultOn: true  },
      { key: 'card',        label: 'Karta',                  defaultOn: true  },
      { key: 'supplements', label: 'Sport ozuqasi sotuvlari', defaultOn: false },
    ],
  },
  {
    key: 'employees', label: 'Xodimlar', desc: 'Qabulchi, tozalovchi va adminlar',
    tier: 'starter',
    config: [
      { key: 'roles',  label: 'Rol tizimi',    defaultOn: true  },
      { key: 'shifts', label: 'Navbat jadvali', defaultOn: false },
    ],
  },
  {
    key: 'reports', label: 'Statistika', desc: "A'zolar oqimi, to'lov, checkin va retention",
    tier: 'starter',
    config: [
      { key: 'member_flow',  label: "A'zolar oqimi",             defaultOn: true  },
      { key: 'retention',    label: "Saqlab qolish ko'rsatgichi", defaultOn: true  },
      { key: 'peak_hours',   label: "Eng band soatlar",           defaultOn: true  },
      { key: 'trainer_stats',label: 'Murabbiy statistikasi',      defaultOn: false },
      { key: 'excel',        label: 'Excel eksport',              defaultOn: true  },
    ],
  },
];

const ADMIN_BEAUTY_MODULES: AdminModule[] = [
  {
    key: 'beauty_appointments', label: 'Qabullar', desc: 'Bron jadvali, holat va eslatmalar',
    tier: 'majburiy',
    config: [
      { key: 'calendar_view',  label: "Master jadvali ko'rinishi",    defaultOn: true  },
      { key: 'walk_in',        label: "Navbatsiz (walk-in) kirish",   defaultOn: true  },
      { key: 'sms_reminder',   label: 'SMS eslatma (1 kun oldin)',    defaultOn: false },
      { key: 'online_booking', label: 'Online bron (link orqali)',    defaultOn: false },
    ],
  },
  {
    key: 'beauty_services_catalog', label: 'Xizmatlar', desc: 'Katalog, narxlar va davomiyligi',
    tier: 'majburiy',
    config: [
      { key: 'categories', label: 'Kategoriyalar',                    defaultOn: true  },
      { key: 'duration',   label: "Davomiylik (ish vaqtini hisoblash)", defaultOn: true  },
      { key: 'photos',     label: 'Xizmat namunalari (fotolar)',       defaultOn: false },
    ],
  },
  {
    key: 'beauty_masters', label: 'Masterlar', desc: 'Profil, ixtisoslik, jadval va portfolio',
    tier: 'majburiy',
    config: [
      { key: 'specializations', label: 'Ixtisosliklar',                 defaultOn: true  },
      { key: 'schedule',        label: 'Ish jadvali va dam olish',       defaultOn: true  },
      { key: 'portfolio',       label: 'Ish namunalari (portfolio)',     defaultOn: false },
      { key: 'commission',      label: 'Komissiya hisoblash',            defaultOn: false },
    ],
  },
  {
    key: 'customers', label: 'Mijozlar', desc: 'Tashrif tarixi, sevimli master va eslatmalar',
    tier: 'tekin',
    config: [
      { key: 'visit_history', label: 'Tashrif tarixi',          defaultOn: true  },
      { key: 'preferences',   label: 'Mijoz istaklari',         defaultOn: true  },
      { key: 'loyalty',       label: 'Sodiqlik ball tizimi',    defaultOn: false },
      { key: 'debt',          label: 'Qarz kuzatish',           defaultOn: false },
    ],
  },
  {
    key: 'pos_beauty', label: 'Kassa', desc: "Xizmat to'lovi va mahsulot sotuvlari",
    tier: 'tekin',
    config: [
      { key: 'cash',     label: 'Naqd',                           defaultOn: true  },
      { key: 'card',     label: 'Karta',                          defaultOn: true  },
      { key: 'products', label: "Sartaroshlik mahsulotlari sotuvlari", defaultOn: false },
      { key: 'discount', label: 'Chegirma',                       defaultOn: true  },
    ],
  },
  {
    key: 'inventory_beauty', label: 'Materiallar', desc: "Sarflanadigan mahsulotlar hisobi",
    tier: 'starter',
    config: [
      { key: 'consumption', label: 'Xizmatda sarflanish hisobi', defaultOn: true  },
      { key: 'low_stock',   label: 'Tugab borayotgan xabar',     defaultOn: true  },
      { key: 'supplier',    label: "Ta'minotchilar",             defaultOn: false },
    ],
  },
  {
    key: 'employees', label: 'Xodimlar', desc: 'Qabulchi va admin xodimlar',
    tier: 'starter',
    config: [
      { key: 'roles',  label: 'Rol tizimi',    defaultOn: true  },
      { key: 'shifts', label: 'Navbat jadvali', defaultOn: false },
    ],
  },
  {
    key: 'reports', label: 'Statistika', desc: "Daromad, master natijalari, mashhur xizmatlar",
    tier: 'starter',
    config: [
      { key: 'revenue',           label: 'Daromad hisoboti',          defaultOn: true  },
      { key: 'master_performance',label: 'Master natijalari',         defaultOn: true  },
      { key: 'popular_services',  label: 'Mashhur xizmatlar',         defaultOn: true  },
      { key: 'client_retention',  label: "Mijozlarni saqlab qolish",  defaultOn: false },
      { key: 'excel',             label: 'Excel eksport',             defaultOn: true  },
    ],
  },
];

const ADMIN_AUTO_MODULES: AdminModule[] = [
  {
    key: 'auto_orders', label: 'Servis buyurtmalari', desc: "Qabul, tashxis, ta'mir va topshirish",
    tier: 'majburiy',
    config: [
      { key: 'stages',      label: 'Holat bosqichlari (7 qadam)',   defaultOn: true  },
      { key: 'diagnosis',   label: 'Tashxis bayonnomasi',           defaultOn: true  },
      { key: 'sms_ready',   label: "SMS (mashina tayyor bo'lganda)", defaultOn: false },
      { key: 'photo_intake',label: 'Qabul fotosuratlari',           defaultOn: false },
    ],
  },
  {
    key: 'auto_vehicles', label: 'Avtomobillar', desc: "Mijoz mashinasi, tarix va TO eslatmasi",
    tier: 'majburiy',
    config: [
      { key: 'vin',             label: 'VIN raqam',               defaultOn: true  },
      { key: 'mileage',         label: 'Yurish kuzatish',         defaultOn: true  },
      { key: 'service_history', label: "To'liq servis tarixi",    defaultOn: true  },
      { key: 'to_reminder',     label: "Keyingi TO eslatmasi",    defaultOn: false },
    ],
  },
  {
    key: 'customers', label: 'Mijozlar', desc: "Profil, mashinalar ro'yxati va murojaat tarixi",
    tier: 'majburiy',
    config: [
      { key: 'multi_vehicle', label: 'Bir mijoz — bir nechta mashina', defaultOn: true  },
      { key: 'debt',          label: 'Qarz kuzatish',                  defaultOn: true  },
      { key: 'sms',           label: 'SMS xabarnoma',                  defaultOn: false },
    ],
  },
  {
    key: 'mechanics', label: 'Mexaniklar', desc: "Ixtisoslik, joriy yuklanma va ish tarixi",
    tier: 'tekin',
    config: [
      { key: 'specializations', label: 'Ixtisosliklar',           defaultOn: true  },
      { key: 'workload',        label: 'Joriy yuklanma',          defaultOn: true  },
      { key: 'performance',     label: 'Mexanik statistikasi',    defaultOn: false },
    ],
  },
  {
    key: 'parts_warehouse', label: 'Ehtiyot qismlar', desc: "Qoldiq, buyurtma va sarflanish logi",
    tier: 'starter',
    config: [
      { key: 'stock',     label: "Qoldiq nazorati",               defaultOn: true  },
      { key: 'low_stock', label: 'Kam qoldiq ogohlantirish',      defaultOn: true  },
      { key: 'supplier',  label: "Ta'minotchilar",                defaultOn: false },
      { key: 'barcode',   label: 'Barcode skaneri',               defaultOn: false },
    ],
  },
  {
    key: 'billing_auto', label: 'Hisob-faktura', desc: "Ish narxi + qismlar = umumiy summa, akt",
    tier: 'tekin',
    config: [
      { key: 'cash',    label: 'Naqd',                        defaultOn: true  },
      { key: 'card',    label: 'Karta',                       defaultOn: true  },
      { key: 'act',     label: "Ishlash dalolatnomasi (akt)", defaultOn: false },
      { key: 'discount',label: 'Chegirma',                    defaultOn: true  },
    ],
  },
  {
    key: 'employees', label: 'Xodimlar', desc: 'Qabulchi, kassir va adminlar',
    tier: 'starter',
    config: [
      { key: 'roles',  label: 'Rol tizimi',    defaultOn: true  },
      { key: 'shifts', label: 'Navbat jadvali', defaultOn: false },
    ],
  },
  {
    key: 'reports', label: 'Statistika', desc: "Daromad, mexanik samaradorligi, mashhur ta'mirlashlar",
    tier: 'starter',
    config: [
      { key: 'revenue',         label: 'Daromad hisoboti',              defaultOn: true  },
      { key: 'popular_services',label: "Mashhur ta'mirlashlar",         defaultOn: true  },
      { key: 'mechanic_stats',  label: 'Mexanik samaradorligi',         defaultOn: false },
      { key: 'parts_usage',     label: 'Ehtiyot qismlar sarfi',         defaultOn: false },
      { key: 'excel',           label: 'Excel eksport',                 defaultOn: true  },
    ],
  },
];

const INDUSTRY_MODULES: Record<string, AdminModule[]> = {
  retail:     ADMIN_RETAIL_MODULES,
  restaurant: ADMIN_RESTAURANT_MODULES,
  clinic:     ADMIN_CLINIC_MODULES,
  education:  ADMIN_EDUCATION_MODULES,
  fitness:    ADMIN_FITNESS_MODULES,
  beauty:     ADMIN_BEAUTY_MODULES,
  auto:       ADMIN_AUTO_MODULES,
};

const TIER_STYLE = {
  majburiy: { label: 'Majburiy', bg: '#f59e0b', color: '#fff' },
  tekin:    { label: 'Tekin',    bg: '#10b981', color: '#fff' },
  starter:  { label: 'Starter',  bg: '#3b82f6', color: '#fff' },
  pro:      { label: 'Pro',      bg: '#8b5cf6', color: '#fff' },
};

const INDUSTRY_PRESETS: Record<string, { modules: string[]; roles: string[] }> = {
  retail:     { modules: ['pos', 'products', 'customers', 'sales', 'reports', 'employees', 'warehouse', 'branches'],                                                          roles: ['admin', 'cashier', 'warehouse_manager', 'accountant', 'sales_manager'] },
  restaurant: { modules: ['menu', 'orders', 'tables', 'kitchen', 'pos_cash', 'employees', 'reports'],                                                                         roles: ['admin', 'waiter', 'cook', 'cashier', 'delivery_courier'] },
  clinic:     { modules: ['patients', 'appointments', 'doctors', 'visits', 'prescriptions', 'pharmacy', 'billing_clinic', 'employees', 'reports'],                            roles: ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'accountant'] },
  education:  { modules: ['students', 'courses', 'teachers', 'attendance', 'edu_payments', 'schedule', 'employees', 'reports'],                                               roles: ['admin', 'teacher', 'receptionist', 'accountant', 'curator'] },
  fitness:    { modules: ['gym_members', 'gym_plans', 'gym_checkin', 'trainers', 'pos_gym', 'employees', 'reports'],                                                           roles: ['admin', 'trainer', 'receptionist', 'accountant'] },
  beauty:     { modules: ['beauty_appointments', 'beauty_services_catalog', 'beauty_masters', 'customers', 'pos_beauty', 'employees', 'reports'],                             roles: ['admin', 'master', 'receptionist', 'cashier'] },
  auto:       { modules: ['auto_orders', 'auto_vehicles', 'customers', 'mechanics', 'parts_warehouse', 'billing_auto', 'employees', 'reports'],                               roles: ['admin', 'mechanic', 'receptionist', 'accountant'] },
};

const MODULE_META: Record<string, { label: string }> = {
  pos:          { label: 'Sotuv (POS)' },
  products:     { label: 'Mahsulotlar' },
  sales:        { label: 'Sotuv tarixi' },
  warehouse:    { label: 'Sklad' },
  customers:    { label: 'Mijozlar' },
  payments:     { label: "To'lovlar" },
  reports:      { label: 'Statistika' },
  suppliers:    { label: "Ta'minotchilar" },
  patients:     { label: 'Bemorlar' },
  appointments: { label: 'Qabullar' },
  doctors:      { label: 'Shifokorlar' },
  pharmacy:      { label: 'Dorixona' },
  prescriptions: { label: 'Retseptlar' },
  edu_payments:  { label: "Oylik to'lovlar" },
  students:      { label: "O'quvchilar" },
  courses:      { label: 'Kurslar' },
  teachers:     { label: "O'qituvchilar" },
  attendance:   { label: 'Davomat' },
  schedule:     { label: 'Jadval' },
  menu:         { label: 'Menyu' },
  orders:       { label: 'Buyurtmalar' },
  kitchen:      { label: 'Oshxona' },
  tables:       { label: 'Stollar' },
  delivery:     { label: 'Yetkazib berish' },
  branches:     { label: 'Filiallar' },
  gym_members:             { label: "A'zolar" },
  gym_plans:               { label: 'Obuna rejalari' },
  gym_checkin:             { label: 'Kirish nazorati' },
  trainers:                { label: 'Murabbiylar' },
  classes:                 { label: "Guruh mashg'ulotlar" },
  pos_gym:                 { label: 'Kassa (Fitnes)' },
  beauty_appointments:     { label: 'Qabullar' },
  beauty_masters:          { label: 'Masterlar' },
  beauty_services_catalog: { label: 'Xizmatlar' },
  pos_beauty:              { label: 'Kassa (Beauty)' },
  inventory_beauty:        { label: 'Materiallar' },
  auto_orders:             { label: 'Servis buyurtmalari' },
  auto_vehicles:           { label: 'Avtomobillar' },
  mechanics:               { label: 'Mexaniklar' },
  parts_warehouse:         { label: 'Ehtiyot qismlar' },
  billing_auto:            { label: 'Hisob-faktura' },
  visits:                  { label: 'Murojaat yozuvi' },
  billing_clinic:          { label: "To'lovlar (Klinika)" },
  lab:                     { label: 'Laboratoriya' },
  pos_cash:                { label: 'Kassa (Restoran)' },
  grades:                  { label: 'Baholash' },
  debts:                   { label: 'Qarzdorlik' },
  deliveries:              { label: 'Yetkazib berish' },
  employees:               { label: 'Xodimlar' },
};

const ROLE_META: Record<string, { label: string }> = {
  admin:             { label: 'Admin' },
  cashier:           { label: 'Kassir' },
  warehouse_manager: { label: 'Sklad boshqaruvchi' },
  accountant:        { label: 'Buxgalter' },
  sales_manager:     { label: 'Sotuv menejeri' },
  doctor:            { label: 'Shifokor' },
  nurse:             { label: 'Hamshira' },
  receptionist:      { label: 'Qabulchi' },
  pharmacist:        { label: 'Dorixonachi' },
  teacher:           { label: "O'qituvchi" },
  student:           { label: "O'quvchi" },
  curator:           { label: 'Kurator' },
  waiter:            { label: 'Ofitsiant' },
  cook:              { label: 'Oshpaz' },
  delivery_courier:  { label: 'Yetkazuvchi' },
  trainer:           { label: 'Murabbiy' },
  mechanic:          { label: 'Avtomexanik' },
  master:            { label: 'Master (beauty)' },
};

const COLOR_PRESETS = [
  '#6366f1', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#ec4899', '#1e3a8a',
];

const INDUSTRY_SHOP_LABEL: Record<string, string> = {
  retail:     "Do'kon nomi",
  restaurant: 'Restoran nomi',
  clinic:     'Klinika nomi',
  education:  'Markaz nomi',
  fitness:    'Fitnes markaz nomi',
  beauty:     'Salon nomi',
  auto:       'Servis nomi',
};

const INDUSTRY_SHOP_PLACEHOLDER: Record<string, string> = {
  retail:     "Alisher Dukon",
  restaurant: "Osh Markazi",
  clinic:     "Salomatlik Klinikasi",
  education:  "Bilim O'quv Markazi",
  fitness:    "PowerFit Gym",
  beauty:     "Gulnora Beauty Salon",
  auto:       "Speed Avtoservis",
};

const INDUSTRY_MANDATORY: Record<string, string[]> = {
  restaurant: ['menu', 'orders', 'employees'],
  clinic:     ['patients', 'appointments', 'doctors', 'employees'],
  education:  ['students', 'courses', 'teachers', 'edu_payments', 'employees'],
  fitness:    ['gym_members', 'gym_plans', 'gym_checkin', 'employees'],
  beauty:     ['beauty_appointments', 'beauty_services_catalog', 'beauty_masters', 'employees'],
  auto:       ['auto_orders', 'auto_vehicles', 'customers', 'employees'],
};


const STEP_LABELS = ['Soha', 'Dashboard', 'Modullar', 'Chek', 'Rollar', 'Dizayn', 'Tarif'];
const STEP_DESCS  = [
  'Biznesingiz sohasini tanlang',
  'Dashboard vidjеtlarini sozlang',
  'Qaysi modullar kerak?',
  "Chek ko'rinishini sozlang",
  'Xodimlar rollarini belgilang',
  "CRM ko'rinishini moslashtiring",
  'To\'lov tarifini tanlang',
];

const WIZARD_ORDER = [1, 6, 2, 3, 7]; // Soha, Dizayn, Dashboard, Modullar, Tarif

const INDUSTRY_LABEL: Record<string, string> = Object.fromEntries(
  INDUSTRIES_VISUAL.map((i) => [i.value, i.label]),
);

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));

// ── ConfigDrawer constants ─────────────────────────────────────────────────────

const CFG_TABS = [
  { key: 'general',   label: 'Umumiy'     },
  { key: 'modules',   label: 'Modullar'   },
  { key: 'theme',     label: "Ko'rinish"  },
  { key: 'pos',       label: 'POS'        },
  { key: 'receipt',   label: 'Chek'       },
  { key: 'employees', label: 'Xodimlar'   },
  { key: 'stats',     label: 'Statistika' },
  { key: 'billing',   label: 'Billing'    },
] as const;
type CfgTabKey = typeof CFG_TABS[number]['key'];

const WORK_DAYS_CFG = [
  { k: 'du', l: 'Du' }, { k: 'se', l: 'Se' }, { k: 'ch', l: 'Ch' },
  { k: 'pa', l: 'Pa' }, { k: 'ju', l: 'Ju' }, { k: 'sh', l: 'Sh' },
  { k: 'ya', l: 'Ya' },
];

const INDUSTRIES_CFG = [
  { value: 'retail',       label: "Do'kon / Savdo"  },
  { value: 'clinic',       label: 'Klinika'          },
  { value: 'education',    label: "Ta'lim"           },
  { value: 'restaurant',   label: 'Restoran'         },
  { value: 'beauty',       label: "Go'zallik"        },
  { value: 'fitness',      label: 'Fitnes'           },
  { value: 'auto',         label: 'Avtoservis'       },
  { value: 'construction', label: 'Qurilish'         },
  { value: 'custom',       label: 'Boshqa'           },
];

const CFG_MODULES: Record<string, { label: string }> = {
  pos:          { label: 'Sotuv (POS)'      },
  sales:        { label: 'Sotuv tarixi'     },
  warehouse:    { label: 'Sklad'            },
  customers:    { label: 'Mijozlar'         },
  payments:     { label: "To'lovlar"        },
  products:     { label: 'Mahsulotlar'     },
  employees:    { label: 'Xodimlar'         },
  patients:     { label: 'Bemorlar'         },
  appointments: { label: 'Qabullar'         },
  doctors:      { label: 'Shifokorlar'  },
  pharmacy:     { label: 'Dorixona'         },
  students:     { label: "O'quvchilar"     },
  courses:      { label: 'Kurslar'          },
  teachers:     { label: "O'qituvchilar" },
  attendance:   { label: 'Davomat'          },
  menu:         { label: 'Menyu'           },
  orders:       { label: 'Buyurtmalar'      },
  kitchen:      { label: 'Oshxona'       },
  tables:       { label: 'Stollar'          },
  schedule:     { label: 'Jadval'           },
  branches:     { label: 'Filiallar'        },
  debts:        { label: 'Qarzdorlik'       },
  deliveries:   { label: 'Yetkazib berish'  },
  reports:      { label: 'Hisobotlar'       },
};

const CFG_INDUSTRY_MODULES: Record<string, string[]> = {
  retail:       ['pos', 'sales', 'customers', 'payments', 'products', 'employees', 'warehouse', 'branches'],
  clinic:       ['patients', 'appointments', 'doctors', 'pharmacy', 'customers', 'payments', 'employees'],
  education:    ['students', 'courses', 'teachers', 'attendance', 'payments', 'employees'],
  restaurant:   ['menu', 'orders', 'kitchen', 'tables', 'customers', 'payments', 'employees'],
  beauty:       ['appointments', 'customers', 'payments', 'employees', 'products', 'schedule'],
  fitness:      ['customers', 'payments', 'employees', 'schedule'],
  auto:         ['customers', 'payments', 'employees', 'products', 'warehouse'],
  construction: ['customers', 'payments', 'employees', 'warehouse', 'products'],
  custom:       Object.keys(CFG_MODULES),
};

const CFG_COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#ec4899', '#1e3a8a',
];

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
  reports:         'Statistika',
  suppliers:       "Ta'minotchilar",
  deliveries:      'Yetkazib berish',
  branches:        'Filiallar',
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

export interface WizardReceiptSizeCfg {
  showLogo:     boolean;
  showAddress:  boolean;
  showPhone:    boolean;
  showSeller:   boolean;
  showCustomer: boolean;
  colUnit:      boolean;
  colPrice:     boolean;
  tableStyle:   'dark' | 'light' | 'minimal';
  showPayBreak: boolean;
  showDebtInfo: boolean;
  showChange:   boolean;
  showBarcode:  boolean;
  footerText:   string;
  showFooterName:boolean;
}

function dfltSizeCfg(): WizardReceiptSizeCfg {
  return {
    showLogo:     false,
    showAddress:  true,
    showPhone:    true,
    showSeller:   true,
    showCustomer: true,
    colUnit:      true,
    colPrice:     true,
    tableStyle:   'dark',
    showPayBreak: true,
    showDebtInfo: true,
    showChange:   true,
    showBarcode:  false,
    footerText:   'Rahmat! Qaytib keling!',
    showFooterName:true,
  };
}

interface WizardReceipt {
  sizes:       string[];
  defaultSize: string;
  sizeCfg:     Record<string, WizardReceiptSizeCfg>;
  thankYouText: string;
  fields:      string[];
  width:       '58mm' | '80mm';
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

interface CustomerLevelCfg {
  name: string;
  minAmount: number;
  color: string;
}

const DEFAULT_CUSTOMER_LEVELS: CustomerLevelCfg[] = [
  { name: 'Oddiy',     minAmount: 0,         color: '#94a3b8' },
  { name: 'Silver',    minAmount: 500000,    color: '#64748b' },
  { name: 'Gold',      minAmount: 2000000,   color: '#f59e0b' },
  { name: 'Brilliant', minAmount: 10000000,  color: '#8b5cf6' },
];

interface WizardData {
  industry: string;
  dashboardWidgets: string[];
  modules: string[];
  receipt: WizardReceipt;
  roles: string[];
  theme: WizardTheme;
  customPermissions: Record<string, string[]>;
  posCardStyle: string;
  customerLevels: CustomerLevelCfg[];
  billingPlan:   'free' | 'starter' | 'pro';
  billingCycle:  'monthly' | 'yearly';
}

function freshData(): WizardData {
  const preset = INDUSTRY_PRESETS['retail'];
  return {
    industry: 'retail',
    dashboardWidgets: (INDUSTRY_DASHBOARD_WIDGETS['retail'] ?? []).filter(w => w.defaultOn).map(w => w.key),
    modules: preset.modules,
    receipt: { sizes: ['80mm'], defaultSize: '80mm', sizeCfg: { '80mm': dfltSizeCfg() }, thankYouText: 'Rahmat! Qaytib keling!', fields: ['storeName','address','phone','discount','change'], width: '80mm' },
    roles: preset.roles,
    theme: { shopName: '', address: '', phone: '', logo: '', primaryColor: '#6366f1', style: 'modern', darkMode: false },
    customPermissions: {},
    posCardStyle: 'grid_photo_large',
    customerLevels: DEFAULT_CUSTOMER_LEVELS,
    billingPlan:  'free',
    billingCycle: 'monthly',
  };
}

// ── ModuleFeatureModal ─────────────────────────────────────────────────────────

function ModuleFeatureModal({
  modKey, configs, onToggle, primary, onClose,
  receipt, setReceiptProp, onToggleReceiptSize, onSetSizeCfg, rcpTab, setRcpTab, theme,
  posCardStyle, setPosCardStyle,
  customerLevels, setCustomerLevels,
}: {
  modKey: string;
  configs: Record<string, boolean>;
  onToggle: (feat: string, val: boolean) => void;
  primary: string;
  onClose: () => void;
  receipt?: WizardReceipt;
  setReceiptProp?: (p: Partial<WizardReceipt>) => void;
  onToggleReceiptSize?: (size: string, on: boolean) => void;
  onSetSizeCfg?: (size: string, p: Partial<WizardReceiptSizeCfg>) => void;
  rcpTab?: string;
  setRcpTab?: (t: string) => void;
  theme?: WizardTheme;
  posCardStyle?: string;
  setPosCardStyle?: (s: string) => void;
  customerLevels?: CustomerLevelCfg[];
  setCustomerLevels?: (levels: CustomerLevelCfg[]) => void;
}) {
  const [activeSection, setActiveSection] = useState<'features' | 'receipt'>('features');
  const def = MODULE_FEATURES[modKey];
  if (!def) return null;

  const grouped = { free: [] as ModuleFeat[], starter: [] as ModuleFeat[], pro: [] as ModuleFeat[] };
  def.features.forEach(f => grouped[f.tier].push(f));

  // ── Right preview: realistic UI mock per module ──────────────────────────
  const has = (k: string) => configs[k] !== false;

  const isStarter = has('filter_sozlash');
  const isPro     = has('statistics');

  function CustomerPreview() {
    const CUSTOMERS = [
      { name: 'anvar ustonukus',       phone: '+998 91 300 51 52', debt: 0       },
      { name: 'suxrop bogot',           phone: '+998 97 361 12 05', debt: 0       },
      { name: 'Azamat Ayan shogirti',   phone: '+998 88 747 54 54', debt: 180     },
      { name: 'Comfort tuning',         phone: '+998 91 432 89 99', debt: 5714.25 },
    ];

    return (
      <div style={{ fontSize: '0.8rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '0.6rem' }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Mijozlar</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>208 ta mijoz · 124 ta qarzdor</div>
        </div>

        {/* Action row — Pro features each separate + always "+ Yangi" */}
        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {has('excel_debtors') ? (
            <span style={{ background: '#ef4444', color: '#fff', padding: '0.25rem 0.6rem', borderRadius: 6, fontSize: '0.68rem', fontWeight: 600 }}>Qarzdorlar</span>
          ) : (
            <span style={{ border: '1px dashed #ef4444', color: '#ef4444', padding: '0.25rem 0.6rem', borderRadius: 6, fontSize: '0.68rem', opacity: 0.45 }}>Qarzdorlar — Pro</span>
          )}
          {has('date_filter') ? (
            <span style={{ border: '1px solid var(--border)', padding: '0.25rem 0.6rem', borderRadius: 6, fontSize: '0.68rem', color: 'var(--text)' }}>Savdolar (sana)</span>
          ) : (
            <span style={{ border: '1px dashed var(--border)', color: 'var(--text-muted)', padding: '0.25rem 0.6rem', borderRadius: 6, fontSize: '0.68rem', opacity: 0.45 }}>Savdolar — Pro</span>
          )}
          {has('excel_all') ? (
            <span style={{ background: '#10b981', color: '#fff', padding: '0.25rem 0.6rem', borderRadius: 6, fontSize: '0.68rem' }}>Excel</span>
          ) : (
            <span style={{ border: '1px dashed #10b981', color: '#10b981', padding: '0.25rem 0.6rem', borderRadius: 6, fontSize: '0.68rem', opacity: 0.45 }}>Excel — Pro</span>
          )}
          <span style={{ background: primary, color: '#fff', padding: '0.25rem 0.6rem', borderRadius: 6, fontSize: '0.68rem' }}>+ Yangi</span>
        </div>

        {/* Stats row — only Starter shows counts; Free shows basic */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.35rem', marginBottom: '0.65rem' }}>
          {[
            { l:'Jami mijozlar', v:'208',     color:'var(--text)' },
            { l:'Qarzdorlar',    v:'124',     color: isStarter ? '#ef4444' : 'var(--text-muted)' },
            { l:'Jami qarz',     v:'$93,222', color: isStarter ? '#f59e0b' : 'var(--text-muted)' },
          ].map(s => (
            <div key={s.l} style={{ border: '1px solid var(--border)', borderRadius: 7, padding: '0.4rem 0.5rem', background: 'var(--card-bg)', opacity: isStarter ? 1 : (s.l === 'Jami mijozlar' ? 1 : 0.3) }}>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>{s.l}</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: s.color }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        {isStarter ? (
          <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.45rem' }}>
            {['Barchasi', 'Qarzdorlar', "To'langan"].map((lbl, i) => (
              <span key={lbl} style={{ padding: '0.2rem 0.5rem', borderRadius: 6, fontSize: '0.68rem', background: i === 0 ? primary : 'transparent', color: i === 0 ? '#fff' : 'var(--text-muted)', border: `1px solid ${i === 0 ? primary : 'var(--border)'}` }}>{lbl}</span>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.45rem', opacity: 0.35 }}>
            {['Barchasi', 'Qarzdorlar', "To'langan"].map((lbl) => (
              <span key={lbl} style={{ padding: '0.2rem 0.5rem', borderRadius: 6, fontSize: '0.68rem', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>{lbl} — Starter</span>
            ))}
          </div>
        )}

        {/* Search */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.35rem 0.65rem', marginBottom: '0.45rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Ism yoki telefon bo'yicha qidirish...
        </div>

        {/* Customer list */}
        {CUSTOMERS.map(c => (
          <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0', borderBottom: '1px solid var(--border)', background: c.debt > 0 ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: c.debt > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.12)', color: c.debt > 0 ? '#ef4444' : primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 700, flexShrink: 0 }}>
              {c.name[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
              {isStarter && <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{c.phone}</div>}
            </div>
            {c.debt > 0 ? (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ef4444' }}>${c.debt.toLocaleString()}</div>
                {isStarter && <div style={{ fontSize: '0.58rem', color: '#ef4444' }}>qarz</div>}
              </div>
            ) : (
              <span style={{ fontSize: '0.65rem', padding: '0.12rem 0.4rem', borderRadius: 4, background: 'rgba(16,185,129,0.12)', color: '#10b981', flexShrink: 0 }}>To'langan</span>
            )}
          </div>
        ))}

        {/* Mini customer panel — Pro (after double-click on customer) */}
        {has('customer_sales') ? (
          <div style={{ marginTop: '0.75rem', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--card-bg)' }}>
            {/* Header */}
            <div style={{ padding: '0.5rem 0.7rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>←</span>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)' }}>Comfort tuning</div>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>+998 91 432 89 99</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', cursor: 'pointer' }}>✎</span>
                <span style={{ fontSize: '0.65rem', color: '#ef4444', cursor: 'pointer' }}>🗑</span>
              </div>
            </div>
            {/* Stats cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.3rem', padding: '0.45rem 0.5rem' }}>
              <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: 8, padding: '0.35rem 0.4rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>Savdolar</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: primary }}>16</div>
              </div>
              <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: 8, padding: '0.35rem 0.4rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>Jami</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981' }}>$13,214.25</div>
              </div>
              <div style={{ background: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: '0.35rem 0.4rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>Qarz</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ef4444' }}>$5,714.25</div>
                <div style={{ fontSize: '0.45rem', color: '#ef4444' }}>ko'rish →</div>
              </div>
            </div>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1, padding: '0.3rem', textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, color: primary, borderBottom: `2px solid ${primary}` }}>Savdolar</div>
              <div style={{ flex: 1, padding: '0.3rem', textAlign: 'center', fontSize: '0.65rem', color: isPro ? 'var(--text-muted)' : 'var(--text-muted)', opacity: isPro ? 1 : 0.35 }}>
                Statistika{!isPro ? ' (Pro)' : ''}
              </div>
            </div>
            {/* Action row: Sana filteri + Savdolarni Excel */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.5rem', borderBottom: '1px solid var(--border)', gap: '0.3rem' }}>
              <span style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '0.2rem 0.4rem', fontSize: '0.58rem', color: 'var(--text-muted)' }}>Sana filteri</span>
              {has('customer_excel') ? (
                <span style={{ background: '#10b981', color: '#fff', borderRadius: 6, padding: '0.2rem 0.5rem', fontSize: '0.58rem', fontWeight: 600 }}>Savdolarni Excel ga</span>
              ) : (
                <span style={{ border: '1px dashed #10b981', color: '#10b981', borderRadius: 6, padding: '0.2rem 0.5rem', fontSize: '0.58rem', opacity: 0.5 }}>Excel — Pro</span>
              )}
            </div>
            {/* Sales grouped by date */}
            <div style={{ padding: '0.3rem 0.5rem' }}>
              {[
                { date: '16 IYUN 2026', count: 1, sales: [{ id: '#SALE-20260616-0002', time: '11:14', amount: '$702.75', debt: '$702.75 qarz' }] },
                { date: '13 IYUN 2026', count: 2, sales: [
                  { id: '#SALE-20260613-0007', time: '18:24', amount: '$230',    debt: '$230 qarz' },
                  { id: '#SALE-20260613-0006', time: '18:19', amount: '$550',    debt: '$550 qarz' },
                ]},
              ].map(group => (
                <div key={group.date}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0 0.15rem', fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                    <span>{group.date}</span>
                    <span>{group.count} ta</span>
                  </div>
                  {group.sales.map(s => (
                    <div key={s.id} style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 6, padding: '0.3rem 0.4rem', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.3rem' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text)' }}>{s.id}</span>
                          <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '0.05rem 0.25rem', borderRadius: 3, fontSize: '0.52rem' }}>Nasiya</span>
                        </div>
                        <div style={{ fontSize: '0.52rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{s.time}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text)' }}>{s.amount}</div>
                        <div style={{ fontSize: '0.52rem', color: '#ef4444' }}>{s.debt}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '0.65rem', border: '1px dashed var(--border)', borderRadius: 8, padding: '0.5rem', opacity: 0.4, textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Mijoz profili — Pro tarifi
          </div>
        )}

        {/* Statistics — Pro only */}
        {isPro ? (
          <div style={{ marginTop: '0.65rem', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, padding: '0.5rem', background: 'rgba(139,92,246,0.05)' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#8b5cf6', marginBottom: '0.3rem' }}>Statistika (Pro)</div>
            <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.35rem' }}>
              {['Bugun','Hafta','Oy','Yil'].map((t,i) => (
                <span key={t} style={{ padding: '0.15rem 0.35rem', borderRadius: 4, fontSize: '0.6rem', background: i===2?'#8b5cf6':'transparent', color: i===2?'#fff':'var(--text-muted)', border: i===2?'none':'1px solid var(--border)' }}>{t}</span>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
              {[['Haqiqiy tushum','$50,086'],['Sof foyda','$12,951'],['Savdolar','177 ta'],["O'rtacha",'$282']].map(([l,v]) => (
                <div key={l} style={{ background: 'rgba(139,92,246,0.08)', borderRadius: 5, padding: '0.25rem 0.35rem' }}>
                  <div style={{ fontSize: '0.48rem', color: 'var(--text-muted)' }}>{l}</div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text)' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '0.65rem', border: '1px dashed rgba(139,92,246,0.35)', borderRadius: 8, padding: '0.5rem', opacity: 0.45, textAlign: 'center', fontSize: '0.7rem', color: '#8b5cf6' }}>
            Statistika tahlili — Pro
          </div>
        )}
      </div>
    );
  }

  function ProductsPreview() {
    const PRODUCTS = [
      { name: '0-shpatel',  cat: 'Instrument', price: 7.5,  cost: 5.0,  qty: 188, min: 20, barcode: '4600450001234' },
      { name: '1-shpatel',  cat: 'Instrument', price: 7.0,  cost: 4.5,  qty: 59,  min: 10, barcode: '4600450005678' },
      { name: 'Alecantara', cat: 'Material',   price: 12.0, cost: 8.0,  qty: 3,   min: 5,  barcode: null           },
      { name: 'Bron plyonka',cat:'Material',   price: 5.3,  cost: 3.0,  qty: 0,   min: 10, barcode: '4600450009012' },
    ];
    const CATS = ['Barchasi', 'Instrument', 'Material'];

    const stockLabel = (qty: number, min: number) =>
      qty === 0 ? { l: 'Tugagan', c: '#ef4444' } :
      qty <= min ? { l: 'Kam',    c: '#f59e0b' } :
                   { l: 'Yetarli', c: '#22c55e' };

    return (
      <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        {/* Header actions */}
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.85rem' }}>Mahsulotlar</span>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {has('excel_export') ? (
              <span style={{ background: '#10b981', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: 6, fontSize: '0.65rem' }}>Excel</span>
            ) : (
              <span style={{ border: '1px dashed #10b981', color: '#10b981', padding: '0.2rem 0.5rem', borderRadius: 6, fontSize: '0.65rem', opacity: 0.45 }}>Excel — Starter</span>
            )}
            {has('excel_import') ? (
              <span style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '0.2rem 0.5rem', borderRadius: 6, fontSize: '0.65rem' }}>Import</span>
            ) : (
              <span style={{ border: '1px dashed var(--border)', color: 'var(--text-muted)', padding: '0.2rem 0.5rem', borderRadius: 6, fontSize: '0.65rem', opacity: 0.4 }}>Import — Starter</span>
            )}
            <span style={{ background: primary, color: '#fff', padding: '0.2rem 0.5rem', borderRadius: 6, fontSize: '0.65rem' }}>+ Qo'shish</span>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 8, padding: '0.3rem 0.55rem', color: 'var(--text-muted)', fontSize: '0.68rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
            <span style={{ opacity: 0.5 }}>🔍</span> Nomi yoki kategoriya...
          </div>
          {has('barcode') && (
            <div title="Skaner bilan qidirish" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.3rem 0.5rem', fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>⬛</div>
          )}
        </div>

        {/* Category tabs */}
        {has('categories') && (
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'nowrap', overflow: 'hidden' }}>
            {CATS.map((c, i) => (
              <span key={c} style={{ padding: '0.18rem 0.5rem', borderRadius: 20, fontSize: '0.63rem', background: i === 0 ? primary : 'transparent', color: i === 0 ? '#fff' : 'var(--text-muted)', border: `1px solid ${i === 0 ? primary : 'var(--border)'}`, whiteSpace: 'nowrap' }}>{c}</span>
            ))}
          </div>
        )}

        {/* Product table */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: '0.3rem', padding: '0.28rem 0.5rem', background: 'var(--card-bg)', borderBottom: '1px solid var(--border)', fontSize: '0.63rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            <span>Nomi</span>
            {has('categories') && <span>Kat.</span>}
            <span>Narx</span>
            {has('costPrice') && <span style={{ color: 'var(--text-muted)' }}>Xarid</span>}
            <span>Holat</span>
          </div>
          {PRODUCTS.map((p) => {
            const st = stockLabel(p.qty, p.min);
            return (
              <div key={p.name} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: '0.3rem', padding: '0.35rem 0.5rem', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {has('image') && <div style={{ width: 18, height: 18, background: 'var(--border)', borderRadius: 4, flexShrink: 0 }} />}
                    {p.name}
                  </div>
                  {has('barcode') && p.barcode && (
                    <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.barcode}</div>
                  )}
                  {has('minStock') && p.qty <= p.min && (
                    <div style={{ fontSize: '0.58rem', color: p.qty === 0 ? '#ef4444' : '#f59e0b' }}>
                      {p.qty === 0 ? 'Tugagan!' : `Kam: ${p.qty}/${p.min}`}
                    </div>
                  )}
                </div>
                {has('categories') && <span style={{ fontSize: '0.62rem', background: 'rgba(99,102,241,0.1)', color: primary, padding: '0.1rem 0.3rem', borderRadius: 4 }}>{p.cat}</span>}
                <span style={{ color: primary, fontWeight: 700, fontSize: '0.72rem' }}>${p.price}</span>
                {has('costPrice') && <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>${p.cost}</span>}
                <span style={{ fontSize: '0.62rem', background: st.c + '22', color: st.c, padding: '0.1rem 0.3rem', borderRadius: 4, whiteSpace: 'nowrap' }}>{st.l}</span>
              </div>
            );
          })}
        </div>

        {/* Barcode scan indicator */}
        {has('barcode') && (
          <div style={{ border: '1px dashed var(--border)', borderRadius: 8, padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.6 }}>
            <span style={{ fontSize: '0.8rem' }}>⬛</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Skaner orqali mahsulot qo'shishda barcode avtomatik to'ldiriladi</span>
          </div>
        )}
      </div>
    );
  }

  function PosPreview() {
    const PRODUCTS = [
      { name: 'Alekantara',  qty: 188, price: 7.5,  hue: 210 },
      { name: 'Bron',        qty: 59,  price: 12.0, hue: 340 },
      { name: 'Shpatel',     qty: 76,  price: 7.0,  hue: 145 },
      { name: 'Yelim',       qty: 95,  price: 8.5,  hue: 30  },
      { name: 'Lak',         qty: 120, price: 5.0,  hue: 280 },
      { name: 'Grunt',       qty: 44,  price: 9.0,  hue: 60  },
    ];
    const CART = [
      { name: 'Bron',       asl: 12.0, narx: 12.0, qty: 1 },
      { name: 'Shpatel',    asl: 7.0,  narx: 7.0,  qty: 1 },
    ];
    const subtotal  = CART.reduce((s, i) => s + i.narx * i.qty, 0);
    const discount  = has('discount') ? 1.0 : 0;
    const total     = subtotal - discount;
    const isGrid    = posCardStyle === 'grid_photo_large' || posCardStyle === 'grid_photo_small';
    const isLg      = posCardStyle === 'grid_photo_large';
    const isList    = posCardStyle === 'list';
    const cols      = isLg ? 3 : 4;
    const photoH    = isLg ? 48 : 32;

    return (
      <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {/* Search bar */}
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 8, padding: '0.35rem 0.6rem', color: 'var(--text-muted)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ opacity: 0.5 }}>🔍</span> Qidiring...
          </div>
          {has('barcode') && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.35rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.7rem' }}>⬛</div>
          )}
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: '0.3rem', overflowX: 'hidden' }}>
          {['Barchasi', 'Bron', 'Shpatel'].map((c, i) => (
            <span key={c} style={{ padding: '0.2rem 0.5rem', borderRadius: 20, fontSize: '0.62rem', background: i === 0 ? primary : 'var(--card-bg)', color: i === 0 ? '#fff' : 'var(--text-muted)', border: `1px solid ${i === 0 ? primary : 'var(--border)'}`, whiteSpace: 'nowrap' }}>{c}</span>
          ))}
        </div>

        {/* Product grid or list */}
        {isGrid ? (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '0.35rem' }}>
            {PRODUCTS.slice(0, cols === 3 ? 6 : 4).map(p => (
              <div key={p.name} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', cursor: 'pointer', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: photoH, borderRadius: 6, background: `hsl(${p.hue}, 55%, 45%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: isLg ? '1rem' : '0.75rem' }}>{p.name[0]}</span>
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.62rem', lineHeight: 1.2 }}>{p.name}</div>
                <div style={{ color: primary, fontWeight: 700, fontSize: '0.65rem' }}>${p.price}</div>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>{p.qty} ta</div>
              </div>
            ))}
          </div>
        ) : isList ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {PRODUCTS.slice(0, 4).map(p => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.5rem', background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: `hsl(${p.hue}, 55%, 45%)`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.65rem' }}>{p.name[0]}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.7rem' }}>{p.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>{p.qty} ta</div>
                </div>
                <div style={{ color: primary, fontWeight: 700, fontSize: '0.72rem' }}>${p.price}</div>
              </div>
            ))}
          </div>
        ) : (
          /* grid_no_photo default */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.3rem' }}>
            {PRODUCTS.slice(0, 4).map(p => (
              <div key={p.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', padding: '0.4rem', background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.7rem' }}>{p.name}</div>
                <div style={{ color: primary, fontWeight: 700, fontSize: '0.72rem' }}>${p.price}</div>
                <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>{p.qty} ta</div>
              </div>
            ))}
          </div>
        )}

        {/* Cart section */}
        <div style={{ marginTop: '0.2rem', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.75rem' }}>Joriy savdo</span>
            <span style={{ background: 'rgba(99,102,241,0.15)', color: primary, padding: '0.1rem 0.4rem', borderRadius: 10, fontSize: '0.62rem', fontWeight: 700 }}>{CART.length} ta</span>
          </div>
          {CART.map(item => (
            <div key={item.name} style={{ padding: '0.35rem 0.6rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.72rem' }}>{item.name}</span>
                <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.72rem' }}>🗑</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '0.1rem 0.35rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>−</span>
                  <span style={{ fontSize: '0.72rem', minWidth: 18, textAlign: 'center', color: 'var(--text)' }}>{item.qty}</span>
                  <span style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '0.1rem 0.35rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>+</span>
                </div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>× Narx:</span>
                <span style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '0.1rem 0.35rem', fontSize: '0.65rem', color: has('markup') ? '#f59e0b' : 'var(--text)' }}>
                  $ {item.narx}
                </span>
                <span style={{ marginLeft: 'auto', color: primary, fontWeight: 700, fontSize: '0.72rem' }}>${item.narx * item.qty}</span>
              </div>
              {has('markup') && item.asl !== item.narx && (
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Asl: ${item.asl}</div>
              )}
            </div>
          ))}
          <div style={{ padding: '0.35rem 0.6rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
              <span>Oraliq jami</span><span>${subtotal}</span>
            </div>
            {has('discount') && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Chegirma</span>
                <span style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '0.1rem 0.4rem', fontSize: '0.68rem', color: '#22c55e' }}>-${discount}</span>
              </div>
            )}
            {has('markup') && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', marginTop: '0.2rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Kelishilgan narx</span>
                <span style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '0.1rem 0.5rem', fontSize: '0.68rem', color: '#f59e0b' }}>$ {subtotal}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--text)', marginTop: '0.3rem', paddingTop: '0.25rem', borderTop: '1px solid var(--border)' }}>
              <span>Jami</span><span style={{ color: primary, fontSize: '0.85rem' }}>${total}</span>
            </div>
          </div>
          {/* Payment type chips */}
          <div style={{ display: 'flex', gap: '0.3rem', padding: '0.4rem 0.6rem', flexWrap: 'wrap' }}>
            {has('cash') && <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.65rem', fontWeight: 600 }}>Naqd</span>}
            {has('card') && <span style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.65rem', fontWeight: 600 }}>Karta</span>}
            {has('credit') && <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.65rem', fontWeight: 600 }}>Nasiya</span>}
            {has('receipt') && <span style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.65rem', fontWeight: 600 }}>Chek</span>}
          </div>
          {/* Pay button */}
          <div style={{ padding: '0 0.6rem 0.6rem' }}>
            <div style={{ background: primary, color: '#fff', borderRadius: 10, padding: '0.5rem', textAlign: 'center', fontWeight: 700, fontSize: '0.78rem' }}>
              To'lov — ${total}
            </div>
          </div>
        </div>

      </div>
    );
  }

  function AuditPreview() {
    const events = [
      { icon: '↗', title: 'Sotuv', person: 'Alisher', time: '14:20', amount: '172 000', color: '#10b981', status: "To'langan" },
      { icon: '↩', title: 'Qaytarish', person: 'Zafar', time: '13:05', amount: '45 000', color: '#f59e0b', status: 'Kutilmoqda' },
      { icon: '↗', title: 'Sotuv', person: 'Xayrulla', time: '11:40', amount: '98 000', color: '#10b981', status: "To'langan" },
    ];
    const returns = [
      { id: 'RET-001', saleId: 'SALE-011', amount: '45 000', status: 'Kutilmoqda', items: 2 },
      { id: 'RET-002', saleId: 'SALE-008', amount: '120 000', status: 'Tasdiqlandi', items: 1 },
    ];
    const hasSysLog = has('system_log');
    const hasRetApprove = has('return_approve');
    return (
      <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {/* Header */}
        <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.85rem' }}>Sotuv Jurnali</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>3 ta yozuv</div>

        {/* Search */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 7, padding: '0.28rem 0.6rem', color: 'var(--text-muted)', fontSize: '0.68rem' }}>
          Savdo raqami, mijoz...
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {['Barchasi', 'Sotuvlar', 'Qaytarishlar', hasSysLog ? 'Tizim' : null].filter(Boolean).map((t, i) => (
            <span key={t} style={{ padding: '0.18rem 0.45rem', borderRadius: 5, fontSize: '0.62rem', fontWeight: i === 0 ? 700 : 400, background: i === 0 ? primary : 'transparent', color: i === 0 ? '#fff' : 'var(--text-muted)', border: i === 0 ? 'none' : '1px solid var(--border)' }}>{t}</span>
          ))}
        </div>

        {/* Date group */}
        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', paddingBottom: '0.2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <span>BUGUN</span><span>{events.length} ta</span>
        </div>

        {/* Events */}
        {events.map((ev, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.55rem', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${ev.color}18`, color: ev.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.7rem', flexShrink: 0 }}>{ev.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.72rem' }}>{ev.title}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>{ev.person} · {ev.time}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: ev.color, fontWeight: 700, fontSize: '0.72rem' }}>{ev.amount}</div>
              <span style={{ fontSize: '0.58rem', background: ev.status === "To'langan" ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: ev.status === "To'langan" ? '#10b981' : '#f59e0b', padding: '0.05rem 0.25rem', borderRadius: 4 }}>{ev.status}</span>
            </div>
          </div>
        ))}

        {/* Returns preview (if returns_view enabled) */}
        {has('returns_view') && (
          <>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#f59e0b', paddingBottom: '0.2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <span>KUTILAYOTGAN</span><span>1 ta</span>
            </div>
            {returns.slice(0, 1).map((r) => (
              <div key={r.id} style={{ padding: '0.45rem 0.55rem', background: 'var(--card-bg)', border: `1px solid ${r.status === 'Kutilmoqda' ? '#f59e0b55' : '#10b98133'}`, borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <span style={{ color: primary, fontWeight: 700, fontSize: '0.7rem' }}>#{r.id}</span>
                  <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.72rem' }}>{r.amount}</span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem', marginBottom: '0.3rem' }}>Asl savdo: #{r.saleId}</div>
                {hasRetApprove ? (
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <span style={{ background: primary, color: '#fff', padding: '0.12rem 0.45rem', borderRadius: 5, fontSize: '0.6rem', fontWeight: 700 }}>Tasdiqlash</span>
                    <span style={{ background: '#ef444418', color: '#ef4444', padding: '0.12rem 0.45rem', borderRadius: 5, fontSize: '0.6rem', fontWeight: 700, border: '1px solid #ef444433' }}>Rad etish</span>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.58rem', color: '#8b5cf6', background: 'rgba(139,92,246,0.1)', padding: '0.1rem 0.35rem', borderRadius: 4 }}>Pro — Tasdiqlash uchun</span>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    );
  }

  function GenericPreview() {
    return (
      <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.3 }}>■</div>
        Tanlangan xususiyatlar faollashadi
      </div>
    );
  }

  function WarehousePreview() {
    const hasLow      = has('low');
    const hasIncome   = has('income');
    const hasExpense  = has('expense');
    const hasExcel    = has('excel');
    const hasSupplier = has('supplier');

    const ITEMS = [
      { name: 'Alekantara (1.5m)',   cat: 'Qoplama',    qty: 188, min: 20,  cost: 45000  },
      { name: 'Bron plyonka',        cat: 'Material',   qty: 7,   min: 10,  cost: 53000  },
      { name: '0-shpatel',           cat: 'Instrument', qty: 34,  min: 5,   cost: 75000  },
      { name: 'Maxsus yelim (500g)', cat: 'Kimyo',      qty: 3,   min: 15,  cost: 28000  },
    ];

    const lowItems = ITEMS.filter(i => i.qty < i.min);

    return (
      <div style={{ fontSize: '0.8rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Sklad</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>4 ta mahsulot · {lowItems.length} ta kam qoldiq</div>
          </div>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {hasIncome  && <span style={{ background: '#10b981', color: '#fff', padding: '0.22rem 0.55rem', borderRadius: 6, fontSize: '0.68rem', fontWeight: 600 }}>+ Kirim</span>}
            {hasExpense && <span style={{ background: '#ef4444', color: '#fff', padding: '0.22rem 0.55rem', borderRadius: 6, fontSize: '0.68rem', fontWeight: 600 }}>- Chiqim</span>}
          </div>
        </div>

        {/* Low stock alert */}
        {hasLow && lowItems.length > 0 && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, padding: '0.4rem 0.6rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>⚠</span>
            <span style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: 600 }}>{lowItems.length} ta mahsulot minimal darajadan kam!</span>
          </div>
        )}

        {/* Excel */}
        {hasExcel && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.4rem' }}>
            <span style={{ background: '#10b981', color: '#fff', padding: '0.18rem 0.5rem', borderRadius: 5, fontSize: '0.65rem' }}>Excel</span>
          </div>
        )}

        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.4rem', padding: '0.22rem 0.4rem', borderBottom: '1px solid var(--border)', fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
          <span>Mahsulot</span>
          <span style={{ textAlign: 'right' }}>Qoldiq</span>
          <span style={{ textAlign: 'right' }}>Narx</span>
        </div>

        {ITEMS.map((item) => {
          const isLow = item.qty < item.min;
          return (
            <div key={item.name} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.4rem', padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>{item.cat}</div>
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isLow && hasLow ? '#ef4444' : 'var(--text)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {item.qty}
                {isLow && hasLow && <span style={{ fontSize: '0.55rem', marginLeft: '0.2rem', color: '#ef4444' }}>↓{item.min}</span>}
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {item.cost.toLocaleString('uz-UZ')}
              </span>
            </div>
          );
        })}

        {/* Supplier section */}
        {hasSupplier && (
          <div style={{ marginTop: '0.6rem', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 7, padding: '0.4rem 0.6rem', background: 'rgba(139,92,246,0.06)' }}>
            <div style={{ fontSize: '0.62rem', color: '#8b5cf6', fontWeight: 700, marginBottom: '0.3rem' }}>Ta'minotchilar</div>
            {["Alfa Optom — Qoplama", "BuildMart — Kimyo", "InstrumentPro — Asbob"].map(s => (
              <div key={s} style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.15rem' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#8b5cf6', flexShrink: 0 }} />{s}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function EmployeesPreview() {
    const hasRoles     = has('roles');
    const hasPerms     = has('perms');
    const hasTimesheet = has('timesheet');
    const hasSalary    = has('salary');

    const EMPS = [
      { name: 'Alibek Rahimov',   role: 'admin',     roleLabel: 'Admin',        color: '#7c3aed', bg: '#ede9fe', active: true,  time: '08:02', salary: '3 200 000' },
      { name: 'Sherzod Toshev',   role: 'cashier',   roleLabel: 'Kassir',       color: '#059669', bg: '#d1fae5', active: true,  time: '08:15', salary: '1 800 000' },
      { name: 'Dilnoza Yusupova', role: 'accountant',roleLabel: 'Buxgalter',    color: '#0891b2', bg: '#e0f2fe', active: true,  time: '09:00', salary: '2 400 000' },
      { name: 'Jasur Mirzayev',   role: 'warehouse_manager', roleLabel: 'Sklad', color: '#b45309', bg: '#fef3c7', active: false, time: '—',     salary: '1 600 000' },
    ];

    const roleTabs = ['Barchasi', 'Admin', 'Kassir', 'Sklad'];

    return (
      <div style={{ fontSize: '0.8rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Xodimlar</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>4 ta xodim · 3 ta faol</div>
          </div>
          <span style={{ background: primary, color: '#fff', padding: '0.25rem 0.65rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600 }}>+ Yangi</span>
        </div>

        {/* Role filter tabs */}
        {hasRoles ? (
          <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            {roleTabs.map((t, i) => (
              <span key={t} style={{ padding: '0.18rem 0.5rem', borderRadius: 6, fontSize: '0.65rem', background: i === 0 ? primary : 'transparent', color: i === 0 ? '#fff' : 'var(--text-muted)', border: `1px solid ${i === 0 ? primary : 'var(--border)'}` }}>{t}</span>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.5rem', opacity: 0.4 }}>
            {roleTabs.slice(0, 3).map((t) => (
              <span key={t} style={{ padding: '0.18rem 0.5rem', borderRadius: 6, fontSize: '0.65rem', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>{t} — Starter</span>
            ))}
          </div>
        )}

        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: hasTimesheet ? '1fr auto auto auto' : '1fr auto auto', gap: '0.4rem', padding: '0.25rem 0.4rem', borderBottom: '1px solid var(--border)', fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
          <span>Xodim</span>
          {hasTimesheet && <span style={{ textAlign: 'right' }}>Kirish</span>}
          <span style={{ textAlign: 'right' }}>Holat</span>
          <span style={{ textAlign: 'right' }}>⋯</span>
        </div>

        {/* Employee rows */}
        {EMPS.map((emp) => (
          <div key={emp.name} style={{ display: 'grid', gridTemplateColumns: hasTimesheet ? '1fr auto auto auto' : '1fr auto auto', gap: '0.4rem', padding: '0.38rem 0.4rem', borderBottom: '1px solid var(--border)', alignItems: 'center', opacity: emp.active ? 1 : 0.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: emp.bg, color: emp.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, flexShrink: 0 }}>
                {emp.name[0]}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</div>
                {hasRoles && (
                  <span style={{ fontSize: '0.58rem', fontWeight: 600, color: emp.color, background: emp.bg, padding: '0.05rem 0.3rem', borderRadius: 4 }}>{emp.roleLabel}</span>
                )}
              </div>
            </div>
            {hasTimesheet && (
              <span style={{ fontSize: '0.65rem', color: emp.active ? '#10b981' : 'var(--text-muted)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{emp.time}</span>
            )}
            <span style={{ fontSize: '0.62rem', color: emp.active ? '#10b981' : '#dc2626', textAlign: 'right', whiteSpace: 'nowrap' }}>
              {emp.active ? '● Faol' : '● Blok'}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>⋯</span>
          </div>
        ))}

        {/* Permissions & Salary info row */}
        {(hasPerms || hasSalary) && (
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
            {hasPerms && (
              <div style={{ flex: 1, border: '1px solid rgba(59,130,246,0.35)', borderRadius: 7, padding: '0.35rem 0.5rem', background: 'rgba(59,130,246,0.06)' }}>
                <div style={{ fontSize: '0.6rem', color: '#3b82f6', fontWeight: 700, marginBottom: '0.2rem' }}>Ruxsatlar</div>
                {['Admin — Hammasi', 'Kassir — Sotuv', 'Sklad — Ombor'].map((r) => (
                  <div key={r} style={{ fontSize: '0.58rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} /> {r}
                  </div>
                ))}
              </div>
            )}
            {hasSalary && (
              <div style={{ flex: 1, border: '1px solid rgba(139,92,246,0.35)', borderRadius: 7, padding: '0.35rem 0.5rem', background: 'rgba(139,92,246,0.06)' }}>
                <div style={{ fontSize: '0.6rem', color: '#8b5cf6', fontWeight: 700, marginBottom: '0.2rem' }}>Oylik hisobot</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text)' }}>9 000 000 so'm</div>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>4 ta xodim · Iyun 2025</div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function BranchesPreview() {
    const hasTransfer    = has('transfer');
    const hasTransferLog = has('transfer_log');
    const hasInventory   = has('inventory');
    const hasManager     = has('manager');
    const hasStats       = has('branch_stats');

    const BRANCHES = [
      { name: 'Chilonzor filiali',   manager: 'Bekzod Rahimov', items: 42, transfers: 8,  active: true  },
      { name: 'Yunusobod filiali',   manager: 'Malika Tursunova', items: 31, transfers: 5, active: true  },
      { name: 'Sergeli filiali',     manager: '',                items: 17, transfers: 2,  active: false },
    ];

    return (
      <div style={{ fontSize: '0.8rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '0.6rem' }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Filiallar</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>3 ta filial · 2 ta faol</div>
        </div>

        {/* Action row */}
        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.65rem', flexWrap: 'wrap' }}>
          {hasTransfer ? (
            <span style={{ background: '#3b82f6', color: '#fff', padding: '0.25rem 0.6rem', borderRadius: 6, fontSize: '0.68rem', fontWeight: 600 }}>Mahsulot ko'chirish</span>
          ) : (
            <span style={{ border: '1px dashed #3b82f6', color: '#3b82f6', padding: '0.25rem 0.6rem', borderRadius: 6, fontSize: '0.68rem', opacity: 0.45 }}>Ko'chirish — Pro</span>
          )}
          {hasTransferLog && (
            <span style={{ border: '1px solid var(--border)', padding: '0.25rem 0.6rem', borderRadius: 6, fontSize: '0.68rem', color: 'var(--text)' }}>Tarix</span>
          )}
          <span style={{ background: primary, color: '#fff', padding: '0.25rem 0.6rem', borderRadius: 6, fontSize: '0.68rem' }}>+ Yangi filial</span>
        </div>

        {/* Stats row */}
        {hasStats && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.35rem', marginBottom: '0.65rem' }}>
            {[
              { l: 'Jami filiallar',  v: '3',  color: '#6366f1' },
              { l: 'Faol',            v: '2',  color: '#10b981' },
              { l: "Bugun ko'chirma", v: '13', color: '#f59e0b' },
            ].map(s => (
              <div key={s.l} style={{ border: '1px solid var(--border)', borderRadius: 7, padding: '0.4rem 0.5rem', background: 'var(--card-bg)' }}>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>{s.l}</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: s.color }}>{s.v}</div>
              </div>
            ))}
          </div>
        )}

        {/* Branch cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {BRANCHES.map(b => (
            <div key={b.name} style={{
              border: `1.5px solid ${b.active ? 'var(--border)' : 'var(--border)'}`,
              borderRadius: 9, padding: '0.5rem 0.65rem',
              background: 'var(--card-bg)', opacity: b.active ? 1 : 0.55,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text)' }}>{b.name}</div>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 99, background: b.active ? '#d1fae5' : '#f3f4f6', color: b.active ? '#065f46' : '#6b7280' }}>
                  {b.active ? 'Faol' : 'Nofaol'}
                </span>
              </div>
              {hasManager && b.manager && (
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Mas'ul: {b.manager}</div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                {hasInventory && (
                  <span><strong style={{ color: 'var(--text)' }}>{b.items}</strong> tur mahsulot</span>
                )}
                {hasTransferLog && (
                  <span><strong style={{ color: '#6366f1' }}>{b.transfers}</strong> ko'chirma</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Inventory panel */}
        {hasInventory && (
          <div style={{ marginTop: '0.65rem', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '0.45rem 0.6rem', background: 'rgba(99,102,241,0.06)' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6366f1', marginBottom: '0.3rem' }}>Chilonzor filiali — Inventar</div>
            {[
              { name: 'iPhone 15 Pro',   net: 12 },
              { name: 'Samsung S24',     net: 8  },
              { name: 'AirPods Pro',     net: 22 },
            ].map(r => (
              <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.65rem' }}>
                <span style={{ color: 'var(--text)' }}>{r.name}</span>
                <span style={{ fontWeight: 700, color: r.net > 10 ? '#10b981' : '#f59e0b' }}>{r.net} dona</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function StatisticsPreview() {
    const hasExcel       = has('excel_sales') || has('excel_customers') || has('excel_products');
    const hasReturns     = has('returns_stat');
    const hasLevels      = has('customer_levels');
    const hasMargin      = has('margin_analysis');
    const hasTopProducts = has('top_products');
    const hasCategories  = has('categories');
    const hasPanorama    = has('monthly_panorama');

    const CATS = [
      { name: 'Elektronika', pct: 42, color: '#6366f1' },
      { name: 'Kiyim',       pct: 28, color: '#f59e0b' },
      { name: 'Oziq-ovqat',  pct: 18, color: '#10b981' },
      { name: 'Boshqa',      pct: 12, color: '#94a3b8' },
    ];
    const MONTHS = ['Y','F','M','A','M','I','I','A','S','O','N','D'];
    const MONTH_VALS = [30, 55, 40, 70, 50, 80, 65, 90, 75, 60, 85, 95];

    return (
      <div style={{ fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

        <>
        {/* Period tabs */}
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {['Bugun','Hafta','Oy','Yil'].map((p, i) => (
            <span key={p} style={{ padding: '0.15rem 0.45rem', borderRadius: 5, fontSize: '0.6rem', fontWeight: 600,
              background: i === 1 ? primary : 'var(--card-bg)', color: i === 1 ? '#fff' : 'var(--text-muted)',
              border: '1px solid var(--border)' }}>
              {p}
            </span>
          ))}
          {hasExcel && (
            <span style={{ marginLeft: 'auto', padding: '0.15rem 0.5rem', borderRadius: 5, fontSize: '0.6rem', fontWeight: 700, background: primary, color: '#fff' }}>Excel</span>
          )}
        </div>

        {/* Stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
          {[
            { label: 'Haqiqiy tushum', val: '2 350 000', sub: hasReturns ? '-150 000 qaytarish' : '', color: 'var(--text)' },
            { label: 'Sof foyda',      val: '470 000',   sub: hasMargin ? 'Margin: 20%' : '',          color: '#10b981'     },
            { label: 'Savdolar soni',  val: '47 ta',      sub: "O'rtacha: 50 000",                      color: 'var(--text)' },
            { label: 'Qaytarishlar',   val: hasReturns ? '3 ta' : '—', sub: hasReturns ? '-150 000' : 'Pro tarifda', color: hasReturns ? '#ef4444' : 'var(--text-muted)' },
          ].map((c) => (
            <div key={c.label} style={{ padding: '0.35rem 0.45rem', background: 'var(--card-bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.58rem', marginBottom: '0.1rem' }}>{c.label}</div>
              <div style={{ fontWeight: 700, color: c.color, fontSize: '0.75rem' }}>{c.val}</div>
              {c.sub && <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '0.05rem' }}>{c.sub}</div>}
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{ background: 'var(--card-bg)', borderRadius: 6, border: '1px solid var(--border)', padding: '0.4rem 0.5rem' }}>
          <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Tushum dinamikasi</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28 }}>
            {[40, 60, 45, 80, 55, 90, 70].map((h, i) => (
              <div key={i} style={{ flex: 1, height: h + '%', background: i === 5 ? primary : primary + '55', borderRadius: '2px 2px 0 0' }} />
            ))}
          </div>
        </div>

        {/* Top products */}
        {hasTopProducts && (
          <div style={{ background: 'var(--card-bg)', borderRadius: 6, border: '1px solid var(--border)', padding: '0.4rem 0.5rem' }}>
            <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Top mahsulotlar</div>
            {[
              { name: 'iPhone 15 Pro', rev: '1 800 000', margin: '22%', mc: '#10b981' },
              { name: 'Samsung S24',   rev: '1 200 000', margin: '18%', mc: '#f59e0b' },
              { name: 'AirPods Pro',   rev: '640 000',   margin: '31%', mc: '#10b981' },
            ].map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.15rem 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', minWidth: 0 }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : '#cd7f32', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', color: '#fff', fontWeight: 700, flexShrink: 0 }}>{i+1}</span>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.58rem', fontWeight: 700, color: p.mc }}>{p.margin}</span>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text)' }}>{p.rev}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Categories */}
        {hasCategories && (
          <div style={{ background: 'var(--card-bg)', borderRadius: 6, border: '1px solid var(--border)', padding: '0.4rem 0.5rem' }}>
            <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Kategoriyalar</div>
            {CATS.map((c) => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.18rem' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.6rem', color: 'var(--text)', width: 55, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{c.name}</span>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--border)' }}>
                  <div style={{ height: '100%', borderRadius: 2, background: c.color, width: c.pct + '%' }} />
                </div>
                <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', width: 22, textAlign: 'right' }}>{c.pct}%</span>
              </div>
            ))}
          </div>
        )}

        {/* Oylik panorama */}
        {hasPanorama && (
          <div style={{ background: 'var(--card-bg)', borderRadius: 6, border: '1px solid var(--border)', padding: '0.4rem 0.5rem' }}>
            <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Oylik panorama</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 24 }}>
              {MONTH_VALS.map((h, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '100%', height: (h / 95 * 22) + 'px', background: i === new Date().getMonth() ? primary : primary + '44', borderRadius: '1px 1px 0 0' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', marginTop: 2 }}>
              {MONTHS.map((m, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '0.45rem', color: i === new Date().getMonth() ? primary : 'var(--text-muted)', fontWeight: i === new Date().getMonth() ? 700 : 400 }}>{m}</div>
              ))}
            </div>
          </div>
        )}

        {/* Margin tahlili */}
        {hasMargin && (
          <div style={{ background: 'var(--card-bg)', borderRadius: 6, border: '1px solid var(--border)', padding: '0.4rem 0.5rem' }}>
            <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Margin tahlili</div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.3rem' }}>
              {[{ l:'Margin', v:'20%', c:'#10b981' }, { l:'Yalpi foyda', v:'470 000', c:'var(--text)' }, { l:'Sof foyda', v:'320 000', c:'#10b981' }].map((s) => (
                <div key={s.l} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: '0.52rem', color: 'var(--text-muted)' }}>{s.l}</div>
                </div>
              ))}
            </div>
            {CATS.slice(0, 3).map((c) => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.15rem' }}>
                <span style={{ fontSize: '0.58rem', color: 'var(--text)', width: 48, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{c.name}</span>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border)', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, borderRadius: 3, background: '#10b981', width: (c.pct * 0.6) + '%' }} />
                </div>
                <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', width: 24, textAlign: 'right' }}>{Math.round(c.pct * 0.6)}%</span>
              </div>
            ))}
          </div>
        )}

        {/* Customer levels */}
        {hasLevels && (
          <div style={{ background: 'var(--card-bg)', borderRadius: 6, border: '1px solid var(--border)', padding: '0.4rem 0.5rem' }}>
            <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Mijozlar daraja taqsimoti</div>
            {[
              { name: 'Brilliant', color: '#8b5cf6', pct: 8,  count: 2  },
              { name: 'Gold',      color: '#f59e0b', pct: 18, count: 5  },
              { name: 'Silver',    color: '#64748b', pct: 32, count: 9  },
              { name: 'Oddiy',     color: '#94a3b8', pct: 42, count: 12 },
            ].map((l) => (
              <div key={l.name} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.18rem' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.6rem', color: 'var(--text)', width: 40 }}>{l.name}</span>
                <div style={{ flex: 1, height: 5, borderRadius: 2, background: 'var(--border)' }}>
                  <div style={{ height: '100%', borderRadius: 2, background: l.color, width: l.pct + '%' }} />
                </div>
                <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', width: 22, textAlign: 'right' }}>{l.count} ta</span>
              </div>
            ))}
          </div>
        )}
        </>
      </div>
    );
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div style={{ background: 'var(--bg)', borderRadius: 14, width: '100%', maxWidth: modKey === 'pos' ? 980 : 860, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', paddingBottom: modKey === 'pos' && receipt ? '0.5rem' : '1rem' }}>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>{def.label} — xususiyatlarni tanlang</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{def.desc}</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem 0.5rem' }}>✕</button>
          </div>
          {modKey === 'pos' && receipt && (
            <div style={{ display: 'flex', padding: '0 1.25rem' }}>
              {(['features', 'receipt'] as const).map(sec => (
                <button key={sec} type="button" onClick={() => setActiveSection(sec)}
                  style={{ padding: '0.4rem 1.1rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', border: 'none', borderBottom: `2px solid ${activeSection === sec ? primary : 'transparent'}`, background: 'none', color: activeSection === sec ? primary : 'var(--text-muted)', transition: 'color 0.15s, border-color 0.15s' }}>
                  {sec === 'features' ? 'Xususiyatlar' : 'Chek sozlamalari'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="mfm-body" style={{ display: 'grid', gridTemplateColumns: `${activeSection === 'receipt' ? '360px' : '280px'} 1fr`, overflow: 'hidden', flex: 1 }}>
          {/* Left: Feature list OR Receipt designer */}
          <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', padding: '1rem' }}>

            {/* ── Karta uslubi (POS only) ──────────────────────────── */}
            {activeSection === 'features' && modKey === 'pos' && setPosCardStyle && (
              <div style={{ marginBottom: '1.1rem', padding: '0.7rem 0.75rem', background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.55rem' }}>Mahsulot karta uslubi</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
                  {([
                    { k: 'grid_photo_large', l: 'Katta foto', icon: '⊞' },
                    { k: 'grid_photo_small', l: 'Kichik foto', icon: '⊡' },
                    { k: 'grid_no_photo',    l: 'Fotosiz grid', icon: '▦' },
                    { k: 'list',             l: "Ro'yxat", icon: '≡' },
                  ] as { k: string; l: string; icon: string }[]).map(s => {
                    const active = (posCardStyle ?? 'grid_no_photo') === s.k;
                    return (
                      <button key={s.k} type="button" onClick={() => setPosCardStyle(s.k)}
                        style={{ padding: '0.35rem 0.5rem', borderRadius: 7, cursor: 'pointer', border: `1px solid ${active ? primary : 'var(--border)'}`, background: active ? `${primary}18` : 'transparent', color: active ? primary : 'var(--text-muted)', fontWeight: active ? 700 : 400, fontSize: '0.74rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.15s' }}>
                        <span style={{ opacity: 0.7 }}>{s.icon}</span> {s.l}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Xususiyatlar ─────────────────────────────────────── */}
            {activeSection === 'features' && (['free','starter','pro'] as const).map(tier => {
              const feats = grouped[tier];
              if (!feats.length) return null;
              const tc = TIER_COLOR[tier];
              return (
                <div key={tier} style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: tc.badge, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: tc.text }}>{tc.label}</span>
                    {tier !== 'free' && (
                      <span style={{ fontSize: '0.62rem', color: tc.text, background: tc.bg, border: `1px solid ${tc.border}`, padding: '0.05rem 0.35rem', borderRadius: 4 }}>
                        {tier === 'starter' ? "99 000 so'm/oy" : "299 000 so'm/oy"}
                      </span>
                    )}
                  </div>
                  {feats.map(f => {
                    const on = configs[f.key] !== false;
                    return (
                      <div
                        key={f.key}
                        onClick={() => onToggle(f.key, !on)}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.45rem 0.5rem', borderRadius: 7, marginBottom: '0.2rem', cursor: 'pointer', background: on ? tc.bg : 'transparent', border: `1px solid ${on ? tc.border : 'var(--border)'}`, transition: 'all 0.15s', userSelect: 'none' }}
                      >
                        <span style={{ width: 16, height: 16, borderRadius: '50%', background: on ? tc.badge : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.1rem', transition: 'background 0.15s' }}>
                          {on && <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </span>
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 500, color: on ? 'var(--text)' : 'var(--text-muted)' }}>{f.label}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{f.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* ── Ogohlantrish sozlamalari (sales only, Pro) ───────── */}
            {activeSection === 'features' && modKey === 'sales' && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--card-bg)', borderRadius: 8, border: '1px solid rgba(139,92,246,0.25)' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.55rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  Ogohlantrish sozlamalari
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.05rem 0.3rem', borderRadius: 4, background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', border: '1px solid #8b5cf633' }}>Pro</span>
                </div>
                {([
                  { key: 'notify_bell',  label: "Qaytarish so'rovi kelganda" },
                  { key: 'notify_product', label: "Mahsulot yangilanganda (qaysi amal)" },
                  { key: 'notify_employee', label: "Xodim qo'shildi/o'chirildi/yangilandi" },
                ] as { key: string; label: string }[]).map(({ key, label }) => {
                  const checked = configs[key] !== false;
                  return (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text)' }}>{label}</span>
                      <label style={{ position: 'relative', display: 'inline-flex', width: 32, height: 17, cursor: 'pointer', flexShrink: 0 }}>
                        <input type="checkbox" checked={checked} onChange={(e) => onToggle(key, e.target.checked)} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
                        <span style={{ position: 'absolute', inset: 0, borderRadius: 9, background: checked ? primary : 'var(--border)', transition: '0.2s' }}>
                          <span style={{ position: 'absolute', left: checked ? 17 : 2, top: 2, width: 13, height: 13, borderRadius: '50%', background: '#fff', transition: '0.2s' }} />
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Mijoz darajalari (customers only) ───────────────── */}
            {activeSection === 'features' && modKey === 'customers' && customerLevels && setCustomerLevels && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Mijoz darajalari
                </div>
                {customerLevels.map((lvl, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.4rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={lvl.name}
                      onChange={(e) => {
                        const updated = [...customerLevels];
                        updated[i] = { ...updated[i], name: e.target.value };
                        setCustomerLevels(updated);
                      }}
                      style={{ padding: '0.3rem 0.5rem', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.75rem' }}
                      placeholder="Daraja nomi"
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                        {i === 0 ? '0' : ''}
                      </span>
                      {i > 0 && (
                        <input
                          type="number"
                          value={lvl.minAmount}
                          onChange={(e) => {
                            const updated = [...customerLevels];
                            updated[i] = { ...updated[i], minAmount: Number(e.target.value) };
                            setCustomerLevels(updated);
                          }}
                          style={{ width: '100%', padding: '0.3rem 0.5rem', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.75rem' }}
                          placeholder="min so'm"
                        />
                      )}
                      {i === 0 && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>boshlang'ich</span>}
                    </div>
                    <input
                      type="color"
                      value={lvl.color}
                      onChange={(e) => {
                        const updated = [...customerLevels];
                        updated[i] = { ...updated[i], color: e.target.value };
                        setCustomerLevels(updated);
                      }}
                      style={{ width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0 }}
                    />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                  <button type="button" onClick={() => setCustomerLevels([...customerLevels, { name: 'Yangi daraja', minAmount: 5000000, color: '#10b981' }])}
                    style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem', borderRadius: 5, border: `1px solid ${primary}`, background: 'transparent', color: primary, cursor: 'pointer' }}>
                    + Daraja qo'shish
                  </button>
                  {customerLevels.length > 1 && (
                    <button type="button" onClick={() => setCustomerLevels(customerLevels.slice(0, -1))}
                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem', borderRadius: 5, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>
                      Oxirgini o'chirish
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── Chek sozlamalari (to'liq dizayner) ──────────────── */}
            {activeSection === 'receipt' && receipt && (() => {
              const rcpSizes = receipt.sizes ?? ['80mm'];
              const tab      = rcpTab && rcpSizes.includes(rcpTab) ? rcpTab : rcpSizes[0] ?? '80mm';
              const cfg      = receipt.sizeCfg?.[tab] ?? dfltSizeCfg();
              const setC     = (p: Partial<WizardReceiptSizeCfg>) => onSetSizeCfg?.(tab, p);
              const SIZES    = [{ k:'58mm', l:'58 mm (termal)' }, { k:'80mm', l:'80 mm (termal)' }, { k:'a4', l:"A4 (A4 qog'oz)" }];
              const TABLE_STYLES: { k: WizardReceiptSizeCfg['tableStyle']; l: string }[] = [
                { k:'dark',    l:"Qo'ngʻir sarlavha" },
                { k:'light',   l:'Ochiq sarlavha' },
                { k:'minimal', l:'Sarlavsiz' },
              ];
              const SLabel = ({ txt }: { txt: string }) => (
                <div style={{ fontSize: '0.67rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0.75rem 0 0.3rem' }}>{txt}</div>
              );
              const MToggle = ({ label, checked, onChange, disabled, tier }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; tier?: 'starter'|'pro' }) => (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: '1px solid var(--border)', opacity: disabled ? 0.5 : 1 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {label}
                    {tier && <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.05rem 0.3rem', borderRadius: 4, background: tier === 'starter' ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.15)', color: tier === 'starter' ? '#10b981' : '#8b5cf6', border: `1px solid ${tier === 'starter' ? '#10b98133' : '#8b5cf633'}` }}>{tier === 'starter' ? 'Starter+' : 'Pro'}</span>}
                  </span>
                  <label style={{ position: 'relative', display: 'inline-flex', width: 32, height: 17, cursor: disabled ? 'default' : 'pointer', flexShrink: 0 }}>
                    <input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
                    <span style={{ position: 'absolute', inset: 0, borderRadius: 9, background: checked ? primary : 'var(--border)', transition: '0.2s' }}>
                      <span style={{ position: 'absolute', left: checked ? 17 : 2, top: 2, width: 13, height: 13, borderRadius: '50%', background: '#fff', transition: '0.2s' }} />
                    </span>
                  </label>
                </div>
              );
              return (
                <>
                  {/* Qog'oz o'lchami */}
                  <SLabel txt="Qog'oz o'lchami" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {SIZES.map(s => {
                      const on = rcpSizes.includes(s.k);
                      return (
                        <label key={s.k} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.38rem 0.6rem', border: `1px solid ${on ? primary : 'var(--border)'}`, borderRadius: 7, cursor: 'pointer', background: on ? `${primary}11` : 'transparent' }}>
                          <input type="checkbox" checked={on} onChange={e => onToggleReceiptSize?.(s.k, e.target.checked)} style={{ accentColor: primary }} />
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>{s.l}</span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Standart o'lcham */}
                  {rcpSizes.length > 1 && (
                    <>
                      <SLabel txt="Standart o'lcham" />
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {rcpSizes.map(s => (
                          <button key={s} type="button"
                            style={{ padding: '0.25rem 0.65rem', borderRadius: 6, cursor: 'pointer', border: `1px solid ${(receipt.defaultSize ?? '80mm') === s ? primary : 'var(--border)'}`, background: (receipt.defaultSize ?? '80mm') === s ? primary : 'transparent', color: (receipt.defaultSize ?? '80mm') === s ? '#fff' : 'var(--text)', fontWeight: 600, fontSize: '0.78rem' }}
                            onClick={() => setReceiptProp?.({ defaultSize: s })}>
                            {s === 'a4' ? 'A4' : s}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* O'lcham tablari */}
                  {rcpSizes.length > 1 && (
                    <div style={{ display: 'flex', gap: '0.2rem', marginTop: '0.75rem', marginBottom: '0.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.35rem' }}>
                      {rcpSizes.map(s => (
                        <button key={s} type="button"
                          style={{ padding: '0.25rem 0.6rem', borderRadius: '5px 5px 0 0', fontSize: '0.75rem', cursor: 'pointer', border: `1px solid ${rcpTab === s ? primary : 'var(--border)'}`, borderBottom: rcpTab === s ? '1px solid var(--bg)' : '1px solid var(--border)', background: rcpTab === s ? 'var(--bg)' : 'var(--card-bg)', color: rcpTab === s ? primary : 'var(--text-muted)', fontWeight: rcpTab === s ? 700 : 400 }}
                          onClick={() => setRcpTab?.(s)}>
                          {s === 'a4' ? 'A4' : s}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Sarlavha */}
                  <SLabel txt="Sarlavha" />
                  <div style={{ background: 'var(--card-bg)', borderRadius: 8, padding: '0 0.6rem' }}>
                    <MToggle label="Do'kon nomi" checked={true} onChange={() => {}} disabled />
                    <MToggle label='"Savdo cheki" yozuvi' checked={true} onChange={() => {}} disabled />
                    <MToggle label="Logo" checked={cfg.showLogo} onChange={v => setC({ showLogo: v })} tier="starter" />
                    <MToggle label="Manzil" checked={cfg.showAddress} onChange={v => setC({ showAddress: v })} />
                    <MToggle label="Telefon" checked={cfg.showPhone} onChange={v => setC({ showPhone: v })} />
                  </div>

                  {/* Ma'lumot qatori */}
                  <SLabel txt="Ma'lumot qatori" />
                  <div style={{ background: 'var(--card-bg)', borderRadius: 8, padding: '0 0.6rem' }}>
                    <MToggle label="Chek raqami" checked={true} onChange={() => {}} disabled />
                    <MToggle label="Sana va vaqt" checked={true} onChange={() => {}} disabled />
                    <MToggle label="Sotuvchi" checked={cfg.showSeller} onChange={v => setC({ showSeller: v })} />
                    <MToggle label="Mijoz" checked={cfg.showCustomer} onChange={v => setC({ showCustomer: v })} />
                  </div>

                  {/* Jadval */}
                  <SLabel txt="Jadval (mahsulotlar)" />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text)', fontWeight: 600, margin: '0.25rem 0' }}>Ustunlar:</div>
                  <div style={{ background: 'var(--card-bg)', borderRadius: 8, padding: '0 0.6rem', marginBottom: '0.5rem' }}>
                    <MToggle label="Mahsulot nomi" checked={true} onChange={() => {}} disabled />
                    <MToggle label="O'lchov birligi" checked={cfg.colUnit} onChange={v => setC({ colUnit: v })} />
                    <MToggle label="Miqdor" checked={true} onChange={() => {}} disabled />
                    {tab !== '58mm' && <MToggle label="Birlik narxi" checked={cfg.colPrice} onChange={v => setC({ colPrice: v })} />}
                    <MToggle label="Jami summa" checked={true} onChange={() => {}} disabled />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text)', fontWeight: 600, margin: '0.25rem 0' }}>Jadval dizayni:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.5rem' }}>
                    {TABLE_STYLES.map(ts => (
                      <label key={ts.k} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="radio" name={`mts-${tab}`} checked={cfg.tableStyle === ts.k} onChange={() => setC({ tableStyle: ts.k })} style={{ accentColor: primary }} />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>{ts.l}</span>
                      </label>
                    ))}
                  </div>

                  {/* Umumiy summa */}
                  <SLabel txt="Umumiy summa" />
                  <div style={{ background: 'var(--card-bg)', borderRadius: 8, padding: '0 0.6rem' }}>
                    <MToggle label="Umumiy to'lov" checked={true} onChange={() => {}} disabled />
                    <MToggle label="To'lov tarkibi (naqd/karta/nasiya)" checked={cfg.showPayBreak} onChange={v => setC({ showPayBreak: v })} />
                    <MToggle label="Qarzdorlik ma'lumotlari" checked={cfg.showDebtInfo} onChange={v => setC({ showDebtInfo: v })} tier="starter" />
                  </div>

                  {/* Pastki qism */}
                  <SLabel txt="Pastki qism" />
                  <div style={{ background: 'var(--card-bg)', borderRadius: 8, padding: '0 0.6rem', marginBottom: '0.65rem' }}>
                    <MToggle label="Qaytim (change)" checked={cfg.showChange} onChange={v => setC({ showChange: v })} />
                    <MToggle label="Barcode" checked={cfg.showBarcode} onChange={v => setC({ showBarcode: v })} tier="starter" />
                    <MToggle label="Pastda do'kon nomi" checked={cfg.showFooterName} onChange={v => setC({ showFooterName: v })} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text)', fontWeight: 600, marginBottom: '0.3rem' }}>Xayrli so'z</div>
                    <input type="text" value={cfg.footerText} onChange={e => setC({ footerText: e.target.value })}
                      placeholder="Rahmat! Qaytib keling!"
                      style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--card-bg)', color: 'var(--text)', fontSize: '0.8rem', boxSizing: 'border-box' }} />
                  </div>
                </>
              );
            })()}
          </div>

          {/* Right: Visual preview or Receipt preview */}
          <div className="mfm-right-panel" style={{ overflowY: 'auto', padding: activeSection === 'receipt' ? '0.75rem 1rem' : '1rem 1.25rem', background: 'var(--card-bg)' }}>
            {activeSection === 'receipt' && receipt ? (
              <ReceiptPreview
                receipt={receipt}
                theme={theme ?? { shopName: "Do'kon nomi", address: 'Toshkent sh.', phone: '+998 90 000 00 00', logo: '', primaryColor: primary, style: 'modern', darkMode: false }}
                activeTab={rcpTab}
              />
            ) : (
              <>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Ko'rinish (tanlangan xususiyatlar faollashadi)
                </div>
                {modKey === 'customers'  ? <CustomerPreview />
                  : modKey === 'pos'       ? <PosPreview />
                  : modKey === 'products'  ? <ProductsPreview />
                  : modKey === 'sales'     ? <AuditPreview />
                  : modKey === 'reports'   ? <StatisticsPreview />
                  : modKey === 'employees' ? <EmployeesPreview />
                  : modKey === 'warehouse' ? <WarehousePreview />
                  : modKey === 'branches'  ? <BranchesPreview />
                  : <GenericPreview />}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: primary, color: '#fff', border: 'none', padding: '0.5rem 1.25rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
            Saqlash
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function WizardSidebar({ step, onGoTo }: { step: number; onGoTo: (s: number) => void }) {
  const currentIdx = WIZARD_ORDER.indexOf(step);
  return (
    <div className="wz-sidebar">
      <div className="wz-sidebar-title">CRM Yaratish</div>
      <div className="wz-steps">
        {WIZARD_ORDER.map((stepNum, i) => {
          const isDone   = i < currentIdx;
          const isActive = i === currentIdx;
          const label    = STEP_LABELS[stepNum - 1];
          return (
            <div
              key={stepNum}
              className={`wz-step${isActive ? ' wz-step--active' : ''}${isDone ? ' wz-step--done' : ''}`}
              onClick={() => isDone && onGoTo(stepNum)}
              style={{ cursor: isDone ? 'pointer' : 'default' }}
            >
              <div className="wz-step-num">{isDone ? '✓' : i + 1}</div>
              <div className="wz-step-label">{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReceiptPreview({ receipt, theme, activeTab }: { receipt: WizardReceipt; theme: WizardTheme; activeTab?: string }) {
  const size = activeTab ?? receipt.defaultSize ?? receipt.width ?? '80mm';
  const cfg  = receipt.sizeCfg?.[size] ?? dfltSizeCfg();
  const is58 = size === '58mm';
  const shopName = theme.shopName || "DO'KON NOMI";
  const thStyle  = cfg.tableStyle;
  const thBg     = thStyle === 'dark' ? '#1e293b' : thStyle === 'light' ? '#f1f5f9' : 'transparent';
  const thColor  = thStyle === 'dark' ? '#fff' : '#374151';
  const thBorder = thStyle !== 'minimal' ? '1px solid #e2e8f0' : 'none';

  const ITEMS = [{ name: 'CARBINS S90', unit: 'piece', qty: 1, price: '$550', total: '$550' }];

  return (
    <div className="wz-preview-wrap" style={{ background: '#f8fafc' }}>
      <div className="wz-preview-box" style={{ maxWidth: is58 ? 220 : 320, fontFamily: 'monospace', background: '#fff', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: 4, fontSize: '0.75rem', color: '#111' }}>
        {/* Store header */}
        {cfg.showLogo && <div style={{ textAlign: 'center', marginBottom: 4, opacity: 0.5, fontSize: '0.65rem' }}>[LOGO]</div>}
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.88rem', marginBottom: 2 }}>{shopName.toUpperCase()}</div>
        <div style={{ textAlign: 'center', opacity: 0.65, marginBottom: 4 }}>Savdo cheki</div>
        {cfg.showPhone   && <div style={{ textAlign: 'center', opacity: 0.65 }}>{theme.phone   || '+998 90 000 00 00'}</div>}
        {cfg.showAddress && <div style={{ textAlign: 'center', opacity: 0.65 }}>{theme.address || 'Toshkent sh.'}</div>}

        <hr style={{ border: 'none', borderTop: '1px dashed #ccc', margin: '0.4rem 0' }} />

        {/* Meta */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span>Chek:</span><span style={{ fontWeight: 700 }}>#SALE-{new Date().toISOString().slice(2,10).replace(/-/g,'')}-0010</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span>Sana:</span><span>{new Date().toLocaleDateString('uz-UZ')}, {new Date().toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'})}</span>
        </div>
        {cfg.showSeller   && <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}><span>Sotuvchi:</span><span>Zafar</span></div>}
        {cfg.showCustomer && <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}><span>Mijoz:</span><span style={{ display:'flex', gap:'0.5rem' }}><span>Comfort tuning</span><span style={{ opacity:0.6 }}>+998 91 432 89 99</span></span></div>}

        <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '0.4rem 0' }} />

        {/* Product table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: is58 ? '0.65rem' : '0.72rem' }}>
          <thead>
            <tr style={{ background: thBg, color: thColor }}>
              <th style={{ textAlign: 'left', padding: '0.25rem 0.3rem', border: thBorder }}>Mahsulot</th>
              {cfg.colUnit  && <th style={{ padding: '0.25rem 0.3rem', border: thBorder }}>O'lchov</th>}
              <th style={{ padding: '0.25rem 0.3rem', border: thBorder }}>Miqdor</th>
              {!is58 && cfg.colPrice && <th style={{ padding: '0.25rem 0.3rem', border: thBorder }}>Narx</th>}
              <th style={{ textAlign: 'right', padding: '0.25rem 0.3rem', border: thBorder }}>Jami</th>
            </tr>
          </thead>
          <tbody>
            {ITEMS.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.25rem 0.3rem' }}>{item.name}</td>
                {cfg.colUnit  && <td style={{ padding: '0.25rem 0.3rem', textAlign: 'center' }}>{item.unit}</td>}
                <td style={{ padding: '0.25rem 0.3rem', textAlign: 'center' }}>{item.qty}</td>
                {!is58 && cfg.colPrice && <td style={{ padding: '0.25rem 0.3rem', textAlign: 'right', fontWeight: 600 }}>{item.price}</td>}
                <td style={{ padding: '0.25rem 0.3rem', textAlign: 'right', fontWeight: 700 }}>{item.total}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '0.4rem 0' }} />

        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
          <span>UMUMIY TO'LOV:</span><span>$550</span>
        </div>

        {/* Change */}
        {cfg.showChange && (
          <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.7 }}>
            <span>Qaytim:</span><span>$0.50</span>
          </div>
        )}

        {/* Payment breakdown */}
        {cfg.showPayBreak && (
          <div style={{ marginTop: '0.3rem' }}>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>TO'LOV TARKIBI:</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}><span>Nasiya (qarz):</span><span>$550</span></div>
          </div>
        )}

        {/* Debt info */}
        {cfg.showDebtInfo && (
          <div style={{ marginTop: '0.4rem', border: '1px solid #ef4444', borderRadius: 4, padding: '0.3rem 0.4rem', background: 'rgba(239,68,68,0.04)' }}>
            <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: 3 }}>QARZDORLIK MA'LUMOTLARI</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Bu savdo qarz:</span><span style={{ color: '#ef4444' }}>$550</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Oldingi qarz:</span><span style={{ color: '#ef4444' }}>$13,280.85</span></div>
            <hr style={{ border: 'none', borderTop: '1px solid #ef4444', margin: '0.2rem 0', opacity: 0.4 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#ef4444' }}><span>UMUMIY QARZ:</span><span>$13,830.85</span></div>
          </div>
        )}

        {cfg.showBarcode && <div style={{ textAlign: 'center', marginTop: '0.4rem', letterSpacing: 3, fontSize: '0.85rem', opacity: 0.5 }}>|||||||||||||</div>}

        <hr style={{ border: 'none', borderTop: '1px dashed #ccc', margin: '0.4rem 0' }} />
        <div style={{ textAlign: 'center', opacity: 0.7 }}>{cfg.footerText || 'Rahmat!'}</div>
        {cfg.showFooterName && <div style={{ textAlign: 'center', fontWeight: 600, fontSize: '0.68rem', marginTop: 2 }}>{shopName}</div>}
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
        <div className="logo-upload-icon">{uploading ? '...' : '[+]'}</div>
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
      <div className="wz-card-title">{r?.label ?? roleKey}</div>

      {active && perm && (
        <div className="wz-perms-accordion" onClick={(e) => e.stopPropagation()}>
          <div className="wz-perms-title">▾ Ruxsatlar:</div>

          {allModules.map((m) => {
            const on = isAdmin || effectiveAllowed.includes(m);
            return (
              <div key={m} className={`wz-perm-item ${on ? 'wz-perm-item--allow' : 'wz-perm-item--deny'}`}>
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
            <span style={{ flex: 1 }}>{PERMISSION_LABELS['delete']}</span>
          </div>
          <div className={`wz-perm-item ${perm.canAccessSettings ? 'wz-perm-item--allow' : 'wz-perm-item--deny'}`}>
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

function TenantDetailModal({
  detail, onClose, onEdit, onDelete, onImpersonate,
}: {
  detail: TenantDetail;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onImpersonate: (url: string, name: string) => void;
}) {
  const [tab, setTab]               = useState<'umumiy' | 'analitika' | 'resurslar' | 'billing' | 'foydalanuvchilar' | 'buglar'>('umumiy');
  const [billing,        setBilling]     = useState<Subscription | null>(null);
  const [payments,       setPayments]    = useState<PaymentHistoryItem[]>([]);
  const [billingLoading, setBillingLoad]   = useState(false);
  const [slugCopied,     setSlugCopied]   = useState(false);
  const [impersonating,  setImpersonating]= useState(false);
  const [employees,      setEmployees]    = useState<EmployeeRow[] | null>(null);
  const [empLoading,     setEmpLoading]  = useState(false);
  const [tenantBugs,     setTenantBugs]  = useState<TenantBug[] | null>(null);
  const [bugsLoading,    setBugsLoading] = useState(false);

  const wc       = detail.wizardConfig;
  const s        = detail.stats;
  const industry = wc?.industry ?? 'retail';
  const resMax   = Math.max(s.totalProducts, s.totalCustomers, s.totalSales, s.totalEmployees ?? 0, 1);

  const chartData = (s.weeklyChart ?? []).map((d) => ({
    ...d, day: DAY_UZ[new Date(d.date + 'T00:00:00').getDay()],
  }));

  const pieData = [
    { name: 'Naqd',   value: s.paymentBreakdown?.cash   ?? 0 },
    { name: 'Karta',  value: s.paymentBreakdown?.card   ?? 0 },
    { name: 'Nasiya', value: s.paymentBreakdown?.credit ?? 0 },
  ].filter((d) => d.value > 0);

  useEffect(() => {
    if (tab === 'billing' && !billing && !billingLoading) {
      setBillingLoad(true);
      Promise.all([getBilling(detail.id), getPaymentHistory(detail.id)])
        .then(([sub, hist]) => { setBilling(sub); setPayments(hist); })
        .catch(() => {})
        .finally(() => setBillingLoad(false));
    }
    if (tab === 'foydalanuvchilar' && !employees && !empLoading) {
      setEmpLoading(true);
      api.get<EmployeeRow[]>('/employees', { headers: { 'x-tenant-id': detail.id } })
        .then((r) => setEmployees(r.data))
        .catch(() => setEmployees([]))
        .finally(() => setEmpLoading(false));
    }
    if (tab === 'buglar' && !tenantBugs && !bugsLoading) {
      setBugsLoading(true);
      api.get<{ data: TenantBug[] } | TenantBug[]>(`/bugs?tenantId=${detail.id}`)
        .then((r) => setTenantBugs(Array.isArray(r.data) ? r.data : (r.data as { data: TenantBug[] }).data ?? []))
        .catch(() => setTenantBugs([]))
        .finally(() => setBugsLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, detail.id]);

  const copySlug = () => {
    navigator.clipboard.writeText(detail.slug).catch(() => {});
    setSlugCopied(true);
    setTimeout(() => setSlugCopied(false), 1800);
  };

  const handleImpersonate = async () => {
    setImpersonating(true);
    try {
      const result = await impersonateTenant(detail.id);
      const crmBase = (import.meta as unknown as { env: Record<string, string> }).env['VITE_CRM_URL'] ?? 'http://localhost:4300';
      onImpersonate(`${crmBase}/impersonate?token=${encodeURIComponent(result.token)}`, detail.name);
    } catch {
      // leave button in loading state only briefly on error
    } finally {
      setImpersonating(false);
    }
  };

  const TABS = [
    { key: 'umumiy',          icon: <Info size={15} />,        label: 'Umumiy'          },
    { key: 'analitika',       icon: <BarChart2 size={15} />,   label: 'Analitika'       },
    { key: 'resurslar',       icon: <Database size={15} />,    label: 'Resurslar'       },
    { key: 'billing',         icon: <CreditCard size={15} />,  label: 'Billing'         },
    { key: 'foydalanuvchilar',icon: <Users size={15} />,       label: 'Foydalanuvchilar'},
    { key: 'buglar',          icon: <Bug size={15} />,         label: 'Buglar'          },
  ] as const;

  const SUB_STATUS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    trial:     { label: 'Sinov',         color: '#f59e0b', icon: <Clock size={13} /> },
    active:    { label: 'Faol',          color: '#10b981', icon: <CheckCircle2 size={13} /> },
    suspended: { label: "To'xtatilgan", color: '#ef4444', icon: <AlertCircle size={13} /> },
    cancelled: { label: 'Bekor',         color: '#6b7280', icon: <XCircle size={13} /> },
  };

  const subStatus = billing ? (SUB_STATUS[billing.status] ?? SUB_STATUS['trial']) : null;

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
            <button
              className="btn-secondary"
              onClick={handleImpersonate}
              disabled={impersonating}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <LogIn size={14} />
              {impersonating ? 'Ochilmoqda...' : 'CRM kirish'}
            </button>
            <button className="btn-secondary" onClick={onEdit}>Tahrirlash</button>
            <button className="btn-danger" onClick={onDelete}>O'chirish</button>
            <button className="td-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* TAB BAR */}
        <div className="td-tabs">
          {TABS.map((t) => (
            <div key={t.key} className={`td-tab${tab === t.key ? ' td-tab--active' : ''}`} onClick={() => setTab(t.key)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>{t.icon}{t.label}</span>
            </div>
          ))}
        </div>

        {/* BODY */}
        <div className="td-body">

          {/* ── TAB: UMUMIY ── */}
          {tab === 'umumiy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="td-stat-cards">
                {[
                  { icon: <ShoppingBag size={18} />, val: `${fmt(s.totalRevenue)} so'm`, label: 'Jami tushum',  color: '#6366f1' },
                  { icon: <Package size={18} />,     val: s.totalProducts,               label: 'Mahsulotlar',  color: '#10b981' },
                  { icon: <UserCheck size={18} />,   val: s.totalCustomers,              label: 'Mijozlar',     color: '#f59e0b' },
                  { icon: <Users size={18} />,       val: s.totalEmployees ?? 0,         label: 'Xodimlar',     color: '#8b5cf6' },
                ].map((c) => (
                  <div key={c.label} className="td-stat-card" style={{ flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ color: c.color, marginBottom: '0.1rem' }}>{c.icon}</div>
                    <div className="td-stat-card-val">{c.val}</div>
                    <div className="td-stat-card-label">{c.label}</div>
                  </div>
                ))}
              </div>

              <div className="tenant-info-block">
                <div className="tenant-info-row">
                  <span>Slug</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <code>{detail.slug}</code>
                    <button onClick={copySlug} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                      {slugCopied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                    </button>
                  </span>
                </div>
                <div className="tenant-info-row">
                  <span>Soha</span>
                  <span className="industry-badge">{INDUSTRY_LABEL[industry] ?? industry}</span>
                </div>
                <div className="tenant-info-row">
                  <span>Yaratilgan</span>
                  <span>{new Date(detail.createdAt).toLocaleDateString('uz-UZ')}</span>
                </div>
                <div className="tenant-info-row">
                  <span>Oxirgi faollik</span>
                  <span>{timeAgo(s.lastActivity)}</span>
                </div>
                <div className="tenant-info-row">
                  <span>Holat</span>
                  <span className={`status-dot status-dot--${detail.isActive ? 'active' : 'inactive'}`}>
                    {detail.isActive ? '● Faol' : '● Nofaol'}
                  </span>
                </div>
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

          {/* ── TAB: ANALITIKA ── */}
          {tab === 'analitika' && (
            <div>
              {/* 4 stat cards */}
              <div className="td-stat-cards">
                {[
                  { val: `${fmt(s.totalRevenue)} so'm`,    label: 'Jami tushum' },
                  { val: `${s.totalSales} ta`,              label: 'Jami sotuvlar' },
                  { val: `${s.totalCustomers} ta`,          label: 'Mijozlar' },
                  { val: `${fmt(s.avgOrderValue)} so'm`,    label: "O'rtacha chek" },
                ].map((c) => (
                  <div key={c.label} className="td-stat-card">
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

          {/* ── TAB: RESURSLAR ── */}
          {tab === 'resurslar' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="td-chart-box">
                <div className="td-chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Database size={14} /> Ma'lumotlar hajmi
                </div>
                {[
                  { icon: <Package size={14} />,    label: 'Mahsulotlar', count: s.totalProducts,      color: '#6366f1' },
                  { icon: <UserCheck size={14} />,  label: 'Mijozlar',    count: s.totalCustomers,     color: '#10b981' },
                  { icon: <ShoppingBag size={14} />,label: 'Sotuvlar',    count: s.totalSales,         color: '#f59e0b' },
                  { icon: <Users size={14} />,      label: 'Xodimlar',    count: s.totalEmployees ?? 0, color: '#8b5cf6' },
                ].map(({ icon, label, count, color }) => (
                  <div key={label} style={{ marginBottom: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.84rem', color: 'var(--text)' }}>
                        <span style={{ color }}>{icon}</span>{label}
                      </span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color }}>{count} ta</span>
                    </div>
                    <div style={{ height: 7, background: 'var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, (count / resMax) * 100)}%`, background: color, borderRadius: 6 }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="td-chart-box">
                <div className="td-chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={14} /> Ko'rsatkichlar
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {[
                    { icon: <TrendingUp size={16} />,  label: 'Oylik tushum',   val: `${fmt(s.monthlyRevenue)} so'm`,             color: '#6366f1' },
                    { icon: <ShoppingBag size={16} />, label: "O'rtacha chek",  val: `${fmt(s.avgOrderValue)} so'm`,              color: '#10b981' },
                    { icon: <Calendar size={16} />,    label: 'Yaratilgan',     val: new Date(detail.createdAt).toLocaleDateString('uz-UZ'), color: '#f59e0b' },
                    { icon: <Layers size={16} />,      label: 'Faol modullar',  val: `${wc?.modules?.length ?? 0} ta`,            color: '#8b5cf6' },
                  ].map(({ icon, label, val, color }) => (
                    <div key={label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '0.7rem 0.85rem' }}>
                      <div style={{ color, marginBottom: '0.3rem' }}>{icon}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>{label}</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="td-chart-box">
                <div className="td-chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Briefcase size={14} /> Konfiguratsiya
                </div>
                <div className="tenant-info-block" style={{ marginBottom: 0 }}>
                  <div className="tenant-info-row"><span>Til</span><span style={{ fontWeight: 600 }}>{wc?.language ?? '—'}</span></div>
                  <div className="tenant-info-row"><span>Valyuta</span><span style={{ fontWeight: 600, textTransform: 'uppercase' }}>{wc?.currency ?? '—'}</span></div>
                  <div className="tenant-info-row"><span>POS uslubi</span><span style={{ fontWeight: 600 }}>{wc?.posCardStyle ?? '—'}</span></div>
                  <div className="tenant-info-row"><span>Chek o'lchami</span><span style={{ fontWeight: 600 }}>{wc?.receiptSize ?? '—'}</span></div>
                  <div className="tenant-info-row"><span>Ish vaqti</span><span style={{ fontWeight: 600 }}>{wc?.workingHoursStart ?? '09:00'} – {wc?.workingHoursEnd ?? '18:00'}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: BILLING ── */}
          {tab === 'billing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {billingLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Yuklanmoqda...</div>
              ) : !billing ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Billing ma'lumoti topilmadi
                </div>
              ) : (
                <>
                  <div className="td-chart-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Joriy tarif</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', textTransform: 'capitalize' }}>{billing.plan}</div>
                        {billing.billingCycle && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            {billing.billingCycle === 'yearly' ? 'Yillik' : 'Oylik'} to'lov
                          </div>
                        )}
                      </div>
                      {subStatus && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: subStatus.color + '18', color: subStatus.color, padding: '0.35rem 0.75rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700 }}>
                          {subStatus.icon}{subStatus.label}
                        </div>
                      )}
                    </div>
                    <div style={{ height: 1, background: 'var(--border)', margin: '0.85rem 0' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      {[
                        { label: 'Davr boshlanishi', val: billing.currentPeriodStart ? new Date(billing.currentPeriodStart).toLocaleDateString('uz-UZ') : '—' },
                        { label: 'Sinov tugashi',   val: billing.trialEndsAt  ? new Date(billing.trialEndsAt).toLocaleDateString('uz-UZ')  : '—' },
                        { label: 'Kutilmoqda',      val: billing.pendingPlan ? `→ ${billing.pendingPlan}` : '—' },
                        { label: "Jami to'lovlar",  val: `${payments.length} ta` },
                      ].map(({ label, val }) => (
                        <div key={label}>
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{label}</div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', marginTop: '0.1rem' }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="td-chart-box">
                    <div className="td-chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Receipt size={14} /> To'lov tarixi
                    </div>
                    {payments.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0', textAlign: 'center' }}>
                        To'lovlar mavjud emas
                      </div>
                    ) : (
                      <table className="td-top-products">
                        <thead>
                          <tr><th>Sana</th><th>Summa</th><th>Usul</th><th>Holat</th></tr>
                        </thead>
                        <tbody>
                          {payments.slice(0, 10).map((p) => (
                            <tr key={p.id}>
                              <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(p.createdAt).toLocaleDateString('uz-UZ')}</td>
                              <td style={{ fontWeight: 600 }}>{fmt(p.amount)} so'm</td>
                              <td style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{p.method}</td>
                              <td>
                                <span style={{
                                  fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 6,
                                  background: p.status === 'success' ? '#d1fae5' : p.status === 'pending' ? '#fef3c7' : '#fee2e2',
                                  color:      p.status === 'success' ? '#065f46' : p.status === 'pending' ? '#92400e' : '#991b1b',
                                }}>
                                  {p.status === 'success' ? 'Tasdiqlangan' : p.status === 'pending' ? 'Kutilmoqda' : 'Rad etilgan'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── TAB: FOYDALANUVCHILAR ── */}
          {tab === 'foydalanuvchilar' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {empLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Yuklanmoqda...</div>
              ) : !employees || employees.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  <UserCircle size={36} style={{ opacity: 0.25, marginBottom: '0.5rem', display: 'block', margin: '0 auto 0.5rem' }} />
                  Xodimlar topilmadi
                </div>
              ) : (
                <>
                  {/* Summary row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    {[
                      { icon: <Users size={16} />,   label: "Jami xodimlar",  val: employees.length,                                    color: '#6366f1' },
                      { icon: <Shield size={16} />,  label: 'Admin',          val: employees.filter(e => e.role === 'admin').length,     color: '#8b5cf6' },
                      { icon: <UserCheck size={16} />,label: 'Faol',          val: employees.filter(e => e.isActive).length,            color: '#10b981' },
                    ].map(({ icon, label, val, color }) => (
                      <div key={label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '0.7rem 0.85rem' }}>
                        <div style={{ color, marginBottom: '0.3rem' }}>{icon}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
                        <div style={{ fontSize: '1rem', fontWeight: 700 }}>{val} ta</div>
                      </div>
                    ))}
                  </div>

                  {/* Employees list */}
                  <div className="td-chart-box" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="td-top-products" style={{ marginBottom: 0 }}>
                      <thead>
                        <tr>
                          <th><UserCircle size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Ism</th>
                          <th><Key size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Login (email)</th>
                          <th><Shield size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Rol</th>
                          <th><LogIn size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Holat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((emp) => (
                          <tr key={emp.id}>
                            <td style={{ fontWeight: 600 }}>
                              {emp.firstName} {emp.lastName}
                            </td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                              {emp.email ?? '—'}
                            </td>
                            <td>
                              <span style={{
                                fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 6,
                                background: emp.role === 'admin' ? '#ede9fe' : 'var(--bg)',
                                color:      emp.role === 'admin' ? '#7c3aed' : 'var(--text-muted)',
                              }}>
                                {emp.role}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 6,
                                background: emp.isActive ? '#d1fae5' : '#f3f4f6',
                                color:      emp.isActive ? '#065f46' : '#6b7280',
                              }}>
                                {emp.isActive ? 'Faol' : 'Nofaol'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', padding: '0 0.25rem' }}>
                    * Login parollari xavfsizlik sababli ko'rsatilmaydi. Parolni qayta o'rnatish Sozlash {'>'} Xodimlar bo'limida.
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── TAB: BUGLAR ── */}
          {tab === 'buglar' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {bugsLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Yuklanmoqda...</div>
              ) : !tenantBugs || tenantBugs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  <CheckCircle2 size={36} color="#10b981" style={{ display: 'block', margin: '0 auto 0.5rem' }} />
                  Buglar topilmadi — tizim barqaror
                </div>
              ) : (
                <>
                  {/* Bug summary */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    {[
                      { label: 'Jami',        val: tenantBugs.length,                                   color: '#6366f1' },
                      { label: 'Yangi',        val: tenantBugs.filter(b => b.status === 'new').length,  color: '#ef4444' },
                      { label: 'Hal qilingan',val: tenantBugs.filter(b => b.status === 'resolved').length, color: '#10b981' },
                    ].map(({ label, val, color }) => (
                      <div key={label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '0.7rem 0.85rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color }}>{val}</div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Bug list */}
                  <div className="td-chart-box" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="td-top-products" style={{ marginBottom: 0 }}>
                      <thead>
                        <tr><th>Vaqt</th><th>Xatolik</th><th>Foydalanuvchi</th><th>Holat</th></tr>
                      </thead>
                      <tbody>
                        {tenantBugs.slice(0, 15).map((b) => (
                          <tr key={b.id}>
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                              {new Date(b.createdAt).toLocaleDateString('uz-UZ')}
                            </td>
                            <td>
                              <div style={{ fontSize: '0.82rem', fontWeight: 500, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {b.message}
                              </div>
                              {b.url && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {b.url}
                                </div>
                              )}
                            </td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                              {b.userEmail ?? 'Anonim'}
                            </td>
                            <td>
                              <span style={{
                                fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 6,
                                background: b.status === 'resolved' ? '#d1fae5' : b.status === 'in_progress' ? '#fef3c7' : '#fee2e2',
                                color:      b.status === 'resolved' ? '#065f46' : b.status === 'in_progress' ? '#92400e' : '#991b1b',
                              }}>
                                {b.status === 'resolved' ? 'Hal qilindi' : b.status === 'in_progress' ? "Ishlanmoqda" : 'Yangi'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Config Drawer ──────────────────────────────────────────────────────────────

type StrArrField = 'posPaymentMethods' | 'posCurrencies' | 'workingDays' | 'exportFormats';

interface NewEmpForm {
  firstName: string; lastName: string;
  email: string; password: string; role: string;
}

function ConfigDrawer({ tenant, onClose, onTenantStatusChange, initialTab = 'general' }: {
  tenant: Tenant;
  onClose: () => void;
  onTenantStatusChange: (id: string, active: boolean) => void;
  initialTab?: CfgTabKey;
}) {
  const [tab,          setTab]          = useState<CfgTabKey>(initialTab);
  const [cfg,          setCfg]          = useState<WizardCfg | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState('');
  const [employees,    setEmployees]    = useState<EmployeeRow[]>([]);
  const [empLoading,   setEmpLoading]   = useState(false);
  const [showAddEmp,   setShowAddEmp]   = useState(false);
  const [addingEmp,    setAddingEmp]    = useState(false);
  const [newEmp,       setNewEmp]       = useState<NewEmpForm>({ firstName: '', lastName: '', email: '', password: '', role: 'cashier' });
  const [tenantActive, setTenantActive] = useState(tenant.isActive);
  const [drawerDetail,  setDrawerDetail]  = useState<TenantDetail | null>(null);
  const [statLoading,   setStatLoading]   = useState(false);
  const [drawerBilling, setDrawerBilling] = useState<Subscription | null>(null);
  const [billLoad,      setBillLoad]      = useState(false);
  const [newPlan,       setNewPlan]       = useState<string>('trial');
  const [newCycle,      setNewCycle]      = useState<'monthly' | 'yearly'>('monthly');
  const [planSaving,    setPlanSaving]    = useState(false);

  useEffect(() => {
    setLoading(true);
    getWizardConfig(tenant.id)
      .then((c) => setCfg(c))
      .catch(() => setCfg(null))
      .finally(() => setLoading(false));
  }, [tenant.id]);

  useEffect(() => {
    if (tab !== 'employees') return;
    setEmpLoading(true);
    getEmployees(tenant.id)
      .then(setEmployees)
      .catch(() => setEmployees([]))
      .finally(() => setEmpLoading(false));
  }, [tab, tenant.id]);

  useEffect(() => {
    if (tab !== 'stats' || drawerDetail) return;
    setStatLoading(true);
    api.get<TenantDetail>(`/tenants/${tenant.id}`)
      .then((r) => setDrawerDetail(r.data))
      .catch(() => {})
      .finally(() => setStatLoading(false));
  }, [tab, tenant.id, drawerDetail]);

  useEffect(() => {
    if (tab !== 'billing' || drawerBilling) return;
    setBillLoad(true);
    getBilling(tenant.id)
      .then((b) => { setDrawerBilling(b); setNewPlan(b.plan); setNewCycle(b.billingCycle); })
      .catch(() => {})
      .finally(() => setBillLoad(false));
  }, [tab, tenant.id, drawerBilling]);

  const patch = (p: Partial<WizardCfg>) =>
    setCfg((prev) => prev ? { ...prev, ...p } as WizardCfg : prev);

  const patchTheme = (p: Partial<WizardCfgTheme>) =>
    setCfg((prev) => prev ? { ...prev, theme: { ...(prev.theme ?? {}), ...p } } as WizardCfg : prev);

  const toggleModule = (key: string) => {
    if (!cfg) return;
    const m = cfg.modules;
    patch({ modules: m.includes(key) ? m.filter((x) => x !== key) : [...m, key] });
  };

  const toggleStrArr = (field: StrArrField, key: string, minOne = false) => {
    if (!cfg) return;
    const cur: string[] = (cfg[field] as string[] | null) ?? [];
    if (minOne && cur.length === 1 && cur.includes(key)) return;
    const next = cur.includes(key) ? cur.filter((x) => x !== key) : [...cur, key];
    setCfg((prev) => prev ? { ...prev, [field]: next } as WizardCfg : prev);
  };

  const save = async () => {
    if (!cfg) return;
    setSaving(true);
    try {
      await updateWizardConfig(tenant.id, cfg);
      try { await generateCrm(tenant.id); } catch { /* silent — non-fatal */ }
      showToast('Saqlandi!');
    } catch {
      showToast('Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleTenantToggle = async () => {
    const next = !tenantActive;
    try {
      await api.patch(`/tenants/${tenant.id}`, { isActive: next });
      setTenantActive(next);
      onTenantStatusChange(tenant.id, next);
    } catch { /* silent */ }
  };

  const savePlan = async () => {
    setPlanSaving(true);
    try {
      await api.post(`/billing/${tenant.id}/plan`, { plan: newPlan, cycle: newCycle });
      setDrawerBilling(null);
      showToast("Tarif o'zgartirildi!");
    } catch {
      showToast('Xatolik yuz berdi');
    } finally {
      setPlanSaving(false);
    }
  };

  const handleAddEmp = async () => {
    setAddingEmp(true);
    try {
      const res = await api.post<EmployeeRow>('/employees', newEmp, { headers: { 'x-tenant-id': tenant.id } });
      setEmployees((prev) => [...prev, res.data]);
      setShowAddEmp(false);
      setNewEmp({ firstName: '', lastName: '', email: '', password: '', role: 'cashier' });
    } catch { /* show nothing */ }
    finally { setAddingEmp(false); }
  };

  const toggleEmpActive = async (emp: EmployeeRow) => {
    try {
      await patchEmployee(tenant.id, emp.id, { isActive: !emp.isActive });
      setEmployees((prev) => prev.map((e) => e.id === emp.id ? { ...e, isActive: !e.isActive } : e));
    } catch { /* silent */ }
  };

  const primary = cfg?.theme?.primaryColor ?? '#6366f1';

  return (
    <>
      <div className="cfg-drawer-overlay" onClick={onClose} />
      <div className="cfg-drawer">

        {/* Header */}
        <div className="cfg-drawer-header">
          <div>
            <div className="cfg-drawer-title">{tenant.name}</div>
            <div className="cfg-drawer-subtitle">CRM Sozlamalari</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className="s-copy-btn"
              title="CRM wizard havolasini nusxalash"
              onClick={() => {
                const url = `http://localhost:4300/wizard/${tenant.id}`;
                navigator.clipboard.writeText(url).catch(() => {});
              }}
            >
              Havola
            </button>
            <button className="td-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="cfg-tabs">
          {([
            { key: 'general',   icon: <Settings2 size={15} />,    label: 'Umumiy'    },
            { key: 'modules',   icon: <LayoutGrid size={15} />,   label: 'Modullar'  },
            { key: 'theme',     icon: <Palette size={15} />,      label: "Ko'rinish" },
            { key: 'pos',       icon: <ShoppingCart size={15} />, label: 'POS'       },
            { key: 'receipt',   icon: <Receipt size={15} />,      label: 'Chek'      },
            { key: 'employees', icon: <Users size={15} />,        label: 'Xodimlar'  },
            { key: 'stats',     icon: <BarChart2 size={15} />,    label: 'Statistika'},
            { key: 'billing',   icon: <CreditCard size={15} />,   label: 'Billing'   },
          ] as const).map((t) => (
            <button
              key={t.key}
              className={`cfg-tab${tab === t.key ? ' cfg-tab--active' : ''}`}
              onClick={() => setTab(t.key)}
              title={t.label}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>{t.icon}{t.label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="cfg-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Yuklanmoqda...
            </div>
          ) : !cfg ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Bu tenant uchun wizard config topilmadi.
              </p>
              <button className="btn-secondary" onClick={() => {
                const url = `http://localhost:4300/wizard/${tenant.id}`;
                navigator.clipboard.writeText(url).catch(() => {});
                showToast('Wizard havolasi nusxalandi');
              }}>
                Wizard havolasini nusxalash
              </button>
            </div>
          ) : (
            <>
              {/* ── TAB: UMUMIY ── */}
              {tab === 'general' && (
                <div className="s-section">
                  <div className="s-section-title">Kompaniya</div>

                  <div className="s-row">
                    <div className="s-row-label">Kompaniya nomi</div>
                    <div className="s-row-ctrl">
                      <input type="text"
                        value={cfg.companyName ?? ''}
                        onChange={(e) => patch({ companyName: e.target.value || null })}
                        placeholder={tenant.name} />
                    </div>
                  </div>

                  <div className="s-row">
                    <div className="s-row-label">Soha</div>
                    <div className="s-row-ctrl">
                      <select value={cfg.industry} onChange={(e) => patch({ industry: e.target.value })}>
                        {INDUSTRIES_CFG.map((i) => (
                          <option key={i.value} value={i.value}>{i.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="s-row">
                    <div className="s-row-label">Til</div>
                    <div className="s-row-ctrl">
                      <div className="s-seg">
                        {([['uz', "O'zbek"], ['ru', 'Рус'], ['en', 'Eng']] as [string, string][]).map(([v, l]) => (
                          <button key={v} className={`s-seg-btn${cfg.language === v ? ' s-seg-btn--active' : ''}`}
                            onClick={() => patch({ language: v })}>{l}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="s-row">
                    <div className="s-row-label">Valyuta</div>
                    <div className="s-row-ctrl">
                      <div className="s-seg">
                        {([['uzs', 'UZS'], ['usd', 'USD'], ['rub', 'RUB']] as [string, string][]).map(([v, l]) => (
                          <button key={v} className={`s-seg-btn${cfg.currency === v ? ' s-seg-btn--active' : ''}`}
                            onClick={() => patch({ currency: v })}>{l}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="s-row">
                    <div className="s-row-label">Ish vaqti</div>
                    <div className="s-row-ctrl" style={{ gap: '0.4rem' }}>
                      <input type="time" style={{ maxWidth: 88 }}
                        value={cfg.workingHoursStart ?? '09:00'}
                        onChange={(e) => patch({ workingHoursStart: e.target.value })} />
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                      <input type="time" style={{ maxWidth: 88 }}
                        value={cfg.workingHoursEnd ?? '18:00'}
                        onChange={(e) => patch({ workingHoursEnd: e.target.value })} />
                    </div>
                  </div>

                  <div className="s-row" style={{ alignItems: 'flex-start', paddingTop: '0.8rem' }}>
                    <div className="s-row-label">Ish kunlari</div>
                    <div className="s-row-ctrl">
                      <div className="s-pills">
                        {WORK_DAYS_CFG.map(({ k, l }) => (
                          <button key={k}
                            className={`s-pill${(cfg.workingDays ?? []).includes(k) ? ' s-pill--on' : ''}`}
                            onClick={() => toggleStrArr('workingDays', k)}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="s-section-title" style={{ marginTop: '0.5rem' }}>Tenant holati</div>
                  <div className="s-row" style={{ borderBottom: 'none' }}>
                    <div className="s-row-label">
                      {tenantActive ? 'Faol' : 'Nofaol'}
                      <small>{tenantActive ? 'CRM ishlayapti' : "CRM to'xtatilgan"}</small>
                    </div>
                    <div className="s-row-ctrl">
                      <label className="s-switch">
                        <input type="checkbox" checked={tenantActive} onChange={handleTenantToggle} />
                        <span className="s-switch-knob" />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB: MODULLAR ── */}
              {tab === 'modules' && (
                <div>
                  <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className="btn-secondary" style={{ fontSize: '0.82rem' }}
                      onClick={() => patch({ modules: [...(CFG_INDUSTRY_MODULES[cfg.industry] ?? [])] })}>
                      Tavsiya etilgan modullarni tanlash
                    </button>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                      {cfg.modules.length} ta tanlangan
                    </span>
                  </div>
                  <div className="cfg-module-grid">
                    {Object.entries(CFG_MODULES).map(([key, mod]) => {
                      const on = cfg.modules.includes(key);
                      return (
                        <div key={key}
                          className={`cfg-module-card${on ? ' cfg-module-card--on' : ''}`}
                          onClick={() => toggleModule(key)}>
                          <span>{mod.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── TAB: KO'RINISH ── */}
              {tab === 'theme' && (
                <div>
                  <div className="cfg-section-title">Asosiy rang</div>
                  <div className="cfg-color-row">
                    {CFG_COLORS.map((c) => (
                      <button key={c}
                        className={`cfg-color-dot${primary === c ? ' cfg-color-dot--active' : ''}`}
                        style={{ background: c }}
                        onClick={() => patchTheme({ primaryColor: c })} />
                    ))}
                    <input
                      type="color"
                      style={{ width: 28, height: 28, border: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%', overflow: 'hidden', background: 'transparent' }}
                      value={primary}
                      onChange={(e) => patchTheme({ primaryColor: e.target.value })}
                    />
                    <input type="text" style={{ flex: 1, maxWidth: 88, fontSize: '0.78rem', padding: '0.22rem 0.45rem', border: '1.5px solid var(--border)', borderRadius: 7, background: 'var(--bg)', color: 'var(--text)' }}
                      placeholder="#6366f1"
                      value={primary}
                      onChange={(e) => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) patchTheme({ primaryColor: e.target.value }); }} />
                  </div>

                  <div className="s-row" style={{ marginTop: '0.75rem' }}>
                    <div className="s-row-label">Uslub</div>
                    <div className="s-row-ctrl">
                      <div className="s-seg">
                        {([['modern', 'Zamonaviy'], ['classic', 'Klassik'], ['minimal', 'Minimal']] as [string, string][]).map(([v, l]) => (
                          <button key={v} className={`s-seg-btn${cfg.theme?.style === v ? ' s-seg-btn--active' : ''}`}
                            onClick={() => patchTheme({ style: v })}>{l}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="cfg-section-title">Ko'rinish preview</div>
                  <div className="cfg-mini-preview">
                    <div className="cfg-mini-preview-bar" style={{ background: primary }}>
                      {cfg.companyName ?? tenant.name}
                    </div>
                    <div className="cfg-mini-preview-body">
                      <div className="cfg-mini-preview-nav" style={{ background: primary }}>
                        {['Dashboard', 'Sotuv', 'Mijozlar'].map((item, i) => (
                          <div key={item} className="cfg-mini-preview-item"
                            style={{
                              color: i === 0 ? '#fff' : 'rgba(255,255,255,0.6)',
                              fontWeight: i === 0 ? 700 : 400,
                              background: i === 0 ? 'rgba(255,255,255,0.18)' : 'transparent',
                            }}>
                            {item}
                          </div>
                        ))}
                      </div>
                      <div className="cfg-mini-preview-content">
                        {[['Daromad', '1,240,000'], ['Sotuvlar', '24']].map(([lbl, val]) => (
                          <div key={lbl} className="cfg-mini-preview-card"
                            style={{ borderTop: `2px solid ${primary}` }}>
                            <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>{lbl}</div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 700 }}>{val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB: POS ── */}
              {tab === 'pos' && (
                <div className="s-section">
                  <div className="s-section-title">Ko'rinish</div>

                  <div className="s-row">
                    <div className="s-row-label">Kartochka uslubi</div>
                    <div className="s-row-ctrl">
                      <div className="s-seg">
                        {([
                          ['grid_photo_large', 'Katta'],
                          ['grid_photo_small', 'Kichik'],
                          ['grid_no_photo',    'Fotosiz'],
                          ['list',             "Ro'yxat"],
                        ] as [string, string][]).map(([v, l]) => (
                          <button key={v} className={`s-seg-btn${cfg.posCardStyle === v ? ' s-seg-btn--active' : ''}`}
                            onClick={() => patch({ posCardStyle: v })}>{l}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="s-section-title">Funksiyalar</div>

                  {([
                    { f: 'posShowCategories' as const, l: 'Kategoriya filtri',      d: "Tovarlarni kategoriya bo'yicha filtrlash" },
                    { f: 'posBarcode'        as const, l: 'Barcode / QR skaner',    d: 'Shtrix-kod va QR bilan mahsulot tanlash' },
                    { f: 'posDiscount'       as const, l: 'Chegirma kiritish',      d: "Sotuvda chegirma qo'shish imkoni" },
                    { f: 'posMarkupAllowed'  as const, l: 'Narxni oshirish',        d: 'Mahsulot narxini oshirib sotish' },
                  ]).map(({ f, l, d }) => (
                    <div key={f} className="s-row">
                      <div className="s-row-label">
                        {l}
                        <small>{d}</small>
                      </div>
                      <div className="s-row-ctrl">
                        <label className="s-switch">
                          <input type="checkbox" checked={cfg[f]}
                            onChange={(e) => { const p: Partial<WizardCfg> = {}; p[f] = e.target.checked; patch(p); }} />
                          <span className="s-switch-knob" />
                        </label>
                      </div>
                    </div>
                  ))}

                  <div className="s-section-title">Mijoz biriktirish</div>
                  <div className="s-row">
                    <div className="s-row-label">Mijozni tanlash</div>
                    <div className="s-row-ctrl">
                      <div className="s-seg">
                        {([['always', 'Har doim'], ['credit_only', 'Nasiyada'], ['optional', 'Ixtiyoriy']] as [string, string][]).map(([v, l]) => (
                          <button key={v} className={`s-seg-btn${cfg.posCustomerRequired === v ? ' s-seg-btn--active' : ''}`}
                            onClick={() => patch({ posCustomerRequired: v })}>{l}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="s-section-title">To'lov va valyuta</div>
                  <div className="s-row" style={{ alignItems: 'flex-start', paddingTop: '0.8rem' }}>
                    <div className="s-row-label">To'lov usullari</div>
                    <div className="s-row-ctrl">
                      <div className="s-pills">
                        {([['cash', 'Naqd'], ['card', 'Karta'], ['transfer', "O'tkazma"], ['credit', 'Nasiya'], ['partial', 'Qisman']] as [string, string][]).map(([v, l]) => {
                          const arr = cfg.posPaymentMethods ?? [];
                          return (
                            <button key={v} className={`s-pill${arr.includes(v) ? ' s-pill--on' : ''}`}
                              onClick={() => toggleStrArr('posPaymentMethods', v, true)}>{l}</button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="s-row">
                    <div className="s-row-label">Valyutalar</div>
                    <div className="s-row-ctrl">
                      <div className="s-pills">
                        {([['uzs', 'UZS'], ['usd', 'USD'], ['rub', 'RUB']] as [string, string][]).map(([v, l]) => {
                          const arr = cfg.posCurrencies ?? [];
                          return (
                            <button key={v} className={`s-pill${arr.includes(v) ? ' s-pill--on' : ''}`}
                              onClick={() => toggleStrArr('posCurrencies', v, true)}>{l}</button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB: CHEK ── */}
              {tab === 'receipt' && (
                <div className="s-section">
                  <div className="s-section-title">Chek o'lchami</div>

                  <div className="s-row">
                    <div className="s-row-label">O'lcham</div>
                    <div className="s-row-ctrl">
                      <div className="s-seg">
                        {([['58mm', '58 mm'], ['80mm', '80 mm'], ['a4', 'A4']] as [string, string][]).map(([v, l]) => (
                          <button key={v} className={`s-seg-btn${cfg.receiptSize === v ? ' s-seg-btn--active' : ''}`}
                            onClick={() => patch({ receiptSize: v })}>{l}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="s-section-title">Chekda ko'rsatish</div>

                  {([
                    { f: 'receiptShowLogo'    as const, l: 'Logo' },
                    { f: 'receiptShowPhone'   as const, l: 'Telefon raqami' },
                    { f: 'receiptShowAddress' as const, l: 'Manzil' },
                    { f: 'receiptShowQr'      as const, l: 'QR kod' },
                  ]).map(({ f, l }) => (
                    <div key={f} className="s-row">
                      <div className="s-row-label">{l}</div>
                      <div className="s-row-ctrl">
                        <label className="s-switch">
                          <input type="checkbox" checked={cfg[f]}
                            onChange={(e) => { const p: Partial<WizardCfg> = {}; p[f] = e.target.checked; patch(p); }} />
                          <span className="s-switch-knob" />
                        </label>
                      </div>
                    </div>
                  ))}

                  <div className="s-row" style={{ alignItems: 'flex-start', paddingTop: '0.8rem' }}>
                    <div className="s-row-label">Pastki matn</div>
                    <div className="s-row-ctrl">
                      <textarea
                        rows={2}
                        style={{ maxWidth: '100%', fontSize: '0.82rem' }}
                        value={cfg.receiptFooter ?? ''}
                        onChange={(e) => patch({ receiptFooter: e.target.value || null })}
                        placeholder="Xaridingiz uchun rahmat!" />
                    </div>
                  </div>

                  <div className="s-section-title">Chegirma va eksport</div>

                  <div className="s-row">
                    <div className="s-row-label">Chegirma logikasi</div>
                    <div className="s-row-ctrl">
                      <div className="s-seg">
                        {([['classic', 'Klassik'], ['markup', 'Ustama'], ['mixed', 'Aralash']] as [string, string][]).map(([v, l]) => (
                          <button key={v} className={`s-seg-btn${cfg.discountMode === v ? ' s-seg-btn--active' : ''}`}
                            onClick={() => patch({ discountMode: v })}>{l}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="s-row" style={{ borderBottom: 'none' }}>
                    <div className="s-row-label">Eksport formatlari</div>
                    <div className="s-row-ctrl">
                      <div className="s-pills">
                        {([['excel', 'Excel'], ['pdf', 'PDF']] as [string, string][]).map(([v, l]) => {
                          const arr = cfg.exportFormats ?? [];
                          return (
                            <button key={v} className={`s-pill${arr.includes(v) ? ' s-pill--on' : ''}`}
                              onClick={() => toggleStrArr('exportFormats', v)}>{l}</button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB: STATISTIKA ── */}
              {tab === 'stats' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {statLoading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Yuklanmoqda...</div>
                  ) : !drawerDetail ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Ma'lumot topilmadi
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                        {[
                          { icon: <ShoppingBag size={16} />, val: `${fmt(drawerDetail.stats.totalRevenue)} so'm`, label: 'Jami tushum',   color: '#6366f1' },
                          { icon: <Package size={16} />,     val: `${drawerDetail.stats.totalSales} ta`,          label: 'Jami sotuvlar', color: '#10b981' },
                          { icon: <UserCheck size={16} />,   val: `${drawerDetail.stats.totalCustomers} ta`,      label: 'Mijozlar',      color: '#f59e0b' },
                          { icon: <Users size={16} />,       val: `${drawerDetail.stats.totalEmployees ?? 0} ta`, label: 'Xodimlar',      color: '#8b5cf6' },
                        ].map(({ icon, val, label, color }) => (
                          <div key={label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '0.75rem' }}>
                            <div style={{ color, marginBottom: '0.2rem' }}>{icon}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
                            <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>{val}</div>
                          </div>
                        ))}
                      </div>
                      <div className="s-section" style={{ marginTop: 0 }}>
                        <div className="tenant-info-row">
                          <span>Oylik tushum</span>
                          <span style={{ fontWeight: 600 }}>{fmt(drawerDetail.stats.monthlyRevenue)} so'm</span>
                        </div>
                        <div className="tenant-info-row">
                          <span>O'rtacha chek</span>
                          <span style={{ fontWeight: 600 }}>{fmt(drawerDetail.stats.avgOrderValue)} so'm</span>
                        </div>
                        <div className="tenant-info-row">
                          <span>Oxirgi faollik</span>
                          <span style={{ fontWeight: 600 }}>{timeAgo(drawerDetail.stats.lastActivity)}</span>
                        </div>
                        <div className="tenant-info-row" style={{ borderBottom: 'none' }}>
                          <span>Mahsulotlar</span>
                          <span style={{ fontWeight: 600 }}>{drawerDetail.stats.totalProducts} ta</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── TAB: BILLING ── */}
              {tab === 'billing' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {billLoad ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Yuklanmoqda...</div>
                  ) : !drawerBilling ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Billing ma'lumoti topilmadi
                    </div>
                  ) : (
                    <>
                      <div className="s-section" style={{ marginTop: 0 }}>
                        <div className="s-section-title">Joriy obuna</div>
                        <div className="tenant-info-row">
                          <span>Tarif</span>
                          <span style={{
                            fontWeight: 700, textTransform: 'capitalize',
                            color: drawerBilling.plan === 'pro' ? '#7c3aed' : drawerBilling.plan === 'starter' ? '#2563eb' : 'var(--text)',
                          }}>
                            {drawerBilling.plan}
                          </span>
                        </div>
                        <div className="tenant-info-row">
                          <span>Holat</span>
                          <span style={{ fontWeight: 600 }}>{drawerBilling.status}</span>
                        </div>
                        <div className="tenant-info-row">
                          <span>To'lov sikli</span>
                          <span style={{ fontWeight: 600 }}>{drawerBilling.billingCycle === 'yearly' ? 'Yillik' : 'Oylik'}</span>
                        </div>
                        {drawerBilling.trialEndsAt && (
                          <div className="tenant-info-row" style={{ borderBottom: 'none' }}>
                            <span>Sinov tugashi</span>
                            <span style={{ fontWeight: 600 }}>{new Date(drawerBilling.trialEndsAt).toLocaleDateString('uz-UZ')}</span>
                          </div>
                        )}
                      </div>
                      <div className="s-section" style={{ marginTop: 0 }}>
                        <div className="s-section-title">Tarif o'zgartirish</div>
                        <div className="s-row">
                          <div className="s-row-label">Yangi tarif</div>
                          <div className="s-row-ctrl">
                            <select value={newPlan} onChange={(e) => setNewPlan(e.target.value)}>
                              <option value="trial">Trial (sinov)</option>
                              <option value="starter">Starter — 99 000 so'm/oy</option>
                              <option value="pro">Pro — 299 000 so'm/oy</option>
                            </select>
                          </div>
                        </div>
                        <div className="s-row" style={{ borderBottom: 'none' }}>
                          <div className="s-row-label">To'lov sikli</div>
                          <div className="s-row-ctrl">
                            <div className="s-seg">
                              {(['monthly', 'yearly'] as const).map((v) => (
                                <button key={v} className={`s-seg-btn${newCycle === v ? ' s-seg-btn--active' : ''}`}
                                  onClick={() => setNewCycle(v)}>
                                  {v === 'monthly' ? 'Oylik' : 'Yillik'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div style={{ padding: '0.75rem 0 0' }}>
                          <button className="btn-primary" style={{ fontSize: '0.85rem' }}
                            disabled={planSaving || newPlan === drawerBilling.plan}
                            onClick={savePlan}>
                            {planSaving ? 'Saqlanmoqda...' : 'Tarifni saqlash'}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── TAB: XODIMLAR ── */}
              {tab === 'employees' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {employees.length} ta xodim
                    </span>
                    <button className="btn-secondary" style={{ fontSize: '0.82rem' }}
                      onClick={() => setShowAddEmp((v) => !v)}>
                      {showAddEmp ? '✕ Yopish' : '+ Yangi xodim'}
                    </button>
                  </div>

                  {showAddEmp && (
                    <div className="cfg-add-form">
                      <div className="cfg-form-2col">
                        <div>
                          <label className="wz-label">Ism *</label>
                          <input className="wz-input" value={newEmp.firstName}
                            onChange={(e) => setNewEmp((p) => ({ ...p, firstName: e.target.value }))} />
                        </div>
                        <div>
                          <label className="wz-label">Familiya *</label>
                          <input className="wz-input" value={newEmp.lastName}
                            onChange={(e) => setNewEmp((p) => ({ ...p, lastName: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <label className="wz-label">Email *</label>
                        <input className="wz-input" type="email" value={newEmp.email}
                          onChange={(e) => setNewEmp((p) => ({ ...p, email: e.target.value }))} />
                      </div>
                      <div className="cfg-form-2col">
                        <div>
                          <label className="wz-label">Parol * (min 6)</label>
                          <input className="wz-input" type="password" value={newEmp.password}
                            onChange={(e) => setNewEmp((p) => ({ ...p, password: e.target.value }))} />
                        </div>
                        <div>
                          <label className="wz-label">Rol</label>
                          <select className="wz-input" value={newEmp.role}
                            onChange={(e) => setNewEmp((p) => ({ ...p, role: e.target.value }))}>
                            {['admin', 'manager', 'cashier', 'warehouse'].map((r) => (
                              <option key={r} value={r}>{ROLE_META[r]?.label ?? r}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button className="btn-primary" style={{ fontSize: '0.85rem', alignSelf: 'flex-start' }}
                        disabled={addingEmp || !newEmp.firstName || !newEmp.email || newEmp.password.length < 6}
                        onClick={handleAddEmp}>
                        {addingEmp ? "Qo'shilmoqda..." : "Qo'shish"}
                      </button>
                    </div>
                  )}

                  {empLoading ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>Yuklanmoqda...</div>
                  ) : employees.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Xodimlar topilmadi
                    </div>
                  ) : (
                    <table className="cfg-emp-table">
                      <thead>
                        <tr>
                          <th>Ism Familiya</th>
                          <th>Email</th>
                          <th>Rol</th>
                          <th>Holat</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((emp) => (
                          <tr key={emp.id}>
                            <td style={{ fontWeight: 500 }}>{emp.firstName} {emp.lastName}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{emp.email}</td>
                            <td>
                              <span className="role-tag">{ROLE_META[emp.role]?.label ?? emp.role}</span>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.8rem', color: emp.isActive ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                                {emp.isActive ? '● Faol' : '● Bloklangan'}
                              </span>
                            </td>
                            <td>
                              <button className="action-btn" style={{ fontSize: '0.78rem' }}
                                onClick={() => toggleEmpActive(emp)}>
                                {emp.isActive ? 'Bloklash' : 'Faollashtirish'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Save bar */}
        {cfg && tab !== 'stats' && tab !== 'billing' && (
          <div className="cfg-save-bar">
            <button className="btn-secondary" onClick={onClose}>Bekor qilish</button>
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        )}

        {/* Toast */}
        {toast && <div className="cfg-toast">{toast}</div>}
      </div>
    </>
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
  const [billingResult,    setBillingResult]    = useState<{ plan: string; tenantName: string } | null>(null);
  const [editingTenantId,  setEditingTenantId]  = useState<string | null>(null);
  const [detailTenant] = useState<TenantDetail | null>(null);
  const [showDetail,       setShowDetail]       = useState(false);
  const [detailLoading,    setDetailLoading]    = useState(false);
  const [deleteTarget,     setDeleteTarget]     = useState<Tenant | null>(null);
  const [deleting,         setDeleting]         = useState(false);
  const [configTenant,     setConfigTenant]     = useState<Tenant | null>(null);
  const [configInitialTab, setConfigInitialTab] = useState<CfgTabKey>('general');
  const [menuState,        setMenuState]        = useState<{ tenantId: string; top: number; right: number } | null>(null);
  const [freezeTarget,     setFreezeTarget]     = useState<Tenant | null>(null);
  const [freezeDays,       setFreezeDays]       = useState(30);
  const [freezing,         setFreezing]         = useState(false);
  const [modPreviewKey,    setModPreviewKey]    = useState<string | null>(null);
  const [impersonatingId,  setImpersonatingId]  = useState<string | null>(null);
  const [impersonateFrame, setImpersonateFrame] = useState<{ url: string; name: string } | null>(null);
  const [moduleConfigs,    setModuleConfigs]    = useState<Record<string, Record<string, boolean>>>(() => {
    const init: Record<string, Record<string, boolean>> = {};
    ADMIN_RETAIL_MODULES.forEach(m => {
      init[m.key] = {};
      m.config.forEach(c => { init[m.key][c.key] = c.defaultOn; });
    });
    return init;
  });

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

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'crm_exit') setImpersonateFrame(null);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const openWizard  = () => {
    setEditingTenantId(null);
    setData(freshData());
    setStep(WIZARD_ORDER[0]);
    setFormError('');
    setShowWizard(true);
  };
  const closeWizard = () => {
    setShowWizard(false);
    setEditingTenantId(null);
  };

  const handleQuickImpersonate = async (t: Tenant) => {
    if (impersonatingId) return;
    setImpersonatingId(t.id);
    try {
      const result = await impersonateTenant(t.id);
      const crmBase = (import.meta as unknown as { env: Record<string, string> }).env['VITE_CRM_URL'] ?? 'http://localhost:4300';
      setImpersonateFrame({ url: `${crmBase}/impersonate?token=${encodeURIComponent(result.token)}`, name: t.name });
    } catch {
      setError("CRM ochishda xatolik yuz berdi");
      setTimeout(() => setError(''), 4000);
    } finally {
      setImpersonatingId(null);
    }
  };

  const handleFreeze = async (unfreeze = false) => {
    if (!freezeTarget) return;
    setFreezing(true);
    try {
      if (unfreeze) {
        await unfreezeTenant(freezeTarget.id);
      } else {
        await freezeTenant(freezeTarget.id, freezeDays);
      }
      setFreezeTarget(null);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Xatolik yuz berdi');
      setTimeout(() => setError(''), 4000);
    } finally {
      setFreezing(false);
    }
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
        posCardStyle:      wc.posCardStyle ?? 'grid_photo_large',
        customerLevels:    (wc as { customerLevels?: CustomerLevelCfg[] }).customerLevels ?? DEFAULT_CUSTOMER_LEVELS,
        billingPlan:       (wc as { billingPlan?: 'free' | 'starter' | 'pro' }).billingPlan ?? 'free',
        billingCycle:      (wc as { billingCycle?: 'monthly' | 'yearly' }).billingCycle ?? 'monthly',
      } : freshData());
      setShowDetail(false);
      setEditingTenantId(id);
      setStep(WIZARD_ORDER[0]);
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
    const defaultWidgets = (INDUSTRY_DASHBOARD_WIDGETS[industry] ?? INDUSTRY_DASHBOARD_WIDGETS['retail'] ?? [])
      .filter(w => w.defaultOn).map(w => w.key);
    setData((d) => ({ ...d, industry, modules: preset.modules, roles: preset.roles, customPermissions: {}, dashboardWidgets: defaultWidgets }));
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

  const setTheme   = (p: Partial<WizardTheme>)   => setData((d) => ({ ...d, theme:   { ...d.theme,   ...p } }));
  const setReceipt = (p: Partial<WizardReceipt>) => setData((d) => ({ ...d, receipt: { ...d.receipt, ...p } }));

  const [activeRcpTab,      setActiveRcpTab]      = useState('80mm');
  const [activeRcpTabModal, setActiveRcpTabModal] = useState('80mm');

  const setSizeCfg = (size: string, p: Partial<WizardReceiptSizeCfg>) =>
    setData((d) => ({
      ...d,
      receipt: {
        ...d.receipt,
        sizeCfg: {
          ...d.receipt.sizeCfg,
          [size]: { ...(d.receipt.sizeCfg?.[size] ?? dfltSizeCfg()), ...p },
        },
      },
    }));

  const toggleReceiptSize = (size: string, on: boolean) => {
    setData((d) => {
      const sizes = on
        ? [...(d.receipt.sizes ?? []), size]
        : (d.receipt.sizes ?? []).filter((s) => s !== size);
      const defaultSize = sizes.includes(d.receipt.defaultSize ?? '80mm')
        ? d.receipt.defaultSize
        : sizes[0] ?? '80mm';
      const sizeCfg = { ...(d.receipt.sizeCfg ?? {}) };
      if (on && !sizeCfg[size]) sizeCfg[size] = dfltSizeCfg();
      return { ...d, receipt: { ...d.receipt, sizes, defaultSize, sizeCfg } };
    });
    if (on) setActiveRcpTab(size);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setFormError('');
    setSubmitting(true);
    const hasCustomPerms = Object.keys(data.customPermissions).length > 0;
    // Tarifga mos rollarni wizard configdan olish
    const industryRoles = INDUSTRY_PRESETS[data.industry]?.roles ?? ['admin', 'cashier'];
    const wizardPayload = {
      industry:     data.industry,
      modules:      data.modules,
      roles:        industryRoles,
      theme:        data.theme,
      dashboard:    { widgets: data.dashboardWidgets },
      receipt:      data.receipt,
      posCardStyle:    data.posCardStyle,
      customerLevels:  data.customerLevels,
      billingPlan:     data.billingPlan,
      billingCycle:    data.billingCycle,
      moduleConfigs,
      ...(hasCustomPerms && { permissions: data.customPermissions }),
    };
    try {
      if (editingTenantId) {
        await api.patch(`/tenants/${editingTenantId}`, { name: data.theme.shopName });
        await api.patch(`/wizard/${editingTenantId}`, wizardPayload);
        // Agar tarif o'zgartirilsa — pending so'rov yuborish
        if (data.billingPlan !== 'free') {
          await api.post(`/billing/${editingTenantId}/plan`, {
            plan:  data.billingPlan,
            cycle: data.billingCycle,
          });
        }
      } else {
        const { data: tenant } = await api.post<Tenant>('/tenants', {
          name:    data.theme.shopName,
          ownerId: user.id,
        });
        await api.post('/wizard/configure', { tenantId: tenant.id, ...wizardPayload });

        // Billing subscription yaratish
        // Free → Trial (getOrCreate avtomatik yaratadi)
        // Starter/Pro → Trial + pending change-plan so'rovi
        await api.get(`/billing/${tenant.id}`); // Trial subscription yaratadi
        if (data.billingPlan !== 'free') {
          await api.post(`/billing/${tenant.id}/plan`, {
            plan:  data.billingPlan,
            cycle: data.billingCycle,
          });
        }

        setBillingResult({
          plan: data.billingPlan,
          tenantName: data.theme.shopName,
        });
        closeWizard();
        fetchTenants();
        return;
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
                <th style={{ width: 44 }}></th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Hech qanday tenant topilmadi</td></tr>
              ) : tenants.map((t) => (
                <tr key={t.id}>
                  <td>
                    <button
                      className={`tenant-name-link${impersonatingId === t.id ? ' tenant-name-link--loading' : ''}`}
                      onClick={() => void handleQuickImpersonate(t)}
                      disabled={!!impersonatingId}
                      title="CRM ni ochish"
                    >
                      {impersonatingId === t.id
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span className="spinner spinner--sm" />{t.name}</span>
                        : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><LogIn size={13} />{t.name}</span>
                      }
                    </button>
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
                  <td style={{ width: 44, textAlign: 'right' }}>
                    <button
                      className="action-btn action-btn--icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setMenuState(menuState?.tenantId === t.id ? null : { tenantId: t.id, top: rect.bottom + 6, right: window.innerWidth - rect.right });
                      }}
                    >
                      <MoreVertical size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Billing natijasi modali */}
      {billingResult && (
        <div className="modal-overlay" onClick={() => setBillingResult(null)}>
          <div className="confirm-dialog" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>
              {billingResult.plan === 'free' ? '🎉' : '⏳'}
            </div>
            <h3 style={{ margin: '0 0 0.5rem' }}>
              {billingResult.plan === 'free' ? 'CRM muvaffaqiyatli yaratildi!' : "So'rov yuborildi!"}
            </h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <strong>{billingResult.tenantName}</strong>
            </p>
            {billingResult.plan === 'free' ? (
              <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: 'var(--text)' }}>
                14 kunlik sinov davri boshlandi. Billing sahifasida obunani boshqarishingiz mumkin.
              </p>
            ) : (
              <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '0.85rem 1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>So'ralgan tarif:</span>
                  <strong style={{ color: billingResult.plan === 'starter' ? '#2563eb' : '#7c3aed', textTransform: 'capitalize' }}>
                    {billingResult.plan}
                  </strong>
                </div>
                <div style={{ color: 'var(--text)', lineHeight: 1.6, fontSize: '0.82rem' }}>
                  CRM hozircha 14 kunlik <strong>Sinov</strong> rejimida ishlaydi.
                  <br />
                  Billing sahifasida <strong>Tasdiqlash</strong> bosilgach — to'liq tarif faollashadi.
                </div>
              </div>
            )}
            <div className="confirm-actions">
              <button className="btn-primary" onClick={() => setBillingResult(null)}>Tushunarli</button>
            </div>
          </div>
        </div>
      )}

      {showDetail && detailTenant && (
        <TenantDetailModal
          detail={detailTenant}
          onClose={() => setShowDetail(false)}
          onEdit={() => handleEdit(detailTenant.id)}
          onDelete={() => { setShowDetail(false); setDeleteTarget({ id: detailTenant.id, name: detailTenant.name, slug: detailTenant.slug, isActive: detailTenant.isActive, createdAt: detailTenant.createdAt }); }}
          onImpersonate={(url, name) => { setShowDetail(false); setImpersonateFrame({ url, name }); }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmDialogExtracted
          name={deleteTarget.name}
          deleting={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={executeDelete}
        />
      )}

      {/* Kebab menu overlay + dropdown */}
      {menuState && (() => {
        const t = tenants.find((x) => x.id === menuState.tenantId);
        if (!t) return null;
        return (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setMenuState(null)} />
            <div className="kbm" style={{ top: menuState.top, right: menuState.right }}>
              <div className="kbm-section">
                <button className="kbm-item" onClick={() => { setConfigInitialTab('general'); setConfigTenant(t); setMenuState(null); }}>
                  <span className="kbm-icon"><Settings2 size={15} /></span>
                  <span>
                    <span className="kbm-label">Sozlamalar</span>
                    <span className="kbm-desc">CRM konfiguratsiyasi</span>
                  </span>
                </button>
                <button className="kbm-item" onClick={() => { setConfigInitialTab('stats'); setConfigTenant(t); setMenuState(null); }}>
                  <span className="kbm-icon"><BarChart2 size={15} /></span>
                  <span>
                    <span className="kbm-label">Statistika</span>
                    <span className="kbm-desc">Tushum, sotuvlar, mijozlar</span>
                  </span>
                </button>
                <button className="kbm-item" onClick={() => { setConfigInitialTab('billing'); setConfigTenant(t); setMenuState(null); }}>
                  <span className="kbm-icon"><CreditCard size={15} /></span>
                  <span>
                    <span className="kbm-label">Billing</span>
                    <span className="kbm-desc">Tarif va to'lovlar</span>
                  </span>
                </button>
              </div>
              <div className="kbm-divider" />
              <div className="kbm-section">
                <button className="kbm-item" onClick={() => { toggleStatus(t); setMenuState(null); }}>
                  <span className="kbm-icon" style={{ color: t.isActive ? '#f59e0b' : '#10b981' }}>
                    {t.isActive ? <Clock size={15} /> : <CheckCircle2 size={15} />}
                  </span>
                  <span>
                    <span className="kbm-label">{t.isActive ? "To'xtatish" : 'Faollashtirish'}</span>
                    <span className="kbm-desc">{t.isActive ? "CRM vaqtincha to'xtatiladi" : 'CRM qayta ishga tushiriladi'}</span>
                  </span>
                </button>
                <button className="kbm-item" onClick={() => { setFreezeTarget(t); setMenuState(null); }}>
                  <span className="kbm-icon" style={{ color: '#6366f1' }}><Layers size={15} /></span>
                  <span>
                    <span className="kbm-label">Muzlatish</span>
                    <span className="kbm-desc">Obuna muddatini to'xtatib qo'yish</span>
                  </span>
                </button>
              </div>
              <div className="kbm-divider" />
              <div className="kbm-section">
                <button className="kbm-item kbm-item--danger" onClick={() => { setDeleteTarget(t); setMenuState(null); }}>
                  <span className="kbm-icon"><Trash2 size={15} /></span>
                  <span>
                    <span className="kbm-label">O'chirish</span>
                    <span className="kbm-desc">Tenant va barcha ma'lumotlar</span>
                  </span>
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* Freeze modal */}
      {freezeTarget && (
        <div className="modal-overlay" onClick={() => setFreezeTarget(null)}>
          <div className="freeze-modal" onClick={(e) => e.stopPropagation()}>
            <div className="freeze-modal-header">
              <div>
                <div className="freeze-modal-title">Obunani muzlatish</div>
                <div className="freeze-modal-sub">{freezeTarget.name}</div>
              </div>
              <button className="td-close" onClick={() => setFreezeTarget(null)}>✕</button>
            </div>
            <div className="freeze-modal-body">
              <div className="freeze-info-box">
                <div className="freeze-info-row"><Layers size={14} /> Muzlatish paytida obuna to'xtatiladi</div>
                <div className="freeze-info-row"><Clock size={14} /> Muzlatish tugagach, qolgan kunlar davom etadi</div>
                <div className="freeze-info-row"><CheckCircle2 size={14} /> Period oxiri muzlatish kunlari bilan uzaytiriladi</div>
              </div>
              <div className="s-row" style={{ marginTop: '1rem' }}>
                <div className="s-row-label">Muzlatish muddati</div>
                <div className="s-row-ctrl" style={{ gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="number" min={1} max={365}
                    value={freezeDays}
                    onChange={(e) => setFreezeDays(Math.max(1, Math.min(365, Number(e.target.value))))}
                    style={{ width: 80, textAlign: 'center' }}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>kun</span>
                </div>
              </div>
              <div className="freeze-days-quick">
                {[7, 14, 30, 60, 90].map((d) => (
                  <button key={d} className={`s-pill${freezeDays === d ? ' s-pill--on' : ''}`} onClick={() => setFreezeDays(d)}>
                    {d} kun
                  </button>
                ))}
              </div>
            </div>
            <div className="freeze-modal-footer">
              <button className="btn-secondary" onClick={() => setFreezeTarget(null)}>Bekor qilish</button>
              <button className="btn-primary" disabled={freezing} onClick={() => handleFreeze(false)}>
                {freezing ? 'Muzlatilmoqda...' : `${freezeDays} kunga muzlatish`}
              </button>
            </div>
          </div>
        </div>
      )}

      {configTenant && (
        <ConfigDrawer
          tenant={configTenant}
          initialTab={configInitialTab}
          onClose={() => { setConfigTenant(null); setConfigInitialTab('general'); }}
          onTenantStatusChange={(id, active) =>
            setTenants((ts) => ts.map((t) => t.id === id ? { ...t, isActive: active } : t))
          }
        />
      )}

      {showWizard && modPreviewKey && (
        <ModuleFeatureModal
          modKey={modPreviewKey}
          configs={moduleConfigs[modPreviewKey] ?? {}}
          onToggle={(feat, val) => {
            const def = MODULE_FEATURES[modPreviewKey];
            const next: Record<string, boolean> = { ...(moduleConfigs[modPreviewKey] ?? {}), [feat]: val };
            if (val && def) {
              const featDef = def.features.find(f => f.key === feat);
              if (featDef?.tier === 'pro') {
                def.features.forEach(f => { if (f.tier === 'starter' || f.tier === 'free') next[f.key] = true; });
              } else if (featDef?.tier === 'starter') {
                def.features.forEach(f => { if (f.tier === 'free') next[f.key] = true; });
              }
            }
            setModuleConfigs(prev => ({ ...prev, [modPreviewKey]: next }));
          }}
          primary={data.theme.primaryColor || '#6366f1'}
          onClose={() => setModPreviewKey(null)}
          receipt={data.receipt}
          setReceiptProp={setReceipt}
          onToggleReceiptSize={toggleReceiptSize}
          onSetSizeCfg={setSizeCfg}
          rcpTab={activeRcpTabModal}
          setRcpTab={setActiveRcpTabModal}
          theme={data.theme}
          posCardStyle={data.posCardStyle}
          setPosCardStyle={(s) => setData(d => ({ ...d, posCardStyle: s }))}
          customerLevels={data.customerLevels}
          setCustomerLevels={(levels) => setData(d => ({ ...d, customerLevels: levels }))}
        />
      )}

      {showWizard && (
        <div className="wz-overlay">
          <WizardSidebar step={step} onGoTo={setStep} />

          <div className="wz-content">
            <div className="wz-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                {WIZARD_ORDER.indexOf(step) > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep(WIZARD_ORDER[WIZARD_ORDER.indexOf(step) - 1])}
                    style={{
                      background: 'none', border: '1px solid var(--border)',
                      borderRadius: 8, cursor: 'pointer', color: 'var(--text-muted)',
                      padding: '0.3rem', display: 'flex', alignItems: 'center',
                      marginTop: '0.2rem', flexShrink: 0,
                      transition: 'color 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-muted)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                    }}
                    title="Orqaga"
                  >
                    <ArrowLeft size={16} />
                  </button>
                )}
                <div>
                  <h2>{STEP_LABELS[step - 1]}</h2>
                  <p>{STEP_DESCS[step - 1]}</p>
                </div>
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
                <div className="wz-grid-3">
                  {INDUSTRIES_VISUAL.map((ind) => {
                    const Icon = ind.icon;
                    return (
                      <div
                        key={ind.value}
                        className={`wz-card${data.industry === ind.value ? ' wz-card--active' : ''}`}
                        onClick={() => changeIndustry(ind.value)}
                      >
                        {data.industry === ind.value && <div className="wz-card-check"><Check size={13} /></div>}
                        <div className="wz-card-icon"><Icon size={26} /></div>
                        <div className="wz-card-title">{ind.label}</div>
                        <div className="wz-card-desc">{ind.desc}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Step 2 — Dashboard */}
              {step === 2 && (() => {
                const primary   = data.theme.primaryColor || '#6366f1';
                const industry  = data.industry;
                const widgets   = INDUSTRY_DASHBOARD_WIDGETS[industry] ?? INDUSTRY_DASHBOARD_WIDGETS['retail'] ?? [];

                const wideKeys = new Set(widgets.filter(w => w.wide).map(w => w.key));

                // Returns a compact visual preview for each widget key
                const miniPreview = (key: string) => {
                  const accent = (color: string, node: ReactNode) => (
                    <div style={{ background: `${color}12`, borderRadius: 6, padding: '0.4rem 0.5rem', marginBottom: '0.4rem', borderLeft: `2.5px solid ${color}` }}>{node}</div>
                  );
                  const statRow = (label: string, value: string, sub: string, subColor: string) => (
                    <>
                      <div style={{ fontSize: '0.54rem', color: 'var(--text-muted)', marginBottom: '0.08rem' }}>{label}</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                      <div style={{ fontSize: '0.52rem', color: subColor }}>{sub}</div>
                    </>
                  );
                  const miniBar = (heights: number[], accent2?: string) => (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 24 }}>
                      {heights.map((h, i) => (
                        <div key={i} style={{ flex: 1, height: `${h}%`, background: accent2 ?? primary, borderRadius: '2px 2px 0 0', opacity: 0.75 }} />
                      ))}
                    </div>
                  );
                  const dayLabels = ['D','S','C','P','J','J','Y'];

                  switch (key) {
                    // ── Shared ───────────────────────────────────────────────
                    case 'revenue': case 'rev':
                      return accent(primary, statRow('Bugungi daromad', '1,240,000', '+12% kechaga nisbatan', '#10b981'));
                    case 'weeklyChart':
                      return (
                        <div style={{ background: `${primary}0a`, borderRadius: 6, padding: '0.4rem 0.5rem', marginBottom: '0.4rem' }}>
                          <div style={{ fontSize: '0.54rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Haftalik grafik</div>
                          {miniBar([55,75,45,90,65,80,70])}
                          <div style={{ display: 'flex', marginTop: '0.1rem' }}>
                            {dayLabels.map(d => <span key={d} style={{ flex: 1, fontSize: '0.45rem', color: 'var(--text-muted)', textAlign: 'center' }}>{d}</span>)}
                          </div>
                        </div>
                      );

                    // ── Retail ───────────────────────────────────────────────
                    case 'todaySales':
                      return accent('#10b981', statRow('Bugungi sotuvlar', '24 ta', "O'rtacha chek: 51,667", '#10b981'));
                    case 'customers':
                      return accent('#3b82f6', statRow('Mijozlar', '152 ta', '8 ta qarzdor', '#f59e0b'));
                    case 'lowStock':
                      return (
                        <div style={{ background: 'rgba(245,158,11,0.08)', borderRadius: 6, padding: '0.4rem 0.5rem', marginBottom: '0.4rem' }}>
                          <div style={{ fontSize: '0.54rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Kam qoldiq</div>
                          {[['Coca Cola',2],['Non',0]].map(([n,q])=>(
                            <div key={String(n)} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.56rem', color:'var(--text)', marginBottom:'0.08rem' }}>
                              <span>{n}</span><span style={{ color: Number(q)===0?'#ef4444':'#f59e0b', fontWeight:600 }}>{q} ta</span>
                            </div>
                          ))}
                        </div>
                      );
                    case 'bestSelling':
                      return (
                        <div style={{ background: 'rgba(16,185,129,0.05)', borderRadius: 6, padding: '0.4rem 0.5rem', marginBottom: '0.4rem' }}>
                          <div style={{ fontSize: '0.54rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Eng ko'p sotilgan</div>
                          {[["Coca Cola 0.5L",'24 ta'],["Non bo'lka",'18 ta'],['Lipton','12 ta']].map(([n,q])=>(
                            <div key={String(n)} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.56rem', color:'var(--text)', marginBottom:'0.06rem' }}>
                              <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'68%' }}>{n}</span>
                              <span style={{ color:'#10b981', fontWeight:600 }}>{q}</span>
                            </div>
                          ))}
                        </div>
                      );

                    // ── Restaurant ───────────────────────────────────────────
                    case 'activeOrders':
                      return (
                        <div style={{ background: 'rgba(239,68,68,0.07)', borderRadius: 6, padding: '0.4rem 0.5rem', marginBottom: '0.4rem' }}>
                          <div style={{ fontSize: '0.54rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Aktiv buyurtmalar</div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>7 ta</div>
                          <div style={{ display:'flex', gap:'0.3rem', marginTop:'0.1rem' }}>
                            {[['3','#3b82f6','yangi'],['3','#f59e0b','pishmoqda'],['1','#10b981','tayyor']].map(([n,c,l])=>(
                              <span key={l} style={{ fontSize:'0.48rem', color:c, fontWeight:600 }}>{n} {l}</span>
                            ))}
                          </div>
                        </div>
                      );
                    case 'todayGuests':
                      return accent('#3b82f6', statRow('Bugungi mehmonlar', '43 ta', "O'rtacha chek: 28,500", '#3b82f6'));
                    case 'tableStatus':
                      return (
                        <div style={{ background: 'rgba(139,92,246,0.07)', borderRadius: 6, padding: '0.4rem 0.5rem', marginBottom: '0.4rem' }}>
                          <div style={{ fontSize: '0.54rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Stol holati (12 ta)</div>
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:2 }}>
                            {[1,1,1,1,1,0,1,0,0,1,1,0].map((busy,i)=>(
                              <div key={i} style={{ height:7, borderRadius:2, background:busy?'#ef4444':'#10b981', opacity:0.8 }} />
                            ))}
                          </div>
                          <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.15rem' }}>
                            <span style={{ fontSize:'0.48rem', color:'#ef4444' }}>8 band</span>
                            <span style={{ fontSize:'0.48rem', color:'#10b981' }}>4 bo'sh</span>
                          </div>
                        </div>
                      );
                    case 'popularDishes':
                      return (
                        <div style={{ background: 'rgba(245,158,11,0.07)', borderRadius: 6, padding: '0.4rem 0.5rem', marginBottom: '0.4rem' }}>
                          <div style={{ fontSize: '0.54rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Mashhur taomlar</div>
                          {[["Lag'mon",'18 ta'],['Shashlik','14 ta'],['Mantu','11 ta']].map(([n,q])=>(
                            <div key={String(n)} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.56rem', color:'var(--text)', marginBottom:'0.06rem' }}>
                              <span>{n}</span><span style={{ color:'#f59e0b', fontWeight:600 }}>{q}</span>
                            </div>
                          ))}
                        </div>
                      );

                    // ── Clinic ───────────────────────────────────────────────
                    case 'todayAppts':
                      return (
                        <div style={{ background: `${primary}12`, borderRadius: 6, padding: '0.4rem 0.5rem', marginBottom: '0.4rem', borderLeft: `2.5px solid ${primary}` }}>
                          <div style={{ fontSize: '0.54rem', color: 'var(--text-muted)', marginBottom: '0.08rem' }}>Bugungi qabullar</div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>18 ta</div>
                          <div style={{ display:'flex', gap:'0.3rem', marginTop:'0.08rem' }}>
                            <span style={{ fontSize:'0.48rem', color:'#10b981' }}>11 tugadi</span>
                            <span style={{ fontSize:'0.48rem', color:'#f59e0b' }}>4 kutmoqda</span>
                            <span style={{ fontSize:'0.48rem', color:'#3b82f6' }}>3 rejalangan</span>
                          </div>
                        </div>
                      );
                    case 'waitingQueue':
                      return accent('#ef4444', statRow('Navbat', '3 ta', "O'rt. kutish: 12 daq", 'var(--text-muted)'));
                    case 'doctorLoad':
                      return (
                        <div style={{ background: 'rgba(139,92,246,0.07)', borderRadius: 6, padding: '0.4rem 0.5rem', marginBottom: '0.4rem' }}>
                          <div style={{ fontSize: '0.54rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Shifokorlar holati</div>
                          {[['Dr. Aliyev',85],['Dr. Karimov',60],['Dr. Yusupova',40]].map(([n,pct])=>(
                            <div key={String(n)} style={{ marginBottom:'0.12rem' }}>
                              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.48rem', color:'var(--text-muted)', marginBottom:'0.04rem' }}>
                                <span>{n}</span><span>{pct}%</span>
                              </div>
                              <div style={{ height:3, borderRadius:2, background:'var(--border)' }}>
                                <div style={{ height:'100%', width:`${pct}%`, background: Number(pct)>80?'#ef4444':Number(pct)>60?'#f59e0b':'#10b981', borderRadius:2 }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    case 'topDoctors':
                      return (
                        <div style={{ background: 'rgba(16,185,129,0.05)', borderRadius: 6, padding: '0.4rem 0.5rem', marginBottom: '0.4rem' }}>
                          <div style={{ fontSize: '0.54rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Top shifokorlar</div>
                          {[['Dr. Aliyev','6 qabul'],['Dr. Karimov','5 qabul'],['Dr. Yusupova','4 qabul']].map(([n,q])=>(
                            <div key={String(n)} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.56rem', color:'var(--text)', marginBottom:'0.06rem' }}>
                              <span>{n}</span><span style={{ color:'#10b981', fontWeight:600 }}>{q}</span>
                            </div>
                          ))}
                        </div>
                      );

                    // ── Education ────────────────────────────────────────────
                    case 'activeStudents':
                      return accent('#3b82f6', statRow("Aktiv o'quvchilar", '124 ta', '8 ta guruh', '#3b82f6'));
                    case 'todayClasses':
                      return (
                        <div style={{ background: `${primary}12`, borderRadius: 6, padding: '0.4rem 0.5rem', marginBottom: '0.4rem', borderLeft: `2.5px solid ${primary}` }}>
                          <div style={{ fontSize: '0.54rem', color: 'var(--text-muted)', marginBottom: '0.08rem' }}>Bugungi darslar</div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>12 ta</div>
                          <div style={{ display:'flex', gap:'0.3rem', marginTop:'0.08rem' }}>
                            <span style={{ fontSize:'0.48rem', color:'#10b981' }}>7 tugadi</span>
                            <span style={{ fontSize:'0.48rem', color:'#f59e0b' }}>3 bormoqda</span>
                            <span style={{ fontSize:'0.48rem', color:'#3b82f6' }}>2 rejalangan</span>
                          </div>
                        </div>
                      );
                    case 'paymentStatus':
                      return (
                        <div style={{ background: 'rgba(245,158,11,0.07)', borderRadius: 6, padding: '0.4rem 0.5rem', marginBottom: '0.4rem' }}>
                          <div style={{ fontSize: '0.54rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>To'lovlar holati</div>
                          <div style={{ display:'flex', gap:1, height:7, borderRadius:4, overflow:'hidden', marginBottom:'0.15rem' }}>
                            <div style={{ flex:72, background:'#10b981' }} />
                            <div style={{ flex:18, background:'#f59e0b' }} />
                            <div style={{ flex:10, background:'#ef4444' }} />
                          </div>
                          <div style={{ display:'flex', gap:'0.35rem' }}>
                            <span style={{ fontSize:'0.48rem', color:'#10b981' }}>72% to'lagan</span>
                            <span style={{ fontSize:'0.48rem', color:'#f59e0b' }}>18% kutmoqda</span>
                            <span style={{ fontSize:'0.48rem', color:'#ef4444' }}>10% qarz</span>
                          </div>
                        </div>
                      );
                    case 'attendance':
                      return accent('#10b981', statRow('Bugungi davomat', '87%', "108 / 124 o'quvchi kelgan", 'var(--text-muted)'));
                    case 'debtors':
                      return (
                        <div style={{ background: 'rgba(239,68,68,0.07)', borderRadius: 6, padding: '0.4rem 0.5rem', marginBottom: '0.4rem' }}>
                          <div style={{ fontSize: '0.54rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Qarzdorlar</div>
                          {[['Aliyev Jasur','120,000'],['Karimova Nilufar','240,000']].map(([n,q])=>(
                            <div key={String(n)} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.56rem', color:'var(--text)', marginBottom:'0.06rem' }}>
                              <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'65%' }}>{n}</span>
                              <span style={{ color:'#ef4444', fontWeight:600 }}>{q}</span>
                            </div>
                          ))}
                        </div>
                      );

                    // ── Fitness ──────────────────────────────────────────────
                    case 'activeMembers':
                      return accent('#10b981', statRow("Aktiv a'zolar", '318 ta', '+12 ta bu oy', '#10b981'));
                    case 'todayCheckins':
                      return accent(primary, statRow('Bugungi kirishlar', '47 ta', 'Eng band: 18:00–19:00', 'var(--text-muted)'));
                    case 'expiringPlans':
                      return accent('#ef4444', statRow('Obuna tugayotgan (5 kun)', '8 ta', 'SMS eslatma yuborildi', 'var(--text-muted)'));
                    case 'peakHours':
                      return (
                        <div style={{ background: `${primary}0a`, borderRadius: 6, padding: '0.4rem 0.5rem', marginBottom: '0.4rem' }}>
                          <div style={{ fontSize: '0.54rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Band soatlar (bugun)</div>
                          <div style={{ display:'flex', alignItems:'flex-end', gap:1, height:20 }}>
                            {[20,35,45,60,80,90,85,70,65,55,40,25].map((h,i)=>(
                              <div key={i} style={{ flex:1, height:`${h}%`, background:h>=80?'#ef4444':primary, borderRadius:'1px 1px 0 0', opacity:0.75 }} />
                            ))}
                          </div>
                          <div style={{ display:'flex', justifyContent:'space-between', marginTop:'0.1rem' }}>
                            {['8','10','12','14','16','18','20'].map(h=>(
                              <span key={h} style={{ fontSize:'0.43rem', color:'var(--text-muted)' }}>{h}</span>
                            ))}
                          </div>
                        </div>
                      );

                    // ── Beauty ───────────────────────────────────────────────
                    case 'freeSlots':
                      return accent('#10b981', statRow("Bo'sh slotlar", '5 ta', "3 masterda joy bor", 'var(--text-muted)'));
                    case 'masterStatus':
                      return (
                        <div style={{ background: 'rgba(139,92,246,0.07)', borderRadius: 6, padding: '0.4rem 0.5rem', marginBottom: '0.4rem' }}>
                          <div style={{ fontSize: '0.54rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Masterlar holati</div>
                          {[['Malika','#10b981',"Bo'sh"],['Dilorom','#f59e0b','Band 40 daq'],['Sarvinoz','#10b981',"Bo'sh"]].map(([n,c,s])=>(
                            <div key={String(n)} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.54rem', marginBottom:'0.06rem' }}>
                              <span style={{ color:'var(--text)' }}>{n}</span>
                              <span style={{ color:c, fontWeight:600 }}>{s}</span>
                            </div>
                          ))}
                        </div>
                      );
                    case 'popularServices':
                      return (
                        <div style={{ background: 'rgba(236,72,153,0.06)', borderRadius: 6, padding: '0.4rem 0.5rem', marginBottom: '0.4rem' }}>
                          <div style={{ fontSize: '0.54rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Mashhur xizmatlar</div>
                          {[["Soch bo'yash",'8 ta'],['Manikur','12 ta'],['Pedikyur','6 ta']].map(([n,q])=>(
                            <div key={String(n)} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.56rem', color:'var(--text)', marginBottom:'0.06rem' }}>
                              <span>{n}</span><span style={{ color:'#ec4899', fontWeight:600 }}>{q}</span>
                            </div>
                          ))}
                        </div>
                      );

                    // ── Auto ─────────────────────────────────────────────────
                    case 'readyCars':
                      return accent('#10b981', statRow('Tayyor mashinalar', '3 ta', 'SMS yuborilgan: 2 ta', 'var(--text-muted)'));
                    case 'mechanicLoad':
                      return (
                        <div style={{ background: 'rgba(245,158,11,0.07)', borderRadius: 6, padding: '0.4rem 0.5rem', marginBottom: '0.4rem' }}>
                          <div style={{ fontSize: '0.54rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Mexaniklar holati</div>
                          {[['Rustam',2,'#f59e0b'],['Jasur',3,'#ef4444'],['Dilshod',1,'#10b981']].map(([n,cnt,c])=>(
                            <div key={String(n)} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.54rem', marginBottom:'0.06rem' }}>
                              <span style={{ color:'var(--text)' }}>{n}</span>
                              <span style={{ color:String(c), fontWeight:600 }}>{cnt} ta mashina</span>
                            </div>
                          ))}
                        </div>
                      );
                    case 'popularRepairs':
                      return (
                        <div style={{ background: 'rgba(59,130,246,0.06)', borderRadius: 6, padding: '0.4rem 0.5rem', marginBottom: '0.4rem' }}>
                          <div style={{ fontSize: '0.54rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Mashhur ta'mirlashlar</div>
                          {[["Moy almashtirish",'8 ta'],['Tormoz tizimi','5 ta'],['Elektr tizim','4 ta']].map(([n,q])=>(
                            <div key={String(n)} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.56rem', color:'var(--text)', marginBottom:'0.06rem' }}>
                              <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'68%' }}>{n}</span>
                              <span style={{ color:'#3b82f6', fontWeight:600 }}>{q}</span>
                            </div>
                          ))}
                        </div>
                      );

                    default:
                      return (
                        <div style={{ height: 36, background: `${primary}0a`, borderRadius: 6, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '0.54rem', color: 'var(--text-muted)' }}>{key}</span>
                        </div>
                      );
                  }
                };

                return (
                  <div className="wz-step-body" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', minHeight: 420 }}>
                    {/* Left: Widget selection */}
                    <div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        Dashboard sahifasida ko'rsatiladigan vidjеtlarni tanlang. Har bir vidjet sizning sohangizdagi asosiy ko'rsatkichlarni aks ettiradi.
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        {widgets.map((w) => {
                          const active = data.dashboardWidgets.includes(w.key);
                          return (
                            <div
                              key={w.key}
                              onClick={() => toggleWidget(w.key)}
                              style={{
                                border: `2px solid ${active ? primary : 'var(--border)'}`,
                                borderRadius: 10,
                                padding: '0.65rem',
                                cursor: 'pointer',
                                background: active ? `${primary}09` : 'var(--card-bg)',
                                position: 'relative',
                                transition: 'border-color 0.15s, background 0.15s',
                                gridColumn: w.wide ? 'span 2' : 'span 1',
                              }}
                            >
                              {active && (
                                <div style={{
                                  position: 'absolute', top: 7, right: 7,
                                  width: 18, height: 18, borderRadius: '50%',
                                  background: primary,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '0.62rem', color: '#fff', fontWeight: 700,
                                }}>
                                  <Check size={10} />
                                </div>
                              )}
                              {miniPreview(w.key)}
                              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)' }}>{w.label}</div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{w.desc}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: Live dashboard preview */}
                    <div className="wz-step-preview" style={{ position: 'sticky', top: '1rem', alignSelf: 'flex-start' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>Dashboard ko'rinishi</div>
                      <div style={{ background: 'var(--bg, #f8fafc)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.65rem', minHeight: 280 }}>
                        {/* Top bar */}
                        <div style={{ background: primary, color: '#fff', borderRadius: 6, padding: '0.28rem 0.55rem', fontSize: '0.6rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Dashboard</span>
                          <span style={{ opacity: 0.7, fontSize: '0.52rem' }}>{new Date().toLocaleDateString('uz-UZ')}</span>
                        </div>

                        {data.dashboardWidgets.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            Hech qanday vidjet tanlanmagan
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                            {data.dashboardWidgets.map(key => {
                              const w = widgets.find(x => x.key === key);
                              if (!w) return null;
                              const isWide = wideKeys.has(key);
                              return (
                                <div key={key} style={{
                                  background: 'var(--card-bg, #fff)',
                                  borderTop: `2px solid ${primary}`,
                                  borderRadius: 5,
                                  padding: '0.3rem 0.38rem',
                                  gridColumn: isWide ? 'span 2' : 'span 1',
                                }}>
                                  <div style={{ fontSize: '0.48rem', color: 'var(--text-muted)', marginBottom: '0.06rem', fontWeight: 500 }}>{w.label}</div>
                                  {/* Compact preview for the right panel */}
                                  {(key === 'revenue' || key === 'rev') && <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>1,240,000 so'm</div>}
                                  {key === 'todaySales' && <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#10b981' }}>24 ta sotuv</div>}
                                  {key === 'customers' && <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#3b82f6' }}>152 ta mijoz</div>}
                                  {key === 'lowStock' && <div style={{ fontSize: '0.56rem', color: '#f59e0b' }}>3 xil mahsulot tugayapti</div>}
                                  {key === 'activeOrders' && <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#ef4444' }}>7 ta aktiv</div>}
                                  {key === 'todayGuests' && <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#3b82f6' }}>43 ta mehmon</div>}
                                  {key === 'tableStatus' && (
                                    <div style={{ display:'flex', gap:1, marginTop:'0.06rem' }}>
                                      {[1,1,0,1,1,0,1,0].map((b,i)=><div key={i} style={{ width:6, height:6, borderRadius:1, background:b?'#ef4444':'#10b981' }} />)}
                                    </div>
                                  )}
                                  {key === 'popularDishes' && <div style={{ fontSize: '0.56rem', color: '#f59e0b' }}>Top: Lag'mon (18 ta)</div>}
                                  {key === 'todayAppts' && <div style={{ fontSize: '0.66rem', fontWeight: 700, color: primary }}>18 ta qabul</div>}
                                  {key === 'waitingQueue' && <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#ef4444' }}>3 ta kutmoqda</div>}
                                  {key === 'doctorLoad' && (
                                    <div style={{ display:'flex', flexDirection:'column', gap:2, marginTop:'0.06rem' }}>
                                      {[85,60,40].map((pct,i)=><div key={i} style={{ height:3, borderRadius:2, background:'var(--border)' }}><div style={{ height:'100%', width:`${pct}%`, background:pct>80?'#ef4444':'#10b981', borderRadius:2 }} /></div>)}
                                    </div>
                                  )}
                                  {key === 'topDoctors' && <div style={{ fontSize: '0.56rem', color: '#10b981' }}>Dr. Aliyev: 6 qabul</div>}
                                  {key === 'activeStudents' && <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#3b82f6' }}>124 ta aktiv</div>}
                                  {key === 'todayClasses' && <div style={{ fontSize: '0.66rem', fontWeight: 700, color: primary }}>12 ta dars</div>}
                                  {key === 'paymentStatus' && (
                                    <div style={{ display:'flex', gap:1, height:5, borderRadius:3, overflow:'hidden', marginTop:'0.06rem' }}>
                                      <div style={{ flex:72, background:'#10b981' }} /><div style={{ flex:18, background:'#f59e0b' }} /><div style={{ flex:10, background:'#ef4444' }} />
                                    </div>
                                  )}
                                  {key === 'attendance' && <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#10b981' }}>87% davomat</div>}
                                  {key === 'debtors' && <div style={{ fontSize: '0.56rem', color: '#ef4444' }}>2 ta qarzdor</div>}
                                  {key === 'activeMembers' && <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#10b981' }}>318 ta a'zo</div>}
                                  {key === 'todayCheckins' && <div style={{ fontSize: '0.66rem', fontWeight: 700, color: primary }}>47 ta kirish</div>}
                                  {key === 'expiringPlans' && <div style={{ fontSize: '0.56rem', color: '#ef4444' }}>8 ta tugayapti</div>}
                                  {key === 'freeSlots' && <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#10b981' }}>5 ta bo'sh slot</div>}
                                  {key === 'masterStatus' && <div style={{ fontSize: '0.56rem', color: '#10b981' }}>2 master bo'sh</div>}
                                  {key === 'popularServices' && <div style={{ fontSize: '0.56rem', color: '#ec4899' }}>Top: Manikur (12 ta)</div>}
                                  {key === 'readyCars' && <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#10b981' }}>3 ta tayyor</div>}
                                  {key === 'mechanicLoad' && <div style={{ fontSize: '0.56rem', color: '#f59e0b' }}>Jasur: 3 ta mashina</div>}
                                  {key === 'popularRepairs' && <div style={{ fontSize: '0.56rem', color: '#3b82f6' }}>Top: Moy (8 ta)</div>}
                                  {key === 'weeklyChart' && (
                                    <div style={{ display:'flex', alignItems:'flex-end', gap:1, height:18, marginTop:'0.08rem' }}>
                                      {[55,75,45,90,65,80,70].map((h,i)=>(
                                        <div key={i} style={{ flex:1, height:`${h}%`, background:primary, borderRadius:'1px 1px 0 0', opacity:0.7 }} />
                                      ))}
                                    </div>
                                  )}
                                  {key === 'peakHours' && (
                                    <div style={{ display:'flex', alignItems:'flex-end', gap:1, height:14, marginTop:'0.08rem' }}>
                                      {[20,35,45,60,80,90,85,70,65,55,40,25].map((h,i)=>(
                                        <div key={i} style={{ flex:1, height:`${h}%`, background:h>=80?'#ef4444':primary, borderRadius:'1px 1px 0 0', opacity:0.75 }} />
                                      ))}
                                    </div>
                                  )}
                                  {key === 'bestSelling' && <div style={{ fontSize: '0.56rem', color: '#10b981' }}>Top: Coca Cola (24 ta)</div>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {data.dashboardWidgets.length > 0 && (
                          <div style={{ marginTop: '0.45rem', fontSize: '0.58rem', color: 'var(--text-muted)', textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.35rem' }}>
                            {data.dashboardWidgets.length} ta vidjet tanlandi
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Step 3 — Modullar */}
              {step === 3 && (() => {
                const primary  = data.theme.primaryColor || '#6366f1';
                const industry = data.industry;
                const isRetail = industry === 'retail';

                // Shared right panel: CRM sidebar preview
                const sidebarPreview = (
                  <div className="wz-step-preview" style={{ position: 'sticky', top: '1rem' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.6rem' }}>CRM menyusi</div>
                    <div style={{ border: `2px solid ${primary}`, borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ background: primary, color: '#fff', padding: '0.35rem 0.65rem', fontSize: '0.65rem', fontWeight: 700 }}>
                        {data.theme.shopName || INDUSTRY_SHOP_PLACEHOLDER[industry] || 'CRM'}
                      </div>
                      <div style={{ background: 'var(--bg, #f8fafc)', minHeight: 220 }}>
                        <div style={{ width: '100%', background: primary, padding: '0.4rem 0' }}>
                          <div style={{ padding: '0.28rem 0.65rem', fontSize: '0.62rem', fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.18)' }}>
                            Dashboard
                          </div>
                          {data.modules.map(key => (
                            <div key={key} style={{ padding: '0.22rem 0.65rem', fontSize: '0.58rem', color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
                              {MODULE_META[key]?.label ?? (isRetail ? ADMIN_RETAIL_MODULES.find(m => m.key === key)?.label : null) ?? key}
                            </div>
                          ))}
                          {data.modules.length === 0 && (
                            <div style={{ padding: '0.5rem 0.65rem', fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>Modul tanlanmagan</div>
                          )}
                        </div>
                      </div>
                      <div style={{ background: 'var(--card-bg)', borderTop: '1px solid var(--border)', padding: '0.3rem 0.65rem', fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{data.modules.length} ta modul</span>
                        <span style={{ color: primary }}>aktiv</span>
                      </div>
                    </div>
                  </div>
                );

                // ── Retail: detailed module cards with feature configs ──────────
                if (isRetail) {
                  const activeModKeys = ADMIN_RETAIL_MODULES.filter(m => data.modules.includes(m.key)).map(m => m.key);
                  return (
                    <div className="wz-step-body" style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '2rem', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                          Bir marta bosing — tanlash / bekor qilish. Ikki marta bosing — modul sozlamalarini ochish.
                        </p>
                        <div className="wz-grid-2">
                          {ADMIN_RETAIL_MODULES.map((mod) => {
                            const active = data.modules.includes(mod.key);
                            const tier   = TIER_STYLE[mod.tier];
                            return (
                              <div key={mod.key} style={{ display: 'flex', flexDirection: 'column' }}>
                                <div
                                  className={`wz-card${active ? ' wz-card--active' : ''}${mod.tier === 'majburiy' ? ' wz-card--required' : ''}`}
                                  onClick={() => { if (mod.tier !== 'majburiy') toggleModule(mod.key); }}
                                  onDoubleClick={(e) => { e.preventDefault(); if (active && MODULE_FEATURES[mod.key]) setModPreviewKey(mod.key); }}
                                  style={{ userSelect: 'none', cursor: mod.tier === 'majburiy' ? 'default' : 'pointer', position: 'relative' }}
                                >
                                  <div style={{ position: 'absolute', top: 8, right: 8, background: tier.bg, color: tier.color, fontSize: '0.62rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 99 }}>
                                    {tier.label}
                                  </div>
                                  {active && mod.tier !== 'majburiy' && <div className="wz-card-check"><Check size={13} /></div>}
                                  <div className="wz-card-title" style={{ marginTop: '0.2rem' }}>{mod.label}</div>
                                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{mod.desc}</div>
                                  {active && mod.config.length > 0 && (
                                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.35rem', opacity: 0.7 }}>2x bosib sozlang</div>
                                  )}
                                </div>
                                {active && MODULE_FEATURES[mod.key] && (
                                  <button type="button"
                                    onClick={(e) => { e.stopPropagation(); setModPreviewKey(mod.key); }}
                                    style={{ marginTop: '0.25rem', width: '100%', padding: '0.3rem', borderRadius: 7, border: `1px solid ${primary}`, background: 'transparent', color: primary, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}
                                  >
                                    Xususiyatlarni sozlash
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {/* Right panel reuses activeModKeys for retail */}
                      <div className="wz-step-preview" style={{ position: 'sticky', top: '1rem' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.6rem' }}>CRM menyusi</div>
                        <div style={{ border: `2px solid ${primary}`, borderRadius: 10, overflow: 'hidden' }}>
                          <div style={{ background: primary, color: '#fff', padding: '0.35rem 0.65rem', fontSize: '0.65rem', fontWeight: 700 }}>{data.theme.shopName || 'CRM'}</div>
                          <div style={{ background: 'var(--bg, #f8fafc)', minHeight: 220 }}>
                            <div style={{ width: '100%', background: primary, padding: '0.4rem 0' }}>
                              <div style={{ padding: '0.28rem 0.65rem', fontSize: '0.62rem', fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.18)' }}>Dashboard</div>
                              {activeModKeys.map(key => {
                                const mod = ADMIN_RETAIL_MODULES.find(m => m.key === key);
                                return (
                                  <div key={key} style={{ padding: '0.22rem 0.65rem', fontSize: '0.58rem', color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
                                    {mod?.label ?? key}
                                  </div>
                                );
                              })}
                              {activeModKeys.length === 0 && <div style={{ padding: '0.5rem 0.65rem', fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>Modul tanlanmagan</div>}
                            </div>
                          </div>
                          <div style={{ background: 'var(--card-bg)', borderTop: '1px solid var(--border)', padding: '0.3rem 0.65rem', fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{activeModKeys.length} ta modul</span>
                            <span style={{ color: primary }}>aktiv</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // ── Non-retail: professional industry module cards ─────────────
                const industryMods = INDUSTRY_MODULES[industry] ?? [];
                const mandatory    = INDUSTRY_MANDATORY[industry] ?? [];
                return (
                  <div className="wz-step-body" style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '2rem', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        Bir marta bosing — tanlash / bekor qilish. Majburiy modullarni o'chirib bo'lmaydi.
                      </p>
                      <div className="wz-grid-2">
                        {industryMods.map((mod) => {
                          const isRequired = mandatory.includes(mod.key);
                          const active     = data.modules.includes(mod.key);
                          const tier       = TIER_STYLE[isRequired ? 'majburiy' : mod.tier];
                          return (
                            <div key={mod.key} style={{ display: 'flex', flexDirection: 'column' }}>
                              <div
                                className={`wz-card${active ? ' wz-card--active' : ''}${isRequired ? ' wz-card--required' : ''}`}
                                onClick={() => { if (!isRequired) toggleModule(mod.key); }}
                                style={{ userSelect: 'none', cursor: isRequired ? 'default' : 'pointer', position: 'relative' }}
                              >
                                <div style={{ position: 'absolute', top: 8, right: 8, background: tier.bg, color: tier.color, fontSize: '0.62rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 99 }}>
                                  {tier.label}
                                </div>
                                {active && !isRequired && <div className="wz-card-check"><Check size={13} /></div>}
                                <div className="wz-card-title" style={{ marginTop: '0.2rem', paddingRight: '4.5rem' }}>{mod.label}</div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.35 }}>{mod.desc}</div>
                                {active && mod.config.length > 0 && (
                                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.35rem', opacity: 0.7 }}>2x bosib sozlang</div>
                                )}
                              </div>
                              {active && mod.config.length > 0 && (
                                <button type="button"
                                  onClick={(e) => { e.stopPropagation(); setModPreviewKey(mod.key); }}
                                  style={{ marginTop: '0.25rem', width: '100%', padding: '0.3rem', borderRadius: 7, border: `1px solid ${primary}`, background: 'transparent', color: primary, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}
                                >
                                  Xususiyatlarni sozlash
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {sidebarPreview}
                  </div>
                );
              })()}

              {/* Step 4 — Chek (full designer) */}
              {step === 4 && (() => {
                const rcpSizes = data.receipt.sizes ?? ['80mm'];
                const tab      = rcpSizes.includes(activeRcpTab) ? activeRcpTab : rcpSizes[0] ?? '80mm';
                const cfg      = data.receipt.sizeCfg?.[tab] ?? dfltSizeCfg();
                const setC     = (p: Partial<WizardReceiptSizeCfg>) => setSizeCfg(tab, p);
                const SIZES    = [{ k:'58mm', l:'58 mm (termal)' }, { k:'80mm', l:'80 mm (termal)' }, { k:'a4', l:'A4 (A4 qog\'oz)' }];
                const TABLE_STYLES: { k: WizardReceiptSizeCfg['tableStyle']; l: string }[] = [
                  { k:'dark',    l:'Qoʻngʻir sarlavha' },
                  { k:'light',   l:'Ochiq sarlavha' },
                  { k:'minimal', l:'Sarlavsiz' },
                ];

                const Toggle = ({ label, checked, onChange, disabled, tier }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; tier?: 'starter'|'pro' }) => (
                  <div className="wz-toggle-item" style={{ opacity: disabled ? 0.5 : 1 }}>
                    <div className="wz-toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {label}
                      {tier && <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.05rem 0.3rem', borderRadius: 4, background: tier === 'starter' ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.15)', color: tier === 'starter' ? '#10b981' : '#8b5cf6' }}>{tier === 'starter' ? 'Starter+' : 'Pro'}</span>}
                    </div>
                    <label className="wz-toggle">
                      <input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
                      <span className="wz-toggle-slider" />
                    </label>
                  </div>
                );

                return (
                  <div className="wz-receipt-layout">
                    {/* ── LEFT: config ───────────────────────────────── */}
                    <div style={{ overflowY: 'auto' }}>
                      {/* Paper sizes */}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <div className="wz-label">Qog'oz o'lchami (bir nechtasini tanlang)</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                          {SIZES.map(s => {
                            const on = rcpSizes.includes(s.k);
                            return (
                              <label key={s.k} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.75rem', border: `1px solid ${on ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', background: on ? 'rgba(99,102,241,0.07)' : 'transparent' }}>
                                <input type="checkbox" checked={on} onChange={e => toggleReceiptSize(s.k, e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
                                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{s.l}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Default size (if multiple) */}
                      {rcpSizes.length > 1 && (
                        <div style={{ marginBottom: '1.25rem' }}>
                          <div className="wz-label">Standart o'lcham (POS da ishlatiladi)</div>
                          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                            {rcpSizes.map(s => (
                              <button key={s} type="button"
                                style={{ padding: '0.3rem 0.75rem', borderRadius: 6, cursor: 'pointer', border: `1px solid ${(data.receipt.defaultSize ?? '80mm') === s ? 'var(--primary)' : 'var(--border)'}`, background: (data.receipt.defaultSize ?? '80mm') === s ? 'var(--primary)' : 'transparent', color: (data.receipt.defaultSize ?? '80mm') === s ? '#fff' : 'var(--text)', fontWeight: 600, fontSize: '0.82rem' }}
                                onClick={() => setReceipt({ defaultSize: s })}>
                                {s === 'a4' ? 'A4' : s}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Per-size config tabs */}
                      {rcpSizes.length > 0 && (
                        <>
                          {rcpSizes.length > 1 && (
                            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                              {rcpSizes.map(s => (
                                <button key={s} type="button"
                                  style={{ padding: '0.3rem 0.65rem', borderRadius: '6px 6px 0 0', fontSize: '0.8rem', cursor: 'pointer', border: `1px solid ${tab === s ? 'var(--primary)' : 'var(--border)'}`, borderBottom: tab === s ? '1px solid var(--bg)' : '1px solid var(--border)', background: tab === s ? 'var(--bg)' : 'var(--card-bg)', color: tab === s ? 'var(--primary)' : 'var(--text-muted)', fontWeight: tab === s ? 700 : 400 }}
                                  onClick={() => setActiveRcpTab(s)}>
                                  {s === 'a4' ? 'A4' : s}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* HEADER */}
                          <div style={{ marginBottom: '1rem' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Sarlavha</div>
                            <div className="wz-toggle-list">
                              <Toggle label="Do'kon nomi" checked={true} onChange={() => {}} disabled />
                              <Toggle label='"Savdo cheki" yozuvi' checked={true} onChange={() => {}} disabled />
                              <Toggle label="Logo" checked={cfg.showLogo} onChange={v => setC({ showLogo: v })} tier="starter" />
                              <Toggle label="Manzil" checked={cfg.showAddress} onChange={v => setC({ showAddress: v })} />
                              <Toggle label="Telefon" checked={cfg.showPhone} onChange={v => setC({ showPhone: v })} />
                            </div>
                          </div>

                          {/* INFO */}
                          <div style={{ marginBottom: '1rem' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Ma'lumot qatori</div>
                            <div className="wz-toggle-list">
                              <Toggle label="Chek raqami" checked={true} onChange={() => {}} disabled />
                              <Toggle label="Sana va vaqt" checked={true} onChange={() => {}} disabled />
                              <Toggle label="Sotuvchi" checked={cfg.showSeller} onChange={v => setC({ showSeller: v })} />
                              <Toggle label="Mijoz" checked={cfg.showCustomer} onChange={v => setC({ showCustomer: v })} />
                            </div>
                          </div>

                          {/* TABLE */}
                          <div style={{ marginBottom: '1rem' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Jadval (mahsulotlar)</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text)', marginBottom: '0.35rem', fontWeight: 500 }}>Ustunlar:</div>
                            <div className="wz-toggle-list" style={{ marginBottom: '0.75rem' }}>
                              <Toggle label="Mahsulot nomi" checked={true} onChange={() => {}} disabled />
                              <Toggle label="O'lchov birligi" checked={cfg.colUnit} onChange={v => setC({ colUnit: v })} />
                              <Toggle label="Miqdor" checked={true} onChange={() => {}} disabled />
                              {tab !== '58mm' && <Toggle label="Birlik narxi" checked={cfg.colPrice} onChange={v => setC({ colPrice: v })} />}
                              <Toggle label="Jami summa" checked={true} onChange={() => {}} disabled />
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text)', marginBottom: '0.35rem', fontWeight: 500 }}>Jadval dizayni:</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                              {TABLE_STYLES.map(ts => (
                                <label key={ts.k} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                  <input type="radio" name={`ts-${tab}`} checked={cfg.tableStyle === ts.k} onChange={() => setC({ tableStyle: ts.k })} style={{ accentColor: 'var(--primary)' }} />
                                  <span style={{ fontSize: '0.82rem', color: 'var(--text)' }}>{ts.l}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* SUMMARY */}
                          <div style={{ marginBottom: '1rem' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Umumiy summa</div>
                            <div className="wz-toggle-list">
                              <Toggle label="Umumiy to'lov" checked={true} onChange={() => {}} disabled />
                              <Toggle label="To'lov tarkibi (naqd/karta/nasiya)" checked={cfg.showPayBreak} onChange={v => setC({ showPayBreak: v })} />
                              <Toggle label="Qarzdorlik ma'lumotlari" checked={cfg.showDebtInfo} onChange={v => setC({ showDebtInfo: v })} tier="starter" />
                            </div>
                          </div>

                          {/* FOOTER */}
                          <div style={{ marginBottom: '1rem' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Pastki qism</div>
                            <div className="wz-toggle-list" style={{ marginBottom: '0.65rem' }}>
                              <Toggle label="Qaytim (change)" checked={cfg.showChange} onChange={v => setC({ showChange: v })} />
                              <Toggle label="Barcode" checked={cfg.showBarcode} onChange={v => setC({ showBarcode: v })} tier="starter" />
                              <Toggle label="Pastda do'kon nomi" checked={cfg.showFooterName} onChange={v => setC({ showFooterName: v })} />
                            </div>
                            <div className="wz-form-group">
                              <label className="wz-label">Xayrli so'z</label>
                              <input className="wz-input" type="text" value={cfg.footerText}
                                onChange={e => setC({ footerText: e.target.value })}
                                placeholder="Rahmat! Qaytib keling!" />
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* ── RIGHT: preview ─────────────────────────────── */}
                    <ReceiptPreview receipt={data.receipt} theme={data.theme} activeTab={tab} />
                  </div>
                );
              })()}

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
                <div className="wz-step-body" style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '2rem', alignItems: 'flex-start' }}>
                  <div>
                    <div className="wz-form-group">
                      <label className="wz-label">{INDUSTRY_SHOP_LABEL[data.industry] ?? "Do'kon nomi"} *</label>
                      <input className="wz-input" type="text"
                        placeholder={INDUSTRY_SHOP_PLACEHOLDER[data.industry] ?? "Biznes nomi"}
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
                        value={data.theme.phone}
                        onFocus={() => { if (!data.theme.phone) setTheme({ phone: '+998 ' }); }}
                        onBlur={() => { if (data.theme.phone === '+998 ') setTheme({ phone: '' }); }}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) { setTheme({ phone: '' }); return; }
                          if (val.startsWith('+')) { setTheme({ phone: val }); return; }
                          setTheme({ phone: '+998 ' + val });
                        }} />
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
                  </div>

                  {/* Right: Carousel style preview */}
                  <div className="wz-step-preview" style={{ minWidth: 210 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.6rem' }}>Uslubni tanlang</div>
                    {(() => {
                      const primary = data.theme.primaryColor || '#6366f1';
                      const s = data.theme.style as 'modern' | 'classic' | 'minimal';
                      return (
                        <>
                          <div
                            onClick={() => {
                              const all = ['modern', 'classic', 'minimal'] as const;
                              setTheme({ style: all[(all.indexOf(s) + 1) % all.length] });
                            }}
                            style={{ cursor: 'pointer', borderRadius: 10, overflow: 'hidden', border: `2px solid ${primary}`, userSelect: 'none' }}
                          >
                            <div style={{ background: 'var(--bg, #f8fafc)', display: 'flex', height: 150 }}>
                              <div style={{
                                width: 80,
                                background: s === 'minimal' ? 'transparent' : primary,
                                borderRight: s === 'minimal' ? `2px solid ${primary}` : 'none',
                                display: 'flex', flexDirection: 'column', padding: '0.4rem 0',
                              }}>
                                <div style={{ padding: '0.25rem 0.5rem', fontSize: '0.58rem', color: s === 'minimal' ? primary : '#fff', fontWeight: 700 }}>
                                  {data.theme.shopName || 'CRM'}
                                </div>
                                {['Dashboard', 'Sotuv', 'Mahsulotlar', 'Mijozlar'].map((lbl, i) => (
                                  <div key={lbl} style={{
                                    padding: '0.18rem 0.5rem', fontSize: '0.54rem',
                                    color: s === 'minimal' ? (i === 0 ? primary : 'var(--text-muted)') : (i === 0 ? '#fff' : 'rgba(255,255,255,0.65)'),
                                    background: i === 0 ? (s === 'minimal' ? 'transparent' : 'rgba(255,255,255,0.18)') : 'transparent',
                                    fontWeight: i === 0 ? 600 : 400,
                                  }}>{lbl}</div>
                                ))}
                              </div>
                              <div style={{ flex: 1, padding: '0.5rem 0.6rem' }}>
                                <div style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.4rem' }}>Dashboard</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
                                  {['Daromad', 'Sotuv'].map(lbl => (
                                    <div key={lbl} style={{
                                      background: 'var(--card-bg,#fff)',
                                      borderTop: s !== 'minimal' ? `2px solid ${primary}` : 'none',
                                      borderBottom: s === 'minimal' ? `2px solid ${primary}` : 'none',
                                      borderRadius: s === 'modern' ? 5 : s === 'classic' ? 2 : 0,
                                      padding: '0.25rem 0.3rem',
                                    }}>
                                      <div style={{ fontSize: '0.45rem', color: 'var(--text-muted)' }}>{lbl}</div>
                                      <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text)' }}>—</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div style={{ background: primary, color: '#fff', padding: '0.4rem 0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                                {{ modern: 'Zamonaviy', classic: 'Klassik', minimal: 'Minimal' }[s]}
                              </span>
                              <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>Bosib o'zgartiring</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.45rem', marginTop: '0.65rem' }}>
                            {(['modern', 'classic', 'minimal'] as const).map(st => (
                              <div key={st} onClick={() => setTheme({ style: st })}
                                style={{ width: s === st ? 22 : 8, height: 8, borderRadius: 4, background: s === st ? primary : 'var(--border)', cursor: 'pointer', transition: 'all 0.2s' }} />
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Step 7 — Tarif */}
              {step === 7 && (() => {
                const plan  = data.billingPlan;
                const cycle = data.billingCycle;

                const applyPlan = (p: 'free' | 'starter' | 'pro') => {
                  setData(d => ({ ...d, billingPlan: p }));
                  const tiers = p === 'pro' ? ['free','starter','pro'] : p === 'starter' ? ['free','starter'] : ['free'];
                  setModuleConfigs(prev => {
                    const next = { ...prev };
                    Object.entries(MODULE_FEATURES).forEach(([modKey, def]) => {
                      next[modKey] = { ...(prev[modKey] ?? {}) };
                      def.features.forEach(f => { next[modKey][f.key] = tiers.includes(f.tier); });
                    });
                    return next;
                  });
                };

                const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(n);

                const FREE_FEATURES   = ['POS terminal (sotuv)', 'Mahsulotlar va narxlar', 'Chek chiqarish'];
                const STARTER_FEATURES = ["Xodimlar ro'yxati va rol tizimi", 'Sklad boshqaruvi (kirim/chiqim)', 'Savdo tarixi va filtrlar', 'Mijozlar bazasi', 'Statistika (top mahsulotlar)', 'Excel eksport'];
                const PRO_FEATURES    = ['Ish vaqti kuzatish (kirish/chiqish)', 'Maosh hisobi va oylik hisobot', "Margin tahlili (kategoriya bo'yicha)", 'Qaytarishlar statistikasi', "Mijozlar daraja taqsimoti (Silver/Gold/Brilliant)", "Ta'minotchilar integratsiyasi"];

                return (
                  <div style={{ maxWidth: 860, margin: '0 auto' }}>

                    {/* Billing cycle toggle */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.75rem' }}>
                      <div style={{ display: 'flex', background: 'var(--bg,rgba(0,0,0,0.15))', borderRadius: 10, padding: '0.3rem', gap: '0.25rem' }}>
                        {(['monthly', 'yearly'] as const).map(c => (
                          <button
                            key={c} type="button"
                            onClick={() => setData(d => ({ ...d, billingCycle: c, billingPlan: c === 'yearly' && d.billingPlan === 'free' ? 'starter' : d.billingPlan }))}
                            style={{
                              padding: '0.45rem 1.2rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                              background:  cycle === c ? 'var(--card-bg,#fff)' : 'transparent',
                              fontWeight:  cycle === c ? 700 : 400,
                              color:       cycle === c ? 'var(--text)' : 'var(--text-muted)',
                              boxShadow:   cycle === c ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                              fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                            }}
                          >
                            {c === 'monthly' ? 'Oylik' : 'Yillik'}
                            {c === 'yearly' && (
                              <span style={{ fontSize: '0.65rem', background: '#16a34a', color: '#fff', borderRadius: 99, padding: '0.1rem 0.4rem', fontWeight: 700 }}>
                                2 oy bepul
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 3 plan cards — equal height */}
                    <div className="plan-cards-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem', alignItems: 'stretch' }}>

                      {/* ── FREE ── */}
                      {(() => {
                        const disabled = cycle === 'yearly';
                        const active   = plan === 'free' && !disabled;
                        const color    = '#10b981';
                        return (
                          <div style={{ border: `2px solid ${active ? color : 'var(--border)'}`, borderRadius: 16, padding: '1.75rem 1.5rem', background: active ? 'rgba(16,185,129,0.05)' : 'var(--card-bg)', display: 'flex', flexDirection: 'column', transition: 'border-color 0.2s', position: 'relative', opacity: disabled ? 0.45 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
                            {active && <span style={{ position: 'absolute', top: 12, right: 12, fontSize: '0.65rem', background: color, color: '#fff', borderRadius: 99, padding: '0.15rem 0.5rem', fontWeight: 700 }}>Tanlangan</span>}
                            {disabled && <span style={{ position: 'absolute', top: 12, right: 12, fontSize: '0.65rem', background: 'var(--text-muted)', color: '#fff', borderRadius: 99, padding: '0.15rem 0.5rem', fontWeight: 700 }}>Mavjud emas</span>}
                            <div style={{ marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color, background: 'rgba(16,185,129,0.15)', borderRadius: 6, padding: '0.2rem 0.55rem' }}>BEPUL</span>
                            </div>
                            <div style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.2rem' }}>Sinov</div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem', minHeight: '2.5rem' }}>Boshlash uchun</div>
                            <div style={{ marginBottom: cycle === 'yearly' ? '0.3rem' : '1.5rem', display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                              <span style={{ fontSize: '2rem', fontWeight: 800, color, flexShrink: 0 }}>0</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>so'm / 14 kun</span>
                            </div>
                            {cycle === 'yearly' && <div style={{ fontSize: '0.75rem', marginBottom: '1.25rem', visibility: 'hidden' }}>placeholder</div>}
                            <button type="button" onClick={() => applyPlan('free')} disabled={disabled}
                              style={{ width: '100%', padding: '0.7rem', borderRadius: 10, border: `1.5px solid ${color}`, background: active ? 'rgba(16,185,129,0.15)' : 'transparent', color, fontWeight: 700, fontSize: '0.9rem', cursor: disabled ? 'not-allowed' : 'pointer', marginBottom: '1.25rem' }}>
                              {active ? 'Tanlangan' : 'Tanlash'}
                            </button>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                              {FREE_FEATURES.map(f => (
                                <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem', fontSize: '0.8rem' }}>
                                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                                    <path d="M3 8L6.5 11.5L13 4.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  {f}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* ── STARTER ── */}
                      {(() => {
                        const active  = plan === 'starter';
                        const color   = '#3b82f6';
                        const monthly = 99_000;
                        const price   = cycle === 'yearly' ? monthly * 10 : monthly;
                        return (
                          <div style={{ border: `2px solid ${active ? color : 'var(--border)'}`, borderRadius: 16, padding: '1.75rem 1.5rem', background: active ? 'rgba(59,130,246,0.05)' : 'var(--card-bg)', display: 'flex', flexDirection: 'column', transition: 'border-color 0.2s', position: 'relative' }}>
                            {active && <span style={{ position: 'absolute', top: 12, right: 12, fontSize: '0.65rem', background: color, color: '#fff', borderRadius: 99, padding: '0.15rem 0.5rem', fontWeight: 700 }}>Tanlangan</span>}
                            <div style={{ marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color, background: 'rgba(59,130,246,0.15)', borderRadius: 6, padding: '0.2rem 0.55rem' }}>STARTER</span>
                            </div>
                            <div style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.2rem' }}>Starter</div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem', minHeight: '2.5rem' }}>Kichik va o'rta biznes uchun</div>
                            <div style={{ marginBottom: cycle === 'yearly' ? '0.3rem' : '1.5rem', display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                              <span style={{ fontSize: '2rem', fontWeight: 800, color, flexShrink: 0 }}>{fmt(price)}</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>so'm / {cycle === 'yearly' ? 'yil' : 'oy'}</span>
                            </div>
                            {cycle === 'yearly' && <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, marginBottom: '1.25rem' }}>= {fmt(monthly)} × 10 oy (2 oy bepul)</div>}
                            <button type="button" onClick={() => applyPlan('starter')}
                              style={{ width: '100%', padding: '0.7rem', borderRadius: 10, border: `1.5px solid ${color}`, background: active ? 'rgba(59,130,246,0.15)' : 'transparent', color, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', marginBottom: '1.25rem' }}>
                              {active ? 'Tanlangan' : 'Tanlash'}
                            </button>
                            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tekin versiyadan tashqari:</div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                              {[...FREE_FEATURES, ...STARTER_FEATURES].map(f => (
                                <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem', fontSize: '0.8rem' }}>
                                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                                    <path d="M3 8L6.5 11.5L13 4.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  {f}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* ── PRO ── */}
                      {(() => {
                        const active  = plan === 'pro';
                        const color   = '#8b5cf6';
                        const monthly = 299_000;
                        const price   = cycle === 'yearly' ? monthly * 10 : monthly;
                        return (
                          <div style={{ border: `2px solid ${active ? color : 'var(--border)'}`, borderRadius: 16, padding: '1.75rem 1.5rem', background: active ? 'rgba(139,92,246,0.05)' : 'var(--card-bg)', display: 'flex', flexDirection: 'column', transition: 'border-color 0.2s', position: 'relative' }}>
                            {active && <span style={{ position: 'absolute', top: 12, right: 12, fontSize: '0.65rem', background: color, color: '#fff', borderRadius: 99, padding: '0.15rem 0.5rem', fontWeight: 700 }}>Tanlangan</span>}
                            <div style={{ marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color, background: 'rgba(139,92,246,0.15)', borderRadius: 6, padding: '0.2rem 0.55rem' }}>PRO</span>
                            </div>
                            <div style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.2rem' }}>Pro</div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem', minHeight: '2.5rem' }}>Katta biznes va barcha imkoniyatlar</div>
                            <div style={{ marginBottom: cycle === 'yearly' ? '0.3rem' : '1.5rem', display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                              <span style={{ fontSize: '2rem', fontWeight: 800, color, flexShrink: 0 }}>{fmt(price)}</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>so'm / {cycle === 'yearly' ? 'yil' : 'oy'}</span>
                            </div>
                            {cycle === 'yearly' && <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, marginBottom: '1.25rem' }}>= {fmt(monthly)} × 10 oy (2 oy bepul)</div>}
                            <button type="button" onClick={() => applyPlan('pro')}
                              style={{ width: '100%', padding: '0.7rem', borderRadius: 10, border: `1.5px solid ${color}`, background: active ? 'rgba(139,92,246,0.15)' : 'transparent', color, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', marginBottom: '1.25rem' }}>
                              {active ? 'Tanlangan' : 'Tanlash'}
                            </button>
                            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Hammasi qo'shilgan:</div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                              {[...FREE_FEATURES, ...STARTER_FEATURES, ...PRO_FEATURES].map(f => (
                                <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem', fontSize: '0.8rem' }}>
                                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                                    <path d="M3 8L6.5 11.5L13 4.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  {f}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                    </div>
                    <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.25rem' }}>
                      Tanlangan tarif barcha modullardagi xususiyatlarni avtomatik faollashtiradi.
                    </p>
                  </div>
                );
              })()}
            </div>

            <div className="wz-footer">
              <div />
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {WIZARD_ORDER.indexOf(step) + 1} / {WIZARD_ORDER.length}
                </span>
                {WIZARD_ORDER.indexOf(step) < WIZARD_ORDER.length - 1 ? (
                  <button type="button" className="btn-primary"
                    disabled={step === 6 && !data.theme.shopName.trim()}
                    onClick={() => setStep(WIZARD_ORDER[WIZARD_ORDER.indexOf(step) + 1])}>
                    Keyingi
                  </button>
                ) : (
                  <button
                    type="button" className="btn-primary"
                    disabled={submitting || !data.theme.shopName.trim()}
                    onClick={handleSubmit}
                  >
                    {submitting
                      ? (editingTenantId ? 'Saqlanmoqda...' : 'Yaratilmoqda...')
                      : (editingTenantId ? 'Saqlash' : 'CRM Yaratish')
                    }
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {impersonateFrame && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: '#0f172a', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            height: 44, flexShrink: 0,
            background: '#1e293b', borderBottom: '1px solid #334155',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 1rem',
          }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              Superadmin rejimi — <strong style={{ color: '#e2e8f0' }}>{impersonateFrame.name}</strong> CRM si
            </span>
            <button
              onClick={() => setImpersonateFrame(null)}
              style={{
                background: 'rgba(255,255,255,0.08)', border: '1px solid #475569',
                color: '#e2e8f0', padding: '0.25rem 0.85rem', borderRadius: 6,
                cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
              }}
            >
              ← Tenants ga qaytish
            </button>
          </div>
          <iframe
            key={impersonateFrame.url}
            src={impersonateFrame.url}
            style={{ flex: 1, border: 'none', width: '100%' }}
            title="CRM Preview"
          />
        </div>
      )}
    </div>
  );
}
