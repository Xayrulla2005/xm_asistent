import { useCallback, useEffect, useRef, useState } from 'react';
import { useTenantStore } from '../stores/tenant.store';
import { getProducts, Product } from '../api/products.api';
import { Customer } from '../api/customers.api';
import { createSale, getReceipt, CreateSaleData, PaymentType, ReceiptData } from '../api/sales.api';
import { getWizardConfig, WizardConfig } from '../api/wizard.api';
import CustomerSearch from '../components/CustomerSearch';
import ReceiptModal from '../components/ReceiptModal';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseAmount(val: string): number {
  const n = parseFloat(val.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

const fmt = (n: number) => Number(n).toLocaleString('uz-UZ') + " so'm";
const fmtCurr = (n: number, currency: string): string => {
  if (currency === 'usd') return '$' + Number(n).toFixed(2);
  if (currency === 'rub') return '₽' + Number(n).toLocaleString('ru-RU');
  return fmt(n);
};

const CURRENCY_LABELS: Record<string, string> = { uzs: 'UZS', usd: 'USD', rub: 'RUB' };

// ── Types ─────────────────────────────────────────────────────────────────────

interface CartItem {
  productId: string;
  name:      string;
  price:     number;
  quantity:  number;
  unit:      string;
}

interface PaymentData {
  payMode:          string;
  cashAmt:          number;
  cardAmt:          number;
  transferAmt:      number;
  change:           number;
  selectedCustomer: Customer | null;
  currency:         string;
  currencyRate:     number;
}

// ── Payment Modal ─────────────────────────────────────────────────────────────

function PaymentModal({
  totalUzs,
  allowedPay,
  allowedCurr,
  customerRequired,
  currency,
  currencyRate,
  setCurrency,
  setCurrencyRate,
  onClose,
  onConfirm,
}: {
  totalUzs:         number;
  allowedPay:       string[];
  allowedCurr:      string[];
  customerRequired: string;
  currency:         string;
  currencyRate:     string;
  setCurrency:      (c: string) => void;
  setCurrencyRate:  (r: string) => void;
  onClose:          () => void;
  onConfirm:        (data: PaymentData) => void;
}) {
  const [cashStr,     setCashStr]     = useState('');
  const [cardStr,     setCardStr]     = useState('');
  const [transferStr, setTransferStr] = useState('');
  const [customer,    setCustomer]    = useState<Customer | null>(null);

  const rate        = parseAmount(currencyRate) || 1;
  const totalInCurr = currency !== 'uzs' ? totalUzs / rate : totalUzs;

  const cashAmt      = parseAmount(cashStr);
  const cardAmt      = parseAmount(cardStr);
  const transferAmt  = parseAmount(transferStr);
  const totalEntered = cashAmt + cardAmt + transferAmt;
  const remaining    = totalInCurr - totalEntered;
  const nasiya       = remaining >  0.005 ? remaining : 0;
  const change       = remaining < -0.005 ? Math.abs(remaining) : 0;

  const hasCash      = allowedPay.includes('cash');
  const hasCard      = allowedPay.includes('card');
  const hasTransfer  = allowedPay.includes('transfer');
  const nasiyaOk     = allowedPay.includes('credit');

  const payMode: string = (() => {
    if (nasiya > 0 && totalEntered === 0) return 'credit';
    if (nasiya > 0 && totalEntered > 0)  return 'partial';
    if (cashAmt > 0 && cardAmt === 0 && transferAmt === 0) return 'cash';
    if (cardAmt > 0 && cashAmt === 0 && transferAmt === 0) return 'card';
    if (transferAmt > 0 && cashAmt === 0 && cardAmt === 0) return 'transfer';
    if (totalEntered === 0) return 'credit';
    return 'mixed';
  })();

  // Customer visibility/requirement
  const showCustomerInput =
    customerRequired === 'always' ||
    customerRequired === 'optional' ||
    nasiya > 0;
  const requireCustomer =
    customerRequired === 'always' ||
    (customerRequired === 'credit_only' && nasiya > 0);
  const customerLabel =
    customerRequired === 'always'      ? 'Mijoz * (majburiy)' :
    customerRequired === 'credit_only' ? 'Mijoz * (nasiya uchun shart)' :
                                         'Mijoz (ixtiyoriy)';

  const canConfirm =
    (!requireCustomer || !!customer) &&
    (nasiya === 0 || nasiyaOk);

  const handleQuickFill = () => {
    if (hasCash) {
      setCashStr(String(totalInCurr));
      setCardStr('');
      setTransferStr('');
    }
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm({ payMode, cashAmt, cardAmt, transferAmt, change, selectedCustomer: customer, currency, currencyRate: rate });
  };

  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="payment-modal-header">
          <h3 style={{ margin: 0, fontSize: '1rem' }}>To'lovni rasmiylashtirish</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Total card */}
        <div className="payment-total-card">
          <div className="payment-total-label">JAMI TO'LOV</div>
          <div className="payment-total-amount">{fmtCurr(totalInCurr, currency)}</div>
        </div>

        {/* Currency selector */}
        {allowedCurr.length > 1 && (
          <div className="pos-currency-bar" style={{ margin: '0 0 0.5rem' }}>
            {allowedCurr.map((c) => (
              <button
                key={c}
                className={'pos-curr-btn' + (currency === c ? ' pos-curr-btn--active' : '')}
                onClick={() => { setCurrency(c); if (c === 'uzs') setCurrencyRate('1'); }}
              >
                {CURRENCY_LABELS[c] ?? c.toUpperCase()}
              </button>
            ))}
            {currency !== 'uzs' && (
              <div className="pos-rate-row">
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  1 {CURRENCY_LABELS[currency] ?? currency} =
                </span>
                <input
                  type="number"
                  className="pos-rate-input"
                  value={currencyRate === '1' ? '' : currencyRate}
                  min="1"
                  placeholder="kurs"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setCurrencyRate(e.target.value || '1')}
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>so'm</span>
              </div>
            )}
          </div>
        )}

        {/* Quick fill button */}
        {hasCash && (
          <button className="payment-quick-btn" onClick={handleQuickFill}>
            Barchasi naqd
          </button>
        )}

        {/* Payment inputs */}
        <div className="payment-inputs">
          {hasCash && (
            <div className="field">
              <label>Naqd ({currency.toUpperCase()})</label>
              <input
                type="number"
                className="pos-pay-input"
                placeholder="0"
                min="0"
                value={cashAmt === 0 ? '' : cashAmt}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setCashStr(e.target.value)}
                autoFocus
              />
            </div>
          )}
          {hasCard && (
            <div className="field">
              <label>Karta ({currency.toUpperCase()})</label>
              <input
                type="number"
                className="pos-pay-input"
                placeholder="0"
                min="0"
                value={cardAmt === 0 ? '' : cardAmt}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setCardStr(e.target.value)}
              />
            </div>
          )}
          {hasTransfer && (
            <div className="field">
              <label>Otkazma ({currency.toUpperCase()})</label>
              <input
                type="number"
                className="pos-pay-input"
                placeholder="0"
                min="0"
                value={transferAmt === 0 ? '' : transferAmt}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setTransferStr(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Live summary */}
        {(totalEntered > 0 || nasiya > 0) && (
          <div className="payment-summary">
            {cashAmt     > 0 && <div className="payment-summary-row"><span>Naqd:</span>    <span>{fmtCurr(cashAmt, currency)}</span></div>}
            {cardAmt     > 0 && <div className="payment-summary-row"><span>Karta:</span>   <span>{fmtCurr(cardAmt, currency)}</span></div>}
            {transferAmt > 0 && <div className="payment-summary-row"><span>Otkazma:</span> <span>{fmtCurr(transferAmt, currency)}</span></div>}
            {nasiya > 0 && (
              <div className="payment-summary-row" style={{ color: '#f59e0b' }}>
                <span>Nasiya (qarz):</span>
                <span>{fmtCurr(nasiya, currency)}</span>
              </div>
            )}
            {change > 0 && (
              <div className="payment-summary-row" style={{ color: '#3b82f6' }}>
                <span>Qaytim:</span>
                <span>{fmtCurr(change, currency)}</span>
              </div>
            )}
            {totalEntered >= totalInCurr - 0.005 && nasiya === 0 && (
              <div className="paid-card">✓ To'liq to'landi</div>
            )}
          </div>
        )}

        {/* Nasiya not allowed warning */}
        {nasiya > 0 && !nasiyaOk && (
          <div style={{ background: '#ef444422', border: '1px solid #ef4444', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.82rem', color: '#ef4444', marginTop: '0.5rem' }}>
            Nasiya ruxsat etilmagan. To'liq to'lang.
          </div>
        )}

        {/* Customer search */}
        {showCustomerInput && (
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              {customerLabel}
            </div>
            <CustomerSearch
              value={customer}
              onChange={setCustomer}
              required={requireCustomer}
              placeholder="Ism yoki telefon..."
            />
          </div>
        )}

        {/* Require customer warning */}
        {requireCustomer && !customer && (
          <div style={{ background: '#f59e0b22', border: '1px solid #f59e0b', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.82rem', color: '#d97706', marginTop: '0.5rem' }}>
            Mijoz tanlang
          </div>
        )}

        {/* Buttons */}
        <div className="payment-modal-footer">
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Yopish
          </button>
          <button
            className="btn-primary"
            style={{ flex: 2 }}
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            To'lovni tasdiqlash →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main POS Component ────────────────────────────────────────────────────────

export default function Pos() {
  const tenantId = useTenantStore((s) => s.tenantId);

  const [wizCfg,   setWizCfg]   = useState<WizardConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [activeCat, setActiveCat] = useState('');

  const [cart, setCart] = useState<CartItem[]>([]);

  // Kelishilgan narx input
  const [negoPrice, setNegoPrice] = useState('');

  // Currency (shared with PaymentModal)
  const [currency,     setCurrency]     = useState('uzs');
  const [currencyRate, setCurrencyRate] = useState('1');

  // UI state
  const [showCheckout, setShowCheckout] = useState(false);
  const [showPayment,  setShowPayment]  = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [receipt,      setReceipt]      = useState<ReceiptData | null>(null);
  const [debtToast,    setDebtToast]    = useState<string | null>(null);
  const [scanToast,    setScanToast]    = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!tenantId) return;
    getWizardConfig(tenantId).then(setWizCfg).catch(() => {});
    setLoading(true);
    getProducts(tenantId)
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantId]);

  // POS settings from wizard config
  const cardStyle       = wizCfg?.posCardStyle      ?? 'grid_no_photo';
  const showCategories  = wizCfg?.posShowCategories ?? false;
  const showBarcode     = wizCfg?.posBarcode        ?? false;
  const showDiscount    = wizCfg?.posDiscount       ?? true;
  const markupAllowed   = wizCfg?.posMarkupAllowed  ?? false;
  const customerRequired = wizCfg?.posCustomerRequired ?? 'credit_only';
  const allowedPay      = (wizCfg?.posPaymentMethods ?? ['cash']).filter(Boolean);
  const allowedCurr     = (wizCfg?.posCurrencies    ?? ['uzs']).filter(Boolean);

  // Filter products
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))].sort();
  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.isActive &&
      (!q || p.name.toLowerCase().includes(q) || (p.barcode ?? '').includes(q)) &&
      (!activeCat || p.category === activeCat)
    );
  });

  // Cart operations
  const addToCart = (p: Product) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.productId === p.id);
      // USD mahsulot UZS ga o'giriladi (kurs bo'yicha) — cart har doim UZS da ishlaydi
      const priceUzs = p.priceCurrency === 'usd'
        ? Number(p.price) * (parseAmount(currencyRate) || 1)
        : Number(p.price);
      if (ex) return prev.map((i) => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: p.id, name: p.name, price: priceUzs, quantity: 1, unit: p.unit }];
    });
  };

  const updateQty = (id: string, delta: number) =>
    setCart((prev) =>
      prev
        .map((i) => i.productId === id ? { ...i, quantity: i.quantity + delta } : i)
        .filter((i) => i.quantity > 0),
    );

  const removeItem = (id: string) =>
    setCart((prev) => prev.filter((i) => i.productId !== id));

  // Totals
  const subtotal      = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const rate          = parseAmount(currencyRate) || 1;
  const negotiatedNum = negoPrice.trim() !== '' ? parseAmount(negoPrice) : null;

  // If markup is not allowed, clamp to subtotal; otherwise accept any value
  const total = negotiatedNum != null
    ? (!markupAllowed && negotiatedNum > subtotal ? subtotal : negotiatedNum)
    : subtotal;
  const totalInCurr = currency !== 'uzs' ? total / rate : total;

  // Discount / markup label
  const negoDiscount    = negotiatedNum != null ? subtotal - negotiatedNum : 0;
  const negoPct         = subtotal > 0 ? Math.abs(negoDiscount / subtotal * 100) : 0;
  const showNegoLabel   =
    negoDiscount > 1 ||
    (negoDiscount < -1 && markupAllowed && negotiatedNum != null && negotiatedNum <= subtotal * 1.5);
  const negoLabel =
    negoDiscount > 1  ? `Chegirma: -${negoPct.toFixed(0)}%` :
    negoDiscount < -1 ? `Ustama: +${fmt(Math.abs(negoDiscount))}` : '';
  const negoLabelColor = negoDiscount > 1 ? '#10b981' : '#f59e0b';

  // Barcode handler — search input (manual Enter)
  const handleBarcodeKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const q = search.trim();
    const match = products.find((p) => p.barcode === q && p.isActive);
    if (match) { addToCart(match); setSearch(''); }
  };

  // Global barcode scanner handler (USB/Bluetooth HID devices)
  const handleBarcodeScan = useCallback((code: string) => {
    const match = products.find((p) => p.barcode === code && p.isActive);
    if (match) {
      addToCart(match);
      // Clear search input if it had scanner chars
      if (searchRef.current && searchRef.current.value === code) {
        setSearch('');
      }
      setScanToast(match.name);
      setTimeout(() => setScanToast(null), 2000);
    } else {
      setScanToast(`Topilmadi: ${code}`);
      setTimeout(() => setScanToast(null), 2000);
    }
  }, [products]);

  useBarcodeScanner(handleBarcodeScan, showBarcode);

  // Submit sale
  const handleConfirmPayment = async (pd: PaymentData) => {
    setSubmitting(true);
    try {
      // Distribute negotiated discount proportionally across items
      const discountTotal = subtotal - total;
      let items: Array<{ productId: string; name: string; price: number; quantity: number; discount: number }>;
      if (discountTotal > 0.5) {
        let rem = Math.round(discountTotal);
        items = cart.map((item, idx) => {
          const prop = subtotal > 0 ? (item.price * item.quantity) / subtotal : 0;
          const disc = idx === cart.length - 1 ? rem : Math.round(discountTotal * prop);
          rem -= disc;
          return { productId: item.productId, name: item.name, price: item.price, quantity: item.quantity, discount: Math.max(0, disc) };
        });
      } else {
        items = cart.map((i) => ({
          productId: i.productId, name: i.name, price: i.price, quantity: i.quantity, discount: 0,
        }));
      }

      const r    = pd.currencyRate;
      const curr = pd.currency;
      const toUzs = (n: number): number => curr !== 'uzs' ? Math.round(n * r) : Math.round(n);

      const cashUzs      = toUzs(pd.cashAmt);
      const cardUzs      = toUzs(pd.cardAmt);
      const transferUzs  = toUzs(pd.transferAmt);
      const totalPaidUzs = cashUzs + cardUzs + transferUzs;
      const changeUzs    = toUzs(pd.change);
      const isMixed      = pd.payMode === 'mixed';

      const data: CreateSaleData = {
        tenantId,
        customerName:     pd.selectedCustomer?.name ?? undefined,
        customerId:       pd.selectedCustomer?.id   ?? undefined,
        items,
        paymentType:      pd.payMode as PaymentType,
        cashReceived:     ['cash', 'card', 'transfer'].includes(pd.payMode) ? totalPaidUzs : undefined,
        change:           changeUzs > 0.5 ? changeUzs : undefined,
        mixedCash:        isMixed ? cashUzs     : undefined,
        mixedCard:        isMixed ? cardUzs     : undefined,
        mixedTransfer:    isMixed ? transferUzs : undefined,
        partialPaid:      pd.payMode === 'partial' ? totalPaidUzs : undefined,
        currency:         curr,
        currencyRate:     r,
        amountInCurrency: curr !== 'uzs' ? (pd.cashAmt + pd.cardAmt + pd.transferAmt) : undefined,
      };

      const sale = await createSale(data);
      const rcpt = await getReceipt(sale.id);

      setProducts((prev) =>
        prev.map((p) => {
          const sold = data.items.find((i) => i.productId === p.id);
          return sold ? { ...p, quantity: p.quantity - sold.quantity } : p;
        }),
      );

      // Debt toast
      if (pd.selectedCustomer && (pd.payMode === 'credit' || pd.payMode === 'partial')) {
        const nasiyaUzs = pd.payMode === 'credit' ? total : Math.max(0, total - totalPaidUzs);
        if (nasiyaUzs > 0) {
          const msg = `${fmt(nasiyaUzs)} qarz ${pd.selectedCustomer.name} ga qo'shildi`;
          setDebtToast(msg);
          setTimeout(() => setDebtToast(null), 4000);
        }
      }

      setCart([]);
      setNegoPrice('');
      setShowPayment(false);
      setShowCheckout(false);
      setReceipt(rcpt);
    } catch {
      alert('Sotuvda xatolik yuz berdi!');
    } finally {
      setSubmitting(false);
    }
  };

  const gridClass = {
    grid_photo_large: 'pos-grid pos-grid--photo-lg',
    grid_photo_small: 'pos-grid pos-grid--photo-sm',
    grid_no_photo:    'pos-grid',
    list:             'pos-grid pos-grid--list',
  }[cardStyle] ?? 'pos-grid';

  // ── Checkout content ──────────────────────────────────────────────────────────
  const renderCheckout = () => (
    <div className="checkout-content">

      {/* Header */}
      <div className="pos-cart-header">
        <h3 className="pos-cart-title">Savat {cart.length > 0 && `(${cart.length})`}</h3>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {cart.length > 0 && (
            <button className="btn-icon" onClick={() => setCart([])} title="Tozalash" style={{ color: '#ef4444' }}>
            </button>
          )}
          <button className="btn-icon checkout-sheet-close" onClick={() => setShowCheckout(false)}>×</button>
        </div>
      </div>

      {/* Cart items */}
      <div className="pos-cart-items">
        {cart.length === 0 ? (
          <p className="pos-cart-empty">Savat bo'sh. Mahsulot tanlang.</p>
        ) : (
          cart.map((item) => (
            <div key={item.productId} className="pos-cart-item">
              <div className="pos-cart-item-top">
                <span className="pos-cart-item-name">{item.name}</span>
                <button className="btn-icon" style={{ fontSize: '0.85rem' }} onClick={() => removeItem(item.productId)}>✕</button>
              </div>
              <div className="pos-cart-item-row">
                <span className="pos-cart-item-price">{fmtCurr(item.price / rate, currency)}</span>
                <div className="pos-qty-ctrl">
                  <button className="pos-qty-btn" onClick={() => updateQty(item.productId, -1)}>−</button>
                  <span className="pos-qty-val">{item.quantity}</span>
                  <button className="pos-qty-btn" onClick={() => updateQty(item.productId, 1)}>+</button>
                </div>
                <span className="pos-cart-item-total">
                  {fmtCurr((item.price * item.quantity) / rate, currency)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Subtotal row */}
      {cart.length > 0 && (
        <div className="pos-summary">
          <div className="pos-summary-row">
            <span>Mahsulotlar jami:</span>
            <span>{fmtCurr(subtotal / rate, currency)}</span>
          </div>
        </div>
      )}

      {/* Kelishilgan narx */}
      {cart.length > 0 && showDiscount && (
        <div className="checkout-discount-section">
          <div className="nego-wrap">
            <div className="field">
              <label>Kelishilgan narx ({currency.toUpperCase()})</label>
              <input
                type="number"
                className="nego-input"
                placeholder={String(subtotal / rate)}
                min="0"
                value={negoPrice === '' ? '' : parseAmount(negoPrice) === 0 ? '' : negoPrice}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setNegoPrice(e.target.value)}
              />
            </div>
            {showNegoLabel && negoLabel && (
              <div className="nego-label" style={{ color: negoLabelColor }}>
                {negoLabel}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Total */}
      {cart.length > 0 && (
        <div className="pos-summary-total" style={{ padding: '0.5rem 0.9rem', borderTop: '1px solid var(--border)' }}>
          <span>To'lanadigan:</span>
          <span>{fmtCurr(totalInCurr, currency)}</span>
        </div>
      )}

      {/* Open payment */}
      <button
        className="pos-sell-btn"
        onClick={() => setShowPayment(true)}
        disabled={cart.length === 0 || submitting}
      >
        {submitting
          ? 'Saqlanmoqda...'
          : cart.length > 0
          ? `To'lovni rasmiylashtirish → ${fmtCurr(totalInCurr, currency)}`
          : "Savat bo'sh"
        }
      </button>
    </div>
  );

  return (
    <div className="pos-layout">

      {/* Left: Products */}
      <div className="pos-products">
        <div className="pos-search-bar">
          <input
            ref={searchRef}
            type="search"
            className="search-input"
            style={{ flex: 1 }}
            placeholder={showBarcode ? 'Mahsulot yoki barcode...' : 'Mahsulot nomini qidiring...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={showBarcode ? handleBarcodeKey : undefined}
          />
          {showBarcode && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', paddingLeft: '0.4rem' }}>
              Barcode
            </span>
          )}
        </div>

        {showCategories && categories.length > 0 && (
          <div className="pos-cats">
            <button
              className={'pos-cat-btn' + (!activeCat ? ' pos-cat-btn--active' : '')}
              onClick={() => setActiveCat('')}
            >
              Barchasi
            </button>
            {categories.map((c) => (
              <button
                key={c}
                className={'pos-cat-btn' + (activeCat === c ? ' pos-cat-btn--active' : '')}
                onClick={() => setActiveCat(c === activeCat ? '' : c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="dash-loading"><div className="dash-spinner" /></div>
        ) : (
          <div className={gridClass}>
            {filtered.map((p) => {
              const inCart   = cart.find((i) => i.productId === p.id);
              const soldOut  = p.quantity === 0;
              const lowStock = !soldOut && p.quantity <= (p.minStock ?? 5);
              return (
                <button
                  key={p.id}
                  className={
                    'pos-product-card' +
                    (soldOut    ? ' pos-product-card--disabled' : '') +
                    (inCart     ? ' pos-product-card--in-cart'  : '') +
                    (cardStyle === 'list' ? ' pos-product-card--list' : '') +
                    (cardStyle === 'grid_photo_large' ? ' pos-product-card--photo-lg' : '') +
                    (cardStyle === 'grid_photo_small' ? ' pos-product-card--photo-sm' : '')
                  }
                  onClick={() => !soldOut && addToCart(p)}
                  disabled={soldOut}
                >
                  {inCart && <span className="pos-in-cart-badge">{inCart.quantity}</span>}
                  {(cardStyle === 'grid_photo_large' || cardStyle === 'grid_photo_small') && (
                    <div
                      className="pos-product-photo"
                      style={{
                        background: `hsl(${(p.name.charCodeAt(0) * 37 + p.name.charCodeAt(1) * 17) % 360}, 55%, 45%)`,
                      }}
                    >
                      <span>{p.name[0].toUpperCase()}</span>
                    </div>
                  )}
                  <p className="pos-product-name">{p.name}</p>
                  <p className="pos-product-price">
                    {p.priceCurrency === 'usd'
                      ? `$${Number(p.price).toFixed(2)}`
                      : fmtCurr(Number(p.price) / rate, currency)
                    }
                  </p>
                  <p className="pos-product-stock">
                    {soldOut ? (
                      <span className="badge badge--inactive">Tugagan</span>
                    ) : (
                      <span className={'badge ' + (lowStock ? 'badge--warning' : 'badge--active')}>
                        {p.quantity} {p.unit}
                      </span>
                    )}
                  </p>
                </button>
              );
            })}
            {filtered.length === 0 && <p className="pos-empty">Mahsulot topilmadi</p>}
          </div>
        )}
      </div>

      {/* Desktop: Right panel */}
      <div className="pos-cart">
        {renderCheckout()}
      </div>

      {/* Mobile: Floating cart bar */}
      {cart.length > 0 && (
        <button className="pos-float-bar" onClick={() => setShowCheckout(true)}>
          <span>Savat</span>
          <span className="pos-float-bar-count">{cart.length} ta</span>
          <span style={{ flex: 1 }} />
          <span className="pos-float-bar-total">{fmtCurr(totalInCurr, currency)} →</span>
        </button>
      )}

      {/* Mobile: Checkout bottom sheet */}
      {showCheckout && (
        <>
          <div className="checkout-sheet-backdrop" onClick={() => setShowCheckout(false)} />
          <div className="checkout-sheet">
            <div className="checkout-sheet-handle" />
            {renderCheckout()}
          </div>
        </>
      )}

      {/* Payment modal */}
      {showPayment && (
        <PaymentModal
          totalUzs={total}
          allowedPay={allowedPay}
          allowedCurr={allowedCurr}
          customerRequired={customerRequired}
          currency={currency}
          currencyRate={currencyRate}
          setCurrency={setCurrency}
          setCurrencyRate={setCurrencyRate}
          onClose={() => setShowPayment(false)}
          onConfirm={handleConfirmPayment}
        />
      )}

      {/* Receipt modal */}
      {receipt && (
        <ReceiptModal
          sale={receipt}
          wizCfg={wizCfg}
          onClose={() => setReceipt(null)}
        />
      )}

      {/* Debt toast */}
      {debtToast && (
        <div className="pos-toast">
          {debtToast}
        </div>
      )}

      {/* Barcode scan toast */}
      {scanToast && (
        <div className="pos-toast" style={{
          background: scanToast.startsWith('Topilmadi') ? '#ef4444' : '#10b981',
          bottom: debtToast ? '4rem' : '1rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <span style={{ fontSize: '1rem' }}>{scanToast.startsWith('Topilmadi') ? '⚠' : '⬛'}</span>
          {scanToast.startsWith('Topilmadi')
            ? scanToast
            : `Skanerdan qo'shildi: ${scanToast}`}
        </div>
      )}
    </div>
  );
}
