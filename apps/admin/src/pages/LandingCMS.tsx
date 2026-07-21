import { useCallback, useEffect, useRef, useState } from 'react';
import { Save, Globe, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../api/axios';

// ── Default content (same structure as Landing.tsx T object) ─────────────────

const DEFAULT_CONTENT = {
  uz: {
    nav: { features: "Imkoniyatlar", industries: "Sohalar", pricing: "Narxlar", login: "Kirish", start: "Bepul boshlash" },
    hero: {
      badge: "O'zbekiston #1 SaaS CRM platformasi",
      h1a: "Daftardan voz keching —",
      h1b: "Biznesingizni raqamlashtiring",
      sub: "Qog'oz hisobi, yo'qolgan ma'lumotlar, nazorat yo'qligi — bularning barchasi biznesingizni orqaga tortadi. XM Asistent bilan hamma narsa bir ekranda.",
      cta1: "Bepul boshlash", cta2: "Sohalarni ko'rish",
      stat1: "Soha turi", stat2: "Sozlash vaqti", stat3: "Ishlash vaqti",
    },
    problems: {
      eyebrow: "Muammolar", title: "Siz ham shu muammolarga duch keldingizmi?",
      sub: "O'zbekistondagi 80% kichik biznes hali ham qog'oz daftar yoki Excel bilan ishlaydi.",
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
      eyebrow: "Yechim", title: "XM Asistent — barchasi bir tizimda",
      sub: "Ro'yxatdan o'ting, sohangizni tanlang — CRM tizimingiz bir daqiqada tayyor bo'ladi.",
      items: [
        { title: "Real vaqt hisobi", desc: "Har bir sotuv, to'lov, ombor o'zgarishi — darhol ekranda ko'rinadi." },
        { title: "Avtomatik hisobotlar", desc: "Kunlik, haftalik, oylik hisobotlar avtomatik tuziladi. Siz faqat qarasiz." },
        { title: "Xodim nazorati", desc: "Har bir xodim nima qildi, qancha ishlab topdi — barchasi tarix sifatida saqlanadi." },
        { title: "Mijozlar bazasi", desc: "Har bir mijoz, uning tarixi, sodiqlik balli — bir joyda, abadiy." },
      ],
    },
    industries: {
      eyebrow: "Sohalar", title: "Qaysi soha uchun?",
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
      eyebrow: "Qanday ishlaydi", title: "3 qadam — CRM tayyor",
      items: [
        { n: "1", title: "Ro'yxatdan o'ting", desc: "Email yoki Google orqali 30 soniyada hisob oching. Kredit karta shart emas." },
        { n: "2", title: "Sohangizni tanlang", desc: "Savdo, klinika, restoran yoki boshqa — modullar avtomatik sozlanadi." },
        { n: "3", title: "CRM tayyor!", desc: "Dashboard, modullar, rollar — hammasi ishlaydi. Xodimlarni qo'shing va boshlang." },
      ],
    },
    features: {
      eyebrow: "Imkoniyatlar", title: "Sizga kerak bo'lgan hamma narsa",
      items: [
        { title: "Bank darajasida xavfsizlik", desc: "JWT, OTP, Google OAuth, sessiya nazorati, rol-asosiy ruxsatlar." },
        { title: "Ko'p foydalanuvchi va rollar", desc: "Admin, kassir, ombor, shifokor — har soha uchun aniq rollar." },
        { title: "Real vaqt statistika", desc: "Tushum, sotuv trendi, ombor holati — boshqaruv panelingizda." },
        { title: "Mobil qulay interfeys", desc: "Telefon va planshetdan ham to'liq ishlaydi — ofisdan tashqarida ham." },
        { title: "O'z domeningiz", desc: "fg.yourapp.uz — har bir mijoz o'z subdomeni orqali kiradi." },
        { title: "Bir daqiqada sozlash", desc: "Texnik bilim kerak emas. Biznes egasi o'zi sozlaydi." },
      ],
    },
    pricing: {
      eyebrow: "Narxlar", title: "Oddiy va shaffof narxlar",
      sub: "Yashirin to'lovlar yo'q. Istalgan payt bekor qilish mumkin.",
      note: "so'm",
      plans: [
        { name: "Starter", price: "Bepul", period: "", popular: false, desc: "Kichik biznes yoki sinab ko'rish uchun", cta: "Bepul boshlash", style: "outline",
          features: [{ ok: true, t: "1 ta foydalanuvchi" }, { ok: true, t: "Barcha asosiy modullar" }, { ok: true, t: "500 ta yozuv/oy" }, { ok: false, t: "Maxsus subdomen" }, { ok: false, t: "Prioritet qo'llab-quvvatlash" }] },
        { name: "Pro", price: "99 000", period: "/oy", popular: true, desc: "O'sib borayotgan biznes uchun ideal", cta: "Pro ni boshlash", style: "primary",
          features: [{ ok: true, t: "10 ta foydalanuvchi" }, { ok: true, t: "Barcha modullar + kengaytmalar" }, { ok: true, t: "Cheksiz yozuvlar" }, { ok: true, t: "Maxsus subdomen" }, { ok: false, t: "API integratsiya" }] },
        { name: "Business", price: "299 000", period: "/oy", popular: false, desc: "Katta jamoa va tarmoq uchun", cta: "Business ni boshlash", style: "outline",
          features: [{ ok: true, t: "Cheksiz foydalanuvchilar" }, { ok: true, t: "Maxsus modullar" }, { ok: true, t: "Custom domen" }, { ok: true, t: "7/24 qo'llab-quvvatlash" }, { ok: true, t: "API + webhook" }] },
      ],
    },
    cta: { title: "Bugun boshlang — birinchi oy bepul", sub: "O'zbekistondagi yuzlab bizneslar XM Asistent bilan vaqt va pul tejayapti. Siz ham qo'shiling.", btn1: "Bepul ro'yxatdan o'tish", btn2: "Tizimga kirish", note: "Kredit karta talab qilinmaydi" },
    footer: { desc: "O'zbekiston biznesiga mo'ljallangan zamonaviy CRM platformasi.", platform: "Platforma", access: "Kirish", contact: "Bog'lanish", links: { industries: "Sohalar", features: "Imkoniyatlar", pricing: "Narxlar" }, access_links: { register: "Ro'yxatdan o'tish", login: "Tizimga kirish", admin: "Admin panel" }, copy: "Barcha huquqlar himoyalangan.", made: "O'zbekiston uchun yaratilgan" },
  },
  ru: {
    nav: { features: "Возможности", industries: "Отрасли", pricing: "Цены", login: "Войти", start: "Начать бесплатно" },
    hero: { badge: "CRM платформа №1 в Узбекистане", h1a: "Забудьте о тетрадях —", h1b: "Оцифруйте свой бизнес", sub: "Бумажный учёт, потерянные данные, отсутствие контроля — всё это тормозит ваш бизнес.", cta1: "Начать бесплатно", cta2: "Смотреть отрасли", stat1: "Тип отраслей", stat2: "Время настройки", stat3: "Время работы" },
    problems: { eyebrow: "Проблемы", title: "Узнаёте себя?", sub: "80% малого бизнеса Узбекистана до сих пор работает с бумажными тетрадями или Excel.",
      items: [{ title: "Потеря учёта", desc: "Сколько продаж сегодня? Что осталось на складе? Ответа нет." }, { title: "Потеря времени", desc: "Часы записей, расчётов, отчётов вручную каждый день — это изматывает." }, { title: "Нет контроля сотрудников", desc: "Кто пришёл, что продал, сколько взял — ничего не видно." }, { title: "Нет базы клиентов", desc: "Вы не знаете постоянных клиентов и не можете их удержать." }, { title: "Нет отчётности", desc: "В конце месяца прибыль или убыток — точно не посчитать." }, { title: "Всё разрознено", desc: "Телефон, тетрадь, Excel — всё отдельно. Единой системы нет." }] },
    solution: { eyebrow: "Решение", title: "XM Asistent — всё в одной системе", sub: "Зарегистрируйтесь, выберите отрасль — ваша CRM-система будет готова за одну минуту.",
      items: [{ title: "Учёт в реальном времени", desc: "Каждая продажа, оплата, изменение на складе — мгновенно отображается." }, { title: "Автоматические отчёты", desc: "Ежедневные, еженедельные, ежемесячные отчёты формируются автоматически." }, { title: "Контроль сотрудников", desc: "Что сделал каждый сотрудник, сколько заработал — всё сохраняется." }, { title: "База клиентов", desc: "Каждый клиент, его история, баллы лояльности — в одном месте навсегда." }] },
    industries: { eyebrow: "Отрасли", title: "Для какой отрасли?", sub: "Специальные модули и роли для каждой отрасли — не универсальные, а точно настроенные.",
      items: [{ name: "Магазин / Торговля", desc: "POS-касса, склад, клиенты, оплаты, отчёты.", chips: ["POS", "Склад", "Клиенты"] }, { name: "Клиника", desc: "Пациенты, приёмы, рецепты, лаборатория, аптека.", chips: ["Пациенты", "Приёмы", "Рецепты"] }, { name: "Учебный центр", desc: "Ученики, курсы, посещаемость, оплаты, расписание.", chips: ["Ученики", "Посещ.", "Оплата"] }, { name: "Ресторан / Кафе", desc: "Меню, заказы, управление столиками, кухня.", chips: ["Меню", "Заказы", "Столики"] }, { name: "Салон красоты", desc: "Мастера, услуги, записи, база клиентов.", chips: ["Мастера", "Записи", "Услуги"] }, { name: "Фитнес / Спорт зал", desc: "Члены, абонементы, контроль входа, тренеры.", chips: ["Члены", "Абонемент", "Вход"] }] },
    steps: { eyebrow: "Как это работает", title: "3 шага — CRM готова",
      items: [{ n: "1", title: "Регистрация", desc: "Создайте аккаунт через email или Google за 30 секунд. Карта не нужна." }, { n: "2", title: "Выберите отрасль", desc: "Магазин, клиника, ресторан — модули настраиваются автоматически." }, { n: "3", title: "CRM готова!", desc: "Дашборд, модули, роли — всё работает. Добавьте сотрудников и начинайте." }] },
    features: { eyebrow: "Возможности", title: "Всё необходимое для бизнеса",
      items: [{ title: "Безопасность банковского уровня", desc: "JWT, OTP, Google OAuth, контроль сессий, ролевые разрешения." }, { title: "Мультипользователь и роли", desc: "Админ, кассир, склад, врач — точные роли для каждой отрасли." }, { title: "Статистика в реальном времени", desc: "Выручка, тренды продаж, склад — на панели управления." }, { title: "Мобильный интерфейс", desc: "Полная работа с телефона и планшета — вне офиса тоже." }, { title: "Свой домен", desc: "fg.yourapp.uz — каждый клиент входит через свой поддомен." }, { title: "Настройка за минуту", desc: "Технических знаний не нужно. Владелец бизнеса настраивает сам." }] },
    pricing: { eyebrow: "Цены", title: "Простые и прозрачные цены", sub: "Скрытых платежей нет. Отменить можно в любое время.", note: "сум",
      plans: [
        { name: "Starter", price: "Бесплатно", period: "", popular: false, desc: "Для малого бизнеса или пробного использования", cta: "Начать бесплатно", style: "outline", features: [{ ok: true, t: "1 пользователь" }, { ok: true, t: "Все основные модули" }, { ok: true, t: "500 записей/мес" }, { ok: false, t: "Свой поддомен" }, { ok: false, t: "Приоритетная поддержка" }] },
        { name: "Pro", price: "99 000", period: "/мес", popular: true, desc: "Идеально для растущего бизнеса", cta: "Начать Pro", style: "primary", features: [{ ok: true, t: "10 пользователей" }, { ok: true, t: "Все модули + расширения" }, { ok: true, t: "Неограниченные записи" }, { ok: true, t: "Свой поддомен" }, { ok: false, t: "API-интеграция" }] },
        { name: "Business", price: "299 000", period: "/мес", popular: false, desc: "Для большой команды и сети", cta: "Начать Business", style: "outline", features: [{ ok: true, t: "Неограниченные пользователи" }, { ok: true, t: "Кастомные модули" }, { ok: true, t: "Custom домен" }, { ok: true, t: "Поддержка 7/24" }, { ok: true, t: "API + webhook" }] },
      ] },
    cta: { title: "Начните сегодня — первый месяц бесплатно", sub: "Сотни бизнесов в Узбекистане экономят время и деньги с XM Asistent. Присоединяйтесь.", btn1: "Зарегистрироваться бесплатно", btn2: "Войти в систему", note: "Кредитная карта не требуется" },
    footer: { desc: "Современная CRM-платформа для бизнеса Узбекистана.", platform: "Платформа", access: "Вход", contact: "Контакты", links: { industries: "Отрасли", features: "Возможности", pricing: "Цены" }, access_links: { register: "Регистрация", login: "Войти", admin: "Админ-панель" }, copy: "Все права защищены.", made: "Создано для Узбекистана" },
  },
  en: {
    nav: { features: "Features", industries: "Industries", pricing: "Pricing", login: "Sign In", start: "Start Free" },
    hero: { badge: "Uzbekistan's #1 SaaS CRM Platform", h1a: "Ditch the notebook —", h1b: "Digitize your business", sub: "Paper records, lost data, zero visibility — these slow your business down. With XM Asistent, everything is in one screen.", cta1: "Start for Free", cta2: "Browse Industries", stat1: "Industry types", stat2: "Setup time", stat3: "Uptime" },
    problems: { eyebrow: "Problems", title: "Sound familiar?", sub: "80% of small businesses in Uzbekistan still use paper notebooks or Excel. That's time and money lost every single day.",
      items: [{ title: "Lost records", desc: "How many sales today? What's left in stock? No clear answer." }, { title: "Time wasted", desc: "Hours of manual entries, calculations, reports every day — it's exhausting." }, { title: "No staff visibility", desc: "Who came in, what they sold, how much they took — completely invisible." }, { title: "No customer base", desc: "You don't know your repeat customers and can't retain them." }, { title: "No reporting", desc: "At month's end, profit or loss — impossible to calculate precisely." }, { title: "Everything fragmented", desc: "Phone, notebook, Excel — all separate. No single system." }] },
    solution: { eyebrow: "Solution", title: "XM Asistent — everything in one system", sub: "Register, choose your industry — your CRM is ready in one minute.",
      items: [{ title: "Real-time tracking", desc: "Every sale, payment, stock change — instantly visible on screen." }, { title: "Automated reports", desc: "Daily, weekly, monthly reports generated automatically. You just review." }, { title: "Staff accountability", desc: "What each employee did and earned — all stored in history." }, { title: "Customer database", desc: "Every customer, their history, loyalty points — in one place, forever." }] },
    industries: { eyebrow: "Industries", title: "Which industry are you in?", sub: "Dedicated modules and roles for each industry — purpose-built, not generic.",
      items: [{ name: "Retail / Shop", desc: "POS cashier, warehouse, customers, payments, reports.", chips: ["POS", "Warehouse", "Customers"] }, { name: "Clinic", desc: "Patients, appointments, prescriptions, laboratory, pharmacy.", chips: ["Patients", "Appointments", "Prescriptions"] }, { name: "Education Center", desc: "Students, courses, attendance, payments, schedule.", chips: ["Students", "Attendance", "Payments"] }, { name: "Restaurant / Café", desc: "Menu, orders, table management, kitchen display.", chips: ["Menu", "Orders", "Tables"] }, { name: "Beauty Salon", desc: "Masters, services, appointments, customer base.", chips: ["Masters", "Appointments", "Services"] }, { name: "Fitness / Gym", desc: "Members, subscriptions, access control, trainers.", chips: ["Members", "Plans", "Access"] }] },
    steps: { eyebrow: "How it works", title: "3 steps — CRM ready",
      items: [{ n: "1", title: "Create account", desc: "Sign up with email or Google in 30 seconds. No credit card needed." }, { n: "2", title: "Choose industry", desc: "Retail, clinic, restaurant — modules are auto-configured instantly." }, { n: "3", title: "CRM is ready!", desc: "Dashboard, modules, roles — all working. Add staff and start." }] },
    features: { eyebrow: "Features", title: "Everything you need to run your business",
      items: [{ title: "Bank-level security", desc: "JWT, OTP, Google OAuth, session control, role-based permissions." }, { title: "Multi-user & roles", desc: "Admin, cashier, warehouse, doctor — precise roles per industry." }, { title: "Real-time analytics", desc: "Revenue, sales trends, stock levels — on your dashboard." }, { title: "Mobile-friendly", desc: "Full functionality on phone and tablet — work anywhere." }, { title: "Your own domain", desc: "fg.yourapp.uz — every tenant gets their own subdomain." }, { title: "One-minute setup", desc: "No technical knowledge needed. Business owner sets it up." }] },
    pricing: { eyebrow: "Pricing", title: "Simple, transparent pricing", sub: "No hidden fees. Cancel anytime.", note: "UZS",
      plans: [
        { name: "Starter", price: "Free", period: "", popular: false, desc: "For small businesses or trying it out", cta: "Start Free", style: "outline", features: [{ ok: true, t: "1 user" }, { ok: true, t: "All core modules" }, { ok: true, t: "500 records/mo" }, { ok: false, t: "Custom subdomain" }, { ok: false, t: "Priority support" }] },
        { name: "Pro", price: "99 000", period: "/mo", popular: true, desc: "Ideal for growing businesses", cta: "Start Pro", style: "primary", features: [{ ok: true, t: "10 users" }, { ok: true, t: "All modules + extensions" }, { ok: true, t: "Unlimited records" }, { ok: true, t: "Custom subdomain" }, { ok: false, t: "API integration" }] },
        { name: "Business", price: "299 000", period: "/mo", popular: false, desc: "For large teams and networks", cta: "Start Business", style: "outline", features: [{ ok: true, t: "Unlimited users" }, { ok: true, t: "Custom modules" }, { ok: true, t: "Custom domain" }, { ok: true, t: "24/7 support" }, { ok: true, t: "API + webhooks" }] },
      ] },
    cta: { title: "Start today — first month free", sub: "Hundreds of businesses in Uzbekistan save time and money with XM Asistent. Join them.", btn1: "Register for Free", btn2: "Sign In", note: "No credit card required" },
    footer: { desc: "A modern CRM platform built for Uzbekistan businesses.", platform: "Platform", access: "Access", contact: "Contact", links: { industries: "Industries", features: "Features", pricing: "Pricing" }, access_links: { register: "Register", login: "Sign In", admin: "Admin Panel" }, copy: "All rights reserved.", made: "Made for Uzbekistan" },
  },
};

type Lang = 'uz' | 'ru' | 'en';
type Content = typeof DEFAULT_CONTENT;

// ── Helpers ───────────────────────────────────────────────────────────────────

function deepMerge(defaults: Content, override: Record<string, unknown>): Content {
  try {
    return JSON.parse(JSON.stringify({ ...defaults, ...override })) as Content;
  } catch {
    return defaults;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Field({ label, value, onChange, multiline = false }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean;
}) {
  return (
    <div className="cms-field">
      <label className="cms-label">{label}</label>
      {multiline ? (
        <textarea className="cms-input cms-textarea" value={value} onChange={e => onChange(e.target.value)} rows={3} />
      ) : (
        <input className="cms-input" value={value} onChange={e => onChange(e.target.value)} />
      )}
    </div>
  );
}

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="cms-accordion">
      <button className="cms-accordion-hdr" onClick={() => setOpen(o => !o)}>
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        {title}
      </button>
      {open && <div className="cms-accordion-body">{children}</div>}
    </div>
  );
}

// ── Section Editors ───────────────────────────────────────────────────────────

function NavEditor({ data, onChange }: { data: Content['uz']['nav']; onChange: (d: Content['uz']['nav']) => void }) {
  const f = (k: keyof typeof data) => (v: string) => onChange({ ...data, [k]: v });
  return (
    <div className="cms-fields-row">
      <Field label="Sohalar" value={data.industries} onChange={f('industries')} />
      <Field label="Imkoniyatlar" value={data.features} onChange={f('features')} />
      <Field label="Narxlar" value={data.pricing} onChange={f('pricing')} />
      <Field label="Kirish" value={data.login} onChange={f('login')} />
      <Field label="Boshlash (CTA)" value={data.start} onChange={f('start')} />
    </div>
  );
}

function HeroEditor({ data, onChange }: { data: Content['uz']['hero']; onChange: (d: Content['uz']['hero']) => void }) {
  const f = (k: keyof typeof data) => (v: string) => onChange({ ...data, [k]: v });
  return (
    <>
      <Field label="Badge matni" value={data.badge} onChange={f('badge')} />
      <div className="cms-fields-row">
        <Field label="Sarlavha 1-qism" value={data.h1a} onChange={f('h1a')} />
        <Field label="Sarlavha 2-qism (gradient)" value={data.h1b} onChange={f('h1b')} />
      </div>
      <Field label="Tavsif" value={data.sub} onChange={f('sub')} multiline />
      <div className="cms-fields-row">
        <Field label="CTA tugma 1" value={data.cta1} onChange={f('cta1')} />
        <Field label="CTA tugma 2" value={data.cta2} onChange={f('cta2')} />
      </div>
      <div className="cms-fields-row">
        <Field label="Statistika 1" value={data.stat1} onChange={f('stat1')} />
        <Field label="Statistika 2" value={data.stat2} onChange={f('stat2')} />
        <Field label="Statistika 3" value={data.stat3} onChange={f('stat3')} />
      </div>
    </>
  );
}

function ItemListEditor({ data, onChange, hasName = false }: {
  data: Array<{ title?: string; desc: string; name?: string }>;
  onChange: (d: typeof data) => void;
  hasName?: boolean;
}) {
  const update = (i: number, k: string, v: string) => {
    const next = data.map((item, idx) => idx === i ? { ...item, [k]: v } : item);
    onChange(next);
  };
  return (
    <>
      {data.map((item, i) => (
        <Accordion key={i} title={`${i + 1}. ${item.name ?? item.title ?? ''}`}>
          <div className="cms-fields-row">
            {hasName
              ? <Field label="Nomi" value={item.name ?? ''} onChange={v => update(i, 'name', v)} />
              : <Field label="Sarlavha" value={item.title ?? ''} onChange={v => update(i, 'title', v)} />
            }
          </div>
          <Field label="Tavsif" value={item.desc} onChange={v => update(i, 'desc', v)} multiline />
        </Accordion>
      ))}
    </>
  );
}

function IndustriesEditor({ data, onChange }: {
  data: Content['uz']['industries'];
  onChange: (d: Content['uz']['industries']) => void;
}) {
  const updateItem = (i: number, k: string, v: string) => {
    const items = data.items.map((item, idx) => idx === i ? { ...item, [k]: v } : item);
    onChange({ ...data, items });
  };
  const updateChip = (i: number, ci: number, v: string) => {
    const items = data.items.map((item, idx) => {
      if (idx !== i) return item;
      const chips = item.chips.map((c, cj) => cj === ci ? v : c);
      return { ...item, chips };
    });
    onChange({ ...data, items });
  };
  const f = (k: keyof typeof data) => (v: string) => onChange({ ...data, [k]: v });

  return (
    <>
      <div className="cms-fields-row">
        <Field label="Eyebrow" value={data.eyebrow} onChange={f('eyebrow')} />
        <Field label="Sarlavha" value={data.title} onChange={f('title')} />
      </div>
      <Field label="Tavsif" value={data.sub} onChange={f('sub')} multiline />
      {data.items.map((item, i) => (
        <Accordion key={i} title={`${i + 1}. ${item.name}`}>
          <Field label="Nomi" value={item.name} onChange={v => updateItem(i, 'name', v)} />
          <Field label="Tavsif" value={item.desc} onChange={v => updateItem(i, 'desc', v)} multiline />
          <div className="cms-fields-row">
            {item.chips.map((c, ci) => (
              <Field key={ci} label={`Chip ${ci + 1}`} value={c} onChange={v => updateChip(i, ci, v)} />
            ))}
          </div>
        </Accordion>
      ))}
    </>
  );
}

function PricingEditor({ data, onChange }: {
  data: Content['uz']['pricing'];
  onChange: (d: Content['uz']['pricing']) => void;
}) {
  const f = (k: keyof Omit<typeof data, 'plans'>) => (v: string) => onChange({ ...data, [k]: v });
  const updatePlan = (pi: number, k: string, v: string | boolean) => {
    const plans = data.plans.map((p, idx) => idx === pi ? { ...p, [k]: v } : p);
    onChange({ ...data, plans });
  };
  const updateFeature = (pi: number, fi: number, k: 'ok' | 't', v: string | boolean) => {
    const plans = data.plans.map((p, idx) => {
      if (idx !== pi) return p;
      const features = p.features.map((f, fj) => fj === fi ? { ...f, [k]: v } : f);
      return { ...p, features };
    });
    onChange({ ...data, plans });
  };

  return (
    <>
      <div className="cms-fields-row">
        <Field label="Eyebrow" value={data.eyebrow} onChange={f('eyebrow')} />
        <Field label="Sarlavha" value={data.title} onChange={f('title')} />
        <Field label="Valyuta birlik" value={data.note} onChange={f('note')} />
      </div>
      <Field label="Tavsif" value={data.sub} onChange={f('sub')} multiline />
      {data.plans.map((plan, pi) => (
        <Accordion key={pi} title={`Plan: ${plan.name}`}>
          <div className="cms-fields-row">
            <Field label="Nomi" value={plan.name} onChange={v => updatePlan(pi, 'name', v)} />
            <Field label="Narx" value={plan.price} onChange={v => updatePlan(pi, 'price', v)} />
            <Field label="Davr (/oy)" value={plan.period} onChange={v => updatePlan(pi, 'period', v)} />
          </div>
          <div className="cms-fields-row">
            <Field label="Tavsif" value={plan.desc} onChange={v => updatePlan(pi, 'desc', v)} />
            <Field label="CTA matni" value={plan.cta} onChange={v => updatePlan(pi, 'cta', v)} />
          </div>
          <label className="cms-checkbox">
            <input type="checkbox" checked={plan.popular} onChange={e => updatePlan(pi, 'popular', e.target.checked)} />
            Mashhur badge (eng ko'p tanlanadi)
          </label>
          <div className="cms-sub-section">
            <div className="cms-sub-title">Xususiyatlar</div>
            {plan.features.map((feat, fi) => (
              <div key={fi} className="cms-feature-row">
                <label className="cms-checkbox-sm">
                  <input type="checkbox" checked={feat.ok} onChange={e => updateFeature(pi, fi, 'ok', e.target.checked)} />
                </label>
                <input className="cms-input cms-input-sm" value={feat.t} onChange={e => updateFeature(pi, fi, 't', e.target.value)} />
              </div>
            ))}
          </div>
        </Accordion>
      ))}
    </>
  );
}

function SectionWithItems({ data, onChange, hasName = false }: {
  data: { eyebrow: string; title: string; sub?: string; items: Array<{ title?: string; name?: string; desc: string; n?: string }> };
  onChange: (d: typeof data) => void;
  hasName?: boolean;
}) {
  const f = (k: keyof typeof data) => (v: string) => onChange({ ...data, [k]: v });
  return (
    <>
      <div className="cms-fields-row">
        <Field label="Eyebrow" value={data.eyebrow} onChange={f('eyebrow')} />
        <Field label="Sarlavha" value={data.title} onChange={f('title')} />
      </div>
      {data.sub !== undefined && <Field label="Tavsif" value={data.sub} onChange={f('sub')} multiline />}
      <ItemListEditor data={data.items} hasName={hasName} onChange={items => onChange({ ...data, items })} />
    </>
  );
}

function CtaEditor({ data, onChange }: { data: Content['uz']['cta']; onChange: (d: Content['uz']['cta']) => void }) {
  const f = (k: keyof typeof data) => (v: string) => onChange({ ...data, [k]: v });
  return (
    <>
      <Field label="Sarlavha" value={data.title} onChange={f('title')} multiline />
      <Field label="Tavsif" value={data.sub} onChange={f('sub')} multiline />
      <div className="cms-fields-row">
        <Field label="Tugma 1" value={data.btn1} onChange={f('btn1')} />
        <Field label="Tugma 2" value={data.btn2} onChange={f('btn2')} />
        <Field label="Izoh" value={data.note} onChange={f('note')} />
      </div>
    </>
  );
}

function FooterEditor({ data, onChange }: { data: Content['uz']['footer']; onChange: (d: Content['uz']['footer']) => void }) {
  const f = (k: keyof typeof data) => (v: string) => onChange({ ...data, [k]: v } as Content['uz']['footer']);
  return (
    <>
      <Field label="Qisqa tavsif" value={data.desc} onChange={f('desc')} multiline />
      <div className="cms-fields-row">
        <Field label="Platforma sarlavhasi" value={data.platform} onChange={f('platform')} />
        <Field label="Kirish sarlavhasi" value={data.access} onChange={f('access')} />
        <Field label="Bog'lanish sarlavhasi" value={data.contact} onChange={f('contact')} />
      </div>
      <div className="cms-sub-section">
        <div className="cms-sub-title">Havolalar</div>
        <div className="cms-fields-row">
          <Field label="Sohalar" value={data.links.industries} onChange={v => onChange({ ...data, links: { ...data.links, industries: v } })} />
          <Field label="Imkoniyatlar" value={data.links.features} onChange={v => onChange({ ...data, links: { ...data.links, features: v } })} />
          <Field label="Narxlar" value={data.links.pricing} onChange={v => onChange({ ...data, links: { ...data.links, pricing: v } })} />
        </div>
      </div>
      <div className="cms-sub-section">
        <div className="cms-sub-title">Kirish havolalari</div>
        <div className="cms-fields-row">
          <Field label="Ro'yxatdan o'tish" value={data.access_links.register} onChange={v => onChange({ ...data, access_links: { ...data.access_links, register: v } })} />
          <Field label="Kirish" value={data.access_links.login} onChange={v => onChange({ ...data, access_links: { ...data.access_links, login: v } })} />
          <Field label="Admin panel" value={data.access_links.admin} onChange={v => onChange({ ...data, access_links: { ...data.access_links, admin: v } })} />
        </div>
      </div>
      <div className="cms-fields-row">
        <Field label="Copyright matni" value={data.copy} onChange={f('copy')} />
        <Field label="Made for" value={data.made} onChange={f('made')} />
      </div>
    </>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const SECTION_TABS = [
  { key: 'nav',        label: 'Menyu' },
  { key: 'hero',       label: 'Hero' },
  { key: 'problems',   label: 'Muammolar' },
  { key: 'solution',   label: 'Yechim' },
  { key: 'industries', label: 'Sohalar' },
  { key: 'steps',      label: 'Qadamlar' },
  { key: 'features',   label: 'Imkoniyatlar' },
  { key: 'pricing',    label: 'Narxlar' },
  { key: 'cta',        label: 'CTA' },
  { key: 'footer',     label: 'Footer' },
] as const;

type SectionKey = (typeof SECTION_TABS)[number]['key'];

const LANG_LABELS: Record<Lang, string> = { uz: "O'zbek", ru: 'Русский', en: 'English' };

// ── Main component ────────────────────────────────────────────────────────────

export default function LandingCMS() {
  const [content, setContent] = useState<Content>(DEFAULT_CONTENT);
  const [lang, setLang]       = useState<Lang>('uz');
  const [section, setSection] = useState<SectionKey>('hero');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState<{ msg: string; ok: boolean } | null>(null);
  const toastRef              = useRef<ReturnType<typeof setTimeout>>();

  // Load from API on mount
  useEffect(() => {
    api.get<Record<string, unknown>>('/landing-settings')
      .then(r => {
        if (r.data) setContent(deepMerge(DEFAULT_CONTENT, r.data));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg: string, ok: boolean) => {
    clearTimeout(toastRef.current);
    setToast({ msg, ok });
    toastRef.current = setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/landing-settings', { content });
      showToast('Saqlandi! Landing page yangilandi.', true);
    } catch {
      showToast("Saqlashda xatolik yuz berdi.", false);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm('Barcha o\'zgarishlarni bekor qilib, default ma\'lumotlarga qaytasizmi?')) return;
    setContent(DEFAULT_CONTENT);
  };

  const updateSection = useCallback(<K extends SectionKey>(key: K, val: Content[Lang][K]) => {
    setContent(prev => ({
      ...prev,
      [lang]: { ...prev[lang], [key]: val },
    }));
  }, [lang]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-loading">Yuklanmoqda...</div>
      </div>
    );
  }

  const lc = content[lang];

  return (
    <div className="cms-page">
      {/* ── Header ── */}
      <div className="cms-header">
        <div className="cms-header-left">
          <Globe size={18} />
          <div>
            <div className="cms-header-title">Landing Page CMS</div>
            <div className="cms-header-sub">Saytdagi barcha matnlar 3 tilda, har bir bo'lim alohida</div>
          </div>
        </div>
        <div className="cms-header-right">
          <button className="btn-icon" onClick={handleReset} title="Default ga qaytarish">
            <RefreshCw size={14} />
          </button>
          <a className="cms-preview-link" href="http://localhost:4400" target="_blank" rel="noopener noreferrer">
            Ko'rish
          </a>
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            <Save size={14} />
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`cms-toast${toast.ok ? '' : ' cms-toast--err'}`}>{toast.msg}</div>
      )}

      <div className="cms-body">
        {/* ── Left: section tabs ── */}
        <aside className="cms-sidebar">
          <div className="cms-sidebar-label">Bo'limlar</div>
          {SECTION_TABS.map(t => (
            <button
              key={t.key}
              className={`cms-tab${section === t.key ? ' cms-tab--active' : ''}`}
              onClick={() => setSection(t.key)}
            >
              {t.label}
            </button>
          ))}
        </aside>

        {/* ── Main: editor ── */}
        <main className="cms-main">
          {/* Lang switcher */}
          <div className="cms-lang-bar">
            <span className="cms-lang-label">Tahrirlash tili:</span>
            {(Object.entries(LANG_LABELS) as [Lang, string][]).map(([l, label]) => (
              <button
                key={l}
                className={`cms-lang-btn${lang === l ? ' active' : ''}`}
                onClick={() => setLang(l)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Section content */}
          <div className="cms-section">
            {section === 'nav'        && <NavEditor        data={lc.nav}        onChange={v => updateSection('nav', v)} />}
            {section === 'hero'       && <HeroEditor       data={lc.hero}       onChange={v => updateSection('hero', v)} />}
            {section === 'problems'   && <SectionWithItems data={lc.problems}   onChange={v => updateSection('problems', v)} />}
            {section === 'solution'   && <SectionWithItems data={lc.solution}   onChange={v => updateSection('solution', v)} />}
            {section === 'industries' && <IndustriesEditor data={lc.industries} onChange={v => updateSection('industries', v)} />}
            {section === 'steps'      && <SectionWithItems data={lc.steps}      onChange={v => updateSection('steps', v)} />}
            {section === 'features'   && <SectionWithItems data={lc.features}   onChange={v => updateSection('features', v)} />}
            {section === 'pricing'    && <PricingEditor    data={lc.pricing}    onChange={v => updateSection('pricing', v)} />}
            {section === 'cta'        && <CtaEditor        data={lc.cta}        onChange={v => updateSection('cta', v)} />}
            {section === 'footer'     && <FooterEditor     data={lc.footer}     onChange={v => updateSection('footer', v)} />}
          </div>
        </main>
      </div>
    </div>
  );
}
