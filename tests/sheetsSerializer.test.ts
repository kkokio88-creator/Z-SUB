import { describe, it, expect } from 'vitest';
import {
  menuItemToRow,
  rowToMenuItem,
  configToRow,
  rowToConfig,
  mealPlanToRows,
  MENU_DB_HEADERS,
  CONFIG_HEADERS,
  MEAL_PLAN_HEADERS,
} from '../services/sheetsSerializer';
import { MenuCategory, Season, TasteProfile, TargetType } from '../types';
import type { MenuItem, MealPlanConfig, MonthlyMealPlan } from '../types';

const sampleItem: MenuItem = {
  id: 'S001',
  code: 'ZIP_P_1001',
  name: '황태미역국',
  category: MenuCategory.SOUP,
  cost: 1342,
  recommendedPrice: 3000,
  tastes: [TasteProfile.BLAND],
  season: Season.ALL,
  tags: ['아이선호', '부드러움'],
  isSpicy: false,
  mainIngredient: 'seaweed',
  process: 11,
  weight: 600,
  isUnused: false,
};

describe('menuItemToRow / rowToMenuItem', () => {
  it('MenuItem -> row -> MenuItem 왕복 변환', () => {
    const row = menuItemToRow(sampleItem);
    expect(row).toHaveLength(MENU_DB_HEADERS.length);
    expect(row[0]).toBe('S001');
    expect(row[2]).toBe('황태미역국');
    expect(row[4]).toBe('1342');

    const restored = rowToMenuItem(row);
    expect(restored.id).toBe(sampleItem.id);
    expect(restored.name).toBe(sampleItem.name);
    expect(restored.category).toBe(sampleItem.category);
    expect(restored.cost).toBe(sampleItem.cost);
    expect(restored.recommendedPrice).toBe(sampleItem.recommendedPrice);
    expect(restored.tastes).toEqual(sampleItem.tastes);
    expect(restored.season).toBe(sampleItem.season);
    expect(restored.tags).toEqual(sampleItem.tags);
    expect(restored.isSpicy).toBe(sampleItem.isSpicy);
    expect(restored.mainIngredient).toBe(sampleItem.mainIngredient);
  });

  it('빈 optional 필드 처리', () => {
    const minimalItem: MenuItem = {
      ...sampleItem,
      code: undefined,
      process: undefined,
      weight: undefined,
      isUnused: undefined,
      imageUrl: undefined,
    };
    const row = menuItemToRow(minimalItem);
    const restored = rowToMenuItem(row);
    expect(restored.code).toBeUndefined();
    expect(restored.process).toBe(0);
    expect(restored.weight).toBe(0);
  });

  it('isSpicy boolean 직렬화', () => {
    const spicyItem = { ...sampleItem, isSpicy: true };
    const row = menuItemToRow(spicyItem);
    expect(row[9]).toBe('true');
    const restored = rowToMenuItem(row);
    expect(restored.isSpicy).toBe(true);
  });

  it('여러 맛 프로필 쉼표 구분', () => {
    const item = { ...sampleItem, tastes: [TasteProfile.SPICY, TasteProfile.SWEET] };
    const row = menuItemToRow(item);
    expect(row[6]).toBe('매운맛,달콤함');
    const restored = rowToMenuItem(row);
    expect(restored.tastes).toEqual([TasteProfile.SPICY, TasteProfile.SWEET]);
  });
});

describe('configToRow / rowToConfig', () => {
  const sampleConfig: MealPlanConfig = {
    target: TargetType.KIDS,
    budgetCap: 11040,
    targetPrice: 36800,
    targetCostRatio: 30,
    composition: {
      [MenuCategory.SOUP]: 1,
      [MenuCategory.MAIN]: 1,
      [MenuCategory.SIDE]: 3,
    },
    bannedTags: ['매운맛', '얼큰함'],
    requiredTags: ['아이선호'],
  };

  it('Config -> row -> Config 왕복 변환', () => {
    const row = configToRow(sampleConfig);
    expect(row).toHaveLength(CONFIG_HEADERS.length);
    expect(row[0]).toBe(TargetType.KIDS);

    const restored = rowToConfig(row);
    expect(restored.target).toBe(TargetType.KIDS);
    expect(restored.budgetCap).toBe(11040);
    expect(restored.targetPrice).toBe(36800);
    expect(restored.targetCostRatio).toBe(30);
    expect(restored.composition[MenuCategory.SOUP]).toBe(1);
    expect(restored.composition[MenuCategory.MAIN]).toBe(1);
    expect(restored.composition[MenuCategory.SIDE]).toBe(3);
    expect(restored.bannedTags).toEqual(['매운맛', '얼큰함']);
    expect(restored.requiredTags).toEqual(['아이선호']);
  });

  it('parentTarget 있는 경우', () => {
    const childConfig = { ...sampleConfig, parentTarget: TargetType.KIDS };
    const row = configToRow(childConfig);
    const restored = rowToConfig(row);
    expect(restored.parentTarget).toBe(TargetType.KIDS);
  });

  it('parentTarget 없는 경우 undefined', () => {
    const row = configToRow(sampleConfig);
    const restored = rowToConfig(row);
    expect(restored.parentTarget).toBeFalsy();
  });
});

describe('mealPlanToRows', () => {
  it('식단 플랜을 flat rows로 변환', () => {
    const plan: MonthlyMealPlan = {
      id: 'plan-1',
      monthLabel: '3월',
      cycleType: '화수목',
      target: TargetType.KIDS,
      weeks: [
        {
          weekIndex: 1,
          items: [sampleItem, { ...sampleItem, id: 'M001', name: '소고기볶음', category: MenuCategory.MAIN }],
          totalCost: 5000,
          totalPrice: 11000,
          isValid: true,
          warnings: [],
        },
      ],
    };
    const rows = mealPlanToRows(plan);
    expect(rows).toHaveLength(2);
    expect(rows[0][0]).toBe('plan-1');
    expect(rows[0][1]).toBe('3월');
    expect(rows[0][4]).toBe('1');
    expect(rows[0][5]).toBe('S001');
    expect(rows[1][5]).toBe('M001');
  });

  it('MEAL_PLAN_HEADERS 길이와 일치', () => {
    const plan: MonthlyMealPlan = {
      id: 'plan-1',
      monthLabel: '3월',
      cycleType: '화수목',
      target: TargetType.KIDS,
      weeks: [
        {
          weekIndex: 1,
          items: [sampleItem],
          totalCost: 1342,
          totalPrice: 3000,
          isValid: true,
          warnings: [],
        },
      ],
    };
    const rows = mealPlanToRows(plan);
    expect(rows[0]).toHaveLength(MEAL_PLAN_HEADERS.length);
  });
});
