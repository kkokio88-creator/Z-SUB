import { describe, it, expect } from 'vitest';
import { generateMonthlyMealPlan, getSwapCandidates } from '../services/engine';
import { TargetType, MenuCategory, Season, MenuItem } from '../types';

// 테스트용 인라인 픽스처 (최소한의 메뉴 세트)
const makeItem = (
  id: string,
  name: string,
  category: MenuCategory,
  mainIngredient: string,
  extra?: Partial<MenuItem>
): MenuItem => ({
  id,
  name,
  category,
  cost: 1000,
  recommendedPrice: 3000,
  tastes: [],
  season: Season.ALL,
  tags: [],
  isSpicy: false,
  mainIngredient,
  ...extra,
});

const TEST_MENU: MenuItem[] = [
  // 국/찌개 6종
  makeItem('s1', '된장찌개', MenuCategory.SOUP, 'tofu'),
  makeItem('s2', '미역국', MenuCategory.SOUP, 'seaweed'),
  makeItem('s3', '계란국', MenuCategory.SOUP, 'egg'),
  makeItem('s4', '콩나물국', MenuCategory.SOUP, 'vegetable'),
  makeItem('s5', '감자국', MenuCategory.SOUP, 'potato'),
  makeItem('s6', '어묵국', MenuCategory.SOUP, 'fish'),
  // 메인 6종
  makeItem('m1', '불고기', MenuCategory.MAIN, 'beef'),
  makeItem('m2', '제육볶음', MenuCategory.MAIN, 'pork'),
  makeItem('m3', '닭갈비', MenuCategory.MAIN, 'chicken'),
  makeItem('m4', '생선구이', MenuCategory.MAIN, 'fish'),
  makeItem('m5', '두부조림', MenuCategory.MAIN, 'tofu'),
  makeItem('m6', '계란말이', MenuCategory.MAIN, 'egg'),
  // 반찬 16종 (4주 × 3~4개 필요)
  makeItem('d1', '시금치나물', MenuCategory.SIDE, 'vegetable'),
  makeItem('d2', '콩나물무침', MenuCategory.SIDE, 'vegetable'),
  makeItem('d3', '감자조림', MenuCategory.SIDE, 'potato'),
  makeItem('d4', '멸치볶음', MenuCategory.SIDE, 'fish'),
  makeItem('d5', '김치', MenuCategory.SIDE, 'vegetable'),
  makeItem('d6', '무나물', MenuCategory.SIDE, 'vegetable'),
  makeItem('d7', '호박볶음', MenuCategory.SIDE, 'vegetable'),
  makeItem('d8', '어묵볶음', MenuCategory.SIDE, 'fish'),
  makeItem('d9', '미역줄기볶음', MenuCategory.SIDE, 'seaweed'),
  makeItem('d10', '깻잎장아찌', MenuCategory.SIDE, 'vegetable'),
  makeItem('d11', '브로콜리무침', MenuCategory.SIDE, 'vegetable'),
  makeItem('d12', '우엉조림', MenuCategory.SIDE, 'vegetable'),
  makeItem('d13', '연근조림', MenuCategory.SIDE, 'vegetable'),
  makeItem('d14', '도라지무침', MenuCategory.SIDE, 'vegetable'),
  makeItem('d15', '고구마줄기', MenuCategory.SIDE, 'vegetable'),
  makeItem('d16', '가지볶음', MenuCategory.SIDE, 'vegetable'),
];

describe('generateMonthlyMealPlan', () => {
  const activeMenu = TEST_MENU;

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
    const activeMenu = TEST_MENU;
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
