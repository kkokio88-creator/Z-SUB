import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { HistoricalMealPlan } from '../types';
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

interface HistoricalPlansContextType {
  plans: HistoricalMealPlan[];
  isLoading: boolean;
  refresh: () => Promise<void>;
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

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <HistoricalPlansContext.Provider value={{ plans, isLoading, refresh }}>{children}</HistoricalPlansContext.Provider>
  );
};

export const useHistoricalPlans = (): HistoricalPlansContextType => {
  const ctx = useContext(HistoricalPlansContext);
  if (!ctx) throw new Error('useHistoricalPlans must be used within a HistoricalPlansProvider');
  return ctx;
};
