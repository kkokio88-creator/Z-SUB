import React, { useState, useMemo } from 'react';
import { X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ReviewComment } from '../../types';
import { parseMenuItem } from './historyConstants';

const CommentModal: React.FC<{
  planKey: string;
  scopeKey: string;
  menuName: string;
  comments: ReviewComment[];
  onSubmit: (text: string) => void;
  onDelete: (commentId: string) => void;
  onClose: () => void;
}> = ({ planKey: _planKey, scopeKey, menuName, comments, onSubmit, onDelete, onClose }) => {
  const [text, setText] = useState('');

  const scopeComments = useMemo(() => {
    if (scopeKey.startsWith('PROD|')) {
      const cleanName = scopeKey.split('|')[1];
      return comments
        .filter(c => c.scopeKey.endsWith(`-${cleanName}`))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    return comments.filter(c => c.scopeKey === scopeKey).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [comments, scopeKey]);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-stone-100 flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-stone-800">{parseMenuItem(menuName).cleanName}</p>
            <p className="text-[11px] text-stone-400">
              {scopeKey.startsWith('PROD|') ? '전체 식단 공통 코멘트' : '코멘트'} ({scopeComments.length})
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100">
            <X className="w-4 h-4 text-stone-400" />
          </Button>
        </div>

        {/* 기존 코멘트 */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {scopeComments.length === 0 ? (
            <p className="text-center text-sm text-stone-300 py-4">아직 코멘트가 없습니다</p>
          ) : (
            scopeComments.map(c => (
              <div key={c.id} className="bg-stone-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-stone-700">{c.reviewer}</span>
                  <span className="text-[10px] text-stone-400">{new Date(c.createdAt).toLocaleString('ko-KR')}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(c.id)}
                    className="ml-auto h-auto p-0.5 text-stone-300 hover:text-red-500"
                    title="코멘트 삭제"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-sm text-stone-600">{c.comment}</p>
              </div>
            ))
          )}
        </div>

        {/* 입력 */}
        <div className="px-4 py-3 border-t border-stone-100 flex gap-2">
          <Input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="의견을 입력하세요..."
            className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autoFocus
          />
          <Button onClick={handleSubmit} disabled={!text.trim()} className="px-3 py-2 bg-blue-600 hover:bg-blue-700">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CommentModal;
