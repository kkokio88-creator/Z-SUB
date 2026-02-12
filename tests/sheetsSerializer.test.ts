import { describe, it, expect } from 'vitest';
import {
  menuItemToRow,
  rowToMenuItem,
  configToRow,
  rowToConfig,
  MENU_DB_HEADERS,
  CONFIG_HEADERS,
} from '../services/sheetsSerializer';
import { MenuCategory, Season, TasteProfile, TargetType } from '../types';
import type { MenuItem, MealPlanConfig } from '../types';

// ---------- helpers ----------

const sampleItem: MenuItem = {
  id: 'item-001',
  code: 'ZIP_P_0001',
  name: '소고기볶음',
  category: MenuCategory.MAIN,
  cost: 3000,
  recommendedPrice: 8000,
  tastes: [TasteProfile.SALTY, TasteProfile.OILY],
  season: Season.ALL,
  tags: ['beef', 'protein'],
  isSpicy: false,
  mainIngredient: 'beef',
  process: 11,
  weight: 300,
  isUnused: false,
  imageUrl: 'https://example.com/img.jpg',
};

const sampleConfig: MealPlanConfig = {
  target: TargetType.KIDS,
  budgetCap: 11040,
  targetPrice: 36800,
  targetCostRatio: 30,
  composition: {
    [MenuCategory.SOUP]: 1,
    [MenuCategory.MAIN]: 1,
    [MenuCategory.SIDE]: 3,
  },
  bannedTags: ['spicy', 'allergy'],
  requiredTags: ['kids-friendly'],
  parentTarget: TargetType.FAMILY,
};

// ---------- menuItemToRow ----------

describe('menuItemToRow', () => {
  it('converts a MenuItem to a string array of correct length', () => {
    const row = menuItemToRow(sampleItem);
    expect(row).toHaveLength(MENU_DB_HEADERS.length);
  });

  it('places fields in the correct column positions', () => {
    const row = menuItemToRow(sampleItem);

    expect(row[0]).toBe('item-001'); // id
    expect(row[1]).toBe('ZIP_P_0001'); // code
    expect(row[2]).toBe('소고기볶음'); // name
    expect(row[3]).toBe(MenuCategory.MAIN); // category
    expect(row[4]).toBe('3000'); // cost
    expect(row[5]).toBe('8000'); // recommendedPrice
    expect(row[6]).toBe('짭짤함,느끼함'); // tastes (comma-separated)
    expect(row[7]).toBe(Season.ALL); // season
    expect(row[8]).toBe('beef,protein'); // tags (comma-separated)
    expect(row[9]).toBe('false'); // isSpicy
    expect(row[10]).toBe('beef'); // mainIngredient
    expect(row[11]).toBe('11'); // process
    expect(row[12]).toBe('300'); // weight
    expect(row[13]).toBe('false'); // isUnused
    expect(row[14]).toBe('https://example.com/img.jpg'); // imageUrl
  });

  it('converts empty optional fields to empty strings or defaults', () => {
    const minimalItem: MenuItem = {
      ...sampleItem,
      code: undefined,
      imageUrl: undefined,
      process: undefined,
      weight: undefined,
      isUnused: undefined,
    };
    const row = menuItemToRow(minimalItem);

    expect(row[1]).toBe(''); // code
    expect(row[11]).toBe('0'); // process defaults to 0
    expect(row[12]).toBe('0'); // weight defaults to 0
    expect(row[13]).toBe('false'); // isUnused defaults to false
    expect(row[14]).toBe(''); // imageUrl
  });

  it('serializes empty tastes and tags arrays as empty string', () => {
    const item: MenuItem = { ...sampleItem, tastes: [], tags: [] };
    const row = menuItemToRow(item);
    expect(row[6]).toBe('');
    expect(row[8]).toBe('');
  });

  it('converts boolean isSpicy=true correctly', () => {
    const item: MenuItem = { ...sampleItem, isSpicy: true };
    const row = menuItemToRow(item);
    expect(row[9]).toBe('true');
  });
});

// ---------- rowToMenuItem ----------

describe('rowToMenuItem', () => {
  it('converts a string array back to a MenuItem', () => {
    const row = menuItemToRow(sampleItem);
    const item = rowToMenuItem(row);

    expect(item.id).toBe('item-001');
    expect(item.code).toBe('ZIP_P_0001');
    expect(item.name).toBe('소고기볶음');
    expect(item.category).toBe(MenuCategory.MAIN);
    expect(item.cost).toBe(3000);
    expect(item.recommendedPrice).toBe(8000);
    expect(item.season).toBe(Season.ALL);
    expect(item.isSpicy).toBe(false);
    expect(item.mainIngredient).toBe('beef');
    expect(item.process).toBe(11);
    expect(item.weight).toBe(300);
    expect(item.isUnused).toBe(false);
    expect(item.imageUrl).toBe('https://example.com/img.jpg');
  });

  it('parses tastes as an array of TasteProfile values', () => {
    const row = menuItemToRow(sampleItem);
    const item = rowToMenuItem(row);
    expect(item.tastes).toEqual([TasteProfile.SALTY, TasteProfile.OILY]);
  });

  it('parses tags as a string array', () => {
    const row = menuItemToRow(sampleItem);
    const item = rowToMenuItem(row);
    expect(item.tags).toEqual(['beef', 'protein']);
  });

  it('handles empty tastes/tags cells', () => {
    const row = menuItemToRow({ ...sampleItem, tastes: [], tags: [] });
    const item = rowToMenuItem(row);
    expect(item.tastes).toEqual([]);
    expect(item.tags).toEqual([]);
  });

  it('parses isSpicy=true string correctly', () => {
    const row = menuItemToRow({ ...sampleItem, isSpicy: true });
    const item = rowToMenuItem(row);
    expect(item.isSpicy).toBe(true);
  });

  it('parses isUnused=true string correctly', () => {
    const row = menuItemToRow({ ...sampleItem, isUnused: true });
    const item = rowToMenuItem(row);
    expect(item.isUnused).toBe(true);
  });

  it('defaults season to ALL when empty', () => {
    const row = menuItemToRow(sampleItem);
    row[7] = '';
    const item = rowToMenuItem(row);
    expect(item.season).toBe(Season.ALL);
  });

  it('defaults mainIngredient to "vegetable" when empty', () => {
    const row = menuItemToRow(sampleItem);
    row[10] = '';
    const item = rowToMenuItem(row);
    expect(item.mainIngredient).toBe('vegetable');
  });

  it('defaults numeric fields to 0 for non-numeric strings', () => {
    const row = menuItemToRow(sampleItem);
    row[4] = 'abc'; // invalid cost
    row[5] = ''; // empty recommendedPrice
    const item = rowToMenuItem(row);
    expect(item.cost).toBe(0);
    expect(item.recommendedPrice).toBe(0);
  });

  it('returns undefined code when cell is empty', () => {
    const row = menuItemToRow({ ...sampleItem, code: undefined });
    const item = rowToMenuItem(row);
    expect(item.code).toBeUndefined();
  });

  it('returns undefined imageUrl when cell is empty', () => {
    const row = menuItemToRow({ ...sampleItem, imageUrl: undefined });
    const item = rowToMenuItem(row);
    expect(item.imageUrl).toBeUndefined();
  });
});

// ---------- round-trip conversion ----------

describe('round-trip MenuItem conversion', () => {
  it('preserves all data through menuItemToRow -> rowToMenuItem', () => {
    const row = menuItemToRow(sampleItem);
    const restored = rowToMenuItem(row);

    expect(restored.id).toBe(sampleItem.id);
    expect(restored.code).toBe(sampleItem.code);
    expect(restored.name).toBe(sampleItem.name);
    expect(restored.category).toBe(sampleItem.category);
    expect(restored.cost).toBe(sampleItem.cost);
    expect(restored.recommendedPrice).toBe(sampleItem.recommendedPrice);
    expect(restored.tastes).toEqual(sampleItem.tastes);
    expect(restored.season).toBe(sampleItem.season);
    expect(restored.tags).toEqual(sampleItem.tags);
    expect(restored.isSpicy).toBe(sampleItem.isSpicy);
    expect(restored.mainIngredient).toBe(sampleItem.mainIngredient);
    expect(restored.process).toBe(sampleItem.process);
    expect(restored.weight).toBe(sampleItem.weight);
    expect(restored.isUnused).toBe(sampleItem.isUnused);
    expect(restored.imageUrl).toBe(sampleItem.imageUrl);
  });

  it('preserves data for spicy item with isUnused=true', () => {
    const spicyItem: MenuItem = {
      ...sampleItem,
      isSpicy: true,
      isUnused: true,
      tastes: [TasteProfile.SPICY],
    };
    const restored = rowToMenuItem(menuItemToRow(spicyItem));

    expect(restored.isSpicy).toBe(true);
    expect(restored.isUnused).toBe(true);
    expect(restored.tastes).toEqual([TasteProfile.SPICY]);
  });

  it('preserves data for item with empty optional fields', () => {
    const minItem: MenuItem = {
      ...sampleItem,
      code: undefined,
      process: 0,
      weight: 0,
      isUnused: false,
      imageUrl: undefined,
      tags: [],
      tastes: [],
    };
    const restored = rowToMenuItem(menuItemToRow(minItem));

    expect(restored.code).toBeUndefined();
    expect(restored.process).toBe(0);
    expect(restored.weight).toBe(0);
    expect(restored.isUnused).toBe(false);
    expect(restored.imageUrl).toBeUndefined();
    expect(restored.tags).toEqual([]);
    expect(restored.tastes).toEqual([]);
  });
});

// ---------- configToRow ----------

describe('configToRow', () => {
  it('converts a MealPlanConfig to a string array of correct length', () => {
    const row = configToRow(sampleConfig);
    expect(row).toHaveLength(CONFIG_HEADERS.length);
  });

  it('places config fields in the correct column positions', () => {
    const row = configToRow(sampleConfig);

    expect(row[0]).toBe(TargetType.KIDS); // target
    expect(row[1]).toBe('11040'); // budgetCap
    expect(row[2]).toBe('36800'); // targetPrice
    expect(row[3]).toBe('30'); // targetCostRatio
    expect(row[4]).toBe('1'); // soup count
    expect(row[5]).toBe('1'); // main count
    expect(row[6]).toBe('3'); // side count
    expect(row[7]).toBe('spicy,allergy'); // bannedTags
    expect(row[8]).toBe('kids-friendly'); // requiredTags
    expect(row[9]).toBe(TargetType.FAMILY); // parentTarget
  });

  it('handles empty bannedTags and requiredTags', () => {
    const config: MealPlanConfig = {
      ...sampleConfig,
      bannedTags: [],
      requiredTags: [],
    };
    const row = configToRow(config);
    expect(row[7]).toBe('');
    expect(row[8]).toBe('');
  });

  it('handles missing parentTarget', () => {
    const config: MealPlanConfig = {
      ...sampleConfig,
      parentTarget: undefined,
    };
    const row = configToRow(config);
    expect(row[9]).toBe('');
  });

  it('handles zero composition values', () => {
    const config: MealPlanConfig = {
      ...sampleConfig,
      composition: {},
    };
    const row = configToRow(config);
    expect(row[4]).toBe('0');
    expect(row[5]).toBe('0');
    expect(row[6]).toBe('0');
  });
});

// ---------- rowToConfig ----------

describe('rowToConfig', () => {
  it('converts a string array back to a MealPlanConfig', () => {
    const row = configToRow(sampleConfig);
    const config = rowToConfig(row);

    expect(config.target).toBe(TargetType.KIDS);
    expect(config.budgetCap).toBe(11040);
    expect(config.targetPrice).toBe(36800);
    expect(config.targetCostRatio).toBe(30);
  });

  it('parses composition counts correctly', () => {
    const row = configToRow(sampleConfig);
    const config = rowToConfig(row);

    expect(config.composition[MenuCategory.SOUP]).toBe(1);
    expect(config.composition[MenuCategory.MAIN]).toBe(1);
    expect(config.composition[MenuCategory.SIDE]).toBe(3);
  });

  it('parses bannedTags and requiredTags as arrays', () => {
    const row = configToRow(sampleConfig);
    const config = rowToConfig(row);

    expect(config.bannedTags).toEqual(['spicy', 'allergy']);
    expect(config.requiredTags).toEqual(['kids-friendly']);
  });

  it('parses parentTarget correctly', () => {
    const row = configToRow(sampleConfig);
    const config = rowToConfig(row);
    expect(config.parentTarget).toBe(TargetType.FAMILY);
  });

  it('returns undefined parentTarget when cell is empty', () => {
    const row = configToRow({ ...sampleConfig, parentTarget: undefined });
    const config = rowToConfig(row);
    expect(config.parentTarget).toBeUndefined();
  });

  it('defaults numeric fields to 0 for invalid data', () => {
    const row = configToRow(sampleConfig);
    row[1] = 'invalid'; // budgetCap
    row[2] = ''; // targetPrice
    const config = rowToConfig(row);
    expect(config.budgetCap).toBe(0);
    expect(config.targetPrice).toBe(0);
  });

  it('handles empty bannedTags and requiredTags cells', () => {
    const row = configToRow({
      ...sampleConfig,
      bannedTags: [],
      requiredTags: [],
    });
    const config = rowToConfig(row);
    expect(config.bannedTags).toEqual([]);
    expect(config.requiredTags).toEqual([]);
  });
});

// ---------- round-trip config conversion ----------

describe('round-trip MealPlanConfig conversion', () => {
  it('preserves all config data through configToRow -> rowToConfig', () => {
    const row = configToRow(sampleConfig);
    const restored = rowToConfig(row);

    expect(restored.target).toBe(sampleConfig.target);
    expect(restored.budgetCap).toBe(sampleConfig.budgetCap);
    expect(restored.targetPrice).toBe(sampleConfig.targetPrice);
    expect(restored.targetCostRatio).toBe(sampleConfig.targetCostRatio);
    expect(restored.composition[MenuCategory.SOUP]).toBe(sampleConfig.composition[MenuCategory.SOUP]);
    expect(restored.composition[MenuCategory.MAIN]).toBe(sampleConfig.composition[MenuCategory.MAIN]);
    expect(restored.composition[MenuCategory.SIDE]).toBe(sampleConfig.composition[MenuCategory.SIDE]);
    expect(restored.bannedTags).toEqual(sampleConfig.bannedTags);
    expect(restored.requiredTags).toEqual(sampleConfig.requiredTags);
    expect(restored.parentTarget).toBe(sampleConfig.parentTarget);
  });
});
