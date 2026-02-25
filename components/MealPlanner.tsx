import React, { useState, useMemo, useCallback } from 'react';
import { TargetType, MonthlyMealPlan, MenuItem, MenuCategory, DuplicationFilterLevel } from '../types';
import { generateMonthlyMealPlan, getSwapCandidates } from '../services/engine';
import { Sparkles, RefreshCw, X, AlertTriangle, Flame, Layers, History, Save, Search, Filter } from 'lucide-react';
import { MAJOR_INGREDIENTS, TARGET_CONFIGS, MEAL_PLAN_INTEGRATION_GROUPS } from '../constants';
import { useMenu } from '../context/MenuContext';
import { useToast } from '../context/ToastContext';
import { addAuditEntry } from '../services/auditService';
import { useAuth } from '../context/AuthContext';
import { saveTempSnapshot, loadSnapshot } from '../services/historyService';
import { useHistoricalPlans } from '../context/HistoricalPlansContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ── 식재료별 컬러 맵 ──
const PLANNER_INGREDIENT_COLORS: Record<
  string,
  { bg: string; borderL: string; text: string; dot: string; label: string }
> = {
  beef: { bg: 'bg-red-50', borderL: 'border-l-red-400', text: 'text-red-700', dot: 'bg-red-400', label: '소고기' },
  pork: { bg: 'bg-pink-50', borderL: 'border-l-pink-400', text: 'text-pink-700', dot: 'bg-pink-400', label: '한돈' },
  chicken: {
    bg: 'bg-amber-50',
    borderL: 'border-l-amber-400',
    text: 'text-amber-700',
    dot: 'bg-amber-400',
    label: '닭',
  },
  fish: { bg: 'bg-blue-50', borderL: 'border-l-blue-400', text: 'text-blue-700', dot: 'bg-blue-400', label: '생선' },
  tofu: {
    bg: 'bg-yellow-50',
    borderL: 'border-l-yellow-400',
    text: 'text-yellow-700',
    dot: 'bg-yellow-400',
    label: '두부',
  },
  egg: {
    bg: 'bg-orange-50',
    borderL: 'border-l-orange-400',
    text: 'text-orange-700',
    dot: 'bg-orange-400',
    label: '달걀',
  },
  vegetable: {
    bg: 'bg-green-50',
    borderL: 'border-l-green-400',
    text: 'text-green-700',
    dot: 'bg-green-400',
    label: '채소',
  },
};
const DEFAULT_INGREDIENT_COLOR = {
  bg: 'bg-stone-50',
  borderL: 'border-l-stone-300',
  text: 'text-stone-600',
  dot: 'bg-stone-300',
  label: '기타',
};

const MealPlanner: React.FC = () => {
  const { menuItems } = useMenu();
  const { addToast } = useToast();
  const { user } = useAuth();
  const { plans: historicalPlans } = useHistoricalPlans();
  const [target, setTarget] = useState<TargetType>(TargetType.KIDS);
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const now = new Date();
    const nextMonth = now.getMonth() + 2; // 0-based → 1-based + 1
    return nextMonth > 12 ? now.getFullYear() + 1 : now.getFullYear();
  });
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const now = new Date();
    const nextMonth = now.getMonth() + 2;
    return nextMonth > 12 ? 1 : nextMonth;
  });
  const monthLabel = `${selectedYear}년 ${selectedMonth}월`;
  const [checkDupes, setCheckDupes] = useState<boolean>(true);

  // Dual Plans for Cycle A (Tue-Thu) and Cycle B (Fri-Mon)
  const [plans, setPlans] = useState<{ A: MonthlyMealPlan | null; B: MonthlyMealPlan | null }>({ A: null, B: null });
  const [isGenerating, setIsGenerating] = useState(false);

  // Swap Modal State
  const [swapTarget, setSwapTarget] = useState<{ cycle: 'A' | 'B'; weekIndex: number; item: MenuItem } | null>(null);
  const [swapCandidates, setSwapCandidates] = useState<MenuItem[]>([]);
  const [swapFilterLevel, setSwapFilterLevel] = useState<DuplicationFilterLevel>('60일');
  const [swapSearchQuery, setSwapSearchQuery] = useState('');
  const [swapCycleFilter, setSwapCycleFilter] = useState<'all' | 'same' | 'other'>('all');

  // Ingredient highlight state
  const [highlightedIngredient, setHighlightedIngredient] = useState<string | null>(null);

  // US-020: 든든 전용 메뉴 선정 상태 (key: "cycle-weekIndex-itemId")
  const [ddeonddeonItems, setDdeonddeonItems] = useState<Set<string>>(new Set());
  // US-020: 메뉴 클릭 시 든든 옵션 선택 표시용
  const [ddeonddeonPrompt, setDdeonddeonPrompt] = useState<{
    cycle: 'A' | 'B';
    weekIndex: number;
    item: MenuItem;
  } | null>(null);

  // 현재 타겟이 통합 식단인지 확인
  const integrationGroup = useMemo(() => {
    return MEAL_PLAN_INTEGRATION_GROUPS.find(g => g.baseTarget === target || g.plusTarget === target);
  }, [target]);

  // US-021: 든든 선정 진행률 카운터
  const ddeonddeonCounts = useMemo(() => {
    if (!integrationGroup || !('plusExtraCount' in integrationGroup)) return null;
    const requiredCount = (integrationGroup as { plusExtraCount: number }).plusExtraCount;
    const counts: Record<string, { selected: number; required: number }> = {};
    (['A', 'B'] as const).forEach(cycle => {
      const plan = plans[cycle];
      if (!plan) return;
      plan.weeks.forEach(week => {
        const key = `${cycle}-${week.weekIndex}`;
        const selected = week.items.filter(item => ddeonddeonItems.has(`${cycle}-${week.weekIndex}-${item.id}`)).length;
        counts[key] = { selected, required: requiredCount };
      });
    });
    return counts;
  }, [integrationGroup, plans, ddeonddeonItems]);

  // 반복 메뉴(셰이크 등) 처리 방식:
  // REPEAT_MENU_TARGETS(아이/든든아이)의 반복 메뉴는 parent-child 관계를 통해 처리됨.
  // parentTarget이 지정된 타겟(예: KIDS → KIDS_PLUS)은 엔진에서 부모 식단을 먼저 생성한 뒤
  // createSubsetPlan으로 서브셋을 추출하므로, 반복 메뉴가 자동으로 상속됨.
  const handleGenerate = () => {
    setIsGenerating(true);
    setPlans({ A: null, B: null });

    setTimeout(() => {
      const activeMenu = menuItems.filter(item => !item.isUnused);

      // 메뉴명 → 주재료 룩업 테이블 (cross-target 식재료 비교용)
      const nameToIngredient = new Map<string, string>();
      activeMenu.forEach(item => {
        const clean = item.name
          .replace(/_냉장|_반조리|_냉동/g, '')
          .replace(/\s+\d+$/, '')
          .trim();
        if (clean && item.mainIngredient) nameToIngredient.set(clean, item.mainIngredient);
      });

      // Cross-target 식재료 수집: 같은 월의 다른 타겟에서 사용된 주재료
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
                const clean = item.name
                  .replace(/_냉장|_반조리|_냉동/g, '')
                  .replace(/\s+\d+$/, '')
                  .trim();
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

      // 60일/30일 이내 히스토리 메뉴명 수집 → cycleType별 동요일 중복 방지
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
                const clean = item.name
                  .replace(/_냉장|_반조리|_냉동/g, '')
                  .replace(/\s+\d+$/, '')
                  .trim();
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

      // B 생성 시 A의 주재료 정보 전달 (50:50 분배)
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
    }, 800);
  };

  const handleLoadSnapshot = () => {
    const snapshot = loadSnapshot();
    if (snapshot) {
      setPlans({ A: snapshot.planA, B: snapshot.planB });
      setTarget(snapshot.target as TargetType);
      addToast({ type: 'success', title: '불러오기 완료', message: `${snapshot.target} 식단을 불러왔습니다.` });
    } else {
      addToast({ type: 'warning', title: '저장된 식단 없음', message: '임시 저장된 식단이 없습니다.' });
    }
  };

  const handleSaveVersion = () => {
    if (!plans.A || !plans.B) return;

    // 든든아이 유효성 검사: 저녁 메뉴 3개가 선택되었는지 확인
    if (target === TargetType.KIDS_PLUS || target === TargetType.KIDS) {
      const kidsConfig = TARGET_CONFIGS[TargetType.KIDS_PLUS];
      if (kidsConfig && plans.A) {
        const hasAllWeeks = plans.A.weeks.every(w => {
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

    saveTempSnapshot(plans.A, plans.B, target);
    addToast({
      type: 'success',
      title: '임시 저장 완료',
      message: '현재 식단이 임시 저장되었습니다.',
    });
    addAuditEntry({
      action: 'plan.save',
      userId: user?.id || '',
      userName: user?.displayName || '',
      entityType: 'meal_plan',
      entityId: plans.A.id,
      entityName: `${monthLabel} ${target}`,
    });
  };

  // 다음달 식단 메뉴명 수집
  const nextMonthMenuNames = useMemo(() => {
    const names = new Set<string>();
    // 현재 선택 월의 다음달 히스토리에서 메뉴명 수집
    const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
    const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
    const nextMonthPrefix = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
    historicalPlans
      .filter(p => p.date.startsWith(nextMonthPrefix))
      .forEach(p =>
        p.targets.forEach(t =>
          t.items.forEach(item => {
            const clean = item.name
              .replace(/_냉장|_반조리|_냉동/g, '')
              .replace(/\s+\d+$/, '')
              .trim();
            if (clean) names.add(clean);
          })
        )
      );
    return names;
  }, [historicalPlans, selectedMonth, selectedYear]);

  // 메뉴의 마지막 사용일 맵 (전체 히스토리)
  const allMenuLastUsed = useMemo(() => {
    const lastUsed = new Map<string, string>();
    historicalPlans.forEach(p =>
      p.targets.forEach(t =>
        t.items.forEach(item => {
          const clean = item.name
            .replace(/_냉장|_반조리|_냉동/g, '')
            .replace(/\s+\d+$/, '')
            .trim();
          if (clean) {
            const existing = lastUsed.get(clean);
            if (!existing || p.date > existing) lastUsed.set(clean, p.date);
          }
        })
      )
    );
    return lastUsed;
  }, [historicalPlans]);

  // 현재 생성된 반대 주기 메뉴명 (요일 필터용)
  const otherCycleMenuNames = useMemo(() => {
    const normalize = (n: string) =>
      n
        .replace(/_냉장|_반조리|_냉동/g, '')
        .replace(/\s+\d+$/, '')
        .trim();
    const namesA = new Set<string>();
    const namesB = new Set<string>();
    plans.A?.weeks.forEach(w => w.items.forEach(i => namesA.add(normalize(i.name))));
    plans.B?.weeks.forEach(w => w.items.forEach(i => namesB.add(normalize(i.name))));
    return { A: namesA, B: namesB };
  }, [plans.A, plans.B]);

  // swap용 히스토리 기반 제외 목록 (60일/30일)
  const swapExcludedNames = useMemo(() => {
    const buildExcluded = (days: number, cycleType: '화수목' | '금토월') => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      const excluded = new Set<string>();
      historicalPlans
        .filter(p => p.date >= cutoffStr && p.cycleType === cycleType)
        .forEach(p =>
          p.targets.forEach(t =>
            t.items.forEach(item => {
              const clean = item.name
                .replace(/_냉장|_반조리|_냉동/g, '')
                .replace(/\s+\d+$/, '')
                .trim();
              if (clean) excluded.add(clean);
            })
          )
        );
      return excluded;
    };
    return {
      A60: buildExcluded(60, '화수목'),
      A30: buildExcluded(30, '화수목'),
      B60: buildExcluded(60, '금토월'),
      B30: buildExcluded(30, '금토월'),
    };
  }, [historicalPlans]);

  const getExcludedForSwap = useCallback(
    (cycle: 'A' | 'B', level: DuplicationFilterLevel) => {
      if (level === '전체') return undefined;
      if (level === '30일') return cycle === 'A' ? swapExcludedNames.A30 : swapExcludedNames.B30;
      return cycle === 'A' ? swapExcludedNames.A60 : swapExcludedNames.B60;
    },
    [swapExcludedNames]
  );

  // 메뉴 클릭 시 직접 대체메뉴 모달 열기
  const handleMenuItemClick = useCallback(
    (cycle: 'A' | 'B', weekIndex: number, item: MenuItem) => {
      // US-020: 통합 식단에서는 든든 옵션 프롬프트 먼저 표시
      if (integrationGroup) {
        setDdeonddeonPrompt({ cycle, weekIndex, item });
        return;
      }
      const plan = plans[cycle];
      if (!plan) return;
      const activeMenu = menuItems.filter(m => !m.isUnused);
      const excluded = getExcludedForSwap(cycle, '60일');
      const candidates = getSwapCandidates(plan, item, weekIndex, activeMenu, excluded, '60일');
      setSwapTarget({ cycle, weekIndex, item });
      setSwapCandidates(candidates);
      setSwapFilterLevel('60일');
      setSwapSearchQuery('');
      setSwapCycleFilter('all');
    },
    [plans, menuItems, getExcludedForSwap, integrationGroup]
  );

  // US-020: 든든 옵션 선정 핸들러
  const handleMarkDdeonddeon = useCallback(() => {
    if (!ddeonddeonPrompt) return;
    const key = `${ddeonddeonPrompt.cycle}-${ddeonddeonPrompt.weekIndex}-${ddeonddeonPrompt.item.id}`;
    setDdeonddeonItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
    setDdeonddeonPrompt(null);
  }, [ddeonddeonPrompt]);

  // US-020: 다른 메뉴로 대체 핸들러
  const handleSwapFromPrompt = useCallback(() => {
    if (!ddeonddeonPrompt) return;
    const { cycle, weekIndex, item } = ddeonddeonPrompt;
    const plan = plans[cycle];
    if (!plan) return;
    const activeMenu = menuItems.filter(m => !m.isUnused);
    const excluded = getExcludedForSwap(cycle, '60일');
    const candidates = getSwapCandidates(plan, item, weekIndex, activeMenu, excluded, '60일');
    setSwapTarget({ cycle, weekIndex, item });
    setSwapCandidates(candidates);
    setSwapFilterLevel('60일');
    setSwapSearchQuery('');
    setSwapCycleFilter('all');
    setDdeonddeonPrompt(null);
  }, [ddeonddeonPrompt, plans, menuItems, getExcludedForSwap]);

  // 필터 레벨 변경 시 후보 재계산
  const handleSwapFilterChange = useCallback(
    (level: DuplicationFilterLevel) => {
      if (!swapTarget) return;
      const plan = plans[swapTarget.cycle];
      if (!plan) return;
      const activeMenu = menuItems.filter(m => !m.isUnused);
      const excluded = getExcludedForSwap(swapTarget.cycle, level);
      const candidates = getSwapCandidates(plan, swapTarget.item, swapTarget.weekIndex, activeMenu, excluded, level);
      setSwapCandidates(candidates);
      setSwapFilterLevel(level);
    },
    [swapTarget, plans, menuItems, getExcludedForSwap]
  );

  const performSwap = (newItem: MenuItem) => {
    if (!swapTarget) return;
    const { cycle } = swapTarget;
    const currentPlan = plans[cycle];

    if (currentPlan) {
      const updatedWeeks = currentPlan.weeks.map(week => {
        if (week.weekIndex === swapTarget.weekIndex) {
          const newItems = week.items.map(i => (i.id === swapTarget.item.id ? newItem : i));
          const newCost = newItems.reduce((acc, i) => acc + i.cost, 0);
          const newPrice = newItems.reduce((acc, i) => acc + i.recommendedPrice, 0);
          return { ...week, items: newItems, totalCost: newCost, totalPrice: newPrice };
        }
        return week;
      });
      setPlans(prev => ({ ...prev, [cycle]: { ...currentPlan, weeks: updatedWeeks } }));

      addAuditEntry({
        action: 'swap.execute',
        userId: user?.id || '',
        userName: user?.displayName || '',
        entityType: 'menu_item',
        entityId: newItem.id,
        entityName: `${swapTarget.item.name} → ${newItem.name}`,
        before: { item: swapTarget.item.name, cost: swapTarget.item.cost },
        after: { item: newItem.name, cost: newItem.cost },
      });
    }
    setSwapTarget(null);
  };

  // 채소를 제외한 주요 식재료 목록
  const trackedIngredients = useMemo(() => MAJOR_INGREDIENTS.filter(ing => ing.key !== 'vegetable'), []);

  // Helper: Per-week Ingredient Counts (with menu names for tooltip)
  const ingredientCountsByWeek = useMemo(() => {
    if (!plans.A || !plans.B) return null;
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

    processPlan(plans.A, 'A');
    processPlan(plans.B, 'B');
    result['total'] = total;
    return result;
  }, [plans.A, plans.B, trackedIngredients]);
  // 크로스데이(A↔B) 겹침 메뉴 감지
  const crossDayDuplicates = useMemo(() => {
    if (!plans.A || !plans.B) return new Set<string>();
    const normalize = (n: string) =>
      n
        .replace(/_냉장|_반조리|_냉동/g, '')
        .replace(/\s+\d+$/, '')
        .trim();
    const namesA = new Set(plans.A.weeks.flatMap(w => w.items.map(i => normalize(i.name))));
    const namesB = new Set(plans.B.weeks.flatMap(w => w.items.map(i => normalize(i.name))));
    const overlap = new Set<string>();
    namesA.forEach(n => {
      if (namesB.has(n)) overlap.add(n);
    });
    return overlap;
  }, [plans.A, plans.B]);

  const currentBudgetCap = TARGET_CONFIGS[target].budgetCap;
  const targetPrice = TARGET_CONFIGS[target].targetPrice;

  // Compute parent composition item count for "extra" menu detection
  const currentConfig = TARGET_CONFIGS[target];
  const parentConfig = currentConfig?.parentTarget ? TARGET_CONFIGS[currentConfig.parentTarget] : null;
  const parentItemCount = parentConfig
    ? Object.values(parentConfig.composition).reduce((sum, n) => sum + (n || 0), 0)
    : null;

  // Render a Single Cycle Row
  const renderCycleRow = (cycleLabel: string, plan: MonthlyMealPlan, cycleKey: 'A' | 'B') => (
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

      {/* 식재료 범례 */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-stone-100 bg-white">
        <span className="text-[11px] font-medium text-stone-400">주재료:</span>
        {Object.entries(PLANNER_INGREDIENT_COLORS).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${val.dot}`} />
            <span className="text-[10px] text-stone-500">{val.label}</span>
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

          return (
            <div key={week.weekIndex} className="p-3 flex flex-col group h-full">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-sm font-bold text-stone-800">{week.weekIndex}주차</span>
                  {/* US-021: 든든 선정 진행률 */}
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

              {/* 정책 판매가 vs 단품합산 비교 */}
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

              <div className="space-y-1 flex-1">
                {week.items.map((item, itemIdx) => {
                  const isExtra = parentItemCount !== null && itemIdx >= parentItemCount;
                  const ingColor = PLANNER_INGREDIENT_COLORS[item.mainIngredient] || DEFAULT_INGREDIENT_COLOR;
                  const cleanName = item.name
                    .replace(/_냉장|_반조리|_냉동/g, '')
                    .replace(/\s+\d+$/, '')
                    .trim();
                  const isCrossDup = crossDayDuplicates.has(cleanName);
                  const isFallback = week.fallbackItems?.includes(cleanName);
                  const isHighlighted = highlightedIngredient === item.mainIngredient;
                  const isDimmed = highlightedIngredient !== null && !isHighlighted;
                  // 마지막 사용일 계산
                  const lastUsed = allMenuLastUsed.get(cleanName);
                  const lastUsedLabel = lastUsed
                    ? (() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const used = new Date(lastUsed);
                        used.setHours(0, 0, 0, 0);
                        const days = Math.max(0, Math.floor((today.getTime() - used.getTime()) / 86400000));
                        return days < 7
                          ? `${days}일 전`
                          : days < 60
                            ? `${Math.floor(days / 7)}주 전`
                            : `${Math.floor(days / 30)}개월 전`;
                      })()
                    : null;

                  return (
                    <div key={item.id}>
                      <div
                        onClick={() => handleMenuItemClick(cycleKey, week.weekIndex, item)}
                        title={
                          [
                            isCrossDup ? '다른 주기에도 사용됨' : '',
                            isFallback ? '2차 필터(30일)로 선택됨' : '',
                            lastUsed ? `마지막 사용: ${lastUsed}` : '',
                          ]
                            .filter(Boolean)
                            .join(' | ') || undefined
                        }
                        className={`flex items-center gap-2 text-xs p-2 rounded cursor-pointer transition-all border-l-2 ${ingColor.borderL} ${
                          isHighlighted
                            ? `${ingColor.bg} ring-2 ring-offset-1 ring-current ${ingColor.text} shadow-md scale-[1.02]`
                            : isDimmed
                              ? 'bg-stone-50/50 opacity-40'
                              : 'bg-white'
                        } hover:ring-1 hover:ring-stone-300 ${
                          isExtra ? 'border border-amber-300 border-l-2' : ''
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
                            <span className="ml-1 text-[10px] text-stone-400 font-normal">({lastUsedLabel})</span>
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

  return (
    <div className="flex flex-col h-full gap-6 relative">
      {/* 1. Control Bar & Sync Center */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-col gap-4">
        {/* Top Row: Generation Controls */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col">
              <Label className="text-xs font-bold text-stone-500 mb-1">식단 대상</Label>
              <select
                value={target}
                onChange={e => setTarget(e.target.value as TargetType)}
                className="bg-stone-50 border border-stone-300 text-stone-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-48 p-2.5"
              >
                {Object.values(TargetType).map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {MEAL_PLAN_INTEGRATION_GROUPS.some(g => g.baseTarget === target || g.plusTarget === target) && (
                <div className="text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200 mt-1">
                  {MEAL_PLAN_INTEGRATION_GROUPS.find(g => g.baseTarget === target || g.plusTarget === target)
                    ?.groupLabel || '통합 식단'}
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <Label className="text-xs font-bold text-stone-500 mb-1">연도</Label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-stone-50 border border-stone-300 text-stone-900 text-sm rounded-lg block w-24 p-2.5"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>
                    {y}년
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <Label className="text-xs font-bold text-stone-500 mb-1">월</Label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="bg-stone-50 border border-stone-300 text-stone-900 text-sm rounded-lg block w-20 p-2.5"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                  <option key={m} value={m}>
                    {m}월
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center h-full pt-6 ml-2">
              <Label className="inline-flex items-center cursor-pointer">
                <Input
                  type="checkbox"
                  checked={checkDupes}
                  onChange={e => setCheckDupes(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="relative w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                <span className="ms-2 text-sm font-medium text-stone-600">60일 중복 제외</span>
              </Label>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleLoadSnapshot}
              className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold shadow-sm"
            >
              <History className="w-5 h-5 text-stone-500" />
              조회
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`flex items-center gap-2 px-6 py-3 bg-stone-900 hover:bg-black text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 ${isGenerating ? 'opacity-75 cursor-wait' : ''}`}
            >
              {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {isGenerating ? '식단 생성 중...' : '통합 식단(화수목/금토월) 자동 생성'}
            </Button>
            {plans.A && (
              <Button
                variant="outline"
                onClick={handleSaveVersion}
                className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold shadow-sm"
              >
                <Save className="w-5 h-5 text-stone-500" />
                저장
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Workspace */}
      {!plans.A ? (
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
      ) : (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto pb-6">
            {/* 주재료 하이라이트 필터 (식단표 상단) */}
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
                          ? `${color.bg} ${color.text} ring-2 ring-offset-1 ring-current shadow-sm font-bold`
                          : 'bg-stone-50 text-stone-500 hover:bg-stone-100'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
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

            {/* Cycle A Row */}
            {plans.A && renderCycleRow('화수목', plans.A, 'A')}

            {/* Cycle B Row */}
            {plans.B && renderCycleRow('금토월', plans.B, 'B')}
          </div>
        </div>
      )}

      {/* --- Modals --- */}

      {/* 3. Swap Modal */}
      {swapTarget &&
        (() => {
          // 요일(배송그룹) 필터 적용
          const otherCycleNames = swapTarget.cycle === 'A' ? otherCycleMenuNames.B : otherCycleMenuNames.A;
          const normalize = (n: string) =>
            n
              .replace(/_냉장|_반조리|_냉동/g, '')
              .replace(/\s+\d+$/, '')
              .trim();
          const cycleFiltered =
            swapCycleFilter === 'all'
              ? swapCandidates
              : swapCycleFilter === 'other'
                ? swapCandidates.filter(c => !otherCycleNames.has(normalize(c.name)))
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
                            {parentItemCount !== null &&
                              swapTarget.weekIndex >= 0 &&
                              week &&
                              week.items.indexOf(swapTarget.item) >= parentItemCount && (
                                <span className="text-[10px] text-amber-600">← 이 슬롯은 든든 전용</span>
                              )}
                          </div>
                        );
                      })()}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSwapTarget(null)} className="p-2 rounded-full">
                      <X className="w-5 h-5 text-stone-600" />
                    </Button>
                  </div>

                  {/* 필터 레벨 + 요일 필터 + 검색 */}
                  <div className="flex flex-col gap-2 mt-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5">
                        {(['60일', '30일', '전체'] as DuplicationFilterLevel[]).map(level => (
                          <button
                            key={level}
                            onClick={() => handleSwapFilterChange(level)}
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
                        <button
                          onClick={() => handleSwapFilterChange('전체')}
                          className="mt-2 text-xs text-blue-500 hover:underline"
                        >
                          전체 메뉴 보기
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 p-2">
                      {[...filteredCandidates]
                        .sort((a, b) => {
                          // 신제품 우선 (최근 3개월 내 출시)
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
                          const cleanCandidate = candidate.name
                            .replace(/_냉장|_반조리|_냉동/g, '')
                            .replace(/\s+\d+$/, '')
                            .trim();
                          const isNextMonthDup = nextMonthMenuNames.has(cleanCandidate);
                          const lastUsed = allMenuLastUsed.get(cleanCandidate);
                          const daysAgo = lastUsed
                            ? (() => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const used = new Date(lastUsed);
                                used.setHours(0, 0, 0, 0);
                                return Math.max(0, Math.floor((today.getTime() - used.getTime()) / 86400000));
                              })()
                            : null;
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
                              onClick={() => performSwap(candidate)}
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
                                    <span className="bg-stone-100 px-1.5 py-0.5 rounded">
                                      {candidate.mainIngredient}
                                    </span>
                                    {candidate.isSpicy && (
                                      <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded">🌶️</span>
                                    )}
                                    {daysAgo !== null && (
                                      <span
                                        className={`px-1.5 py-0.5 rounded ${daysAgo < 30 ? 'bg-red-50 text-red-500' : daysAgo < 60 ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}
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
                                <div className="font-bold text-stone-900">
                                  {candidate.recommendedPrice.toLocaleString()}원
                                </div>
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
        })()}

      {/* US-020: 든든 옵션 선택 프롬프트 */}
      {ddeonddeonPrompt && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl w-72 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-stone-100">
              <p className="text-sm font-bold text-stone-800 truncate">{ddeonddeonPrompt.item.name}</p>
              <p className="text-[11px] text-stone-400">
                {integrationGroup?.groupLabel || '통합'} 식단 - {ddeonddeonPrompt.cycle === 'A' ? '화수목' : '금토월'}{' '}
                {ddeonddeonPrompt.weekIndex}주차
              </p>
            </div>
            <div className="p-2 space-y-1">
              <button
                onClick={handleMarkDdeonddeon}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-indigo-50 text-left transition-colors"
              >
                <span className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                  든
                </span>
                <div>
                  <div className="text-sm font-medium text-stone-800">
                    {ddeonddeonItems.has(
                      `${ddeonddeonPrompt.cycle}-${ddeonddeonPrompt.weekIndex}-${ddeonddeonPrompt.item.id}`
                    )
                      ? '든든 선정 해제'
                      : '든든 옵션으로 선정'}
                  </div>
                  <div className="text-[11px] text-stone-400">든든 전용 메뉴로 지정합니다</div>
                </div>
              </button>
              <button
                onClick={handleSwapFromPrompt}
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
              <button
                onClick={() => setDdeonddeonPrompt(null)}
                className="w-full text-xs text-stone-400 hover:text-stone-600 py-1.5"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealPlanner;
