import { useRef } from 'react';
import { ReceiptData } from '../api/sales.api';
import { useConfigStore } from '../stores/config.store';

const fmt = (n: number) => Number(n).toLocaleString('uz-UZ') + " so'm";

const PAY_LABELS: Record<string, string> = {
  cash:   'Naqd',
  card:   'Karta',
  credit: 'Nasiya',
  mixed:  'Aralash (Naqd + Karta)',
};

interface Props {
  receipt: ReceiptData;
  onClose: () => void;
}

export default function ReceiptModal({ receipt, onClose }: Props) {
  const printRef  = useRef<HTMLDivElement>(null);
  const config    = useConfigStore((s) => s.config);
  const storeName = config?.theme?.shopName || "Do'kon";
  const logoUrl   = config?.theme?.logo
    ? (config.theme.logo.startsWith('/uploads/')
        ? `http://localhost:3000${config.theme.logo}`
        : config.theme.logo)
    : null;

  const handlePrint = () => {
    const content = printRef.current?.innerHTML ?? '';
    const win = window.open('', '_blank', 'width=380,height=640');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; font-size: 12px; padding: 1rem; color: #000; }
  .receipt-store { font-size: 1rem; font-weight: 700; text-align: center; margin-bottom: 0.5rem; }
  .receipt-divider { border: none; border-top: 1px dashed #000; margin: 0.5rem 0; }
  .receipt-meta { display: flex; flex-direction: column; gap: 0.2rem; margin-bottom: 0.25rem; }
  .receipt-meta-row { display: flex; justify-content: space-between; font-size: 11px; }
  .receipt-items { margin-bottom: 0.25rem; }
  .receipt-item { padding: 0.25rem 0; }
  .receipt-item-name { font-weight: 600; margin-bottom: 0.15rem; }
  .receipt-item-row { display: flex; justify-content: space-between; font-size: 11px; color: #555; }
  .receipt-totals { display: flex; flex-direction: column; gap: 0.2rem; }
  .receipt-total-row { display: flex; justify-content: space-between; font-size: 12px; }
  .receipt-final { font-size: 14px; font-weight: 800; border-top: 1px solid #000; padding-top: 0.3rem; margin-top: 0.2rem; }
  .receipt-footer { text-align: center; font-size: 11px; color: #555; margin-top: 0.5rem; }
</style>
</head>
<body>${content}</body>
</html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); win.close(); }, 300);
  };

  const date    = new Date(receipt.createdAt);
  const dateStr = date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
  const timeStr = date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="modal-overlay">
      <div className="modal receipt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Chek #{receipt.receiptNumber}</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button className="btn-primary" style={{ padding: '0.4rem 0.9rem' }} onClick={handlePrint}>
              🖨️ Chiqarish
            </button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="receipt-wrap" ref={printRef}>
          <div className="receipt">
            {logoUrl && (
              <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                <img
                  src={logoUrl}
                  alt="logo"
                  style={{ height: 48, objectFit: 'contain' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
            <p className="receipt-store">{storeName}</p>

            <div className="receipt-divider" />

            <div className="receipt-meta">
              <div className="receipt-meta-row"><span>Chek:</span><span>#{receipt.receiptNumber}</span></div>
              <div className="receipt-meta-row"><span>Sana:</span><span>{dateStr}</span></div>
              <div className="receipt-meta-row"><span>Vaqt:</span><span>{timeStr}</span></div>
              <div className="receipt-meta-row"><span>Sotuvchi:</span><span>{receipt.sellerName}</span></div>
              {receipt.customerName && (
                <div className="receipt-meta-row"><span>Mijoz:</span><span>{receipt.customerName}</span></div>
              )}
            </div>

            <div className="receipt-divider" />

            <div className="receipt-items">
              {receipt.items.map((item, i) => (
                <div key={i} className="receipt-item">
                  <p className="receipt-item-name">{item.name}</p>
                  <div className="receipt-item-row">
                    <span>{item.quantity} ta × {fmt(item.price)}</span>
                    <span>{fmt(item.price * item.quantity)}</span>
                  </div>
                  {item.discount > 0 && (
                    <div className="receipt-item-row" style={{ color: '#10b981' }}>
                      <span>Chegirma:</span>
                      <span>-{fmt(item.discount)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="receipt-divider" />

            <div className="receipt-totals">
              <div className="receipt-total-row">
                <span>Jami:</span>
                <span>{fmt(receipt.subtotal)}</span>
              </div>
              {receipt.discount > 0 && (
                <div className="receipt-total-row" style={{ color: '#10b981' }}>
                  <span>Chegirma:</span>
                  <span>-{fmt(receipt.discount)}</span>
                </div>
              )}
              <div className="receipt-total-row receipt-final">
                <span>To'landi:</span>
                <span>{fmt(receipt.total)}</span>
              </div>
              <div className="receipt-total-row">
                <span>To'lov:</span>
                <span>{PAY_LABELS[receipt.paymentType] ?? receipt.paymentType}</span>
              </div>
              {receipt.paymentType === 'mixed' && (
                <>
                  {receipt.mixedCash != null && (
                    <div className="receipt-total-row">
                      <span style={{ paddingLeft: '1rem' }}>Naqd:</span>
                      <span>{fmt(receipt.mixedCash)}</span>
                    </div>
                  )}
                  {receipt.mixedCard != null && (
                    <div className="receipt-total-row">
                      <span style={{ paddingLeft: '1rem' }}>Karta:</span>
                      <span>{fmt(receipt.mixedCard)}</span>
                    </div>
                  )}
                </>
              )}
              {receipt.paymentType === 'cash' &&
                receipt.cashReceived != null &&
                receipt.cashReceived > receipt.total && (
                  <>
                    <div className="receipt-total-row">
                      <span>Qabul qilindi:</span>
                      <span>{fmt(receipt.cashReceived)}</span>
                    </div>
                    <div className="receipt-total-row">
                      <span>Qaytim:</span>
                      <span>{fmt(receipt.change ?? 0)}</span>
                    </div>
                  </>
                )}
            </div>

            <div className="receipt-divider" />
            <p className="receipt-footer">Rahmat! Qaytib keling!</p>
          </div>
        </div>

        <div className="receipt-actions">
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Yangi sotuv
          </button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={handlePrint}>
            🖨️ Chek chiqarish
          </button>
        </div>
      </div>
    </div>
  );
}
