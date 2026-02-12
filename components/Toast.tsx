import React from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast, type ToastType } from '../context/ToastContext';

const iconMap: Record<ToastType, React.ElementType> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styleMap: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const iconStyleMap: Record<ToastType, string> = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => {
        const Icon = iconMap[toast.type];
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg animate-in slide-in-from-right duration-300 ${styleMap[toast.type]}`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconStyleMap[toast.type]}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">{toast.title}</p>
              {toast.message && <p className="text-xs mt-0.5 opacity-80">{toast.message}</p>}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 p-0.5 hover:bg-black/5 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
