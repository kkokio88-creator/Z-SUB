import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlanState } from '../../hooks/usePlanState';

vi.mock('../../constants', () => ({
  TARGET_CONFIGS: {},
}));

vi.mock('../../services/engine', () => ({
  getSwapCandidates: vi.fn().mockReturnValue([]),
}));

vi.mock('../../services/auditService', () => ({
  addAuditEntry: vi.fn(),
}));

vi.mock('../../services/historyService', () => ({
  saveTempSnapshot: vi.fn(),
  loadSnapshot: vi.fn().mockReturnValue(null),
}));

vi.mock('../../services/menuUtils', () => ({
  normalizeMenuName: (n: string) => n,
}));

vi.mock('../../components/planner/plannerConstants', () => ({
  getDeliveryDate: () => new Date(),
  calcDaysGap: () => 0,
}));

const baseParams = {
  target: '아이 식단' as any,
  monthLabel: '2026년 4월',
  selectedYear: 2026,
  selectedMonth: 4,
  menuItems: [{ id: '1', name: '메뉴1', tags: [], isUnused: false, mainIngredient: 'beef' }] as any[],
  historicalPlans: [],
  addToast: vi.fn(),
  user: { id: '1', displayName: 'test' },
};

describe('usePlanState', () => {
  it('초기 plans가 A: null, B: null', () => {
    const { result } = renderHook(() => usePlanState(baseParams));
    expect(result.current.plans).toEqual({ A: null, B: null });
  });

  it('swapTarget 초기값 null', () => {
    const { result } = renderHook(() => usePlanState(baseParams));
    expect(result.current.swapTarget).toBeNull();
  });

  it('setPlans로 식단 설정 가능', () => {
    const { result } = renderHook(() => usePlanState(baseParams));
    const mockPlans = { A: { weeks: [] }, B: null };
    act(() => result.current.setPlans(mockPlans as any));
    expect(result.current.plans).toEqual(mockPlans);
  });
});
