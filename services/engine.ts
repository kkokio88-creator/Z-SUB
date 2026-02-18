import { TARGET_CONFIGS } from '../constants';
import { WeeklyCyclePlan, MenuCategory, MenuItem, TargetType, MonthlyMealPlan, CycleType } from '../types';

// ── 유사메뉴 감지 ──
// 한국어 메뉴명에서 핵심 키워드를 추출하여 유사도 판정
const MENU_KEYWORDS = [
  '장조림',
  '볶음',
  '조림',
  '찌개',
  '된장',
  '김치',
  '제육',
  '불고기',
  '갈비',
  '탕수',
  '깐풍',
  '카레',
  '스테이크',
  '함박',
  '돈까스',
  '가스',
  '튀김',
  '전',
  '무침',
  '샐러드',
  '나물',
  '잡채',
  '비빔',
  '덮밥',
  '볶음밥',
  '두부',
  '계란',
  '달걀',
  '오므라이스',
  '미역국',
  '소고기',
  '돼지',
  '닭',
  '생선',
  '고등어',
  '갈치',
  '연어',
  '새우',
  '오징어',
];

export const isSimilarMenu = (nameA: string, nameB: string): boolean => {
  if (nameA === nameB) return true;
  const a = nameA.replace(/\s+/g, '');
  const b = nameB.replace(/\s+/g, '');

  // 한쪽이 다른 쪽을 포함 (장조림 ⊂ 닭가슴살장조림)
  if (a.length >= 2 && b.length >= 2) {
    if (a.includes(b) || b.includes(a)) return true;
  }

  // 공통 키워드 2글자 이상 매칭 (된장찌개 ↔ 된장국)
  const matchedKeywords: string[] = [];
  for (const kw of MENU_KEYWORDS) {
    if (a.includes(kw) && b.includes(kw)) {
      matchedKeywords.push(kw);
    }
  }
  if (matchedKeywords.length > 0) {
    // 공통 키워드가 메뉴명의 상당 부분을 차지하는 경우만 유사로 판정
    const longestMatch = matchedKeywords.reduce((l, k) => (k.length > l.length ? k : l), '');
    const shorter = Math.min(a.length, b.length);
    if (longestMatch.length >= 2 && longestMatch.length >= shorter * 0.4) return true;
  }

  return false;
};

// Fisher-Yates shuffle for unbiased randomization
const shuffle = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// Generate a single week cycle (e.g., Week 1 of Tue-Thu)
const generateWeeklyCycle = (
  weekIndex: number,
  target: TargetType,
  menuDB: MenuItem[],
  usedItemIds: Set<string>,
  prevWeekIngredients: Set<string>,
  enableDuplicationCheck: boolean,
  prevWeekMenuNames: string[] = []
): WeeklyCyclePlan => {
  const config = TARGET_CONFIGS[target];
  const warnings: string[] = [];
  let selectedItems: MenuItem[] = [];

  // Filter valid items
  const availableMenu = menuDB.filter(item => {
    // 60-day duplication check
    if (enableDuplicationCheck && usedItemIds.has(item.id)) return false;

    // Ban tags
    if (config.bannedTags.length > 0) {
      const hasBannedTag = item.tags.some(tag => config.bannedTags.includes(tag));
      if (hasBannedTag) return false;
    }

    // Spicy filter for kids targets (uses config bannedTags already, but double-check isSpicy flag)
    if ((target === TargetType.KIDS || target === TargetType.KIDS_PLUS) && item.isSpicy) return false;

    return true;
  });

  // Select items by category
  Object.entries(config.composition).forEach(([cat, count]) => {
    const category = cat as MenuCategory;
    const itemsInCategory = availableMenu.filter(m => m.category === category);

    // Sort logic:
    // 1. Deprioritize items with main ingredients used last week
    // 2. Prioritize required tags
    const prioritized = itemsInCategory.sort((a, b) => {
      // Penalty for repeated ingredients
      const aRepeats = prevWeekIngredients.has(a.mainIngredient) ? 1 : 0;
      const bRepeats = prevWeekIngredients.has(b.mainIngredient) ? 1 : 0;
      if (aRepeats !== bRepeats) return aRepeats - bRepeats; // Less repeats first

      // Bonus for required tags
      const aMatch = a.tags.some(t => config.requiredTags.includes(t)) ? 1 : 0;
      const bMatch = b.tags.some(t => config.requiredTags.includes(t)) ? 1 : 0;
      return bMatch - aMatch; // More matches first
    });

    // Filter out items similar to previous week's menus
    const nonSimilarCandidates = prioritized.filter(
      i => !prevWeekMenuNames.some(prevName => isSimilarMenu(i.name, prevName))
    );

    // Also filter by non-repeating ingredients
    const nonRepeatingCandidates = nonSimilarCandidates.filter(i => !prevWeekIngredients.has(i.mainIngredient));
    const fallbackPool = nonSimilarCandidates.length >= (count as number) ? nonSimilarCandidates : prioritized;
    const finalPool = nonRepeatingCandidates.length >= (count as number) ? nonRepeatingCandidates : fallbackPool;

    const selected = shuffle(finalPool).slice(0, count as number);

    // Check if we were forced to pick a repeating ingredient
    selected.forEach(item => {
      if (prevWeekIngredients.has(item.mainIngredient)) {
        // warnings.push(`재료 중복 주의: ${item.name} (${item.mainIngredient})`);
      }
    });

    selectedItems = [...selectedItems, ...selected];
  });

  const currentCost = selectedItems.reduce((acc, item) => acc + item.cost, 0);
  const totalPrice = selectedItems.reduce((acc, item) => acc + item.recommendedPrice, 0);

  // Validations
  if (currentCost > config.budgetCap) {
    warnings.push(`원가 초과: ${currentCost.toLocaleString()}원`);
  }

  return {
    weekIndex,
    items: selectedItems,
    totalCost: currentCost,
    totalPrice,
    isValid: warnings.length === 0,
    warnings,
  };
};

// Create a subset plan from a parent plan
const createSubsetPlan = (parentPlan: MonthlyMealPlan, childTarget: TargetType): MonthlyMealPlan => {
  const childConfig = TARGET_CONFIGS[childTarget];
  const newWeeks = parentPlan.weeks.map(parentWeek => {
    let childItems: MenuItem[] = [];
    const warnings: string[] = [];

    // For each category, pick N items from the parent's selection
    Object.entries(childConfig.composition).forEach(([cat, count]) => {
      const category = cat as MenuCategory;
      const parentItemsInCategory = parentWeek.items.filter(i => i.category === category);

      // If we need fewer items than parent, we take a subset.
      // Logic: Take the first N items (assuming parent was shuffled/prioritized already).
      // Or we could try to keep the "most expensive" ones to match value,
      // but usually the basic plan drops the "extra" sides.

      const selected = parentItemsInCategory.slice(0, count as number);
      childItems = [...childItems, ...selected];
    });

    const currentCost = childItems.reduce((acc, item) => acc + item.cost, 0);
    const totalPrice = childItems.reduce((acc, item) => acc + item.recommendedPrice, 0);

    if (currentCost > childConfig.budgetCap) {
      warnings.push(`원가 초과: ${currentCost.toLocaleString()}원`);
    }

    return {
      ...parentWeek,
      items: childItems,
      totalCost: currentCost,
      totalPrice: totalPrice,
      warnings: warnings,
      isValid: warnings.length === 0,
    };
  });

  return {
    ...parentPlan,
    id: crypto.randomUUID(),
    target: childTarget,
    weeks: newWeeks,
  };
};

export const generateMonthlyMealPlan = (
  target: TargetType,
  monthLabel: string,
  cycleType: CycleType,
  enableDuplicationCheck: boolean,
  menuDB: MenuItem[]
): MonthlyMealPlan => {
  const config = TARGET_CONFIGS[target];

  // If this target inherits from a parent, generate the parent plan first
  if (config.parentTarget) {
    const parentPlan = generateMonthlyMealPlan(
      config.parentTarget,
      monthLabel,
      cycleType,
      enableDuplicationCheck,
      menuDB
    );
    return createSubsetPlan(parentPlan, target);
  }

  // Standard Generation (No parent, or is the parent itself)
  const usedItemIds = new Set<string>();
  const weeks: WeeklyCyclePlan[] = [];
  let prevWeekIngredients = new Set<string>();
  let prevWeekMenuNames: string[] = [];

  for (let i = 1; i <= 4; i++) {
    const weekPlan = generateWeeklyCycle(
      i,
      target,
      menuDB,
      usedItemIds,
      prevWeekIngredients,
      enableDuplicationCheck,
      prevWeekMenuNames
    );

    weekPlan.items.forEach(item => usedItemIds.add(item.id));
    prevWeekIngredients = new Set(weekPlan.items.map(item => item.mainIngredient).filter(ing => ing !== 'vegetable'));
    prevWeekMenuNames = weekPlan.items.map(item => item.name);

    weeks.push(weekPlan);
  }

  return {
    id: crypto.randomUUID(),
    monthLabel,
    cycleType,
    target,
    weeks,
  };
};

// Helper for swapping items manually
export const getSwapCandidates = (
  currentPlan: MonthlyMealPlan,
  itemToSwap: MenuItem,
  targetWeekIndex: number,
  menuDB: MenuItem[]
): MenuItem[] => {
  const allUsedIds = new Set<string>();
  currentPlan.weeks.forEach(w => w.items.forEach(i => allUsedIds.add(i.id)));

  const prevWeek = currentPlan.weeks.find(w => w.weekIndex === targetWeekIndex - 1);
  const prevIngredients = new Set(prevWeek?.items.map(i => i.mainIngredient) || []);

  const config = TARGET_CONFIGS[currentPlan.target];

  return menuDB.filter(item => {
    if (item.id === itemToSwap.id) return false; // self
    if (item.category !== itemToSwap.category) return false; // same category
    if (allUsedIds.has(item.id)) return false; // 60 day rule

    // Banned tags
    if (config.bannedTags.some(t => item.tags.includes(t))) return false;

    // Main ingredient overlap with previous week
    if (prevIngredients.has(item.mainIngredient) && item.mainIngredient !== 'vegetable') return false;

    return true;
  });
};
