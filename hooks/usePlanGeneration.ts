import { useState, useCallback } from 'react';
import type { TargetType, MonthlyMealPlan, MenuItem, HistoricalMealPlan } from '../types';
import { TARGET_CONFIGS } from '../constants';
import { generateMonthlyMealPlan } from '../services/engine';
import { addAuditEntry } from '../services/auditService';
import { normalizeMenuName } from '../services/menuUtils';
import type { ToastType } from '../context/ToastContext';

interface UsePlanGenerationParams {
  menuItems: MenuItem[];
  historicalPlans: HistoricalMealPlan[];
  addToast: (toast: { type: ToastType; title: string; message: string }) => void;
  user: { id?: string; displayName?: string } | null;
}

export function usePlanGeneration({ menuItems, historicalPlans, addToast, user }: UsePlanGenerationParams) {
  const [target, setTarget] = useState<TargetType>('아이 식단' as TargetType);
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const now = new Date();
    const nextMonth = now.getMonth() + 2;
    return nextMonth > 12 ? now.getFullYear() + 1 : now.getFullYear();
  });
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const now = new Date();
    const nextMonth = now.getMonth() + 2;
    return nextMonth > 12 ? 1 : nextMonth;
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const monthLabel = `${selectedYear}년 ${selectedMonth}월`;
  const checkDupes = true;

  const handleGenerate = useCallback(
    (setPlans: React.Dispatch<React.SetStateAction<{ A: MonthlyMealPlan | null; B: MonthlyMealPlan | null }>>) => {
      setIsGenerating(true);
      setPlans({ A: null, B: null });

      setTimeout(() => {
        try {
          const activeMenu = menuItems.filter(item => !item.isUnused);

          if (activeMenu.length === 0) {
            console.warn('[MealPlanner] activeMenu가 비어 있습니다. menuItems:', menuItems.length);
            addToast({
              type: 'warning',
              title: '식단 생성 실패',
              message: '활성 메뉴가 없습니다. 반찬 리스트를 확인해주세요.',
            });
            setIsGenerating(false);
            return;
          }

          const nameToIngredient = new Map<string, string>();
          activeMenu.forEach(item => {
            const clean = normalizeMenuName(item.name);
            if (clean && item.mainIngredient) nameToIngredient.set(clean, item.mainIngredient);
          });

          const monthPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
          const buildOtherTargetIngredients = (cycleType: '화수목' | '금토월'): Map<number, string[]> => {
            const map = new Map<number, string[]>();
            const monthPlans = historicalPlans
              .filter(p => p.date.startsWith(monthPrefix) && p.cycleType === cycleType)
              .sort((a, b) => a.date.localeCompare(b.date));

            monthPlans.forEach((plan, idx) => {
              const weekIndex = idx + 1;
              if (weekIndex > 4) return;
              const ingredients: string[] = [];
              plan.targets
                .filter(t => t.targetType !== target)
                .forEach(t => {
                  t.items.forEach(item => {
                    const clean = normalizeMenuName(item.name);
                    const ing = nameToIngredient.get(clean);
                    if (ing && ing !== 'vegetable') ingredients.push(ing);
                  });
                });
              if (ingredients.length > 0) {
                map.set(weekIndex, ingredients);
              }
            });
            return map;
          };
          const otherTargetA = buildOtherTargetIngredients('화수목');
          const otherTargetB = buildOtherTargetIngredients('금토월');

          const cutoff60 = new Date();
          cutoff60.setDate(cutoff60.getDate() - 60);
          const cutoff60Str = cutoff60.toISOString().slice(0, 10);
          const cutoff30 = new Date();
          cutoff30.setDate(cutoff30.getDate() - 30);
          const cutoff30Str = cutoff30.toISOString().slice(0, 10);

          const recentPlans60 = historicalPlans.filter(p => p.date >= cutoff60Str);
          const recentPlans30 = historicalPlans.filter(p => p.date >= cutoff30Str);

          const buildExcludedForCycle = (cycleType: '화수목' | '금토월', plans: typeof historicalPlans) => {
            const excluded = new Set<string>();
            const lastUsed = new Map<string, string>();
            plans
              .filter(p => p.cycleType === cycleType)
              .forEach(p =>
                p.targets.forEach(t =>
                  t.items.forEach(item => {
                    const clean = normalizeMenuName(item.name);
                    if (clean) {
                      excluded.add(clean);
                      const existing = lastUsed.get(clean);
                      if (!existing || p.date > existing) {
                        lastUsed.set(clean, p.date);
                      }
                    }
                  })
                )
              );
            return { excluded, lastUsed };
          };

          const ctxA60 = buildExcludedForCycle('화수목', recentPlans60);
          const ctxB60 = buildExcludedForCycle('금토월', recentPlans60);
          const ctxA30 = buildExcludedForCycle('화수목', recentPlans30);
          const ctxB30 = buildExcludedForCycle('금토월', recentPlans30);

          const planA = generateMonthlyMealPlan(
            target,
            monthLabel,
            '화수목',
            checkDupes,
            activeMenu,
            ctxA60.excluded,
            ctxA60.lastUsed,
            ctxA30.excluded,
            undefined,
            otherTargetA
          );

          const aIngredientsByWeek = new Map<number, string[]>();
          planA.weeks.forEach(w => {
            aIngredientsByWeek.set(
              w.weekIndex,
              w.items.map(i => i.mainIngredient).filter(ing => ing !== 'vegetable')
            );
          });

          const planB = generateMonthlyMealPlan(
            target,
            monthLabel,
            '금토월',
            checkDupes,
            activeMenu,
            ctxB60.excluded,
            ctxB60.lastUsed,
            ctxB30.excluded,
            aIngredientsByWeek,
            otherTargetB
          );

          const totalA = planA.weeks.reduce((s, w) => s + w.items.length, 0);
          const totalB = planB.weeks.reduce((s, w) => s + w.items.length, 0);
          if (totalA === 0 && totalB === 0) {
            const config = TARGET_CONFIGS[target];
            const eligible = activeMenu.filter(m => {
              if (config.bannedTags.length > 0 && m.tags.some(t => config.bannedTags.includes(t))) return false;
              if (
                (target === ('아이 식단' as TargetType) || target === ('든든한 아이 식단' as TargetType)) &&
                m.isSpicy
              )
                return false;
              if (config.requiredTags.length > 0 && !m.tags.some(t => config.requiredTags.includes(t))) return false;
              return true;
            });
            console.warn(
              `[MealPlanner] 식단 생성 결과 비어있음. target=${target}, activeMenu=${activeMenu.length}, eligible=${eligible.length}`
            );
            console.warn(
              `[MealPlanner] requiredTags=${JSON.stringify(config.requiredTags)}, bannedTags=${JSON.stringify(config.bannedTags)}`
            );
            if (eligible.length === 0) {
              addToast({
                type: 'warning',
                title: '식단 생성 실패',
                message: `"${target}" 식단에 적합한 메뉴가 없습니다. 반찬 리스트에서 태그(${config.requiredTags.join(', ')})를 확인해주세요.`,
              });
            }
          }

          setPlans({ A: planA, B: planB });
          setIsGenerating(false);
          addAuditEntry({
            action: 'plan.generate',
            userId: user?.id || '',
            userName: user?.displayName || '',
            entityType: 'meal_plan',
            entityId: planA.id,
            entityName: `${monthLabel} ${target}`,
          });
        } catch (err) {
          console.error('[MealPlanner] 식단 생성 오류:', err);
          addToast({ type: 'error', title: '식단 생성 오류', message: String(err) });
          setIsGenerating(false);
        }
      }, 800);
    },
    [menuItems, historicalPlans, addToast, user, target, selectedYear, selectedMonth, monthLabel, checkDupes]
  );

  return {
    target,
    setTarget,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    isGenerating,
    monthLabel,
    handleGenerate,
  };
}
