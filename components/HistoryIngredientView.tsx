import React, { useMemo } from 'react';
import type { HistoricalMealPlan } from '../types';

const PROCESS_ORDER = [
  '국/탕',
  '냉장국',
  '냉동국',
  '밥류',
  '무침/나물',
  '볶음',
  '조림',
  '전류',
  '김치/절임',
  '샐러드',
  '기타',
];

const PROCESS_COLORS: Record<string, string> = {
  '국/탕': 'bg-blue-50 text-blue-700',
  냉장국: 'bg-cyan-50 text-cyan-700',
  냉동국: 'bg-indigo-50 text-indigo-700',
  밥류: 'bg-purple-50 text-purple-700',
  '무침/나물': 'bg-green-50 text-green-700',
  볶음: 'bg-orange-50 text-orange-700',
  조림: 'bg-amber-50 text-amber-700',
  전류: 'bg-yellow-50 text-yellow-700',
  '김치/절임': 'bg-red-50 text-red-600',
  샐러드: 'bg-emerald-50 text-emerald-700',
  기타: 'bg-gray-50 text-gray-600',
};

interface ProcessGroup {
  process: string;
  items: { name: string; qty: number }[];
  totalQty: number;
}

interface Props {
  monthPlans: HistoricalMealPlan[];
  productionSummary: Map<string, ProcessGroup[]>;
  formatDate: (d: string) => string;
}

const HistoryIngredientView: React.FC<Props> = ({ monthPlans, productionSummary, formatDate }) => {
  const usedProcesses = useMemo(() => {
    const used = new Set<string>();
    for (const groups of productionSummary.values()) {
      for (const g of groups) used.add(g.process);
    }
    return PROCESS_ORDER.filter(p => used.has(p));
  }, [productionSummary]);

  if (monthPlans.length === 0) return null;

  return (
    <div className="flex-1 overflow-auto border border-gray-200 rounded-xl">
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 z-20">
          <tr className="bg-gray-50">
            <th className="sticky left-0 z-30 bg-gray-50 px-3 py-2.5 text-left font-semibold text-gray-500 border-b border-r border-gray-200 min-w-[90px]">
              날짜
            </th>
            <th className="px-2 py-2.5 text-center font-semibold text-gray-500 border-b border-r border-gray-200 min-w-[50px]">
              주기
            </th>
            {usedProcesses.map(p => (
              <th
                key={p}
                className="px-2 py-2.5 text-center font-semibold border-b border-r border-gray-200 min-w-[120px]"
              >
                <span
                  className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${PROCESS_COLORS[p] || PROCESS_COLORS['기타']}`}
                >
                  {p}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthPlans.map(plan => {
            const key = `${plan.date}-${plan.cycleType}`;
            const groups = productionSummary.get(key) || [];
            const processMap = new Map(groups.map(g => [g.process, g]));
            return (
              <tr key={key} className="border-b border-gray-100 hover:bg-gray-50/30">
                <td className="sticky left-0 z-10 bg-white px-3 py-2 border-r border-gray-200 font-medium text-gray-700 whitespace-nowrap align-top">
                  {formatDate(plan.date)}
                </td>
                <td className="px-2 py-2 border-r border-gray-200 text-center align-top">
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600">
                    {plan.cycleType}
                  </span>
                </td>
                {usedProcesses.map(p => {
                  const group = processMap.get(p);
                  if (!group)
                    return (
                      <td key={p} className="px-2 py-2 border-r border-gray-100 text-center text-gray-300 align-top">
                        —
                      </td>
                    );
                  return (
                    <td key={p} className="px-2 py-1.5 border-r border-gray-100 align-top">
                      <div className="space-y-0.5">
                        {group.items.map(item => (
                          <div
                            key={item.name}
                            className="flex items-center justify-between gap-1 text-[11px] leading-tight"
                          >
                            <span className="text-gray-700 truncate">{item.name}</span>
                            <span className="text-gray-900 font-bold shrink-0 tabular-nums">{item.qty}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-1 pt-1 border-t border-gray-100 text-[9px] text-gray-400 font-bold text-right">
                        소계 {group.totalQty}
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
