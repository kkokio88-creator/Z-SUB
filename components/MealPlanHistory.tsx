import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
import { addReviewComment, getReviewComments } from '../services/reviewService';
import HistoryReviewModal from './HistoryReviewModal';

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
  [TargetType.VALUE]: 'bg-blue-100 text-blue-700 border-blue-200',
  [TargetType.SENIOR_HEALTH]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  [TargetType.SENIOR]: 'bg-teal-100 text-teal-700 border-teal-200',
  [TargetType.YOUTH]: 'bg-violet-100 text-violet-700 border-violet-200',
  [TargetType.YOUTH_MAIN]: 'bg-purple-100 text-purple-700 border-purple-200',
  [TargetType.FAMILY_PLUS]: 'bg-amber-100 text-amber-700 border-amber-200',
  [TargetType.FAMILY]: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  [TargetType.KIDS_PLUS]: 'bg-pink-100 text-pink-700 border-pink-200',
  [TargetType.KIDS]: 'bg-rose-100 text-rose-700 border-rose-200',
  [TargetType.SIDE_ONLY]: 'bg-lime-100 text-lime-700 border-lime-200',
  [TargetType.FIRST_MEET]: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  [TargetType.TODDLER_PLUS]: 'bg-orange-100 text-orange-700 border-orange-200',
  [TargetType.TODDLER]: 'bg-red-100 text-red-700 border-red-200',
  [TargetType.CHILD_PLUS]: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  [TargetType.CHILD]: 'bg-sky-100 text-sky-700 border-sky-200',
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
    color: 'bg-teal-100 text-teal-700 border-teal-200',
  },
  {
    groupLabel: '가족',
    baseTarget: TargetType.FAMILY,
    plusTarget: TargetType.FAMILY_PLUS,
    plusBadge: '든든',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  {
    groupLabel: '아이',
    baseTarget: TargetType.KIDS,
    plusTarget: TargetType.KIDS_PLUS,
    plusBadge: '든든',
    color: 'bg-rose-100 text-rose-700 border-rose-200',
  },
  {
    groupLabel: '유아',
    baseTarget: TargetType.TODDLER,
    plusTarget: TargetType.TODDLER_PLUS,
    plusBadge: '든든',
    color: 'bg-red-100 text-red-700 border-red-200',
  },
  {
    groupLabel: '어린이',
    baseTarget: TargetType.CHILD,
    plusTarget: TargetType.CHILD_PLUS,
    plusBadge: '든든',
    color: 'bg-sky-100 text-sky-700 border-sky-200',
  },
  {
    groupLabel: '청소연구소',
    baseTarget: TargetType.YOUTH,
    plusTarget: TargetType.YOUTH_MAIN,
    plusBadge: '메인',
    color: 'bg-violet-100 text-violet-700 border-violet-200',
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
  beef: { bg: 'bg-red-50', borderL: 'border-l-red-400', text: 'text-red-700', dot: 'bg-red-400', label: '소고기' },
  pork: { bg: 'bg-pink-50', borderL: 'border-l-pink-400', text: 'text-pink-700', dot: 'bg-pink-400', label: '한돈' },
  chicken: {
    bg: 'bg-amber-50',
    borderL: 'border-l-amber-400',
    text: 'text-amber-700',
    dot: 'bg-amber-400',
    label: '닭',
  },
  fish: { bg: 'bg-blue-50', borderL: 'border-l-blue-400', text: 'text-blue-700', dot: 'bg-blue-400', label: '생선' },
  tofu: {
    bg: 'bg-yellow-50',
    borderL: 'border-l-yellow-400',
    text: 'text-yellow-700',
    dot: 'bg-yellow-400',
    label: '두부',
  },
  egg: {
    bg: 'bg-orange-50',
    borderL: 'border-l-orange-400',
    text: 'text-orange-700',
    dot: 'bg-orange-400',
    label: '달걀',
  },
  potato: {
    bg: 'bg-stone-100',
    borderL: 'border-l-stone-400',
    text: 'text-stone-700',
    dot: 'bg-stone-400',
    label: '감자',
  },
  seaweed: {
    bg: 'bg-emerald-50',
    borderL: 'border-l-emerald-400',
    text: 'text-emerald-700',
    dot: 'bg-emerald-400',
    label: '해조류',
  },
  mushroom: {
    bg: 'bg-purple-50',
    borderL: 'border-l-purple-400',
    text: 'text-purple-700',
    dot: 'bg-purple-400',
    label: '버섯',
  },
  vegetable: {
    bg: 'bg-green-50',
    borderL: 'border-l-green-400',
    text: 'text-green-700',
    dot: 'bg-green-400',
    label: '채소',
  },
  other: { bg: 'bg-gray-50', borderL: 'border-l-gray-300', text: 'text-gray-500', dot: 'bg-gray-300', label: '기타' },
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
  isPlusOnly?: boolean;
  plusBadge?: string;
  commentCount: number;
  recentComments?: ReviewComment[];
  onAction: (targetType: string, itemIndex: number, menuName: string) => void;
}> = ({ item, idx, date, targetType, isEdited, isPlusOnly, plusBadge, commentCount, recentComments, onAction }) => {
  const ingredient = detectIngredient(item.name);
  const colors = INGREDIENT_COLORS[ingredient];
  const { cleanName, quantity } = parseMenuItem(item.name);

  return (
    <div
      onClick={() => onAction(targetType, idx, item.name)}
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] leading-tight cursor-pointer border-l-2 ${colors.borderL} ${colors.bg} hover:ring-1 hover:ring-gray-300 transition-all ${isEdited ? 'ring-1 ring-amber-300' : ''}`}
      title={item.name}
    >
      <span className={`${colors.text} truncate flex-1`}>{cleanName}</span>
      {quantity !== null && (
        <span className="px-1 py-0 text-[9px] font-bold text-gray-500 bg-white/70 rounded shrink-0">{quantity}</span>
      )}
      {isPlusOnly && plusBadge && (
        <span className="px-1 py-0 text-[9px] font-medium text-amber-700 bg-amber-100 rounded shrink-0">
          {plusBadge}
        </span>
      )}
      {isEdited && <span className="text-[9px] text-amber-600 font-medium shrink-0">수정</span>}
      {commentCount > 0 && (
        <span className="relative group/comment flex items-center gap-0.5 text-[9px] text-blue-600 shrink-0">
          <MessageSquare className="w-2.5 h-2.5" />
          {commentCount}
          {recentComments && recentComments.length > 0 && (
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/comment:block z-50 w-48 p-2 bg-gray-800 text-white text-[10px] rounded-lg shadow-lg pointer-events-none">
              {recentComments.slice(-2).map((c, i) => (
                <span key={i} className="block mb-1 last:mb-0">
                  <span className="font-bold">{c.reviewer}:</span>{' '}
                  {c.comment.length > 30 ? c.comment.slice(0, 30) + '...' : c.comment}
                </span>
              ))}
            </span>
          )}
        </span>
      )}
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
  commentCounts,
  allComments,
  onAction,
}) => {
  const [expanded, setExpanded] = useState(false);

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

  const displayItems = expanded ? allItems : allItems.slice(0, 8);
  const hasMore = allItems.length > 8;

  return (
    <div className="space-y-0.5">
      {displayItems.map((entry, displayIdx) => {
        const cKey = `${entry.targetType}-${entry.idx}-${parseMenuItem(entry.item.name).cleanName}`;
        const scopeComments = allComments.filter(c => c.scopeKey === cKey);
        return (
          <MenuItemRow
            key={`${entry.targetType}-${entry.idx}-${displayIdx}`}
            item={entry.item}
            idx={entry.idx}
            date={date}
            targetType={entry.targetType}
            isEdited={editedKeys.has(`${date}|${entry.targetType}|${entry.idx}`)}
            isPlusOnly={entry.isPlusOnly}
            plusBadge={plusBadge}
            commentCount={commentCounts.get(cKey) || 0}
            recentComments={scopeComments}
            onAction={onAction}
          />
        );
      })}
      {hasMore && !expanded && (
        <button
          onClick={e => {
            e.stopPropagation();
            setExpanded(true);
          }}
          className="text-[10px] text-blue-500 hover:text-blue-700 font-medium pl-1"
        >
          +{allItems.length - 8}개 더보기
        </button>
      )}
      {hasMore && expanded && (
        <button
          onClick={e => {
            e.stopPropagation();
            setExpanded(false);
          }}
          className="text-[10px] text-gray-400 hover:text-gray-600 pl-1"
        >
          접기
        </button>
      )}
    </div>
  );
};

// ── 테이블 셀 (단독) ──

const TableCell: React.FC<{
  items: HistoricalMenuItem[];
  date: string;
  targetType: string;
  editedKeys: Set<string>;
  commentCounts: Map<string, number>;
  allComments: ReviewComment[];
  onAction: (targetType: string, itemIndex: number, menuName: string) => void;
}> = ({ items, date, targetType, editedKeys, commentCounts, allComments, onAction }) => {
  const [expanded, setExpanded] = useState(false);

  const validItems = useMemo(
    () => items.map((item, idx) => ({ item, originalIdx: idx })).filter(({ item }) => isValidMenuItem(item.name)),
    [items]
  );

  const displayItems = expanded ? validItems : validItems.slice(0, 8);
  const hasMore = validItems.length > 8;

  return (
    <div className="space-y-0.5">
      {displayItems.map(({ item, originalIdx }) => {
        const cKey = `${targetType}-${originalIdx}-${parseMenuItem(item.name).cleanName}`;
        const scopeComments = allComments.filter(c => c.scopeKey === cKey);
        return (
          <MenuItemRow
            key={originalIdx}
            item={item}
            idx={originalIdx}
            date={date}
            targetType={targetType}
            isEdited={editedKeys.has(`${date}|${targetType}|${originalIdx}`)}
            commentCount={commentCounts.get(cKey) || 0}
            recentComments={scopeComments}
            onAction={(tt, ii, name) => onAction(tt, ii, name)}
          />
        );
      })}
      {hasMore && !expanded && (
        <button
          onClick={e => {
            e.stopPropagation();
            setExpanded(true);
          }}
          className="text-[10px] text-blue-500 hover:text-blue-700 font-medium pl-1"
        >
          +{validItems.length - 8}개 더보기
        </button>
      )}
      {hasMore && expanded && (
        <button
          onClick={e => {
            e.stopPropagation();
            setExpanded(false);
          }}
          className="text-[10px] text-gray-400 hover:text-gray-600 pl-1"
        >
          접기
        </button>
      )}
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
  const [editedPlans, setEditedPlans] = useState<Map<string, string>>(new Map());
  const editedKeys = useMemo(() => new Set(editedPlans.keys()), [editedPlans]);

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

  const getItems = useCallback(
    (date: string, targetType: string, items: HistoricalMenuItem[]): HistoricalMenuItem[] => {
      return items.map((item, idx) => {
        const key = `${date}|${targetType}|${idx}`;
        const editedName = editedPlans.get(key);
        return editedName ? { ...item, name: editedName } : item;
      });
    },
    [editedPlans]
  );

  // 메뉴 교체 핸들러
  const handleSwap = useCallback(
    (newName: string) => {
      if (!swapTarget) return;
      const key = `${swapTarget.date}|${swapTarget.targetType}|${swapTarget.itemIndex}`;
      const oldName = parseMenuItem(swapTarget.currentName).cleanName;
      const newCleanName = parseMenuItem(newName).cleanName;

      setEditedPlans(prev => {
        const next = new Map(prev);
        next.set(key, newName);
        return next;
      });

      // 자동 대댓글: 메뉴 변경 알림
      const planKey = makeReviewKey(swapTarget.date, swapTarget.cycleType);
      const scopeKey = `${swapTarget.targetType}-${swapTarget.itemIndex}-${newCleanName}`;
      addReviewComment(planKey, {
        department: 'quality',
        reviewer: '시스템',
        scope: 'item',
        scopeKey,
        comment: `메뉴 변경: "${oldName}" → "${newCleanName}". 재검토 요청드립니다.`,
        status: 'issue',
      });
      loadCommentsForPlan(planKey);

      setSwapTarget(null);
    },
    [swapTarget, loadCommentsForPlan]
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
    const { cleanName } = parseMenuItem(actionTarget.menuName);
    const scopeKey = `${actionTarget.targetType}-${actionTarget.itemIndex}-${cleanName}`;
    setCommentTarget({ planKey, scopeKey, menuName: actionTarget.menuName });
    setActionTarget(null);
  }, [actionTarget]);

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
            { key: 'pending' as const, label: '검토 대기', color: 'bg-yellow-50 text-yellow-700 border-yellow-300' },
            { key: 'in_progress' as const, label: '검토중', color: 'bg-blue-50 text-blue-700 border-blue-300' },
            { key: 'completed' as const, label: '검토 완료', color: 'bg-green-50 text-green-700 border-green-300' },
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

      <IngredientLegend />

      {/* 테이블 */}
      {monthPlans.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
          <UtensilsCrossed className="w-12 h-12 mb-3 opacity-50" />
          <p className="font-medium">이 달의 식단 데이터가 없습니다</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto border border-gray-200 rounded-xl">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-20">
              <tr className="bg-gray-50">
                <th className="sticky left-0 z-30 bg-gray-50 px-3 py-2.5 text-left text-xs font-semibold text-gray-500 border-b border-r border-gray-200 min-w-[80px]">
                  날짜
                </th>
                <th className="sticky left-[80px] z-30 bg-gray-50 px-2 py-2.5 text-center text-xs font-semibold text-gray-500 border-b border-r border-gray-200 min-w-[56px]">
                  주기
                </th>
                <th className="px-2 py-2.5 text-center text-xs font-semibold text-gray-500 border-b border-r border-gray-200 min-w-[90px]">
                  검토상태
                </th>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className="px-2 py-2.5 text-center text-xs font-semibold border-b border-r border-gray-200 min-w-[180px]"
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
                    <td className="sticky left-0 z-10 bg-white px-3 py-2 border-r border-gray-200 text-xs font-medium text-gray-700 whitespace-nowrap align-top">
                      {formatDate(plan.date)}
                    </td>
                    <td className="sticky left-[80px] z-10 bg-white px-2 py-2 border-r border-gray-200 text-center align-top">
                      <span
                        className={`inline-flex px-1.5 py-0.5 text-[10px] font-bold rounded ${plan.cycleType === '화수목' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}
                      >
                        {plan.cycleType}
                      </span>
                    </td>
                    <td className="px-2 py-2 border-r border-gray-200 text-center align-top">
                      {(() => {
                        const rKey = makeReviewKey(plan.date, plan.cycleType);
                        const record = reviewStatusMap.get(rKey);
                        const cat = record ? getFilterStatus(record.status) : 'pending';
                        const styles: Record<string, { cls: string; label: string; icon: typeof Clock }> = {
                          pending: {
                            cls: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200',
                            label: '검토 대기',
                            icon: Clock,
                          },
                          in_progress: {
                            cls: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
                            label: '검토중',
                            icon: Shield,
                          },
                          completed: {
                            cls: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
                            label: '검토 완료',
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
                              className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-full border cursor-pointer transition-colors ${s.cls}`}
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
