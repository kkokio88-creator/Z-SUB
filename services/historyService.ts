import type { MonthlyMealPlan } from '../types';

export interface TempSnapshot {
  planA: MonthlyMealPlan;
  planB: MonthlyMealPlan;
  target: string;
  savedAt: string;
}

// Keep PlanVersion as alias for backward compatibility (used in PlanHistory component)
export type PlanVersion = TempSnapshot;

const SNAPSHOT_KEY = 'zsub_plan_snapshot';

export const loadSnapshot = (): TempSnapshot | null => {
  try {
    const stored = localStorage.getItem(SNAPSHOT_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    /* ignore */
  }
  return null;
};

export const saveTempSnapshot = (planA: MonthlyMealPlan, planB: MonthlyMealPlan, target: string): TempSnapshot => {
  const snapshot: TempSnapshot = {
    planA,
    planB,
    target,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  return snapshot;
};

export const clearSnapshot = (): void => {
  localStorage.removeItem(SNAPSHOT_KEY);
};
