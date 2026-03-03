import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistoryNavigation } from '../../hooks/useHistoryNavigation';
import type { HistoricalMealPlan } from '../../types';

const makePlan = (date: string): HistoricalMealPlan =>
  ({ date, targetType: 'test', cycle: 1, items: [] }) as unknown as HistoricalMealPlan;

describe('useHistoryNavigation', () => {
  it('빈 plans일 때 다음 달로 초기화', () => {
    const { result } = renderHook(() => useHistoryNavigation([]));
    const now = new Date();
    const nextMonth = now.getMonth() + 2;
    const expectedYear = nextMonth > 12 ? now.getFullYear() + 1 : now.getFullYear();
    const expectedMonth = nextMonth > 12 ? 0 : nextMonth - 1;
    expect(result.current.viewYear).toBe(expectedYear);
    expect(result.current.viewMonth).toBe(expectedMonth);
  });

  it('plans가 있으면 마지막 plan의 날짜로 초기화', () => {
    const plans = [makePlan('2026-03-01'), makePlan('2026-05-15')];
    const { result } = renderHook(() => useHistoryNavigation(plans));
    expect(result.current.viewYear).toBe(2026);
    expect(result.current.viewMonth).toBe(4); // May = 4 (0-indexed)
  });

  it('goToPrevMonth로 이전 달 이동 (1월→12월 연도 감소)', () => {
    const plans = [makePlan('2026-01-01')];
    const { result } = renderHook(() => useHistoryNavigation(plans));
    expect(result.current.viewMonth).toBe(0); // January
    act(() => result.current.goToPrevMonth());
    expect(result.current.viewMonth).toBe(11); // December
    expect(result.current.viewYear).toBe(2025);
  });

  it('goToNextMonth로 다음 달 이동 (12월→1월 연도 증가)', () => {
    const plans = [makePlan('2026-12-01')];
    const { result } = renderHook(() => useHistoryNavigation(plans));
    expect(result.current.viewMonth).toBe(11); // December
    act(() => result.current.goToNextMonth());
    expect(result.current.viewMonth).toBe(0); // January
    expect(result.current.viewYear).toBe(2027);
  });

  it('allMonthPlans가 현재 월의 plans만 필터링', () => {
    const plans = [makePlan('2026-03-01'), makePlan('2026-03-15'), makePlan('2026-04-01')];
    const { result } = renderHook(() => useHistoryNavigation(plans));
    // Initialized to last plan's date: 2026-04 (month=3)
    expect(result.current.allMonthPlans).toHaveLength(1);
    act(() => result.current.goToPrevMonth());
    expect(result.current.allMonthPlans).toHaveLength(2);
  });

  it('viewMode 기본값 plan, 변경 가능', () => {
    const { result } = renderHook(() => useHistoryNavigation([]));
    expect(result.current.viewMode).toBe('plan');
    act(() => result.current.setViewMode('ingredient'));
    expect(result.current.viewMode).toBe('ingredient');
  });
});
