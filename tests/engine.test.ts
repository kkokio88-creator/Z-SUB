import { describe, it, expect } from 'vitest';
import { generateMonthlyMealPlan, getSwapCandidates } from '../services/engine';
import { MOCK_MENU_DB } from '../constants';
import { TargetType, MenuCategory } from '../types';

describe('generateMonthlyMealPlan', () => {
  const activeMenu = MOCK_MENU_DB.filter(item => !item.isUnused);

  it('아이 식단 4주 생성', () => {
    const plan = generateMonthlyMealPlan(TargetType.KIDS, '3월', '화수목', true, activeMenu);
    expect(plan.weeks).toHaveLength(4);
    expect(plan.target).toBe(TargetType.KIDS);
    expect(plan.cycleType).toBe('화수목');
  });

  it('각 주차에 올바른 구성(국1, 메인1, 반찬3) 생성', () => {
    const plan = generateMonthlyMealPlan(TargetType.KIDS, '3월', '화수목', false, activeMenu);
    plan.weeks.forEach(week => {
      const soups = week.items.filter(i => i.category === MenuCategory.SOUP);
      const mains = week.items.filter(i => i.category === MenuCategory.MAIN);
      const sides = week.items.filter(i => i.category === MenuCategory.SIDE);
      expect(soups).toHaveLength(1);
      expect(mains).toHaveLength(1);
      expect(sides).toHaveLength(3);
    });
  });

  it('아이 식단에 매운 메뉴 미포함', () => {
    const plan = generateMonthlyMealPlan(TargetType.KIDS, '3월', '화수목', false, activeMenu);
    plan.weeks.forEach(week => {
      week.items.forEach(item => {
        expect(item.isSpicy).toBe(false);
      });
    });
  });

  it('중복 체크 활성화 시 동일 메뉴 중복 없음', () => {
    const plan = generateMonthlyMealPlan(TargetType.KIDS, '3월', '화수목', true, activeMenu);
    const allIds = plan.weeks.flatMap(w => w.items.map(i => i.id));
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });
});

describe('getSwapCandidates', () => {
  it('같은 카테고리의 교체 후보만 반환', () => {
    const activeMenu = MOCK_MENU_DB.filter(item => !item.isUnused);
    const plan = generateMonthlyMealPlan(TargetType.VALUE, '3월', '화수목', false, activeMenu);
    const soupItem = plan.weeks[0].items.find(i => i.category === MenuCategory.SOUP);

    if (soupItem) {
      const candidates = getSwapCandidates(plan, soupItem, 1, activeMenu);
      candidates.forEach(c => {
        expect(c.category).toBe(MenuCategory.SOUP);
        expect(c.id).not.toBe(soupItem.id);
      });
    }
  });
});
