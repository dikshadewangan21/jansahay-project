import { CheckCircle, AlertCircle, Info, XCircle, X } from 'lucide-react';
import { useToast } from './ToastContext';

const ICONS = {
  success: <CheckCircle  size={16} className="text-pulse-teal"     />,
  error:   <XCircle      size={16} className="text-pulse-critical"  />,
  warning: <AlertCircle  size={16} className="text-pulse-high"      />,
  info:    <Info         size={16} className="text-pulse-blue"      />,
};

const BORDERS = {
  success: 'border-l-pulse-teal',
  error:   'border-l-pulse-critical',
  warning: 'border-l-pulse-high',
  info:    'border-l-pulse-blue',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-72 sm:w-80 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`card border-l-2 ${BORDERS[t.type] || BORDERS.info} px-4 py-3 flex items-start gap-3 shadow-xl pointer-events-auto`}
          style={{ animation: 'toastSlideIn 0.2s ease-out' }}
        >
          <span className="mt-0.5 shrink-0">{ICONS[t.type] || ICONS.info}</span>
          <p className="text-sm text-pulse-text flex-1 leading-snug">{t.message}</p>
          <button onClick={() => removeToast(t.id)} className="text-pulse-muted hover:text-pulse-text shrink-0">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
