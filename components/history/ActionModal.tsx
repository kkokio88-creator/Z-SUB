import React from 'react';
import { MessageSquare, Replace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseMenuItem } from './historyConstants';

const ActionModal: React.FC<{
  menuName: string;
  onComment: () => void;
  onSwap: () => void;
  onClose: () => void;
}> = ({ menuName, onComment, onSwap, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
    <div className="bg-white rounded-xl shadow-xl w-72 overflow-hidden" onClick={e => e.stopPropagation()}>
      <div className="px-4 py-3 border-b border-stone-100">
        <p className="text-sm font-bold text-stone-800 truncate">{parseMenuItem(menuName).cleanName}</p>
      </div>
      <div className="p-2 space-y-1">
        <Button
          variant="ghost"
          onClick={onComment}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 text-left transition-colors h-auto justify-start"
        >
          <MessageSquare className="w-4 h-4 text-blue-500" />
          <div>
            <div className="text-sm font-medium text-stone-800">의견 남기기</div>
            <div className="text-[11px] text-stone-400">이 메뉴에 코멘트 작성</div>
          </div>
        </Button>
        <Button
          variant="ghost"
          onClick={onSwap}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-orange-50 text-left transition-colors h-auto justify-start"
        >
          <Replace className="w-4 h-4 text-orange-500" />
          <div>
            <div className="text-sm font-medium text-stone-800">메뉴 변경</div>
            <div className="text-[11px] text-stone-400">다른 메뉴로 교체</div>
          </div>
        </Button>
      </div>
    </div>
  </div>
);

export default ActionModal;
