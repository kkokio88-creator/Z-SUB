// 식단 유형 정의
export enum TargetType {
  VALUE = '실속 식단',
  SENIOR_HEALTH = '건강한 시니어 식단',
  SENIOR = '시니어 식단',
  YOUTH = '청소연구소 식단',
  YOUTH_MAIN = '청소연구소 메인 식단',
  FAMILY_PLUS = '든든한 가족 식단',
  FAMILY = '가족 식단',
  KIDS_PLUS = '든든한 아이 식단',
  KIDS = '아이 식단',
  SIDE_ONLY = '골고루 반찬 식단',
}

export enum MenuCategory {
  SOUP = '국/찌개',
  MAIN = '메인요리',
  SIDE = '밑반찬',
  DESSERT = '기타',
}

export enum TasteProfile {
  GANJANG = '간장',
  GOCHUJANG = '고추장',
  DOENJANG = '된장',
}

export enum Season {
  SPRING = '봄',
  SUMMER = '여름',
  AUTUMN = '가을',
  WINTER = '겨울',
  ALL = '사계절',
}

// 식단 주기 타입
export type CycleType = '화수목' | '금토월';

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
  launchDate?: string; // 출시월 (YYYY-MM) - 신제품 판별용
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
  usedHistory?: Record<string, string>; // 메뉴명 → YYYY-MM-DD (갯수 보장으로 선택된 히스토리 메뉴)
  fallbackItems?: string[]; // 2차 필터(30일)로 채워진 메뉴명 목록
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

// 유효성 검증 결과
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// 식단 버전 (히스토리)
export interface PlanVersion {
  id: string;
  planId: string;
  plan: MonthlyMealPlan;
  label: string;
  savedAt: string;
}

// Diff 결과
export interface PlanDiffResult {
  weekIndex: number;
  slotIndex: number;
  before: MenuItem;
  after: MenuItem;
}

// 히스토리 식단 데이터
export interface HistoricalMenuItem {
  name: string;
  process?: number;
  code?: string;
  price: number;
  cost: number;
}

export interface HistoricalTargetPlan {
  targetType: TargetType;
  items: HistoricalMenuItem[];
  totalPrice: number;
  totalCost: number;
  itemCount: number;
}

export interface HistoricalMealPlan {
  date: string; // YYYY-MM-DD
  cycleType: CycleType; // "화수목" | "금토월"
  targets: HistoricalTargetPlan[];
}

// 식단 검토/승인 워크플로우
export type ReviewDepartment = 'quality' | 'development' | 'process';
export type PlanStatus = 'draft' | 'review_requested' | 'approved' | 'finalized';

export interface DepartmentReview {
  department: ReviewDepartment;
  reviewer: string;
  status: 'pending' | 'approved' | 'rejected';
  comment: string;
  reviewedAt: string | null;
}

export interface PlanReviewRecord {
  planId: string;
  status: PlanStatus;
  requestedAt: string;
  requestedBy: string;
  departments: DepartmentReview[];
  finalizedAt: string | null;
}

// 인라인 코멘트 시스템
export interface ReviewComment {
  id: string;
  parentId?: string; // 쓰레드 답글용: 부모 코멘트 ID
  department: ReviewDepartment;
  reviewer: string;
  scope: 'plan' | 'week' | 'item';
  scopeKey: string; // plan: planId, week: "A-1", item: "A-1-돈까스"
  comment: string;
  status: 'comment' | 'issue' | 'resolved';
  createdAt: string;
}

// ── 주재료 컬러링 설정 ──
export interface IngredientColorConfig {
  key: string; // e.g. 'beef', 'pork'
  label: string;
  color: string; // tailwind color name e.g. 'red', 'pink'
  priority: number; // 낮을수록 우선
  enabled: boolean;
}

// ── 생산 한도 설정 ──
export interface ProductionLimitConfig {
  category: string; // e.g. '냉장국', '반조리'
  dailyLimit: number;
  enabled: boolean;
}

// ── 식단별 제품 태그 설정 ──
export interface TargetTagConfig {
  targetType: TargetType;
  allowedTags: string[];
  blockedTags: string[];
  blockedProducts: string[]; // 특정 제품명 제외
}

// ── 통합 생산 수량 아이템 ──
export interface ConsolidatedProductionItem {
  menuName: string;
  code?: string;
  process?: number;
  totalQuantity: number;
  byTarget: Record<string, number>; // targetType → quantity
  byCycle: Record<string, number>; // cycleType → quantity
}

// ── 수정 이력 ──
export interface ChangeHistoryEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  before?: string;
  after?: string;
}

// ── 필터 단계 ──
export type DuplicationFilterLevel = '60일' | '30일' | '전체';

// ── 2단계 생성 결과에서 fallback 정보 ──
export interface FallbackInfo {
  menuName: string;
  filterLevel: DuplicationFilterLevel; // 어떤 단계에서 선택되었는지
  lastUsedDate?: string;
}
