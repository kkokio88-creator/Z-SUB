import React, { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Search, X, UtensilsCrossed, RefreshCw } from 'lucide-react';
import { useHistoricalPlans } from '../context/HistoricalPlansContext';
import { useMenu } from '../context/MenuContext';
import { TargetType } from '../types';
import type { HistoricalMenuItem, HistoricalTargetPlan } from '../types';

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

// 단독 식단 (병합 없음)
const STANDALONE_TARGETS = [TargetType.VALUE, TargetType.SIDE_ONLY, TargetType.FIRST_MEET];

type ColumnDef = { type: 'standalone'; target: TargetType } | { type: 'merged'; group: MergeGroup };

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// ── 주재료 감지 ──

const INGREDIENT_KEYWORDS: Record<string, string[]> = {
  beef: ['소고기', '한우', '불고기', '갈비', '사골'],
  pork: ['한돈', '돼지', '제육', '삼겹', '탕수'],
  chicken: ['닭', '치킨'],
  fish: ['동태', '오징어', '새우', '어묵', '참치', '멸치', '황태', '맛살'],
  tofu: ['두부', '순두부'],
  egg: ['계란', '달걀', '메추리알'],
  potato: ['감자', '고구마'],
  seaweed: ['미역', '파래', '김무침'],
  mushroom: ['버섯', '표고', '느타리'],
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

function cleanMenuName(name: string): string {
  return name
    .replace(/_냉장|_반조리|_냉동/g, '')
    .replace(/\s+\d+$/, '')
    .trim();
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

// ── 병합 셀 컴포넌트 ──

const MergedTableCell: React.FC<{
  baseItems: HistoricalMenuItem[];
  plusItems: HistoricalMenuItem[];
  plusBadge: string;
  date: string;
  baseTarget: string;
  plusTarget: string;
  editedKeys: Set<string>;
  onSwap: (targetType: string, itemIndex: number, currentName: string) => void;
}> = ({ baseItems, plusItems, plusBadge, date, baseTarget, plusTarget, editedKeys, onSwap }) => {
  const [expanded, setExpanded] = useState(false);

  // 공통 메뉴와 plus 전용 메뉴 구분
  const baseNameSet = new Set(baseItems.map(i => cleanMenuName(i.name)));
  const allItems: { item: HistoricalMenuItem; isPlusOnly: boolean; targetType: string; idx: number }[] = [];

  baseItems.forEach((item, idx) => {
    allItems.push({ item, isPlusOnly: false, targetType: baseTarget, idx });
  });

  plusItems.forEach((item, idx) => {
    const cleanName = cleanMenuName(item.name);
    if (!baseNameSet.has(cleanName)) {
      allItems.push({ item, isPlusOnly: true, targetType: plusTarget, idx });
    }
  });

  const displayItems = expanded ? allItems : allItems.slice(0, 6);
  const hasMore = allItems.length > 6;

  return (
    <div className="space-y-0.5">
      {displayItems.map((entry, displayIdx) => {
        const ingredient = detectIngredient(entry.item.name);
        const colors = INGREDIENT_COLORS[ingredient];
        const isEdited = editedKeys.has(`${date}|${entry.targetType}|${entry.idx}`);
        const displayName = cleanMenuName(entry.item.name);

        return (
          <div
            key={`${entry.targetType}-${entry.idx}-${displayIdx}`}
            onClick={() => onSwap(entry.targetType, entry.idx, entry.item.name)}
            className={`px-1.5 py-0.5 rounded text-[11px] leading-tight cursor-pointer border-l-2 ${colors.borderL} ${colors.bg} hover:ring-1 hover:ring-gray-300 transition-all ${isEdited ? 'ring-1 ring-amber-300' : ''}`}
            title={entry.item.name}
          >
            <span className={`${colors.text} truncate block`}>
              {displayName}
              {entry.isPlusOnly && (
                <span className="ml-1 bg-amber-100 text-amber-700 text-[9px] px-1 rounded font-medium">
                  {plusBadge}
                </span>
              )}
              {isEdited && <span className="ml-1 text-[9px] text-amber-600 font-medium">수정</span>}
            </span>
          </div>
        );
      })}
      {hasMore && !expanded && (
        <button
          onClick={e => {
            e.stopPropagation();
            setExpanded(true);
          }}
          className="text-[10px] text-gray-400 hover:text-gray-600 pl-1"
        >
          +{allItems.length - 6}개 더보기
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
  onSwap: (itemIndex: number, currentName: string) => void;
}> = ({ items, date, targetType, editedKeys, onSwap }) => {
  const [expanded, setExpanded] = useState(false);
  const displayItems = expanded ? items : items.slice(0, 6);
  const hasMore = items.length > 6;

  return (
    <div className="space-y-0.5">
      {displayItems.map((item, idx) => {
        const ingredient = detectIngredient(item.name);
        const colors = INGREDIENT_COLORS[ingredient];
        const isEdited = editedKeys.has(`${date}|${targetType}|${idx}`);
        const displayName = cleanMenuName(item.name);

        return (
          <div
            key={idx}
            onClick={() => onSwap(idx, item.name)}
            className={`px-1.5 py-0.5 rounded text-[11px] leading-tight cursor-pointer border-l-2 ${colors.borderL} ${colors.bg} hover:ring-1 hover:ring-gray-300 transition-all ${isEdited ? 'ring-1 ring-amber-300' : ''}`}
            title={item.name}
          >
            <span className={`${colors.text} truncate block`}>
              {displayName}
              {isEdited && <span className="ml-1 text-[9px] text-amber-600 font-medium">수정</span>}
            </span>
          </div>
        );
      })}
      {hasMore && !expanded && (
        <button
          onClick={e => {
            e.stopPropagation();
            setExpanded(true);
          }}
          className="text-[10px] text-gray-400 hover:text-gray-600 pl-1"
        >
          +{items.length - 6}개 더보기
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
        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-800">메뉴 교체</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            현재: <span className="font-medium text-gray-700">{cleanMenuName(currentName)}</span>
          </p>

          {/* 검색 */}
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

          {/* 주재료 필터 */}
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(INGREDIENT_COLORS)
              .filter(([k]) => k !== 'other')
              .map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setIngredientFilter(f => (f === key ? '' : key))}
                  className={`px-2 py-0.5 text-[11px] rounded-full border transition-colors ${
                    ingredientFilter === key
                      ? `${val.bg} ${val.text} border-current font-bold`
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {val.label}
                </button>
              ))}
          </div>
        </div>

        {/* 후보 목록 */}
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

// ── 메인 컴포넌트 ──

const MealPlanHistory: React.FC = () => {
  const { plans: HISTORICAL_MEAL_PLANS, isLoading, refresh } = useHistoricalPlans();
  const { menuItems } = useMenu();
  const latestDate = HISTORICAL_MEAL_PLANS[HISTORICAL_MEAL_PLANS.length - 1]?.date || '2025-01-01';
  const [viewYear, setViewYear] = useState(() => parseInt(latestDate.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => parseInt(latestDate.slice(5, 7)) - 1);

  // 편집 상태: key = "date|targetType|itemIndex", value = 교체된 메뉴명
  const [editedPlans, setEditedPlans] = useState<Map<string, string>>(new Map());
  const editedKeys = useMemo(() => new Set(editedPlans.keys()), [editedPlans]);

  // 교체 모달 상태
  const [swapTarget, setSwapTarget] = useState<{
    date: string;
    targetType: string;
    itemIndex: number;
    currentName: string;
  } | null>(null);

  // 현재 월의 식단 필터링
  const monthPlans = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    return HISTORICAL_MEAL_PLANS.filter(p => p.date.startsWith(prefix));
  }, [viewYear, viewMonth]);

  // 해당 월에 데이터가 있는 타겟 기반으로 컬럼 정의 (병합 그룹 기준)
  const columns = useMemo((): ColumnDef[] => {
    const targetSet = new Set<string>();
    for (const plan of monthPlans) {
      for (const target of plan.targets) {
        targetSet.add(target.targetType);
      }
    }

    const result: ColumnDef[] = [];

    // 병합 그룹 확인
    const usedTargets = new Set<string>();
    for (const group of TARGET_MERGE_MAP) {
      const hasBase = targetSet.has(group.baseTarget);
      const hasPlus = targetSet.has(group.plusTarget);
      if (hasBase || hasPlus) {
        result.push({ type: 'merged', group });
        usedTargets.add(group.baseTarget);
        usedTargets.add(group.plusTarget);
      }
    }

    // 단독 타겟
    for (const target of STANDALONE_TARGETS) {
      if (targetSet.has(target) && !usedTargets.has(target)) {
        result.push({ type: 'standalone', target });
        usedTargets.add(target);
      }
    }

    // 나머지 (예상 외의 타겟)
    for (const t of targetSet) {
      if (!usedTargets.has(t)) {
        result.push({ type: 'standalone', target: t as TargetType });
      }
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

  // 아이템 가져오기 (편집 반영)
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
      setEditedPlans(prev => {
        const next = new Map(prev);
        next.set(key, newName);
        return next;
      });
      setSwapTarget(null);
    },
    [swapTarget]
  );

  // 날짜 포맷: "11.05(화)"
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const dow = DAY_NAMES[d.getDay()];
    return `${month}.${String(day).padStart(2, '0')}(${dow})`;
  };

  // 컬럼 헤더 라벨 가져오기
  const getColumnLabel = (col: ColumnDef): string => {
    if (col.type === 'standalone') {
      return TARGET_LABELS[col.target] || col.target;
    }
    return col.group.groupLabel;
  };

  const getColumnColor = (col: ColumnDef): string => {
    if (col.type === 'standalone') {
      return TARGET_COLORS[col.target] || 'bg-gray-100 text-gray-600';
    }
    return col.group.color;
  };

  return (
    <div className="h-full flex flex-col">
      {/* 헤더: 월 네비게이션 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPrevMonth}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-2xl font-bold text-gray-800 min-w-[160px] text-center">
            {viewYear}년 {viewMonth + 1}월
          </h2>
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={goToToday}
            className="ml-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            오늘
          </button>
          <button
            onClick={refresh}
            disabled={isLoading}
            className="ml-2 p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
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

      {/* 주재료 범례 */}
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
                return (
                  <tr key={plan.date} className="border-b border-gray-100 hover:bg-gray-50/30">
                    {/* 날짜 열 (sticky) */}
                    <td className="sticky left-0 z-10 bg-white px-3 py-2 border-r border-gray-200 text-xs font-medium text-gray-700 whitespace-nowrap align-top">
                      {formatDate(plan.date)}
                    </td>
                    {/* 주기 열 (sticky) */}
                    <td className="sticky left-[80px] z-10 bg-white px-2 py-2 border-r border-gray-200 text-center align-top">
                      <span
                        className={`inline-flex px-1.5 py-0.5 text-[10px] font-bold rounded ${
                          plan.cycleType === '화수목' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                        }`}
                      >
                        {plan.cycleType}
                      </span>
                    </td>
                    {/* 컬럼 렌더링 */}
                    {columns.map((col, colIdx) => {
                      if (col.type === 'standalone') {
                        const target = targetMap.get(col.target);
                        if (!target) {
                          return (
                            <td
                              key={colIdx}
                              className="px-2 py-2 border-r border-gray-100 text-center text-xs text-gray-300 align-top"
                            >
                              —
                            </td>
                          );
                        }
                        const items = getItems(plan.date, col.target, target.items);
                        return (
                          <td key={colIdx} className="px-2 py-1.5 border-r border-gray-100 align-top">
                            <TableCell
                              items={items}
                              date={plan.date}
                              targetType={col.target}
                              editedKeys={editedKeys}
                              onSwap={(itemIndex, currentName) =>
                                setSwapTarget({ date: plan.date, targetType: col.target, itemIndex, currentName })
                              }
                            />
                          </td>
                        );
                      }

                      // Merged column
                      const baseData = targetMap.get(col.group.baseTarget);
                      const plusData = targetMap.get(col.group.plusTarget);

                      if (!baseData && !plusData) {
                        return (
                          <td
                            key={colIdx}
                            className="px-2 py-2 border-r border-gray-100 text-center text-xs text-gray-300 align-top"
                          >
                            —
                          </td>
                        );
                      }

                      const baseItems = baseData ? getItems(plan.date, col.group.baseTarget, baseData.items) : [];
                      const plusItems = plusData ? getItems(plan.date, col.group.plusTarget, plusData.items) : [];

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
                            onSwap={(targetType, itemIndex, currentName) =>
                              setSwapTarget({ date: plan.date, targetType, itemIndex, currentName })
                            }
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

      {/* 교체 모달 */}
      {swapTarget && (
        <SwapModal
          currentName={swapTarget.currentName}
          menuItems={menuItems}
          onSelect={handleSwap}
          onClose={() => setSwapTarget(null)}
        />
      )}
    </div>
  );
};

export default MealPlanHistory;
