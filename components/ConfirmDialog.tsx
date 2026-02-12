import React from 'react';
import { AlertTriangle, HelpCircle, Info } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const ConfirmDialog: React.FC = () => {
  const { confirmState, resolveConfirm } = useToast();

  if (!confirmState) return null;

  const variant = confirmState.variant ?? 'default';

  const iconMap = {
    danger: <AlertTriangle className="w-6 h-6 text-red-500" />,
    warning: <HelpCircle className="w-6 h-6 text-yellow-500" />,
    default: <Info className="w-6 h-6 text-blue-500" />,
  };

  const confirmBtnStyle = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    default: 'bg-gray-900 hover:bg-black text-white',
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 p-2 bg-gray-50 rounded-full">{iconMap[variant]}</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">{confirmState.title}</h3>
              <p className="text-sm text-gray-600 mt-2 whitespace-pre-line leading-relaxed">{confirmState.message}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-4 bg-gray-50 border-t border-gray-100 justify-end">
          <button
            onClick={() => resolveConfirm(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {confirmState.cancelLabel ?? '취소'}
          </button>
          <button
            onClick={() => resolveConfirm(true)}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors shadow-sm ${confirmBtnStyle[variant]}`}
          >
            {confirmState.confirmLabel ?? '확인'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
