import React from 'react';
import { Clock, RotateCcw, X, Download } from 'lucide-react';
import { loadSnapshot, clearSnapshot, type TempSnapshot } from '../services/historyService';
import { useToast } from '../context/ToastContext';
import { Button } from '@/components/ui/button';

interface Props {
  onRestore: (version: TempSnapshot) => void;
  onSave: () => void;
  hasPlan: boolean;
  onClose: () => void;
}

const PlanHistory: React.FC<Props> = ({ onRestore, onSave, hasPlan, onClose }) => {
  const { addToast, confirm } = useToast();
  const [snapshot, setSnapshot] = React.useState<TempSnapshot | null>(null);

  React.useEffect(() => {
    setSnapshot(loadSnapshot());
  }, []);

  const handleRestore = async (snap: TempSnapshot) => {
    const ok = await confirm({
      title: '저장된 식단 불러오기',
      message: `${new Date(snap.savedAt).toLocaleString('ko-KR')}에 저장된 식단을 불러오시겠습니까?\n현재 작업 중인 식단은 덮어씌워집니다.`,
      variant: 'warning',
    });
    if (ok) {
      onRestore(snap);
      addToast({ type: 'success', title: '식단 불러오기 완료' });
    }
  };

  const handleClear = async () => {
    const ok = await confirm({
      title: '임시 저장 삭제',
      message: '저장된 식단을 삭제하시겠습니까?',
      variant: 'danger',
    });
    if (ok) {
      clearSnapshot();
      setSnapshot(null);
      addToast({ type: 'success', title: '임시 저장 삭제됨' });
    }
  };

  const handleSave = () => {
    onSave();
    // Reload snapshot after save
    setTimeout(() => setSnapshot(loadSnapshot()), 100);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-stone-400" /> 임시 저장
          </h3>
          <div className="flex items-center gap-2">
            {hasPlan && (
              <Button
                onClick={handleSave}
                size="sm"
                className="flex items-center gap-1.5 bg-stone-900 text-white hover:bg-black text-xs font-bold"
              >
                <Download className="w-3.5 h-3.5" />
                임시 저장
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!snapshot ? (
            <div className="text-center text-stone-400 py-12">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">저장된 식단이 없습니다</p>
              {hasPlan && (
                <p className="text-xs mt-2 text-stone-400">
                  상단의 &quot;임시 저장&quot; 버튼으로 현재 식단을 저장할 수 있습니다.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="p-4 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 flex-shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800">저장된 식단</p>
                    <p className="text-xs text-stone-500">{new Date(snapshot.savedAt).toLocaleString('ko-KR')}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{snapshot.target}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(snapshot)}
                      className="flex items-center gap-1.5 text-xs font-bold"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      불러오기
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClear}
                      className="text-red-500 hover:bg-red-50 text-xs"
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanHistory;
