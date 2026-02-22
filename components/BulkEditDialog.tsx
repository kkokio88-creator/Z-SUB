import React, { useState } from 'react';
import { X } from 'lucide-react';
import { MenuCategory } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BulkEditDialogProps {
  selectedCount: number;
  onApply: (changes: {
    category?: MenuCategory;
    addTags?: string[];
    removeTags?: string[];
    isUnused?: boolean;
  }) => void;
  onClose: () => void;
}

const BulkEditDialog: React.FC<BulkEditDialogProps> = ({ selectedCount, onApply, onClose }) => {
  const [category, setCategory] = useState<MenuCategory | ''>('');
  const [addTagInput, setAddTagInput] = useState('');
  const [addTags, setAddTags] = useState<string[]>([]);
  const [removeTagInput, setRemoveTagInput] = useState('');
  const [removeTags, setRemoveTags] = useState<string[]>([]);
  const [isUnused, setIsUnused] = useState<'' | 'true' | 'false'>('');

  const handleApply = () => {
    const changes: Parameters<typeof onApply>[0] = {};
    if (category) changes.category = category;
    if (addTags.length > 0) changes.addTags = addTags;
    if (removeTags.length > 0) changes.removeTags = removeTags;
    if (isUnused !== '') changes.isUnused = isUnused === 'true';
    onApply(changes);
  };

  const hasChanges = category || addTags.length > 0 || removeTags.length > 0 || isUnused !== '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">일괄 편집 ({selectedCount}개 선택)</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5 text-gray-400" />
          </Button>
        </div>

        <div className="p-5 space-y-5">
          {/* Category */}
          <div>
            <Label className="mb-1.5 block">카테고리 변경</Label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as MenuCategory | '')}
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:ring-primary-500"
            >
              <option value="">변경 안함</option>
              {Object.values(MenuCategory).map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Add Tags */}
          <div>
            <Label className="mb-1.5 block">태그 추가</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {addTags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100"
                >
                  +{tag}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAddTags(t => t.filter(x => x !== tag))}
                    className="ml-1 h-auto w-auto p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </span>
              ))}
            </div>
            <Input
              type="text"
              value={addTagInput}
              onChange={e => setAddTagInput(e.target.value)}
              placeholder="태그 입력 후 Enter"
              onKeyDown={e => {
                if (e.key === 'Enter' && addTagInput.trim()) {
                  setAddTags(prev => [...prev, addTagInput.trim()]);
                  setAddTagInput('');
                }
              }}
            />
          </div>

          {/* Remove Tags */}
          <div>
            <Label className="mb-1.5 block">태그 제거</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {removeTags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-700 border border-red-100"
                >
                  -{tag}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRemoveTags(t => t.filter(x => x !== tag))}
                    className="ml-1 h-auto w-auto p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </span>
              ))}
            </div>
            <Input
              type="text"
              value={removeTagInput}
              onChange={e => setRemoveTagInput(e.target.value)}
              placeholder="제거할 태그 입력 후 Enter"
              onKeyDown={e => {
                if (e.key === 'Enter' && removeTagInput.trim()) {
                  setRemoveTags(prev => [...prev, removeTagInput.trim()]);
                  setRemoveTagInput('');
                }
              }}
            />
          </div>

          {/* Usage Status */}
          <div>
            <Label className="mb-1.5 block">사용 상태</Label>
            <select
              value={isUnused}
              onChange={e => setIsUnused(e.target.value as '' | 'true' | 'false')}
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:ring-primary-500"
            >
              <option value="">변경 안함</option>
              <option value="false">사용</option>
              <option value="true">미사용</option>
            </select>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleApply} disabled={!hasChanges}>
            적용
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkEditDialog;
