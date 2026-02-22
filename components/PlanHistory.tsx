import React from 'react';
import { Clock, Trash2, RotateCcw, X } from 'lucide-react';
import { getVersions, deleteVersion, type PlanVersion } from '../services/historyService';
import { useToast } from '../context/ToastContext';
import { Button } from '@/components/ui/button';

interface Props {
  planId: string;
  onRestore: (version: PlanVersion) => void;
  onClose: () => void;
}

const PlanHistory: React.FC<Props> = ({ planId, onRestore, onClose }) => {
  const { addToast, confirm } = useToast();
  const [versions, setVersions] = React.useState<PlanVersion[]>([]);

  React.useEffect(() => {
    setVersions(getVersions(planId));
  }, [planId]);

  const handleDelete = async (versionId: string) => {
    const ok = await confirm({
      title: '버전 삭제',
      message: '이 버전을 삭제하시겠습니까?',
      variant: 'danger',
    });
    if (ok) {
      deleteVersion(planId, versionId);
      setVersions(getVersions(planId));
      addToast({ type: 'success', title: '버전 삭제됨' });
    }
  };

  const handleRestore = async (version: PlanVersion) => {
    const ok = await confirm({
      title: '버전 복원',
      message: `${new Date(version.savedAt).toLocaleString('ko-KR')}에 저장된 버전으로 복원하시겠습니까?`,
      variant: 'warning',
    });
    if (ok) {
      onRestore(version);
      addToast({ type: 'success', title: '버전 복원 완료' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" /> 식단 히스토리
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {versions.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">저장된 버전이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((v, i) => (
                <div
                  key={v.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold flex-shrink-0">
                    v{versions.length - i}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{v.label || `버전 ${versions.length - i}`}</p>
                    <p className="text-xs text-gray-500">{new Date(v.savedAt).toLocaleString('ko-KR')}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleRestore(v)} title="복원">
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(v.id)}
                      title="삭제"
                      className="text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanHistory;
