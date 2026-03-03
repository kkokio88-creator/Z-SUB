import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMenuFilters } from '../../hooks/useMenuFilters';
import { MenuCategory, Season } from '../../types';

const mockMenuItems = [
  {
    id: '1',
    name: '갈비찜',
    category: MenuCategory.MAIN,
    cost: 3000,
    recommendedPrice: 5000,
    tastes: [],
    season: Season.ALL,
    tags: ['태그A'],
    isSpicy: false,
    mainIngredient: 'beef',
    code: 'M001',
    weight: 200,
    process: 11,
  },
  {
    id: '2',
    name: '된장국',
    category: MenuCategory.SOUP,
    cost: 1000,
    recommendedPrice: 2000,
    tastes: [],
    season: Season.ALL,
    tags: [],
    isSpicy: false,
    mainIngredient: 'tofu',
    code: 'S001',
    weight: 150,
    process: 11,
    isUnused: true,
  },
  {
    id: '3',
    name: '감자샐러드',
    category: MenuCategory.DESSERT,
    cost: 500,
    recommendedPrice: 1000,
    tastes: [],
    season: Season.SPRING,
    tags: [],
    isSpicy: false,
    mainIngredient: 'potato',
    code: 'D001',
    weight: 100,
    process: 11,
  },
];

vi.mock('../../context/MenuContext', () => ({
  useMenu: () => ({
    menuItems: mockMenuItems,
    updateItem: vi.fn(),
    addItem: vi.fn(),
    deleteItems: vi.fn(),
    bulkUpdate: vi.fn(),
    saveToStorage: vi.fn(),
    refreshFromSheet: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: '1', displayName: 'test' } }),
}));

vi.mock('../../context/HistoricalPlansContext', () => ({
  useHistoricalPlans: () => ({ plans: [] }),
}));

vi.mock('../../services/validationService', () => ({
  validateMenuItem: () => ({ isValid: true, errors: [] }),
}));

vi.mock('../../services/auditService', () => ({
  addAuditEntry: vi.fn(),
}));

vi.mock('../../services/autoClassifyService', () => ({
  autoClassifyFull: vi.fn().mockReturnValue([]),
  buildHistoryLookup: vi.fn().mockReturnValue({}),
}));

vi.mock('../../services/syncManager', () => ({
  pushMenuDB: vi.fn().mockResolvedValue({ success: true }),
}));

describe('useMenuFilters', () => {
  it('stats가 전체/사용/미사용 수를 계산', () => {
    const { result } = renderHook(() => useMenuFilters());
    expect(result.current.stats.total).toBe(3);
    expect(result.current.stats.active).toBe(2);
    expect(result.current.stats.unused).toBe(1);
  });

  it('filterCategory 변경 시 filteredItems 필터링', () => {
    const { result } = renderHook(() => useMenuFilters());
    // Default: active only
    expect(result.current.filteredItems.length).toBe(2);
    act(() => result.current.setFilterCategory(MenuCategory.MAIN));
    expect(result.current.filteredItems.length).toBe(1);
    expect(result.current.filteredItems[0].name).toBe('갈비찜');
  });

  it('searchTerm으로 메뉴명 검색', () => {
    const { result } = renderHook(() => useMenuFilters());
    act(() => result.current.setSearchTerm('갈비'));
    expect(result.current.filteredItems.length).toBe(1);
    expect(result.current.filteredItems[0].name).toBe('갈비찜');
  });

  it('handleSort 정렬 방향 토글', () => {
    const { result } = renderHook(() => useMenuFilters());
    act(() => result.current.handleSort('name'));
    expect(result.current.sortField).toBe('name');
    expect(result.current.sortDir).toBe('asc');
    act(() => result.current.handleSort('name'));
    expect(result.current.sortDir).toBe('desc');
  });

  it('toggleSelectItem으로 선택/해제', () => {
    const { result } = renderHook(() => useMenuFilters());
    expect(result.current.selectedIds.size).toBe(0);
    act(() => result.current.toggleSelectItem('1'));
    expect(result.current.selectedIds.has('1')).toBe(true);
    act(() => result.current.toggleSelectItem('1'));
    expect(result.current.selectedIds.has('1')).toBe(false);
  });

  it('page 초기값 0, totalPages 계산', () => {
    const { result } = renderHook(() => useMenuFilters());
    expect(result.current.safePage).toBe(0);
    expect(result.current.totalPages).toBeGreaterThanOrEqual(1);
  });
});
