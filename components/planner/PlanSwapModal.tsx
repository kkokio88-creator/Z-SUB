import React from 'react';
import {
  TargetType,
  MenuItem,
  MenuCategory,
  MonthlyMealPlan,
  DuplicationFilterLevel,
  MealPlanConfig,
} from '../../types';
import { X, AlertTriangle, Search, Filter } from 'lucide-react';
import { MEAL_PLAN_INTEGRATION_GROUPS } from '../../constants';
import { normalizeMenuName } from '../../services/menuUtils';
import { getDeliveryDate, calcDaysGap } from './plannerConstants';
import { Button } from '@/components/ui/button';

interface PlanSwapModalProps {
  target: TargetType;
  plans: { A: MonthlyMealPlan | null; B: MonthlyMealPlan | null };
  parentItemCount: number | null;
  selectedYear: number;
  selectedMonth: number;
  swapTarget: { cycle: 'A' | 'B'; weekIndex: number; item: MenuItem };
  swapCandidates: MenuItem[];
  swapFilterLevel: DuplicationFilterLevel;
  swapSearchQuery: string;
  setSwapSearchQuery: (v: string) => void;
  swapCycleFilter: 'all' | 'same' | 'other';
  setSwapCycleFilter: (v: 'all' | 'same' | 'other') => void;
  otherCycleMenuNames: { A: Set<string>; B: Set<string> };
  nextMonthMenuNames: Set<string>;
  allMenuLastUsed: Map<string, string>;
  onFilterChange: (level: DuplicationFilterLevel) => void;
  onSwap: (item: MenuItem) => void;
  onClose: () => void;
}

const PlanSwapModal: React.FC<PlanSwapModalProps> = ({
  target,
  plans,
  parentItemCount,
  selectedYear,
  selectedMonth,
  swapTarget,
  swapCandidates,
  swapFilterLevel,
  swapSearchQuery,
  setSwapSearchQuery,
  swapCycleFilter,
  setSwapCycleFilter,
  otherCycleMenuNames,
  nextMonthMenuNames,
  allMenuLastUsed,
  onFilterChange,
  onSwap,
  onClose,
}) => {
  const otherCycleNames = swapTarget.cycle === 'A' ? otherCycleMenuNames.B : otherCycleMenuNames.A;
  const cycleFiltered =
    swapCycleFilter === 'all'
      ? swapCandidates
      : swapCycleFilter === 'other'
        ? swapCandidates.filter(c => !otherCycleNames.has(normalizeMenuName(c.name)))
        : swapCandidates;
  const filteredCandidates = swapSearchQuery
    ? cycleFiltered.filter(c => c.name.includes(swapSearchQuery) || c.mainIngredient.includes(swapSearchQuery))
    : cycleFiltered;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
        <div className="p-5 border-b border-stone-100">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg text-stone-800">
                {swapTarget.item.category === MenuCategory.SOUP
                  ? '🍲 국/찌개'
                  : swapTarget.item.category === MenuCategory.MAIN
                    ? '🍖 메인요리'
                    : '🥗 밑반찬'}{' '}
                교체하기 ({swapTarget.cycle === 'A' ? '화수목' : '금토월'})
              </h3>
              <p className="text-xs text-stone-500">
                현재 메뉴: <span className="font-bold text-blue-600">{swapTarget.item.name}</span>
                <span className="ml-2 text-stone-400">({filteredCandidates.length}개 사용 가능)</span>
              </p>
              {(() => {
                const group = MEAL_PLAN_INTEGRATION_GROUPS.find(
                  g => g.baseTarget === target || g.plusTarget === target
                );
                if (!group || !group.plusExtraCount) return null;
                const plan = plans[swapTarget.cycle];
                const week = plan?.weeks.find(w => w.weekIndex === swapTarget.weekIndex);
                const extraCount = week && parentItemCount !== null ? week.items.length - parentItemCount : 0;
                return (
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded border border-amber-200">
                      든든 옵션 {extraCount}/{group.plusExtraCount}
                    </span>
                    {parentItemCount !== null && week && week.items.indexOf(swapTarget.item) >= parentItemCount && (
                      <span className="text-[10px] text-amber-600">← 이 슬롯은 든든 전용</span>
                    )}
                  </div>
                );
              })()}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="p-2 rounded-full">
              <X className="w-5 h-5 text-stone-600" />
            </Button>
          </div>

          <div className="flex flex-col gap-2 mt-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5">
                {(['60일', '30일', '전체'] as DuplicationFilterLevel[]).map(level => (
                  <button
                    key={level}
                    onClick={() => onFilterChange(level)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      swapFilterLevel === level
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    <Filter className="w-3 h-3 inline mr-1" />
                    {level}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 bg-blue-50 rounded-lg p-0.5">
                {[
                  { key: 'all' as const, label: '전체' },
                  { key: 'other' as const, label: swapTarget.cycle === 'A' ? '금토월 제외' : '화수목 제외' },
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setSwapCycleFilter(opt.key)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                      swapCycleFilter === opt.key
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-blue-400 hover:text-blue-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={swapSearchQuery}
                onChange={e => setSwapSearchQuery(e.target.value)}
                placeholder="메뉴 검색..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-stone-200 rounded-lg focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
              />
            </div>
          </div>
        </div>

        <div className="p-2 overflow-y-auto flex-1 bg-stone-50">
          {filteredCandidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-stone-400">
              <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
              <p>조건에 맞는 교체 가능한 메뉴가 없습니다.</p>
              {swapFilterLevel !== '전체' && (
                <button onClick={() => onFilterChange('전체')} className="mt-2 text-xs text-blue-500 hover:underline">
                  전체 메뉴 보기
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {[...filteredCandidates]
                .sort((a, b) => {
                  const cutoffDate = new Date();
                  cutoffDate.setMonth(cutoffDate.getMonth() - 3);
                  const recentCutoff = cutoffDate.toISOString().slice(0, 7);
                  const aIsNew = !!(a.launchDate && a.launchDate >= recentCutoff);
                  const bIsNew = !!(b.launchDate && b.launchDate >= recentCutoff);
                  if (aIsNew !== bIsNew) return aIsNew ? -1 : 1;
                  return b.recommendedPrice - a.recommendedPrice;
                })
                .map(candidate => {
                  const priceDiff = candidate.recommendedPrice - swapTarget.item.recommendedPrice;
                  const cleanCandidate = normalizeMenuName(candidate.name);
                  const isNextMonthDup = nextMonthMenuNames.has(cleanCandidate);
                  const lastUsed = allMenuLastUsed.get(cleanCandidate);
                  const swapDeliveryDate = getDeliveryDate(selectedYear, selectedMonth, swapTarget.weekIndex);
                  const swapGapInfo = lastUsed ? calcDaysGap(lastUsed, swapDeliveryDate) : null;
                  const daysAgo = swapGapInfo?.days ?? null;
                  const isNewProduct = (() => {
                    if (!candidate.launchDate) return false;
                    const cutoff = new Date();
                    cutoff.setMonth(cutoff.getMonth() - 3);
                    return candidate.launchDate >= cutoff.toISOString().slice(0, 7);
                  })();

                  return (
                    <Button
                      key={candidate.id}
                      variant="outline"
                      onClick={() => onSwap(candidate)}
                      className={`w-full bg-white p-4 rounded-xl border shadow-sm hover:border-blue-400 hover:shadow-md hover:ring-1 hover:ring-blue-400 transition-all text-left flex items-center justify-between group h-auto ${
                        isNextMonthDup ? 'border-orange-300 bg-orange-50/30' : 'border-stone-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${candidate.category === MenuCategory.SOUP ? 'bg-blue-100' : candidate.category === MenuCategory.MAIN ? 'bg-orange-100' : 'bg-green-100'}`}
                        >
                          {candidate.category === MenuCategory.SOUP
                            ? '🍲'
                            : candidate.category === MenuCategory.MAIN
                              ? '🍖'
                              : '🥗'}
                        </div>
                        <div>
                          <div className="font-bold text-stone-800 flex items-center gap-1.5">
                            {candidate.name}
                            {isNewProduct && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-bold">
                                신제품
                              </span>
                            )}
                            {isNextMonthDup && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded font-medium">
                                다음달 겹침
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-stone-500 flex gap-1 mt-0.5 flex-wrap">
                            <span className="bg-stone-100 px-1.5 py-0.5 rounded">{candidate.mainIngredient}</span>
                            {candidate.isSpicy && (
                              <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded">🌶️</span>
                            )}
                            {daysAgo !== null && (
                              <span
                                className={`px-1.5 py-0.5 rounded ${daysAgo < 30 ? 'bg-red-50 text-red-500' : daysAgo < 60 ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}
                                title={swapGapInfo ? `마지막 사용: ${swapGapInfo.dateStr}` : undefined}
                              >
                                {daysAgo}일 전
                              </span>
                            )}
                            {candidate.tags.slice(0, 2).map(t => (
                              <span key={t} className="bg-stone-100 px-1.5 py-0.5 rounded">
                                #{t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-stone-400">{candidate.cost.toLocaleString()}원</div>
                        <div className="font-bold text-stone-900">{candidate.recommendedPrice.toLocaleString()}원</div>
                        <div
                          className={`text-xs font-medium ${priceDiff > 0 ? 'text-green-600' : priceDiff < 0 ? 'text-red-500' : 'text-stone-400'}`}
                        >
                          {priceDiff > 0 ? `+${priceDiff.toLocaleString()}` : priceDiff.toLocaleString()}원
                        </div>
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

interface DdeonddeonPromptProps {
  prompt: { cycle: 'A' | 'B'; weekIndex: number; item: MenuItem };
  integrationGroupLabel: string;
  isSelected: boolean;
  onMarkDdeonddeon: () => void;
  onSwapFromPrompt: () => void;
  onClose: () => void;
}

export const DdeonddeonPrompt: React.FC<DdeonddeonPromptProps> = ({
  prompt,
  integrationGroupLabel,
  isSelected,
  onMarkDdeonddeon,
  onSwapFromPrompt,
  onClose,
}) => (
  <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-in fade-in duration-150">
    <div className="bg-white rounded-xl shadow-xl w-72 overflow-hidden" onClick={e => e.stopPropagation()}>
      <div className="px-4 py-3 border-b border-stone-100">
        <p className="text-sm font-bold text-stone-800 truncate">{prompt.item.name}</p>
        <p className="text-[11px] text-stone-400">
          {integrationGroupLabel} 식단 - {prompt.cycle === 'A' ? '화수목' : '금토월'} {prompt.weekIndex}주차
        </p>
      </div>
      <div className="p-2 space-y-1">
        <button
          onClick={onMarkDdeonddeon}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-indigo-50 text-left transition-colors"
        >
          <span className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
            든
          </span>
          <div>
            <div className="text-sm font-medium text-stone-800">
              {isSelected ? '든든 선정 해제' : '든든 옵션으로 선정'}
            </div>
            <div className="text-[11px] text-stone-400">든든 전용 메뉴로 지정합니다</div>
          </div>
        </button>
        <button
          onClick={onSwapFromPrompt}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-orange-50 text-left transition-colors"
        >
          <span className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">
            ↺
          </span>
          <div>
            <div className="text-sm font-medium text-stone-800">다른 메뉴로 대체</div>
            <div className="text-[11px] text-stone-400">교체 가능한 메뉴 목록을 봅니다</div>
          </div>
        </button>
      </div>
      <div className="px-3 pb-2">
        <button onClick={onClose} className="w-full text-xs text-stone-400 hover:text-stone-600 py-1.5">
          닫기
        </button>
      </div>
    </div>
  </div>
);

export default PlanSwapModal;
