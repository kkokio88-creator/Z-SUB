import React, { useMemo, useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { useMenu } from '../context/MenuContext';
import { MAJOR_INGREDIENTS } from '../constants';
import { MenuCategory, TasteProfile } from '../types';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  BarChart,
  Cell,
  type BarRectangleItem,
} from 'recharts';

const TASTE_LABELS: Record<string, string> = {
  [TasteProfile.GANJANG]: '간장',
  [TasteProfile.GOCHUJANG]: '고추장',
  [TasteProfile.DOENJANG]: '된장',
};

const DashboardMenuAnalysis: React.FC = () => {
  const { menuItems } = useMenu();
  const [expandedIngredient, setExpandedIngredient] = useState<string | null>(null);

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

  // 선택된 주재료의 메뉴 목록
  const expandedMenus = useMemo(() => {
    if (!expandedIngredient) return [];
    return activeMenus
      .filter(m => m.mainIngredient === expandedIngredient)
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [expandedIngredient, activeMenus]);

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
        <h4 className="text-sm font-bold text-stone-700 mb-1">주재료 분포</h4>
        <p className="text-xs text-stone-400 mb-3">
          막대 또는 버튼을 클릭하면 해당 주재료 메뉴 목록을 펼쳐볼 수 있습니다
        </p>
        {ingredientData.length === 0 ? (
          <div className="text-center py-6 text-stone-400 text-sm">주재료 데이터가 없습니다</div>
        ) : (
          <>
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
                  {}
                  <Bar
                    dataKey="count"
                    name="메뉴 수"
                    radius={[0, 4, 4, 0]}
                    cursor="pointer"
                    onClick={(data: BarRectangleItem) => {
                      const key: string = data?.key != null ? String(data.key) : '';
                      if (key) setExpandedIngredient(prev => (prev === key ? null : key));
                    }}
                  >
                    {ingredientData.map((entry, index) => {
                      const ratio = entry.count / maxIngredientCount;
                      const r = Math.round(59 + (1 - ratio) * 170);
                      const g = Math.round(130 + (1 - ratio) * 100);
                      const b = Math.round(246 - ratio * 100);
                      const isExpanded = expandedIngredient === entry.key;
                      return (
                        <Cell
                          key={index}
                          fill={`rgb(${r}, ${g}, ${b})`}
                          stroke={isExpanded ? '#1d4ed8' : undefined}
                          strokeWidth={isExpanded ? 2 : 0}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Clickable ingredient pill buttons */}
            <div className="mt-2 flex flex-wrap gap-2">
              {ingredientData.map(entry => (
                <button
                  key={entry.key}
                  onClick={() => setExpandedIngredient(prev => (prev === entry.key ? null : entry.key))}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    expandedIngredient === entry.key
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {entry.label}
                  <span className="opacity-75">{entry.count}</span>
                  {expandedIngredient === entry.key ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              ))}
            </div>

            {/* Accordion: 선택된 주재료의 메뉴 목록 */}
            {expandedIngredient && (
              <div className="mt-3 border border-stone-200 rounded-lg overflow-hidden">
                <div className="bg-stone-100 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-sm font-bold text-stone-800">
                    {ingredientData.find(d => d.key === expandedIngredient)?.label || expandedIngredient}
                    <span className="ml-2 text-xs font-normal text-stone-500">({expandedMenus.length}개 메뉴)</span>
                  </span>
                  <button
                    onClick={() => setExpandedIngredient(null)}
                    className="text-stone-400 hover:text-stone-600 transition-colors"
                    aria-label="접기"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
                {expandedMenus.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-stone-400 text-center">메뉴가 없습니다</div>
                ) : (
                  <div className="max-h-[240px] overflow-y-auto divide-y divide-stone-100">
                    {expandedMenus.map(m => (
                      <div key={m.id} className="px-4 py-2 flex items-center justify-between hover:bg-stone-50 text-xs">
                        <span className="font-medium text-stone-800 whitespace-normal break-words flex-1 min-w-0 pr-3">
                          {m.name}
                        </span>
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 text-[10px] font-medium">
                          {m.category}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
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
