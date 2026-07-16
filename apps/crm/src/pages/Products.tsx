import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import {
  getProducts, getCategories, createProduct, updateProduct, deleteProduct,
  exportProductsExcel, importProductsExcel,
  Product, CreateProductData,
} from '../api/products.api';
import { useTenantStore } from '../stores/tenant.store';
import { useFeaturesStore } from '../stores/features.store';
import UpgradeBanner from '../components/UpgradeBanner';

const fmtUzs = (n: number) => Number(n).toLocaleString('uz-UZ') + " so'm";
const fmtUsd = (n: number) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPrice = (p: { price: number; priceCurrency?: string }) =>
  p.priceCurrency === 'usd' ? fmtUsd(p.price) : fmtUzs(p.price);

const UNITS = ['dona', 'kg', 'litr', 'metr', 'paket', 'quti'];

function stockStatus(qty: number, min: number): { label: string; cls: string } {
  if (qty === 0) return { label: 'Tugagan', cls: 'badge--inactive' };
  if (qty <= min) return { label: 'Kam',    cls: 'badge--warning'  };
  return               { label: 'Yetarli', cls: 'badge--active'   };
}

interface ProductForm {
  name: string; category: string; price: string; costPrice: string;
  quantity: string; minStock: string; unit: string; barcode: string;
  priceCurrency: 'uzs' | 'usd';
}

const emptyForm = (): ProductForm => ({
  name: '', category: '', price: '', costPrice: '',
  quantity: '', minStock: '5', unit: 'dona', barcode: '', priceCurrency: 'uzs',
});

const toForm = (p: Product): ProductForm => ({
  name:          p.name,
  category:      p.category,
  price:         String(p.price),
  costPrice:     String(p.costPrice ?? ''),
  quantity:      String(p.quantity),
  minStock:      String(p.minStock ?? 5),
  unit:          p.unit,
  barcode:       p.barcode ?? '',
  priceCurrency: (p.priceCurrency === 'usd' ? 'usd' : 'uzs') as 'uzs' | 'usd',
});

export default function Products() {
  const tenantId   = useTenantStore((s) => s.tenantId);
  const hasFeature = useFeaturesStore((s) => s.hasFeature);
  const canImport  = hasFeature('products_excel_import');
  const canExport  = hasFeature('products_excel_export');

  const [products,   setProducts]   = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');
  const [filterCat,  setFilterCat]  = useState('');

  const [showModal,  setShowModal]  = useState(false);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [importing,  setImporting]  = useState(false);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const barcodeRef    = useRef<HTMLInputElement>(null);
  const [form,       setForm]       = useState<ProductForm>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError,  setFormError]  = useState('');
  const [scanToast,  setScanToast]  = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([getProducts(tenantId), getCategories(tenantId)])
      .then(([prods, cats]) => { setProducts(prods); setCategories(cats); })
      .catch(() => setError("Ma'lumot yuklanmadi"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (tenantId) load(); }, [tenantId]);

  const handleBarcodeScan = useCallback((code: string) => {
    if (showModal) {
      // Modal ochiq: barcode maydoniga avtomatik yoz
      setForm((prev) => ({ ...prev, barcode: code }));
      setScanToast(`Barcode o'qildi: ${code}`);
      setTimeout(() => setScanToast(null), 2000);
      setTimeout(() => barcodeRef.current?.focus(), 50);
    } else {
      // Modal yopiq: ro'yxatda qidirish
      const match = products.find((p) => p.barcode === code);
      if (match) {
        setSearch(code);
        setScanToast(`Topildi: ${match.name}`);
      } else {
        setSearch(code);
        setScanToast(`Topilmadi: ${code}`);
      }
      setTimeout(() => setScanToast(null), 2500);
    }
  }, [showModal, products]);

  useBarcodeScanner(handleBarcodeScan, true);

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      (!q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) &&
      (!filterCat || p.category === filterCat)
    );
  });

  const openAdd = () => {
    setEditingId(null); setForm(emptyForm()); setFormError(''); setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id); setForm(toForm(p)); setFormError(''); setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    const data: CreateProductData = {
      tenantId,
      name:          form.name,
      category:      form.category,
      price:         Number(form.price),
      priceCurrency: form.priceCurrency,
      costPrice:     form.costPrice ? Number(form.costPrice) : 0,
      quantity:      Number(form.quantity),
      minStock:      Number(form.minStock) || 5,
      unit:          form.unit,
      barcode:       form.barcode || undefined,
    };
    try {
      if (editingId) {
        await updateProduct(editingId, data);
      } else {
        await createProduct(data);
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Xatolik');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" ni o'chirishni tasdiqlaysizmi?`)) return;
    await deleteProduct(id).catch(() => alert("O'chirishda xatolik"));
    load();
  };

  const handleExport = async () => {
    try {
      const blob = await exportProductsExcel(tenantId);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `mahsulotlar_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
    } catch { alert('Excel yuklashda xatolik'); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const result = await importProductsExcel(tenantId, file);
      alert(`Yuklandi: ${result.created} yangi, ${result.updated} yangilandi`);
      load();
    } catch { alert("Excel import xatolik — shablon formatini tekshiring"); }
    finally { setImporting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const f =
    (k: keyof ProductForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm({ ...form, [k]: e.target.value });

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Mahsulotlar</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {canExport ? (
            <button className="btn-secondary" onClick={handleExport}>Excel</button>
          ) : (
            <UpgradeBanner feature="Excel export" requiredPlan="STARTER" compact />
          )}
          {canImport ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleImport}
              />
              <button
                className="btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                {importing ? 'Yuklanmoqda...' : 'Import'}
              </button>
            </>
          ) : (
            <UpgradeBanner feature="Excel import" requiredPlan="STARTER" compact />
          )}
          <button className="btn-primary" onClick={openAdd}>+ Mahsulot qo'shish</button>
        </div>
      </div>

      <div className="toolbar" style={{ flexWrap: 'wrap', gap: '0.6rem' }}>
        <input
          type="search"
          className="search-input"
          placeholder="Nomi yoki kategoriya..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="filter-tabs" style={{ margin: 0 }}>
          <button className={'filter-tab' + (!filterCat ? ' filter-tab--active' : '')} onClick={() => setFilterCat('')}>
            Barchasi
          </button>
          {categories.map((c) => (
            <button
              key={c}
              className={'filter-tab' + (filterCat === c ? ' filter-tab--active' : '')}
              onClick={() => setFilterCat(filterCat === c ? '' : c)}
            >
              {c}
            </button>
          ))}
        </div>
        <span className="toolbar-count">{filtered.length} ta mahsulot</span>
      </div>

      {loading && <div className="dash-loading"><div className="dash-spinner" /></div>}
      {error && <p className="dash-error">{error}</p>}

      {!loading && !error && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nomi</th>
                <th>Kategoriya</th>
                <th>Sotuv narxi</th>
                <th>Xarid narxi</th>
                <th>Qoldiq / Min</th>
                <th>Birlik</th>
                <th>Holat</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    {search || filterCat ? 'Topilmadi' : "Hali mahsulot yo'q"}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const { label, cls } = stockStatus(p.quantity, p.minStock ?? 5);
                  return (
                    <tr key={p.id}>
                      <td>
                        <span className="product-name">{p.name}</span>
                        {p.barcode && <span className="prod-barcode">{p.barcode}</span>}
                      </td>
                      <td><span className="category-tag">{p.category}</span></td>
                      <td className="amount-cell">
                        {fmtPrice(p)}
                        {p.priceCurrency === 'usd' && (
                          <span className="prod-currency-badge">USD</span>
                        )}
                      </td>
                      <td className="text-muted">{p.costPrice ? fmtUzs(Number(p.costPrice)) : '—'}</td>
                      <td className="text-muted">{p.quantity} / {p.minStock ?? 5}</td>
                      <td className="text-muted">{p.unit}</td>
                      <td><span className={`badge ${cls}`}>{label}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button className="btn-icon" onClick={() => openEdit(p)} title="Tahrirlash"><Pencil size={14} /></button>
                          <button className="btn-icon btn-icon--danger" onClick={() => handleDelete(p.id, p.name)} title="O'chirish"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              {formError && <p className="form-error">{formError}</p>}

              <div className="field">
                <label>Nomi *</label>
                <input type="text" value={form.name} onChange={f('name')} required autoFocus placeholder="Coca Cola 0.5L" />
              </div>

              <div className="form-row">
                <div className="field">
                  <label>Kategoriya *</label>
                  <input
                    type="text"
                    list="prod-cats"
                    value={form.category}
                    onChange={f('category')}
                    required
                    placeholder="Ichimliklar"
                  />
                  <datalist id="prod-cats">
                    {categories.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div className="field">
                  <label>Birlik *</label>
                  <select value={form.unit} onChange={f('unit')}>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="field">
                  <label>Valyuta</label>
                  <div className="prod-currency-toggle">
                    <button
                      type="button"
                      className={`prod-cur-btn${form.priceCurrency === 'uzs' ? ' prod-cur-btn--active' : ''}`}
                      onClick={() => setForm({ ...form, priceCurrency: 'uzs' })}
                    >
                      UZS (so'm)
                    </button>
                    <button
                      type="button"
                      className={`prod-cur-btn${form.priceCurrency === 'usd' ? ' prod-cur-btn--active' : ''}`}
                      onClick={() => setForm({ ...form, priceCurrency: 'usd' })}
                    >
                      USD ($)
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="field">
                  <label>Sotuv narxi ({form.priceCurrency === 'usd' ? '$' : "so'm"}) *</label>
                  <input
                    type="number" min="0" step="0.01" required
                    placeholder={form.priceCurrency === 'usd' ? '1.50' : '15000'}
                    value={form.price}
                    onChange={f('price')}
                  />
                </div>
                <div className="field">
                  <label>Xarid narxi (so'm)</label>
                  <input type="number" min="0" placeholder="10000" value={form.costPrice} onChange={f('costPrice')} />
                </div>
              </div>

              <div className="form-row">
                <div className="field">
                  <label>Miqdori *</label>
                  <input type="number" min="0" required placeholder="100" value={form.quantity} onChange={f('quantity')} />
                </div>
                <div className="field">
                  <label>Minimal qoldiq</label>
                  <input type="number" min="0" placeholder="5" value={form.minStock} onChange={f('minStock')} />
                </div>
              </div>

              <div className="field">
                <label>Barcode (ixtiyoriy) — skaner bilan ham o'qish mumkin</label>
                <input
                  ref={barcodeRef}
                  type="text"
                  placeholder="4600450005721 — yoki skaner bilan o'qing"
                  value={form.barcode}
                  onChange={f('barcode')}
                />
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
      )}

      {scanToast && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
          background: scanToast.startsWith('Topilmadi') ? '#ef4444' : '#10b981',
          color: '#fff', padding: '0.6rem 1.2rem', borderRadius: 10,
          fontWeight: 600, fontSize: '0.9rem', zIndex: 9999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <span>⬛</span> {scanToast}
        </div>
      )}
    </div>
  );
}
