import { FormEvent, useEffect, useState } from 'react';
import { Globe, Plus, Pencil, Trash2, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { useFeaturesStore } from '../stores/features.store';
import { useTenantStore } from '../stores/tenant.store';
import { useConfigStore } from '../stores/config.store';
import { useToastStore } from '../stores/toast.store';
import {
  Promotion, Announcement,
  getAdminPromotions, createPromotion, updatePromotion, deletePromotion,
  getAdminAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
} from '../api/client-portal.api';

type Tab = 'promos' | 'announcements';

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });

// ── Upgrade placeholder ───────────────────────────────────────────────────────
function ProUpgrade() {
  return (
    <div className="page">
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '60vh', gap: '1.25rem', textAlign: 'center',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Globe size={28} color="#fff" />
        </div>
        <div>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.35rem' }}>Mijoz portali</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', maxWidth: 380, lineHeight: 1.6 }}>
            Mijozlaringiz o'z xaridlari, qarzlari va bonuslarini ko'rishi uchun shaxsiy
            kabinet yarating. Aksiya va e'lonlarni boshqaring.
          </p>
        </div>
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '1.25rem 2rem', maxWidth: 340,
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6366f1', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
            PRO TARIF
          </div>
          <ul style={{ margin: 0, padding: '0 0 0 1.1rem', color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 2 }}>
            <li>Mijoz shaxsiy kabineti</li>
            <li>Xaridlar va qarzlar tarixi</li>
            <li>Aksiyalar va e'lonlar</li>
            <li>Bonus daraja tizimi</li>
          </ul>
        </div>
        <a href="/subscription" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          PRO ga o'tish
        </a>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Portal() {
  const hasFeature = useFeaturesStore((s) => s.hasFeature);
  const tenantId   = useTenantStore((s) => s.tenantId);
  const slug       = useConfigStore((s) => s.config?.slug ?? '');
  const addToast   = useToastStore((s) => s.toast);

  const canPortal = hasFeature('client_portal');

  const [tab,    setTab]    = useState<Tab>('promos');
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [anns,   setAnns]   = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Promo modal
  const [promoModal, setPromoModal] = useState<'add' | 'edit' | null>(null);
  const [editPromo,  setEditPromo]  = useState<Promotion | null>(null);
  const [promoForm,  setPromoForm]  = useState({ title: '', description: '', validUntil: '' });
  const [promoSaving, setPromoSaving] = useState(false);

  // Announcement modal
  const [annModal,  setAnnModal]  = useState<'add' | 'edit' | null>(null);
  const [editAnn,   setEditAnn]   = useState<Announcement | null>(null);
  const [annForm,   setAnnForm]   = useState({ title: '', body: '' });
  const [annSaving, setAnnSaving] = useState(false);

  // Delete confirm
  const [delPromo, setDelPromo] = useState<Promotion | null>(null);
  const [delAnn,   setDelAnn]   = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!canPortal || !tenantId) return;
    setLoading(true);
    Promise.all([
      getAdminPromotions(tenantId),
      getAdminAnnouncements(tenantId),
    ])
      .then(([p, a]) => { setPromos(p); setAnns(a); })
      .catch(() => addToast("Ma'lumot yuklashda xatolik"))
      .finally(() => setLoading(false));
  }, [tenantId, canPortal]);

  if (!canPortal) return <ProUpgrade />;

  // ── Promo handlers ──────────────────────────────────────────────────────────
  const openAddPromo = () => {
    setPromoForm({ title: '', description: '', validUntil: '' });
    setEditPromo(null);
    setPromoModal('add');
  };

  const openEditPromo = (p: Promotion) => {
    setEditPromo(p);
    setPromoForm({
      title: p.title,
      description: p.description ?? '',
      validUntil: p.validUntil ? p.validUntil.slice(0, 10) : '',
    });
    setPromoModal('edit');
  };

  const handlePromoSave = async (e: FormEvent) => {
    e.preventDefault();
    setPromoSaving(true);
    try {
      if (promoModal === 'add') {
        const created = await createPromotion(tenantId, {
          title: promoForm.title,
          description: promoForm.description || undefined,
          validUntil: promoForm.validUntil || undefined,
        });
        setPromos((ps) => [created, ...ps]);
        addToast("Aksiya qo'shildi", 'success');
      } else if (editPromo) {
        const updated = await updatePromotion(editPromo.id, {
          title: promoForm.title,
          description: promoForm.description || undefined,
          validUntil: promoForm.validUntil || undefined,
        });
        setPromos((ps) => ps.map((p) => p.id === updated.id ? updated : p));
        addToast('Aksiya yangilandi', 'success');
      }
      setPromoModal(null);
    } catch {
      addToast('Saqlashda xatolik yuz berdi');
    } finally { setPromoSaving(false); }
  };

  const handleTogglePromo = async (p: Promotion) => {
    try {
      const updated = await updatePromotion(p.id, { isActive: !p.isActive });
      setPromos((ps) => ps.map((x) => x.id === updated.id ? updated : x));
    } catch { addToast('Xatolik yuz berdi'); }
  };

  const handleDelPromo = async () => {
    if (!delPromo) return;
    setDeleting(true);
    try {
      await deletePromotion(delPromo.id);
      setPromos((ps) => ps.filter((p) => p.id !== delPromo.id));
      addToast("Aksiya o'chirildi", 'success');
      setDelPromo(null);
    } catch { addToast("O'chirishda xatolik"); }
    finally { setDeleting(false); }
  };

  // ── Announcement handlers ───────────────────────────────────────────────────
  const openAddAnn = () => {
    setAnnForm({ title: '', body: '' });
    setEditAnn(null);
    setAnnModal('add');
  };

  const openEditAnn = (a: Announcement) => {
    setEditAnn(a);
    setAnnForm({ title: a.title, body: a.body ?? '' });
    setAnnModal('edit');
  };

  const handleAnnSave = async (e: FormEvent) => {
    e.preventDefault();
    setAnnSaving(true);
    try {
      if (annModal === 'add') {
        const created = await createAnnouncement(tenantId, {
          title: annForm.title,
          body: annForm.body || undefined,
        });
        setAnns((as) => [created, ...as]);
        addToast("E'lon qo'shildi", 'success');
      } else if (editAnn) {
        const updated = await updateAnnouncement(editAnn.id, {
          title: annForm.title,
          body: annForm.body || undefined,
        });
        setAnns((as) => as.map((a) => a.id === updated.id ? updated : a));
        addToast("E'lon yangilandi", 'success');
      }
      setAnnModal(null);
    } catch {
      addToast('Saqlashda xatolik yuz berdi');
    } finally { setAnnSaving(false); }
  };

  const handleToggleAnn = async (a: Announcement) => {
    try {
      const updated = await updateAnnouncement(a.id, { isActive: !a.isActive });
      setAnns((as) => as.map((x) => x.id === updated.id ? updated : x));
    } catch { addToast('Xatolik yuz berdi'); }
  };

  const handleDelAnn = async () => {
    if (!delAnn) return;
    setDeleting(true);
    try {
      await deleteAnnouncement(delAnn.id);
      setAnns((as) => as.filter((a) => a.id !== delAnn.id));
      addToast("E'lon o'chirildi", 'success');
      setDelAnn(null);
    } catch { addToast("O'chirishda xatolik"); }
    finally { setDeleting(false); }
  };

  const portalUrl = slug ? `/client/${slug}` : '';

  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="page">

      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Mijoz portali</h2>
          {slug && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Globe size={12} />
              <a
                href={portalUrl}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#6366f1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                /client/{slug} <ExternalLink size={11} />
              </a>
            </div>
          )}
        </div>
        <button
          className="btn-primary"
          onClick={tab === 'promos' ? openAddPromo : openAddAnn}
        >
          <Plus size={15} style={{ marginRight: '0.25rem' }} />
          {tab === 'promos' ? 'Aksiya qo\'shish' : 'E\'lon qo\'shish'}
        </button>
      </div>

      {/* Tabs */}
      <div className="cx-filter-row" style={{ marginBottom: '1rem' }}>
        <button className={`cx-filter-btn${tab === 'promos' ? ' active' : ''}`} onClick={() => setTab('promos')}>
          Aksiyalar ({promos.length})
        </button>
        <button className={`cx-filter-btn${tab === 'announcements' ? ' active' : ''}`} onClick={() => setTab('announcements')}>
          E'lonlar ({anns.length})
        </button>
      </div>

      {loading && <p className="state-msg">Yuklanmoqda...</p>}

      {/* ── Aksiyalar ──────────────────────────────────────────────────────────── */}
      {!loading && tab === 'promos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {promos.length === 0 ? (
            <div className="cx-empty">
              Hali aksiya qo'shilmagan. "Aksiya qo'shish" tugmasini bosing.
            </div>
          ) : promos.map((p) => {
            const expired = p.validUntil && new Date(p.validUntil) < new Date();
            return (
              <div key={p.id} className="portal-card" style={{ opacity: !p.isActive ? 0.55 : 1 }}>
                <div className="portal-card-left">
                  <div className="portal-card-accent" />
                  <div>
                    <div className="portal-card-title">{p.title}</div>
                    {p.description && (
                      <div className="portal-card-desc">{p.description}</div>
                    )}
                    <div className="portal-card-meta">
                      {p.validUntil ? (
                        <span style={{ color: expired ? '#ef4444' : 'var(--text-muted)' }}>
                          Muddat: {fmtDate(p.validUntil)}{expired ? ' — muddati o\'tgan' : ''}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Muddatsiz</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="portal-card-actions">
                  <span className={`badge ${p.isActive ? 'badge--green' : 'badge--muted'}`} style={{ fontSize: '0.7rem' }}>
                    {p.isActive ? 'Faol' : 'Nofa\'ol'}
                  </span>
                  <button
                    className="btn-icon"
                    title={p.isActive ? 'Nofaol qilish' : 'Faollashtirish'}
                    onClick={() => handleTogglePromo(p)}
                  >
                    {p.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button className="btn-icon" onClick={() => openEditPromo(p)}>
                    <Pencil size={14} />
                  </button>
                  <button className="btn-icon btn-icon--danger" onClick={() => setDelPromo(p)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── E'lonlar ───────────────────────────────────────────────────────────── */}
      {!loading && tab === 'announcements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {anns.length === 0 ? (
            <div className="cx-empty">
              Hali e'lon qo'shilmagan. "E'lon qo'shish" tugmasini bosing.
            </div>
          ) : anns.map((a) => (
            <div key={a.id} className="portal-card" style={{ opacity: !a.isActive ? 0.55 : 1 }}>
              <div className="portal-card-left">
                <div className="portal-card-accent portal-card-accent--ann" />
                <div>
                  <div className="portal-card-title">{a.title}</div>
                  {a.body && <div className="portal-card-desc">{a.body}</div>}
                  <div className="portal-card-meta" style={{ color: 'var(--text-muted)' }}>
                    {fmtDate(a.createdAt)}
                  </div>
                </div>
              </div>
              <div className="portal-card-actions">
                <span className={`badge ${a.isActive ? 'badge--green' : 'badge--muted'}`} style={{ fontSize: '0.7rem' }}>
                  {a.isActive ? 'Faol' : "Nofaol"}
                </span>
                <button
                  className="btn-icon"
                  title={a.isActive ? 'Nofaol qilish' : 'Faollashtirish'}
                  onClick={() => handleToggleAnn(a)}
                >
                  {a.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button className="btn-icon" onClick={() => openEditAnn(a)}>
                  <Pencil size={14} />
                </button>
                <button className="btn-icon btn-icon--danger" onClick={() => setDelAnn(a)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Aksiya modal ───────────────────────────────────────────────────────── */}
      {promoModal && (
        <div className="modal-overlay" onClick={() => setPromoModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>{promoModal === 'add' ? "Aksiya qo'shish" : 'Aksiyani tahrirlash'}</h3>
              <button className="modal-close" onClick={() => setPromoModal(null)}>×</button>
            </div>
            <form onSubmit={handlePromoSave} className="modal-form">
              <div className="field">
                <label>Sarlavha *</label>
                <input
                  type="text"
                  placeholder="Masalan: 20% chegirma"
                  value={promoForm.title}
                  onChange={(e) => setPromoForm({ ...promoForm, title: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Tavsif</label>
                <textarea
                  placeholder="Aksiya shartlari, qoidalar..."
                  value={promoForm.description}
                  onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div className="field">
                <label>Muddat tugash sanasi</label>
                <input
                  type="date"
                  value={promoForm.validUntil}
                  onChange={(e) => setPromoForm({ ...promoForm, validUntil: e.target.value })}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Bo'sh qoldirilsa muddatsiz hisoblanadi
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setPromoModal(null)}>
                  Bekor
                </button>
                <button type="submit" className="btn-primary" disabled={promoSaving}>
                  {promoSaving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── E'lon modal ────────────────────────────────────────────────────────── */}
      {annModal && (
        <div className="modal-overlay" onClick={() => setAnnModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>{annModal === 'add' ? "E'lon qo'shish" : "E'lonni tahrirlash"}</h3>
              <button className="modal-close" onClick={() => setAnnModal(null)}>×</button>
            </div>
            <form onSubmit={handleAnnSave} className="modal-form">
              <div className="field">
                <label>Sarlavha *</label>
                <input
                  type="text"
                  placeholder="Masalan: Yangi filial ochildi"
                  value={annForm.title}
                  onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Matn</label>
                <textarea
                  placeholder="E'lon matni..."
                  value={annForm.body}
                  onChange={(e) => setAnnForm({ ...annForm, body: e.target.value })}
                  rows={4}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setAnnModal(null)}>
                  Bekor
                </button>
                <button type="submit" className="btn-primary" disabled={annSaving}>
                  {annSaving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete aksiya confirm ───────────────────────────────────────────────── */}
      {delPromo && (
        <div className="modal-overlay" onClick={() => setDelPromo(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Aksiyani o'chirish</h3>
              <button className="modal-close" onClick={() => setDelPromo(null)}>×</button>
            </div>
            <div style={{ padding: '1rem 1.5rem' }}>
              <p><strong>"{delPromo.title}"</strong> aksiyasini o'chirishni tasdiqlaysizmi?</p>
            </div>
            <div className="modal-actions" style={{ padding: '0 1.5rem 1.5rem' }}>
              <button className="btn-secondary" onClick={() => setDelPromo(null)}>Bekor</button>
              <button className="btn-danger" onClick={handleDelPromo} disabled={deleting}>
                {deleting ? "O'chirilmoqda..." : "O'chirish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete e'lon confirm ───────────────────────────────────────────────── */}
      {delAnn && (
        <div className="modal-overlay" onClick={() => setDelAnn(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>E'lonni o'chirish</h3>
              <button className="modal-close" onClick={() => setDelAnn(null)}>×</button>
            </div>
            <div style={{ padding: '1rem 1.5rem' }}>
              <p><strong>"{delAnn.title}"</strong> e'lonini o'chirishni tasdiqlaysizmi?</p>
            </div>
            <div className="modal-actions" style={{ padding: '0 1.5rem 1.5rem' }}>
              <button className="btn-secondary" onClick={() => setDelAnn(null)}>Bekor</button>
              <button className="btn-danger" onClick={handleDelAnn} disabled={deleting}>
                {deleting ? "O'chirilmoqda..." : "O'chirish"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
