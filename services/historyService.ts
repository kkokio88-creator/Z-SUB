import type { MonthlyMealPlan, MenuItem } from '../types';

export interface PlanVersion {
  id: string;
  planId: string;
  label: string;
  savedAt: string;
  target: string;
  status: 'draft' | 'review_requested' | 'approved' | 'finalized';
  planA: MonthlyMealPlan;
  planB: MonthlyMealPlan;
  memo?: string; // 버전 메모 (예: "품질팀 피드백 반영")
  savedWeeks?: number[]; // 저장된 주차 목록 (예: [1,3] = 1,3주차만)
}

export interface PlanDiffItem {
  weekIndex: number;
  cycle: 'A' | 'B';
  removed: MenuItem[];
  added: MenuItem[];
}

const HISTORY_KEY = 'zsub_plan_history';

export const loadHistory = (): PlanVersion[] => {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    /* ignore */
  }
  return [];
};

export const getVersions = (planId: string): PlanVersion[] => {
  return loadHistory().filter(v => v.planId === planId);
};

export const saveVersion = (version: Omit<PlanVersion, 'id' | 'savedAt'>): PlanVersion => {
  const full: PlanVersion = {
    ...version,
    id: `ver_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    savedAt: new Date().toISOString(),
  };
  const history = loadHistory();
  history.unshift(full);
  if (history.length > 20) history.length = 20;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return full;
};

export const deleteVersion = (planId: string, versionId: string): void => {
  const history = loadHistory().filter(v => !(v.planId === planId && v.id === versionId));
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};

export const restoreWeeks = (
  currentPlanA: MonthlyMealPlan,
  currentPlanB: MonthlyMealPlan,
  version: PlanVersion,
  weekIndices: number[]
): { planA: MonthlyMealPlan; planB: MonthlyMealPlan } => {
  const mergeWeeks = (current: MonthlyMealPlan, saved: MonthlyMealPlan): MonthlyMealPlan => ({
    ...current,
    weeks: current.weeks.map(week => {
      if (weekIndices.includes(week.weekIndex)) {
        const savedWeek = saved.weeks.find(w => w.weekIndex === week.weekIndex);
        return savedWeek ?? week;
      }
      return week;
    }),
  });

  return {
    planA: mergeWeeks(currentPlanA, version.planA),
    planB: mergeWeeks(currentPlanB, version.planB),
  };
};

export const diffPlans = (planA: MonthlyMealPlan, planB: MonthlyMealPlan): PlanDiffItem[] => {
  const diffs: PlanDiffItem[] = [];

  planA.weeks.forEach((weekA, idx) => {
    const weekB = planB.weeks[idx];
    if (!weekB) return;

    const aIds = new Set(weekA.items.map(i => i.id));
    const bIds = new Set(weekB.items.map(i => i.id));

    const removed = weekA.items.filter(i => !bIds.has(i.id));
    const added = weekB.items.filter(i => !aIds.has(i.id));

    if (removed.length > 0 || added.length > 0) {
      diffs.push({ weekIndex: weekA.weekIndex, cycle: 'A', removed, added });
    }
  });

  return diffs;
};
