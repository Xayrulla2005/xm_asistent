import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { useToastStore, ToastType } from '../stores/toast.store';

const ICONS: Record<ToastType, React.ReactNode> = {
  error:   <AlertCircle size={15} />,
  success: <CheckCircle size={15} />,
  info:    <Info size={15} />,
  warning: <AlertTriangle size={15} />,
};

export default function ToastContainer() {
  const { toasts, dismiss } = useToastStore();
  if (!toasts.length) return null;

  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.type}`}>
          <span className="toast-icon">{ICONS[t.type]}</span>
          <span className="toast-msg">{t.message}</span>
          <button className="toast-close" onClick={() => dismiss(t.id)}>
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
