import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistoryReview } from '../../hooks/useHistoryReview';
import type { HistoricalMealPlan } from '../../types';

vi.mock('../../services/historyReviewService', () => ({
  makeReviewKey: (date: string, cycleType: string) => `${date}|${cycleType}`,
  buildReviewStatusMap: () => new Map(),
  getFilterStatus: () => 'pending' as const,
}));

vi.mock('../../services/reviewService', () => ({
  addReviewComment: vi.fn(),
  getReviewComments: () => [],
  deleteComment: vi.fn(),
}));

vi.mock('../../components/history/historyConstants', () => ({
  isValidMenuItem: () => true,
  parseMenuItem: (name: string) => ({ cleanName: name, process: null }),
}));

const makePlan = (date: string, cycleType = '주간'): HistoricalMealPlan =>
  ({ date, cycleType, targets: [] }) as unknown as HistoricalMealPlan;

const baseParams = {
  allMonthPlans: [] as HistoricalMealPlan[],
  user: { displayName: '테스터' },
  addToast: vi.fn(),
};

describe('useHistoryReview', () => {
  it('초기 reviewFilter가 all', () => {
    const { result } = renderHook(() => useHistoryReview(baseParams));
    expect(result.current.reviewFilter).toBe('all');
  });

  it('filterCounts가 plans 수를 반영', () => {
    const plans = [makePlan('2026-03-01'), makePlan('2026-03-15')];
    const { result } = renderHook(() => useHistoryReview({ ...baseParams, allMonthPlans: plans }));
    expect(result.current.filterCounts.all).toBe(2);
    expect(result.current.filterCounts.pending).toBe(2);
  });

  it('reviewFilter 변경 시 monthPlans 필터링', () => {
    const plans = [makePlan('2026-03-01'), makePlan('2026-03-15')];
    const { result } = renderHook(() => useHistoryReview({ ...baseParams, allMonthPlans: plans }));
    expect(result.current.monthPlans).toHaveLength(2);
    act(() => result.current.setReviewFilter('completed'));
    expect(result.current.monthPlans).toHaveLength(0);
  });

  it('selectedReview 상태 변경', () => {
    const plan = makePlan('2026-03-01');
    const { result } = renderHook(() => useHistoryReview(baseParams));
    expect(result.current.selectedReview).toBeNull();
    act(() => result.current.setSelectedReview(plan));
    expect(result.current.selectedReview).toBe(plan);
  });
});
