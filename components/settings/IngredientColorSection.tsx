import React from 'react';
import { Palette, ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { IngredientColorConfig } from '../../types';
import { INGREDIENT_COLOR_MAP } from '../../constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

const COLOR_OPTIONS = ['red', 'pink', 'amber', 'blue', 'yellow', 'orange', 'lime', 'teal', 'violet', 'green'];

interface IngredientColorSectionProps {
  ingredientColors: IngredientColorConfig[];
  newIngKey: string;
  setNewIngKey: (v: string) => void;
  newIngLabel: string;
  setNewIngLabel: (v: string) => void;
  moveIngredient: (index: number, direction: 'up' | 'down') => void;
  updateIngredientColor: (index: number, field: keyof IngredientColorConfig, value: string | number | boolean) => void;
  removeIngredientColor: (index: number) => void;
  addIngredientColor: () => void;
}

const IngredientColorSection: React.FC<IngredientColorSectionProps> = ({
  ingredientColors,
  newIngKey,
  setNewIngKey,
  newIngLabel,
  setNewIngLabel,
  moveIngredient,
  updateIngredientColor,
  removeIngredientColor,
  addIngredientColor,
}) => (
  <div className="space-y-6 max-w-3xl">
    <div className="bg-rose-50 p-4 rounded-lg border border-rose-100 flex gap-3 items-start">
      <Palette className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
      <div>
        <h4 className="font-bold text-rose-900 text-sm">주재료별 컬러 우선순위</h4>
        <p className="text-xs text-rose-700 mt-1">
          식단표에서 주재료에 따른 색상 표시 우선순위를 설정합니다. 위/아래 버튼으로 순서를 변경하세요.
        </p>
      </div>
    </div>

    <div className="border border-stone-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-stone-50 border-b border-stone-200">
            <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 w-12">순서</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600">재료명</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-stone-600">색상</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-stone-600">우선순위</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-stone-600">활성화</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-stone-600 w-24">이동</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-stone-600 w-16">삭제</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {ingredientColors.map((item, index) => {
            const colorStyle = INGREDIENT_COLOR_MAP[item.color];
            return (
              <tr key={item.key} className={`hover:bg-stone-50/60 ${!item.enabled ? 'opacity-50' : ''}`}>
                <td className="px-4 py-2.5 text-xs text-stone-500 font-mono">{index + 1}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    {colorStyle && <div className={`w-3 h-3 rounded-full ${colorStyle.dot}`}></div>}
                    <input
                      type="text"
                      value={item.label}
                      onChange={e => updateIngredientColor(index, 'label', e.target.value)}
                      className="text-sm font-medium text-stone-800 bg-transparent border-none focus:ring-1 focus:ring-rose-400 rounded px-1 py-0.5 w-20"
                    />
                    <span className="text-xs text-stone-400">({item.key})</span>
                  </div>
                </td>
                <td className="px-4 py-2 text-center">
                  <select
                    value={item.color}
                    onChange={e => updateIngredientColor(index, 'color', e.target.value)}
                    className="text-xs border border-stone-200 rounded-md px-2 py-1.5 bg-white focus:ring-1 focus:ring-rose-400"
                  >
                    {COLOR_OPTIONS.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 text-center">
                  <Input
                    type="number"
                    min="1"
                    value={item.priority}
                    onChange={e => updateIngredientColor(index, 'priority', parseInt(e.target.value) || 1)}
                    className="w-16 text-center"
                  />
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => updateIngredientColor(index, 'enabled', !item.enabled)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${item.enabled ? 'bg-rose-500' : 'bg-stone-300'}`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${item.enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`}
                    />
                  </button>
                </td>
                <td className="px-4 py-2 text-center">
                  <div className="flex gap-1 justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveIngredient(index, 'up')}
                      disabled={index === 0}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveIngredient(index, 'down')}
                      disabled={index === ingredientColors.length - 1}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
                <td className="px-4 py-2 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeIngredientColor(index)}
                    className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    <Card>
      <CardContent className="p-4">
        <Label className="block mb-3 text-sm font-semibold text-stone-700">새 주재료 추가</Label>
        <div className="flex gap-3 items-end">
          <div className="w-24">
            <Label className="text-xs text-stone-500 mb-1 block">키</Label>
            <Input
              type="text"
              value={newIngKey}
              onChange={e => setNewIngKey(e.target.value)}
              placeholder="예: shrimp"
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs text-stone-500 mb-1 block">표시명</Label>
            <Input
              type="text"
              value={newIngLabel}
              onChange={e => setNewIngLabel(e.target.value)}
              placeholder="예: 새우"
            />
          </div>
          <Button onClick={addIngredientColor} className="shrink-0">
            <Plus className="w-4 h-4" /> 추가
          </Button>
        </div>
      </CardContent>
    </Card>

    <p className="text-xs text-stone-400">
      * 우선순위가 낮은 숫자일수록 식단표에서 먼저 적용됩니다. 비활성화된 재료는 컬러링에서 제외됩니다.
    </p>
  </div>
);

export default IngredientColorSection;
