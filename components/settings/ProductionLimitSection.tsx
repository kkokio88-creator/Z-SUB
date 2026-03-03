import React from 'react';
import { Factory, Plus, Trash2 } from 'lucide-react';
import { ProductionLimitConfig } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface ProductionLimitSectionProps {
  productionLimits: ProductionLimitConfig[];
  newProdCategory: string;
  setNewProdCategory: (v: string) => void;
  newProdLimit: number;
  setNewProdLimit: (v: number) => void;
  addProductionCategory: () => void;
  removeProductionCategory: (index: number) => void;
  updateProductionLimit: (index: number, field: keyof ProductionLimitConfig, value: string | number | boolean) => void;
}

const ProductionLimitSection: React.FC<ProductionLimitSectionProps> = ({
  productionLimits,
  newProdCategory,
  setNewProdCategory,
  newProdLimit,
  setNewProdLimit,
  addProductionCategory,
  removeProductionCategory,
  updateProductionLimit,
}) => (
  <div className="space-y-6 max-w-3xl">
    <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-100 flex gap-3 items-start">
      <Factory className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
      <div>
        <h4 className="font-bold text-cyan-900 text-sm">카테고리별 생산 한도</h4>
        <p className="text-xs text-cyan-700 mt-1">
          카테고리별 일일 생산 한도를 설정합니다. 한도를 초과하는 메뉴 배치 시 경고가 표시됩니다.
        </p>
      </div>
    </div>

    <div className="border border-stone-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-stone-50 border-b border-stone-200">
            <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600">카테고리</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-stone-600">일일 한도</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-stone-600">활성화</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-stone-600 w-16">삭제</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {productionLimits.map((item, index) => (
            <tr
              key={`${item.category}-${index}`}
              className={`hover:bg-stone-50/60 ${!item.enabled ? 'opacity-50' : ''}`}
            >
              <td className="px-4 py-2.5 text-sm font-medium text-stone-800">{item.category}</td>
              <td className="px-4 py-2 text-center">
                <Input
                  type="number"
                  min="0"
                  value={item.dailyLimit}
                  onChange={e => updateProductionLimit(index, 'dailyLimit', parseInt(e.target.value) || 0)}
                  className="w-24 text-center"
                />
              </td>
              <td className="px-4 py-2 text-center">
                <button
                  onClick={() => updateProductionLimit(index, 'enabled', !item.enabled)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${item.enabled ? 'bg-cyan-500' : 'bg-stone-300'}`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${item.enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`}
                  />
                </button>
              </td>
              <td className="px-4 py-2 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeProductionCategory(index)}
                  className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* 새 카테고리 추가 */}
    <Card>
      <CardContent className="p-4">
        <Label className="block mb-3 text-sm font-semibold text-stone-700">새 카테고리 추가</Label>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Label className="text-xs text-stone-500 mb-1 block">카테고리명</Label>
            <Input
              type="text"
              value={newProdCategory}
              onChange={e => setNewProdCategory(e.target.value)}
              placeholder="예: 냉동, 상온"
              onKeyDown={e => e.key === 'Enter' && addProductionCategory()}
            />
          </div>
          <div className="w-32">
            <Label className="text-xs text-stone-500 mb-1 block">일일 한도</Label>
            <Input
              type="number"
              min="0"
              value={newProdLimit}
              onChange={e => setNewProdLimit(parseInt(e.target.value) || 0)}
            />
          </div>
          <Button onClick={addProductionCategory} className="shrink-0">
            <Plus className="w-4 h-4" /> 추가
          </Button>
        </div>
      </CardContent>
    </Card>

    <p className="text-xs text-stone-400">* 생산 한도는 식단 편성 시 카테고리별 총 생산량을 제한하는 데 사용됩니다.</p>
  </div>
);

export default ProductionLimitSection;
