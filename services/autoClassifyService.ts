import { MenuCategory, MenuItem, HistoricalMealPlan } from '../types';

// 메뉴명 키워드 → 카테고리 매핑
const CATEGORY_KEYWORDS: { category: MenuCategory; keywords: string[] }[] = [
  {
    category: MenuCategory.SOUP,
    keywords: ['국', '찌개', '탕', '전골', '수프', '미역국', '된장국', '김치찌개', '부대찌개', '순두부찌개'],
  },
  {
    category: MenuCategory.MAIN,
    keywords: [
      '구이',
      '튀김',
      '전',
      '까스',
      '돈까스',
      '탕수',
      '불고기',
      '갈비',
      '스테이크',
      '커틀릿',
      '장조림',
      '제육',
      '닭볶음',
      '떡갈비',
    ],
  },
  {
    category: MenuCategory.SIDE,
    keywords: ['볶음', '나물', '무침', '조림', '절임', '샐러드', '김치', '젓갈', '장아찌', '겉절이', '잡채'],
  },
  {
    category: MenuCategory.DESSERT,
    keywords: ['떡', '과일', '요거트', '젤리', '케이크', '빵', '고구마', '감자', '옥수수'],
  },
];

// 메뉴명 키워드 → 주재료 매핑
const INGREDIENT_KEYWORDS: { ingredient: string; keywords: string[] }[] = [
  { ingredient: 'beef', keywords: ['소고기', '한우', '불고기', '갈비', '사골', '차돌', '우삼겹', '소불고기'] },
  {
    ingredient: 'pork',
    keywords: ['한돈', '돼지', '제육', '삼겹', '탕수', '돈까스', '수육', '보쌈', '족발', '돈불고기'],
  },
  { ingredient: 'chicken', keywords: ['닭', '치킨', '닭볶음', '닭갈비', '닭강정', '닭가슴'] },
  {
    ingredient: 'fish',
    keywords: [
      '동태',
      '오징어',
      '새우',
      '어묵',
      '참치',
      '멸치',
      '황태',
      '맛살',
      '고등어',
      '꽁치',
      '갈치',
      '조기',
      '연어',
      '생선',
    ],
  },
  { ingredient: 'tofu', keywords: ['두부', '순두부'] },
  { ingredient: 'egg', keywords: ['계란', '달걀', '메추리알', '에그'] },
  { ingredient: 'potato', keywords: ['감자', '고구마'] },
  { ingredient: 'seaweed', keywords: ['미역', '파래', '김무침', '다시마', '해초'] },
  { ingredient: 'mushroom', keywords: ['버섯', '표고', '느타리', '팽이', '새송이'] },
  {
    ingredient: 'vegetable',
    keywords: ['나물', '시래기', '애호박', '양배추', '콩나물', '숙주', '브로콜리', '시금치', '깻잎', '상추'],
  },
];

export interface AutoClassifyResult {
  category?: MenuCategory;
  mainIngredient?: string;
}

export function autoClassifyMenu(name: string): AutoClassifyResult {
  const result: AutoClassifyResult = {};

  // 카테고리 추천
  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some(kw => name.includes(kw))) {
      result.category = category;
      break;
    }
  }

  // 주재료 추천
  for (const { ingredient, keywords } of INGREDIENT_KEYWORDS) {
    if (keywords.some(kw => name.includes(kw))) {
      result.mainIngredient = ingredient;
      break;
    }
  }

  return result;
}

// 메뉴명 정규화 (태그, 후미 숫자 제거)
const normalizeMenuName = (name: string): string =>
  name
    .replace(/_냉장|_반조리|_냉동/g, '')
    .replace(/\s+\d+$/, '')
    .trim();

// 히스토리에서 메뉴별 가격/원가 정보 수집
export interface HistoryMenuInfo {
  price: number;
  cost: number;
  count: number; // 출현 횟수
}

export function buildHistoryLookup(historicalPlans: HistoricalMealPlan[]): Map<string, HistoryMenuInfo> {
  const lookup = new Map<string, { prices: number[]; costs: number[] }>();

  for (const plan of historicalPlans) {
    for (const target of plan.targets) {
      for (const item of target.items) {
        const clean = normalizeMenuName(item.name);
        if (!clean) continue;
        const existing = lookup.get(clean) || { prices: [], costs: [] };
        if (item.price > 0) existing.prices.push(item.price);
        if (item.cost > 0) existing.costs.push(item.cost);
        lookup.set(clean, existing);
      }
    }
  }

  const result = new Map<string, HistoryMenuInfo>();
  for (const [name, data] of lookup) {
    if (data.prices.length === 0 && data.costs.length === 0) continue;
    // 가장 최근 값(마지막)을 기본으로, 여러번 나왔으면 중앙값 사용
    const median = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    };
    result.set(name, {
      price: median(data.prices),
      cost: median(data.costs),
      count: data.prices.length || data.costs.length,
    });
  }

  return result;
}

// 전체 자동분류: 카테고리 + 주재료 + 원가/가격 (히스토리 기반)
export interface FullAutoClassifyChange {
  id: string;
  category?: MenuCategory;
  mainIngredient?: string;
  cost?: number;
  recommendedPrice?: number;
  fieldsChanged: string[];
}

export function autoClassifyFull(
  items: MenuItem[],
  historyLookup: Map<string, HistoryMenuInfo>
): FullAutoClassifyChange[] {
  const results: FullAutoClassifyChange[] = [];

  for (const item of items) {
    const classified = autoClassifyMenu(item.name);
    const clean = normalizeMenuName(item.name);
    const historyInfo = historyLookup.get(clean);
    const change: FullAutoClassifyChange = { id: item.id, fieldsChanged: [] };

    // 주재료: 기본값(vegetable)이고 키워드로 더 정확한 값이 있으면 변경
    if (item.mainIngredient === 'vegetable' && classified.mainIngredient && classified.mainIngredient !== 'vegetable') {
      change.mainIngredient = classified.mainIngredient;
      change.fieldsChanged.push('주재료');
    }

    // 카테고리: 키워드 기반 추천이 현재와 다르면 변경
    if (classified.category && classified.category !== item.category) {
      change.category = classified.category;
      change.fieldsChanged.push('카테고리');
    }

    // 원가: 0이거나 미입력이면 히스토리에서 채움
    if (historyInfo && historyInfo.cost > 0 && (!item.cost || item.cost === 0)) {
      change.cost = historyInfo.cost;
      change.fieldsChanged.push('원가');
    }

    // 판매가: 0이거나 미입력이면 히스토리에서 채움
    if (historyInfo && historyInfo.price > 0 && (!item.recommendedPrice || item.recommendedPrice === 0)) {
      change.recommendedPrice = historyInfo.price;
      change.fieldsChanged.push('판매가');
    }

    if (change.fieldsChanged.length > 0) {
      results.push(change);
    }
  }

  return results;
}

// 기존 호환용 (레거시)
export function autoClassifyBatch(
  items: { id: string; name: string; mainIngredient: string; category: MenuCategory }[]
): { id: string; category?: MenuCategory; mainIngredient?: string }[] {
  const results: { id: string; category?: MenuCategory; mainIngredient?: string }[] = [];

  for (const item of items) {
    const classified = autoClassifyMenu(item.name);
    const changes: { id: string; category?: MenuCategory; mainIngredient?: string } = { id: item.id };
    let hasChange = false;

    if (item.mainIngredient === 'vegetable' && classified.mainIngredient && classified.mainIngredient !== 'vegetable') {
      changes.mainIngredient = classified.mainIngredient;
      hasChange = true;
    }

    if (classified.category && classified.category !== item.category) {
      changes.category = classified.category;
      hasChange = true;
    }

    if (hasChange) {
      results.push(changes);
    }
  }

  return results;
}
