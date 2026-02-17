import { MenuCategory } from '../types';

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

export function autoClassifyBatch(
  items: { id: string; name: string; mainIngredient: string; category: MenuCategory }[]
): { id: string; category?: MenuCategory; mainIngredient?: string }[] {
  const results: { id: string; category?: MenuCategory; mainIngredient?: string }[] = [];

  for (const item of items) {
    const classified = autoClassifyMenu(item.name);
    const changes: { id: string; category?: MenuCategory; mainIngredient?: string } = { id: item.id };
    let hasChange = false;

    // 주재료가 기본값(vegetable)인 경우만 추천 적용
    if (item.mainIngredient === 'vegetable' && classified.mainIngredient && classified.mainIngredient !== 'vegetable') {
      changes.mainIngredient = classified.mainIngredient;
      hasChange = true;
    }

    // 카테고리도 함께 추천 (선택적)
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
