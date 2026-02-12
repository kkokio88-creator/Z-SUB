import { MenuItem, MealPlanConfig } from '../types';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export const validateMenuItem = (item: Partial<MenuItem>): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!item.name || item.name.trim().length === 0) {
    errors.push({ field: 'name', message: '메뉴명은 필수입니다.' });
  }

  if (!item.category) {
    errors.push({ field: 'category', message: '카테고리를 선택해주세요.' });
  }

  if (item.cost == null || item.cost < 0) {
    errors.push({ field: 'cost', message: '원가는 0 이상이어야 합니다.' });
  }

  if (item.recommendedPrice == null || item.recommendedPrice < 0) {
    errors.push({ field: 'recommendedPrice', message: '판매가는 0 이상이어야 합니다.' });
  }

  if (item.cost != null && item.recommendedPrice != null && item.cost > item.recommendedPrice) {
    errors.push({ field: 'cost', message: '원가가 판매가보다 높습니다.' });
  }

  if (!item.mainIngredient || item.mainIngredient.trim().length === 0) {
    errors.push({ field: 'mainIngredient', message: '주재료를 선택해주세요.' });
  }

  if (item.weight != null && item.weight < 0) {
    errors.push({ field: 'weight', message: '중량은 0 이상이어야 합니다.' });
  }

  return { isValid: errors.length === 0, errors };
};

export const validateMealPlanConfig = (config: Partial<MealPlanConfig>): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!config.target || config.target.trim().length === 0) {
    errors.push({ field: 'target', message: '식단명은 필수입니다.' });
  }

  if (config.targetPrice == null || config.targetPrice <= 0) {
    errors.push({ field: 'targetPrice', message: '판매가는 0보다 커야 합니다.' });
  }

  if (config.targetCostRatio == null || config.targetCostRatio <= 0 || config.targetCostRatio > 100) {
    errors.push({ field: 'targetCostRatio', message: '원가율은 1~100% 사이여야 합니다.' });
  }

  if (config.composition) {
    const totalItems = Object.values(config.composition).reduce((acc, v) => acc + (v || 0), 0);
    if (totalItems === 0) {
      errors.push({ field: 'composition', message: '최소 1개 이상의 메뉴 구성이 필요합니다.' });
    }
  }

  return { isValid: errors.length === 0, errors };
};

export const getFieldError = (errors: ValidationError[], field: string): string | undefined => {
  return errors.find(e => e.field === field)?.message;
};
