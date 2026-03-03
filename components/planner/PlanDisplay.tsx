import React from 'react';
import { TargetType, MonthlyMealPlan, MenuItem, MenuCategory, MealPlanConfig } from '../../types';
import { Flame, Layers } from 'lucide-react';
import { MAJOR_INGREDIENTS, TARGET_CONFIGS } from '../../constants';
import { normalizeMenuName } from '../../services/menuUtils';
import { PLANNER_INGREDIENT_COLORS, DEFAULT_INGREDIENT_COLOR, getDeliveryDate, calcDaysGap } from './plannerConstants';

interface PlanDisplayProps {
  plans: { A: MonthlyMealPlan | null; B: MonthlyMealPlan | null };
  target: TargetType;
  selectedYear: number;
  selectedMonth: number;
  monthLabel: string;
  highlightedIngredient: string | null;
  setHighlightedIngredient: (v: string | null) => void;
  crossDayDuplicates: Set<string>;
  allMenuLastUsed: Map<string, string>;
  ddeonddeonItems: Set<string>;
  ddeonddeonCounts: Record<string, { selected: number; required: number }> | null;
  parentConfig: MealPlanConfig | null;
  currentConfig: MealPlanConfig;
  parentItemCount: number | null;
  ingredientCountsByWeek: Record<string, Record<string, { count: number; names: string[] }>> | null;
  onMenuItemClick: (cycle: 'A' | 'B', weekIndex: number, item: MenuItem) => void;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const fmtDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()} ${DAY_NAMES[d.getDay()]}`;

const CycleRow: React.FC<{
  cycleLabel: string;
  plan: MonthlyMealPlan;
  cycleKey: 'A' | 'B';
  target: TargetType;
  selectedYear: number;
  selectedMonth: number;
  monthLabel: string;
  highlightedIngredient: string | null;
  crossDayDuplicates: Set<string>;
  allMenuLastUsed: Map<string, string>;
  ddeonddeonItems: Set<string>;
  ddeonddeonCounts: Record<string, { selected: number; required: number }> | null;
  parentConfig: MealPlanConfig | null;
  currentConfig: MealPlanConfig;
  parentItemCount: number | null;
  onMenuItemClick: (cycle: 'A' | 'B', weekIndex: number, item: MenuItem) => void;
}> = ({
  cycleLabel,
  plan,
  cycleKey,
  target,
  selectedYear,
  selectedMonth,
  monthLabel,
  highlightedIngredient,
  crossDayDuplicates,
  allMenuLastUsed,
  ddeonddeonItems,
  ddeonddeonCounts,
  parentConfig,
  currentConfig,
  parentItemCount,
  onMenuItemClick,
}) => {
  const currentBudgetCap = TARGET_CONFIGS[target].budgetCap;
  const targetPrice = TARGET_CONFIGS[target].targetPrice;

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden mb-6">
      <div className="bg-stone-50 border-b border-stone-200 p-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded text-xs font-bold ${cycleKey === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}
          >
            {cycleLabel}
          </span>
          <span className="text-sm font-medium text-stone-500">{monthLabel} 식단표</span>
          {parentConfig && (
            <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              옵션 ({currentConfig.parentTarget} 기반)
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-stone-100 bg-white">
        <span className="text-[11px] font-medium text-stone-400">주재료:</span>
        {Object.entries(PLANNER_INGREDIENT_COLORS).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1">
            <span className={`text-[10px] font-bold ${val.text}`}>{val.label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-stone-100">
        {plan.weeks.map(week => {
          const costRatio = ((week.totalCost / targetPrice) * 100).toFixed(1);
          const isOverBudget = week.totalCost > currentBudgetCap;
          const isPriceCompliant = week.totalPrice > targetPrice;
          const priceDiff = week.totalPrice - targetPrice;
          const savingsPercent = week.totalPrice > 0 ? ((priceDiff / week.totalPrice) * 100).toFixed(1) : '0.0';
          const targetCostRatio = TARGET_CONFIGS[target].targetCostRatio;
          const isCostCompliant = targetCostRatio > 0 ? parseFloat(costRatio) <= targetCostRatio : true;
          const costDiff = week.totalCost - currentBudgetCap;

          const weekStart = getDeliveryDate(selectedYear, selectedMonth, week.weekIndex);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 4);

          return (
            <div key={week.weekIndex} className="p-3 flex flex-col group h-full">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-sm font-bold text-stone-800">{week.weekIndex}주차</span>
                  <span className="text-[10px] text-stone-400 ml-1">
                    ({fmtDate(weekStart)}~{fmtDate(weekEnd)})
                  </span>
                  {ddeonddeonCounts && ddeonddeonCounts[`${cycleKey}-${week.weekIndex}`] && (
                    <div className="text-[10px] text-indigo-600 mt-0.5">
                      든든 {ddeonddeonCounts[`${cycleKey}-${week.weekIndex}`].selected}/
                      {ddeonddeonCounts[`${cycleKey}-${week.weekIndex}`].required}개 선택
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className={`text-xs font-bold ${isOverBudget ? 'text-red-600' : 'text-stone-600'}`}>
                    {week.totalCost.toLocaleString()}원
                  </div>
                  <div className="text-[10px] text-stone-400">({costRatio}%)</div>
                </div>
              </div>

              <div
                className={`mb-3 p-2 rounded-lg border text-[11px] ${
                  isPriceCompliant ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex justify-between text-stone-500">
                  <span>식단 판매가</span>
                  <span className="font-medium">{targetPrice.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-stone-500 mt-0.5">
                  <span>단품 합산가</span>
                  <span className="font-medium">{week.totalPrice.toLocaleString()}원</span>
                </div>
                <div
                  className={`border-t mt-1.5 pt-1.5 flex justify-between font-bold ${
                    isPriceCompliant ? 'border-green-200 text-green-700' : 'border-red-200 text-red-600'
                  }`}
                >
                  <span>{isPriceCompliant ? '✓ 가격 충족' : '✗ 가격 미달'}</span>
                  <span>
                    {isPriceCompliant ? '-' : '+'}
                    {Math.abs(priceDiff).toLocaleString()}원
                    <span className="font-normal text-[10px] ml-0.5">({savingsPercent}%)</span>
                  </span>
                </div>
              </div>

              <div
                className={`mb-3 p-2 rounded-lg border text-[11px] ${
                  isCostCompliant ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex justify-between text-stone-500">
                  <span>목표 원가</span>
                  <span className="font-medium">
                    {currentBudgetCap.toLocaleString()}원 ({targetCostRatio}%)
                  </span>
                </div>
                <div className="flex justify-between text-stone-500 mt-0.5">
                  <span>실제 원가</span>
                  <span className="font-medium">
                    {week.totalCost.toLocaleString()}원 ({costRatio}%)
                  </span>
                </div>
                <div
                  className={`border-t mt-1.5 pt-1.5 flex justify-between font-bold ${
                    isCostCompliant ? 'border-green-200 text-green-700' : 'border-red-200 text-red-600'
                  }`}
                >
                  <span>{isCostCompliant ? '✓ 원가 충족' : '✗ 원가 초과'}</span>
                  <span>
                    {costDiff > 0 ? '+' : '-'}
                    {Math.abs(costDiff).toLocaleString()}원
                  </span>
                </div>
              </div>

              <div className="space-y-1 flex-1">
                {week.items.map((item, itemIdx) => {
                  const isExtra = parentItemCount !== null && itemIdx >= parentItemCount;
                  const ingColor = PLANNER_INGREDIENT_COLORS[item.mainIngredient] || DEFAULT_INGREDIENT_COLOR;
                  const cleanName = normalizeMenuName(item.name);
                  const isCrossDup = crossDayDuplicates.has(cleanName);
                  const isFallback = week.fallbackItems?.includes(cleanName);
                  const isHighlighted = highlightedIngredient === item.mainIngredient;
                  const isDimmed = highlightedIngredient !== null && !isHighlighted;
                  const lastUsed = allMenuLastUsed.get(cleanName);
                  const deliveryDate = getDeliveryDate(selectedYear, selectedMonth, week.weekIndex);
                  const gapInfo = lastUsed ? calcDaysGap(lastUsed, deliveryDate) : null;
                  const lastUsedLabel = gapInfo ? `${gapInfo.label} 전` : null;

                  return (
                    <div key={item.id}>
                      <div
                        onClick={() => onMenuItemClick(cycleKey, week.weekIndex, item)}
                        title={
                          [
                            `배송일: ${deliveryDate.toISOString().slice(0, 10)}`,
                            gapInfo ? `마지막 사용: ${gapInfo.dateStr} (${gapInfo.days}일 전)` : '사용 이력 없음',
                            `원가: ${item.cost.toLocaleString()}원 / 판매가: ${item.recommendedPrice.toLocaleString()}원`,
                            `주재료: ${PLANNER_INGREDIENT_COLORS[item.mainIngredient]?.label || item.mainIngredient}`,
                            item.tags.length > 0 ? `태그: ${item.tags.join(', ')}` : '',
                            isCrossDup ? '⚠ 다른 주기에도 사용됨' : '',
                            isFallback ? '⚠ 2차 필터(30일)로 선택됨' : '',
                          ]
                            .filter(Boolean)
                            .join('\n') || undefined
                        }
                        className={`flex items-center gap-2 text-xs p-2 rounded cursor-pointer transition-all ${
                          isHighlighted
                            ? `bg-stone-100 ring-2 ring-offset-1 ring-stone-300 shadow-md scale-[1.02]`
                            : isDimmed
                              ? 'bg-stone-50/50 opacity-40'
                              : 'bg-white'
                        } hover:ring-1 hover:ring-stone-300 ${
                          isExtra ? 'border border-amber-300' : ''
                        } ${isCrossDup ? 'ring-1 ring-orange-400' : ''} ${
                          isFallback ? 'border-r-2 border-r-yellow-400' : ''
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            item.category === MenuCategory.SOUP
                              ? 'bg-blue-500'
                              : item.category === MenuCategory.MAIN
                                ? 'bg-orange-500'
                                : 'bg-green-500'
                          }`}
                        ></span>
                        <span className={`font-medium truncate flex-1 ${ingColor.text}`}>
                          {item.name}
                          {lastUsedLabel && (
                            <span
                              className="ml-1 text-[10px] text-stone-400 font-normal"
                              title={gapInfo ? `마지막 사용: ${gapInfo.dateStr}` : undefined}
                            >
                              ({lastUsedLabel})
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-stone-400">{item.cost.toLocaleString()}</span>
                          <span className="text-[10px] text-stone-300">/</span>
                          <span className="text-[10px] text-stone-500 font-medium">
                            {item.recommendedPrice.toLocaleString()}
                          </span>
                        </div>
                        {isFallback && (
                          <span className="px-1 py-0.5 text-[9px] font-bold text-yellow-700 bg-yellow-100 rounded border border-yellow-300 flex-shrink-0">
                            2차
                          </span>
                        )}
                        {isExtra && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 rounded border border-amber-200 flex-shrink-0">
                            추가
                          </span>
                        )}
                        {item.isSpicy && <Flame className="w-3 h-3 text-red-400" />}
                        {item.name.includes('_냉장') && (
                          <span
                            className="px-1 py-0.5 text-[8px] font-bold text-sky-600 bg-sky-50 rounded border border-sky-200 flex-shrink-0"
                            title="냉장국 (생산 한도 적용)"
                          >
                            냉
                          </span>
                        )}
                        {item.name.includes('_반조리') && (
                          <span
                            className="px-1 py-0.5 text-[8px] font-bold text-violet-600 bg-violet-50 rounded border border-violet-200 flex-shrink-0"
                            title="반조리 (생산 한도 적용)"
                          >
                            반
                          </span>
                        )}
                        {ddeonddeonItems.has(`${cycleKey}-${week.weekIndex}-${item.id}`) && (
                          <span className="px-1 py-0.5 text-[8px] font-bold text-indigo-600 bg-indigo-50 rounded border border-indigo-200 flex-shrink-0">
                            든든
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PlanDisplay: React.FC<PlanDisplayProps> = ({
  plans,
  target,
  selectedYear,
  selectedMonth,
  monthLabel,
  highlightedIngredient,
  setHighlightedIngredient,
  crossDayDuplicates,
  allMenuLastUsed,
  ddeonddeonItems,
  ddeonddeonCounts,
  parentConfig,
  currentConfig,
  parentItemCount,
  ingredientCountsByWeek,
  onMenuItemClick,
}) => {
  if (!plans.A) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-stone-200 border-dashed p-10 text-center">
        <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mb-6">
          <Layers className="w-10 h-10 text-stone-400" />
        </div>
        <h3 className="text-xl font-bold text-stone-800 mb-2">통합 식단 생성 (이중 주기)</h3>
        <p className="text-stone-500 max-w-md">
          화수목 및 금토월 식단을 동시에 생성하고,
          <br />두 식단 간의 식재료 중복을 체크하여 다양성을 확보합니다.
        </p>
      </div>
    );
  }

  const sharedCycleProps = {
    target,
    selectedYear,
    selectedMonth,
    monthLabel,
    highlightedIngredient,
    crossDayDuplicates,
    allMenuLastUsed,
    ddeonddeonItems,
    ddeonddeonCounts,
    parentConfig,
    currentConfig,
    parentItemCount,
    onMenuItemClick,
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-6">
        <div className="bg-white rounded-xl border border-stone-200 p-3 shadow-sm mb-4 sticky top-0 z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-stone-500 mr-1">주재료 필터:</span>
            {MAJOR_INGREDIENTS.filter(ing => ing.key !== 'vegetable').map(ing => {
              const isActive = highlightedIngredient === ing.key;
              const color = PLANNER_INGREDIENT_COLORS[ing.key] || DEFAULT_INGREDIENT_COLOR;
              const total = ingredientCountsByWeek?.['total']?.[ing.key]?.count || 0;
              return (
                <button
                  key={ing.key}
                  onClick={() => setHighlightedIngredient(isActive ? null : ing.key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? `bg-stone-100 ${color.text} ring-2 ring-offset-1 ring-stone-300 shadow-sm font-bold`
                      : 'bg-stone-50 text-stone-500 hover:bg-stone-100'
                  }`}
                >
                  {ing.label}
                  {total > 0 && (
                    <span className={`text-[10px] ${isActive ? 'opacity-80' : 'opacity-50'}`}>({total})</span>
                  )}
                </button>
              );
            })}
            {highlightedIngredient && (
              <button
                onClick={() => setHighlightedIngredient(null)}
                className="text-xs text-red-400 hover:text-red-600 font-medium ml-1 px-2 py-1 rounded hover:bg-red-50"
              >
                ✕ 해제
              </button>
            )}
          </div>
        </div>

        {plans.A && <CycleRow cycleLabel="화수목" plan={plans.A} cycleKey="A" {...sharedCycleProps} />}
        {plans.B && <CycleRow cycleLabel="금토월" plan={plans.B} cycleKey="B" {...sharedCycleProps} />}
      </div>
    </div>
  );
};

export default PlanDisplay;
