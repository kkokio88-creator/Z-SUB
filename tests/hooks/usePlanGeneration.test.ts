import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlanGeneration } from '../../hooks/usePlanGeneration';

vi.mock('../../constants', () => ({
  TARGET_CONFIGS: {},
}));

vi.mock('../../services/engine', () => ({
  generateMonthlyMealPlan: vi.fn().mockReturnValue({ weeks: [] }),
}));

vi.mock('../../services/auditService', () => ({
  addAuditEntry: vi.fn(),
}));

vi.mock('../../services/menuUtils', () => ({
  normalizeMenuName: (n: string) => n,
}));

const baseParams = {
  menuItems: [],
  historicalPlans: [],
  addToast: vi.fn(),
  user: { id: '1', displayName: 'test' },
};

describe('usePlanGeneration', () => {
  it('초기 target이 아이 식단', () => {
    const { result } = renderHook(() => usePlanGeneration(baseParams));
    expect(result.current.target).toBe('아이 식단');
  });

  it('초기 year와 month가 다음 달 기준', () => {
    const { result } = renderHook(() => usePlanGeneration(baseParams));
    const now = new Date();
    const nextMonth = now.getMonth() + 2;
    const expectedYear = nextMonth > 12 ? now.getFullYear() + 1 : now.getFullYear();
    const expectedMonth = nextMonth > 12 ? 1 : nextMonth;
    expect(result.current.selectedYear).toBe(expectedYear);
    expect(result.current.selectedMonth).toBe(expectedMonth);
  });

  it('target, year, month 상태 변경', () => {
    const { result } = renderHook(() => usePlanGeneration(baseParams));
    act(() => result.current.setTarget('시니어 식단' as any));
    expect(result.current.target).toBe('시니어 식단');
    act(() => result.current.setSelectedYear(2027));
    expect(result.current.selectedYear).toBe(2027);
    act(() => result.current.setSelectedMonth(6));
    expect(result.current.selectedMonth).toBe(6);
  });

  it('monthLabel이 year/month 반영', () => {
    const { result } = renderHook(() => usePlanGeneration(baseParams));
    const now = new Date();
    const nextMonth = now.getMonth() + 2;
    const expectedMonth = nextMonth > 12 ? 1 : nextMonth;
    const expectedYear = nextMonth > 12 ? now.getFullYear() + 1 : now.getFullYear();
    expect(result.current.monthLabel).toBe(`${expectedYear}년 ${expectedMonth}월`);
  });
});
