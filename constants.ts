import { MealPlanConfig, MenuCategory, TargetType } from './types';

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
