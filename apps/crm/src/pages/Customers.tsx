import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Pencil, Trash2,
  ChevronDown, ChevronUp,
  Users, AlertCircle, TrendingUp,
  ShoppingBag, BarChart2, Calendar, Download, Globe,
} from 'lucide-react';
import {
  getCustomers, createCustomer, updateCustomer, deleteCustomer,
  exportCustomersExcel, getDebts, recordDebtPayment,
  Customer, Debt,
} from '../api/customers.api';
import { setCustomerPortalAccess, removeCustomerPortalAccess } from '../api/client-portal.api';
import { getSales, Sale } from '../api/sales.api';
import { useTenantStore } from '../stores/tenant.store';
import { useFeaturesStore } from '../stores/features.store';
import { useToastStore } from '../stores/toast.store';

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt      = (n: number) => n.toLocaleString('uz-UZ') + " so'm";
const fmtDate  = (s: string) => new Date(s).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtTime  = (s: string) => new Date(s).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
const fmtLong  = (s: string) => new Date(s).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();

const PAY_LABEL: Record<string, string> = {
  cash: 'Naqd', card: 'Karta', credit: 'Nasiya',
  mixed: 'Aralash', partial: 'Qisman', transfer: "O'tkazma",
};
const MONTH_NAMES = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'];

function groupByDate(sales: Sale[]) {
  const today = new Date().toDateString();
  const yest  = new Date(Date.now() - 86400000).toDateString();
  const map: Record<string, Sale[]> = {};
  for (const s of sales) {
    const d = new Date(s.createdAt).toDateString();
    const key = d === today ? 'BUGUN' : d === yest ? 'KECHA' : fmtLong(s.createdAt);
    if (!map[key]) map[key] = [];
    map[key].push(s);
  }
  return Object.entries(map).map(([label, items]) => ({ label, items }));
}

function computeStats(sales: Sale[]) {
  const done = sales.filter((s) => s.status === 'completed');
  const total = done.reduce((a, s) => a + Number(s.totalAmount), 0);
  const months: Record<string, { count: number; amount: number }> = {};
  done.forEach((s) => {
    const k = s.createdAt.slice(0, 7);
    if (!months[k]) months[k] = { count: 0, amount: 0 };
    months[k].count++;
    months[k].amount += Number(s.totalAmount);
  });
  return { totalSales: done.length, totalAmount: total, avg: done.length ? total / done.length : 0, months };
}

interface CForm { name: string; phone: string; address: string }
const blank = (): CForm => ({ name: '', phone: '', address: '' });

// ── Component ──────────────────────────────────────────────────────────────────
export default function Customers() {
  const tenantId   = useTenantStore((s) => s.tenantId);
  const hasFeature = useFeaturesStore((s) => s.hasFeature);
  const canDebt    = hasFeature('customers_debt_tracking');
  const canExcel   = hasFeature('customers_excel_export');
  const canStats   = hasFeature('customers_statistics');
  const addToast   = useToastStore((s) => s.toast);

  // list
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [filterTab, setFilterTab] = useState<'all'|'debtors'|'paid'>('all');
  const debounceRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const [q, setQ] = useState('');

  // form modal
  const [showModal,  setShowModal]  = useState(false);
  const [editTarget, setEditTarget] = useState<Customer|null>(null);
  const [form,       setForm]       = useState<CForm>(blank());
  const [submitting, setSubmitting] = useState(false);

  // delete
  const [delTarget, setDelTarget] = useState<Customer|null>(null);
  const [deleting,  setDeleting]  = useState(false);

  // detail page
  const [profile,      setProfile]      = useState<Customer|null>(null);
  const [profDebts,    setProfDebts]    = useState<Debt[]>([]);
  const [profSales,    setProfSales]    = useState<Sale[]>([]);
  const [profTab,      setProfTab]      = useState<'sales'|'stats'>('sales');
  const [profLoad,     setProfLoad]     = useState(false);
  const [expandedSale, setExpandedSale] = useState<string|null>(null);

  // date filter — list page header
  const [listShowDate, setListShowDate] = useState(false);
  const [listDateFrom, setListDateFrom] = useState('');
  const [listDateTo,   setListDateTo]   = useState('');
  const datePickRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listShowDate) return;
    const handler = (e: MouseEvent) => {
      if (datePickRef.current && !datePickRef.current.contains(e.target as Node)) {
        setListShowDate(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [listShowDate]);

  // date filter — detail sales tab
  const [showDate, setShowDate] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  // debt modal
  const [showDebtModal, setShowDebtModal] = useState(false);

  // pay modal
  const [payDebt,   setPayDebt]   = useState<Debt|null>(null);
  const [payAll,    setPayAll]    = useState(false);
  const [payAmt,    setPayAmt]    = useState('');
  const [payMethod, setPayMethod] = useState<'cash'|'card'>('cash');
  const [payNote,   setPayNote]   = useState('');
  const [paying,    setPaying]    = useState(false);

  // portal access modal
  const [showPortal,  setShowPortal]  = useState(false);
  const [portalPw,    setPortalPw]    = useState('');
  const [portalLoad,  setPortalLoad]  = useState(false);
  const [portalErr,   setPortalErr]   = useState('');
  const [showPortalPw, setShowPortalPw] = useState(false);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchCustomers = useCallback(() => {
    setLoading(true);
    getCustomers(tenantId)
      .then(setCustomers)
      .catch(() => addToast("Ma'lumot yuklashda xatolik"))
      .finally(() => setLoading(false));
  }, [tenantId]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const onSearch = (v: string) => {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQ(v), 400);
  };

  // ── open detail ────────────────────────────────────────────────────────────
  const openProfile = async (c: Customer) => {
    setProfile(c);
    setProfTab('sales');
    setExpandedSale(null);
    setShowDate(false);
    setDateFrom(''); setDateTo('');
    setProfLoad(true);
    try {
      const [debts, allSales] = await Promise.all([
        canDebt ? getDebts(tenantId, c.id) : Promise.resolve([]),
        getSales(tenantId),
      ]);
      setProfDebts(debts);
      setProfSales(
        allSales
          .filter((s) => s.customerId === c.id || s.customerName === c.name)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      );
    } catch { /* silent */ }
    finally { setProfLoad(false); }
  };

  const closeProfile = () => {
    setProfile(null); setProfDebts([]); setProfSales([]);
    setShowDebtModal(false); setPayDebt(null); setPayAll(false);
  };

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const openAdd  = () => { setEditTarget(null); setForm(blank()); setShowModal(true); };
  const openEdit = (c: Customer) => {
    setEditTarget(c);
    setForm({ name: c.name, phone: c.phone ?? '', address: c.address ?? '' });
    setShowModal(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      if (editTarget) {
        const updated = await updateCustomer(editTarget.id, { name: form.name, phone: form.phone || undefined, address: form.address || undefined });
        setProfile((p) => p?.id === editTarget.id ? { ...p, ...updated } : p);
        setCustomers((cs) => cs.map((c) => c.id === editTarget.id ? { ...c, ...updated } : c));
      } else {
        await createCustomer({ tenantId, name: form.name, phone: form.phone || undefined, address: form.address || undefined });
        fetchCustomers();
      }
      setShowModal(false);
      addToast(editTarget ? 'Mijoz yangilandi' : "Mijoz qo'shildi", 'success');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      addToast(msg ?? 'Saqlashda xatolik yuz berdi');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!delTarget) return; setDeleting(true);
    try {
      await deleteCustomer(delTarget.id);
      addToast("Mijoz o'chirildi", 'success');
      setDelTarget(null);
      if (profile?.id === delTarget.id) closeProfile();
      fetchCustomers();
    } catch {
      addToast("O'chirishda xatolik yuz berdi");
    } finally { setDeleting(false); }
  };

  // ── excel / CSV export helpers ─────────────────────────────────────────────
  const genCsv = (data: Customer[], filename: string) => {
    const hdr  = ["Ism", "Telefon", "Manzil", "Qarz (so'm)", "Ro'yxatdan o'tgan"];
    const body = data.map((c) => [
      `"${c.name}"`, c.phone ?? '', c.address ?? '',
      Number(c.totalDebt), fmtDate(c.createdAt),
    ]);
    const csv  = [hdr, ...body].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  // ── date presets ────────────────────────────────────────────────────────────
  const applyPreset = (key: 'today'|'week'|'month'|'prev') => {
    const now = new Date();
    const iso = (d: Date) => d.toISOString().slice(0,10);
    if (key === 'today') {
      const t = iso(now); setListDateFrom(t); setListDateTo(t);
    } else if (key === 'week') {
      const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay()+6)%7));
      setListDateFrom(iso(mon)); setListDateTo(iso(now));
    } else if (key === 'month') {
      setListDateFrom(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`);
      setListDateTo(iso(now));
    } else {
      const first = new Date(now.getFullYear(), now.getMonth()-1, 1);
      const last  = new Date(now.getFullYear(), now.getMonth(), 0);
      setListDateFrom(iso(first)); setListDateTo(iso(last));
    }
  };

  // Customers filtered by list-page date (by registration date)
  const listDateFiltered = (listDateFrom || listDateTo)
    ? customers.filter((c) => {
        const d = c.createdAt.slice(0, 10);
        return (!listDateFrom || d >= listDateFrom) && (!listDateTo || d <= listDateTo);
      })
    : customers;

  // "Excel" — all customers (date-filtered), tries backend xlsx first, falls back to CSV
  const handleExcelList = async () => {
    try {
      if (!listDateFrom && !listDateTo) {
        const blob = await exportCustomersExcel(tenantId);
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `mijozlar_${new Date().toISOString().slice(0,10)}.xlsx`; a.click();
        URL.revokeObjectURL(url);
      } else {
        genCsv(listDateFiltered, `mijozlar_${listDateFrom||''}_${listDateTo||''}.csv`);
      }
    } catch { addToast('Excel yuklashda xatolik yuz berdi'); }
  };

  // "Qarzdorlar" — only debtors (date-filtered)
  const handleDebtorsDownload = () => {
    const data = listDateFiltered.filter((c) => Number(c.totalDebt) > 0);
    if (!data.length) { addToast("Qarzdor mijoz topilmadi", 'info'); return; }
    const suffix = listDateFrom || listDateTo ? `_${listDateFrom||''}_${listDateTo||''}` : `_${new Date().toISOString().slice(0,10)}`;
    genCsv(data, `qarzdorlar${suffix}.csv`);
  };

  const handleSalesExcel = () => {
    const rows = filteredSales();
    if (!rows.length) return;
    const hdr  = ['Raqam','Sana','Vaqt',"To'lov",'Status','Summa'];
    const body = rows.map((s) => [
      s.id.slice(-8).toUpperCase(), fmtDate(s.createdAt), fmtTime(s.createdAt),
      PAY_LABEL[s.paymentType] ?? s.paymentType, s.status, Number(s.totalAmount),
    ]);
    const csv  = [hdr, ...body].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${profile?.name ?? 'mijoz'}_savdolar.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── pay ────────────────────────────────────────────────────────────────────
  const openPaySingle = (d: Debt) => {
    setPayDebt(d); setPayAll(false);
    setPayAmt(String(Number(d.remainingAmount)));
    setPayMethod('cash'); setPayNote('');
  };
  const openPayAll = () => {
    const active = profDebts.filter((d) => d.status === 'pending' || d.status === 'partial');
    setPayDebt(null); setPayAll(true);
    setPayAmt(String(active.reduce((s, d) => s + Number(d.remainingAmount), 0)));
    setPayMethod('cash'); setPayNote('');
  };

  const handlePay = async (e: FormEvent) => {
    e.preventDefault(); if (!profile) return;
    setPaying(true);
    const amount  = Number(payAmt);
    const noteStr = [payMethod === 'cash' ? 'Naqd' : 'Karta', payNote].filter(Boolean).join(' — ');
    try {
      if (payAll) {
        const active = [...profDebts]
          .filter((d) => d.status === 'pending' || d.status === 'partial')
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        let left = amount;
        for (const debt of active) {
          if (left <= 0) break;
          const toPay = Math.min(left, Number(debt.remainingAmount));
          await recordDebtPayment(debt.id, toPay, noteStr || undefined);
          left -= toPay;
        }
      } else if (payDebt) {
        await recordDebtPayment(payDebt.id, amount, noteStr || undefined);
      }
      setPayDebt(null); setPayAll(false);
      const debts = await getDebts(tenantId, profile.id);
      setProfDebts(debts);
      const remaining = debts.filter((d) => d.status === 'pending' || d.status === 'partial').reduce((s, d) => s + Number(d.remainingAmount), 0);
      setProfile((p) => p ? { ...p, totalDebt: remaining } : p);
      setCustomers((cs) => cs.map((c) => c.id === profile.id ? { ...c, totalDebt: remaining } : c));
      if (remaining === 0) setShowDebtModal(false);
      addToast("To'lov muvaffaqiyatli qayd etildi", 'success');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      addToast(msg ?? "To'lovda xatolik yuz berdi");
    } finally { setPaying(false); }
  };

  const printFaktura = () => {
    const active = profDebts.filter((d) => d.status === 'pending' || d.status === 'partial');
    const total  = active.reduce((s, d) => s + Number(d.remainingAmount), 0);
    const rows   = active.map((d, i) => `<tr><td>${i+1}</td><td>${fmtDate(d.createdAt)}</td><td>${fmt(Number(d.originalAmount))}</td><td style="color:#ef4444;font-weight:700">${fmt(Number(d.remainingAmount))}</td></tr>`).join('');
    const html   = `<html><head><title>Faktura — ${profile?.name}</title><style>body{font-family:sans-serif;padding:24px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{padding:8px 12px;border:1px solid #e2e8f0;text-align:left}th{background:#f8fafc}.ft{background:#1e293b;color:#fff}.hd{display:flex;justify-content:space-between;margin-bottom:12px}</style></head><body><div class="hd"><div><h2 style="margin:0">QARZDORLIK FAKTURASI</h2><p style="color:#64748b;font-size:12px">${new Date().toLocaleDateString('uz-UZ')}</p></div><div style="text-align:right"><strong>${profile?.name}</strong><p style="color:#64748b;font-size:12px">${profile?.phone??''}</p></div></div><table><thead><tr><th>№</th><th>Sana</th><th>Asl qarz</th><th>Qoldiq</th></tr></thead><tbody>${rows}</tbody><tfoot><tr class="ft"><td colspan="3">Jami:</td><td>${fmt(total)}</td></tr></tfoot></table></body></html>`;
    const w = window.open('','_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300); }
  };

  // ── derived ────────────────────────────────────────────────────────────────
  const debtors   = listDateFiltered.filter((c) => Number(c.totalDebt) > 0);
  const totalDebt = debtors.reduce((s, c) => s + Number(c.totalDebt), 0);
  const tabList   = filterTab === 'debtors' ? debtors
    : filterTab === 'paid' ? listDateFiltered.filter((c) => !Number(c.totalDebt))
    : listDateFiltered;
  const filtered  = q ? tabList.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone??'').includes(q)) : tabList;

  const activeDebts    = profDebts.filter((d) => d.status === 'pending' || d.status === 'partial');
  const totalRemaining = activeDebts.reduce((s, d) => s + Number(d.remainingAmount), 0);
  const profStats      = computeStats(profSales);

  const filteredSales = () => {
    if (!dateFrom && !dateTo) return profSales;
    return profSales.filter((s) => {
      const d = s.createdAt.slice(0,10);
      return (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
    });
  };

  const payMax = payAll ? activeDebts.reduce((s,d) => s + Number(d.remainingAmount), 0) : payDebt ? Number(payDebt.remainingAmount) : 0;

  // ══════════════════════════════════════════════════════════════════════════════
  // DETAIL PAGE
  // ══════════════════════════════════════════════════════════════════════════════
  if (profile) {
    const sales  = filteredSales();
    const groups = groupByDate(sales);
    const hasDF  = dateFrom || dateTo;

    return (
      <div className="page">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="cxd-header">
          <button className="cxd-back" onClick={closeProfile}><ArrowLeft size={18} /></button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="cxd-name">{profile.name}</div>
            {(profile.phone || profile.address) && (
              <div className="cxd-sub">
                {profile.phone}{profile.address ? ` · ${profile.address}` : ''}
              </div>
            )}
          </div>
          <button className="btn-icon" onClick={() => openEdit(profile)}><Pencil size={15}/></button>
          <button
            className="btn-icon"
            style={profile.portalEnabled ? { color: '#10b981', borderColor: 'rgba(16,185,129,0.35)' } : {}}
            title={profile.portalEnabled ? 'Portal kirish bekor qilish' : 'Portal kirish berish'}
            onClick={() => { setPortalPw(''); setPortalErr(''); setShowPortalPw(false); setShowPortal(true); }}
          >
            <Globe size={15}/>
          </button>
          <button className="btn-icon btn-icon--danger" onClick={() => setDelTarget(profile)}><Trash2 size={15}/></button>
        </div>

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        {!profLoad && (
          <div className="cxd-stats">
            <div className="cxd-stat cxd-stat--blue">
              <ShoppingBag size={16}/>
              <div>
                <div className="cxd-stat-num">{profStats.totalSales}</div>
                <div className="cxd-stat-lbl">Savdolar</div>
              </div>
            </div>
            <div className="cxd-stat cxd-stat--green">
              <TrendingUp size={16}/>
              <div>
                <div className="cxd-stat-num">{fmt(profStats.totalAmount)}</div>
                <div className="cxd-stat-lbl">Jami</div>
              </div>
            </div>
            {canDebt && (
              <div
                className={`cxd-stat cxd-stat--red${totalRemaining > 0 ? ' cxd-stat--link' : ''}`}
                onClick={() => totalRemaining > 0 && setShowDebtModal(true)}
              >
                <AlertCircle size={16}/>
                <div>
                  <div className="cxd-stat-num">{totalRemaining > 0 ? fmt(totalRemaining) : '—'}</div>
                  <div className="cxd-stat-lbl">
                    Qarz{totalRemaining > 0 && <span className="cxd-see"> · ko'rish →</span>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div className="cxd-tabs">
          <button className={`cxd-tab${profTab==='sales'?' active':''}`} onClick={() => setProfTab('sales')}>
            <ShoppingBag size={13}/> Savdolar
          </button>
          {canStats && (
            <button className={`cxd-tab${profTab==='stats'?' active':''}`} onClick={() => setProfTab('stats')}>
              <BarChart2 size={13}/> Statistika
            </button>
          )}
        </div>

        {/* ── Savdolar tab ─────────────────────────────────────────────────── */}
        {profTab === 'sales' && (
          <>
            <div className="cxd-toolbar">
              <button
                className={`btn-secondary cxd-datebtn${showDate?' cxd-datebtn--on':''}${hasDF?' cxd-datebtn--active':''}`}
                onClick={() => setShowDate(!showDate)}
              >
                <Calendar size={13}/>
                {hasDF ? `${dateFrom||'...'} — ${dateTo||'...'}` : 'Sana filteri'}
              </button>
              {canExcel && (
                <button className="cxd-excel-btn" onClick={handleSalesExcel}>
                  <Download size={13}/> Savdolarni Excel ga
                </button>
              )}
            </div>

            {showDate && (
              <div className="cxd-date-row">
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}/>
                <span style={{ color:'var(--text-muted)', fontSize:'0.78rem' }}>—</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}/>
                {hasDF && (
                  <button className="btn-secondary" style={{ padding:'0.25rem 0.5rem', fontSize:'0.75rem' }}
                    onClick={() => { setDateFrom(''); setDateTo(''); }}>
                    Tozalash
                  </button>
                )}
              </div>
            )}

            {profLoad && <p className="state-msg">Yuklanmoqda...</p>}

            {!profLoad && (
              <div style={{ marginTop:'0.75rem' }}>
                {groups.length === 0 ? (
                  <div className="cx-empty">
                    {hasDF ? 'Bu sana oraligida sotuv topilmadi' : "Sotuv yo'q"}
                  </div>
                ) : groups.map(({ label, items }) => (
                  <div key={label} className="cx-date-group">
                    <div className="cxd-date-lbl">
                      <Calendar size={11}/>{label}
                      <span className="cxd-date-cnt">{items.length} ta</span>
                    </div>

                    {items.map((s) => {
                      const isExp   = expandedSale === s.id;
                      const isNasiya = s.paymentType === 'credit' || s.paymentType === 'partial';
                      const sDebt   = profDebts.find((d) => d.saleId === s.id && (d.status==='pending'||d.status==='partial'));

                      return (
                        <div key={s.id} className={`cxd-sale${isNasiya && sDebt ? ' cxd-sale--debt' : ''}`}>
                          <div className="cxd-sale-head" onClick={() => setExpandedSale(isExp ? null : s.id)}>
                            <div className={`cxd-sale-icon${isNasiya && sDebt ? ' cxd-sale-icon--debt':''}`}>
                              <ShoppingBag size={14}/>
                            </div>
                            <div className="cxd-sale-mid">
                              <div className="cxd-sale-top">
                                <span className="cxd-sale-num">#{s.id.slice(-10).toUpperCase()}</span>
                                <span className="badge" style={{
                                  background: isNasiya ? '#ef444420' : s.status==='completed' ? '#22c55e20' : '#f59e0b20',
                                  color:      isNasiya ? '#ef4444'   : s.status==='completed' ? '#22c55e'   : '#f59e0b',
                                  fontSize: '0.68rem',
                                }}>
                                  {PAY_LABEL[s.paymentType] ?? s.paymentType}
                                </span>
                              </div>
                              <div className="cxd-sale-time">{fmtTime(s.createdAt)}</div>
                            </div>
                            <div className="cxd-sale-right">
                              <div className="cxd-sale-amount">{fmt(Number(s.totalAmount))}</div>
                              {sDebt && <div className="cxd-sale-debtamt">{fmt(Number(sDebt.remainingAmount))} qarz</div>}
                            </div>
                            {isExp ? <ChevronUp size={14} style={{color:'var(--text-muted)',flexShrink:0}}/> : <ChevronDown size={14} style={{color:'var(--text-muted)',flexShrink:0}}/>}
                          </div>

                          {isExp && (
                            <div className="cxd-sale-body">
                              {s.items?.length > 0 && (
                                <div className="cxd-items">
                                  {s.items.map((item, i) => (
                                    <div key={i} className="cxd-item">
                                      <span className="cxd-item-name">{item.name}</span>
                                      <span className="cxd-item-qty">{item.quantity} × {fmt(Number(item.price))}</span>
                                      <span className="cxd-item-total">{fmt(Number(item.price) * Number(item.quantity))}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="cxd-sale-foot">
                                <span>{PAY_LABEL[s.paymentType] ?? s.paymentType}</span>
                                {Number(s.discount) > 0 && <span style={{color:'#f59e0b'}}>Chegirma: {fmt(Number(s.discount))}</span>}
                                <strong style={{marginLeft:'auto'}}>{fmt(Number(s.totalAmount))}</strong>
                              </div>
                              {sDebt && (
                                <div className="cxd-debt-row">
                                  <span>Qarz qoldig'i: <strong style={{color:'#ef4444'}}>{fmt(Number(sDebt.remainingAmount))}</strong></span>
                                  <button className="cx-pay-btn" onClick={() => openPaySingle(sDebt)}>To'lash</button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Statistika tab ───────────────────────────────────────────────── */}
        {profTab === 'stats' && canStats && (
          <div className="cx-stats-tab" style={{marginTop:'1rem'}}>
            <div className="cx-stats-grid">
              <div className="cx-stat-info">
                <div className="cx-stat-info-label">O'rtacha xarid</div>
                <div className="cx-stat-info-val">{fmt(profStats.avg)}</div>
              </div>
              <div className="cx-stat-info">
                <div className="cx-stat-info-label">Ro'yxatdan o'tgan</div>
                <div className="cx-stat-info-val">{fmtDate(profile.createdAt)}</div>
              </div>
            </div>
            {Object.keys(profStats.months).length > 0 && (
              <div className="cx-monthly">
                <div className="cx-monthly-title">Oylik statistika</div>
                {Object.entries(profStats.months)
                  .sort(([a],[b]) => b.localeCompare(a))
                  .slice(0,12)
                  .map(([key, val]) => {
                    const [y,m] = key.split('-');
                    const maxAmt = Math.max(...Object.values(profStats.months).map((v) => v.amount));
                    const pct = maxAmt > 0 ? (val.amount / maxAmt) * 100 : 0;
                    return (
                      <div key={key} className="cx-monthly-row">
                        <span className="cx-monthly-month">{MONTH_NAMES[Number(m)-1]} {y}</span>
                        <div className="cx-monthly-bar-wrap"><div className="cx-monthly-bar" style={{width:`${pct}%`}}/></div>
                        <span className="cx-monthly-amount">{fmt(val.amount)}</span>
                        <span className="cx-monthly-count">{val.count} ta</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ── Debt Modal ───────────────────────────────────────────────────── */}
        {showDebtModal && (
          <div className="modal-overlay" onClick={() => setShowDebtModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxWidth:'460px'}}>
              <div className="modal-header">
                <h3>Faol qarzlar</h3>
                <button className="modal-close" onClick={() => setShowDebtModal(false)}>×</button>
              </div>
              <div style={{padding:'0 1.5rem', maxHeight:'55vh', overflowY:'auto'}}>
                {activeDebts.map((d) => (
                  <div key={d.id} style={{display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.65rem 0', borderBottom:'1px solid var(--border)'}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'0.78rem', fontWeight:600}}>#{d.saleId.slice(-10).toUpperCase()}</div>
                      <div style={{fontSize:'0.68rem', color:'var(--text-muted)'}}>{fmtDate(d.createdAt)}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{color:'#ef4444', fontWeight:700, fontSize:'0.88rem'}}>{fmt(Number(d.remainingAmount))}</div>
                      {Number(d.originalAmount) !== Number(d.remainingAmount) && (
                        <div style={{fontSize:'0.68rem', color:'var(--text-muted)', textDecoration:'line-through'}}>{fmt(Number(d.originalAmount))}</div>
                      )}
                    </div>
                    <button className="cx-pay-btn" onClick={() => { setShowDebtModal(false); openPaySingle(d); }}>To'lash</button>
                  </div>
                ))}
              </div>
              <div style={{padding:'1rem 1.5rem', borderTop:'1px solid var(--border)', display:'flex', gap:'0.5rem'}}>
                <button className="btn-secondary" onClick={printFaktura}>PDF faktura</button>
                <button className="btn-primary" style={{flex:1, background:'#10b981', borderColor:'#10b981'}}
                  onClick={() => { setShowDebtModal(false); openPayAll(); }}>
                  Jami {fmt(totalRemaining)} to'lash
                </button>
              </div>
            </div>
          </div>
        )}

        {/* shared modals (form, delete, pay, portal) rendered below */}
        {renderFormModal()}
        {renderDeleteModal()}
        {renderPayModal()}
        {renderPortalModal()}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // LIST PAGE
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Mijozlar</h2>
          <div className="cxl-sub">
            {listDateFiltered.length} ta mijoz · {debtors.length} ta qarzdor
            {(listDateFrom || listDateTo) && (
              <span style={{color:'var(--primary)', marginLeft:'0.4rem', fontSize:'0.72rem'}}>
                ({listDateFrom||'...'} — {listDateTo||'...'})
              </span>
            )}
          </div>
        </div>
        <div style={{display:'flex', gap:'0.4rem', flexWrap:'wrap', alignItems:'center'}}>

          {canExcel && (
            <>
              {/* Date picker dropdown */}
              <div ref={datePickRef} style={{position:'relative'}}>
                <button
                  className={`btn-secondary cxl-datebtn${listShowDate?' cxl-datebtn--on':''}${(listDateFrom||listDateTo)?' cxl-datebtn--active':''}`}
                  onClick={() => setListShowDate(!listShowDate)}
                >
                  <Calendar size={13}/>
                  {(listDateFrom||listDateTo) ? `${listDateFrom||'...'} — ${listDateTo||'...'}` : 'Sana'}
                </button>

                {listShowDate && (
                  <div className="cx-datepick">
                    <div className="cx-datepick-presets">
                      {(['today','week','month','prev'] as const).map((k) => (
                        <button key={k} className="cx-datepick-preset" onClick={() => applyPreset(k)}>
                          {k==='today'?'Bugun': k==='week'?'Bu hafta': k==='month'?'Bu oy':"O'tgan oy"}
                        </button>
                      ))}
                    </div>
                    <div className="cx-datepick-fields">
                      <div className="cx-datepick-field">
                        <span>Dan</span>
                        <input type="date" value={listDateFrom} onChange={(e) => setListDateFrom(e.target.value)}/>
                      </div>
                      <div className="cx-datepick-arrow">→</div>
                      <div className="cx-datepick-field">
                        <span>Gacha</span>
                        <input type="date" value={listDateTo} onChange={(e) => setListDateTo(e.target.value)}/>
                      </div>
                    </div>
                    {(listDateFrom||listDateTo) && (
                      <div className="cx-datepick-foot">
                        <button onClick={() => { setListDateFrom(''); setListDateTo(''); }}>
                          Tozalash
                        </button>
                        <button className="cx-datepick-apply" onClick={() => setListShowDate(false)}>
                          Qo'llash
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Qarzdorlar download */}
              <button className="cxl-debt-btn" onClick={handleDebtorsDownload}>
                <Download size={13}/> Qarzdorlar
              </button>

              {/* Excel — all customers */}
              <button className="btn-secondary" onClick={handleExcelList}
                style={{display:'flex', alignItems:'center', gap:'0.35rem'}}>
                <Download size={13}/> Excel
              </button>
            </>
          )}

          <button className="btn-primary" onClick={openAdd}>+ Yangi</button>
        </div>
      </div>

      {/* Stats */}
      <div className="cx-stats-row">
        <div className="cx-stat-tile">
          <Users size={16} style={{color:'var(--primary)'}}/>
          <div><div className="cx-stat-num">{customers.length}</div><div className="cx-stat-label">Jami mijozlar</div></div>
        </div>
        <div className="cx-stat-tile cx-stat-tile--danger">
          <AlertCircle size={16} style={{color:'#ef4444'}}/>
          <div><div className="cx-stat-num">{debtors.length}</div><div className="cx-stat-label">Qarzdorlar</div></div>
        </div>
        <div className="cx-stat-tile cx-stat-tile--danger">
          <TrendingUp size={16} style={{color:'#f59e0b'}}/>
          <div><div className="cx-stat-num">{fmt(totalDebt)}</div><div className="cx-stat-label">Jami qarz</div></div>
        </div>
      </div>

      {/* Search */}
      <div className="toolbar">
        <input type="search" className="search-input" placeholder="Ism yoki telefon..."
          value={search} onChange={(e) => onSearch(e.target.value)}/>
        <span className="toolbar-count">{filtered.length} ta</span>
      </div>

      {/* Filter tabs */}
      <div className="cx-filter-row">
        {(['all','debtors','paid'] as const).map((k) => (
          <button key={k} className={`cx-filter-btn${filterTab===k?' active':''}`} onClick={() => setFilterTab(k)}>
            {k==='all'?'Barchasi':k==='debtors'?`Qarzdorlar (${debtors.length})`:"To'lagan"}
          </button>
        ))}
      </div>

      {loading && <p className="state-msg">Yuklanmoqda...</p>}

      {!loading && (
        <div className="cx-list">
          {filtered.length === 0 ? (
            <div className="cx-empty">{q ? 'Topilmadi' : "Hali mijoz qo'shilmagan"}</div>
          ) : filtered.map((c) => {
            const hasDebt = Number(c.totalDebt) > 0;
            return (
              <div key={c.id} className={`cx-row${hasDebt?' cx-row--debt':''}`} onClick={() => openProfile(c)}>
                <div className={`cx-avatar${hasDebt?' cx-avatar--debt':''}`}>{c.name[0].toUpperCase()}</div>
                <div className="cx-row-info">
                  <div className="cx-row-name">{c.name}</div>
                  <div className="cx-row-sub">{c.phone||'—'}{c.address?` · ${c.address}`:''}</div>
                </div>
                <div className="cx-row-right">
                  {hasDebt ? (
                    <div style={{textAlign:'right'}}>
                      <div className="cx-debt-badge">{fmt(Number(c.totalDebt))}</div>
                      <div style={{fontSize:'0.63rem',color:'#ef4444',marginTop:'1px'}}>qarz</div>
                    </div>
                  ) : (
                    <span className="cx-paid-badge">To'lagan</span>
                  )}
                  <ChevronDown size={14} style={{color:'var(--text-muted)', flexShrink:0}}/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {renderFormModal()}
      {renderDeleteModal()}
      {renderPayModal()}
    </div>
  );

  // ── Shared modal renderers ─────────────────────────────────────────────────
  function renderFormModal() {
    if (!showModal) return null;
    return (
      <div className="modal-overlay" onClick={() => setShowModal(false)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{editTarget ? 'Mijozni tahrirlash' : 'Yangi mijoz'}</h3>
            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
          </div>
          <form onSubmit={handleSave} className="modal-form">
            <div className="field">
              <label>Ismi *</label>
              <input type="text" placeholder="Alisher Karimov" value={form.name} autoFocus required
                onChange={(e) => setForm({...form, name: e.target.value})}/>
            </div>
            <div className="field">
              <label>Telefon</label>
              <input type="tel" placeholder="+998 90 123 45 67" value={form.phone}
                onChange={(e) => setForm({...form, phone: e.target.value})}/>
            </div>
            <div className="field">
              <label>Manzil</label>
              <input type="text" placeholder="Toshkent, Chilonzor" value={form.address}
                onChange={(e) => setForm({...form, address: e.target.value})}/>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Bekor</button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  function renderDeleteModal() {
    if (!delTarget) return null;
    return (
      <div className="modal-overlay" onClick={() => setDelTarget(null)}>
        <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Mijozni o'chirish</h3>
            <button className="modal-close" onClick={() => setDelTarget(null)}>×</button>
          </div>
          <div style={{padding:'1rem 1.5rem'}}>
            <p><strong>{delTarget.name}</strong> ni o'chirishni tasdiqlaysizmi?</p>
            {Number(delTarget.totalDebt) > 0 && (
              <p style={{color:'#ef4444', fontSize:'0.85rem', marginTop:'0.5rem'}}>
                Bu mijozda <strong>{fmt(Number(delTarget.totalDebt))}</strong> qarz mavjud!
              </p>
            )}
          </div>
          <div className="modal-actions" style={{padding:'0 1.5rem 1.5rem'}}>
            <button className="btn-secondary" onClick={() => setDelTarget(null)}>Bekor</button>
            <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "O'chirilmoqda..." : "O'chirish"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderPortalModal() {
    if (!showPortal || !profile) return null;
    const isEnabled = profile.portalEnabled;

    const handleEnable = async (e: FormEvent) => {
      e.preventDefault();
      if (!portalPw.trim()) { setPortalErr("Parol kiritilishi shart"); return; }
      setPortalLoad(true); setPortalErr('');
      try {
        await setCustomerPortalAccess(profile.id, portalPw);
        setProfile((p) => p ? { ...p, portalEnabled: true } : p);
        setCustomers((cs) => cs.map((c) => c.id === profile.id ? { ...c, portalEnabled: true } : c));
        setShowPortal(false);
        addToast('Portal kirish berildi', 'success');
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setPortalErr(msg ?? 'Xatolik yuz berdi');
      } finally { setPortalLoad(false); }
    };

    const handleDisable = async () => {
      setPortalLoad(true); setPortalErr('');
      try {
        await removeCustomerPortalAccess(profile.id);
        setProfile((p) => p ? { ...p, portalEnabled: false } : p);
        setCustomers((cs) => cs.map((c) => c.id === profile.id ? { ...c, portalEnabled: false } : c));
        setShowPortal(false);
        addToast('Portal kirish bekor qilindi', 'success');
      } catch {
        setPortalErr('Xatolik yuz berdi');
      } finally { setPortalLoad(false); }
    };

    return (
      <div className="modal-overlay" onClick={() => setShowPortal(false)}>
        <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Portal kirish</h3>
            <button className="modal-close" onClick={() => setShowPortal(false)}>×</button>
          </div>

          {isEnabled ? (
            <div style={{ padding: '1rem 1.5rem 1.5rem' }}>
              <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <strong>{profile.name}</strong> hozirda portal kirish huquqiga ega.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
                Kirish huquqini bekor qilsangiz, mijoz portolga kira olmaydi.
              </p>
              {portalErr && (
                <div style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{portalErr}</div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-secondary" onClick={() => setShowPortal(false)}>Bekor</button>
                <button className="btn-danger" onClick={handleDisable} disabled={portalLoad} style={{ flex: 1 }}>
                  {portalLoad ? 'Bekor qilinmoqda...' : 'Kirish huquqini bekor qilish'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleEnable} className="modal-form">
              <p style={{ margin: '0 0 1rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                <strong>{profile.name}</strong> uchun portal paroli o'rnating. Mijoz bu parol bilan kiradi.
              </p>
              {portalErr && (
                <div style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{portalErr}</div>
              )}
              <div className="field">
                <label>Parol *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPortalPw ? 'text' : 'password'}
                    placeholder="Kamida 6 ta belgi"
                    value={portalPw}
                    onChange={(e) => setPortalPw(e.target.value)}
                    autoFocus
                    style={{ paddingRight: '2.5rem', width: '100%', boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPortalPw((v) => !v)}
                    style={{ position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.9rem' }}
                    tabIndex={-1}
                  >
                    {showPortalPw ? '●' : '○'}
                  </button>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowPortal(false)}>Bekor</button>
                <button
                  type="submit" className="btn-primary"
                  style={{ background: '#10b981', borderColor: '#10b981' }}
                  disabled={portalLoad}
                >
                  {portalLoad ? 'Saqlanmoqda...' : 'Portal kirish berish'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  function renderPayModal() {
    if (!payDebt && !payAll) return null;
    return (
      <div className="modal-overlay" onClick={() => { setPayDebt(null); setPayAll(false); }}>
        <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{payAll ? "Jami qarzni to'lash" : "Qarz to'lovi"}</h3>
            <button className="modal-close" onClick={() => { setPayDebt(null); setPayAll(false); }}>×</button>
          </div>
          <form onSubmit={handlePay} className="modal-form">
            <div className="cx-pay-summary">
              <div style={{fontSize:'0.78rem', opacity:0.75}}>
                {payAll ? `${activeDebts.length} ta savdo — umumiy qoldiq` : "Qarz qoldig'i"}
              </div>
              <div className="cx-pay-total">{fmt(payMax)}</div>
            </div>
            <div className="field">
              <label>To'lov summasi *</label>
              <div style={{display:'flex', gap:'0.5rem'}}>
                <input type="number" min={1} max={payMax} step="any" value={payAmt} required autoFocus
                  onChange={(e) => setPayAmt(e.target.value)} style={{flex:1}}/>
                <button type="button" className="btn-secondary" onClick={() => setPayAmt(String(payMax))}>Hammasi</button>
              </div>
            </div>
            <div className="field">
              <label>To'lov usuli</label>
              <div style={{display:'flex', gap:'0.5rem'}}>
                {(['cash','card'] as const).map((m) => (
                  <button key={m} type="button"
                    className={`cx-method-btn${payMethod===m?' active':''}`}
                    onClick={() => setPayMethod(m)}>
                    {m==='cash'?'Naqd':'Karta'}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Izoh (ixtiyoriy)</label>
              <input type="text" placeholder="Masalan: qaytim..." value={payNote}
                onChange={(e) => setPayNote(e.target.value)}/>
            </div>
            {payAmt && Number(payAmt) > 0 && (
              <div className="cx-pay-preview">
                To'lovdan keyin qoladi:{' '}
                <strong style={{color: Math.max(0, payMax - Number(payAmt)) > 0 ? '#f59e0b' : '#22c55e'}}>
                  {fmt(Math.max(0, payMax - Number(payAmt)))}
                </strong>
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => { setPayDebt(null); setPayAll(false); }}>Bekor</button>
              <button type="submit" className="btn-primary" style={{background:'#10b981',borderColor:'#10b981'}}
                disabled={paying || !payAmt || Number(payAmt) <= 0}>
                {paying ? "To'lanmoqda..." : `${fmt(Number(payAmt)||0)} to'lash`}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
}
