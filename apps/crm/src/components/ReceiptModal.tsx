import { useRef, useState } from 'react';
import { ReceiptData } from '../api/sales.api';
import { WizardConfig } from '../api/wizard.api';
import { useFeaturesStore } from '../stores/features.store';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtAmt(n: number, currency: string): string {
  if (currency === 'usd') return '$' + Number(n).toFixed(2);
  if (currency === 'rub') return '₽' + Number(n).toLocaleString('ru-RU');
  return Number(n).toLocaleString('uz-UZ') + " so'm";
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const dd   = String(d.getDate()).padStart(2, '0');
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh   = String(d.getHours()).padStart(2, '0');
  const min  = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy}, ${hh}:${min}`;
}

interface PayBreakdownRow {
  label:  string;
  amount: number;
  color?: string;
}

function getPayBreakdown(sale: ReceiptData): PayBreakdownRow[] {
  const rows: PayBreakdownRow[] = [];
  const { paymentType, total, cashReceived, change, mixedCash, mixedCard, mixedTransfer, partialPaid, partialRemaining } = sale;

  if (paymentType === 'cash') {
    const paid = cashReceived ?? total;
    rows.push({ label: 'Naqd', amount: paid });
    if (change != null && change > 0) {
      rows.push({ label: 'Qaytim', amount: change, color: '#3b82f6' });
    }
  } else if (paymentType === 'card') {
    rows.push({ label: 'Karta', amount: cashReceived ?? total });
  } else if (paymentType === 'transfer') {
    rows.push({ label: 'Otkazma', amount: cashReceived ?? total });
  } else if (paymentType === 'credit') {
    rows.push({ label: 'Nasiya (qarz)', amount: total, color: '#ef4444' });
  } else if (paymentType === 'mixed') {
    if (mixedCash     != null && mixedCash     > 0) rows.push({ label: 'Naqd',    amount: mixedCash });
    if (mixedCard     != null && mixedCard     > 0) rows.push({ label: 'Karta',   amount: mixedCard });
    if (mixedTransfer != null && mixedTransfer > 0) rows.push({ label: 'Otkazma', amount: mixedTransfer });
  } else if (paymentType === 'partial') {
    if (partialPaid != null && partialPaid > 0) {
      rows.push({ label: "To'langan", amount: partialPaid });
    }
    if (partialRemaining != null && partialRemaining > 0) {
      rows.push({ label: 'Nasiya (qarz)', amount: partialRemaining, color: '#ef4444' });
    }
  }
  return rows;
}

function toPlainText(sale: ReceiptData, shopName: string): string {
  const lines: string[] = [];
  const W = 32;
  const div = '-'.repeat(W);

  lines.push(shopName.padStart(Math.floor((W + shopName.length) / 2)));
  lines.push('Savdo cheki'.padStart(Math.floor((W + 11) / 2)));
  lines.push(div);
  lines.push(`Chek: #${sale.receiptNumber}`);
  lines.push(`Sana: ${fmtDate(sale.createdAt)}`);
  lines.push(`Sotuvchi: ${sale.sellerName}`);
  if (sale.customerName) lines.push(`Mijoz: ${sale.customerName}`);
  if (sale.customerPhone) lines.push(`Tel: ${sale.customerPhone}`);
  lines.push(div);

  for (const item of sale.items) {
    lines.push(item.name);
    const detail = `  ${item.quantity} x ${fmtAmt(item.price, sale.currency)}`;
    const total  = fmtAmt(item.subtotal, sale.currency);
    lines.push(detail + total.padStart(W - detail.length));
    if (item.discount > 0) {
      lines.push(`  Chegirma: -${fmtAmt(item.discount, sale.currency)}`);
    }
  }
  lines.push(div);

  if (sale.discount > 0) {
    const label = 'Jami chegirma:';
    const val   = `-${fmtAmt(sale.discount, sale.currency)}`;
    lines.push(label + val.padStart(W - label.length));
  }
  const totalLabel = "UMUMIY TO'LOV:";
  const totalVal   = fmtAmt(sale.total, sale.currency);
  lines.push(totalLabel + totalVal.padStart(W - totalLabel.length));
  lines.push(div);

  lines.push("TO'LOV TARKIBI:");
  for (const row of getPayBreakdown(sale)) {
    const val = fmtAmt(row.amount, sale.currency);
    lines.push('  ' + row.label + val.padStart(W - 2 - row.label.length));
  }
  lines.push(div);

  if (sale.totalDebt != null && sale.totalDebt > 0) {
    lines.push('QARZDORLIK:');
    const d1 = 'Bu savdo qarz:';
    const v1 = fmtAmt(
      sale.paymentType === 'credit' ? sale.total :
      (sale.partialRemaining ?? 0),
      sale.currency,
    );
    lines.push('  ' + d1 + v1.padStart(W - 2 - d1.length));
    const d2 = 'UMUMIY QARZ:';
    const v2 = fmtAmt(sale.totalDebt, sale.currency);
    lines.push('  ' + d2 + v2.padStart(W - 2 - d2.length));
    lines.push(div);
  }

  return lines.join('\n');
}

// ── Receipt content (shared between modal + standalone page) ──────────────────

interface ReceiptContentProps {
  sale:    ReceiptData;
  wizCfg?: WizardConfig | null;
  size:    '58mm' | '80mm' | 'a4';
}

export function ReceiptContent({ sale, wizCfg, size }: ReceiptContentProps) {
  const hasFeature  = useFeaturesStore((s) => s.hasFeature);
  const isStarter   = hasFeature('customers_debt_tracking');

  // Per-size config (new system) with fallback to legacy fields
  const receipt  = wizCfg?.receipt as { sizeCfg?: Record<string, Record<string, unknown>> } | undefined;
  const sizeCfg  = receipt?.sizeCfg?.[size] ?? null;

  const showLogo    = isStarter && (sizeCfg ? Boolean(sizeCfg['showLogo'])    : (wizCfg?.receiptShowLogo !== false));
  const showPhone   = sizeCfg ? Boolean(sizeCfg['showPhone'])   : (wizCfg?.receiptShowPhone === true);
  const showAddress = sizeCfg ? Boolean(sizeCfg['showAddress']) : (wizCfg?.receiptShowAddress === true);
  const showSeller  = sizeCfg ? Boolean(sizeCfg['showSeller'] ?? true) : true;
  const showCustomer= sizeCfg ? Boolean(sizeCfg['showCustomer'] ?? true) : true;
  const colUnit     = sizeCfg ? Boolean(sizeCfg['colUnit'] ?? true) : true;
  const colPrice    = sizeCfg ? Boolean(sizeCfg['colPrice'] ?? true) : true;
  const tableStyle  = (sizeCfg?.['tableStyle'] as string | undefined) ?? 'dark';
  const showPayBreak= sizeCfg ? Boolean(sizeCfg['showPayBreak'] ?? true) : true;
  const showDebtInfo= isStarter && (sizeCfg ? Boolean(sizeCfg['showDebtInfo'] ?? true) : true);
  const showChange  = sizeCfg ? Boolean(sizeCfg['showChange'] ?? true) : true;
  const showBarcode = isStarter && (sizeCfg ? Boolean(sizeCfg['showBarcode'] ?? false) : false);
  const footerText  = (sizeCfg?.['footerText'] as string | undefined) ?? wizCfg?.receiptFooter ?? 'Rahmat! Qayta keling!';
  const showFooterName = sizeCfg ? Boolean(sizeCfg['showFooterName'] ?? true) : true;
  const showQr      = wizCfg?.receiptShowQr === true;
  const dMode       = wizCfg?.discountMode ?? 'classic';

  const shopName = wizCfg?.companyName ?? "Do'kon";
  const rawLogo  = wizCfg?.logoUrl ?? null;
  const logoUrl  = rawLogo
    ? (rawLogo.startsWith('/uploads/') ? `http://localhost:3000${rawLogo}` : rawLogo)
    : null;

  const cur = sale.currency;

  const payRows = getPayBreakdown(sale);

  const saleDebt =
    sale.paymentType === 'credit'  ? sale.total :
    sale.paymentType === 'partial' ? (sale.partialRemaining ?? 0) : 0;

  const is58 = size === '58mm';
  const isA4 = size === 'a4';

  function itemDiscountLabel(item: ReceiptData['items'][0]): string | null {
    if (item.discount <= 0) return null;
    const base = item.price * item.quantity;
    if (dMode === 'markup') return `+${fmtAmt(item.discount, cur)}`;
    const pct = base > 0 ? Math.round((item.discount / base) * 100) : 0;
    return `-${pct}%`;
  }

  function itemDiscountColor(): string {
    return dMode === 'markup' ? '#f59e0b' : '#ef4444';
  }

  return (
    <div className={`receipt receipt--${size}`}>
      {/* HEADER */}
      {showLogo && logoUrl && (
        <div className="receipt-logo">
          <img
            src={logoUrl}
            alt="logo"
            style={{ height: is58 ? 36 : 48, objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
      <p className="receipt-store">{shopName}</p>
      <p className="receipt-subtitle">Savdo cheki</p>

      {(showPhone || showAddress) && (
        <div className="receipt-contact">
          {showPhone   && wizCfg?.companyPhone   && <span>{wizCfg.companyPhone}</span>}
          {showAddress && wizCfg?.companyAddress && <span>{wizCfg.companyAddress}</span>}
        </div>
      )}

      <div className="receipt-divider" />

      <div className="receipt-meta">
        <div className="receipt-meta-row">
          <span>Chek:</span>
          <span>#{sale.receiptNumber}</span>
        </div>
        <div className="receipt-meta-row">
          <span>Sana:</span>
          <span>{fmtDate(sale.createdAt)}</span>
        </div>
        {showSeller && (
          <div className="receipt-meta-row">
            <span>Sotuvchi:</span>
            <span>{sale.sellerName}</span>
          </div>
        )}
        {showCustomer && (sale.customerName || sale.customerPhone) && (
          <div className="receipt-meta-row">
            <span>Mijoz:</span>
            <span style={{ display: 'flex', gap: '0.5rem' }}>
              {sale.customerName && <span>{sale.customerName}</span>}
              {sale.customerPhone && <span style={{ color: 'var(--text-muted, #888)' }}>{sale.customerPhone}</span>}
            </span>
          </div>
        )}
      </div>

      <div className="receipt-divider" />

      {/* ITEMS TABLE */}
      <table className="receipt-table" style={
        tableStyle === 'dark'    ? { borderCollapse: 'collapse' } :
        tableStyle === 'minimal' ? { borderCollapse: 'collapse' } :
                                   { borderCollapse: 'collapse' }
      }>
        <thead>
          <tr style={
            tableStyle === 'dark'    ? { background: '#1e293b', color: '#fff' } :
            tableStyle === 'light'   ? { background: '#f1f5f9', color: '#374151' } :
                                       { borderBottom: '2px solid #e2e8f0' }
          }>
            <th className="receipt-th receipt-th--name">Mahsulot</th>
            {colUnit && <th className="receipt-th receipt-th--num">O'lchov</th>}
            <th className="receipt-th receipt-th--num">Miqdor</th>
            {!is58 && colPrice && <th className="receipt-th receipt-th--num">Narx</th>}
            <th className="receipt-th receipt-th--num">Jami</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item, i) => {
            const discLabel = itemDiscountLabel(item);
            return (
              <tr key={i}>
                <td className="receipt-td receipt-td--name">
                  {item.name}
                  {discLabel && (
                    <span className="receipt-item-disc" style={{ color: itemDiscountColor() }}>
                      {' '}{discLabel}
                    </span>
                  )}
                </td>
                {colUnit && (
                  <td className="receipt-td receipt-td--num" style={{ opacity: 0.8 }}>
                    {item.unit ?? 'dona'}
                  </td>
                )}
                <td className="receipt-td receipt-td--num">{item.quantity}</td>
                {!is58 && colPrice && (
                  <td className="receipt-td receipt-td--num">
                    {fmtAmt(item.price, cur)}
                  </td>
                )}
                <td className="receipt-td receipt-td--num">
                  {fmtAmt(item.subtotal, cur)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="receipt-divider" />

      {/* TOTALS */}
      <div className="receipt-totals">
        {isA4 && (
          <div className="receipt-total-row">
            <span>Mahsulotlar jami:</span>
            <span>{fmtAmt(sale.subtotal, cur)}</span>
          </div>
        )}
        {sale.discount > 0 && (
          <div className="receipt-total-row" style={{ color: '#10b981' }}>
            <span>Jami chegirma:</span>
            <span>-{fmtAmt(sale.discount, cur)}</span>
          </div>
        )}
        <div className="receipt-total-row receipt-final">
          <span>UMUMIY TO'LOV:</span>
          <span>{fmtAmt(sale.total, cur)}</span>
        </div>
        {sale.currency !== 'uzs' && sale.amountInCurrency != null && (
          <div className="receipt-total-row" style={{ fontSize: '0.78rem', color: 'var(--text-muted, #888)' }}>
            <span>{sale.currency.toUpperCase()}:</span>
            <span>{fmtAmt(sale.amountInCurrency, sale.currency)}</span>
          </div>
        )}
      </div>

      <div className="receipt-divider" />

      {/* PAYMENT BREAKDOWN */}
      {showPayBreak && (
        <div className="receipt-pay-section">
          <div className="receipt-pay-label">TO'LOV TARKIBI:</div>
          {payRows.map((row, i) => (
            <div key={i} className="receipt-total-row" style={{ color: row.color ?? 'inherit' }}>
              <span>{row.label}:</span>
              <span>{fmtAmt(row.amount, cur)}</span>
            </div>
          ))}
          {showChange && sale.change != null && sale.change > 0 && sale.paymentType === 'cash' && (
            <div className="receipt-total-row" style={{ color: '#3b82f6' }}>
              <span>Qaytim:</span>
              <span>{fmtAmt(sale.change, cur)}</span>
            </div>
          )}
        </div>
      )}

      {/* DEBT BOX */}
      {showDebtInfo && saleDebt > 0 && (
        <>
          <div className="receipt-divider" />
          <div className="receipt-debt-box">
            <div className="receipt-debt-title">QARZDORLIK MA'LUMOTLARI</div>
            <div className="receipt-debt-row">
              <span>Bu savdo qarz:</span>
              <span>{fmtAmt(saleDebt, cur)}</span>
            </div>
            {sale.totalDebt != null && sale.totalDebt > saleDebt && (
              <div className="receipt-debt-row">
                <span>Oldingi qarz:</span>
                <span>{fmtAmt(sale.totalDebt - saleDebt, cur)}</span>
              </div>
            )}
            {sale.totalDebt != null && sale.totalDebt > 0 && (
              <div className="receipt-debt-row receipt-debt-total">
                <span>UMUMIY QARZ:</span>
                <span>{fmtAmt(sale.totalDebt, cur)}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Barcode */}
      {showBarcode && sale.receiptNumber && (
        <div style={{ textAlign: 'center', margin: '2mm 0', letterSpacing: 3, fontSize: '1rem', opacity: 0.55 }}>|||||||||||||</div>
      )}

      {/* QR placeholder */}
      {showQr && (
        <div className="receipt-qr">[ QR kod ]</div>
      )}

      <div className="receipt-divider" />
      {footerText && <p className="receipt-footer">{footerText}</p>}
      {showFooterName && <p className="receipt-footer" style={{ fontWeight: 600, marginTop: 2 }}>{shopName}</p>}
    </div>
  );
}

// ── Build print HTML ───────────────────────────────────────────────────────────

function buildPrintHtml(content: string, size: '58mm' | '80mm' | 'a4'): string {
  const widthMap = { '58mm': '58mm', '80mm': '80mm', 'a4': '210mm' };
  const fontMap  = { '58mm': '10px', '80mm': '11px', 'a4': '12px' };
  const w = widthMap[size];
  const f = fontMap[size];

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Courier New',monospace;font-size:${f};padding:4mm;color:#000;background:#fff;width:${w}}
.receipt{max-width:100%}
.receipt-logo{text-align:center;margin-bottom:3mm}
.receipt-store{font-size:1.1em;font-weight:700;text-align:center;margin-bottom:1mm}
.receipt-subtitle{text-align:center;font-size:0.85em;color:#555;margin-bottom:1mm}
.receipt-contact{text-align:center;font-size:0.8em;color:#666;margin-bottom:1mm}
.receipt-contact span{display:block}
.receipt-divider{border:none;border-top:1px dashed #000;margin:2mm 0}
.receipt-meta{margin-bottom:1mm}
.receipt-meta-row{display:flex;justify-content:space-between;font-size:0.85em;margin-bottom:1px}
.receipt-table{width:100%;border-collapse:collapse;margin:1mm 0}
.receipt-th{text-align:left;font-size:0.8em;border-bottom:1px solid #999;padding:1px 2px}
.receipt-th--num,.receipt-td--num{text-align:right}
.receipt-td{font-size:0.85em;padding:1px 2px;vertical-align:top}
.receipt-td--name{word-break:break-word}
.receipt-item-disc{font-size:0.8em}
.receipt-totals{margin:1mm 0}
.receipt-pay-section{margin:1mm 0}
.receipt-pay-label{font-size:0.8em;color:#555;margin-bottom:1px}
.receipt-total-row{display:flex;justify-content:space-between;font-size:0.9em;margin-bottom:1px}
.receipt-final{font-size:1.1em;font-weight:800;border-top:1px solid #000;padding-top:1mm;margin-top:1mm}
.receipt-debt-box{border:1px solid #e00;padding:2mm;margin:1mm 0;border-radius:2mm}
.receipt-debt-title{font-weight:700;font-size:0.8em;color:#c00;margin-bottom:1mm;text-align:center}
.receipt-debt-row{display:flex;justify-content:space-between;font-size:0.85em;color:#c00;margin-bottom:1px}
.receipt-debt-total{font-weight:800;font-size:0.9em}
.receipt-qr{text-align:center;font-size:0.75em;color:#888;margin:2mm 0}
.receipt-footer{text-align:center;font-size:0.8em;color:#555;margin-top:2mm}
</style>
</head>
<body>${content}</body>
</html>`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  sale:    ReceiptData;
  wizCfg?: WizardConfig | null;
  onClose: () => void;
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function ReceiptModal({ sale, wizCfg, onClose }: Props) {
  const printRef  = useRef<HTMLDivElement>(null);
  const [linkCopied,  setLinkCopied]  = useState(false);
  const [textCopied,  setTextCopied]  = useState(false);

  const size      = (wizCfg?.receiptSize ?? '80mm') as '58mm' | '80mm' | 'a4';
  const shopName  = wizCfg?.companyName ?? "Do'kon";

  const handlePrint = () => {
    const content = printRef.current?.innerHTML ?? '';
    const sizeMap = { '58mm': '280,640', '80mm': '380,700', 'a4': '800,1100' };
    const win = window.open('', '_blank', `width=${sizeMap[size]}`);
    if (!win) return;
    win.document.write(buildPrintHtml(content, size));
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); win.close(); }, 300);
  };

  const handleCopyText = () => {
    const text = toPlainText(sale, shopName);
    navigator.clipboard.writeText(text).then(() => {
      setTextCopied(true);
      setTimeout(() => setTextCopied(false), 2000);
    });
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/receipt/${sale.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal receipt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Chek #{sale.receiptNumber}</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.82rem' }} onClick={handlePrint}>
              🖨️ Chop etish
            </button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="receipt-wrap" ref={printRef}>
          <ReceiptContent sale={sale} wizCfg={wizCfg} size={size} />
        </div>

        <div className="receipt-actions">
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Yangi sotuv
          </button>
          <button className="btn-secondary" style={{ flex: 1, fontSize: '0.82rem' }} onClick={handleCopyText}>
            {textCopied ? '✓ Nusxalandi!' : '📋 Nusxalash'}
          </button>
          <button
            className="btn-secondary"
            style={{ flex: 1, fontSize: '0.82rem' }}
            onClick={handleCopyLink}
            title="Chek havolasini nusxalash"
          >
            {linkCopied ? '✓ Havola nusxalandi!' : '🔗 Havola'}
          </button>
          <button
            className="btn-secondary"
            style={{ flex: 1, fontSize: '0.82rem', opacity: 0.6, cursor: 'default' }}
            title="Tez orada..."
            disabled
          >
            📱 Bluetooth
          </button>
          <button className="btn-primary" style={{ flex: 2 }} onClick={handlePrint}>
            🖨️ Chek chiqarish
          </button>
        </div>
      </div>
    </div>
  );
}
