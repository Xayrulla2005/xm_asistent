import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getPortalPage, getStoredToken, getStoredCustomer,
  PortalPublicPage,
} from '../../api/client-portal.api';

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' });

export default function ClientPortalLanding() {
  const { slug } = useParams<{ slug: string }>();
  const [page,    setPage]    = useState<PortalPublicPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const isLoggedIn = !!getStoredToken(slug ?? '');
  const customer   = getStoredCustomer(slug ?? '');

  useEffect(() => {
    if (!slug) return;
    getPortalPage(slug)
      .then(setPage)
      .catch(() => setError("Portal topilmadi yoki mavjud emas"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="cp-full-center">
        <div className="cp-spinner" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="cp-full-center">
        <div className="cp-error-box">
          <div className="cp-error-icon">!</div>
          <p>{error || 'Portal topilmadi'}</p>
        </div>
      </div>
    );
  }

  const activePromos = page.promos.filter(
    (p) => !p.validUntil || new Date(p.validUntil) > new Date(),
  );

  return (
    <div className="cp-landing">

      {/* Header */}
      <header className="cp-header">
        <div className="cp-header-inner">
          <div className="cp-brand">{page.tenant.name}</div>
          <div>
            {isLoggedIn ? (
              <Link to={`/client/${slug}/portal`} className="cp-btn cp-btn--primary">
                {customer?.name ?? 'Kabinetim'}
              </Link>
            ) : (
              <Link to={`/client/${slug}/login`} className="cp-btn cp-btn--primary">
                Kirish
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="cp-main">

        {/* Hero */}
        <section className="cp-hero">
          <h1 className="cp-hero-title">{page.tenant.name}</h1>
          <p className="cp-hero-sub">Sizning shaxsiy kabinetingiz va eng so'nggi takliflar</p>
          {!isLoggedIn && (
            <Link to={`/client/${slug}/login`} className="cp-btn cp-btn--primary cp-btn--lg">
              Kabinetga kirish →
            </Link>
          )}
        </section>

        {/* Announcements */}
        {page.announcements.length > 0 && (
          <section className="cp-section">
            <h2 className="cp-section-title">Yangiliklar</h2>
            <div className="cp-ann-list">
              {page.announcements.map((ann) => (
                <div key={ann.id} className="cp-ann-card">
                  <div className="cp-ann-dot" />
                  <div>
                    <div className="cp-ann-title">{ann.title}</div>
                    {ann.body && <p className="cp-ann-body">{ann.body}</p>}
                    <div className="cp-ann-date">{fmtDate(ann.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Promotions */}
        {activePromos.length > 0 && (
          <section className="cp-section">
            <h2 className="cp-section-title">Aksiyalar va takliflar</h2>
            <div className="cp-promo-grid">
              {activePromos.map((promo) => (
                <div key={promo.id} className="cp-promo-card">
                  <div className="cp-promo-badge">Aksiya</div>
                  <h3 className="cp-promo-title">{promo.title}</h3>
                  {promo.description && (
                    <p className="cp-promo-desc">{promo.description}</p>
                  )}
                  {promo.validUntil && (
                    <div className="cp-promo-until">
                      Muddati: {fmtDate(promo.validUntil)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {page.announcements.length === 0 && activePromos.length === 0 && (
          <section className="cp-section cp-empty-state">
            <div className="cp-empty-icon">&#9734;</div>
            <p>Hozircha yangiliklar va aksiyalar yo'q</p>
          </section>
        )}
      </main>

      <footer className="cp-footer">
        <p>XM — Savdo boshqaruv tizimi</p>
      </footer>
    </div>
  );
}
