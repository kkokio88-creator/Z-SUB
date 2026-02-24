import React, { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { useMenu } from '../context/MenuContext';
import { MAJOR_INGREDIENTS } from '../constants';
import { MenuCategory, TasteProfile } from '../types';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, BarChart, Cell } from 'recharts';

const TASTE_LABELS: Record<string, string> = {
  [TasteProfile.GANJANG]: '간장',
  [TasteProfile.GOCHUJANG]: '고추장',
  [TasteProfile.DOENJANG]: '된장',
};

const DashboardMenuAnalysis: React.FC = () => {
  const { menuItems } = useMenu();

  const activeMenus = useMemo(() => menuItems.filter(m => !m.isUnused), [menuItems]);

  // ── Section A: 주재료 분포 ──
  const ingredientData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of activeMenus) {
      if (m.mainIngredient) {
        counts[m.mainIngredient] = (counts[m.mainIngredient] || 0) + 1;
      }
    }
    const labelMap = new Map(MAJOR_INGREDIENTS.map(i => [i.key, i.label]));
    return Object.entries(counts)
      .map(([key, count]) => ({
        key,
        label: labelMap.get(key) || key,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [activeMenus]);

  const maxIngredientCount = useMemo(() => Math.max(...ingredientData.map(d => d.count), 1), [ingredientData]);

  // ── Section B: 태그 분석 ──
  const tagData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of activeMenus) {
      for (const tag of m.tags) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [activeMenus]);

  const maxTagCount = useMemo(() => Math.max(...tagData.map(d => d.count), 1), [tagData]);

  // ── Section C: 맛 프로필 × 카테고리 매트릭스 ──
  const tasteCategories = Object.values(MenuCategory);
  const tasteProfiles = Object.values(TasteProfile);

  const tasteMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    for (const taste of tasteProfiles) {
      matrix[taste] = {};
      for (const cat of tasteCategories) {
        matrix[taste][cat] = 0;
      }
    }
    for (const m of activeMenus) {
      for (const taste of m.tastes) {
        if (matrix[taste]?.[m.category] !== undefined) {
          matrix[taste][m.category]++;
        }
      }
    }
    return matrix;
  }, [activeMenus, tasteProfiles, tasteCategories]);

  const maxMatrixValue = useMemo(() => {
    let max = 1;
    for (const taste of tasteProfiles) {
      for (const cat of tasteCategories) {
        if (tasteMatrix[taste][cat] > max) max = tasteMatrix[taste][cat];
      }
    }
    return max;
  }, [tasteMatrix, tasteProfiles, tasteCategories]);

  return (
    <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-8">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-stone-500" />
        <h3 className="text-lg font-bold text-stone-800">메뉴 분석</h3>
        <span className="text-xs text-stone-400 ml-2">활성 메뉴 {activeMenus.length}개 기준</span>
      </div>

      {/* Section A: 주재료 분포 */}
      <div>
        <h4 className="text-sm font-bold text-stone-700 mb-3">주재료 분포</h4>
        {ingredientData.length === 0 ? (
          <div className="text-center py-6 text-stone-400 text-sm">주재료 데이터가 없습니다</div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ingredientData} layout="vertical" margin={{ top: 5, right: 30, left: 70, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} width={65} />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [`${value}개`, '메뉴 수']}
                />
                <Bar dataKey="count" name="메뉴 수" radius={[0, 4, 4, 0]}>
                  {ingredientData.map((entry, index) => {
                    const ratio = entry.count / maxIngredientCount;
                    const r = Math.round(59 + (1 - ratio) * 170);
                    const g = Math.round(130 + (1 - ratio) * 100);
                    const b = Math.round(246 - ratio * 100);
                    return <Cell key={index} fill={`rgb(${r}, ${g}, ${b})`} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Section B: 태그 분석 */}
      <div>
        <h4 className="text-sm font-bold text-stone-700 mb-3">태그 분석</h4>
        {tagData.length === 0 ? (
          <div className="text-center py-6 text-stone-400 text-sm">태그 데이터가 없습니다</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tagData.map(({ tag, count }) => {
              const ratio = count / maxTagCount;
              const bg =
                ratio > 0.7
                  ? 'bg-blue-600 text-white'
                  : ratio > 0.4
                    ? 'bg-blue-400 text-white'
                    : ratio > 0.2
                      ? 'bg-blue-200 text-blue-800'
                      : 'bg-blue-50 text-blue-600';
              return (
                <span
                  key={tag}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${bg}`}
                >
                  {tag}
                  <span className="opacity-75 text-[10px]">{count}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Section C: 맛 프로필 x 카테고리 매트릭스 */}
      <div>
        <h4 className="text-sm font-bold text-stone-700 mb-3">맛 프로필 x 카테고리 매트릭스</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-stone-500">맛</th>
                {tasteCategories.map(cat => (
                  <th key={cat} className="px-3 py-2 text-center text-[11px] font-semibold text-stone-500">
                    {cat}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {tasteProfiles.map(taste => (
                <tr key={taste} className="hover:bg-stone-50/30">
                  <td className="px-3 py-2 text-xs font-medium text-stone-700 whitespace-nowrap">
                    {TASTE_LABELS[taste] || taste}
                  </td>
                  {tasteCategories.map(cat => {
                    const value = tasteMatrix[taste][cat];
                    const ratio = value / maxMatrixValue;
                    let cellClass = 'bg-stone-50 text-stone-400';
                    if (value > 0) {
                      if (ratio > 0.7) cellClass = 'bg-blue-500 text-white font-bold';
                      else if (ratio > 0.4) cellClass = 'bg-blue-300 text-blue-900 font-semibold';
                      else if (ratio > 0.15) cellClass = 'bg-blue-100 text-blue-700';
                      else cellClass = 'bg-blue-50 text-blue-600';
                    }
                    return (
                      <td key={cat} className="px-1 py-1">
                        <div className={`rounded px-2 py-1.5 text-center text-xs ${cellClass}`}>{value}</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardMenuAnalysis;
