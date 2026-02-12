
// 식단 유형 정의
export enum TargetType {
  KIDS = '아이 식단',
  KIDS_PLUS = '든든한 아이 식단',
  SIDE_ONLY = '골고루 반찬 식단',
  SENIOR_HEALTH = '건강한 시니어 식단',
  SENIOR = '시니어 식단',
  YOUTH = '청소연구소 식단',
  YOUTH_MAIN = '청소연구소 메인 식단',
  VALUE = '실속 식단',
  FAMILY = '가족 식단',
  FAMILY_PLUS = '든든한 가족 식단',
}

export enum MenuCategory {
  SOUP = '국/찌개',
  MAIN = '메인요리',
  SIDE = '밑반찬',
  DESSERT = '디저트/간식',
}

export enum TasteProfile {
  SPICY = '매운맛',
  OILY = '느끼함',
  SALTY = '짭짤함',
  SWEET = '달콤함',
  BLAND = '담백함',
}

export enum Season {
  SPRING = '봄',
  SUMMER = '여름',
  AUTUMN = '가을',
  WINTER = '겨울',
  ALL = '사계절',
}

// 식단 주기 타입
export type CycleType = "화수목" | "금토월";

// 메뉴 아이템 인터페이스
export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  cost: number; // 원가
  recommendedPrice: number; // 권장 판매가
  tastes: TasteProfile[];
  season: Season;
  tags: string[]; 
  isSpicy: boolean; 
  mainIngredient: string; // e.g. 'pork', 'beef', 'chicken', 'tofu', 'seaweed'
  
  // DB 관리용 추가 필드 (Optional for backward compatibility in logic, but populated in DB)
  code?: string; // 품목코드 (ZIP_P_XXXX)
  process?: number; // 공정 번호 (11, 22 etc)
  weight?: number; // 용량 (g)
  isUnused?: boolean; // 미사용 여부
  imageUrl?: string;
}

// 식단 구성 규칙
export interface MealPlanConfig {
  target: TargetType;
  budgetCap: number; // Calculated from targetPrice * targetCostRatio
  targetPrice: number;
  targetCostRatio: number; // New: 목표 원가율 (e.g., 30 for 30%)
  composition: {
    [key in MenuCategory]?: number; 
  };
  bannedTags: string[];
  requiredTags: string[];
  parentTarget?: TargetType; // 상위 식단 (Inheritance source)
}

// 주간 식단 (하나의 주기에 대한 식단)
export interface WeeklyCyclePlan {
  weekIndex: number; // 1, 2, 3, 4
  items: MenuItem[];
  totalCost: number;
  totalPrice: number;
  isValid: boolean;
  warnings: string[];
}

// 월간 식단 (4주치)
export interface MonthlyMealPlan {
  id: string;
  monthLabel: string; // "3월"
  cycleType: CycleType; // "화수목" or "금토월"
  target: TargetType;
  weeks: WeeklyCyclePlan[]; // Array of 4 weeks
}

// 전문가 리뷰 응답 구조
export interface ExpertReview {
  nutritionistComment: string; // 영양사 의견
  processExpertComment: string; // 공정 전문가 의견 (대량 조리 등)
  costExpertComment: string; // 단가 전문가 의견
  overallScore: number;
  flaggedItemIds: string[]; // 문제가 있는 메뉴 ID 목록
}
