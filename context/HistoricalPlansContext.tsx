import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { HistoricalMealPlan, HistoricalTargetPlan, MonthlyMealPlan } from '../types';
import { pullHistoricalPlans } from '../services/syncManager';

const STORAGE_KEY = 'zsub_historical_plans';

const loadFromStorage = (): HistoricalMealPlan[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return [];
};

// MonthlyMealPlan → HistoricalMealPlan[] 변환
// monthLabel: "2024년 3월" 또는 "3월" 형식 지원
function monthlyToHistorical(plan: MonthlyMealPlan): HistoricalMealPlan[] {
  const yearMatch = plan.monthLabel.match(/(\d{4})년/);
  const monthMatch = plan.monthLabel.match(/(\d{1,2})월/);
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
  const month = monthMatch ? parseInt(monthMatch[1]) : 1;

  // 화수목 → 화요일(2), 금토월 → 금요일(5) 기준
  const anchorDay = plan.cycleType === '화수목' ? 2 : 5;

  const firstOfMonth = new Date(year, month - 1, 1);
  while (firstOfMonth.getDay() !== anchorDay) {
    firstOfMonth.setDate(firstOfMonth.getDate() + 1);
  }

  return plan.weeks.map(week => {
    const weekDate = new Date(firstOfMonth);
    weekDate.setDate(weekDate.getDate() + (week.weekIndex - 1) * 7);
    const dateStr = `${weekDate.getFullYear()}-${String(weekDate.getMonth() + 1).padStart(2, '0')}-${String(weekDate.getDate()).padStart(2, '0')}`;

    const targetPlan: HistoricalTargetPlan = {
      targetType: plan.target,
      items: week.items.map(item => ({
        name: item.name,
        process: 0,
        code: item.code || item.id,
        price: item.recommendedPrice,
        cost: item.cost,
      })),
      totalPrice: week.totalPrice,
      totalCost: week.totalCost,
      itemCount: week.items.length,
    };

    return {
      date: dateStr,
      cycleType: plan.cycleType,
      targets: [targetPlan],
    };
  });
}

// 기존 plans에 새 plans를 병합 (같은 date+cycleType이면 target 합침)
function mergePlans(existing: HistoricalMealPlan[], newPlans: HistoricalMealPlan[]): HistoricalMealPlan[] {
  const map = new Map<string, HistoricalMealPlan>();
  for (const p of existing) {
    map.set(`${p.date}|${p.cycleType}`, { ...p, targets: [...p.targets] });
  }
  for (const p of newPlans) {
    const key = `${p.date}|${p.cycleType}`;
    const entry = map.get(key);
    if (entry) {
      for (const newTarget of p.targets) {
        const idx = entry.targets.findIndex(t => t.targetType === newTarget.targetType);
        if (idx >= 0) {
          entry.targets[idx] = newTarget;
        } else {
          entry.targets.push(newTarget);
        }
      }
    } else {
      map.set(key, { ...p, targets: [...p.targets] });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

interface HistoricalPlansContextType {
  plans: HistoricalMealPlan[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  registerPlans: (planA: MonthlyMealPlan, planB: MonthlyMealPlan) => number;
}

const HistoricalPlansContext = createContext<HistoricalPlansContextType | null>(null);

export const HistoricalPlansProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [plans, setPlans] = useState<HistoricalMealPlan[]>(loadFromStorage);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await pullHistoricalPlans();
      if (result.success && result.plans.length > 0) {
        setPlans(result.plans);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result.plans));
      }
    } catch {
      // keep cached data
    } finally {
      setIsLoading(false);
    }
  }, []);

  // MonthlyMealPlan 2개를 HistoricalMealPlan으로 변환하여 병합 저장
  const registerPlans = useCallback(
    (planA: MonthlyMealPlan, planB: MonthlyMealPlan): number => {
      const newHistA = monthlyToHistorical(planA);
      const newHistB = monthlyToHistorical(planB);
      const allNew = [...newHistA, ...newHistB];

      const merged = mergePlans(plans, allNew);
      setPlans(merged);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return allNew.length;
    },
    [plans]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <HistoricalPlansContext.Provider value={{ plans, isLoading, refresh, registerPlans }}>
      {children}
    </HistoricalPlansContext.Provider>
  );
};

export const useHistoricalPlans = (): HistoricalPlansContextType => {
  const ctx = useContext(HistoricalPlansContext);
  if (!ctx) throw new Error('useHistoricalPlans must be used within a HistoricalPlansProvider');
  return ctx;
};
