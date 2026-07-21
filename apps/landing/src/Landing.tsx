const APP_URL  = (import.meta as unknown as { env: Record<string, string> }).env['VITE_APP_URL']  ?? 'http://localhost:4300';
const ADMIN_URL = (import.meta as unknown as { env: Record<string, string> }).env['VITE_ADMIN_URL'] ?? 'http://localhost:4200';

// ── Data ─────────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  {
    icon: '🛒', name: 'Savdo (Retail)', color: '#6366f1',
    desc: 'Ombor, sotuv, mijozlar, cashier va to\'lov modullar bilan toʻliq savdo tizimi.',
    chips: ['POS', 'Ombor', 'Mijozlar', 'Hisobot'],
  },
  {
    icon: '🏥', name: 'Klinika', color: '#ec4899',
    desc: 'Bemorlar, qabullar, retseptlar, dorixona va tibbiy kartalar.',
    chips: ['Bemorlar', 'Qabullar', 'Retseptlar', 'Lab'],
  },
  {
    icon: '🎓', name: 'Ta\'lim markazi', color: '#f59e0b',
    desc: 'O\'quvchilar, kurslar, davomat, imtihon va oylik to\'lovlar.',
    chips: ['O\'quvchilar', 'Davomat', 'To\'lov', 'Jadval'],
  },
  {
    icon: '🍽️', name: 'Restoran / Kafe', color: '#ef4444',
    desc: 'Menyu, buyurtmalar, stol boshqaruvi, oshxona va yetkazib berish.',
    chips: ['Menyu', 'Buyurtmalar', 'Stollar', 'Oshxona'],
  },
  {
    icon: '💆', name: 'Go\'zallik saloni', color: '#8b5cf6',
    desc: 'Masterlar, xizmatlar, qabullar va mijozlar bazasi.',
    chips: ['Masterlar', 'Xizmatlar', 'Qabullar'],
  },
  {
    icon: '🏋️', name: 'Fitnes / Sport zal', color: '#10b981',
    desc: 'A\'zolar, obuna rejalari, kirish nazorati va hisobotlar.',
    chips: ['A\'zolar', 'Obuna', 'Kirish nazorati'],
  },
];

const FEATURES = [
  {
    icon: '🔐', color: '#6366f1', bg: 'rgba(99,102,241,0.1)',
    title: 'Bank darajasida xavfsizlik',
    desc: 'JWT token, email OTP, Google OAuth, sessiya boshqaruvi va rol-asosiy ruxsatlar.',
  },
  {
    icon: '👥', color: '#10b981', bg: 'rgba(16,185,129,0.1)',
    title: 'Ko\'p foydalanuvchi va rollar',
    desc: 'Admin, kassir, ombor, shifokor, o\'qituvchi — har soha uchun aniq rollar va ruxsatlar.',
  },
  {
    icon: '📊', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',
    title: 'Real vaqt statistikasi',
    desc: 'Kunlik tushum, sotuv trendi, ombor holati — barchasi boshqaruv panelingizda.',
  },
  {
    icon: '📱', color: '#ec4899', bg: 'rgba(236,72,153,0.1)',
    title: 'Mobil qulay interfeys',
    desc: 'Planshet va telefon ekranlariga moslashgan — ofisdan tashqarida ham ishlang.',
  },
  {
    icon: '🌐', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',
    title: 'O\'z domeningiz',
    desc: 'Har bir mijoz o\'z subdomeni yoki custom domen orqali CRM ga kiradi.',
  },
  {
    icon: '🚀', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',
    title: 'Tez sozlash',
    desc: 'Ro\'yxatdan o\'tib, sohangizni tanlang — CRM bir daqiqada tayyor bo\'ladi.',
  },
];

const PRICING = [
  {
    plan: 'Starter',
    price: 'Bepul',
    period: '',
    desc: 'Kichik biznes yoki sinab ko\'rish uchun',
    popular: false,
    features: [
      { ok: true,  text: '1 ta foydalanuvchi' },
      { ok: true,  text: 'Barcha asosiy modullar' },
      { ok: true,  text: '500 ta yozuv/oy' },
      { ok: false, text: 'Maxsus subdomen' },
      { ok: false, text: 'Prioritet qo\'llab-quvvatlash' },
      { ok: false, text: 'API integratsiya' },
    ],
    cta: 'Bepul boshlash', ctaStyle: 'outline',
  },
  {
    plan: 'Pro',
    price: '199 000',
    period: '/oy',
    desc: 'O\'sib borayotgan biznes uchun',
    popular: true,
    features: [
      { ok: true, text: '10 ta foydalanuvchi' },
      { ok: true, text: 'Barcha modullar + kengaytmalar' },
      { ok: true, text: 'Cheksiz yozuvlar' },
      { ok: true, text: 'Maxsus subdomen' },
      { ok: true, text: 'Prioritet qo\'llab-quvvatlash' },
      { ok: false, text: 'API integratsiya' },
    ],
    cta: 'Pro ni sinab ko\'rish', ctaStyle: 'primary',
  },
  {
    plan: 'Enterprise',
    price: 'Maxsus',
    period: '',
    desc: 'Katta korxona va tarmoq uchun',
    popular: false,
    features: [
      { ok: true, text: 'Cheksiz foydalanuvchilar' },
      { ok: true, text: 'Maxsus modullar ishlab chiqish' },
      { ok: true, text: 'Cheksiz yozuvlar' },
      { ok: true, text: 'Custom domen (o\'z domeningiz)' },
      { ok: true, text: '7/24 qo\'llab-quvvatlash' },
      { ok: true, text: 'API + webhook integratsiya' },
    ],
    cta: 'Bog\'lanish', ctaStyle: 'outline',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Landing() {
  const goRegister = () => { window.location.href = `${APP_URL}/register`; };
  const goLogin    = () => { window.location.href = `${APP_URL}/`; };
  const goAdmin    = () => { window.location.href = ADMIN_URL; };

  const scroll = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="container navbar-inner">
          <div className="navbar-logo">XM<span>Asistent</span></div>
          <ul className="navbar-links">
            <li><a href="#industries" onClick={(e) => { e.preventDefault(); scroll('industries'); }}>Sohalar</a></li>
            <li><a href="#features"   onClick={(e) => { e.preventDefault(); scroll('features'); }}>Imkoniyatlar</a></li>
            <li><a href="#pricing"    onClick={(e) => { e.preventDefault(); scroll('pricing'); }}>Narxlar</a></li>
          </ul>
          <div className="navbar-cta">
            <a className="navbar-login" onClick={goLogin} style={{ cursor: 'pointer' }}>Kirish</a>
            <button className="btn-primary" style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }} onClick={goRegister}>
              Bepul boshlash
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="container">
          <div className="hero-grid">
            <div>
              <div className="hero-badge">
                <span className="hero-badge-dot" />
                Yetakchi SaaS CRM — O'zbekiston uchun
              </div>
              <h1>
                Biznesingiz uchun<br />
                <span className="gradient-text">aqlli CRM tizimi</span>
              </h1>
              <p className="hero-sub">
                Restoran, klinika, savdo, fitnes, go'zallik va boshqa soha uchun
                bir daqiqada o'zingizning CRM tizimingizni yarating.
                Kodlash shart emas.
              </p>
              <div className="hero-actions">
                <button className="btn-primary" onClick={goRegister}>
                  Bepul boshlash →
                </button>
                <button className="btn-outline" onClick={() => scroll('industries')}>
                  Sohalarni ko'rish
                </button>
              </div>
              <div className="hero-stats">
                <div>
                  <div className="hero-stat-num gradient-text">7+</div>
                  <div className="hero-stat-lbl">Soha turi</div>
                </div>
                <div>
                  <div className="hero-stat-num gradient-text">1 min</div>
                  <div className="hero-stat-lbl">Sozlash vaqti</div>
                </div>
                <div>
                  <div className="hero-stat-num gradient-text">99.9%</div>
                  <div className="hero-stat-lbl">Ishlash vaqti</div>
                </div>
              </div>
            </div>

            <div className="hero-visual">
              <div className="hero-card">
                <div className="hero-card-header">
                  <div className="hero-card-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>📊</div>
                  <div>
                    <div className="hero-card-title">Bugungi tushum</div>
                    <div className="hero-card-sub">Real vaqt statistikasi</div>
                  </div>
                </div>
                <div className="hero-bars">
                  {[
                    { lbl: 'Dush', val: 72, color: '#6366f1' },
                    { lbl: 'Sesh', val: 88, color: '#10b981' },
                    { lbl: 'Chor', val: 55, color: '#f59e0b' },
                    { lbl: 'Pay',  val: 95, color: '#6366f1' },
                  ].map(b => (
                    <div className="hero-bar" key={b.lbl}>
                      <span style={{ width: '2.5rem', color: 'var(--muted)', fontSize: '0.75rem' }}>{b.lbl}</span>
                      <div className="hero-bar-bg">
                        <div className="hero-bar-fill" style={{ width: `${b.val}%`, background: b.color }} />
                      </div>
                      <span className="hero-bar-val">{b.val}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="hero-card">
                <div className="hero-card-header">
                  <div className="hero-card-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>⚙️</div>
                  <div>
                    <div className="hero-card-title">Aktiv modullar</div>
                    <div className="hero-card-sub">Savdo CRM — klinika</div>
                  </div>
                </div>
                <div className="hero-modules">
                  {['Dashboard', 'Bemorlar', 'Qabullar', 'Retseptlar', 'Lab', 'Dorixona', 'To\'lovlar'].map((m, i) => (
                    <span key={m} className={`hero-mod-chip${i < 4 ? ' active' : ''}`}>{m}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Industries ── */}
      <section className="section" id="industries">
        <div className="container">
          <div className="section-head">
            <div className="section-eyebrow">Sohalar</div>
            <h2 className="section-title">Qaysi soha uchun ishlaydi?</h2>
            <p className="section-sub">
              Har bir soha uchun maxsus modullar, rollar va interfeys —
              universal emas, aniq moslashtirilgan.
            </p>
          </div>
          <div className="industries-grid">
            {INDUSTRIES.map(ind => (
              <div className="industry-card" key={ind.name}>
                <div className="industry-icon">{ind.icon}</div>
                <div className="industry-name">{ind.name}</div>
                <div className="industry-desc">{ind.desc}</div>
                <div className="industry-chips">
                  {ind.chips.map(c => <span className="industry-chip" key={c}>{c}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="section how-section" id="how">
        <div className="container">
          <div className="section-head">
            <div className="section-eyebrow">Qanday ishlaydi</div>
            <h2 className="section-title">3 qadam — CRM tayyor</h2>
            <p className="section-sub">
              Texnik bilim kerak emas. Biznes egasi o'zi sozlaydi.
            </p>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-num">1</div>
              <div className="step-title">Ro'yxatdan o'ting</div>
              <p className="step-desc">Email va parol yoki Google orqali bir daqiqada hisob oching.</p>
            </div>
            <div className="step-card">
              <div className="step-num">2</div>
              <div className="step-title">Sohangizni tanlang</div>
              <p className="step-desc">Savdo, klinika, restoran yoki boshqa — modullar avtomatik sozlanadi.</p>
            </div>
            <div className="step-card">
              <div className="step-num">3</div>
              <div className="step-title">CRM tayyor!</div>
              <p className="step-desc">Dashboard, modullar, rollar — hammasi ishlaydi. Xodimlarni qo'shib boshlang.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="section" id="features">
        <div className="container">
          <div className="section-head">
            <div className="section-eyebrow">Imkoniyatlar</div>
            <h2 className="section-title">Biznes uchun zarur hamma narsa</h2>
            <p className="section-sub">
              Xavfsizlik, analitika, ko'p foydalanuvchi, mobil qulay — barchasi bir tizimda.
            </p>
          </div>
          <div className="features-grid">
            {FEATURES.map(f => (
              <div className="feature-card" key={f.title}>
                <div className="feature-icon-wrap" style={{ background: f.bg, color: f.color }}>
                  {f.icon}
                </div>
                <div>
                  <div className="feature-title">{f.title}</div>
                  <p className="feature-desc">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="section" id="pricing" style={{ background: 'var(--bg2)' }}>
        <div className="container">
          <div className="section-head">
            <div className="section-eyebrow">Narxlar</div>
            <h2 className="section-title">Sizga mos rejani tanlang</h2>
            <p className="section-sub">
              Bepul boshlang. Biznesingiz o'sganda — tarifni o'zgartiring.
            </p>
          </div>
          <div className="pricing-grid">
            {PRICING.map(p => (
              <div className={`pricing-card${p.popular ? ' popular' : ''}`} key={p.plan}>
                {p.popular && <div className="pricing-badge">ENG MASHHUR</div>}
                <div className="pricing-plan">{p.plan}</div>
                <div className="pricing-price">
                  {p.price === 'Bepul' || p.price === 'Maxsus' ? (
                    p.price
                  ) : (
                    <>{p.price} <sup>so'm</sup></>
                  )}
                </div>
                {p.period && <div className="pricing-period">{p.period}</div>}
                <div style={{ height: '0.75rem' }} />
                <div className="pricing-desc">{p.desc}</div>
                <ul className="pricing-features">
                  {p.features.map(f => (
                    <li className="pricing-feature" key={f.text}>
                      <span className={f.ok ? 'pricing-check' : 'pricing-x'}>
                        {f.ok ? '✓' : '✗'}
                      </span>
                      <span style={f.ok ? {} : { color: 'var(--muted)' }}>{f.text}</span>
                    </li>
                  ))}
                </ul>
                <button
                  className={`btn-pricing ${p.ctaStyle}`}
                  onClick={p.plan === 'Enterprise' ? () => scroll('footer') : goRegister}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-inner">
            <h2 className="cta-title">
              Biznesingizni raqamli qiling — <span className="gradient-text">bugun</span>
            </h2>
            <p className="cta-sub">
              O'zbekistondagi yuzlab bizneslar XM Asistent orqali vaqt va pul tejayapti.
              Siz ham boshlang — bepul, roʻyxatdan oʻtmasdan sinab ko'ring.
            </p>
            <div className="cta-actions">
              <button className="btn-primary" onClick={goRegister} style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}>
                Bepul boshlash →
              </button>
              <button className="btn-outline" onClick={goLogin} style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}>
                Tizimga kirish
              </button>
            </div>
            <p className="cta-note">Kredit karta talab qilinmaydi. Istalgan payt bekor qilish mumkin.</p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer" id="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="navbar-logo" style={{ fontSize: '1.1rem' }}>XM<span style={{ color: 'var(--primary)' }}>Asistent</span></div>
              <p>O'zbekiston biznesiga mo'ljallangan zamonaviy CRM platformasi. Har bir soha uchun tayyor yechim.</p>
            </div>
            <div>
              <div className="footer-col-title">Platforma</div>
              <ul className="footer-links">
                <li><a onClick={() => scroll('industries')} style={{ cursor: 'pointer' }}>Sohalar</a></li>
                <li><a onClick={() => scroll('features')} style={{ cursor: 'pointer' }}>Imkoniyatlar</a></li>
                <li><a onClick={() => scroll('pricing')} style={{ cursor: 'pointer' }}>Narxlar</a></li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">Kirish</div>
              <ul className="footer-links">
                <li><a onClick={goRegister} style={{ cursor: 'pointer' }}>Ro'yxatdan o'tish</a></li>
                <li><a onClick={goLogin} style={{ cursor: 'pointer' }}>Tizimga kirish</a></li>
                <li><a onClick={goAdmin} style={{ cursor: 'pointer' }}>Admin panel</a></li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">Bog'lanish</div>
              <ul className="footer-links">
                <li><a href="mailto:support@xmasistent.uz">support@xmasistent.uz</a></li>
                <li><a href="https://t.me/xmasistent" target="_blank" rel="noopener noreferrer">Telegram</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 XM Asistent. Barcha huquqlar himoyalangan.</span>
            <span>O'zbekiston uchun yaratilgan</span>
          </div>
        </div>
      </footer>
    </>
  );
}
