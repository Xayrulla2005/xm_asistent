import { useEffect, useState } from 'react';
import { useTenantStore } from '../stores/tenant.store';
import { getProducts, Product } from '../api/products.api';
import { createSale, getReceipt, ReceiptData, CreateSaleData } from '../api/sales.api';
import ReceiptModal from '../components/ReceiptModal';

const fmt = (n: number) => Number(n).toLocaleString('uz-UZ') + " so'm";

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  discountType: '%' | 'sum';
  discountValue: number;
  unit: string;
}

type PayMode = 'cash' | 'card' | 'credit' | 'mixed';

const PAY_MODES: { key: PayMode; label: string }[] = [
  { key: 'cash',   label: 'Naqd'    },
  { key: 'card',   label: 'Karta'   },
  { key: 'credit', label: 'Nasiya'  },
  { key: 'mixed',  label: 'Aralash' },
];

function itemDiscount(item: CartItem): number {
  return item.discountType === '%'
    ? Math.round((item.price * item.quantity * item.discountValue) / 100)
    : item.discountValue;
}

export default function Pos() {
  const tenantId = useTenantStore((s) => s.tenantId);

  const [products, setProducts]   = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [activeCat, setActiveCat] = useState('');

  const [cart, setCart]               = useState<CartItem[]>([]);
  const [payMode, setPayMode]         = useState<PayMode>('cash');
  const [customerName, setCustomerName] = useState('');
  const [cashInput, setCashInput]     = useState('');
  const [mixedCash, setMixedCash]     = useState('');
  const [mixedCard, setMixedCard]     = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [receipt, setReceipt]         = useState<ReceiptData | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    getProducts(tenantId)
      .then((list) => {
        setProducts(list);
        const cats = [...new Set(list.map((p) => p.category).filter(Boolean))].sort();
        setCategories(cats);
      })
      .finally(() => setLoading(false));
  }, [tenantId]);

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      (!q || p.name.toLowerCase().includes(q) || (p.barcode ?? '').includes(q)) &&
      (!activeCat || p.category === activeCat) &&
      p.isActive
    );
  });

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, {
        productId: p.id,
        name: p.name,
        price: Number(p.price),
        quantity: 1,
        discountType: 'sum',
        discountValue: 0,
        unit: p.unit,
      }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0),
    );
  };

  const removeItem = (productId: string) =>
    setCart((prev) => prev.filter((i) => i.productId !== productId));

  const updateDiscount = (productId: string, type: '%' | 'sum', value: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, discountType: type, discountValue: value } : i,
      ),
    );
  };

  const subtotal      = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalDiscount = cart.reduce((s, i) => s + itemDiscount(i), 0);
  const total         = subtotal - totalDiscount;

  const cashNum = Number(cashInput) || 0;
  const change  = payMode === 'cash' && cashNum >= total ? cashNum - total : 0;

  const handleSell = async () => {
    if (cart.length === 0) return;
    if (payMode === 'credit' && !customerName.trim()) {
      alert("Nasiya uchun mijoz ismi majburiy!");
      return;
    }
    setSubmitting(true);
    try {
      const data: CreateSaleData = {
        tenantId,
        customerName: customerName.trim() || undefined,
        items: cart.map((i) => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          discount: itemDiscount(i),
        })),
        paymentType: payMode,
        cashReceived: payMode === 'cash' ? (cashNum || total) : undefined,
        change:       payMode === 'cash' ? change : undefined,
        mixedCash:    payMode === 'mixed' ? (Number(mixedCash) || 0) : undefined,
        mixedCard:    payMode === 'mixed' ? (Number(mixedCard) || 0) : undefined,
      };
      const sale        = await createSale(data);
      const receiptData = await getReceipt(sale.id);
      setReceipt(receiptData);
      setCart([]);
      setCustomerName('');
      setCashInput('');
      setMixedCash('');
      setMixedCard('');
      setProducts((prev) =>
        prev.map((p) => {
          const sold = data.items.find((i) => i.productId === p.id);
          return sold ? { ...p, quantity: p.quantity - sold.quantity } : p;
        }),
      );
    } catch {
      alert("Sotuvda xatolik yuz berdi!");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pos-layout">

      {/* ── Left: Products ── */}
      <div className="pos-products">
        <div className="pos-search-bar">
          <input
            type="search"
            className="search-input"
            style={{ flex: 1 }}
            placeholder="Mahsulot nomi yoki barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

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

        {loading ? (
          <div className="dash-loading"><div className="dash-spinner" /></div>
        ) : (
          <div className="pos-grid">
            {filtered.map((p) => {
              const inCart  = cart.find((i) => i.productId === p.id);
              const soldOut = p.quantity === 0;
              return (
                <button
                  key={p.id}
                  className={
                    'pos-product-card' +
                    (soldOut ? ' pos-product-card--disabled' : '') +
                    (inCart  ? ' pos-product-card--in-cart'   : '')
                  }
                  onClick={() => !soldOut && addToCart(p)}
                  disabled={soldOut}
                >
                  {inCart && <span className="pos-in-cart-badge">{inCart.quantity}</span>}
                  <p className="pos-product-name">{p.name}</p>
                  <p className="pos-product-price">{fmt(Number(p.price))}</p>
                  <p className="pos-product-stock">
                    {soldOut ? (
                      <span className="badge badge--inactive">Tugagan</span>
                    ) : (
                      <span className={'badge ' + (p.quantity <= (p.minStock ?? 5) ? 'badge--warning' : 'badge--active')}>
                        {p.quantity} {p.unit}
                      </span>
                    )}
                  </p>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="pos-empty">Mahsulot topilmadi</p>
            )}
          </div>
        )}
      </div>

      {/* ── Right: Cart ── */}
      <div className="pos-cart">
        <div className="pos-cart-header">
          <h3 className="pos-cart-title">Savat {cart.length > 0 && `(${cart.length})`}</h3>
          {cart.length > 0 && (
            <button
              className="btn-icon"
              onClick={() => setCart([])}
              title="Savatni tozalash"
              style={{ color: '#ef4444' }}
            >
              🗑️
            </button>
          )}
        </div>

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
                  <span className="pos-cart-item-price">{fmt(item.price)}</span>
                  <div className="pos-qty-ctrl">
                    <button className="pos-qty-btn" onClick={() => updateQty(item.productId, -1)}>−</button>
                    <span className="pos-qty-val">{item.quantity}</span>
                    <button className="pos-qty-btn" onClick={() => updateQty(item.productId, 1)}>+</button>
                  </div>
                  <div className="pos-discount-ctrl">
                    <button
                      className={'pos-disc-type' + (item.discountType === '%' ? ' active' : '')}
                      onClick={() =>
                        updateDiscount(item.productId, item.discountType === '%' ? 'sum' : '%', item.discountValue)
                      }
                    >
                      {item.discountType === '%' ? '%' : "so'm"}
                    </button>
                    <input
                      type="number"
                      className="pos-disc-input"
                      placeholder="0"
                      min="0"
                      value={item.discountValue || ''}
                      onChange={(e) =>
                        updateDiscount(item.productId, item.discountType, Number(e.target.value))
                      }
                    />
                  </div>
                  <span className="pos-cart-item-total">
                    {fmt(item.price * item.quantity - itemDiscount(item))}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        {cart.length > 0 && (
          <div className="pos-summary">
            <div className="pos-summary-row">
              <span>Jami:</span>
              <span>{fmt(subtotal)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="pos-summary-row pos-summary-discount">
                <span>Chegirma:</span>
                <span>-{fmt(totalDiscount)}</span>
              </div>
            )}
            <div className="pos-summary-total">
              <span>To'lanadigan:</span>
              <span>{fmt(total)}</span>
            </div>
          </div>
        )}

        {/* Customer name */}
        <div className="pos-customer">
          <input
            type="text"
            className="pos-customer-input"
            placeholder={payMode === 'credit' ? 'Mijoz ismi (majburiy) *' : "Mijoz ismi (ixtiyoriy)"}
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        {/* Payment mode tabs */}
        <div className="pos-pay-tabs">
          {PAY_MODES.map((m) => (
            <button
              key={m.key}
              className={'pos-pay-tab' + (payMode === m.key ? ' pos-pay-tab--active' : '')}
              onClick={() => setPayMode(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {payMode === 'cash' && (
          <div className="pos-pay-inputs">
            <div className="field">
              <label>Qabul qilindi (so'm)</label>
              <input
                type="number"
                className="pos-pay-input"
                placeholder={String(total)}
                min="0"
                value={cashInput}
                onChange={(e) => setCashInput(e.target.value)}
              />
            </div>
            {cashNum > 0 && cashNum >= total && (
              <div className="pos-change">
                Qaytim: <strong>{fmt(change)}</strong>
              </div>
            )}
          </div>
        )}

        {payMode === 'mixed' && (
          <div className="pos-pay-inputs">
            <div className="form-row">
              <div className="field">
                <label>Naqd (so'm)</label>
                <input
                  type="number"
                  className="pos-pay-input"
                  placeholder="0"
                  min="0"
                  value={mixedCash}
                  onChange={(e) => setMixedCash(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Karta (so'm)</label>
                <input
                  type="number"
                  className="pos-pay-input"
                  placeholder="0"
                  min="0"
                  value={mixedCard}
                  onChange={(e) => setMixedCard(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <button
          className="pos-sell-btn"
          onClick={handleSell}
          disabled={submitting || cart.length === 0}
        >
          {submitting ? 'Saqlanmoqda...' : `✓ Sotuv qilish${cart.length > 0 ? ` — ${fmt(total)}` : ''}`}
        </button>
      </div>

      {receipt && (
        <ReceiptModal
          receipt={receipt}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
  );
}
