import React, { useMemo } from 'react';
import type { HistoricalMealPlan, MenuItem } from '../types';
import { TargetType, MenuCategory } from '../types';
import { TARGET_CONFIGS, TARGET_LABELS } from '../constants';
import { normalizeMenuName } from '../services/menuUtils';

const TARGET_ORDER = Object.values(TargetType);

// 공정 타입 감지 (이름 접미사 기반)
function detectItemProcess(name: string): string | null {
  if (name.includes('_반조리')) return '반조리';
  if (name.includes('_냉장')) return '냉장';
  if (name.includes('_냉동')) return '냉동';
  return null;
}

interface Props {
  monthPlans: HistoricalMealPlan[];
  formatDate: (d: string) => string;
  menuItems?: MenuItem[];
}

const HistoryIngredientView: React.FC<Props> = ({ monthPlans, formatDate }) => {
  const allTargets = useMemo(() => {
    const set = new Set<string>();
    for (const plan of monthPlans) {
      for (const t of plan.targets) set.add(t.targetType);
    }
    return TARGET_ORDER.filter(t => set.has(t));
  }, [monthPlans]);

  if (monthPlans.length === 0) return null;

  return (
    <div className="flex-1 overflow-auto border border-stone-200 rounded-xl">
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 z-20">
          <tr className="bg-stone-50">
            <th className="sticky left-0 z-30 bg-stone-50 px-2 py-2.5 text-center font-semibold text-stone-500 border-b border-r border-stone-200 w-8">
              #
            </th>
            <th className="sticky left-8 z-30 bg-stone-50 px-3 py-2.5 text-left font-semibold text-stone-500 border-b border-r border-stone-200 min-w-[80px]">
              날짜
            </th>
            <th className="sticky left-[112px] z-30 bg-stone-50 px-2 py-2.5 text-center font-semibold text-stone-500 border-b border-r border-stone-200 min-w-[48px]">
              주기
            </th>
            {allTargets.map(t => {
              const config = TARGET_CONFIGS[t];
              return (
                <th
                  key={t}
                  className="px-2 py-2 text-center font-semibold border-b border-r border-stone-200 min-w-[150px]"
                >
                  <div className="font-bold text-stone-700 text-[11px]">{TARGET_LABELS[t] || t}</div>
                  {config && (
                    <div className="text-[9px] text-stone-400 font-normal mt-0.5 tabular-nums">
                      판매 {config.targetPrice.toLocaleString()}원
                    </div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {monthPlans.map((plan, rowIdx) => {
            const targetMap = new Map(plan.targets.map(t => [t.targetType, t]));
            return (
              <tr key={`${plan.date}-${plan.cycleType}`} className="border-b border-stone-100 hover:bg-stone-50/30">
                <td className="sticky left-0 z-10 bg-white px-2 py-2 border-r border-stone-200 text-center text-xs text-stone-400 font-medium align-top">
                  {rowIdx + 1}
                </td>
                <td className="sticky left-8 z-10 bg-white px-3 py-2 border-r border-stone-200 font-medium text-stone-700 whitespace-nowrap align-top">
                  {formatDate(plan.date)}
                </td>
                <td className="sticky left-[112px] z-10 bg-white px-2 py-2 border-r border-stone-200 text-center align-top">
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600">
                    {plan.cycleType}
                  </span>
                </td>
                {allTargets.map(t => {
                  const target = targetMap.get(t);
                  if (!target)
                    return (
                      <td key={t} className="px-2 py-2 border-r border-stone-100 text-center text-stone-300 align-top">
                        —
                      </td>
                    );
                  const config = TARGET_CONFIGS[t];
                  const costRatio = target.totalPrice > 0 ? (target.totalCost / target.totalPrice) * 100 : 0;
                  const discount = target.totalPrice - (config?.targetPrice || 0);
                  const discountRate = target.totalPrice > 0 ? (discount / target.totalPrice) * 100 : 0;

                  return (
                    <td key={t} className="px-2 py-1.5 border-r border-stone-100 align-top">
                      {/* 메뉴 아이템 */}
                      <div className="space-y-0.5">
                        {target.items
                          .filter(i => i.name && i.name.trim())
                          .map((item, idx) => {
                            const proc = detectItemProcess(item.name);
                            return (
                              <div key={idx} className="flex items-center gap-1 text-[11px] leading-tight">
                                <span className="text-stone-700 truncate flex-1">{normalizeMenuName(item.name)}</span>
                                {proc && (
                                  <span
                                    className={`shrink-0 text-[8px] px-1 py-0 rounded font-bold ${
                                      proc === '냉장'
                                        ? 'bg-cyan-100 text-cyan-600'
                                        : proc === '반조리'
                                          ? 'bg-rose-100 text-rose-600'
                                          : 'bg-indigo-100 text-indigo-600'
                                    }`}
                                  >
                                    {proc}
                                  </span>
                                )}
                                <span className="text-blue-600 font-medium shrink-0 tabular-nums text-[10px]">
                                  {item.price > 0 ? item.price.toLocaleString() : '-'}
                                </span>
                                <span className="text-stone-400 shrink-0 tabular-nums text-[9px]">
                                  /{item.cost > 0 ? item.cost.toLocaleString() : '-'}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                      {/* 합계 */}
                      <div className="mt-1.5 pt-1.5 border-t border-stone-200 space-y-0.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-stone-400">합계</span>
                          <span className="font-bold text-stone-700 tabular-nums">
                            {target.totalPrice.toLocaleString()}원
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-stone-400">원가</span>
                          <span className="text-stone-500 tabular-nums">
                            {target.totalCost.toLocaleString()} ({costRatio.toFixed(0)}%)
                          </span>
                        </div>
                        {config && discount > 0 && (
                          <div className="flex justify-between text-[10px]">
                            <span className="text-red-400">할인</span>
                            <span className="font-bold text-red-500 tabular-nums">
                              -{discount.toLocaleString()} ({discountRate.toFixed(0)}%)
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default HistoryIngredientView;
