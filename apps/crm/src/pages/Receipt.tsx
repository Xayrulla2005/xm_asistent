import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicReceipt, ReceiptData } from '../api/sales.api';
import { getPublicWizardConfig, WizardConfig } from '../api/wizard.api';
import { ReceiptContent } from '../components/ReceiptModal';

export default function ReceiptPage() {
  const { saleId } = useParams<{ saleId: string }>();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [wizCfg,  setWizCfg]  = useState<WizardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!saleId) return;
    setLoading(true);
    getPublicReceipt(saleId)
      .then((r) => {
        setReceipt(r);
        return getPublicWizardConfig(r.tenantId).catch(() => null);
      })
      .then((cfg) => { setWizCfg(cfg); })
      .catch(() => setError("Chek topilmadi"))
      .finally(() => setLoading(false));
  }, [saleId]);

  const handlePrint = () => {
    window.print();
  };

  const size = (wizCfg?.receiptSize ?? '80mm') as '58mm' | '80mm' | 'a4';

  if (loading) {
    return (
      <div className="receipt-page">
        <div className="dash-loading"><div className="dash-spinner" /></div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="receipt-page">
        <div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>
          {error ?? 'Chek topilmadi'}
        </div>
      </div>
    );
  }

  return (
    <div className="receipt-page">
      <div className="receipt-page-actions no-print">
        <button className="btn-primary" onClick={handlePrint}>
          🖨️ Chop etish
        </button>
      </div>
      <div className="receipt-page-content">
        <ReceiptContent sale={receipt} wizCfg={wizCfg} size={size} />
      </div>
    </div>
  );
}
