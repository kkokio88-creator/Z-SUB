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
  tastes: [TasteProfile.GANJANG],
  season: Season.ALL,
  tags: ['아이선호', '부드러움'],
  isSpicy: false,
  mainIngredient: 'seaweed',
  process: 11,
  weight: 600,
  isUnused: false,
};

describe('menuItemToRow', () => {
  it('MenuItem -> row 직렬화 (내부 형식)', () => {
    const row = menuItemToRow(sampleItem);
    expect(row).toHaveLength(MENU_DB_HEADERS.length);
    expect(row[0]).toBe('S001'); // id
    expect(row[1]).toBe('ZIP_P_1001'); // code
    expect(row[2]).toBe('황태미역국'); // name
    expect(row[3]).toBe(MenuCategory.SOUP); // category
    expect(row[4]).toBe('1342'); // cost
    expect(row[5]).toBe('3000'); // recommendedPrice
    expect(row[6]).toBe('간장'); // tastes
    expect(row[7]).toBe(Season.ALL); // season
    expect(row[8]).toBe('아이선호,부드러움'); // tags
    expect(row[9]).toBe('false'); // isSpicy
    expect(row[10]).toBe('seaweed'); // mainIngredient
    expect(row[11]).toBe('11'); // process
    expect(row[12]).toBe('600'); // weight
    expect(row[13]).toBe('false'); // isUnused
    expect(row[14]).toBe(''); // imageUrl
  });

  it('빈 optional 필드 처리', () => {
    const minimalItem: MenuItem = {
      ...sampleItem,
      code: undefined,
      process: undefined,
      weight: undefined,
      imageUrl: undefined,
    };
    const row = menuItemToRow(minimalItem);
    expect(row[1]).toBe(''); // code empty
    expect(row[11]).toBe('0'); // process default 0
    expect(row[12]).toBe('0'); // weight default 0
    expect(row[14]).toBe(''); // imageUrl empty
  });

  it('isSpicy true 직렬화', () => {
    const spicyItem = { ...sampleItem, isSpicy: true };
    const row = menuItemToRow(spicyItem);
    expect(row[9]).toBe('true');
  });

  it('여러 맛 프로필 쉼표 구분', () => {
    const item = { ...sampleItem, tastes: [TasteProfile.GOCHUJANG, TasteProfile.DOENJANG] };
    const row = menuItemToRow(item);
    expect(row[6]).toBe('고추장,된장');
  });

  it('imageUrl이 있으면 보존', () => {
    const itemWithImage = { ...sampleItem, imageUrl: 'https://example.com/img.jpg' };
    const row = menuItemToRow(itemWithImage);
    expect(row[14]).toBe('https://example.com/img.jpg');
  });

  it('tags가 빈 배열이면 빈 문자열로 직렬화', () => {
    const itemNoTags = { ...sampleItem, tags: [] as string[] };
    const row = menuItemToRow(itemNoTags);
    expect(row[8]).toBe('');
  });

  it('isUnused true 직렬화', () => {
    const unusedItem = { ...sampleItem, isUnused: true };
    const row = menuItemToRow(unusedItem);
    expect(row[13]).toBe('true');
  });
});

describe('rowToMenuItem (Google Sheets 형식)', () => {
  // Google Sheets 형식: [0]구분 [1]메뉴명 [2]공정 [3]품목코드 [4]용량(g) [5]가격 [6]원가
  // [7]시즌 [8]미사용 [9]매운맛 [10]대용량갯수 [11]비고
  it('시트 행 -> MenuItem 변환', () => {
    const sheetRow = ['국', '황태미역국', '11', 'ZIP_P_1001', '600', '3000', '1342', '', '', '', '', ''];
    const item = rowToMenuItem(sheetRow);
    expect(item.name).toBe('황태미역국');
    expect(item.category).toBe(MenuCategory.SOUP);
    expect(item.cost).toBe(1342);
    expect(item.recommendedPrice).toBe(3000);
    expect(item.process).toBe(11);
    expect(item.weight).toBe(600);
    expect(item.mainIngredient).toBe('fish'); // '황태미역국' → fish (황태 matches fish keywords)
  });

  it('매운맛 TRUE 파싱', () => {
    const row = ['메인', '고추장불고기', '11', 'M001', '500', '5000', '2000', '', '', 'TRUE', '', ''];
    const item = rowToMenuItem(row);
    expect(item.isSpicy).toBe(true);
  });

  it('미사용 TRUE 파싱', () => {
    const row = ['국', '된장찌개', '11', 'S002', '600', '3000', '1000', '', 'TRUE', '', '', ''];
    const item = rowToMenuItem(row);
    expect(item.isUnused).toBe(true);
  });

  it('비고 컬럼 태그 파싱', () => {
    const row = ['국', '미역국', '11', 'S003', '600', '3000', '1000', '', '', '', '', '유기농,국내산'];
    const item = rowToMenuItem(row);
    expect(item.tags).toContain('유기농');
    expect(item.tags).toContain('국내산');
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

  it('bannedTags/requiredTags 빈 배열 처리', () => {
    const emptyTagsConfig = { ...sampleConfig, bannedTags: [] as string[], requiredTags: [] as string[] };
    const row = configToRow(emptyTagsConfig);
    const restored = rowToConfig(row);
    expect(restored.bannedTags).toEqual([]);
    expect(restored.requiredTags).toEqual([]);
  });

  it('composition 값이 0인 카테고리 처리', () => {
    const zeroComp = {
      ...sampleConfig,
      composition: {
        [MenuCategory.SOUP]: 0,
        [MenuCategory.MAIN]: 2,
        [MenuCategory.SIDE]: 0,
      },
    };
    const row = configToRow(zeroComp);
    const restored = rowToConfig(row);
    expect(restored.composition[MenuCategory.SOUP]).toBe(0);
    expect(restored.composition[MenuCategory.MAIN]).toBe(2);
    expect(restored.composition[MenuCategory.SIDE]).toBe(0);
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
