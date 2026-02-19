import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  UtensilsCrossed,
  RefreshCw,
  Shield,
  Clock,
  CheckCircle,
  MessageSquare,
  Replace,
  Send,
  Download,
  FileText,
} from 'lucide-react';
import { useHistoricalPlans } from '../context/HistoricalPlansContext';
import { useMenu } from '../context/MenuContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TargetType } from '../types';
import type {
  HistoricalMenuItem,
  HistoricalTargetPlan,
  HistoricalMealPlan,
  PlanReviewRecord,
  ReviewComment,
} from '../types';
import {
  makeReviewKey,
  buildReviewStatusMap,
  getFilterStatus,
  type ReviewFilterCategory,
} from '../services/historyReviewService';
import {
  addReviewComment,
  getReviewComments,
  resolveComment,
  resetDepartmentsForReReview,
} from '../services/reviewService';
import HistoryReviewModal from './HistoryReviewModal';
import HistoryIngredientView from './HistoryIngredientView';
import HistoryDistributionView from './HistoryDistributionView';

// ── 상수 ──

const TARGET_LABELS: Record<string, string> = {
  [TargetType.VALUE]: '실속',
  [TargetType.SENIOR_HEALTH]: '건강시니어',
  [TargetType.SENIOR]: '시니어',
  [TargetType.YOUTH]: '청소연구소',
  [TargetType.YOUTH_MAIN]: '청소메인',
  [TargetType.FAMILY_PLUS]: '든든가족',
  [TargetType.FAMILY]: '가족',
  [TargetType.KIDS_PLUS]: '든든아이',
  [TargetType.KIDS]: '아이',
  [TargetType.SIDE_ONLY]: '골고루반찬',
  [TargetType.FIRST_MEET]: '첫만남',
  [TargetType.TODDLER_PLUS]: '든든유아',
  [TargetType.TODDLER]: '유아',
  [TargetType.CHILD_PLUS]: '든든어린이',
  [TargetType.CHILD]: '어린이',
};

const TARGET_COLORS: Record<string, string> = {
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
  [TargetType.FIRST_MEET]: 'bg-slate-100 text-slate-600',
  [TargetType.TODDLER_PLUS]: 'bg-slate-100 text-slate-600',
  [TargetType.TODDLER]: 'bg-slate-100 text-slate-600',
  [TargetType.CHILD_PLUS]: 'bg-slate-100 text-slate-600',
  [TargetType.CHILD]: 'bg-slate-100 text-slate-600',
};

// ── 부모-자식 병합 매핑 ──

interface MergeGroup {
  groupLabel: string;
  baseTarget: TargetType;
  plusTarget: TargetType;
  plusBadge: string;
  color: string;
}

const TARGET_MERGE_MAP: MergeGroup[] = [
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
    groupLabel: '유아',
    baseTarget: TargetType.TODDLER,
    plusTarget: TargetType.TODDLER_PLUS,
    plusBadge: '든든',
    color: 'bg-slate-100 text-slate-600',
  },
  {
    groupLabel: '어린이',
    baseTarget: TargetType.CHILD,
    plusTarget: TargetType.CHILD_PLUS,
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

const STANDALONE_TARGETS = [TargetType.VALUE, TargetType.SIDE_ONLY, TargetType.FIRST_MEET];

type ColumnDef = { type: 'standalone'; target: TargetType } | { type: 'merged'; group: MergeGroup };

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// ── 주재료 감지 ──

const INGREDIENT_KEYWORDS: Record<string, string[]> = {
  beef: ['소고기', '한우', '불고기', '갈비', '사골', '차돌', '설렁탕'],
  pork: ['한돈', '돼지', '제육', '삼겹', '탕수', '수육', '족발', '보쌈'],
  chicken: ['닭', '치킨', '닭볶음', '닭갈비'],
  fish: ['동태', '오징어', '새우', '어묵', '참치', '멸치', '황태', '맛살', '고등어', '갈치', '조기', '꽁치', '연어'],
  tofu: ['두부', '순두부'],
  egg: ['계란', '달걀', '메추리알', '에그'],
  potato: ['감자', '고구마'],
  seaweed: ['미역', '파래', '김무침', '다시마', '해초'],
  mushroom: ['버섯', '표고', '느타리', '팽이', '새송이'],
  vegetable: ['나물', '시래기', '애호박', '양배추', '콩나물'],
};

const INGREDIENT_COLORS: Record<string, { bg: string; borderL: string; text: string; dot: string; label: string }> = {
  beef: { bg: 'bg-white', borderL: 'border-l-red-400', text: 'text-gray-700', dot: 'bg-red-400', label: '소고기' },
  pork: { bg: 'bg-white', borderL: 'border-l-rose-400', text: 'text-gray-700', dot: 'bg-rose-400', label: '한돈' },
  chicken: { bg: 'bg-white', borderL: 'border-l-amber-400', text: 'text-gray-700', dot: 'bg-amber-400', label: '닭' },
  fish: { bg: 'bg-white', borderL: 'border-l-sky-400', text: 'text-gray-700', dot: 'bg-sky-400', label: '생선' },
  tofu: { bg: 'bg-white', borderL: 'border-l-yellow-300', text: 'text-gray-700', dot: 'bg-yellow-300', label: '두부' },
  egg: { bg: 'bg-white', borderL: 'border-l-orange-300', text: 'text-gray-700', dot: 'bg-orange-300', label: '달걀' },
  potato: { bg: 'bg-white', borderL: 'border-l-stone-400', text: 'text-gray-700', dot: 'bg-stone-400', label: '감자' },
  seaweed: { bg: 'bg-white', borderL: 'border-l-teal-400', text: 'text-gray-700', dot: 'bg-teal-400', label: '해조류' },
  mushroom: {
    bg: 'bg-white',
    borderL: 'border-l-violet-300',
    text: 'text-gray-700',
    dot: 'bg-violet-300',
    label: '버섯',
  },
  vegetable: {
    bg: 'bg-white',
    borderL: 'border-l-green-400',
    text: 'text-gray-700',
    dot: 'bg-green-400',
    label: '채소',
  },
  other: { bg: 'bg-white', borderL: 'border-l-gray-300', text: 'text-gray-500', dot: 'bg-gray-300', label: '기타' },
};

function detectIngredient(name: string): string {
  for (const [ingredient, keywords] of Object.entries(INGREDIENT_KEYWORDS)) {
    if (keywords.some(kw => name.includes(kw))) return ingredient;
  }
  return 'other';
}

// 노이즈 필터: 순수 숫자, 빈값, 시스템 메시지만 제외
const NOISE_PATTERNS = ['갯수미달', '개수미달', '미달'];
function isValidMenuItem(name: string): boolean {
  if (!name || !name.trim()) return false;
  if (/^\d+$/.test(name.trim())) return false; // 순수 숫자만 제외
  if (NOISE_PATTERNS.some(p => name.includes(p))) return false;
  return true;
}

// 메뉴명에서 수량과 클린명 추출
function parseMenuItem(name: string): { cleanName: string; quantity: number | null } {
  const stripped = name.replace(/_냉장|_반조리|_냉동/g, '').trim();
  const match = stripped.match(/^(.+?)\s+(\d+)$/);
  if (match) return { cleanName: match[1].trim(), quantity: parseInt(match[2]) };
  return { cleanName: stripped, quantity: null };
}

// ── 공정 분류 ──

const PROCESS_ORDER = [
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

const PROCESS_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  '국/탕': { bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
  냉장국: { bg: 'bg-cyan-50', text: 'text-cyan-700', badge: 'bg-cyan-100 text-cyan-700' },
  냉동국: { bg: 'bg-indigo-50', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-700' },
  밥류: { bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
  '무침/나물': { bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
  볶음: { bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
  조림: { bg: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  전류: { bg: 'bg-yellow-50', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700' },
  '김치/절임': { bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
  샐러드: { bg: 'bg-emerald-50', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  기타: { bg: 'bg-gray-50', text: 'text-gray-600', badge: 'bg-gray-100 text-gray-600' },
};

function detectProcess(name: string): string {
  if (name.includes('_냉장') || name.startsWith('냉장')) return '냉장국';
  if (name.includes('_냉동') || name.startsWith('냉동')) return '냉동국';
  if (/국$|탕$|찌개$|찌게$|국물|수프/.test(name)) return '국/탕';
  if (/밥$|죽$|리조또|볶음밥|비빔밥/.test(name)) return '밥류';
  if (/나물|무침|겉절이|숙채|생채/.test(name)) return '무침/나물';
  if (/볶음|볶이|잡채/.test(name)) return '볶음';
  if (/조림|장조림|졸임/.test(name)) return '조림';
  if (/전$|부침|동그랑땡|까스|커틀릿|튀김/.test(name)) return '전류';
  if (/김치|깍두기|장아찌|절임|피클/.test(name)) return '김치/절임';
  if (/샐러드|셀러드/.test(name)) return '샐러드';
  return '기타';
}

// ── 주재료 범례 ──

const IngredientLegend: React.FC = () => (
  <div className="flex flex-wrap items-center gap-3 mb-3 px-1">
    <span className="text-[11px] font-medium text-gray-500">주재료:</span>
    {Object.entries(INGREDIENT_COLORS)
      .filter(([k]) => k !== 'other')
      .map(([key, val]) => (
        <div key={key} className="flex items-center gap-1">
          <span className={`w-2.5 h-2.5 rounded-full ${val.dot}`} />
          <span className="text-[11px] text-gray-600">{val.label}</span>
        </div>
      ))}
  </div>
);

// ── 메뉴 아이템 행 (공통) ──

const MenuItemRow: React.FC<{
  item: HistoricalMenuItem;
  idx: number;
  date: string;
  targetType: string;
  isEdited: boolean;
  originalName?: string;
  isPlusOnly?: boolean;
  plusBadge?: string;
  commentCount: number;
  recentComments?: ReviewComment[];
  onAction: (targetType: string, itemIndex: number, menuName: string) => void;
}> = ({
  item,
  idx,
  date,
  targetType,
  isEdited,
  originalName,
  isPlusOnly,
  plusBadge,
  commentCount,
  recentComments,
  onAction,
}) => {
  const ingredient = detectIngredient(item.name);
  const colors = INGREDIENT_COLORS[ingredient];
  const { cleanName, quantity } = parseMenuItem(item.name);
  const hasUnresolvedComment = !isEdited && recentComments?.some(c => c.status === 'comment' || c.status === 'issue');

  return (
    <div
      onClick={() => onAction(targetType, idx, item.name)}
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] leading-tight cursor-pointer border-l-2 ${colors.borderL} ${colors.bg} hover:ring-1 hover:ring-gray-200 transition-all ${isEdited ? 'ring-1 ring-green-300 bg-green-50/30' : hasUnresolvedComment ? 'ring-2 ring-red-400 bg-red-50/30' : ''}`}
      title={isEdited && originalName ? `변경: ${originalName} → ${cleanName}` : item.name}
    >
      <span className={`${colors.text} truncate flex-1`}>{cleanName}</span>
      {quantity !== null && (
        <span className="px-1 py-0 text-[9px] font-bold text-gray-400 bg-gray-50 rounded shrink-0">{quantity}</span>
      )}
      {isPlusOnly && plusBadge && (
        <span className="px-1 py-0 text-[9px] font-medium text-slate-500 bg-slate-100 rounded shrink-0">
          {plusBadge}
        </span>
      )}
      {isEdited && originalName && (
        <span className="text-[9px] text-green-600 font-medium shrink-0" title={`${originalName} → ${cleanName}`}>
          {'\u2713'}
        </span>
      )}
      {commentCount > 0 &&
        (() => {
          const hasIssue = recentComments?.some(c => c.status === 'issue');
          const allResolved =
            recentComments && recentComments.length > 0 && recentComments.every(c => c.status === 'resolved');
          const iconColor = allResolved ? 'text-green-600' : hasIssue ? 'text-red-500' : 'text-slate-400';
          return (
            <span className={`relative group/comment flex items-center gap-0.5 text-[9px] ${iconColor} shrink-0`}>
              <MessageSquare className="w-2.5 h-2.5" />
              {commentCount}
              {recentComments && recentComments.length > 0 && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/comment:block z-50 w-52 p-2 bg-gray-800 text-white text-[10px] rounded-lg shadow-lg pointer-events-none">
                  {isEdited && originalName && (
                    <span className="block mb-1.5 pb-1 border-b border-gray-600 text-green-400 text-[9px]">
                      {'\u2713'} {originalName} → {cleanName}
                    </span>
                  )}
                  {recentComments.slice(-3).map((c, i) => {
                    const statusColor =
                      c.status === 'resolved'
                        ? 'text-green-400'
                        : c.status === 'issue'
                          ? 'text-red-400'
                          : 'text-gray-300';
                    const statusPrefix = c.status === 'resolved' ? '\u2713 ' : c.status === 'issue' ? '\u2717 ' : '';
                    return (
                      <span key={i} className={`block mb-1 last:mb-0 ${statusColor}`}>
                        <span className="font-bold">
                          {statusPrefix}
                          {c.reviewer}:
                        </span>{' '}
                        {c.comment.length > 40 ? c.comment.slice(0, 40) + '...' : c.comment}
                      </span>
                    );
                  })}
                </span>
              )}
            </span>
          );
        })()}
    </div>
  );
};

// ── 병합 셀 컴포넌트 ──

const MergedTableCell: React.FC<{
  baseItems: HistoricalMenuItem[];
  plusItems: HistoricalMenuItem[];
  plusBadge: string;
  date: string;
  baseTarget: string;
  plusTarget: string;
  editedKeys: Set<string>;
  originalNames: Map<string, string>;
  commentCounts: Map<string, number>;
  allComments: ReviewComment[];
  onAction: (targetType: string, itemIndex: number, menuName: string) => void;
}> = ({
  baseItems,
  plusItems,
  plusBadge,
  date,
  baseTarget,
  plusTarget,
  editedKeys,
  originalNames,
  commentCounts,
  allComments,
  onAction,
}) => {
  const baseNameSet = new Set(baseItems.filter(i => isValidMenuItem(i.name)).map(i => parseMenuItem(i.name).cleanName));
  const allItems: { item: HistoricalMenuItem; isPlusOnly: boolean; targetType: string; idx: number }[] = [];

  baseItems.forEach((item, idx) => {
    if (isValidMenuItem(item.name)) {
      allItems.push({ item, isPlusOnly: false, targetType: baseTarget, idx });
    }
  });

  plusItems.forEach((item, idx) => {
    if (!isValidMenuItem(item.name)) return;
    const { cleanName } = parseMenuItem(item.name);
    if (!baseNameSet.has(cleanName)) {
      allItems.push({ item, isPlusOnly: true, targetType: plusTarget, idx });
    }
  });

  return (
    <div className="space-y-0.5">
      {allItems.map((entry, displayIdx) => {
        const editKey = `${date}|${entry.targetType}|${entry.idx}`;
        const isEdited = editedKeys.has(editKey);
        const origCleanName = originalNames.get(editKey);
        const cKey = origCleanName
          ? `${entry.targetType}-${entry.idx}-${origCleanName}`
          : `${entry.targetType}-${entry.idx}-${parseMenuItem(entry.item.name).cleanName}`;
        const scopeComments = allComments.filter(c => c.scopeKey === cKey);
        return (
          <MenuItemRow
            key={`${entry.targetType}-${entry.idx}-${displayIdx}`}
            item={entry.item}
            idx={entry.idx}
            date={date}
            targetType={entry.targetType}
            isEdited={isEdited}
            originalName={origCleanName}
            isPlusOnly={entry.isPlusOnly}
            plusBadge={plusBadge}
            commentCount={commentCounts.get(cKey) || 0}
            recentComments={scopeComments}
            onAction={onAction}
          />
        );
      })}
    </div>
  );
};

// ── 테이블 셀 (단독) ──

const TableCell: React.FC<{
  items: HistoricalMenuItem[];
  date: string;
  targetType: string;
  editedKeys: Set<string>;
  originalNames: Map<string, string>;
  commentCounts: Map<string, number>;
  allComments: ReviewComment[];
  onAction: (targetType: string, itemIndex: number, menuName: string) => void;
}> = ({ items, date, targetType, editedKeys, originalNames, commentCounts, allComments, onAction }) => {
  const validItems = useMemo(
    () => items.map((item, idx) => ({ item, originalIdx: idx })).filter(({ item }) => isValidMenuItem(item.name)),
    [items]
  );

  return (
    <div className="space-y-0.5">
      {validItems.map(({ item, originalIdx }) => {
        const editKey = `${date}|${targetType}|${originalIdx}`;
        const isEdited = editedKeys.has(editKey);
        const origCleanName = originalNames.get(editKey);
        const cKey = origCleanName
          ? `${targetType}-${originalIdx}-${origCleanName}`
          : `${targetType}-${originalIdx}-${parseMenuItem(item.name).cleanName}`;
        const scopeComments = allComments.filter(c => c.scopeKey === cKey);
        return (
          <MenuItemRow
            key={originalIdx}
            item={item}
            idx={originalIdx}
            date={date}
            targetType={targetType}
            isEdited={isEdited}
            originalName={origCleanName}
            commentCount={commentCounts.get(cKey) || 0}
            recentComments={scopeComments}
            onAction={(tt, ii, name) => onAction(tt, ii, name)}
          />
        );
      })}
    </div>
  );
};

// ── 메뉴 교체 모달 ──

const SwapModal: React.FC<{
  currentName: string;
  menuItems: { id: string; name: string; mainIngredient: string; cost: number }[];
  onSelect: (name: string) => void;
  onClose: () => void;
}> = ({ currentName, menuItems, onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [ingredientFilter, setIngredientFilter] = useState('');

  const candidates = useMemo(() => {
    return menuItems
      .filter(item => {
        if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (ingredientFilter && item.mainIngredient !== ingredientFilter) return false;
        return true;
      })
      .slice(0, 50);
  }, [search, ingredientFilter]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-800">메뉴 교체</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            현재: <span className="font-medium text-gray-700">{parseMenuItem(currentName).cleanName}</span>
          </p>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="메뉴명 검색..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              autoFocus
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(INGREDIENT_COLORS)
              .filter(([k]) => k !== 'other')
              .map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setIngredientFilter(f => (f === key ? '' : key))}
                  className={`px-2 py-0.5 text-[11px] rounded-full border transition-colors ${ingredientFilter === key ? `${val.bg} ${val.text} border-current font-bold` : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                >
                  {val.label}
                </button>
              ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {candidates.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">검색 결과 없음</p>
          ) : (
            <div className="space-y-1">
              {candidates.map(item => {
                const colors = INGREDIENT_COLORS[item.mainIngredient] || INGREDIENT_COLORS.other;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelect(item.name)}
                    className={`w-full text-left px-3 py-2 rounded-lg border-l-2 ${colors.borderL} ${colors.bg} hover:ring-1 hover:ring-gray-300 transition-all flex items-center justify-between`}
                  >
                    <span className="text-sm text-gray-700 truncate">{item.name}</span>
                    <div className="flex items-center gap-2 text-xs text-gray-400 shrink-0 ml-2">
                      <span className={`px-1.5 py-0.5 rounded ${colors.bg} ${colors.text} text-[10px] font-medium`}>
                        {colors.label}
                      </span>
                      <span>
                        {'\u20A9'}
                        {item.cost.toLocaleString()}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── 액션 선택 모달 ──

const ActionModal: React.FC<{
  menuName: string;
  onComment: () => void;
  onSwap: () => void;
  onClose: () => void;
}> = ({ menuName, onComment, onSwap, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
    <div className="bg-white rounded-xl shadow-xl w-72 overflow-hidden" onClick={e => e.stopPropagation()}>
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-bold text-gray-800 truncate">{parseMenuItem(menuName).cleanName}</p>
      </div>
      <div className="p-2 space-y-1">
        <button
          onClick={onComment}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 text-left transition-colors"
        >
          <MessageSquare className="w-4 h-4 text-blue-500" />
          <div>
            <div className="text-sm font-medium text-gray-800">의견 남기기</div>
            <div className="text-[11px] text-gray-400">이 메뉴에 코멘트 작성</div>
          </div>
        </button>
        <button
          onClick={onSwap}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-orange-50 text-left transition-colors"
        >
          <Replace className="w-4 h-4 text-orange-500" />
          <div>
            <div className="text-sm font-medium text-gray-800">메뉴 변경</div>
            <div className="text-[11px] text-gray-400">다른 메뉴로 교체</div>
          </div>
        </button>
      </div>
    </div>
  </div>
);

// ── 코멘트 모달 ──

const CommentModal: React.FC<{
  planKey: string;
  scopeKey: string;
  menuName: string;
  comments: ReviewComment[];
  onSubmit: (text: string) => void;
  onClose: () => void;
}> = ({ planKey, scopeKey, menuName, comments, onSubmit, onClose }) => {
  const [text, setText] = useState('');

  const scopeComments = useMemo(
    () => comments.filter(c => c.scopeKey === scopeKey).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [comments, scopeKey]
  );

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-gray-800">{parseMenuItem(menuName).cleanName}</p>
            <p className="text-[11px] text-gray-400">코멘트 ({scopeComments.length})</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* 기존 코멘트 */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {scopeComments.length === 0 ? (
            <p className="text-center text-sm text-gray-300 py-4">아직 코멘트가 없습니다</p>
          ) : (
            scopeComments.map(c => (
              <div key={c.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-gray-700">{c.reviewer}</span>
                  <span className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleString('ko-KR')}</span>
                </div>
                <p className="text-sm text-gray-600">{c.comment}</p>
              </div>
            ))
          )}
        </div>

        {/* 입력 */}
        <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="의견을 입력하세요..."
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autoFocus
          />
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── 메인 컴포넌트 ──

const MealPlanHistory: React.FC = () => {
  const { plans: HISTORICAL_MEAL_PLANS, isLoading, refresh } = useHistoricalPlans();
  const { menuItems } = useMenu();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [viewYear, setViewYear] = useState(() => {
    const latestDate = HISTORICAL_MEAL_PLANS[HISTORICAL_MEAL_PLANS.length - 1]?.date;
    if (latestDate) return parseInt(latestDate.slice(0, 4));
    const now = new Date();
    const nextMonth = now.getMonth() + 2;
    return nextMonth > 12 ? now.getFullYear() + 1 : now.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const latestDate = HISTORICAL_MEAL_PLANS[HISTORICAL_MEAL_PLANS.length - 1]?.date;
    if (latestDate) return parseInt(latestDate.slice(5, 7)) - 1;
    const now = new Date();
    const nextMonth = now.getMonth() + 2;
    return nextMonth > 12 ? 0 : nextMonth - 1;
  });

  // Review state
  const [reviewFilter, setReviewFilter] = useState<ReviewFilterCategory>('all');
  const [selectedReview, setSelectedReview] = useState<HistoricalMealPlan | null>(null);
  const [reviewStatusMap, setReviewStatusMap] = useState<Map<string, PlanReviewRecord>>(() => buildReviewStatusMap());

  const refreshReviewStatus = useCallback(() => {
    setReviewStatusMap(buildReviewStatusMap());
  }, []);

  // 편집 상태
  const [editedPlans, setEditedPlans] = useState<Map<string, { newName: string; originalName: string }>>(new Map());
  const editedKeys = useMemo(() => new Set(editedPlans.keys()), [editedPlans]);

  // editKey → original cleanName (for scopeKey lookup)
  const originalNameMap = useMemo(() => {
    const map = new Map<string, string>();
    editedPlans.forEach((val, key) => {
      map.set(key, parseMenuItem(val.originalName).cleanName);
    });
    return map;
  }, [editedPlans]);

  // 액션/교체/코멘트 상태
  const [actionTarget, setActionTarget] = useState<{
    date: string;
    cycleType: string;
    targetType: string;
    itemIndex: number;
    menuName: string;
  } | null>(null);
  const [swapTarget, setSwapTarget] = useState<{
    date: string;
    cycleType: string;
    targetType: string;
    itemIndex: number;
    currentName: string;
  } | null>(null);
  const [commentTarget, setCommentTarget] = useState<{ planKey: string; scopeKey: string; menuName: string } | null>(
    null
  );

  // 코멘트 캐시: planKey → ReviewComment[]
  const [commentCache, setCommentCache] = useState<Record<string, ReviewComment[]>>({});

  // 출고량 설정 로드
  const [shipmentConfig, setShipmentConfig] = useState<Record<string, { 화수목: number; 금토월: number }>>({});
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zsub_shipment_config');
      if (saved) setShipmentConfig(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);

  const loadCommentsForPlan = useCallback((planKey: string) => {
    const comments = getReviewComments(planKey);
    setCommentCache(prev => ({ ...prev, [planKey]: comments }));
  }, []);

  // 코멘트 카운트 맵: scopeKey → count
  const commentCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const comments of Object.values(commentCache)) {
      for (const c of comments) {
        map.set(c.scopeKey, (map.get(c.scopeKey) || 0) + 1);
      }
    }
    return map;
  }, [commentCache]);

  // 월 변경 시 코멘트 로드
  const allMonthPlans = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    return HISTORICAL_MEAL_PLANS.filter(p => p.date.startsWith(prefix));
  }, [viewYear, viewMonth]);

  useEffect(() => {
    for (const p of allMonthPlans) {
      const key = makeReviewKey(p.date, p.cycleType);
      if (!commentCache[key]) loadCommentsForPlan(key);
    }
  }, [allMonthPlans]);

  // 필터
  const filterCounts = useMemo(() => {
    const counts = { all: allMonthPlans.length, pending: 0, in_progress: 0, completed: 0 };
    for (const p of allMonthPlans) {
      const key = makeReviewKey(p.date, p.cycleType);
      const record = reviewStatusMap.get(key);
      const cat = record ? getFilterStatus(record.status) : 'pending';
      counts[cat]++;
    }
    return counts;
  }, [allMonthPlans, reviewStatusMap]);

  const monthPlans = useMemo(() => {
    if (reviewFilter === 'all') return allMonthPlans;
    return allMonthPlans.filter(p => {
      const key = makeReviewKey(p.date, p.cycleType);
      const record = reviewStatusMap.get(key);
      const cat = record ? getFilterStatus(record.status) : 'pending';
      return cat === reviewFilter;
    });
  }, [allMonthPlans, reviewFilter, reviewStatusMap]);

  const columns = useMemo((): ColumnDef[] => {
    const targetSet = new Set<string>();
    for (const plan of monthPlans) {
      for (const target of plan.targets) targetSet.add(target.targetType);
    }
    const result: ColumnDef[] = [];
    const usedTargets = new Set<string>();
    for (const group of TARGET_MERGE_MAP) {
      if (targetSet.has(group.baseTarget) || targetSet.has(group.plusTarget)) {
        result.push({ type: 'merged', group });
        usedTargets.add(group.baseTarget);
        usedTargets.add(group.plusTarget);
      }
    }
    for (const target of STANDALONE_TARGETS) {
      if (targetSet.has(target) && !usedTargets.has(target)) {
        result.push({ type: 'standalone', target });
        usedTargets.add(target);
      }
    }
    for (const t of targetSet) {
      if (!usedTargets.has(t)) result.push({ type: 'standalone', target: t as TargetType });
    }
    return result;
  }, [monthPlans]);

  // ── 날짜별 생산수량 계산 (공정별 그룹) ──
  const productionSummary = useMemo(() => {
    const result = new Map<string, { process: string; items: { name: string; qty: number }[]; totalQty: number }[]>();
    for (const plan of monthPlans) {
      const key = `${plan.date}-${plan.cycleType}`;
      const menuQty = new Map<string, number>();
      const menuProcess = new Map<string, string>();

      for (const target of plan.targets) {
        const volume = shipmentConfig[target.targetType]?.[plan.cycleType] || 0;
        if (volume === 0) continue;
        for (const item of target.items) {
          if (!isValidMenuItem(item.name)) continue;
          const { cleanName } = parseMenuItem(item.name);
          menuQty.set(cleanName, (menuQty.get(cleanName) || 0) + volume);
          if (!menuProcess.has(cleanName)) menuProcess.set(cleanName, detectProcess(item.name));
        }
      }

      const processGroups = new Map<string, { name: string; qty: number }[]>();
      for (const [name, qty] of menuQty) {
        const process = menuProcess.get(name) || '기타';
        if (!processGroups.has(process)) processGroups.set(process, []);
        processGroups.get(process)!.push({ name, qty });
      }

      const groups = PROCESS_ORDER.filter(p => processGroups.has(p)).map(p => {
        const items = processGroups.get(p)!.sort((a, b) => b.qty - a.qty);
        return { process: p, items, totalQty: items.reduce((s, i) => s + i.qty, 0) };
      });
      result.set(key, groups);
    }
    return result;
  }, [monthPlans, shipmentConfig]);

  // ── 열 너비 자동 계산 ──
  const columnWidths = useMemo(() => {
    return columns.map(col => {
      let maxItems = 0;
      for (const plan of monthPlans) {
        const targetMap = new Map(plan.targets.map(t => [t.targetType, t]));
        if (col.type === 'standalone') {
          const target = targetMap.get(col.target);
          if (target) {
            const validCount = target.items.filter(i => isValidMenuItem(i.name)).length;
            maxItems = Math.max(maxItems, validCount);
          }
        } else {
          const base = targetMap.get(col.group.baseTarget);
          const plus = targetMap.get(col.group.plusTarget);
          const baseCount = base ? base.items.filter(i => isValidMenuItem(i.name)).length : 0;
          const plusCount = plus ? plus.items.filter(i => isValidMenuItem(i.name)).length : 0;
          maxItems = Math.max(maxItems, baseCount + plusCount);
        }
      }
      if (maxItems <= 4) return 120;
      if (maxItems <= 6) return 140;
      if (maxItems <= 8) return 160;
      return 180;
    });
  }, [columns, monthPlans]);

  // 네비게이션
  const goToPrevMonth = useCallback(() => {
    setViewMonth(m => {
      if (m === 0) {
        setViewYear(y => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);
  const goToNextMonth = useCallback(() => {
    setViewMonth(m => {
      if (m === 11) {
        setViewYear(y => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);
  const goToToday = useCallback(() => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  }, []);

  const [viewMode, setViewMode] = useState<'plan' | 'ingredient' | 'distribution'>('plan');
  const contentRef = useRef<HTMLDivElement>(null);

  const exportToHistoryCSV = useCallback(() => {
    if (monthPlans.length === 0) return;
    const header = '날짜,주기,공정,메뉴명,수량';
    const rows: string[] = [];
    for (const plan of monthPlans) {
      const key = `${plan.date}-${plan.cycleType}`;
      const groups = productionSummary.get(key) || [];
      for (const g of groups) {
        for (const item of g.items) {
          rows.push(`${plan.date},"${plan.cycleType}","${g.process}","${item.name}",${item.qty}`);
        }
      }
    }
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `식단히스토리_${viewYear}년${viewMonth + 1}월.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [monthPlans, productionSummary, viewYear, viewMonth]);

  const exportToHistoryPDF = useCallback(async () => {
    if (!contentRef.current) return;
    const html2pdf = (await import('html2pdf.js')).default;
    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: `식단히스토리_${viewYear}년${viewMonth + 1}월.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { orientation: 'landscape' as const, unit: 'mm' as const, format: 'a4' as const } as const,
    };
    html2pdf().set(opt).from(contentRef.current).save();
  }, [viewYear, viewMonth]);

  const getItems = useCallback(
    (date: string, targetType: string, items: HistoricalMenuItem[]): HistoricalMenuItem[] => {
      return items.map((item, idx) => {
        const key = `${date}|${targetType}|${idx}`;
        const edited = editedPlans.get(key);
        return edited ? { ...item, name: edited.newName } : item;
      });
    },
    [editedPlans]
  );

  // 메뉴 교체 핸들러
  const handleSwap = useCallback(
    (newName: string) => {
      if (!swapTarget) return;
      const key = `${swapTarget.date}|${swapTarget.targetType}|${swapTarget.itemIndex}`;
      const oldCleanName = parseMenuItem(swapTarget.currentName).cleanName;
      const newCleanName = parseMenuItem(newName).cleanName;

      const existingEdit = editedPlans.get(key);
      const originalName = existingEdit ? existingEdit.originalName : swapTarget.currentName;

      setEditedPlans(prev => {
        const next = new Map(prev);
        next.set(key, { newName, originalName });
        return next;
      });

      const planKey = makeReviewKey(swapTarget.date, swapTarget.cycleType);
      const oldScopeKey = `${swapTarget.targetType}-${swapTarget.itemIndex}-${oldCleanName}`;

      // 원본 scopeKey로 기존 댓글 조회 → resolved 처리
      const existingComments = (commentCache[planKey] || []).filter(
        c => c.scopeKey === oldScopeKey && c.status !== 'resolved'
      );

      for (const c of existingComments) {
        resolveComment(planKey, c.id);
      }

      // 가장 최근 댓글에 대댓글로 변경 내역 추가 (원본 scopeKey 유지)
      const latestComment = existingComments[existingComments.length - 1];
      addReviewComment(planKey, {
        parentId: latestComment?.id,
        department: 'quality',
        reviewer: user?.displayName || '시스템',
        scope: 'item',
        scopeKey: oldScopeKey,
        comment: `메뉴 변경 완료: "${oldCleanName}" → "${newCleanName}"`,
        status: 'resolved',
      });

      // 원래 검토 의견을 남긴 사람의 부서를 재검토 필요로 리셋
      const reviewerNames = [...new Set(existingComments.map(c => c.reviewer))];
      if (reviewerNames.length > 0) {
        resetDepartmentsForReReview(planKey, reviewerNames);
        refreshReviewStatus();
      }

      loadCommentsForPlan(planKey);

      setSwapTarget(null);
    },
    [swapTarget, loadCommentsForPlan, commentCache, user, refreshReviewStatus]
  );

  // 액션 핸들러
  const handleMenuAction = useCallback(
    (date: string, cycleType: string, targetType: string, itemIndex: number, menuName: string) => {
      setActionTarget({ date, cycleType, targetType, itemIndex, menuName });
    },
    []
  );

  const handleChooseComment = useCallback(() => {
    if (!actionTarget) return;
    const planKey = makeReviewKey(actionTarget.date, actionTarget.cycleType);
    const editKey = `${actionTarget.date}|${actionTarget.targetType}|${actionTarget.itemIndex}`;
    const origCleanName = originalNameMap.get(editKey);
    const { cleanName } = parseMenuItem(actionTarget.menuName);
    const scopeKey = origCleanName
      ? `${actionTarget.targetType}-${actionTarget.itemIndex}-${origCleanName}`
      : `${actionTarget.targetType}-${actionTarget.itemIndex}-${cleanName}`;
    setCommentTarget({ planKey, scopeKey, menuName: actionTarget.menuName });
    setActionTarget(null);
  }, [actionTarget, originalNameMap]);

  const handleChooseSwap = useCallback(() => {
    if (!actionTarget) return;
    setSwapTarget({
      date: actionTarget.date,
      cycleType: actionTarget.cycleType,
      targetType: actionTarget.targetType,
      itemIndex: actionTarget.itemIndex,
      currentName: actionTarget.menuName,
    });
    setActionTarget(null);
  }, [actionTarget]);

  const handleSubmitComment = useCallback(
    (text: string) => {
      if (!commentTarget) return;
      addReviewComment(commentTarget.planKey, {
        department: 'quality',
        reviewer: user?.displayName || '익명',
        scope: 'item',
        scopeKey: commentTarget.scopeKey,
        comment: text,
        status: 'comment',
      });
      loadCommentsForPlan(commentTarget.planKey);
      addToast({ type: 'success', title: '코멘트 등록', message: '의견이 등록되었습니다.' });
    },
    [commentTarget, user, loadCommentsForPlan, addToast]
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')}(${DAY_NAMES[d.getDay()]})`;
  };

  const getColumnLabel = (col: ColumnDef): string =>
    col.type === 'standalone' ? TARGET_LABELS[col.target] || col.target : col.group.groupLabel;
  const getColumnColor = (col: ColumnDef): string =>
    col.type === 'standalone' ? TARGET_COLORS[col.target] || 'bg-gray-100 text-gray-600' : col.group.color;

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={goToPrevMonth} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-2xl font-bold text-gray-800 min-w-[160px] text-center">
            {viewYear}년 {viewMonth + 1}월
          </h2>
          <button onClick={goToNextMonth} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={goToToday}
            className="ml-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            오늘
          </button>
          <button
            onClick={refresh}
            disabled={isLoading}
            className="ml-2 p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            title="시트에서 새로고침"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {monthPlans.length > 0 && (
            <span className="ml-2 px-2.5 py-1 text-xs font-medium text-primary-700 bg-primary-50 rounded-full">
              {monthPlans.length}건
            </span>
          )}
        </div>
        {editedPlans.size > 0 && (
          <span className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
            {editedPlans.size}건 수정됨
          </span>
        )}
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-2 mb-3">
        {(
          [
            { key: 'all' as const, label: '전체', color: 'bg-gray-100 text-gray-700 border-gray-300' },
            { key: 'pending' as const, label: '대기', color: 'bg-gray-50 text-gray-600 border-gray-300' },
            { key: 'in_progress' as const, label: '검토중', color: 'bg-blue-50 text-blue-600 border-blue-300' },
            { key: 'completed' as const, label: '완료', color: 'bg-green-50 text-green-600 border-green-300' },
          ] as const
        ).map(f => (
          <button
            key={f.key}
            onClick={() => setReviewFilter(f.key)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${reviewFilter === f.key ? f.color + ' ring-1 ring-offset-1' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
          >
            {f.label}
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-white/60">{filterCounts[f.key]}</span>
          </button>
        ))}
      </div>

      {/* 뷰 모드 & 내보내기 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg">
          {[
            { key: 'plan' as const, label: '식단표' },
            { key: 'ingredient' as const, label: '재료검토' },
            { key: 'distribution' as const, label: '현장배포' },
          ].map(v => (
            <button
              key={v.key}
              onClick={() => setViewMode(v.key)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === v.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={exportToHistoryCSV}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            title="CSV 다운로드"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button
            onClick={exportToHistoryPDF}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            title="PDF 다운로드"
          >
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

      {viewMode === 'plan' && <IngredientLegend />}

      {/* 콘텐츠 */}
      <div ref={contentRef} className="flex-1 flex flex-col min-h-0">
        {monthPlans.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <UtensilsCrossed className="w-12 h-12 mb-3 opacity-50" />
            <p className="font-medium">이 달의 식단 데이터가 없습니다</p>
          </div>
        ) : viewMode === 'ingredient' ? (
          <HistoryIngredientView
            monthPlans={monthPlans}
            productionSummary={productionSummary}
            formatDate={formatDate}
          />
        ) : viewMode === 'distribution' ? (
          <HistoryDistributionView
            monthPlans={monthPlans}
            productionSummary={productionSummary}
            formatDate={formatDate}
          />
        ) : (
          <div className="flex-1 overflow-auto border border-gray-200 rounded-xl">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-20">
                <tr className="bg-gray-50">
                  <th className="sticky left-0 z-30 bg-gray-50 px-2 py-2.5 text-left text-xs font-semibold text-gray-500 border-b border-r border-gray-200 min-w-[72px]">
                    날짜
                  </th>
                  <th className="sticky left-[72px] z-30 bg-gray-50 px-1.5 py-2.5 text-center text-xs font-semibold text-gray-500 border-b border-r border-gray-200 min-w-[56px]">
                    주기
                  </th>
                  <th className="px-1.5 py-2.5 text-center text-xs font-semibold text-gray-500 border-b border-r border-gray-200 min-w-[80px]">
                    검토상태
                  </th>
                  <th className="px-2 py-2.5 text-center text-xs font-semibold text-gray-500 border-b border-r border-gray-200 min-w-[120px]">
                    생산수량
                  </th>
                  {columns.map((col, idx) => (
                    <th
                      key={idx}
                      className="px-2 py-2.5 text-center text-xs font-semibold border-b border-r border-gray-200"
                      style={{ minWidth: columnWidths[idx] }}
                    >
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${getColumnColor(col)}`}
                      >
                        {getColumnLabel(col)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthPlans.map(plan => {
                  const targetMap = new Map<string, HistoricalTargetPlan>(plan.targets.map(t => [t.targetType, t]));
                  const rowRKey = makeReviewKey(plan.date, plan.cycleType);
                  const rowRecord = reviewStatusMap.get(rowRKey);
                  const rowCat = rowRecord ? getFilterStatus(rowRecord.status) : 'pending';
                  const isCompleted = rowCat === 'completed';
                  return (
                    <tr
                      key={`${plan.date}-${plan.cycleType}`}
                      className={`border-b border-gray-100 hover:bg-gray-50/30 ${isCompleted ? 'opacity-60 bg-gray-50/50' : ''}`}
                    >
                      <td className="sticky left-0 z-10 bg-white px-2 py-2 border-r border-gray-200 text-xs font-medium text-gray-700 whitespace-nowrap align-top">
                        {formatDate(plan.date)}
                      </td>
                      <td className="sticky left-[72px] z-10 bg-white px-1.5 py-2 border-r border-gray-200 text-center align-top">
                        <span className="inline-flex px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600 whitespace-nowrap">
                          {plan.cycleType}
                        </span>
                      </td>
                      <td className="px-1.5 py-2 border-r border-gray-200 text-center align-top">
                        {(() => {
                          const rKey = makeReviewKey(plan.date, plan.cycleType);
                          const record = reviewStatusMap.get(rKey);
                          const cat = record ? getFilterStatus(record.status) : 'pending';
                          const styles: Record<string, { cls: string; label: string; icon: typeof Clock }> = {
                            pending: {
                              cls: 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100',
                              label: '대기',
                              icon: Clock,
                            },
                            in_progress: {
                              cls: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100',
                              label: '검토중',
                              icon: Shield,
                            },
                            completed: {
                              cls: 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100',
                              label: '완료',
                              icon: CheckCircle,
                            },
                          };
                          const s = styles[cat];
                          const StatusIcon = s.icon;
                          const DEPT_LABELS: Record<string, string> = {
                            quality: '품질',
                            development: '개발',
                            process: '공정',
                          };
                          return (
                            <div className="flex flex-col items-center gap-1">
                              <button
                                onClick={() => setSelectedReview(plan)}
                                className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-full border cursor-pointer transition-colors whitespace-nowrap ${s.cls}`}
                              >
                                <StatusIcon className="w-3 h-3" />
                                {s.label}
                              </button>
                              {record && record.departments && record.departments.length > 0 && (
                                <div className="flex flex-col gap-0.5 mt-0.5">
                                  {record.departments.map(dept => (
                                    <div
                                      key={dept.department}
                                      className="flex items-center gap-1 text-[9px] text-gray-500"
                                    >
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${
                                          dept.status === 'approved'
                                            ? 'bg-green-500'
                                            : dept.status === 'rejected'
                                              ? 'bg-red-500'
                                              : 'bg-gray-300'
                                        }`}
                                      />
                                      <span>{DEPT_LABELS[dept.department] || dept.department}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      {/* 생산수량 */}
                      <td className="px-1.5 py-2 border-r border-gray-200 align-top">
                        {(() => {
                          const sumKey = `${plan.date}-${plan.cycleType}`;
                          const groups = productionSummary.get(sumKey) || [];
                          if (groups.length === 0) {
                            return <span className="text-[10px] text-gray-300 whitespace-nowrap">설정 필요</span>;
                          }
                          return (
                            <div className="space-y-1">
                              {groups.map(group => {
                                const pc = PROCESS_COLORS[group.process] || PROCESS_COLORS['기타'];
                                return (
                                  <div key={group.process}>
                                    <div className={`text-[9px] font-bold px-1 py-0.5 rounded ${pc.badge} mb-0.5`}>
                                      {group.process} ({group.totalQty})
                                    </div>
                                    {group.items.map(item => (
                                      <div
                                        key={item.name}
                                        className="flex items-center gap-1 text-[10px] leading-tight whitespace-nowrap pl-1"
                                      >
                                        <span className="text-gray-600 truncate">{item.name}</span>
                                        <span className="text-gray-800 font-bold shrink-0">{item.qty}</span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </td>
                      {columns.map((col, colIdx) => {
                        if (col.type === 'standalone') {
                          const target = targetMap.get(col.target);
                          if (!target)
                            return (
                              <td
                                key={colIdx}
                                className="px-2 py-2 border-r border-gray-100 text-center text-xs text-gray-300 align-top"
                              >
                                —
                              </td>
                            );
                          const items = getItems(plan.date, col.target, target.items);
                          const planKey = makeReviewKey(plan.date, plan.cycleType);
                          return (
                            <td key={colIdx} className="px-2 py-1.5 border-r border-gray-100 align-top">
                              <TableCell
                                items={items}
                                date={plan.date}
                                targetType={col.target}
                                editedKeys={editedKeys}
                                originalNames={originalNameMap}
                                commentCounts={commentCounts}
                                allComments={commentCache[planKey] || []}
                                onAction={(tt, ii, name) => handleMenuAction(plan.date, plan.cycleType, tt, ii, name)}
                              />
                            </td>
                          );
                        }
                        const baseData = targetMap.get(col.group.baseTarget);
                        const plusData = targetMap.get(col.group.plusTarget);
                        if (!baseData && !plusData)
                          return (
                            <td
                              key={colIdx}
                              className="px-2 py-2 border-r border-gray-100 text-center text-xs text-gray-300 align-top"
                            >
                              —
                            </td>
                          );
                        const baseItems = baseData ? getItems(plan.date, col.group.baseTarget, baseData.items) : [];
                        const plusItems = plusData ? getItems(plan.date, col.group.plusTarget, plusData.items) : [];
                        const mergedPlanKey = makeReviewKey(plan.date, plan.cycleType);
                        return (
                          <td key={colIdx} className="px-2 py-1.5 border-r border-gray-100 align-top">
                            <MergedTableCell
                              baseItems={baseItems}
                              plusItems={plusItems}
                              plusBadge={col.group.plusBadge}
                              date={plan.date}
                              baseTarget={col.group.baseTarget}
                              plusTarget={col.group.plusTarget}
                              editedKeys={editedKeys}
                              originalNames={originalNameMap}
                              commentCounts={commentCounts}
                              allComments={commentCache[mergedPlanKey] || []}
                              onAction={(tt, ii, name) => handleMenuAction(plan.date, plan.cycleType, tt, ii, name)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 액션 선택 모달 */}
      {actionTarget && (
        <ActionModal
          menuName={actionTarget.menuName}
          onComment={handleChooseComment}
          onSwap={handleChooseSwap}
          onClose={() => setActionTarget(null)}
        />
      )}

      {/* 코멘트 모달 */}
      {commentTarget && (
        <CommentModal
          planKey={commentTarget.planKey}
          scopeKey={commentTarget.scopeKey}
          menuName={commentTarget.menuName}
          comments={commentCache[commentTarget.planKey] || []}
          onSubmit={handleSubmitComment}
          onClose={() => setCommentTarget(null)}
        />
      )}

      {/* 교체 모달 */}
      {swapTarget && (
        <SwapModal
          currentName={swapTarget.currentName}
          menuItems={menuItems}
          onSelect={handleSwap}
          onClose={() => setSwapTarget(null)}
        />
      )}

      {/* 검토 모달 */}
      {selectedReview && (
        <HistoryReviewModal
          plan={selectedReview}
          reviewKey={makeReviewKey(selectedReview.date, selectedReview.cycleType)}
          onClose={() => setSelectedReview(null)}
          onStatusChange={refreshReviewStatus}
        />
      )}
    </div>
  );
};

export default MealPlanHistory;
