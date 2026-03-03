import { useState, useMemo, useCallback } from 'react';
import type { TargetType, MonthlyMealPlan, MenuItem, HistoricalMealPlan, DuplicationFilterLevel } from '../types';
import { TARGET_CONFIGS } from '../constants';
import { getSwapCandidates } from '../services/engine';
import { addAuditEntry } from '../services/auditService';
import { saveTempSnapshot, loadSnapshot } from '../services/historyService';
import { normalizeMenuName } from '../services/menuUtils';
import { getDeliveryDate, calcDaysGap } from '../components/planner/plannerConstants';
import type { ToastType } from '../context/ToastContext';

interface UsePlanStateParams {
  target: TargetType;
  monthLabel: string;
  selectedYear: number;
  selectedMonth: number;
  menuItems: MenuItem[];
  historicalPlans: HistoricalMealPlan[];
  addToast: (toast: { type: ToastType; title: string; message: string }) => void;
  user: { id?: string; displayName?: string } | null;
}

export function usePlanState({
  target,
  monthLabel,
  selectedYear,
  selectedMonth,
  menuItems,
  historicalPlans,
  addToast,
  user,
}: UsePlanStateParams) {
  const [plans, setPlans] = useState<{ A: MonthlyMealPlan | null; B: MonthlyMealPlan | null }>({ A: null, B: null });

  // Swap state
  const [swapTarget, setSwapTarget] = useState<{ cycle: 'A' | 'B'; weekIndex: number; item: MenuItem } | null>(null);
  const [swapCandidates, setSwapCandidates] = useState<MenuItem[]>([]);
  const [swapFilterLevel, setSwapFilterLevel] = useState<DuplicationFilterLevel>('60일');
  const [swapSearchQuery, setSwapSearchQuery] = useState('');
  const [swapCycleFilter, setSwapCycleFilter] = useState<'all' | 'same' | 'other'>('all');

  // Ddeonddeon state
  const [ddeonddeonItems, setDdeonddeonItems] = useState<Set<string>>(new Set());
  const [ddeonddeonPrompt, setDdeonddeonPrompt] = useState<{
    cycle: 'A' | 'B';
    weekIndex: number;
    item: MenuItem;
  } | null>(null);

  // 다음달 식단 메뉴명 수집
  const nextMonthMenuNames = useMemo(() => {
    const names = new Set<string>();
    const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
    const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
    const nextMonthPrefix = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
    historicalPlans
      .filter(p => p.date.startsWith(nextMonthPrefix))
      .forEach(p =>
        p.targets.forEach(t =>
          t.items.forEach(item => {
            const clean = normalizeMenuName(item.name);
            if (clean) names.add(clean);
          })
        )
      );
    return names;
  }, [historicalPlans, selectedMonth, selectedYear]);

  // 메뉴의 마지막 사용일 맵
  const allMenuLastUsed = useMemo(() => {
    const lastUsed = new Map<string, string>();
    historicalPlans.forEach(p =>
      p.targets.forEach(t =>
        t.items.forEach(item => {
          const clean = normalizeMenuName(item.name);
          if (clean) {
            const existing = lastUsed.get(clean);
            if (!existing || p.date > existing) lastUsed.set(clean, p.date);
          }
        })
      )
    );
    return lastUsed;
  }, [historicalPlans]);

  // 현재 생성된 반대 주기 메뉴명
  const otherCycleMenuNames = useMemo(() => {
    const namesA = new Set<string>();
    const namesB = new Set<string>();
    plans.A?.weeks.forEach(w => w.items.forEach(i => namesA.add(normalizeMenuName(i.name))));
    plans.B?.weeks.forEach(w => w.items.forEach(i => namesB.add(normalizeMenuName(i.name))));
    return { A: namesA, B: namesB };
  }, [plans.A, plans.B]);

  const getExcludedForSwap = useCallback(
    (_cycle: 'A' | 'B', level: DuplicationFilterLevel, weekIndex: number) => {
      if (level === '전체') return undefined;
      const daysThreshold = level === '30일' ? 30 : 60;
      const deliveryDate = getDeliveryDate(selectedYear, selectedMonth, weekIndex);
      const excluded = new Set<string>();
      allMenuLastUsed.forEach((lastDate, name) => {
        const gap = calcDaysGap(lastDate, deliveryDate);
        if (gap.days < daysThreshold) {
          excluded.add(name);
        }
      });
      return excluded;
    },
    [allMenuLastUsed, selectedYear, selectedMonth]
  );

  const handleLoadSnapshot = useCallback(() => {
    const snapshot = loadSnapshot();
    if (snapshot) {
      setPlans({ A: snapshot.planA, B: snapshot.planB });
      addToast({ type: 'success', title: '불러오기 완료', message: `${snapshot.target} 식단을 불러왔습니다.` });
      return snapshot.target as TargetType;
    } else {
      addToast({ type: 'warning', title: '저장된 식단 없음', message: '임시 저장된 식단이 없습니다.' });
      return null;
    }
  }, [addToast]);

  const handleSaveVersion = useCallback(() => {
    if (!plans.A || !plans.B) return;
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
  }, [plans.A, plans.B, target, monthLabel, addToast, user]);

  const openSwapModal = useCallback(
    (cycle: 'A' | 'B', weekIndex: number, item: MenuItem) => {
      const plan = plans[cycle];
      if (!plan) return;
      const activeMenu = menuItems.filter(m => !m.isUnused);
      const excluded = getExcludedForSwap(cycle, '60일', weekIndex);
      const delivery = getDeliveryDate(selectedYear, selectedMonth, weekIndex);
      const candidates = getSwapCandidates(plan, item, weekIndex, activeMenu, excluded, '60일', undefined, delivery);
      setSwapTarget({ cycle, weekIndex, item });
      setSwapCandidates(candidates);
      setSwapFilterLevel('60일');
      setSwapSearchQuery('');
      setSwapCycleFilter('all');
    },
    [plans, menuItems, getExcludedForSwap, selectedYear, selectedMonth]
  );

  const handleSwapFilterChange = useCallback(
    (level: DuplicationFilterLevel) => {
      if (!swapTarget) return;
      const plan = plans[swapTarget.cycle];
      if (!plan) return;
      const activeMenu = menuItems.filter(m => !m.isUnused);
      const excluded = getExcludedForSwap(swapTarget.cycle, level, swapTarget.weekIndex);
      const delivery = getDeliveryDate(selectedYear, selectedMonth, swapTarget.weekIndex);
      const candidates = getSwapCandidates(
        plan,
        swapTarget.item,
        swapTarget.weekIndex,
        activeMenu,
        excluded,
        level,
        undefined,
        delivery
      );
      setSwapCandidates(candidates);
      setSwapFilterLevel(level);
    },
    [swapTarget, plans, menuItems, getExcludedForSwap, selectedYear, selectedMonth]
  );

  const performSwap = useCallback(
    (newItem: MenuItem) => {
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
    },
    [swapTarget, plans, user]
  );

  return {
    plans,
    setPlans,
    swapTarget,
    setSwapTarget,
    swapCandidates,
    swapFilterLevel,
    swapSearchQuery,
    setSwapSearchQuery,
    swapCycleFilter,
    setSwapCycleFilter,
    ddeonddeonItems,
    setDdeonddeonItems,
    ddeonddeonPrompt,
    setDdeonddeonPrompt,
    nextMonthMenuNames,
    allMenuLastUsed,
    otherCycleMenuNames,
    getExcludedForSwap,
    handleLoadSnapshot,
    handleSaveVersion,
    openSwapModal,
    handleSwapFilterChange,
    performSwap,
  };
}
