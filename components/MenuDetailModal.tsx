import React, { useState } from 'react';
import { X, Save, Check, Hash, Filter } from 'lucide-react';
import { MenuItem, MenuCategory, Season, TasteProfile } from '../types';
import { MAJOR_INGREDIENTS } from '../constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MenuDetailModalProps {
  item: MenuItem;
  onSave: (updated: MenuItem) => void;
  onClose: () => void;
}

const MenuDetailModal: React.FC<MenuDetailModalProps> = ({ item, onSave, onClose }) => {
  const [draft, setDraft] = useState<MenuItem>({ ...item });

  const update = <K extends keyof MenuItem>(field: K, value: MenuItem[K]) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  const handleTasteToggle = (taste: TasteProfile) => {
    const newTastes = draft.tastes.includes(taste) ? draft.tastes.filter(t => t !== taste) : [...draft.tastes, taste];
    setDraft(prev => ({
      ...prev,
      tastes: newTastes,
      isSpicy: newTastes.includes(TasteProfile.SPICY),
    }));
  };

  const handleAddTag = (tag: string) => {
    if (tag.trim() && !draft.tags.includes(tag.trim())) {
      update('tags', [...draft.tags, tag.trim()]);
    }
  };

  const handleRemoveTag = (tag: string) => {
    update(
      'tags',
      draft.tags.filter(t => t !== tag)
    );
  };

  const handleSave = () => {
    onSave(draft);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <select
                value={draft.category}
                onChange={e => update('category', e.target.value as MenuCategory)}
                className="text-xs font-bold bg-gray-100 border-transparent rounded px-2 py-1 focus:ring-primary-500 focus:bg-white"
              >
                {Object.values(MenuCategory).map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {draft.isUnused && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">미사용</span>}
            </div>
            <Input
              type="text"
              value={draft.name}
              onChange={e => update('name', e.target.value)}
              className="text-xl font-bold text-gray-900 border-none p-0 focus:ring-0 w-full placeholder-gray-300 shadow-none h-auto"
              placeholder="메뉴명 입력"
            />
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <span className="text-gray-400">품목코드:</span>
                <Input
                  value={draft.code || ''}
                  onChange={e => update('code', e.target.value)}
                  className="font-mono bg-transparent border-none p-0 w-28 focus:ring-0 text-gray-600 shadow-none h-auto"
                  placeholder="CODE"
                />
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Basic Info Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-3">
              <Label className="block mb-1">원가</Label>
              <div className="flex items-center">
                <span className="text-gray-400 text-sm mr-1">{'\u20A9'}</span>
                <Input
                  type="number"
                  value={draft.cost}
                  onChange={e => update('cost', parseInt(e.target.value) || 0)}
                  className="bg-transparent border-none p-0 font-bold text-lg text-gray-800 w-full focus:ring-0 shadow-none h-auto"
                />
              </div>
            </Card>
            <Card className="p-3">
              <Label className="block mb-1">판매가</Label>
              <div className="flex items-center">
                <span className="text-gray-400 text-sm mr-1">{'\u20A9'}</span>
                <Input
                  type="number"
                  value={draft.recommendedPrice}
                  onChange={e => update('recommendedPrice', parseInt(e.target.value) || 0)}
                  className="bg-transparent border-none p-0 font-bold text-lg text-gray-800 w-full focus:ring-0 shadow-none h-auto"
                />
              </div>
            </Card>
            <Card className="p-3">
              <Label className="block mb-1">중량 (g)</Label>
              <Input
                type="number"
                value={draft.weight || 0}
                onChange={e => update('weight', parseInt(e.target.value) || 0)}
                className="bg-transparent border-none p-0 font-bold text-lg text-gray-800 w-full focus:ring-0 shadow-none h-auto"
              />
            </Card>
            <Card className="p-3">
              <Label className="block mb-1">공정 번호</Label>
              <Input
                type="number"
                value={draft.process || 0}
                onChange={e => update('process', parseInt(e.target.value) || 0)}
                className="bg-transparent border-none p-0 font-bold text-lg text-gray-800 w-full focus:ring-0 shadow-none h-auto"
              />
            </Card>
          </div>

          {/* Characteristics */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 pb-2 border-b border-gray-100">
              <Filter className="w-4 h-4 text-gray-400" /> 메뉴 속성 상세
            </h4>

            <div className="flex gap-6">
              <div>
                <Label className="mb-2 block">계절성</Label>
                <div className="flex gap-2 flex-wrap">
                  {Object.values(Season).map(s => (
                    <Button
                      key={s}
                      variant={draft.season === s ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => update('season', s)}
                      className={`rounded-full ${draft.season === s ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex-1">
                <Label className="mb-2 block">주재료</Label>
                <select
                  value={draft.mainIngredient}
                  onChange={e => update('mainIngredient', e.target.value)}
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-primary-500 focus:border-primary-500"
                >
                  {MAJOR_INGREDIENTS.map(ing => (
                    <option key={ing.key} value={ing.key}>
                      {ing.label}
                    </option>
                  ))}
                  <option value="other">기타</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">맛 속성</Label>
              <div className="flex flex-wrap gap-2">
                {Object.values(TasteProfile).map(t => {
                  const isActive = draft.tastes.includes(t);
                  return (
                    <Button
                      key={t}
                      variant={isActive ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleTasteToggle(t)}
                      className={`rounded-lg font-bold transition-all ${isActive ? 'bg-gray-800 text-white shadow-md transform scale-105 hover:bg-gray-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                    >
                      {t}
                      {isActive && <Check className="w-3 h-3 inline ml-1" />}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 pb-2 border-b border-gray-100 mb-3">
              <Hash className="w-4 h-4 text-gray-400" /> 관리 태그
            </h4>
            <div className="flex flex-wrap gap-2 mb-3">
              {draft.tags.map((tag, idx) => (
                <Badge key={idx} variant="info" className="inline-flex items-center px-2.5 py-1 gap-1">
                  #{tag}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-0.5 hover:text-blue-900 h-auto w-auto p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            <Input
              type="text"
              placeholder="태그 추가 (Enter)..."
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleAddTag(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
            />
          </div>

          {/* Usage toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
            <span className="text-sm font-medium text-gray-700">사용 여부</span>
            <Button
              variant={draft.isUnused ? 'default' : 'outline'}
              size="sm"
              onClick={() => update('isUnused', !draft.isUnused)}
              className={`transition-colors ${draft.isUnused ? 'bg-gray-800 text-white border-gray-800 hover:bg-gray-700' : 'bg-white text-green-700 border-green-300 hover:bg-green-50'}`}
            >
              {draft.isUnused ? '미사용' : '사용중'}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4" /> 저장
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MenuDetailModal;
