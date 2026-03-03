import { TargetType, MenuCategory } from '../../types';
import type { MenuItem } from '../../types';
import { INGREDIENT_KEYWORDS } from '../../constants';
import { stripProcessSuffix } from '../../services/menuUtils';

// ── 타겟 색상 ──

export const TARGET_COLORS: Record<string, string> = {
  [TargetType.VALUE]: 'bg-slate-100 text-slate-600',
  [TargetType.SENIOR_HEALTH]: 'bg-slate-100 text-slate-600',
  [TargetType.SENIOR]: 'bg-slate-100 text-slate-600',
  [TargetType.YOUTH]: 'bg-slate-100 text-slate-600',
  [TargetType.YOUTH_MAIN]: 'bg-slate-100 text-slate-600',
  [TargetType.FAMILY_PLUS]: 'bg-slate-100 text-slate-600',
  [TargetType.FAMILY]: 'bg-slate-100 text-slate-600',
  [TargetType.KIDS_PLUS]: 'bg-slate-100 text-slate-600',
  [TargetType.KIDS]: 'bg-slate-100 text-slate-600',
  [TargetType.SIDE_ONLY]: 'bg-slate-100 text-slate-600',
};

// ── 부모-자식 병합 매핑 ──

export interface MergeGroup {
  groupLabel: string;
  baseTarget: TargetType;
  plusTarget: TargetType;
  plusBadge: string;
  color: string;
}

export const TARGET_MERGE_MAP: MergeGroup[] = [
  {
    groupLabel: '시니어',
    baseTarget: TargetType.SENIOR,
    plusTarget: TargetType.SENIOR_HEALTH,
    plusBadge: '건강',
    color: 'bg-slate-100 text-slate-600',
  },
  {
    groupLabel: '가족',
    baseTarget: TargetType.FAMILY,
    plusTarget: TargetType.FAMILY_PLUS,
    plusBadge: '든든',
    color: 'bg-slate-100 text-slate-600',
  },
  {
    groupLabel: '아이',
    baseTarget: TargetType.KIDS,
    plusTarget: TargetType.KIDS_PLUS,
    plusBadge: '든든',
    color: 'bg-slate-100 text-slate-600',
  },
  {
    groupLabel: '청소연구소',
    baseTarget: TargetType.YOUTH,
    plusTarget: TargetType.YOUTH_MAIN,
    plusBadge: '메인',
    color: 'bg-slate-100 text-slate-600',
  },
];

export const STANDALONE_TARGETS = [TargetType.VALUE, TargetType.SIDE_ONLY];

export type ColumnDef = { type: 'standalone'; target: TargetType } | { type: 'merged'; group: MergeGroup };

export const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// ── 주재료 감지 ──

export const INGREDIENT_COLORS: Record<
  string,
  { bg: string; borderL: string; text: string; dot: string; label: string }
> = {
  beef: { bg: 'bg-white', borderL: '', text: 'text-red-600', dot: '', label: '소고기' },
  pork: { bg: 'bg-white', borderL: '', text: 'text-rose-600', dot: '', label: '한돈' },
  chicken: { bg: 'bg-white', borderL: '', text: 'text-amber-600', dot: '', label: '닭' },
  fish: { bg: 'bg-white', borderL: '', text: 'text-sky-600', dot: '', label: '생선' },
  tofu: { bg: 'bg-white', borderL: '', text: 'text-yellow-600', dot: '', label: '두부' },
  egg: { bg: 'bg-white', borderL: '', text: 'text-orange-600', dot: '', label: '달걀' },
  potato: { bg: 'bg-white', borderL: '', text: 'text-stone-500', dot: '', label: '감자' },
  seaweed: {
    bg: 'bg-white',
    borderL: '',
    text: 'text-teal-600',
    dot: '',
    label: '해조류',
  },
  mushroom: {
    bg: 'bg-white',
    borderL: '',
    text: 'text-violet-600',
    dot: '',
    label: '버섯',
  },
  vegetable: {
    bg: 'bg-white',
    borderL: '',
    text: 'text-green-600',
    dot: '',
    label: '채소',
  },
  other: { bg: 'bg-white', borderL: 'border-l-stone-300', text: 'text-stone-500', dot: 'bg-stone-300', label: '기타' },
};

export function detectIngredient(name: string): string {
  for (const [ingredient, keywords] of Object.entries(INGREDIENT_KEYWORDS)) {
    if (keywords.some(kw => name.includes(kw))) return ingredient;
  }
  return 'other';
}

// 노이즈 필터: 순수 숫자, 빈값, 시스템 메시지만 제외
const NOISE_PATTERNS = ['갯수미달', '개수미달', '미달'];
export function isValidMenuItem(name: string): boolean {
  if (!name || !name.trim()) return false;
  if (/^\d+$/.test(name.trim())) return false; // 순수 숫자만 제외
  if (NOISE_PATTERNS.some(p => name.includes(p))) return false;
  return true;
}

// 메뉴명에서 수량과 클린명 추출
export function parseMenuItem(name: string): { cleanName: string; quantity: number | null } {
  const stripped = stripProcessSuffix(name);
  const match = stripped.match(/^(.+?)\s+(\d+)$/);
  if (match) return { cleanName: match[1].trim(), quantity: parseInt(match[2]) };
  return { cleanName: stripped, quantity: null };
}

// ── 공정 분류 ──

export const PROCESS_ORDER = [
  '국/탕',
  '냉장국',
  '냉동국',
  '밥류',
  '무침/나물',
  '볶음',
  '조림',
  '전류',
  '김치/절임',
  '샐러드',
  '기타',
];

export const PROCESS_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  '국/탕': { bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
  냉장국: { bg: 'bg-cyan-50', text: 'text-cyan-700', badge: 'bg-cyan-100 text-cyan-700' },
  냉동국: { bg: 'bg-indigo-50', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-700' },
  반조리: { bg: 'bg-rose-50', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-700' },
  밥류: { bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
  '무침/나물': { bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
  볶음: { bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
  조림: { bg: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  전류: { bg: 'bg-yellow-50', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700' },
  '김치/절임': { bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
  샐러드: { bg: 'bg-emerald-50', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  기타: { bg: 'bg-stone-50', text: 'text-stone-600', badge: 'bg-stone-100 text-stone-600' },
};

export function detectProcess(name: string, dbItem?: MenuItem): string {
  // 접미사 제거 후 실제 음식 유형으로 분류
  const baseName = stripProcessSuffix(name);
  // 국/탕/찌개 판정: 이름 끝에 정확히 국/탕/찌개가 오는 경우만 (국물/수프는 제외 - 떡볶이국물 등 오분류 방지)
  const isSoupType = /국$|탕$|찌개$|찌게$/.test(baseName);
  // DB에서 카테고리 확인 가능하면 활용
  const isDbSoup = dbItem?.category === MenuCategory.SOUP;

  // 반조리 판정: _반조리 접미사가 있는 경우
  if (name.includes('_반조리')) return '반조리';
  // 냉장국 판정: _냉장 접미사 + (DB 국/찌개 카테고리 또는 이름이 국/탕/찌개로 끝남)
  if ((name.includes('_냉장') || name.startsWith('냉장')) && (isDbSoup || isSoupType)) return '냉장국';
  // 냉동국 판정: _냉동 접미사 + (DB 국/찌개 카테고리 또는 이름이 국/탕/찌개로 끝남)
  if ((name.includes('_냉동') || name.startsWith('냉동')) && (isDbSoup || isSoupType)) return '냉동국';

  // 실제 음식 유형 분류 (접미사 제거된 이름으로)
  if (isDbSoup || isSoupType) return '국/탕';
  if (/밥$|죽$|리조또|볶음밥|비빔밥/.test(baseName)) return '밥류';
  if (/나물|무침|겉절이|숙채|생채/.test(baseName)) return '무침/나물';
  if (/볶음|볶이|잡채/.test(baseName)) return '볶음';
  if (/조림|장조림|졸임/.test(baseName)) return '조림';
  if (/전$|부침|동그랑땡|까스|커틀릿|튀김/.test(baseName)) return '전류';
  if (/김치|깍두기|장아찌|절임|피클/.test(baseName)) return '김치/절임';
  if (/샐러드|셀러드/.test(baseName)) return '샐러드';
  return '기타';
}

// ── 주재료 하이라이트 텍스트 색상 (US-022: 글씨 색만 사용) ──

export const INGREDIENT_HIGHLIGHT_TEXT: Record<string, string> = {
  beef: 'text-red-600',
  pork: 'text-rose-600',
  chicken: 'text-amber-600',
  fish: 'text-sky-600',
  tofu: 'text-yellow-600',
  egg: 'text-orange-600',
  potato: 'text-stone-500',
  seaweed: 'text-teal-600',
  mushroom: 'text-violet-600',
  vegetable: 'text-green-600',
};
