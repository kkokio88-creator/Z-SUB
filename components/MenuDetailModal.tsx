import React, { useState } from 'react';
import { X, Save, Check, Hash, Filter } from 'lucide-react';
import { MenuItem, MenuCategory, Season, TasteProfile } from '../types';
import { MAJOR_INGREDIENTS } from '../constants';

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
            <input
              type="text"
              value={draft.name}
              onChange={e => update('name', e.target.value)}
              className="text-xl font-bold text-gray-900 border-none p-0 focus:ring-0 w-full placeholder-gray-300"
              placeholder="메뉴명 입력"
            />
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <span className="text-gray-400">품목코드:</span>
                <input
                  value={draft.code || ''}
                  onChange={e => update('code', e.target.value)}
                  className="font-mono bg-transparent border-none p-0 w-28 focus:ring-0 text-gray-600"
                  placeholder="CODE"
                />
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Basic Info Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <label className="text-xs font-bold text-gray-400 block mb-1">원가</label>
              <div className="flex items-center">
                <span className="text-gray-400 text-sm mr-1">{'\u20A9'}</span>
                <input
                  type="number"
                  value={draft.cost}
                  onChange={e => update('cost', parseInt(e.target.value) || 0)}
                  className="bg-transparent border-none p-0 font-bold text-lg text-gray-800 w-full focus:ring-0"
                />
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <label className="text-xs font-bold text-gray-400 block mb-1">판매가</label>
              <div className="flex items-center">
                <span className="text-gray-400 text-sm mr-1">{'\u20A9'}</span>
                <input
                  type="number"
                  value={draft.recommendedPrice}
                  onChange={e => update('recommendedPrice', parseInt(e.target.value) || 0)}
                  className="bg-transparent border-none p-0 font-bold text-lg text-gray-800 w-full focus:ring-0"
                />
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <label className="text-xs font-bold text-gray-400 block mb-1">중량 (g)</label>
              <input
                type="number"
                value={draft.weight || 0}
                onChange={e => update('weight', parseInt(e.target.value) || 0)}
                className="bg-transparent border-none p-0 font-bold text-lg text-gray-800 w-full focus:ring-0"
              />
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <label className="text-xs font-bold text-gray-400 block mb-1">공정 번호</label>
              <input
                type="number"
                value={draft.process || 0}
                onChange={e => update('process', parseInt(e.target.value) || 0)}
                className="bg-transparent border-none p-0 font-bold text-lg text-gray-800 w-full focus:ring-0"
              />
            </div>
          </div>

          {/* Characteristics */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 pb-2 border-b border-gray-100">
              <Filter className="w-4 h-4 text-gray-400" /> 메뉴 속성 상세
            </h4>

            <div className="flex gap-6">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 block">계절성</label>
                <div className="flex gap-2 flex-wrap">
                  {Object.values(Season).map(s => (
                    <button
                      key={s}
                      onClick={() => update('season', s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border ${draft.season === s ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1">
                <label className="text-xs font-bold text-gray-500 mb-2 block">주재료</label>
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
              <label className="text-xs font-bold text-gray-500 mb-2 block">맛 속성</label>
              <div className="flex flex-wrap gap-2">
                {Object.values(TasteProfile).map(t => {
                  const isActive = draft.tastes.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => handleTasteToggle(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isActive ? 'bg-gray-800 text-white shadow-md transform scale-105' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                    >
                      {t}
                      {isActive && <Check className="w-3 h-3 inline ml-1" />}
                    </button>
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
                <span
                  key={idx}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"
                >
                  #{tag}
                  <button onClick={() => handleRemoveTag(tag)} className="ml-1.5 hover:text-blue-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="태그 추가 (Enter)..."
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
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
            <button
              onClick={() => update('isUnused', !draft.isUnused)}
              className={`px-4 py-1.5 text-xs font-medium rounded border transition-colors ${draft.isUnused ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-green-700 border-green-300'}`}
            >
              {draft.isUnused ? '미사용' : '사용중'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 shadow-sm"
          >
            <Save className="w-4 h-4" /> 저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuDetailModal;
