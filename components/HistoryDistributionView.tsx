import React, { useMemo } from 'react';
import type { HistoricalMealPlan } from '../types';
import { TargetType } from '../types';

const TARGET_LABELS: Record<string, string> = {
  [TargetType.VALUE]: '실속',
  [TargetType.SENIOR_HEALTH]: '건강시니어',
  [TargetType.SENIOR]: '시니어',
  [TargetType.YOUTH]: '청소연구소',
  [TargetType.YOUTH_MAIN]: '청소메인',
  [TargetType.FAMILY_PLUS]: '든든가족',
  [TargetType.FAMILY]: '가족',
  [TargetType.KIDS_PLUS]: '든든아이',
  [TargetType.KIDS]: '아이',
  [TargetType.SIDE_ONLY]: '골고루반찬',
  [TargetType.FIRST_MEET]: '첫만남',
  [TargetType.TODDLER_PLUS]: '든든유아',
  [TargetType.TODDLER]: '유아',
  [TargetType.CHILD_PLUS]: '든든어린이',
  [TargetType.CHILD]: '어린이',
};

const TARGET_ORDER = Object.values(TargetType);

interface Props {
  monthPlans: HistoricalMealPlan[];
  formatDate: (d: string) => string;
}

const HistoryDistributionView: React.FC<Props> = ({ monthPlans, formatDate }) => {
  const allTargets = useMemo(() => {
    const set = new Set<string>();
    for (const plan of monthPlans) {
      for (const t of plan.targets) set.add(t.targetType);
    }
    return TARGET_ORDER.filter(t => set.has(t));
  }, [monthPlans]);

  if (monthPlans.length === 0) return null;

  return (
    <div className="flex-1 overflow-auto space-y-6 print:space-y-2">
      {monthPlans.map(plan => {
        const targetMap = new Map(plan.targets.map(t => [t.targetType, t]));
        const maxItems = Math.max(...plan.targets.map(t => t.items.filter(i => i.name && i.name.trim()).length), 0);

        return (
          <div
            key={`${plan.date}-${plan.cycleType}`}
            className="bg-white border border-stone-300 rounded-lg overflow-hidden print:break-inside-avoid print:rounded-none print:border-black"
          >
            {/* 헤더 */}
            <div className="bg-stone-800 text-white px-5 py-3 flex items-center justify-between print:bg-black">
              <div className="flex items-center gap-3">
                <span className="font-bold text-base">{formatDate(plan.date)}</span>
                <span className="text-sm bg-white/20 px-2.5 py-0.5 rounded">{plan.cycleType}</span>
              </div>
              <span className="text-sm font-medium">{plan.targets.length}개 식단</span>
            </div>

            {/* 타겟별 메뉴 테이블 */}
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-stone-100 print:bg-stone-200">
                  <th className="px-2 py-2 text-center text-xs font-bold text-stone-400 border-b border-r border-stone-200 w-8">
                    #
                  </th>
                  {allTargets.map(t => {
                    const target = targetMap.get(t);
                    return (
                      <th
                        key={t}
                        className={`px-2 py-2 text-center text-xs font-bold border-b border-r border-stone-200 ${target ? 'text-stone-700' : 'text-stone-300'}`}
                      >
                        {TARGET_LABELS[t] || t}
                        {target && (
                          <span className="block text-[9px] text-stone-400 font-normal">{target.itemCount}품</span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: maxItems }, (_, rowIdx) => (
                  <tr key={rowIdx} className="border-b border-stone-100 print:border-stone-300">
                    <td className="px-2 py-1.5 text-center text-xs text-stone-400 border-r border-stone-200 font-medium">
                      {rowIdx + 1}
                    </td>
                    {allTargets.map(t => {
                      const target = targetMap.get(t);
                      if (!target)
                        return (
                          <td key={t} className="px-2 py-1.5 text-center border-r border-stone-100 text-stone-200">
                            —
                          </td>
                        );
                      const validItems = target.items.filter(i => i.name && i.name.trim());
                      const item = validItems[rowIdx];
                      return (
                        <td key={t} className="px-2 py-1.5 text-center border-r border-stone-100 text-sm">
                          {item ? (
                            <span className="text-stone-800">
                              {item.name.replace(/_냉장|_반조리|_냉동/g, '').trim()}
                            </span>
                          ) : (
                            <span className="text-stone-200">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
};

export default HistoryDistributionView;
