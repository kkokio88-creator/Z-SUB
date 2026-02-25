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
// 메뉴명 정규화: 냉장/반조리/냉동 태그 + 후미 숫자 제거
const normalizeMenuName = (name: string): string =>
  name
    .replace(/_냉장|_반조리|_냉동/g, '')
    .replace(/\s+\d+$/, '')
    .trim();

const generateWeeklyCycle = (
  weekIndex: number,
  target: TargetType,
  menuDB: MenuItem[],
  usedItemIds: Set<string>,
  prevWeekIngredients: Set<string>,
  enableDuplicationCheck: boolean,
  prevWeekMenuNames: string[] = [],
  historyContext?: {
    excludedNames: Set<string>;
    menuLastUsed: Map<string, string>;
    excludedNames30?: Set<string>;
  },
  otherCycleIngredients?: Map<number, string[]>,
  otherTargetIngredients?: Map<number, string[]>
): WeeklyCyclePlan => {
  const excludedNames = historyContext?.excludedNames;
  const excludedNames30 = historyContext?.excludedNames30;
  const config = TARGET_CONFIGS[target];
  const warnings: string[] = [];
  let selectedItems: MenuItem[] = [];
  const ingredientCount: Record<string, number> = {};
  const usedHistory: Record<string, string> = {};
  const fallbackItems: string[] = [];

  // 다른 주기에서 사용된 주재료 (같은 weekIndex)
  const otherIngredients = otherCycleIngredients?.get(weekIndex) || [];
  const otherIngredientsSet = new Set(otherIngredients);

  // 다른 타겟에서 사용된 주재료 (같은 weekIndex, 같은 날)
  const otherTargetIngs = otherTargetIngredients?.get(weekIndex) || [];
  const otherTargetIngsSet = new Set(otherTargetIngs);

  // 기본 필터 (60일 제외 + bannedTags + requiredTags + spicy)
  const baseFilter = (item: MenuItem, skipHistoryExclude: boolean = false): boolean => {
    if (enableDuplicationCheck && usedItemIds.has(item.id)) return false;
    if (!skipHistoryExclude && excludedNames && excludedNames.has(normalizeMenuName(item.name))) return false;
    if (config.bannedTags.length > 0) {
      const hasBannedTag = item.tags.some(tag => config.bannedTags.includes(tag));
      if (hasBannedTag) return false;
    }
    if ((target === TargetType.KIDS || target === TargetType.KIDS_PLUS) && item.isSpicy) return false;
    if (config.requiredTags.length > 0) {
      if (!item.tags.some(tag => config.requiredTags.includes(tag))) return false;
    }
    return true;
  };

  // 1차: 60일 제외 필터
  const availableMenu60 = menuDB.filter(item => baseFilter(item, false));

  // 2차: 30일 제외 필터 (60일 제외에서 걸러진 것 중 30일은 통과하는 아이템)
  const availableMenu30 = excludedNames30
    ? menuDB.filter(item => {
        if (enableDuplicationCheck && usedItemIds.has(item.id)) return false;
        // 30일 제외 목록에 있으면 제외
        if (excludedNames30.has(normalizeMenuName(item.name))) return false;
        if (config.bannedTags.length > 0) {
          const hasBannedTag = item.tags.some(tag => config.bannedTags.includes(tag));
          if (hasBannedTag) return false;
        }
        if ((target === TargetType.KIDS || target === TargetType.KIDS_PLUS) && item.isSpicy) return false;
        if (config.requiredTags.length > 0) {
          if (!item.tags.some(tag => config.requiredTags.includes(tag))) return false;
        }
        return true;
      })
    : null;

  // 카테고리별 선택 공통 로직
  const selectFromPool = (
    pool: MenuItem[],
    category: MenuCategory,
    count: number,
    alreadySelected: MenuItem[]
  ): MenuItem[] => {
    const itemsInCategory = pool.filter(m => m.category === category);
    // 이미 선택된 아이템 ID 제외
    const alreadyIds = new Set(alreadySelected.map(s => s.id));
    const remaining = itemsInCategory.filter(m => !alreadyIds.has(m.id));

    // Sort logic:
    // 1. Deprioritize items with main ingredients used last week
    // 2. Prioritize required tags
    // 3. Deprioritize items with main ingredients used in other cycle (배송 그룹 간 분배)
    const prioritized = remaining.sort((a, b) => {
      // Penalty for repeated ingredients from previous week
      const aRepeats = prevWeekIngredients.has(a.mainIngredient) ? 1 : 0;
      const bRepeats = prevWeekIngredients.has(b.mainIngredient) ? 1 : 0;
      if (aRepeats !== bRepeats) return aRepeats - bRepeats;

      // Penalty for ingredients used in other delivery cycle (50:50 분배)
      const aOtherCycle = otherIngredientsSet.has(a.mainIngredient) ? 1 : 0;
      const bOtherCycle = otherIngredientsSet.has(b.mainIngredient) ? 1 : 0;
      if (aOtherCycle !== bOtherCycle) return aOtherCycle - bOtherCycle;

      // Penalty for ingredients used in other target (같은 날 다른 식단 간 식재료 분배)
      const aOtherTarget = otherTargetIngsSet.has(a.mainIngredient) ? 1 : 0;
      const bOtherTarget = otherTargetIngsSet.has(b.mainIngredient) ? 1 : 0;
      if (aOtherTarget !== bOtherTarget) return aOtherTarget - bOtherTarget;

      // Bonus for required tags
      const aMatch = a.tags.some(t => config.requiredTags.includes(t)) ? 1 : 0;
      const bMatch = b.tags.some(t => config.requiredTags.includes(t)) ? 1 : 0;
      return bMatch - aMatch;
    });

    // Filter out items similar to previous week's menus
    const nonSimilarCandidates = prioritized.filter(
      i => !prevWeekMenuNames.some(prevName => isSimilarMenu(i.name, prevName))
    );

    // Also filter by non-repeating ingredients
    const nonRepeatingCandidates = nonSimilarCandidates.filter(i => !prevWeekIngredients.has(i.mainIngredient));
    const fallbackPoolLocal = nonSimilarCandidates.length >= count ? nonSimilarCandidates : prioritized;
    const finalPool = nonRepeatingCandidates.length >= count ? nonRepeatingCandidates : fallbackPoolLocal;

    // 동일 식재료 2개 초과 방지 (채소 제외)
    const ingredientCapped = finalPool.filter(
      item => item.mainIngredient === 'vegetable' || (ingredientCount[item.mainIngredient] || 0) < 2
    );
    const pickPool = ingredientCapped.length >= count ? ingredientCapped : finalPool;

    // 같은 주 내 이미 선택된 메뉴와 유사한 것 제거
    const allSelected = [...selectedItems, ...alreadySelected];
    const nonSimilarToSelected = pickPool.filter(item => !allSelected.some(sel => isSimilarMenu(item.name, sel.name)));
    const safePool = nonSimilarToSelected.length >= count ? nonSimilarToSelected : pickPool;

    // 가격 우선 선택: 고가 아이템 상위 풀에서 랜덤 (다양성 + 가격 보장)
    const priceSorted = [...safePool].sort((a, b) => b.recommendedPrice - a.recommendedPrice);
    const topPool = priceSorted.slice(0, Math.max(count + 2, Math.min(safePool.length, count + 4)));
    return shuffle(topPool).slice(0, count);
  };

  // Select items by category (2단계: 60일 → 30일 fallback)
  Object.entries(config.composition).forEach(([cat, count]) => {
    const category = cat as MenuCategory;
    const needed = count as number;

    // 1차: 60일 제외 풀에서 선택
    let selected = selectFromPool(availableMenu60, category, needed, []);

    // 2차: 부족하면 30일 제외 풀에서 나머지 채우기
    if (selected.length < needed && availableMenu30) {
      const deficit = needed - selected.length;
      const extras30 = selectFromPool(availableMenu30, category, deficit, selected);
      // fallbackItems에 2차로 추가된 메뉴명 기록
      extras30.forEach(item => {
        fallbackItems.push(normalizeMenuName(item.name));
      });
      selected = [...selected, ...extras30];
    }

    // 3차 갯수 보장 폴백: excludedNames 전체 해제하여 재시도
    if (selected.length < needed && excludedNames && excludedNames.size > 0) {
      const deficit = needed - selected.length;
      const selectedIds = new Set(selected.map(s => s.id));
      const fallbackPoolFull = menuDB.filter(m => {
        if (m.category !== category) return false;
        if (selectedIds.has(m.id)) return false;
        if (enableDuplicationCheck && usedItemIds.has(m.id)) return false;
        if (config.bannedTags.length > 0 && m.tags.some(tag => config.bannedTags.includes(tag))) return false;
        if ((target === TargetType.KIDS || target === TargetType.KIDS_PLUS) && m.isSpicy) return false;
        if (config.requiredTags.length > 0 && !m.tags.some(tag => config.requiredTags.includes(tag))) return false;
        return true;
      });
      const extras = shuffle(fallbackPoolFull).slice(0, deficit);
      // 히스토리 메뉴 사용 기록
      if (historyContext?.menuLastUsed) {
        extras.forEach(item => {
          const clean = normalizeMenuName(item.name);
          const lastUsed = historyContext.menuLastUsed.get(clean);
          if (lastUsed) {
            usedHistory[clean] = lastUsed;
          }
        });
      }
      selected = [...selected, ...extras];
    }

    // 갯수 미달 경고
    if (selected.length < needed) {
      warnings.push(`갯수 미달: ${category} ${count}개 필요, ${selected.length}개만 선택됨`);
    }

    // 선택 후 ingredientCount 업데이트
    selected.forEach(item => {
      if (item.mainIngredient !== 'vegetable') {
        ingredientCount[item.mainIngredient] = (ingredientCount[item.mainIngredient] || 0) + 1;
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
  if (totalPrice < config.targetPrice) {
    warnings.push(
      `가격 미달: 단품합산 ${totalPrice.toLocaleString()}원 < 정책가 ${config.targetPrice.toLocaleString()}원`
    );
  }
  if (totalPrice > config.targetPrice * 1.1) {
    warnings.push(`가격 초과: 단품합산 ${totalPrice.toLocaleString()}원 > 정책가 110%`);
  }

  return {
    weekIndex,
    items: selectedItems,
    totalCost: currentCost,
    totalPrice,
    isValid: warnings.length === 0,
    warnings,
    usedHistory: Object.keys(usedHistory).length > 0 ? usedHistory : undefined,
    fallbackItems: fallbackItems.length > 0 ? fallbackItems : undefined,
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

      // 자식 타겟의 bannedTags + requiredTags 필터링
      const filteredItems = parentItemsInCategory.filter(item => {
        if (childConfig.bannedTags.length > 0) {
          if (item.tags.some(tag => childConfig.bannedTags.includes(tag))) return false;
        }
        if (childConfig.requiredTags.length > 0) {
          if (!item.tags.some(tag => childConfig.requiredTags.includes(tag))) return false;
        }
        return true;
      });

      const selected = filteredItems.slice(0, count as number);

      // 갯수 미달 경고
      if (selected.length < (count as number)) {
        warnings.push(`갯수 미달: ${category} ${count}개 필요, ${selected.length}개만 선택됨`);
      }

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

// 가격 미달 시 가장 싼 아이템을 같은 카테고리 고가 미사용 아이템으로 교체
const boostWeekPrice = (
  plan: WeeklyCyclePlan,
  target: TargetType,
  menuDB: MenuItem[],
  usedItemIds: Set<string>
): WeeklyCyclePlan => {
  const config = TARGET_CONFIGS[target];
  const items = [...plan.items];
  const usedIds = new Set([...usedItemIds, ...items.map(i => i.id)]);
  const ceiling = config.targetPrice * 1.1;
  let attempts = 0;

  while (items.reduce((s, i) => s + i.recommendedPrice, 0) < config.targetPrice && attempts < items.length * 2) {
    const currentTotal = items.reduce((s, i) => s + i.recommendedPrice, 0);
    if (currentTotal >= ceiling) break;

    const sorted = items
      .map((item, idx) => ({ item, idx }))
      .sort((a, b) => a.item.recommendedPrice - b.item.recommendedPrice);
    const cheapest = sorted[attempts];
    if (!cheapest) break;

    const maxReplacementPrice = ceiling - (currentTotal - cheapest.item.recommendedPrice);
    const replacement = menuDB
      .filter(
        m =>
          m.category === cheapest.item.category &&
          !usedIds.has(m.id) &&
          m.recommendedPrice > cheapest.item.recommendedPrice &&
          m.recommendedPrice <= maxReplacementPrice &&
          !config.bannedTags.some(t => m.tags.includes(t)) &&
          (config.requiredTags.length === 0 || m.tags.some(t => config.requiredTags.includes(t))) &&
          !((target === TargetType.KIDS || target === TargetType.KIDS_PLUS) && m.isSpicy)
      )
      .sort((a, b) => b.recommendedPrice - a.recommendedPrice)[0];

    if (replacement) {
      usedIds.add(replacement.id);
      items[cheapest.idx] = replacement;
    }
    attempts++;
  }

  const totalCost = items.reduce((s, i) => s + i.cost, 0);
  const totalPrice = items.reduce((s, i) => s + i.recommendedPrice, 0);
  const warnings = plan.warnings.filter(w => !w.includes('가격 미달') && !w.includes('가격 초과'));
  if (totalPrice < config.targetPrice) {
    warnings.push(
      `가격 미달: 단품합산 ${totalPrice.toLocaleString()}원 < 정책가 ${config.targetPrice.toLocaleString()}원`
    );
  }
  if (totalPrice > config.targetPrice * 1.1) {
    warnings.push(`가격 초과: 단품합산 ${totalPrice.toLocaleString()}원 > 정책가 110%`);
  }
  if (totalCost > config.budgetCap) {
    if (!warnings.some(w => w.includes('원가 초과'))) {
      warnings.push(`원가 초과: ${totalCost.toLocaleString()}원`);
    }
  }

  return { ...plan, items, totalCost, totalPrice, isValid: warnings.length === 0, warnings };
};

export const generateMonthlyMealPlan = (
  target: TargetType,
  monthLabel: string,
  cycleType: CycleType,
  enableDuplicationCheck: boolean,
  menuDB: MenuItem[],
  excludedNames?: Set<string>,
  menuLastUsed?: Map<string, string>,
  excludedNames30?: Set<string>,
  otherCycleIngredients?: Map<number, string[]>,
  otherTargetIngredients?: Map<number, string[]>
): MonthlyMealPlan => {
  const config = TARGET_CONFIGS[target];

  // If this target inherits from a parent, generate the parent plan first
  if (config.parentTarget) {
    const parentPlan = generateMonthlyMealPlan(
      config.parentTarget,
      monthLabel,
      cycleType,
      enableDuplicationCheck,
      menuDB,
      excludedNames,
      menuLastUsed,
      excludedNames30,
      otherCycleIngredients,
      otherTargetIngredients
    );
    return createSubsetPlan(parentPlan, target);
  }

  // Standard Generation (No parent, or is the parent itself)
  const usedItemIds = new Set<string>();
  const weeks: WeeklyCyclePlan[] = [];
  let prevWeekIngredients = new Set<string>();
  let prevWeekMenuNames: string[] = [];

  const historyCtx =
    excludedNames || menuLastUsed || excludedNames30
      ? {
          excludedNames: excludedNames || new Set<string>(),
          menuLastUsed: menuLastUsed || new Map<string, string>(),
          excludedNames30,
        }
      : undefined;

  for (let i = 1; i <= 4; i++) {
    let weekPlan = generateWeeklyCycle(
      i,
      target,
      menuDB,
      usedItemIds,
      prevWeekIngredients,
      enableDuplicationCheck,
      prevWeekMenuNames,
      historyCtx,
      otherCycleIngredients,
      otherTargetIngredients
    );

    // 가격 미달 시 boostWeekPrice로 보정
    if (weekPlan.totalPrice < config.targetPrice) {
      weekPlan = boostWeekPrice(weekPlan, target, menuDB, usedItemIds);
    }

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
  menuDB: MenuItem[],
  excludedNames?: Set<string>,
  filterLevel?: '60일' | '30일' | '전체',
  _nextMonthMenuNames?: Set<string>
): MenuItem[] => {
  const allUsedIds = new Set<string>();
  currentPlan.weeks.forEach(w => w.items.forEach(i => allUsedIds.add(i.id)));

  const prevWeek = currentPlan.weeks.find(w => w.weekIndex === targetWeekIndex - 1);
  const prevIngredients = new Set(prevWeek?.items.map(i => i.mainIngredient) || []);

  const config = TARGET_CONFIGS[currentPlan.target];

  return menuDB.filter(item => {
    if (item.id === itemToSwap.id) return false; // self
    if (item.category !== itemToSwap.category) return false; // same category
    if (allUsedIds.has(item.id)) return false; // 현재 식단 내 중복 방지

    // filterLevel에 따른 히스토리 제외 처리
    if (filterLevel !== '전체' && excludedNames) {
      if (excludedNames.has(normalizeMenuName(item.name))) return false;
    }

    // Banned tags
    if (config.bannedTags.some(t => item.tags.includes(t))) return false;

    // Required tags
    if (config.requiredTags.length > 0) {
      if (!item.tags.some(t => config.requiredTags.includes(t))) return false;
    }

    // Spicy filter for kids targets
    if ((currentPlan.target === TargetType.KIDS || currentPlan.target === TargetType.KIDS_PLUS) && item.isSpicy)
      return false;

    // Main ingredient overlap with previous week
    if (prevIngredients.has(item.mainIngredient) && item.mainIngredient !== 'vegetable') return false;

    return true;
  });
};
