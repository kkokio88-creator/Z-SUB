import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { parseMenuItem, INGREDIENT_COLORS } from './historyConstants';

const SwapModal: React.FC<{
  currentName: string;
  menuItems: { id: string; name: string; mainIngredient: string; cost: number }[];
  onSelect: (name: string) => void;
  onClose: () => void;
}> = ({ currentName, menuItems, onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [ingredientFilter, setIngredientFilter] = useState('');

  const candidates = useMemo(() => {
    return menuItems
      .filter(item => {
        if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (ingredientFilter && item.mainIngredient !== ingredientFilter) return false;
        return true;
      })
      .slice(0, 50);
  }, [search, ingredientFilter, menuItems]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-stone-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-stone-800">메뉴 교체</h3>
            <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
              <X className="w-5 h-5 text-stone-400" />
            </Button>
          </div>
          <p className="text-sm text-stone-500 mb-3">
            현재: <span className="font-medium text-stone-700">{parseMenuItem(currentName).cleanName}</span>
          </p>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="메뉴명 검색..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              autoFocus
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(INGREDIENT_COLORS)
              .filter(([k]) => k !== 'other')
              .map(([key, val]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => setIngredientFilter(f => (f === key ? '' : key))}
                  className={`px-2 py-0.5 text-[11px] rounded-full border transition-colors ${ingredientFilter === key ? `bg-stone-100 ${val.text} border-current font-bold` : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'}`}
                >
                  {val.label}
                </Button>
              ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {candidates.length === 0 ? (
            <p className="text-center text-sm text-stone-400 py-8">검색 결과 없음</p>
          ) : (
            <div className="space-y-1">
              {candidates.map(item => {
                const colors = INGREDIENT_COLORS[item.mainIngredient] || INGREDIENT_COLORS.other;
                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    onClick={() => onSelect(item.name)}
                    className={`w-full text-left px-3 py-2 rounded-lg hover:ring-1 hover:ring-stone-300 transition-all flex items-center justify-between h-auto`}
                  >
                    <span className={`text-sm truncate ${colors.text}`}>{item.name}</span>
                    <div className="flex items-center gap-2 text-xs text-stone-400 shrink-0 ml-2">
                      <span className={`px-1.5 py-0.5 rounded bg-stone-50 ${colors.text} text-[10px] font-medium`}>
                        {colors.label}
                      </span>
                      <span>
                        {'\u20A9'}
                        {item.cost.toLocaleString()}
                      </span>
                    </div>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SwapModal;
