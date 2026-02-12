import { TARGET_CONFIGS } from '../constants';
import { WeeklyCyclePlan, MenuCategory, MenuItem, TargetType, MonthlyMealPlan, CycleType } from '../types';

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
  enableDuplicationCheck: boolean
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

    // We take top items, but randomized slightly to avoid same deterministic output
    // If strict ingredient rules, we might fail to find items. Here we do best effort.
    // Let's create a pool of candidates that don't repeat ingredients if possible.
    const nonRepeatingCandidates = prioritized.filter(i => !prevWeekIngredients.has(i.mainIngredient));
    const finalPool = nonRepeatingCandidates.length >= (count as number) ? nonRepeatingCandidates : prioritized;

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

  for (let i = 1; i <= 4; i++) {
    const weekPlan = generateWeeklyCycle(i, target, menuDB, usedItemIds, prevWeekIngredients, enableDuplicationCheck);

    weekPlan.items.forEach(item => usedItemIds.add(item.id));
    prevWeekIngredients = new Set(weekPlan.items.map(item => item.mainIngredient).filter(ing => ing !== 'vegetable'));

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
