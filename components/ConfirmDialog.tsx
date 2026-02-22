import React from 'react';
import { AlertTriangle, HelpCircle, Info } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Button } from '@/components/ui/button';

const ConfirmDialog: React.FC = () => {
  const { confirmState, resolveConfirm } = useToast();

  if (!confirmState) return null;

  const variant = confirmState.variant ?? 'default';

  const iconMap = {
    danger: <AlertTriangle className="w-6 h-6 text-red-500" />,
    warning: <HelpCircle className="w-6 h-6 text-yellow-500" />,
    default: <Info className="w-6 h-6 text-blue-500" />,
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 p-2 bg-stone-50 rounded-full">{iconMap[variant]}</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-stone-900">{confirmState.title}</h3>
              <p className="text-sm text-stone-600 mt-2 whitespace-pre-line leading-relaxed">{confirmState.message}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-4 bg-stone-50 border-t border-stone-100 justify-end">
          <Button variant="outline" onClick={() => resolveConfirm(false)}>
            {confirmState.cancelLabel ?? '취소'}
          </Button>
          <Button
            variant={variant === 'danger' ? 'destructive' : undefined}
            className={variant === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : undefined}
            onClick={() => resolveConfirm(true)}
          >
            {confirmState.confirmLabel ?? '확인'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
