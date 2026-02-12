import { describe, it, expect } from 'vitest';
import { validateMenuItem, validateMealPlanConfig, getFieldError } from '../services/validationService';
import { MenuCategory, TargetType } from '../types';

describe('validateMenuItem', () => {
  const validItem = {
    name: '소고기볶음',
    category: MenuCategory.MAIN,
    cost: 3000,
    recommendedPrice: 8000,
    mainIngredient: 'beef',
    weight: 300,
  };

  // ---------- valid item passes ----------

  it('valid item passes validation with no errors', () => {
    const result = validateMenuItem(validItem);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('valid item with zero weight passes', () => {
    const result = validateMenuItem({ ...validItem, weight: 0 });
    expect(result.isValid).toBe(true);
  });

  it('valid item with zero cost and zero price passes', () => {
    const result = validateMenuItem({ ...validItem, cost: 0, recommendedPrice: 0 });
    expect(result.isValid).toBe(true);
  });

  // ---------- catches missing name ----------

  it('catches missing name (empty string)', () => {
    const result = validateMenuItem({ ...validItem, name: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({ field: 'name' }));
  });

  it('catches missing name (whitespace only)', () => {
    const result = validateMenuItem({ ...validItem, name: '   ' });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'name')).toBe(true);
  });

  it('catches missing name (undefined)', () => {
    const { name, ...noName } = validItem;
    const result = validateMenuItem(noName);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'name')).toBe(true);
  });

  // ---------- catches negative cost ----------

  it('catches negative cost', () => {
    const result = validateMenuItem({ ...validItem, cost: -100 });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'cost')).toBe(true);
  });

  it('catches null/undefined cost', () => {
    const { cost, ...noCost } = validItem;
    const result = validateMenuItem(noCost);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'cost')).toBe(true);
  });

  // ---------- catches negative recommended price ----------

  it('catches negative recommended price', () => {
    const result = validateMenuItem({ ...validItem, recommendedPrice: -1 });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'recommendedPrice')).toBe(true);
  });

  // ---------- cost > recommendedPrice ----------

  it('catches cost higher than recommended price', () => {
    const result = validateMenuItem({ ...validItem, cost: 10000, recommendedPrice: 5000 });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'cost' && e.message.includes('판매가'))).toBe(true);
  });

  // ---------- catches missing category ----------

  it('catches missing category', () => {
    const { category, ...noCat } = validItem;
    const result = validateMenuItem(noCat);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'category')).toBe(true);
  });

  // ---------- catches missing main ingredient ----------

  it('catches empty main ingredient', () => {
    const result = validateMenuItem({ ...validItem, mainIngredient: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'mainIngredient')).toBe(true);
  });

  it('catches undefined main ingredient', () => {
    const { mainIngredient, ...noIng } = validItem;
    const result = validateMenuItem(noIng);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'mainIngredient')).toBe(true);
  });

  // ---------- catches negative weight ----------

  it('catches negative weight', () => {
    const result = validateMenuItem({ ...validItem, weight: -10 });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'weight')).toBe(true);
  });

  // ---------- multiple errors at once ----------

  it('returns multiple errors when several fields are invalid', () => {
    const result = validateMenuItem({ cost: -1, recommendedPrice: -1 });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('validateMealPlanConfig', () => {
  const validConfig = {
    target: TargetType.KIDS,
    targetPrice: 36800,
    targetCostRatio: 30,
    composition: {
      [MenuCategory.SOUP]: 1,
      [MenuCategory.MAIN]: 1,
      [MenuCategory.SIDE]: 3,
    },
  };

  it('valid config passes validation', () => {
    const result = validateMealPlanConfig(validConfig);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('catches missing target', () => {
    const { target, ...noTarget } = validConfig;
    const result = validateMealPlanConfig(noTarget);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'target')).toBe(true);
  });

  it('catches zero target price', () => {
    const result = validateMealPlanConfig({ ...validConfig, targetPrice: 0 });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'targetPrice')).toBe(true);
  });

  it('catches negative target price', () => {
    const result = validateMealPlanConfig({ ...validConfig, targetPrice: -100 });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'targetPrice')).toBe(true);
  });

  it('catches zero cost ratio', () => {
    const result = validateMealPlanConfig({ ...validConfig, targetCostRatio: 0 });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'targetCostRatio')).toBe(true);
  });

  it('catches cost ratio over 100', () => {
    const result = validateMealPlanConfig({ ...validConfig, targetCostRatio: 101 });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'targetCostRatio')).toBe(true);
  });

  it('catches all-zero composition', () => {
    const result = validateMealPlanConfig({
      ...validConfig,
      composition: {
        [MenuCategory.SOUP]: 0,
        [MenuCategory.MAIN]: 0,
        [MenuCategory.SIDE]: 0,
      },
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'composition')).toBe(true);
  });
});

describe('getFieldError', () => {
  it('returns the error message for a matching field', () => {
    const errors = [
      { field: 'name', message: '메뉴명은 필수입니다.' },
      { field: 'cost', message: '원가는 0 이상이어야 합니다.' },
    ];
    expect(getFieldError(errors, 'name')).toBe('메뉴명은 필수입니다.');
    expect(getFieldError(errors, 'cost')).toBe('원가는 0 이상이어야 합니다.');
  });

  it('returns the first match when multiple errors exist for same field', () => {
    const errors = [
      { field: 'cost', message: '원가는 0 이상이어야 합니다.' },
      { field: 'cost', message: '원가가 판매가보다 높습니다.' },
    ];
    expect(getFieldError(errors, 'cost')).toBe('원가는 0 이상이어야 합니다.');
  });

  it('returns undefined when field has no error', () => {
    const errors = [{ field: 'name', message: '메뉴명은 필수입니다.' }];
    expect(getFieldError(errors, 'cost')).toBeUndefined();
  });

  it('returns undefined for empty errors array', () => {
    expect(getFieldError([], 'name')).toBeUndefined();
  });
});
