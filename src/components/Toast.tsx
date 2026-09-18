import { useEffect } from 'react';
import { X, CheckCircle2, Info, AlertCircle } from 'lucide-react';

export interface ToastData {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'error';
}

interface ToastProps {
  toast: ToastData;
  onClose: (id: string) => void;
}

const icons = {
  success: CheckCircle2,
  info: Info,
  error: AlertCircle,
};

const colors = {
  success: 'text-success-500',
  info: 'text-primary-500',
  error: 'text-error-500',
};

export function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(toast.id), 3500);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const Icon = icons[toast.type || 'success'];

  return (
    <div
      className="animate-slide-in-right flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-lg shadow-neutral-900/8 transition-all duration-200 hover:shadow-md"
      style={{ minWidth: '280px', maxWidth: '380px' }}
    >
      <div className={`flex-shrink-0 ${colors[toast.type || 'success']}`}>
        <Icon size={18} />
      </div>
      <p className="flex-1 text-sm font-medium text-neutral-700">{toast.message}</p>
      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 rounded-md p-1 text-neutral-400 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-600"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer({
  toasts,
  onClose,
}: {
  toasts: ToastData[];
  onClose: (id: string) => void;
}) {
  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}
