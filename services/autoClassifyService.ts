import { MenuCategory, MenuItem, HistoricalMealPlan, TargetType } from '../types';
import { SPICY_KEYWORDS, AUTO_TAG_RULES } from '../constants';
import { isKidFriendly, isSeniorFriendly } from './sheetsSerializer';

// 메뉴명 키워드 → 카테고리 매핑 (SOUP 먼저, CATEGORY_EXCLUSIONS로 오분류 방지)
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

// 카테고리 제외 규칙: 짧은 키워드가 긴 키워드의 일부인 경우 해당 카테고리 매칭 제외
// 예: '탕' 매칭 시 이름에 '탕수'가 포함되면 SOUP 매칭 건너뜀 → 다음 카테고리(MAIN)에서 '탕수' 매칭
const CATEGORY_EXCLUSIONS: Record<string, string[]> = {
  탕: ['탕수'],
};

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

  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    const matched = keywords.some(kw => {
      if (!name.includes(kw)) return false;
      // 제외 규칙 체크: '탕' 매칭 시 '탕수'가 포함되면 건너뜀
      const exclusions = CATEGORY_EXCLUSIONS[kw];
      if (exclusions && exclusions.some(ex => name.includes(ex))) return false;
      return true;
    });
    if (matched) {
      result.category = category;
      break;
    }
  }

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

// 히스토리에서 메뉴별 가격/원가/사용대상 정보 수집
export interface HistoryMenuInfo {
  price: number;
  cost: number;
  count: number;
  targetTypes: Set<string>; // 히스토리에서 실제 사용된 대상 타입들
}

export function buildHistoryLookup(historicalPlans: HistoricalMealPlan[]): Map<string, HistoryMenuInfo> {
  const lookup = new Map<string, { prices: number[]; costs: number[]; targets: Set<string> }>();

  for (const plan of historicalPlans) {
    for (const target of plan.targets) {
      for (const item of target.items) {
        const clean = normalizeMenuName(item.name);
        if (!clean) continue;
        const existing = lookup.get(clean) || { prices: [], costs: [], targets: new Set<string>() };
        if (item.price > 0) existing.prices.push(item.price);
        if (item.cost > 0) existing.costs.push(item.cost);
        if (target.targetType) existing.targets.add(target.targetType);
        lookup.set(clean, existing);
      }
    }
  }

  const result = new Map<string, HistoryMenuInfo>();
  for (const [name, data] of lookup) {
    if (data.prices.length === 0 && data.costs.length === 0 && data.targets.size === 0) continue;
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
      targetTypes: data.targets,
    });
  }

  return result;
}

// 맵기 자동 판별
function detectSpicy(name: string): boolean {
  return SPICY_KEYWORDS.some(kw => name.includes(kw));
}

// 태그 자동 분류 (AUTO_TAG_RULES + 아이선호/시니어)
function detectTags(name: string, isSpicy: boolean, existingTags: string[]): string[] {
  const tags = new Set(existingTags);

  // AUTO_TAG_RULES (원더스푼, 유기농, 무항생제, 국내산)
  for (const rule of AUTO_TAG_RULES) {
    if (name.includes(rule.keyword)) {
      tags.add(rule.tag);
    }
  }

  // 아이선호 태그
  if (isKidFriendly(name, isSpicy) && !tags.has('아이선호')) {
    tags.add('아이선호');
  }

  // 시니어 태그
  if (isSeniorFriendly(name, isSpicy) && !tags.has('시니어')) {
    tags.add('시니어');
  }

  return [...tags];
}

// 대상식단 자동 분류 (메뉴명 + 맵기 기반)
function detectTargetAgeGroups(name: string, isSpicy: boolean): TargetType[] {
  const targets: TargetType[] = [];

  // 아이 식단 적합
  if (isKidFriendly(name, isSpicy)) {
    targets.push(TargetType.KIDS, TargetType.KIDS_PLUS);
  }

  // 시니어 식단 적합
  if (isSeniorFriendly(name, isSpicy)) {
    targets.push(TargetType.SENIOR, TargetType.SENIOR_HEALTH);
  }

  // 매운 음식이 아니면 가족/실속/청소연구소에도 적합
  if (!isSpicy) {
    targets.push(TargetType.FAMILY, TargetType.FAMILY_PLUS, TargetType.VALUE);
  }

  return targets;
}

// 전체 자동분류
export interface FullAutoClassifyChange {
  id: string;
  category?: MenuCategory;
  mainIngredient?: string;
  cost?: number;
  recommendedPrice?: number;
  isSpicy?: boolean;
  tags?: string[];
  targetAgeGroup?: TargetType[];
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

    // 맵기: 키워드 기반 자동 판별 (현재 false인데 매운 메뉴인 경우)
    const shouldBeSpicy = detectSpicy(item.name);
    if (shouldBeSpicy !== item.isSpicy) {
      change.isSpicy = shouldBeSpicy;
      change.fieldsChanged.push('맵기');
    }

    // 태그: 자동 태그 적용 (아이선호, 시니어, 원더스푼 등)
    const currentSpicy = change.isSpicy !== undefined ? change.isSpicy : item.isSpicy;
    const newTags = detectTags(item.name, currentSpicy, item.tags);
    if (newTags.length !== item.tags.length || newTags.some(t => !item.tags.includes(t))) {
      change.tags = newTags;
      change.fieldsChanged.push('태그');
    }

    // 대상식단: 히스토리에 사용 기록이 있으면 히스토리 기반, 없으면 키워드 기반
    if (!item.targetAgeGroup || item.targetAgeGroup.length === 0) {
      let detectedTargets: TargetType[];
      if (historyInfo && historyInfo.targetTypes.size > 0) {
        // 히스토리 기반: 실제 사용된 대상 타입 활용
        detectedTargets = [...historyInfo.targetTypes] as TargetType[];
      } else {
        // 키워드 기반 폴백
        detectedTargets = detectTargetAgeGroups(item.name, currentSpicy);
      }
      if (detectedTargets.length > 0) {
        change.targetAgeGroup = detectedTargets;
        change.fieldsChanged.push('대상식단');
      }
    }

    if (change.fieldsChanged.length > 0) {
      results.push(change);
    }
  }

  return results;
}
