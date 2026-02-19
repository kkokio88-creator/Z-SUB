import React from 'react';
import type { HistoricalMealPlan } from '../types';

const PROCESS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  '국/탕': { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  냉장국: { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200' },
  냉동국: { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
  밥류: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
  '무침/나물': { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200' },
  볶음: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
  조림: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  전류: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200' },
  '김치/절임': { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' },
  샐러드: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  기타: { bg: 'bg-gray-50', text: 'text-gray-800', border: 'border-gray-200' },
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

const HistoryDistributionView: React.FC<Props> = ({ monthPlans, productionSummary, formatDate }) => {
  if (monthPlans.length === 0) return null;

  return (
    <div className="flex-1 overflow-auto space-y-4 print:space-y-2">
      {monthPlans.map(plan => {
        const key = `${plan.date}-${plan.cycleType}`;
        const groups = productionSummary.get(key) || [];
        if (groups.length === 0) return null;

        const totalAll = groups.reduce((s, g) => s + g.totalQty, 0);

        return (
          <div
            key={key}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden print:break-inside-avoid print:rounded-none print:border-black"
          >
            <div className="bg-gray-800 text-white px-4 py-2.5 flex items-center justify-between print:bg-black">
              <span className="font-bold text-sm">{formatDate(plan.date)}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded">{plan.cycleType}</span>
                <span className="text-xs font-bold">합계 {totalAll}식</span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {groups.map(group => {
                const colors = PROCESS_STYLES[group.process] || PROCESS_STYLES['기타'];
                return (
                  <div key={group.process} className="flex">
                    <div
                      className={`w-24 shrink-0 ${colors.bg} ${colors.text} px-3 py-2 text-xs font-bold flex items-center border-r ${colors.border} print:w-20`}
                    >
                      {group.process}
                    </div>
                    <div className="flex-1 px-3 py-1.5">
                      {group.items.map(item => (
                        <div key={item.name} className="flex items-center justify-between py-0.5 text-sm">
                          <span className="text-gray-800">{item.name}</span>
                          <span className="font-bold text-gray-900 tabular-nums">{item.qty}식</span>
                        </div>
                      ))}
                    </div>
                    <div
                      className={`w-16 shrink-0 ${colors.bg} flex items-center justify-center border-l ${colors.border} print:w-14`}
                    >
                      <span className={`text-xs font-bold ${colors.text}`}>{group.totalQty}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HistoryDistributionView;
