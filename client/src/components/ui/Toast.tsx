import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export interface ToastData {
  message: string;
  type: 'success' | 'error' | 'warning';
}

interface ToastProps {
  toast: ToastData | null;
  onDismiss: () => void;
}

export default function Toast({ toast, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [toast, onDismiss]);

  if (!toast) return null;

  const styles = {
    success: 'bg-success-50 border-success-200 text-success-700',
    error: 'bg-danger-50 border-danger-200 text-danger-700',
    warning: 'bg-warning-50 border-warning-100 text-warning-700',
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-success-500 flex-shrink-0" />,
    error: <XCircle className="w-5 h-5 text-danger-500 flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-warning-500 flex-shrink-0" />,
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] max-w-sm transition-all duration-300 ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div role="alert" aria-live="assertive" className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg ${styles[toast.type]}`}>
        {icons[toast.type]}
        <p className="text-sm font-medium flex-1">{toast.message}</p>
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(onDismiss, 300);
          }}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
