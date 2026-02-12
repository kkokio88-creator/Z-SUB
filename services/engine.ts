
import { MOCK_MENU_DB, TARGET_CONFIGS } from "../constants";
import { WeeklyCyclePlan, MenuCategory, MenuItem, TargetType, MonthlyMealPlan, CycleType, MealPlanConfig } from "../types";

// Helper to shuffle array
const shuffle = <T,>(array: T[]): T[] => {
  return array.sort(() => Math.random() - 0.5);
};

// Generate a single week cycle (e.g., Week 1 of Tue-Thu)
const generateWeeklyCycle = (
  weekIndex: number,
  target: TargetType, 
  usedItemIds: Set<string>, // For 60-day rule
  prevWeekIngredients: Set<string>, // For ingredient repetition rule
  enableDuplicationCheck: boolean
): WeeklyCyclePlan => {
  const config = TARGET_CONFIGS[target];
  const warnings: string[] = [];
  let selectedItems: MenuItem[] = [];

  // Filter valid items
  let availableMenu = MOCK_MENU_DB.filter(item => {
    // 60-day duplication check
    if (enableDuplicationCheck && usedItemIds.has(item.id)) return false;

    // Ban tags
    if (config.bannedTags.length > 0) {
      const hasBannedTag = item.tags.some(tag => config.bannedTags.includes(tag));
      if (hasBannedTag) return false;
    }

    // Special Spicy Logic for KIDS
    if (target.includes('아이') && item.isSpicy) return false;

    return true;
  });

  // Select items by category
  Object.entries(config.composition).forEach(([cat, count]) => {
    const category = cat as MenuCategory;
    let itemsInCategory = availableMenu.filter(m => m.category === category);
    
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
    let finalPool = nonRepeatingCandidates.length >= (count as number) ? nonRepeatingCandidates : prioritized;

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
    warnings
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
      isValid: warnings.length === 0
    };
  });

  return {
    ...parentPlan,
    id: Math.random().toString(36).substr(2, 9),
    target: childTarget,
    weeks: newWeeks
  };
};

export const generateMonthlyMealPlan = (
  target: TargetType,
  monthLabel: string,
  cycleType: CycleType,
  enableDuplicationCheck: boolean
): MonthlyMealPlan => {
  const config = TARGET_CONFIGS[target];

  // Logic: Check if there is a parent plan
  if (config.parentTarget) {
    // Generate the parent plan first
    // Note: We recursively call generateMonthlyMealPlan for the parent
    const parentPlan = generateMonthlyMealPlan(config.parentTarget, monthLabel, cycleType, enableDuplicationCheck);
    
    // Now derive the child plan from the parent plan
    return createSubsetPlan(parentPlan, target);
  }

  // Standard Generation (No parent, or is the parent itself)
  const usedItemIds = new Set<string>(); 
  const weeks: WeeklyCyclePlan[] = [];
  let prevWeekIngredients = new Set<string>();

  for (let i = 1; i <= 4; i++) {
    const weekPlan = generateWeeklyCycle(i, target, usedItemIds, prevWeekIngredients, enableDuplicationCheck);
    
    weekPlan.items.forEach(item => usedItemIds.add(item.id));
    prevWeekIngredients = new Set(weekPlan.items.map(i => i.mainIngredient).filter(ing => ing !== 'vegetable'));

    weeks.push(weekPlan);
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    monthLabel,
    cycleType,
    target,
    weeks
  };
};

// Helper for swapping items manually
export const getSwapCandidates = (
  currentPlan: MonthlyMealPlan, 
  itemToSwap: MenuItem,
  targetWeekIndex: number
): MenuItem[] => {
  const allUsedIds = new Set<string>();
  currentPlan.weeks.forEach(w => w.items.forEach(i => allUsedIds.add(i.id)));
  
  // Previous week ingredients for the target week
  const prevWeek = currentPlan.weeks.find(w => w.weekIndex === targetWeekIndex - 1);
  const prevIngredients = new Set(prevWeek?.items.map(i => i.mainIngredient) || []);

  const config = TARGET_CONFIGS[currentPlan.target];

  return MOCK_MENU_DB.filter(item => {
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
