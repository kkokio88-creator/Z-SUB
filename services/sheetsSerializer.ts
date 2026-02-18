// TypeScript 객체 <-> Google Sheets 셀 배열 변환 서비스
import {
  MenuItem,
  MenuCategory,
  Season,
  TasteProfile,
  MealPlanConfig,
  MonthlyMealPlan,
  TargetType,
  HistoricalMealPlan,
  HistoricalTargetPlan,
  HistoricalMenuItem,
  CycleType,
} from '../types';

// 배열을 쉼표 구분 문자열로 변환
const arrayToCell = (arr: string[]): string => arr.join(',');
const cellToArray = (cell: string): string[] =>
  cell
    ? cell
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : [];

// MenuItem -> 셀 배열 (1행)
export const menuItemToRow = (item: MenuItem): string[] => [
  item.id,
  item.code || '',
  item.name,
  item.category,
  String(item.cost),
  String(item.recommendedPrice),
  arrayToCell(item.tastes),
  item.season,
  arrayToCell(item.tags),
  String(item.isSpicy),
  item.mainIngredient,
  String(item.process || 0),
  String(item.weight || 0),
  String(item.isUnused || false),
  item.imageUrl || '',
];

// ── 실제 반찬 시트 컬럼 매핑 ──
// [0]구분 [1]메뉴명 [2]공정 [3]품목코드 [4]용량(g) [5]가격 [6]원가
// [7]시즌 [8]미사용 [9]매운맛 [10]대용량갯수 [11]비고

// 메뉴명 기반 주재료 감지
const INGREDIENT_KEYWORDS: Record<string, string[]> = {
  beef: ['소고기', '한우', '불고기', '갈비', '사골', '차돌', '설렁탕'],
  pork: ['한돈', '돼지', '제육', '삼겹', '탕수', '수육', '족발', '보쌈'],
  chicken: ['닭', '치킨', '닭볶음', '닭갈비'],
  fish: ['동태', '오징어', '새우', '어묵', '참치', '멸치', '황태', '맛살', '고등어', '갈치', '조기', '꽁치', '연어'],
  tofu: ['두부', '순두부'],
  egg: ['계란', '달걀', '메추리알', '에그'],
  potato: ['감자', '고구마'],
  seaweed: ['미역', '파래', '김무침', '다시마', '해초'],
  mushroom: ['버섯', '표고', '느타리', '팽이', '새송이'],
};

export function detectMainIngredient(name: string): string {
  for (const [ingredient, keywords] of Object.entries(INGREDIENT_KEYWORDS)) {
    if (keywords.some(kw => name.includes(kw))) return ingredient;
  }
  return 'vegetable';
}

const GUBUN_TO_CATEGORY: Record<string, MenuCategory> = {
  국: MenuCategory.SOUP,
  시즌국: MenuCategory.SOUP,
  메인: MenuCategory.MAIN,
  밥류: MenuCategory.MAIN,
  볶음: MenuCategory.SIDE,
  조림: MenuCategory.SIDE,
  무침: MenuCategory.SIDE,
  전: MenuCategory.SIDE,
  장아찌: MenuCategory.SIDE,
  김치: MenuCategory.SIDE,
  협업: MenuCategory.DESSERT,
};

const parseNumber = (val: string | undefined): number => {
  if (!val) return 0;
  return Number(val.replace(/,/g, '')) || 0;
};

// 셀 배열 -> MenuItem (실제 반찬 시트 형식)
export const rowToMenuItem = (row: string[], index: number = 0): MenuItem => {
  const gubun = (row[0] || '').trim();
  const tags = [row[11] ? row[11].trim() : '', gubun && !GUBUN_TO_CATEGORY[gubun] ? gubun : ''].filter(Boolean);

  return {
    id: row[3] ? row[3].trim() : `item_${index}`,
    code: row[3] ? row[3].trim() : undefined,
    name: (row[1] || '').trim(),
    category: GUBUN_TO_CATEGORY[gubun] || MenuCategory.SIDE,
    cost: parseNumber(row[6]),
    recommendedPrice: parseNumber(row[5]),
    tastes: [],
    season: Season.ALL,
    tags,
    isSpicy: row[9] === 'TRUE',
    mainIngredient: detectMainIngredient((row[1] || '').trim()),
    process: Number(row[2]) || 0,
    weight: parseNumber(row[4]),
    isUnused: row[8] === 'TRUE',
  };
};

// 메뉴DB 헤더
export const MENU_DB_HEADERS = [
  'id',
  'code',
  'name',
  'category',
  'cost',
  'recommendedPrice',
  'tastes',
  'season',
  'tags',
  'isSpicy',
  'mainIngredient',
  'process',
  'weight',
  'isUnused',
  'imageUrl',
];

// MealPlanConfig -> 셀 배열
export const configToRow = (config: MealPlanConfig): string[] => [
  config.target,
  String(config.budgetCap),
  String(config.targetPrice),
  String(config.targetCostRatio),
  String(config.composition['국/찌개'] || 0),
  String(config.composition['메인요리'] || 0),
  String(config.composition['밑반찬'] || 0),
  arrayToCell(config.bannedTags),
  arrayToCell(config.requiredTags),
  config.parentTarget || '',
];

// 셀 배열 -> MealPlanConfig
export const rowToConfig = (row: string[]): MealPlanConfig => ({
  target: row[0] as TargetType,
  budgetCap: Number(row[1]) || 0,
  targetPrice: Number(row[2]) || 0,
  targetCostRatio: Number(row[3]) || 0,
  composition: {
    [MenuCategory.SOUP]: Number(row[4]) || 0,
    [MenuCategory.MAIN]: Number(row[5]) || 0,
    [MenuCategory.SIDE]: Number(row[6]) || 0,
  },
  bannedTags: cellToArray(row[7]),
  requiredTags: cellToArray(row[8]),
  parentTarget: (row[9] as TargetType) || undefined,
});

export const CONFIG_HEADERS = [
  'target',
  'budgetCap',
  'targetPrice',
  'targetCostRatio',
  'soupCount',
  'mainCount',
  'sideCount',
  'bannedTags',
  'requiredTags',
  'parentTarget',
];

// MonthlyMealPlan -> flat rows (식단데이터 시트용)
export const mealPlanToRows = (plan: MonthlyMealPlan): string[][] => {
  const rows: string[][] = [];
  for (const week of plan.weeks) {
    for (let pos = 0; pos < week.items.length; pos++) {
      const item = week.items[pos];
      rows.push([
        plan.id,
        plan.monthLabel,
        plan.cycleType,
        plan.target,
        String(week.weekIndex),
        item.id,
        item.name,
        item.category,
        String(item.cost),
        String(pos),
        new Date().toISOString(),
      ]);
    }
  }
  return rows;
};

export const MEAL_PLAN_HEADERS = [
  'planId',
  'monthLabel',
  'cycleType',
  'target',
  'weekIndex',
  'menuItemId',
  'menuItemName',
  'category',
  'cost',
  'position',
  'createdAt',
];

// ── 식단_히스토리 시트 → HistoricalMealPlan[] 변환 ──
// 와이드 포맷: [0-9]메타, [10+]타겟별 12컬럼(메뉴명,공정,품목코드,가격,원가,미사용,...)
// 헤더 row[0]: "실속 식단메뉴명", "실속 식단공정", ... → 타겟명 추출
// 데이터 row[3]=날짜(YYYY-MM-DD), row[4]=요일(화수목/금토월)

const COLS_PER_TARGET = 12;
const DATA_START_COL = 10;

export const rowsToHistoricalPlans = (allRows: string[][]): HistoricalMealPlan[] => {
  if (allRows.length < 3) return [];

  // 헤더(row 0)에서 타겟명 추출
  const headerRow = allRows[0];
  const targetNames: string[] = [];
  for (let col = DATA_START_COL; col < headerRow.length; col += COLS_PER_TARGET) {
    const cell = headerRow[col] || '';
    const name = cell.replace(/메뉴명$/, '').trim();
    if (name) targetNames.push(name);
  }

  if (targetNames.length === 0) return [];

  // 데이터 행은 row[2]부터 (row[0]=헤더, row[1]=서브헤더)
  const dataRows = allRows.slice(2);
  const planMap = new Map<string, HistoricalMealPlan>();

  for (const row of dataRows) {
    const date = row[3];
    const cycleRaw = row[4];
    if (!date || !cycleRaw || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const cycleType = (cycleRaw === '금토월' ? '금토월' : '화수목') as CycleType;
    const key = `${date}|${cycleType}`;

    if (!planMap.has(key)) {
      planMap.set(key, { date, cycleType, targets: [] });
    }
    const plan = planMap.get(key)!;

    for (let ti = 0; ti < targetNames.length; ti++) {
      const baseCol = DATA_START_COL + ti * COLS_PER_TARGET;
      const menuName = (row[baseCol] || '').trim();
      if (!menuName) continue;

      const targetName = targetNames[ti];
      const matchedTarget = Object.values(TargetType).find(t => t === targetName) || (targetName as TargetType);

      let targetPlan = plan.targets.find(t => t.targetType === matchedTarget);
      if (!targetPlan) {
        targetPlan = { targetType: matchedTarget, items: [], totalPrice: 0, totalCost: 0, itemCount: 0 };
        plan.targets.push(targetPlan);
      }

      const item: HistoricalMenuItem = {
        name: menuName,
        process: Number(row[baseCol + 1]) || 0,
        code: row[baseCol + 2] || '',
        price: parseNumber(row[baseCol + 3]),
        cost: parseNumber(row[baseCol + 4]),
      };
      targetPlan.items.push(item);
      targetPlan.totalPrice += item.price;
      targetPlan.totalCost += item.cost;
      targetPlan.itemCount = targetPlan.items.length;
    }
  }

  return Array.from(planMap.values()).sort((a, b) => a.date.localeCompare(b.date));
};

export const HISTORICAL_PLAN_HEADERS = ['date', 'cycleType', 'target', 'menuName', 'process', 'code', 'price', 'cost'];
