import { useState, useMemo, useCallback } from 'react';
import type { HistoricalMealPlan } from '../types';

export type ViewMode = 'plan' | 'ingredient' | 'distribution' | 'production';

export function useHistoryNavigation(plans: HistoricalMealPlan[]) {
  const [viewYear, setViewYear] = useState(() => {
    const latestDate = plans[plans.length - 1]?.date;
    if (latestDate) return parseInt(latestDate.slice(0, 4));
    const now = new Date();
    const nextMonth = now.getMonth() + 2;
    return nextMonth > 12 ? now.getFullYear() + 1 : now.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const latestDate = plans[plans.length - 1]?.date;
    if (latestDate) return parseInt(latestDate.slice(5, 7)) - 1;
    const now = new Date();
    const nextMonth = now.getMonth() + 2;
    return nextMonth > 12 ? 0 : nextMonth - 1;
  });

  const [viewMode, setViewMode] = useState<ViewMode>('plan');
  const [highlightedIngredient, setHighlightedIngredient] = useState<string | null>(null);

  const goToPrevMonth = useCallback(() => {
    setViewMonth(m => {
      if (m === 0) {
        setViewYear(y => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setViewMonth(m => {
      if (m === 11) {
        setViewYear(y => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const goToToday = useCallback(() => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  }, []);

  const allMonthPlans = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    return plans.filter(p => p.date.startsWith(prefix));
  }, [viewYear, viewMonth, plans]);

  return {
    viewYear,
    viewMonth,
    viewMode,
    setViewMode,
    highlightedIngredient,
    setHighlightedIngredient,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
    allMonthPlans,
  };
}
