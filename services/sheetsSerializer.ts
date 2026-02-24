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

// ── 아이식단 적합 메뉴 자동 감지 ──
// 아이들이 거부감 없이 먹을 수 있는 순한 맛 위주의 메뉴 판별
const KIDS_EXCLUDE_KEYWORDS = [
  '고추장',
  '매콤',
  '매운',
  '청양',
  '얼큰',
  '두루치기',
  '짜글이',
  '고들빼기',
  '곤드레',
  '취나물',
  '마늘종',
  '마늘쫑',
  '피마자',
  '쑥갓',
  '시래기된장지짐',
  '생채',
  '무말랭이',
  '겉절이',
  '파래김',
  '부추',
  '봄나물',
  '달래',
  '양배추와맛쌈장',
];
const KIDS_FRIENDLY_KEYWORDS = [
  '아이들',
  '불고기',
  '잡채',
  '함박',
  '돈까스',
  '스테이크',
  '계란',
  '달걀',
  '감자',
  '고구마',
  '소세지',
  '소시지',
  '떡갈비',
  '볶음밥',
  '덮밥',
  '오므라이스',
  '카레',
  '커리',
  '탕수',
  '미트볼',
  '장조림',
  '어묵',
  '계란말이',
  '미역국',
  '된장국',
  '콩나물국',
  '곰탕',
  '사골',
  '두부',
  '마카로니',
  '파스타',
  '까르보나라',
  '천사채',
  '옥수수',
  '참치',
  '주먹밥',
  '토마토',
  '궁중떡볶이',
  '간장',
  '케찹',
  '맛살',
  '새우',
  '샐러드',
  '피클',
  '메추리알',
  '버섯볶음',
  '애호박',
  '감자채',
  '감자햄',
  '양배추햄',
  '한우두부',
  '한우무',
  '한우표고',
  '한우가지',
  '한돈가지',
  '보리새우간장',
  '숙주나물',
  '콩나물무침',
  '무나물',
  '가지나물',
  '깻잎순된장',
  '브로콜리',
  '닭가슴살두부',
  '영양과채',
  '저당메추리알',
  '닭곰탕',
  '배추된장국',
  '소고기무국',
  '맑은',
  '순한',
  '황태미역국',
  '콩나물황태국',
  '배추국',
  '보리새우아욱국',
  '시래기된장국',
  '동그랑땡',
  '짜장',
  '소고기야채',
];

// ── 시니어 적합 메뉴 자동 감지 ──
const SENIOR_EXCLUDE_KEYWORDS = [
  '오징어',
  '쥐포',
  '마른오징어',
  '육포',
  '진미채', // 질긴 것
  '돈까스',
  '탕수육',
  '탕수',
  '튀김',
  '깐풍',
  '커틀릿', // 튀김류
  '파스타',
  '스테이크',
  '까르보나라',
  '마카로니', // 서양/퓨전
  '피자',
  '치킨',
  '함박',
  '핫도그',
  '떡볶이',
  '궁중떡볶이', // 질긴 떡류
];
const SENIOR_FRIENDLY_KEYWORDS = [
  '시금치',
  '고사리',
  '도라지',
  '취나물',
  '곤드레', // 전통 나물
  '숙주',
  '콩나물',
  '미나리',
  '냉이',
  '달래',
  '씀바귀',
  '무나물',
  '고구마순',
  '호박잎',
  '부추',
  '깻잎',
  '감자조림',
  '우엉조림',
  '연근조림',
  '장조림',
  '두부조림', // 부드러운 조림
  '멸치볶음',
  '어묵볶음', // 전통 볶음
  '된장',
  '미역국',
  '곰탕',
  '설렁탕',
  '사골', // 전통국
  '시래기',
  '배추국',
  '소고기무국',
  '황태',
  '두부',
  '순두부',
  '두부전', // 두부류
  '호박전',
  '동그랑땡',
  '김치전',
  '부추전', // 전류
  '나물무침',
  '무침',
  '나물', // 무침/나물
  '깍두기',
  '백김치',
  '총각',
  '배추김치', // 김치류
];

export function isSeniorFriendly(name: string, isSpicy: boolean): boolean {
  if (isSpicy) return false;
  const normalized = name.replace(/\s+/g, '');
  if (SENIOR_EXCLUDE_KEYWORDS.some(kw => normalized.includes(kw))) return false;
  if (SENIOR_FRIENDLY_KEYWORDS.some(kw => normalized.includes(kw))) return true;
  return false;
}

export function isKidFriendly(name: string, isSpicy: boolean): boolean {
  if (isSpicy) return false;
  if (name.startsWith('아이들')) return true;
  const normalized = name.replace(/\s+/g, '');
  if (KIDS_EXCLUDE_KEYWORDS.some(kw => normalized.includes(kw))) return false;
  if (KIDS_FRIENDLY_KEYWORDS.some(kw => normalized.includes(kw))) return true;
  return false;
}

// 셀 배열 -> MenuItem (실제 반찬 시트 형식)
export const rowToMenuItem = (row: string[], index: number = 0): MenuItem => {
  const gubun = (row[0] || '').trim();
  // 비고(column[11])에서 쉼표 구분 태그 파싱
  const rawNote = row[11] ? row[11].trim() : '';
  const noteTags = rawNote
    ? rawNote
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : [];
  const tags = [...noteTags, gubun && !GUBUN_TO_CATEGORY[gubun] ? gubun : ''].filter(Boolean);

  // 아이식단 적합 메뉴 자동 태깅
  const menuName = (row[1] || '').trim();
  const spicy = row[9] === 'TRUE';
  if (isKidFriendly(menuName, spicy) && !tags.includes('아이선호')) {
    tags.push('아이선호');
  }
  // 시니어 적합 메뉴 자동 태깅
  if (isSeniorFriendly(menuName, spicy) && !tags.includes('시니어')) {
    tags.push('시니어');
  }

  // 태그 중복 제거 (시트 비고 컬럼에 중복 입력 또는 자동 태깅 중복 방지)
  const uniqueTags = [...new Set(tags)];

  return {
    id: row[3] ? row[3].trim() : `item_${index}`,
    code: row[3] ? row[3].trim() : undefined,
    name: menuName,
    category: GUBUN_TO_CATEGORY[gubun] || MenuCategory.SIDE,
    cost: parseNumber(row[6]),
    recommendedPrice: parseNumber(row[5]),
    tastes: [],
    season: Season.ALL,
    tags: uniqueTags,
    isSpicy: spicy,
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
