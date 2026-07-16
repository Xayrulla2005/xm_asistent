import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, X, Users, CheckCircle, AlertCircle, UserCheck } from 'lucide-react';
import {
  GymMember, GymPlan, MemberStats,
  getMemberStats, getGymMembers, getGymPlans, createGymMember, updateGymMember, deleteGymMember,
  checkIn, syncExpiredMembers,
} from '../../api/gym.api';
import { useToastStore } from '../../stores/toast.store';

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Faol',          color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  expired:   { label: 'Muddati tugagan', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  frozen:    { label: 'Muzlatilgan',   color: '#6366f1', bg: 'rgba(99,102,241,0.1)'  },
  cancelled: { label: 'Bekor',         color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
};

type FormData = {
  firstName: string; lastName: string; phone: string; email: string;
  planId: string; joinedAt: string; status: string; notes: string;
};
const EMPTY: FormData = { firstName: '', lastName: '', phone: '', email: '', planId: '', joinedAt: new Date().toISOString().slice(0, 10), status: 'active', notes: '' };

function daysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

export default function GymMembers() {
  const addToast = useToastStore((s) => s.toast);
  const [members, setMembers] = useState<GymMember[]>([]);
  const [plans,   setPlans]   = useState<GymPlan[]>([]);
  const [stats,   setStats]   = useState<MemberStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState<GymMember | null>(null);
  const [form,    setForm]    = useState<FormData>(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [confirm, setConfirm] = useState<GymMember | null>(null);
  const [checkinTarget, setCheckinTarget] = useState<GymMember | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getGymMembers(search || undefined, statusFilter || undefined), getMemberStats(), getGymPlans()])
      .then(([m, s, p]) => { setMembers(m); setStats(s); setPlans(p); })
      .catch(() => addToast('Yuklab bo\'lmadi'))
      .finally(() => setLoading(false));
  }, [search, statusFilter, addToast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (m: GymMember) => {
    setEditing(m);
    setForm({ firstName: m.firstName, lastName: m.lastName, phone: m.phone ?? '', email: m.email ?? '', planId: m.planId ?? '', joinedAt: m.joinedAt ?? new Date().toISOString().slice(0, 10), status: m.status, notes: m.notes ?? '' });
    setModal(true);
  };
  const f = (k: keyof FormData, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim()) { addToast('Ism kiritilishi shart'); return; }
    setSaving(true);
    const dto = { ...form, planId: form.planId || undefined };
    try {
      if (editing) {
        const updated = await updateGymMember(editing.id, dto);
        setMembers((prev) => prev.map((m) => m.id === updated.id ? updated : m));
        addToast('Yangilandi', 'success');
      } else {
        const created = await createGymMember(dto);
        setMembers((prev) => [created, ...prev]);
        setStats((s) => s ? { ...s, total: s.total + 1, active: s.active + 1 } : s);
        addToast("A'zo qo'shildi", 'success');
      }
      setModal(false);
    } catch { addToast('Xatolik'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await deleteGymMember(confirm.id);
      setMembers((prev) => prev.filter((m) => m.id !== confirm.id));
      addToast("Bekor qilindi", 'success');
    } catch { addToast('Xatolik'); }
    finally { setConfirm(null); }
  };

  const handleCheckIn = async (member: GymMember) => {
    try {
      await checkIn(member.id);
      setMembers((prev) => prev.map((m) => m.id === member.id ? { ...m, totalCheckins: m.totalCheckins + 1 } : m));
      setStats((s) => s ? { ...s, todayCheckins: s.todayCheckins + 1 } : s);
      addToast(`${member.firstName} kirishini qayd qilindi`, 'success');
    } catch { addToast('Xatolik'); }
    finally { setCheckinTarget(null); }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncExpiredMembers();
      addToast("Muddati tugagan a'zolar yangilandi", 'success');
      load();
    } catch { addToast('Xatolik'); }
    finally { setSyncing(false); }
  };

  const activePlans = plans.filter((p) => p.isActive);

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">A'zolar</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" onClick={handleSync} disabled={syncing} style={{ fontSize: '0.82rem' }}>
            {syncing ? 'Yangilanmoqda...' : 'Muddatlarni tekshirish'}
          </button>
          <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={15} /> Yangi a'zo
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Jami a\'zolar',   value: stats.total,         color: '#6366f1', icon: <Users size={14} /> },
            { label: 'Faol',            value: stats.active,        color: '#10b981', icon: <CheckCircle size={14} /> },
            { label: 'Muddati tugagan', value: stats.expired,       color: '#ef4444', icon: <AlertCircle size={14} /> },
            { label: 'Bugun kirishdi',  value: stats.todayCheckins, color: '#f59e0b', icon: <UserCheck size={14} /> },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="card" style={{ padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '0 0 auto' }}>
              <span style={{ color }}>{icon}</span>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Ism, telefon..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.2rem', width: '100%', boxSizing: 'border-box' }} />
        </div>
        {['', 'active', 'expired', 'frozen', 'cancelled'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={statusFilter === s ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>
            {s ? STATUS_META[s]?.label : 'Barchasi'}
          </button>
        ))}
      </div>

      {loading ? <p className="state-msg">Yuklanmoqda...</p>
       : members.length === 0 ? <p className="state-msg">A'zolar topilmadi</p>
       : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr>
              <th>Ism</th><th>Telefon</th><th>Obuna</th><th>Amal qilish</th><th>Kirishlar</th><th>Holat</th><th>Amallar</th>
            </tr></thead>
            <tbody>
              {members.map((m) => {
                const st  = STATUS_META[m.status] ?? STATUS_META.active;
                const days = daysLeft(m.expiresAt);
                const urgent = days !== null && days <= 5 && days >= 0;
                return (
                  <tr key={m.id}>
                    <td><strong>{m.firstName} {m.lastName}</strong></td>
                    <td>{m.phone ?? '—'}</td>
                    <td style={{ fontSize: '0.82rem' }}>{m.planName ?? '—'}</td>
                    <td style={{ fontSize: '0.82rem', color: urgent ? '#ef4444' : days === null || days < 0 ? '#ef4444' : 'var(--text)' }}>
                      {m.expiresAt ? (
                        <>
                          {new Date(m.expiresAt).toLocaleDateString('uz-UZ')}
                          {days !== null && (
                            <span style={{ marginLeft: '0.4rem', color: days < 0 ? '#ef4444' : urgent ? '#f59e0b' : 'var(--text-muted)', fontSize: '0.75rem' }}>
                              {days < 0 ? `${Math.abs(days)} kun o'tdi` : `${days} kun qoldi`}
                            </span>
                          )}
                        </>
                      ) : '—'}
                    </td>
                    <td>{m.totalCheckins}</td>
                    <td>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: st.color, background: st.bg, padding: '0.2rem 0.6rem', borderRadius: 12 }}>
                        {st.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {m.status === 'active' && (
                          <button className="btn-primary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                            onClick={() => setCheckinTarget(m)}>
                            Kirish
                          </button>
                        )}
                        <button className="btn-secondary" style={{ padding: '0.25rem 0.4rem' }} onClick={() => openEdit(m)}><Edit size={12} /></button>
                        <button className="btn-secondary" style={{ padding: '0.25rem 0.4rem', color: '#ef4444' }} onClick={() => setConfirm(m)}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>{editing ? "A'zoni tahrirlash" : "Yangi a'zo"}</h3>
              <button onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field"><label>Ism *</label><input type="text" value={form.firstName} onChange={(e) => f('firstName', e.target.value)} required /></div>
                <div className="field"><label>Familiya *</label><input type="text" value={form.lastName} onChange={(e) => f('lastName', e.target.value)} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field"><label>Telefon</label><input type="text" value={form.phone} onChange={(e) => f('phone', e.target.value)} /></div>
                <div className="field"><label>Email</label><input type="email" value={form.email} onChange={(e) => f('email', e.target.value)} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Obuna rejasi</label>
                  <select value={form.planId} onChange={(e) => f('planId', e.target.value)}>
                    <option value="">— tanlanmagan —</option>
                    {activePlans.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — {Number(p.price).toLocaleString()} so'm ({p.durationDays} kun)</option>
                    ))}
                  </select>
                </div>
                <div className="field"><label>Qo'shilgan sana</label><input type="date" value={form.joinedAt} onChange={(e) => f('joinedAt', e.target.value)} /></div>
              </div>
              {editing && (
                <div className="field">
                  <label>Holat</label>
                  <select value={form.status} onChange={(e) => f('status', e.target.value)}>
                    {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              )}
              <div className="field"><label>Izoh</label><textarea value={form.notes} onChange={(e) => f('notes', e.target.value)} rows={2} style={{ resize: 'vertical' }} /></div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Bekor</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Check-in confirm */}
      {checkinTarget && (
        <div className="modal-overlay" onClick={() => setCheckinTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 340 }}>
            <div className="modal-header"><h3>Kirishni qayd qilish</h3><button onClick={() => setCheckinTarget(null)}><X size={18} /></button></div>
            <div style={{ padding: '1.25rem' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                <strong>{checkinTarget.firstName} {checkinTarget.lastName}</strong> — bugungi kirishini qayd qilasizmi?
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setCheckinTarget(null)}>Bekor</button>
                <button className="btn-primary" onClick={() => handleCheckIn(checkinTarget)}>Qayd qilish</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 340 }}>
            <div className="modal-header"><h3>A'zoni bekor qilish</h3><button onClick={() => setConfirm(null)}><X size={18} /></button></div>
            <div style={{ padding: '1.25rem' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}><strong>{confirm.firstName} {confirm.lastName}</strong> — a'zoligini bekor qilasizmi?</p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setConfirm(null)}>Bekor</button>
                <button className="btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={handleDelete}>Bekor qilish</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
