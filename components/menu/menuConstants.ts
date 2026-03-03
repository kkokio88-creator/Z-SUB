import { MenuCategory } from '../../types';

export const PAGE_SIZE = 50;

export const INGREDIENT_LABELS: Record<string, string> = {
  beef: '소고기',
  pork: '한돈',
  chicken: '닭',
  fish: '생선',
  tofu: '두부',
  egg: '달걀',
  potato: '감자',
  seaweed: '해조류',
  mushroom: '버섯',
  vegetable: '채소',
};

export type SortField = 'name' | 'category' | 'recommendedPrice' | 'cost' | 'season' | 'mainIngredient' | 'weight';
export type SortDir = 'asc' | 'desc';

export const categoryBadgeClass = (cat: MenuCategory) => {
  switch (cat) {
    case MenuCategory.MAIN:
      return 'bg-orange-100 text-orange-700';
    case MenuCategory.SOUP:
      return 'bg-blue-100 text-blue-700';
    case MenuCategory.DESSERT:
      return 'bg-purple-100 text-purple-700';
    default:
      return 'bg-green-100 text-green-700';
  }
};
