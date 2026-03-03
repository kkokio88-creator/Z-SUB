import React, { useState, useMemo, useCallback } from 'react';
import { TargetType, MonthlyMealPlan, MenuItem, MenuCategory } from '../types';
import { MAJOR_INGREDIENTS, TARGET_CONFIGS, MEAL_PLAN_INTEGRATION_GROUPS } from '../constants';
import { useMenu } from '../context/MenuContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useHistoricalPlans } from '../context/HistoricalPlansContext';
import { normalizeMenuName } from '../services/menuUtils';
import { usePlanGeneration } from '../hooks/usePlanGeneration';
import { usePlanState } from '../hooks/usePlanState';
import { GenerationPanel, PlanDisplay, PlanSwapModal, DdeonddeonPrompt } from './planner';

const MealPlanner: React.FC = () => {
  const { menuItems } = useMenu();
  const { addToast } = useToast();
  const { user } = useAuth();
  const { plans: historicalPlans } = useHistoricalPlans();

  const gen = usePlanGeneration({ menuItems, historicalPlans, addToast, user });
  const state = usePlanState({
    target: gen.target,
    monthLabel: gen.monthLabel,
    selectedYear: gen.selectedYear,
    selectedMonth: gen.selectedMonth,
    menuItems,
    historicalPlans,
    addToast,
    user,
  });

  // Ingredient highlight state
  const [highlightedIngredient, setHighlightedIngredient] = useState<string | null>(null);

  // 현재 타겟이 통합 식단인지 확인
  const integrationGroup = useMemo(() => {
    return MEAL_PLAN_INTEGRATION_GROUPS.find(g => g.baseTarget === gen.target || g.plusTarget === gen.target);
  }, [gen.target]);

  // US-021: 든든 선정 진행률 카운터
  const ddeonddeonCounts = useMemo(() => {
    if (!integrationGroup || !('plusExtraCount' in integrationGroup)) return null;
    const requiredCount = (integrationGroup as { plusExtraCount: number }).plusExtraCount;
    const counts: Record<string, { selected: number; required: number }> = {};
    (['A', 'B'] as const).forEach(cycle => {
      const plan = state.plans[cycle];
      if (!plan) return;
      plan.weeks.forEach(week => {
        const key = `${cycle}-${week.weekIndex}`;
        const selected = week.items.filter(item =>
          state.ddeonddeonItems.has(`${cycle}-${week.weekIndex}-${item.id}`)
        ).length;
        counts[key] = { selected, required: requiredCount };
      });
    });
    return counts;
  }, [integrationGroup, state.plans, state.ddeonddeonItems]);

  // 메뉴 클릭 시: 통합 식단이면 든든 프롬프트, 아니면 swap 모달
  const handleMenuItemClick = useCallback(
    (cycle: 'A' | 'B', weekIndex: number, item: MenuItem) => {
      if (integrationGroup) {
        state.setDdeonddeonPrompt({ cycle, weekIndex, item });
        return;
      }
      state.openSwapModal(cycle, weekIndex, item);
    },
    [integrationGroup, state]
  );

  // US-020: 든든 옵션 선정 핸들러
  const handleMarkDdeonddeon = useCallback(() => {
    if (!state.ddeonddeonPrompt) return;
    const key = `${state.ddeonddeonPrompt.cycle}-${state.ddeonddeonPrompt.weekIndex}-${state.ddeonddeonPrompt.item.id}`;
    state.setDdeonddeonItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
    state.setDdeonddeonPrompt(null);
  }, [state]);

  // US-020: 다른 메뉴로 대체 핸들러
  const handleSwapFromPrompt = useCallback(() => {
    if (!state.ddeonddeonPrompt) return;
    const { cycle, weekIndex, item } = state.ddeonddeonPrompt;
    state.openSwapModal(cycle, weekIndex, item);
    state.setDdeonddeonPrompt(null);
  }, [state]);

  // 채소를 제외한 주요 식재료 목록
  const trackedIngredients = useMemo(() => MAJOR_INGREDIENTS.filter(ing => ing.key !== 'vegetable'), []);

  // Per-week Ingredient Counts
  const ingredientCountsByWeek = useMemo(() => {
    if (!state.plans.A || !state.plans.B) return null;
    const result: Record<string, Record<string, { count: number; names: string[] }>> = {};
    const total: Record<string, { count: number; names: string[] }> = {};
    trackedIngredients.forEach(ing => (total[ing.key] = { count: 0, names: [] }));

    const processPlan = (plan: MonthlyMealPlan, label: string) => {
      plan.weeks.forEach(week => {
        const key = `${label}-${week.weekIndex}`;
        const counts: Record<string, { count: number; names: string[] }> = {};
        trackedIngredients.forEach(ing => (counts[ing.key] = { count: 0, names: [] }));
        week.items.forEach(item => {
          const ingKey = item.mainIngredient;
          if (counts[ingKey] !== undefined) {
            counts[ingKey].count++;
            counts[ingKey].names.push(item.name);
            total[ingKey].count++;
            total[ingKey].names.push(item.name);
          }
        });
        result[key] = counts;
      });
    };

    processPlan(state.plans.A, 'A');
    processPlan(state.plans.B, 'B');
    result['total'] = total;
    return result;
  }, [state.plans.A, state.plans.B, trackedIngredients]);

  // 크로스데이(A↔B) 겹침 메뉴 감지
  const crossDayDuplicates = useMemo(() => {
    if (!state.plans.A || !state.plans.B) return new Set<string>();
    const namesA = new Set(state.plans.A.weeks.flatMap(w => w.items.map(i => normalizeMenuName(i.name))));
    const namesB = new Set(state.plans.B.weeks.flatMap(w => w.items.map(i => normalizeMenuName(i.name))));
    const overlap = new Set<string>();
    namesA.forEach(n => {
      if (namesB.has(n)) overlap.add(n);
    });
    return overlap;
  }, [state.plans.A, state.plans.B]);

  const currentConfig = TARGET_CONFIGS[gen.target];
  const parentConfig = currentConfig?.parentTarget ? TARGET_CONFIGS[currentConfig.parentTarget] : null;
  const parentItemCount = parentConfig
    ? Object.values(parentConfig.composition).reduce((sum, n) => sum + (n || 0), 0)
    : null;

  // 든든아이 유효성 검사 포함 저장
  const handleSaveVersion = useCallback(() => {
    if (gen.target === TargetType.KIDS_PLUS || gen.target === TargetType.KIDS) {
      const kidsConfig = TARGET_CONFIGS[TargetType.KIDS_PLUS];
      if (kidsConfig && state.plans.A) {
        const hasAllWeeks = state.plans.A.weeks.every(w => {
          const mainCount = w.items.filter(i => i.category === MenuCategory.MAIN).length;
          return mainCount >= 3;
        });
        if (!hasAllWeeks) {
          addToast({
            type: 'warning',
            title: '든든아이 확인 필요',
            message: '든든아이 저녁 메뉴 3개가 각 주차에 포함되어 있는지 확인하세요.',
          });
        }
      }
    }
    state.handleSaveVersion();
  }, [gen.target, state, addToast]);

  const handleLoadSnapshot = useCallback(() => {
    const loadedTarget = state.handleLoadSnapshot();
    if (loadedTarget) gen.setTarget(loadedTarget);
  }, [state, gen]);

  return (
    <div className="flex flex-col h-full gap-6 relative">
      <GenerationPanel
        target={gen.target}
        setTarget={gen.setTarget}
        selectedYear={gen.selectedYear}
        setSelectedYear={gen.setSelectedYear}
        selectedMonth={gen.selectedMonth}
        setSelectedMonth={gen.setSelectedMonth}
        isGenerating={gen.isGenerating}
        hasPlans={!!state.plans.A}
        onGenerate={() => gen.handleGenerate(state.setPlans)}
        onLoadSnapshot={handleLoadSnapshot}
        onSaveVersion={handleSaveVersion}
      />

      <PlanDisplay
        plans={state.plans}
        target={gen.target}
        selectedYear={gen.selectedYear}
        selectedMonth={gen.selectedMonth}
        monthLabel={gen.monthLabel}
        highlightedIngredient={highlightedIngredient}
        setHighlightedIngredient={setHighlightedIngredient}
        crossDayDuplicates={crossDayDuplicates}
        allMenuLastUsed={state.allMenuLastUsed}
        ddeonddeonItems={state.ddeonddeonItems}
        ddeonddeonCounts={ddeonddeonCounts}
        parentConfig={parentConfig}
        currentConfig={currentConfig}
        parentItemCount={parentItemCount}
        ingredientCountsByWeek={ingredientCountsByWeek}
        onMenuItemClick={handleMenuItemClick}
      />

      {state.swapTarget && (
        <PlanSwapModal
          target={gen.target}
          plans={state.plans}
          parentItemCount={parentItemCount}
          selectedYear={gen.selectedYear}
          selectedMonth={gen.selectedMonth}
          swapTarget={state.swapTarget}
          swapCandidates={state.swapCandidates}
          swapFilterLevel={state.swapFilterLevel}
          swapSearchQuery={state.swapSearchQuery}
          setSwapSearchQuery={state.setSwapSearchQuery}
          swapCycleFilter={state.swapCycleFilter}
          setSwapCycleFilter={state.setSwapCycleFilter}
          otherCycleMenuNames={state.otherCycleMenuNames}
          nextMonthMenuNames={state.nextMonthMenuNames}
          allMenuLastUsed={state.allMenuLastUsed}
          onFilterChange={state.handleSwapFilterChange}
          onSwap={state.performSwap}
          onClose={() => state.setSwapTarget(null)}
        />
      )}

      {state.ddeonddeonPrompt && (
        <DdeonddeonPrompt
          prompt={state.ddeonddeonPrompt}
          integrationGroupLabel={integrationGroup?.groupLabel || '통합'}
          isSelected={state.ddeonddeonItems.has(
            `${state.ddeonddeonPrompt.cycle}-${state.ddeonddeonPrompt.weekIndex}-${state.ddeonddeonPrompt.item.id}`
          )}
          onMarkDdeonddeon={handleMarkDdeonddeon}
          onSwapFromPrompt={handleSwapFromPrompt}
          onClose={() => state.setDdeonddeonPrompt(null)}
        />
      )}
    </div>
  );
};

export default MealPlanner;
