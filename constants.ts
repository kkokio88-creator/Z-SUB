
import { MealPlanConfig, MenuCategory, MenuItem, Season, TargetType, TasteProfile } from "./types";

export const MOCK_MENU_DB: MenuItem[] = [
  // 국/찌개
  { id: 'S001', code: 'ZIP_P_1001', process: 11, weight: 600, name: '황태미역국_냉동', category: MenuCategory.SOUP, cost: 1342, recommendedPrice: 3000, tastes: [TasteProfile.BLAND], season: Season.ALL, tags: ['아이선호', '부드러움'], isSpicy: false, mainIngredient: 'seaweed', isUnused: false },
  { id: 'S002', code: 'ZIP_P_1002', process: 11, weight: 600, name: '해물순두부찌개_냉장', category: MenuCategory.SOUP, cost: 1800, recommendedPrice: 4500, tastes: [TasteProfile.SPICY], season: Season.WINTER, tags: ['어른입맛', '얼큰함'], isSpicy: true, mainIngredient: 'tofu', isUnused: false },
  { id: 'S003', code: 'ZIP_P_1003', process: 22, weight: 240, name: '저당두부강된장', category: MenuCategory.SOUP, cost: 1651, recommendedPrice: 3500, tastes: [TasteProfile.SALTY], season: Season.ALL, tags: ['건강식', '시니어'], isSpicy: false, mainIngredient: 'tofu', isUnused: false },
  { id: 'S004', code: 'ZIP_P_1004', process: 11, weight: 600, name: '맑은한우배추국_냉동', category: MenuCategory.SOUP, cost: 1500, recommendedPrice: 3800, tastes: [TasteProfile.BLAND], season: Season.WINTER, tags: ['아이선호', '시원함'], isSpicy: false, mainIngredient: 'beef', isUnused: false },
  { id: 'S005', code: 'ZIP_P_1005', process: 11, weight: 600, name: '경상도식소고기무국', category: MenuCategory.SOUP, cost: 1700, recommendedPrice: 4000, tastes: [TasteProfile.SPICY], season: Season.ALL, tags: ['어른입맛'], isSpicy: true, mainIngredient: 'beef', isUnused: false },
  { id: 'S006', code: 'ZIP_P_1006', process: 11, weight: 600, name: '한우사골곰탕_냉동', category: MenuCategory.SOUP, cost: 2100, recommendedPrice: 5000, tastes: [TasteProfile.BLAND], season: Season.ALL, tags: ['보양식', '시니어'], isSpicy: false, mainIngredient: 'beef', isUnused: false },
  { id: 'S007', code: 'ZIP_P_1007', process: 11, weight: 600, name: '새우탕_냉장', category: MenuCategory.SOUP, cost: 1400, recommendedPrice: 3500, tastes: [TasteProfile.SALTY], season: Season.ALL, tags: ['시원함'], isSpicy: false, mainIngredient: 'shrimp', isUnused: false },
  { id: 'S008', code: 'ZIP_P_1008', process: 11, weight: 600, name: '동태찌개_냉장', category: MenuCategory.SOUP, cost: 1900, recommendedPrice: 4500, tastes: [TasteProfile.SPICY], season: Season.WINTER, tags: ['얼큰함'], isSpicy: true, mainIngredient: 'fish', isUnused: false },
  { id: 'S009', code: 'ZIP_P_1009', process: 22, weight: 500, name: '근대된장국', category: MenuCategory.SOUP, cost: 900, recommendedPrice: 2500, tastes: [TasteProfile.BLAND], season: Season.ALL, tags: ['채식'], isSpicy: false, mainIngredient: 'vegetable', isUnused: false },
  { id: 'S010', code: 'ZIP_P_1010', process: 22, weight: 500, name: '콩나물김치국', category: MenuCategory.SOUP, cost: 800, recommendedPrice: 2200, tastes: [TasteProfile.SPICY], season: Season.ALL, tags: ['해장'], isSpicy: true, mainIngredient: 'kimchi', isUnused: false },

  // 메인요리
  { id: 'M001', code: 'ZIP_P_2001', process: 11, weight: 300, name: '소고기야채볶음_반조리', category: MenuCategory.MAIN, cost: 3542, recommendedPrice: 8000, tastes: [TasteProfile.SWEET, TasteProfile.SALTY], season: Season.ALL, tags: ['인기', '고기'], isSpicy: false, mainIngredient: 'beef', isUnused: false },
  { id: 'M002', code: 'ZIP_P_2002', process: 11, weight: 180, name: '크림함박스테이크', category: MenuCategory.MAIN, cost: 1292, recommendedPrice: 5800, tastes: [TasteProfile.SWEET, TasteProfile.OILY], season: Season.ALL, tags: ['아이선호', '부드러움'], isSpicy: false, mainIngredient: 'pork', isUnused: false },
  { id: 'M003', code: 'ZIP_P_2003', process: 11, weight: 400, name: '불고기버섯전골_반조리', category: MenuCategory.MAIN, cost: 4800, recommendedPrice: 14800, tastes: [TasteProfile.SWEET], season: Season.WINTER, tags: ['가족', '국물'], isSpicy: false, mainIngredient: 'beef', isUnused: false },
  { id: 'M004', code: 'ZIP_P_2004', process: 11, weight: 350, name: '한돈김치두루치기_반조리', category: MenuCategory.MAIN, cost: 3200, recommendedPrice: 11800, tastes: [TasteProfile.SPICY], season: Season.ALL, tags: ['어른입맛', '술안주'], isSpicy: true, mainIngredient: 'pork', isUnused: false },
  { id: 'M005', code: 'ZIP_P_2005', process: 11, weight: 300, name: '오징어야채볶음_반조리', category: MenuCategory.MAIN, cost: 2800, recommendedPrice: 9800, tastes: [TasteProfile.SPICY], season: Season.ALL, tags: ['매콤'], isSpicy: true, mainIngredient: 'squid', isUnused: false },
  { id: 'M006', code: 'ZIP_P_2006', process: 11, weight: 350, name: '뚝배기불고기_반조리', category: MenuCategory.MAIN, cost: 3100, recommendedPrice: 10800, tastes: [TasteProfile.SWEET], season: Season.ALL, tags: ['인기'], isSpicy: false, mainIngredient: 'beef', isUnused: false },
  { id: 'M007', code: 'ZIP_P_2007', process: 22, weight: 200, name: '한돈가지볶음', category: MenuCategory.MAIN, cost: 2500, recommendedPrice: 7000, tastes: [TasteProfile.OILY], season: Season.SUMMER, tags: ['건강'], isSpicy: false, mainIngredient: 'pork', isUnused: false },
  { id: 'M008', code: 'ZIP_P_2008', process: 22, weight: 200, name: '닭가슴살냉채', category: MenuCategory.MAIN, cost: 2100, recommendedPrice: 6000, tastes: [TasteProfile.SWEET], season: Season.SUMMER, tags: ['다이어트'], isSpicy: false, mainIngredient: 'chicken', isUnused: false },
  { id: 'M009', code: 'ZIP_P_2009', process: 11, weight: 400, name: '순살안동찜닭', category: MenuCategory.MAIN, cost: 3300, recommendedPrice: 9000, tastes: [TasteProfile.SALTY, TasteProfile.SWEET], season: Season.ALL, tags: ['인기'], isSpicy: false, mainIngredient: 'chicken', isUnused: false },
  { id: 'M010', code: 'ZIP_P_2010', process: 11, weight: 250, name: '코다리무조림', category: MenuCategory.MAIN, cost: 2900, recommendedPrice: 8500, tastes: [TasteProfile.SPICY], season: Season.WINTER, tags: ['시니어'], isSpicy: true, mainIngredient: 'fish', isUnused: false },

  // 밑반찬
  { id: 'SD001', code: 'ZIP_P_4059', process: 11, weight: 100, name: '마늘쫑간장조림', category: MenuCategory.SIDE, cost: 611, recommendedPrice: 3500, tastes: [TasteProfile.SALTY], season: Season.SPRING, tags: ['제철'], isSpicy: true, mainIngredient: 'vegetable', isUnused: false },
  { id: 'SD002', code: 'ZIP_P_4070', process: 11, weight: 150, name: '모둠어묵볶음', category: MenuCategory.SIDE, cost: 791, recommendedPrice: 4300, tastes: [TasteProfile.SWEET], season: Season.ALL, tags: ['아이선호'], isSpicy: false, mainIngredient: 'fishcake', isUnused: false },
  { id: 'SD003', code: 'ZIP_P_5010', process: 22, weight: 150, name: '무생채', category: MenuCategory.SIDE, cost: 293, recommendedPrice: 2900, tastes: [TasteProfile.SPICY, TasteProfile.SALTY], season: Season.WINTER, tags: ['기본'], isSpicy: true, mainIngredient: 'radish', isUnused: false },
  { id: 'SD004', code: 'ZIP_P_4037', process: 11, weight: 110, name: '메추리알간장조림', category: MenuCategory.SIDE, cost: 695, recommendedPrice: 3800, tastes: [TasteProfile.SALTY], season: Season.ALL, tags: ['아이선호', '단백질'], isSpicy: false, mainIngredient: 'egg', isUnused: false },
  { id: 'SD005', code: 'ZIP_P_4075', process: 11, weight: 600, name: '보리새우간장볶음', category: MenuCategory.SIDE, cost: 852, recommendedPrice: 3500, tastes: [TasteProfile.SWEET, TasteProfile.SALTY], season: Season.ALL, tags: ['칼슘'], isSpicy: true, mainIngredient: 'shrimp', isUnused: false },
  { id: 'SD006', code: 'ZIP_P_6294', process: 22, weight: 150, name: '천사채잡채', category: MenuCategory.SIDE, cost: 500, recommendedPrice: 3000, tastes: [TasteProfile.BLAND], season: Season.ALL, tags: ['저칼로리'], isSpicy: false, mainIngredient: 'vegetable', isUnused: false },
  { id: 'SD007', code: 'ZIP_P_5075', process: 11, weight: 180, name: '시래기된장지짐', category: MenuCategory.SIDE, cost: 650, recommendedPrice: 3500, tastes: [TasteProfile.SALTY], season: Season.WINTER, tags: ['시니어', '부드러움'], isSpicy: false, mainIngredient: 'vegetable', isUnused: false },
  { id: 'SD008', code: 'ZIP_P_3160', process: 11, weight: 150, name: '계란두부부침', category: MenuCategory.SIDE, cost: 700, recommendedPrice: 4000, tastes: [TasteProfile.BLAND], season: Season.ALL, tags: ['시니어', '부드러움'], isSpicy: false, mainIngredient: 'tofu', isUnused: false },
  { id: 'SD009', code: 'ZIP_P_6126', process: 11, weight: 100, name: '건취나물볶음', category: MenuCategory.SIDE, cost: 800, recommendedPrice: 4500, tastes: [TasteProfile.BLAND], season: Season.SPRING, tags: ['건강'], isSpicy: false, mainIngredient: 'vegetable', isUnused: false },
  { id: 'SD010', code: 'ZIP_P_6339', process: 22, weight: 130, name: '깻잎순멸치조림', category: MenuCategory.SIDE, cost: 947, recommendedPrice: 5500, tastes: [TasteProfile.SALTY], season: Season.SUMMER, tags: ['입맛돋움'], isSpicy: true, mainIngredient: 'vegetable', isUnused: false },
  { id: 'SD011', code: 'ZIP_P_6280', process: 11, weight: 100, name: '연근조림', category: MenuCategory.SIDE, cost: 592, recommendedPrice: 3800, tastes: [TasteProfile.SWEET], season: Season.AUTUMN, tags: ['뿌리채소'], isSpicy: false, mainIngredient: 'root', isUnused: false },
  { id: 'SD012', code: 'ZIP_P_4045', process: 11, weight: 120, name: '검은콩조림', category: MenuCategory.SIDE, cost: 600, recommendedPrice: 3800, tastes: [TasteProfile.SWEET], season: Season.ALL, tags: ['건강'], isSpicy: false, mainIngredient: 'bean', isUnused: false },
  { id: 'SD013', code: 'ZIP_P_6120', process: 11, weight: 150, name: '미역줄기볶음', category: MenuCategory.SIDE, cost: 400, recommendedPrice: 2500, tastes: [TasteProfile.OILY], season: Season.ALL, tags: ['가성비'], isSpicy: false, mainIngredient: 'seaweed', isUnused: false },
  { id: 'SD014', code: 'ZIP_P_4099', process: 11, weight: 100, name: '진미채고추장볶음', category: MenuCategory.SIDE, cost: 1100, recommendedPrice: 4500, tastes: [TasteProfile.SPICY, TasteProfile.SWEET], season: Season.ALL, tags: ['인기'], isSpicy: true, mainIngredient: 'squid', isUnused: false },
  { id: 'SD015', code: 'ZIP_P_3010', process: 11, weight: 180, name: '감자채볶음', category: MenuCategory.SIDE, cost: 450, recommendedPrice: 2000, tastes: [TasteProfile.BLAND], season: Season.ALL, tags: ['아이선호'], isSpicy: false, mainIngredient: 'potato', isUnused: false },
];

export const MAJOR_INGREDIENTS = [
    { key: 'potato', label: '감자' },
    { key: 'tofu', label: '두부' },
    { key: 'pork', label: '한돈' },
    { key: 'chicken', label: '닭' },
    { key: 'beef', label: '소고기' },
    { key: 'fish', label: '생선' },
    { key: 'seaweed', label: '해조류' }
];

export const TARGET_CONFIGS: Record<TargetType, MealPlanConfig> = {
  [TargetType.KIDS]: {
    target: TargetType.KIDS,
    budgetCap: 11040, // 30% of 36800
    targetPrice: 36800,
    targetCostRatio: 30,
    composition: { [MenuCategory.SOUP]: 1, [MenuCategory.MAIN]: 1, [MenuCategory.SIDE]: 3 },
    bannedTags: ['매운맛', '얼큰함'],
    requiredTags: ['아이선호'],
  },
  [TargetType.KIDS_PLUS]: {
    target: TargetType.KIDS_PLUS,
    budgetCap: 14640, // 30% of 48800
    targetPrice: 48800,
    targetCostRatio: 30,
    composition: { [MenuCategory.SOUP]: 1, [MenuCategory.MAIN]: 1, [MenuCategory.SIDE]: 6 },
    bannedTags: ['매운맛'],
    requiredTags: ['아이선호'],
    parentTarget: TargetType.KIDS // Explicit inheritance
  },
  [TargetType.SIDE_ONLY]: {
    target: TargetType.SIDE_ONLY,
    budgetCap: 10440,
    targetPrice: 34800,
    targetCostRatio: 30,
    composition: { [MenuCategory.MAIN]: 1, [MenuCategory.SIDE]: 5 }, // 국 없음
    bannedTags: [],
    requiredTags: [],
  },
  [TargetType.SENIOR]: {
    target: TargetType.SENIOR,
    budgetCap: 11940,
    targetPrice: 39800,
    targetCostRatio: 30,
    composition: { [MenuCategory.SOUP]: 1, [MenuCategory.MAIN]: 1, [MenuCategory.SIDE]: 4 },
    bannedTags: ['질김'],
    requiredTags: ['시니어'],
  },
  [TargetType.SENIOR_HEALTH]: {
    target: TargetType.SENIOR_HEALTH,
    budgetCap: 13980,
    targetPrice: 46600,
    targetCostRatio: 30,
    composition: { [MenuCategory.SOUP]: 1, [MenuCategory.MAIN]: 1, [MenuCategory.SIDE]: 4 },
    bannedTags: ['질김', '딱딱함'],
    requiredTags: ['시니어', '부드러움'],
    parentTarget: TargetType.SENIOR
  },
  [TargetType.YOUTH]: {
    target: TargetType.YOUTH,
    budgetCap: 13440,
    targetPrice: 44800,
    targetCostRatio: 30,
    composition: { [MenuCategory.SOUP]: 2, [MenuCategory.MAIN]: 1, [MenuCategory.SIDE]: 3 },
    bannedTags: [],
    requiredTags: [],
  },
  [TargetType.YOUTH_MAIN]: {
    target: TargetType.YOUTH_MAIN,
    budgetCap: 10440,
    targetPrice: 34800,
    targetCostRatio: 30,
    composition: { [MenuCategory.MAIN]: 2, [MenuCategory.SIDE]: 3 }, // 국 없음, 메인 2개
    bannedTags: [],
    requiredTags: [],
    parentTarget: TargetType.YOUTH
  },
  [TargetType.VALUE]: {
    target: TargetType.VALUE,
    budgetCap: 11040,
    targetPrice: 36800,
    targetCostRatio: 30,
    composition: { [MenuCategory.SOUP]: 1, [MenuCategory.MAIN]: 1, [MenuCategory.SIDE]: 4 },
    bannedTags: [],
    requiredTags: [],
  },
  [TargetType.FAMILY]: {
    target: TargetType.FAMILY,
    budgetCap: 14940,
    targetPrice: 49800,
    targetCostRatio: 30,
    composition: { [MenuCategory.SOUP]: 2, [MenuCategory.MAIN]: 2, [MenuCategory.SIDE]: 2 },
    bannedTags: [],
    requiredTags: [],
  },
  [TargetType.FAMILY_PLUS]: {
    target: TargetType.FAMILY_PLUS,
    budgetCap: 17640,
    targetPrice: 58800,
    targetCostRatio: 30,
    composition: { [MenuCategory.SOUP]: 2, [MenuCategory.MAIN]: 2, [MenuCategory.SIDE]: 4 },
    bannedTags: [],
    requiredTags: [],
    parentTarget: TargetType.FAMILY
  },
};
