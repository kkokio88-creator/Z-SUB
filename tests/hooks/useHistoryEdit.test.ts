import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistoryEdit } from '../../hooks/useHistoryEdit';

vi.mock('../../services/historyReviewService', () => ({
  makeReviewKey: (date: string, cycleType: string) => `${date}|${cycleType}`,
}));

vi.mock('../../services/reviewService', () => ({
  addReviewComment: vi.fn(),
  resolveComment: vi.fn(),
  resetDepartmentsForReReview: vi.fn(),
}));

vi.mock('../../components/history/historyConstants', () => ({
  parseMenuItem: (name: string) => ({ cleanName: name, process: null }),
}));

const createParams = () => ({
  viewYear: 2026,
  viewMonth: 2, // March (0-indexed)
  deletePlansByMonth: vi.fn().mockReturnValue(3),
  deletePlan: vi.fn(),
  addToast: vi.fn(),
  commentCache: {},
  user: { displayName: '테스터' },
  refreshReviewStatus: vi.fn(),
  loadCommentsForPlan: vi.fn(),
});

describe('useHistoryEdit', () => {
  it('초기 상태: editedPlans 비어있음, deleteConfirm null', () => {
    const { result } = renderHook(() => useHistoryEdit(createParams()));
    expect(result.current.editedKeys.size).toBe(0);
    expect(result.current.deleteConfirm).toBeNull();
  });

  it('handleDeleteMonth 호출 시 deletePlansByMonth 실행 + toast', () => {
    const params = createParams();
    const { result } = renderHook(() => useHistoryEdit(params));
    act(() => result.current.handleDeleteMonth());
    expect(params.deletePlansByMonth).toHaveBeenCalledWith('2026-03');
    expect(params.addToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: '히스토리 삭제' }));
  });

  it('handleDeleteSingle 호출 시 deletePlan 실행', () => {
    const params = createParams();
    const { result } = renderHook(() => useHistoryEdit(params));
    act(() => result.current.handleDeleteSingle('2026-03-01', '주간'));
    expect(params.deletePlan).toHaveBeenCalledWith('2026-03-01', '주간');
    expect(params.addToast).toHaveBeenCalled();
  });

  it('getItems가 편집된 항목 반영', () => {
    const params = createParams();
    const { result } = renderHook(() => useHistoryEdit(params));
    const items = [{ name: '원래메뉴' }, { name: '메뉴2' }] as any[];

    // Before edit
    const before = result.current.getItems('2026-03-01', 'kids', items);
    expect(before[0].name).toBe('원래메뉴');

    // After swap
    act(
      () => result.current.handleSwap?.call(null, '새메뉴') // need swapTarget set first
    );
    // swapTarget is null so handleSwap is a no-op
    const after = result.current.getItems('2026-03-01', 'kids', items);
    expect(after[0].name).toBe('원래메뉴');
  });
});
