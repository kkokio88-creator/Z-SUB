import {
  MealPlanConfig,
  MenuCategory,
  TargetType,
  IngredientColorConfig,
  ProductionLimitConfig,
  TargetTagConfig,
} from './types';

export const MAJOR_INGREDIENTS = [
  { key: 'beef', label: '소고기' },
  { key: 'pork', label: '한돈' },
  { key: 'chicken', label: '닭' },
  { key: 'fish', label: '생선' },
  { key: 'tofu', label: '두부' },
  { key: 'egg', label: '달걀' },
  { key: 'potato', label: '감자' },
  { key: 'seaweed', label: '해조류' },
  { key: 'mushroom', label: '버섯' },
  { key: 'vegetable', label: '채소' },
];

export interface BanchanReference {
  name: string;
  category: string;
  keywords: string[];
}

export const KOREAN_BANCHAN_REFERENCE: BanchanReference[] = [
  // 나물류
  { name: '시금치나물', category: '나물', keywords: ['시금치'] },
  { name: '콩나물무침', category: '나물', keywords: ['콩나물'] },
  { name: '숙주나물', category: '나물', keywords: ['숙주'] },
  { name: '고사리나물', category: '나물', keywords: ['고사리'] },
  { name: '도라지무침', category: '나물', keywords: ['도라지'] },
  { name: '미나리무침', category: '나물', keywords: ['미나리'] },
  { name: '무나물', category: '나물', keywords: ['무나물'] },
  { name: '브로콜리무침', category: '나물', keywords: ['브로콜리'] },
  // 조림류
  { name: '감자조림', category: '조림', keywords: ['감자조림'] },
  { name: '우엉조림', category: '조림', keywords: ['우엉'] },
  { name: '연근조림', category: '조림', keywords: ['연근'] },
  { name: '장조림', category: '조림', keywords: ['장조림'] },
  { name: '두부조림', category: '조림', keywords: ['두부조림'] },
  { name: '메추리알조림', category: '조림', keywords: ['메추리알'] },
  // 볶음류
  { name: '멸치볶음', category: '볶음', keywords: ['멸치볶음', '멸치'] },
  { name: '어묵볶음', category: '볶음', keywords: ['어묵볶음', '어묵'] },
  { name: '버섯볶음', category: '볶음', keywords: ['버섯볶음'] },
  { name: '호박볶음', category: '볶음', keywords: ['호박볶음', '애호박'] },
  { name: '감자채볶음', category: '볶음', keywords: ['감자채'] },
  { name: '김치볶음', category: '볶음', keywords: ['김치볶음'] },
  // 전류
  { name: '동그랑땡', category: '전', keywords: ['동그랑땡'] },
  { name: '호박전', category: '전', keywords: ['호박전'] },
  { name: '김치전', category: '전', keywords: ['김치전'] },
  { name: '부추전', category: '전', keywords: ['부추전'] },
  // 김치류
  { name: '배추김치', category: '김치', keywords: ['배추김치', '배추'] },
  { name: '깍두기', category: '김치', keywords: ['깍두기'] },
  { name: '총각김치', category: '김치', keywords: ['총각'] },
  { name: '백김치', category: '김치', keywords: ['백김치'] },
  // 국/찌개류
  { name: '된장찌개', category: '국/찌개', keywords: ['된장찌개', '된장'] },
  { name: '미역국', category: '국/찌개', keywords: ['미역국'] },
  { name: '시래기국', category: '국/찌개', keywords: ['시래기'] },
  { name: '소고기무국', category: '국/찌개', keywords: ['소고기무국', '소고기무'] },
  { name: '콩나물국', category: '국/찌개', keywords: ['콩나물국'] },
  { name: '배추국', category: '국/찌개', keywords: ['배추국'] },
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
    parentTarget: TargetType.KIDS_PLUS, // KIDS는 KIDS_PLUS의 서브셋
  },
  [TargetType.KIDS_PLUS]: {
    target: TargetType.KIDS_PLUS,
    budgetCap: 14640, // 30% of 48800
    targetPrice: 48800,
    targetCostRatio: 30,
    composition: { [MenuCategory.SOUP]: 1, [MenuCategory.MAIN]: 1, [MenuCategory.SIDE]: 6 },
    bannedTags: ['매운맛'],
    requiredTags: ['아이선호'],
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
    parentTarget: TargetType.SENIOR,
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
    // parentTarget 제거: YOUTH(MAIN:1)에서 MAIN:2를 뽑을 수 없는 비호환 구성
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
    parentTarget: TargetType.FAMILY_PLUS, // FAMILY는 FAMILY_PLUS의 서브셋
  },
  [TargetType.FAMILY_PLUS]: {
    target: TargetType.FAMILY_PLUS,
    budgetCap: 17640,
    targetPrice: 58800,
    targetCostRatio: 30,
    composition: { [MenuCategory.SOUP]: 2, [MenuCategory.MAIN]: 2, [MenuCategory.SIDE]: 4 },
    bannedTags: [],
    requiredTags: [],
  },
  [TargetType.FIRST_MEET]: {
    target: TargetType.FIRST_MEET,
    budgetCap: 8940,
    targetPrice: 29800,
    targetCostRatio: 30,
    composition: { [MenuCategory.SOUP]: 1, [MenuCategory.MAIN]: 1, [MenuCategory.SIDE]: 3 },
    bannedTags: ['매운맛'],
    requiredTags: [],
  },
  [TargetType.TODDLER_PLUS]: {
    target: TargetType.TODDLER_PLUS,
    budgetCap: 13440,
    targetPrice: 44800,
    targetCostRatio: 30,
    composition: { [MenuCategory.SOUP]: 1, [MenuCategory.MAIN]: 1, [MenuCategory.SIDE]: 5 },
    bannedTags: ['매운맛', '질김'],
    requiredTags: [],
  },
  [TargetType.TODDLER]: {
    target: TargetType.TODDLER,
    budgetCap: 10440,
    targetPrice: 34800,
    targetCostRatio: 30,
    composition: { [MenuCategory.SOUP]: 1, [MenuCategory.MAIN]: 1, [MenuCategory.SIDE]: 3 },
    bannedTags: ['매운맛', '질김'],
    requiredTags: [],
    parentTarget: TargetType.TODDLER_PLUS, // TODDLER는 TODDLER_PLUS의 서브셋
  },
  [TargetType.CHILD_PLUS]: {
    target: TargetType.CHILD_PLUS,
    budgetCap: 14640,
    targetPrice: 48800,
    targetCostRatio: 30,
    composition: { [MenuCategory.SOUP]: 1, [MenuCategory.MAIN]: 1, [MenuCategory.SIDE]: 6 },
    bannedTags: ['매운맛'],
    requiredTags: [],
  },
  [TargetType.CHILD]: {
    target: TargetType.CHILD,
    budgetCap: 11040,
    targetPrice: 36800,
    targetCostRatio: 30,
    composition: { [MenuCategory.SOUP]: 1, [MenuCategory.MAIN]: 1, [MenuCategory.SIDE]: 3 },
    bannedTags: ['매운맛'],
    requiredTags: [],
    parentTarget: TargetType.CHILD_PLUS, // CHILD는 CHILD_PLUS의 서브셋
  },
};

// ── 주재료 컬러링 기본값 ──
export const DEFAULT_INGREDIENT_COLORS: IngredientColorConfig[] = [
  { key: 'beef', label: '소고기', color: 'red', priority: 1, enabled: true },
  { key: 'pork', label: '한돈', color: 'pink', priority: 2, enabled: true },
  { key: 'chicken', label: '닭', color: 'amber', priority: 3, enabled: true },
  { key: 'fish', label: '생선', color: 'blue', priority: 4, enabled: true },
  { key: 'tofu', label: '두부', color: 'yellow', priority: 5, enabled: true },
  { key: 'egg', label: '달걀', color: 'orange', priority: 6, enabled: true },
  { key: 'potato', label: '감자', color: 'lime', priority: 7, enabled: true },
  { key: 'seaweed', label: '해조류', color: 'teal', priority: 8, enabled: true },
  { key: 'mushroom', label: '버섯', color: 'violet', priority: 9, enabled: true },
  { key: 'vegetable', label: '채소', color: 'green', priority: 10, enabled: true },
];

// ── 생산 한도 기본값 ──
export const DEFAULT_PRODUCTION_LIMITS: ProductionLimitConfig[] = [
  { category: '냉장국', dailyLimit: 500, enabled: true },
  { category: '반조리', dailyLimit: 300, enabled: true },
];

// ── 식단별 기본 태그 설정 ──
export const DEFAULT_TARGET_TAGS: TargetTagConfig[] = [
  {
    targetType: TargetType.KIDS,
    allowedTags: ['아이선호'],
    blockedTags: ['매운맛', '얼큰함'],
    blockedProducts: [],
  },
  {
    targetType: TargetType.SENIOR,
    allowedTags: ['시니어'],
    blockedTags: ['질김'],
    blockedProducts: [],
  },
  {
    targetType: TargetType.SENIOR_HEALTH,
    allowedTags: ['시니어', '부드러움'],
    blockedTags: ['질김', '딱딱함'],
    blockedProducts: [],
  },
];

// ── 매운맛 자동 판별 키워드 ──
export const SPICY_KEYWORDS = [
  '고추',
  '매운',
  '불닭',
  '청양',
  '매콤',
  '떡볶이',
  '짬뽕',
  '낙볶',
  '닭볶음',
  '마라',
  '칠리',
  '핫',
  '불',
  '찜닭매운',
  '카레매운',
];

// ── 태그 자동 분류 규칙 ──
export const AUTO_TAG_RULES: { keyword: string; tag: string }[] = [
  { keyword: '원더스푼', tag: '원더스푼' },
  { keyword: '유기농', tag: '유기농' },
  { keyword: '무항생제', tag: '무항생제' },
  { keyword: '국내산', tag: '국내산' },
];

// ── 식단 통합 그룹 ──
export const MEAL_PLAN_INTEGRATION_GROUPS = [
  {
    groupLabel: '시니어 통합',
    baseTarget: TargetType.SENIOR,
    plusTarget: TargetType.SENIOR_HEALTH,
    description: '시니어 + 건강한 시니어 통합 편성',
  },
  {
    groupLabel: '아이 통합',
    baseTarget: TargetType.KIDS,
    plusTarget: TargetType.KIDS_PLUS,
    plusExtraCount: 3, // 든든아이 전용 메뉴 3개
    description: '아이 + 든든아이 통합 편성',
  },
];

// ── 셰이크/반복 메뉴 대상 식단 ──
export const REPEAT_MENU_TARGETS = [TargetType.KIDS, TargetType.KIDS_PLUS];

// ── 주재료별 Tailwind 컬러 매핑 ──
export const INGREDIENT_COLOR_MAP: Record<
  string,
  { bg: string; borderL: string; text: string; dot: string; cellBg: string }
> = {
  red: { bg: 'bg-red-50', borderL: 'border-l-red-400', text: 'text-red-700', dot: 'bg-red-400', cellBg: 'bg-red-100' },
  pink: {
    bg: 'bg-pink-50',
    borderL: 'border-l-pink-400',
    text: 'text-pink-700',
    dot: 'bg-pink-400',
    cellBg: 'bg-pink-100',
  },
  amber: {
    bg: 'bg-amber-50',
    borderL: 'border-l-amber-400',
    text: 'text-amber-700',
    dot: 'bg-amber-400',
    cellBg: 'bg-amber-100',
  },
  blue: {
    bg: 'bg-blue-50',
    borderL: 'border-l-blue-400',
    text: 'text-blue-700',
    dot: 'bg-blue-400',
    cellBg: 'bg-blue-100',
  },
  yellow: {
    bg: 'bg-yellow-50',
    borderL: 'border-l-yellow-400',
    text: 'text-yellow-700',
    dot: 'bg-yellow-400',
    cellBg: 'bg-yellow-100',
  },
  orange: {
    bg: 'bg-orange-50',
    borderL: 'border-l-orange-400',
    text: 'text-orange-700',
    dot: 'bg-orange-400',
    cellBg: 'bg-orange-100',
  },
  lime: {
    bg: 'bg-lime-50',
    borderL: 'border-l-lime-400',
    text: 'text-lime-700',
    dot: 'bg-lime-400',
    cellBg: 'bg-lime-100',
  },
  teal: {
    bg: 'bg-teal-50',
    borderL: 'border-l-teal-400',
    text: 'text-teal-700',
    dot: 'bg-teal-400',
    cellBg: 'bg-teal-100',
  },
  violet: {
    bg: 'bg-violet-50',
    borderL: 'border-l-violet-400',
    text: 'text-violet-700',
    dot: 'bg-violet-400',
    cellBg: 'bg-violet-100',
  },
  green: {
    bg: 'bg-green-50',
    borderL: 'border-l-green-400',
    text: 'text-green-700',
    dot: 'bg-green-400',
    cellBg: 'bg-green-100',
  },
};
