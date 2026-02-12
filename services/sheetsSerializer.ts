// TypeScript 객체 <-> Google Sheets 셀 배열 변환 서비스
import { MenuItem, MenuCategory, Season, TasteProfile, MealPlanConfig } from '../types';

// 배열을 쉼표 구분 문자열로 변환
const arrayToCell = (arr: string[]): string => arr.join(',');
const cellToArray = (cell: string): string[] =>
  cell
    ? cell
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : [];

// MenuItem -> 셀 배열 (1행)
export const menuItemToRow = (item: MenuItem): string[] => [
  item.id,
  item.code || '',
  item.name,
  item.category,
  String(item.cost),
  String(item.recommendedPrice),
  arrayToCell(item.tastes),
  item.season,
  arrayToCell(item.tags),
  String(item.isSpicy),
  item.mainIngredient,
  String(item.process || 0),
  String(item.weight || 0),
  String(item.isUnused || false),
  item.imageUrl || '',
];

// 셀 배열 -> MenuItem
export const rowToMenuItem = (row: string[]): MenuItem => ({
  id: row[0],
  code: row[1] || undefined,
  name: row[2],
  category: row[3] as MenuCategory,
  cost: Number(row[4]) || 0,
  recommendedPrice: Number(row[5]) || 0,
  tastes: cellToArray(row[6]) as TasteProfile[],
  season: (row[7] as Season) || Season.ALL,
  tags: cellToArray(row[8]),
  isSpicy: row[9] === 'true',
  mainIngredient: row[10] || 'vegetable',
  process: Number(row[11]) || 0,
  weight: Number(row[12]) || 0,
  isUnused: row[13] === 'true',
  imageUrl: row[14] || undefined,
});

// 메뉴DB 헤더
export const MENU_DB_HEADERS = [
  'id',
  'code',
  'name',
  'category',
  'cost',
  'recommendedPrice',
  'tastes',
  'season',
  'tags',
  'isSpicy',
  'mainIngredient',
  'process',
  'weight',
  'isUnused',
  'imageUrl',
];

// MealPlanConfig -> 셀 배열
export const configToRow = (config: MealPlanConfig): string[] => [
  config.target,
  String(config.budgetCap),
  String(config.targetPrice),
  String(config.targetCostRatio),
  String(config.composition['국/찌개'] || 0),
  String(config.composition['메인요리'] || 0),
  String(config.composition['밑반찬'] || 0),
  arrayToCell(config.bannedTags),
  arrayToCell(config.requiredTags),
  config.parentTarget || '',
];

export const CONFIG_HEADERS = [
  'target',
  'budgetCap',
  'targetPrice',
  'targetCostRatio',
  'soupCount',
  'mainCount',
  'sideCount',
  'bannedTags',
  'requiredTags',
  'parentTarget',
];
