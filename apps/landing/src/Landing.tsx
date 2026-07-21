import { useState } from 'react';
import {
  ShoppingCart, Stethoscope, GraduationCap, UtensilsCrossed, Sparkles, Dumbbell,
  ShieldCheck, Users, BarChart3, Smartphone, Globe, Zap,
  BookOpen, Clock, TrendingDown, AlertCircle, EyeOff, UserX,
  Check, X, ChevronRight, ArrowRight,
} from 'lucide-react';

const APP_URL   = (import.meta as unknown as { env: Record<string, string> }).env['VITE_APP_URL']  ?? 'http://localhost:4300';
const ADMIN_URL = (import.meta as unknown as { env: Record<string, string> }).env['VITE_ADMIN_URL'] ?? 'http://localhost:4200';

type Lang = 'uz' | 'ru' | 'en';

// ── Translations ──────────────────────────────────────────────────────────────

const T = {
  uz: {
    nav: { features: "Imkoniyatlar", industries: "Sohalar", pricing: "Narxlar", login: "Kirish", start: "Bepul boshlash" },
    hero: {
      badge: "O'zbekiston #1 SaaS CRM platformasi",
      h1a: "Daftardan voz keching —",
      h1b: "Biznesingizni raqamlashtiring",
      sub: "Qog'oz hisobi, yo'qolgan ma'lumotlar, nazorat yo'qligi — bularning barchasi biznesingizni orqaga tortadi. XM Asistent bilan hamma narsa bir ekranda.",
      cta1: "Bepul boshlash",
      cta2: "Sohalarni ko'rish",
      stat1: "Soha turi", stat2: "Sozlash vaqti", stat3: "Ishlash vaqti",
    },
    problems: {
      eyebrow: "Muammolar",
      title: "Siz ham shu muammolarga duch keldingizmi?",
      sub: "O'zbekistondagi 80% kichik biznes hali ham qog'oz daftar yoki Excel bilan ishlaydi. Bu vaqt va pul yo'qotishidir.",
      items: [
        { title: "Hisobni yo'qotish", desc: "Kuniga qancha sotuv bo'ldi? Omborda nima qoldi? Javob topib bo'lmaydi." },
        { title: "Vaqt isrof", desc: "Har kuni soatlab yozuv, hisob-kitob, hisobot — bularni qo'lda qilish charchatadi." },
        { title: "Xodim nazorati yo'q", desc: "Kim qachon keldi, nima sotdi, qancha pul oldi — hech narsa ko'rinmaydi." },
        { title: "Mijoz bazasi yo'q", desc: "Doimiy mijozlaringizni bilmaysiz, ular yana kelishini bilib bo'lmaydi." },
        { title: "Hisobot yo'q", desc: "Oy oxirida foyda bormi yo'qmi — aniq hisob qilib bo'lmaydi." },
        { title: "Raqamli emas", desc: "Telefon, daftar, Excel — hammasi alohida. Bitta tizim yo'q." },
      ],
    },
    solution: {
      eyebrow: "Yechim",
      title: "XM Asistent — barchasi bir tizimda",
      sub: "Ro'yxatdan o'ting, sohangizni tanlang — CRM tizimingiz bir daqiqada tayyor bo'ladi.",
      items: [
        { title: "Real vaqt hisobi", desc: "Har bir sotuv, to'lov, ombor o'zgarishi — darhol ekranda ko'rinadi." },
        { title: "Avtomatik hisobotlar", desc: "Kunlik, haftalik, oylik hisobotlar avtomatik tuziladi. Siz faqat qarasiz." },
        { title: "Xodim nazorati", desc: "Har bir xodim nima qildi, qancha ishlab topdi — barchasi tarix sifatida saqlanadi." },
        { title: "Mijozlar bazasi", desc: "Har bir mijoz, uning tarixi, sodiqlik balli — bir joyda, abadiy." },
      ],
    },
    industries: {
      eyebrow: "Sohalar",
      title: "Qaysi soha uchun?",
      sub: "Har bir soha uchun maxsus modullar va rollar — bitta universal emas, aniq moslashtirilgan.",
      items: [
        { name: "Savdo / Do'kon", desc: "POS kassir, ombor, mijozlar, to'lovlar, hisobotlar.", chips: ["POS", "Ombor", "Mijozlar"] },
        { name: "Klinika", desc: "Bemorlar, qabullar, retseptlar, laboratoriya, dorixona.", chips: ["Bemorlar", "Qabullar", "Retseptlar"] },
        { name: "Ta'lim markazi", desc: "O'quvchilar, kurslar, davomat, to'lovlar, jadval.", chips: ["O'quvchilar", "Davomat", "To'lov"] },
        { name: "Restoran / Kafe", desc: "Menyu, buyurtmalar, stol boshqaruvi, oshxona.", chips: ["Menyu", "Buyurtmalar", "Stollar"] },
        { name: "Go'zallik saloni", desc: "Masterlar, xizmatlar, qabullar, mijozlar bazasi.", chips: ["Masterlar", "Qabullar", "Xizmatlar"] },
        { name: "Fitnes / Sport zal", desc: "A'zolar, obunalar, kirish nazorati, trenerlar.", chips: ["A'zolar", "Obuna", "Kirish"] },
      ],
    },
    steps: {
      eyebrow: "Qanday ishlaydi",
      title: "3 qadam — CRM tayyor",
      items: [
        { n: "1", title: "Ro'yxatdan o'ting", desc: "Email yoki Google orqali 30 soniyada hisob oching. Kredit karta shart emas." },
        { n: "2", title: "Sohangizni tanlang", desc: "Savdo, klinika, restoran yoki boshqa — modullar avtomatik sozlanadi." },
        { n: "3", title: "CRM tayyor!", desc: "Dashboard, modullar, rollar — hammasi ishlaydi. Xodimlarni qo'shing va boshlang." },
      ],
    },
    features: {
      eyebrow: "Imkoniyatlar",
      title: "Sizga kerak bo'lgan hamma narsa",
      items: [
        { title: "Bank darajasida xavfsizlik", desc: "JWT, OTP, Google OAuth, sessiya nazorati, rol-asosiy ruxsatlar." },
        { title: "Ko'p foydalanuvchi va rollar", desc: "Admin, kassir, ombor, shifokor — har soha uchun aniq rollar." },
        { title: "Real vaqt statistika", desc: "Tushum, sotuv trendi, ombor holati — boshqaruv panelingizda." },
        { title: "Mobil qulay interfeys", desc: "Telefon va planshетdan ham to'liq ishlaydi — ofisdan tashqarida ham." },
        { title: "O'z domeningiz", desc: "fg.yourapp.uz — har bir mijoz o'z subdomeni orqali kiradi." },
        { title: "Bir daqiqada sozlash", desc: "Texnik bilim kerak emas. Biznes egasi o'zi sozlaydi." },
      ],
    },
    pricing: {
      eyebrow: "Narxlar",
      title: "Oddiy va shaffof narxlar",
      sub: "Yashirin to'lovlar yo'q. Istalgan payt bekor qilish mumkin.",
      plans: [
        {
          name: "Starter", price: "Bepul", period: "", popular: false,
          desc: "Kichik biznes yoki sinab ko'rish uchun",
          features: [
            { ok: true,  t: "1 ta foydalanuvchi" },
            { ok: true,  t: "Barcha asosiy modullar" },
            { ok: true,  t: "500 ta yozuv/oy" },
            { ok: false, t: "Maxsus subdomen" },
            { ok: false, t: "Prioritet qo'llab-quvvatlash" },
          ],
          cta: "Bepul boshlash", style: "outline",
        },
        {
          name: "Pro", price: "99 000", period: "/oy", popular: true,
          desc: "O'sib borayotgan biznes uchun ideal",
          features: [
            { ok: true, t: "10 ta foydalanuvchi" },
            { ok: true, t: "Barcha modullar + kengaytmalar" },
            { ok: true, t: "Cheksiz yozuvlar" },
            { ok: true, t: "Maxsus subdomen" },
            { ok: false, t: "API integratsiya" },
          ],
          cta: "Pro ni boshlash", style: "primary",
        },
        {
          name: "Business", price: "299 000", period: "/oy", popular: false,
          desc: "Katta jamoa va tarmoq uchun",
          features: [
            { ok: true, t: "Cheksiz foydalanuvchilar" },
            { ok: true, t: "Maxsus modullar" },
            { ok: true, t: "Custom domen" },
            { ok: true, t: "7/24 qo'llab-quvvatlash" },
            { ok: true, t: "API + webhook" },
          ],
          cta: "Business ni boshlash", style: "outline",
        },
      ],
      note: "so'm",
    },
    cta: {
      title: "Bugun boshlang — birinchi oy bepul",
      sub: "O'zbekistondagi yuzlab bizneslar XM Asistent bilan vaqt va pul tejayapti. Siz ham qo'shiling.",
      btn1: "Bepul ro'yxatdan o'tish", btn2: "Tizimga kirish",
      note: "Kredit karta talab qilinmaydi",
    },
    footer: {
      desc: "O'zbekiston biznesiga mo'ljallangan zamonaviy CRM platformasi.",
      platform: "Platforma", access: "Kirish", contact: "Bog'lanish",
      links: { industries: "Sohalar", features: "Imkoniyatlar", pricing: "Narxlar" },
      access_links: { register: "Ro'yxatdan o'tish", login: "Tizimga kirish", admin: "Admin panel" },
      copy: "Barcha huquqlar himoyalangan.",
      made: "O'zbekiston uchun yaratilgan",
    },
  },

  ru: {
    nav: { features: "Возможности", industries: "Отрасли", pricing: "Цены", login: "Войти", start: "Начать бесплатно" },
    hero: {
      badge: "CRM платформа №1 в Узбекистане",
      h1a: "Забудьте о тетрадях —",
      h1b: "Оцифруйте свой бизнес",
      sub: "Бумажный учёт, потерянные данные, отсутствие контроля — всё это тормозит ваш бизнес. С XM Asistent всё в одном экране.",
      cta1: "Начать бесплатно",
      cta2: "Смотреть отрасли",
      stat1: "Тип отраслей", stat2: "Время настройки", stat3: "Время работы",
    },
    problems: {
      eyebrow: "Проблемы",
      title: "Узнаёте себя?",
      sub: "80% малого бизнеса Узбекистана до сих пор работает с бумажными тетрадями или Excel. Это потеря времени и денег.",
      items: [
        { title: "Потеря учёта", desc: "Сколько продаж сегодня? Что осталось на складе? Ответа нет." },
        { title: "Потеря времени", desc: "Часы записей, расчётов, отчётов вручную каждый день — это изматывает." },
        { title: "Нет контроля сотрудников", desc: "Кто пришёл, что продал, сколько взял — ничего не видно." },
        { title: "Нет базы клиентов", desc: "Вы не знаете постоянных клиентов и не можете их удержать." },
        { title: "Нет отчётности", desc: "В конце месяца прибыль или убыток — точно не посчитать." },
        { title: "Всё разрознено", desc: "Телефон, тетрадь, Excel — всё отдельно. Единой системы нет." },
      ],
    },
    solution: {
      eyebrow: "Решение",
      title: "XM Asistent — всё в одной системе",
      sub: "Зарегистрируйтесь, выберите отрасль — ваша CRM-система будет готова за одну минуту.",
      items: [
        { title: "Учёт в реальном времени", desc: "Каждая продажа, оплата, изменение на складе — мгновенно отображается." },
        { title: "Автоматические отчёты", desc: "Ежедневные, еженедельные, ежемесячные отчёты формируются автоматически." },
        { title: "Контроль сотрудников", desc: "Что сделал каждый сотрудник, сколько заработал — всё сохраняется." },
        { title: "База клиентов", desc: "Каждый клиент, его история, баллы лояльности — в одном месте навсегда." },
      ],
    },
    industries: {
      eyebrow: "Отрасли",
      title: "Для какой отрасли?",
      sub: "Специальные модули и роли для каждой отрасли — не универсальные, а точно настроенные.",
      items: [
        { name: "Магазин / Торговля", desc: "POS-касса, склад, клиенты, оплаты, отчёты.", chips: ["POS", "Склад", "Клиенты"] },
        { name: "Клиника", desc: "Пациенты, приёмы, рецепты, лаборатория, аптека.", chips: ["Пациенты", "Приёмы", "Рецепты"] },
        { name: "Учебный центр", desc: "Ученики, курсы, посещаемость, оплаты, расписание.", chips: ["Ученики", "Посещ.", "Оплата"] },
        { name: "Ресторан / Кафе", desc: "Меню, заказы, управление столиками, кухня.", chips: ["Меню", "Заказы", "Столики"] },
        { name: "Салон красоты", desc: "Мастера, услуги, записи, база клиентов.", chips: ["Мастера", "Записи", "Услуги"] },
        { name: "Фитнес / Спорт зал", desc: "Члены, абонементы, контроль входа, тренеры.", chips: ["Члены", "Абонемент", "Вход"] },
      ],
    },
    steps: {
      eyebrow: "Как это работает",
      title: "3 шага — CRM готова",
      items: [
        { n: "1", title: "Регистрация", desc: "Создайте аккаунт через email или Google за 30 секунд. Карта не нужна." },
        { n: "2", title: "Выберите отрасль", desc: "Магазин, клиника, ресторан — модули настраиваются автоматически." },
        { n: "3", title: "CRM готова!", desc: "Дашборд, модули, роли — всё работает. Добавьте сотрудников и начинайте." },
      ],
    },
    features: {
      eyebrow: "Возможности",
      title: "Всё необходимое для бизнеса",
      items: [
        { title: "Безопасность банковского уровня", desc: "JWT, OTP, Google OAuth, контроль сессий, ролевые разрешения." },
        { title: "Мультипользователь и роли", desc: "Админ, кассир, склад, врач — точные роли для каждой отрасли." },
        { title: "Статистика в реальном времени", desc: "Выручка, тренды продаж, склад — на панели управления." },
        { title: "Мобильный интерфейс", desc: "Полная работа с телефона и планшета — вне офиса тоже." },
        { title: "Свой домен", desc: "fg.yourapp.uz — каждый клиент входит через свой поддомен." },
        { title: "Настройка за минуту", desc: "Технических знаний не нужно. Владелец бизнеса настраивает сам." },
      ],
    },
    pricing: {
      eyebrow: "Цены",
      title: "Простые и прозрачные цены",
      sub: "Скрытых платежей нет. Отменить можно в любое время.",
      plans: [
        {
          name: "Starter", price: "Бесплатно", period: "", popular: false,
          desc: "Для малого бизнеса или пробного использования",
          features: [
            { ok: true,  t: "1 пользователь" },
            { ok: true,  t: "Все основные модули" },
            { ok: true,  t: "500 записей/мес" },
            { ok: false, t: "Свой поддомен" },
            { ok: false, t: "Приоритетная поддержка" },
          ],
          cta: "Начать бесплатно", style: "outline",
        },
        {
          name: "Pro", price: "99 000", period: "/мес", popular: true,
          desc: "Идеально для растущего бизнеса",
          features: [
            { ok: true, t: "10 пользователей" },
            { ok: true, t: "Все модули + расширения" },
            { ok: true, t: "Неограниченные записи" },
            { ok: true, t: "Свой поддомен" },
            { ok: false, t: "API-интеграция" },
          ],
          cta: "Начать Pro", style: "primary",
        },
        {
          name: "Business", price: "299 000", period: "/мес", popular: false,
          desc: "Для большой команды и сети",
          features: [
            { ok: true, t: "Неограниченные пользователи" },
            { ok: true, t: "Кастомные модули" },
            { ok: true, t: "Custom домен" },
            { ok: true, t: "Поддержка 7/24" },
            { ok: true, t: "API + webhook" },
          ],
          cta: "Начать Business", style: "outline",
        },
      ],
      note: "сум",
    },
    cta: {
      title: "Начните сегодня — первый месяц бесплатно",
      sub: "Сотни бизнесов в Узбекистане экономят время и деньги с XM Asistent. Присоединяйтесь.",
      btn1: "Зарегистрироваться бесплатно", btn2: "Войти в систему",
      note: "Кредитная карта не требуется",
    },
    footer: {
      desc: "Современная CRM-платформа для бизнеса Узбекистана.",
      platform: "Платформа", access: "Вход", contact: "Контакты",
      links: { industries: "Отрасли", features: "Возможности", pricing: "Цены" },
      access_links: { register: "Регистрация", login: "Войти", admin: "Админ-панель" },
      copy: "Все права защищены.",
      made: "Создано для Узбекистана",
    },
  },

  en: {
    nav: { features: "Features", industries: "Industries", pricing: "Pricing", login: "Sign In", start: "Start Free" },
    hero: {
      badge: "Uzbekistan's #1 SaaS CRM Platform",
      h1a: "Ditch the notebook —",
      h1b: "Digitize your business",
      sub: "Paper records, lost data, zero visibility — these slow your business down. With XM Asistent, everything is in one screen.",
      cta1: "Start for Free",
      cta2: "Browse Industries",
      stat1: "Industry types", stat2: "Setup time", stat3: "Uptime",
    },
    problems: {
      eyebrow: "Problems",
      title: "Sound familiar?",
      sub: "80% of small businesses in Uzbekistan still use paper notebooks or Excel. That's time and money lost every single day.",
      items: [
        { title: "Lost records", desc: "How many sales today? What's left in stock? No clear answer." },
        { title: "Time wasted", desc: "Hours of manual entries, calculations, reports every day — it's exhausting." },
        { title: "No staff visibility", desc: "Who came in, what they sold, how much they took — completely invisible." },
        { title: "No customer base", desc: "You don't know your repeat customers and can't retain them." },
        { title: "No reporting", desc: "At month's end, profit or loss — impossible to calculate precisely." },
        { title: "Everything fragmented", desc: "Phone, notebook, Excel — all separate. No single system." },
      ],
    },
    solution: {
      eyebrow: "Solution",
      title: "XM Asistent — everything in one system",
      sub: "Register, choose your industry — your CRM is ready in one minute.",
      items: [
        { title: "Real-time tracking", desc: "Every sale, payment, stock change — instantly visible on screen." },
        { title: "Automated reports", desc: "Daily, weekly, monthly reports generated automatically. You just review." },
        { title: "Staff accountability", desc: "What each employee did and earned — all stored in history." },
        { title: "Customer database", desc: "Every customer, their history, loyalty points — in one place, forever." },
      ],
    },
    industries: {
      eyebrow: "Industries",
      title: "Which industry are you in?",
      sub: "Dedicated modules and roles for each industry — purpose-built, not generic.",
      items: [
        { name: "Retail / Shop", desc: "POS cashier, warehouse, customers, payments, reports.", chips: ["POS", "Warehouse", "Customers"] },
        { name: "Clinic", desc: "Patients, appointments, prescriptions, laboratory, pharmacy.", chips: ["Patients", "Appointments", "Prescriptions"] },
        { name: "Education Center", desc: "Students, courses, attendance, payments, schedule.", chips: ["Students", "Attendance", "Payments"] },
        { name: "Restaurant / Café", desc: "Menu, orders, table management, kitchen display.", chips: ["Menu", "Orders", "Tables"] },
        { name: "Beauty Salon", desc: "Masters, services, appointments, customer base.", chips: ["Masters", "Appointments", "Services"] },
        { name: "Fitness / Gym", desc: "Members, subscriptions, access control, trainers.", chips: ["Members", "Plans", "Access"] },
      ],
    },
    steps: {
      eyebrow: "How it works",
      title: "3 steps — CRM ready",
      items: [
        { n: "1", title: "Create account", desc: "Sign up with email or Google in 30 seconds. No credit card needed." },
        { n: "2", title: "Choose industry", desc: "Retail, clinic, restaurant — modules are auto-configured instantly." },
        { n: "3", title: "CRM is ready!", desc: "Dashboard, modules, roles — all working. Add staff and start." },
      ],
    },
    features: {
      eyebrow: "Features",
      title: "Everything you need to run your business",
      items: [
        { title: "Bank-level security", desc: "JWT, OTP, Google OAuth, session control, role-based permissions." },
        { title: "Multi-user & roles", desc: "Admin, cashier, warehouse, doctor — precise roles per industry." },
        { title: "Real-time analytics", desc: "Revenue, sales trends, stock levels — on your dashboard." },
        { title: "Mobile-friendly", desc: "Full functionality on phone and tablet — work anywhere." },
        { title: "Your own domain", desc: "fg.yourapp.uz — every tenant gets their own subdomain." },
        { title: "One-minute setup", desc: "No technical knowledge needed. Business owner sets it up." },
      ],
    },
    pricing: {
      eyebrow: "Pricing",
      title: "Simple, transparent pricing",
      sub: "No hidden fees. Cancel anytime.",
      plans: [
        {
          name: "Starter", price: "Free", period: "", popular: false,
          desc: "For small businesses or trying it out",
          features: [
            { ok: true,  t: "1 user" },
            { ok: true,  t: "All core modules" },
            { ok: true,  t: "500 records/mo" },
            { ok: false, t: "Custom subdomain" },
            { ok: false, t: "Priority support" },
          ],
          cta: "Start Free", style: "outline",
        },
        {
          name: "Pro", price: "99 000", period: "/mo", popular: true,
          desc: "Ideal for growing businesses",
          features: [
            { ok: true, t: "10 users" },
            { ok: true, t: "All modules + extensions" },
            { ok: true, t: "Unlimited records" },
            { ok: true, t: "Custom subdomain" },
            { ok: false, t: "API integration" },
          ],
          cta: "Start Pro", style: "primary",
        },
        {
          name: "Business", price: "299 000", period: "/mo", popular: false,
          desc: "For large teams and networks",
          features: [
            { ok: true, t: "Unlimited users" },
            { ok: true, t: "Custom modules" },
            { ok: true, t: "Custom domain" },
            { ok: true, t: "24/7 support" },
            { ok: true, t: "API + webhooks" },
          ],
          cta: "Start Business", style: "outline",
        },
      ],
      note: "UZS",
    },
    cta: {
      title: "Start today — first month free",
      sub: "Hundreds of businesses in Uzbekistan save time and money with XM Asistent. Join them.",
      btn1: "Register for Free", btn2: "Sign In",
      note: "No credit card required",
    },
    footer: {
      desc: "A modern CRM platform built for Uzbekistan businesses.",
      platform: "Platform", access: "Access", contact: "Contact",
      links: { industries: "Industries", features: "Features", pricing: "Pricing" },
      access_links: { register: "Register", login: "Sign In", admin: "Admin Panel" },
      copy: "All rights reserved.",
      made: "Made for Uzbekistan",
    },
  },
};

// ── Industry icons ─────────────────────────────────────────────────────────────
const INDUSTRY_ICONS = [ShoppingCart, Stethoscope, GraduationCap, UtensilsCrossed, Sparkles, Dumbbell];
const INDUSTRY_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981'];

// ── Problem icons ──────────────────────────────────────────────────────────────
const PROBLEM_ICONS = [BookOpen, Clock, UserX, EyeOff, TrendingDown, AlertCircle];

// ── Feature icons ──────────────────────────────────────────────────────────────
const FEATURE_ICONS = [ShieldCheck, Users, BarChart3, Smartphone, Globe, Zap];
const FEATURE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];

// ── Solution icons ─────────────────────────────────────────────────────────────
const SOLUTION_ICONS = [BarChart3, Zap, Users, Globe];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Landing() {
  const [lang, setLang] = useState<Lang>('uz');
  const t = T[lang];

  const goRegister = () => { window.location.href = `${APP_URL}/register`; };
  const goLogin    = () => { window.location.href = `${APP_URL}/`; };
  const goAdmin    = () => { window.location.href = ADMIN_URL; };
  const scroll     = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <>
      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="container navbar-inner">
          <div className="logo">XM<span>Asistent</span></div>

          <ul className="navbar-links">
            <li><a onClick={() => scroll('industries')}>{t.nav.industries}</a></li>
            <li><a onClick={() => scroll('features')}>{t.nav.features}</a></li>
            <li><a onClick={() => scroll('pricing')}>{t.nav.pricing}</a></li>
          </ul>

          <div className="navbar-right">
            <div className="lang-switcher">
              {(['uz', 'ru', 'en'] as Lang[]).map(l => (
                <button
                  key={l}
                  className={`lang-btn${lang === l ? ' active' : ''}`}
                  onClick={() => setLang(l)}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <a className="nav-login" onClick={goLogin}>{t.nav.login}</a>
            <button className="btn-primary" onClick={goRegister}>{t.nav.start}</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-bg-orbs">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
        </div>
        <div className="container">
          <div className="hero-grid">
            <div className="hero-content">
              <div className="hero-badge">
                <span className="badge-dot" />
                {t.hero.badge}
              </div>
              <h1 className="hero-h1">
                {t.hero.h1a}<br />
                <span className="grad-text">{t.hero.h1b}</span>
              </h1>
              <p className="hero-sub">{t.hero.sub}</p>
              <div className="hero-actions">
                <button className="btn-primary btn-lg" onClick={goRegister}>
                  {t.hero.cta1} <ArrowRight size={16} />
                </button>
                <button className="btn-ghost btn-lg" onClick={() => scroll('industries')}>
                  {t.hero.cta2}
                </button>
              </div>
              <div className="hero-stats">
                <div className="stat"><span className="stat-n grad-text">7+</span><span className="stat-l">{t.hero.stat1}</span></div>
                <div className="stat-div" />
                <div className="stat"><span className="stat-n grad-text">1 min</span><span className="stat-l">{t.hero.stat2}</span></div>
                <div className="stat-div" />
                <div className="stat"><span className="stat-n grad-text">99.9%</span><span className="stat-l">{t.hero.stat3}</span></div>
              </div>
            </div>

            <div className="hero-visual">
              {/* Dashboard mock */}
              <div className="mock-card">
                <div className="mock-header">
                  <div className="mock-dot red" /><div className="mock-dot yellow" /><div className="mock-dot green" />
                  <span className="mock-title">Dashboard</span>
                </div>
                <div className="mock-stats-row">
                  {[
                    { l: lang === 'ru' ? 'Выручка' : lang === 'en' ? 'Revenue' : 'Tushum', v: '4 250 000', c: '#10b981' },
                    { l: lang === 'ru' ? 'Продажи' : lang === 'en' ? 'Sales' : 'Sotuv', v: '128', c: '#6366f1' },
                    { l: lang === 'ru' ? 'Клиенты' : lang === 'en' ? 'Clients' : 'Mijozlar', v: '47', c: '#f59e0b' },
                  ].map(s => (
                    <div className="mock-stat" key={s.l}>
                      <div className="mock-stat-v" style={{ color: s.c }}>{s.v}</div>
                      <div className="mock-stat-l">{s.l}</div>
                    </div>
                  ))}
                </div>
                <div className="mock-chart">
                  {[40, 65, 45, 80, 55, 95, 70, 85, 60, 100, 75, 90].map((h, i) => (
                    <div key={i} className="mock-bar" style={{ height: `${h}%`, background: i === 9 ? '#6366f1' : 'rgba(99,102,241,0.3)' }} />
                  ))}
                </div>
              </div>

              <div className="mock-row">
                <div className="mock-mini">
                  <ShieldCheck size={18} color="#10b981" />
                  <span>{lang === 'ru' ? 'SSL защита' : lang === 'en' ? 'SSL secured' : 'SSL himoya'}</span>
                </div>
                <div className="mock-mini">
                  <Smartphone size={18} color="#6366f1" />
                  <span>{lang === 'ru' ? 'Мобильный' : lang === 'en' ? 'Mobile ready' : 'Mobil qulay'}</span>
                </div>
                <div className="mock-mini">
                  <Zap size={18} color="#f59e0b" />
                  <span>{lang === 'ru' ? '1 минута' : lang === 'en' ? '1 minute' : '1 daqiqa'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Problems ── */}
      <section className="section problems-section" id="problems">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow red">{t.problems.eyebrow}</div>
            <h2 className="section-title">{t.problems.title}</h2>
            <p className="section-sub">{t.problems.sub}</p>
          </div>
          <div className="problems-grid">
            {t.problems.items.map((item, i) => {
              const Icon = PROBLEM_ICONS[i];
              return (
                <div className="problem-card" key={i}>
                  <div className="problem-icon"><Icon size={20} /></div>
                  <div>
                    <div className="problem-title">{item.title}</div>
                    <div className="problem-desc">{item.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Solution ── */}
      <section className="section solution-section" id="solution">
        <div className="container">
          <div className="sol-layout">
            <div className="sol-left">
              <div className="eyebrow green">{t.solution.eyebrow}</div>
              <h2 className="section-title">{t.solution.title}</h2>
              <p className="section-sub">{t.solution.sub}</p>
              <button className="btn-primary btn-lg" onClick={goRegister} style={{ marginTop: '2rem' }}>
                {t.hero.cta1} <ChevronRight size={16} />
              </button>
            </div>
            <div className="sol-right">
              {t.solution.items.map((item, i) => {
                const Icon = SOLUTION_ICONS[i] ?? BarChart3;
                return (
                  <div className="sol-item" key={i}>
                    <div className="sol-icon"><Icon size={20} /></div>
                    <div>
                      <div className="sol-title">{item.title}</div>
                      <div className="sol-desc">{item.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Industries ── */}
      <section className="section" id="industries">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">{t.industries.eyebrow}</div>
            <h2 className="section-title">{t.industries.title}</h2>
            <p className="section-sub">{t.industries.sub}</p>
          </div>
          <div className="industries-grid">
            {t.industries.items.map((ind, i) => {
              const Icon = INDUSTRY_ICONS[i];
              const color = INDUSTRY_COLORS[i];
              return (
                <div className="ind-card" key={i}>
                  <div className="ind-icon" style={{ background: `${color}1a`, color }}>
                    <Icon size={22} />
                  </div>
                  <div className="ind-name">{ind.name}</div>
                  <div className="ind-desc">{ind.desc}</div>
                  <div className="ind-chips">
                    {ind.chips.map(c => <span className="chip" key={c}>{c}</span>)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Steps ── */}
      <section className="section steps-section" id="how">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">{t.steps.eyebrow}</div>
            <h2 className="section-title">{t.steps.title}</h2>
          </div>
          <div className="steps-grid">
            {t.steps.items.map((step, i) => (
              <div className="step-card" key={i}>
                <div className="step-num">{step.n}</div>
                {i < 2 && <div className="step-arrow"><ChevronRight size={20} /></div>}
                <div className="step-title">{step.title}</div>
                <div className="step-desc">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="section" id="features">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">{t.features.eyebrow}</div>
            <h2 className="section-title">{t.features.title}</h2>
          </div>
          <div className="features-grid">
            {t.features.items.map((f, i) => {
              const Icon = FEATURE_ICONS[i];
              const color = FEATURE_COLORS[i];
              return (
                <div className="feat-card" key={i}>
                  <div className="feat-icon" style={{ background: `${color}1a`, color }}>
                    <Icon size={20} />
                  </div>
                  <div className="feat-title">{f.title}</div>
                  <div className="feat-desc">{f.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="section pricing-section" id="pricing">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">{t.pricing.eyebrow}</div>
            <h2 className="section-title">{t.pricing.title}</h2>
            <p className="section-sub">{t.pricing.sub}</p>
          </div>
          <div className="pricing-grid">
            {t.pricing.plans.map((plan, i) => (
              <div className={`price-card${plan.popular ? ' price-card--popular' : ''}`} key={i}>
                {plan.popular && <div className="popular-badge">
                  {lang === 'ru' ? 'ПОПУЛЯРНЫЙ' : lang === 'en' ? 'MOST POPULAR' : 'ENG MASHHUR'}
                </div>}
                <div className="price-plan">{plan.name}</div>
                <div className="price-amount">
                  {plan.price === 'Bepul' || plan.price === 'Бесплатно' || plan.price === 'Free' ? (
                    <span className="grad-text">{plan.price}</span>
                  ) : (
                    <>
                      <span className="grad-text">{plan.price}</span>
                      <span className="price-note"> {t.pricing.note}</span>
                    </>
                  )}
                </div>
                {plan.period && <div className="price-period">{plan.period}</div>}
                <div className="price-desc">{plan.desc}</div>
                <ul className="price-features">
                  {plan.features.map((f, j) => (
                    <li key={j} className={`price-feature${f.ok ? '' : ' muted'}`}>
                      {f.ok
                        ? <Check size={14} className="icon-check" />
                        : <X size={14} className="icon-x" />
                      }
                      {f.t}
                    </li>
                  ))}
                </ul>
                <button
                  className={`btn-price${plan.style === 'primary' ? ' btn-price--primary' : ''}`}
                  onClick={goRegister}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="cta-orb" />
        <div className="container">
          <div className="cta-inner">
            <h2 className="cta-title">
              {t.cta.title.split(' — ')[0]} —{' '}
              <span className="grad-text">{t.cta.title.split(' — ')[1]}</span>
            </h2>
            <p className="cta-sub">{t.cta.sub}</p>
            <div className="cta-actions">
              <button className="btn-primary btn-lg" onClick={goRegister}>
                {t.cta.btn1} <ArrowRight size={16} />
              </button>
              <button className="btn-ghost btn-lg" onClick={goLogin}>
                {t.cta.btn2}
              </button>
            </div>
            <p className="cta-note">{t.cta.note}</p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer" id="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <div className="logo" style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
                XM<span>Asistent</span>
              </div>
              <p className="footer-desc">{t.footer.desc}</p>
            </div>
            <div>
              <div className="footer-col-title">{t.footer.platform}</div>
              <ul className="footer-links">
                <li><a onClick={() => scroll('industries')}>{t.footer.links.industries}</a></li>
                <li><a onClick={() => scroll('features')}>{t.footer.links.features}</a></li>
                <li><a onClick={() => scroll('pricing')}>{t.footer.links.pricing}</a></li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">{t.footer.access}</div>
              <ul className="footer-links">
                <li><a onClick={goRegister}>{t.footer.access_links.register}</a></li>
                <li><a onClick={goLogin}>{t.footer.access_links.login}</a></li>
                <li><a onClick={goAdmin}>{t.footer.access_links.admin}</a></li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">{t.footer.contact}</div>
              <ul className="footer-links">
                <li><a href="mailto:support@xmasistent.uz">support@xmasistent.uz</a></li>
                <li><a href="https://t.me/xmasistent" target="_blank" rel="noopener noreferrer">Telegram</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 XM Asistent. {t.footer.copy}</span>
            <span>{t.footer.made}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
