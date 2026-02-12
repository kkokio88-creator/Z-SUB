import React, { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, UtensilsCrossed, Calendar } from 'lucide-react';
import { HISTORICAL_MEAL_PLANS } from '../data/historicalMealPlans';
import { TargetType } from '../types';
import type { HistoricalMealPlan, HistoricalTargetPlan } from '../types';

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

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// 날짜 → YYYY-MM-DD 문자열
function toDateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// 해당 월의 달력 그리드 생성 (6주 × 7일)
function buildCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay(); // 0=일 ~ 6=토
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  const cells: { year: number; month: number; day: number; isCurrentMonth: boolean }[] = [];

  // 이전 달
  for (let i = firstDay - 1; i >= 0; i--) {
    const pm = month === 0 ? 11 : month - 1;
    const py = month === 0 ? year - 1 : year;
    cells.push({ year: py, month: pm, day: prevDays - i, isCurrentMonth: false });
  }
  // 이번 달
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ year, month, day: d, isCurrentMonth: true });
  }
  // 다음 달 (6주 채우기)
  const remaining = 42 - cells.length;
  const nm = month === 11 ? 0 : month + 1;
  const ny = month === 11 ? year + 1 : year;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ year: ny, month: nm, day: d, isCurrentMonth: false });
  }

  return cells;
}

const MealPlanHistory: React.FC = () => {
  // 데이터 범위에서 초기 월 설정 (가장 최근 데이터가 있는 월)
  const latestDate = HISTORICAL_MEAL_PLANS[HISTORICAL_MEAL_PLANS.length - 1]?.date || '2025-01-01';
  const [viewYear, setViewYear] = useState(() => parseInt(latestDate.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => parseInt(latestDate.slice(5, 7)) - 1);
  const [selectedPlan, setSelectedPlan] = useState<HistoricalMealPlan | null>(null);
  const [filterTarget, setFilterTarget] = useState('');

  // 날짜 키 → 식단 매핑 (O(1) 조회)
  // 화수목: 시작일(주로 화) + 다음날 + 그다음날
  // 금토월: 시작일(주로 금) + 다음날 + 그다음날
  const planMap = useMemo(() => {
    const map = new Map<string, HistoricalMealPlan>();
    for (const p of HISTORICAL_MEAL_PLANS) {
      const d = new Date(p.date);
      for (let offset = 0; offset < 3; offset++) {
        const nd = new Date(d);
        nd.setDate(nd.getDate() + offset);
        const key = toDateKey(nd.getFullYear(), nd.getMonth(), nd.getDate());
        if (!map.has(key)) {
          map.set(key, p);
        }
      }
    }
    return map;
  }, []);

  // 데이터가 존재하는 월 목록 (빠른 네비게이션용)
  const dataMonths = useMemo(() => {
    const set = new Set<string>();
    for (const p of HISTORICAL_MEAL_PLANS) {
      set.add(p.date.slice(0, 7));
    }
    return set;
  }, []);

  // 달력 그리드
  const calendarCells = useMemo(() => buildCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  // 현재 월의 식단 수
  const currentMonthCount = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    return HISTORICAL_MEAL_PLANS.filter(p => p.date.startsWith(prefix)).length;
  }, [viewYear, viewMonth]);

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

  // 상세 뷰
  if (selectedPlan) {
    return (
      <DetailView
        plan={selectedPlan}
        filterTarget={filterTarget}
        onBack={() => setSelectedPlan(null)}
        onNavigate={dir => {
          const idx = HISTORICAL_MEAL_PLANS.findIndex(p => p.date === selectedPlan.date);
          const next = HISTORICAL_MEAL_PLANS[idx + dir];
          if (next) setSelectedPlan(next);
        }}
        hasPrev={HISTORICAL_MEAL_PLANS.findIndex(p => p.date === selectedPlan.date) > 0}
        hasNext={HISTORICAL_MEAL_PLANS.findIndex(p => p.date === selectedPlan.date) < HISTORICAL_MEAL_PLANS.length - 1}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 헤더: 월 네비게이션 + 필터 */}
      <div className="flex items-center justify-between mb-5">
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
          {currentMonthCount > 0 && (
            <span className="ml-2 px-2.5 py-1 text-xs font-medium text-primary-700 bg-primary-50 rounded-full">
              {currentMonthCount}건
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterTarget}
            onChange={e => setFilterTarget(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-primary-500"
          >
            <option value="">전체 타겟 보기</option>
            {Object.entries(TARGET_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          {filterTarget && (
            <button onClick={() => setFilterTarget('')} className="p-2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((name, i) => (
          <div
            key={name}
            className={`text-center text-xs font-semibold py-2 ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
            }`}
          >
            {name}
          </div>
        ))}
      </div>

      {/* 달력 그리드 */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-px bg-gray-200 rounded-xl overflow-hidden border border-gray-200">
        {calendarCells.map((cell, i) => {
          const dateKey = toDateKey(cell.year, cell.month, cell.day);
          const plan = planMap.get(dateKey);
          const dayOfWeek = new Date(cell.year, cell.month, cell.day).getDay();
          const isToday = dateKey === new Date().toISOString().slice(0, 10);

          // 타겟 필터 적용
          const hasPlan = plan && (!filterTarget || plan.targets.some(t => t.targetType === filterTarget));

          return (
            <div
              key={i}
              onClick={() => (hasPlan && plan ? setSelectedPlan(plan) : undefined)}
              className={`
                bg-white p-1.5 min-h-[90px] flex flex-col transition-colors
                ${!cell.isCurrentMonth ? 'bg-gray-50/80' : ''}
                ${hasPlan ? 'cursor-pointer hover:bg-blue-50/50' : ''}
                ${isToday ? 'ring-2 ring-inset ring-primary-400' : ''}
              `}
            >
              {/* 날짜 숫자 */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-medium leading-none ${
                    !cell.isCurrentMonth
                      ? 'text-gray-300'
                      : isToday
                        ? 'text-white bg-primary-500 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold'
                        : dayOfWeek === 0
                          ? 'text-red-400'
                          : dayOfWeek === 6
                            ? 'text-blue-400'
                            : 'text-gray-500'
                  }`}
                >
                  {cell.day}
                </span>
                {hasPlan && plan && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      plan.cycleType === '화수목' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                    }`}
                  >
                    {plan.cycleType}
                  </span>
                )}
              </div>

              {/* 식단 요약 */}
              {hasPlan && plan && <CalendarCell plan={plan} filterTarget={filterTarget} />}
            </div>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-4 mt-3 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-100 border border-blue-200" />
          <span className="text-[11px] text-gray-500">화수목</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-orange-100 border border-orange-200" />
          <span className="text-[11px] text-gray-500">금토월</span>
        </div>
        <span className="text-[11px] text-gray-400 ml-auto">날짜를 클릭하면 상세 식단을 볼 수 있습니다</span>
      </div>
    </div>
  );
};

// ── 달력 셀 내부 ──
const CalendarCell: React.FC<{ plan: HistoricalMealPlan; filterTarget: string }> = ({ plan, filterTarget }) => {
  const targets = filterTarget ? plan.targets.filter(t => t.targetType === filterTarget) : plan.targets;

  // 대표 메뉴 3개 추출
  const previewMenus: string[] = [];
  for (const t of targets) {
    for (const item of t.items) {
      // 메뉴명에서 숫자(용량) 제거하여 짧게
      const shortName = item.name.replace(/_[^\s]+/g, '').replace(/\s+\d+$/, '');
      if (!previewMenus.includes(shortName)) {
        previewMenus.push(shortName);
        if (previewMenus.length >= 3) break;
      }
    }
    if (previewMenus.length >= 3) break;
  }

  const totalItems = targets.reduce((s, t) => s + t.items.length, 0);

  return (
    <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
      {previewMenus.map((name, i) => (
        <p key={i} className="text-[10px] text-gray-600 truncate leading-tight">
          {name}
        </p>
      ))}
      <p className="text-[9px] text-gray-400 mt-auto">
        {targets.length}타겟 {totalItems}품
      </p>
    </div>
  );
};

// ── 상세 뷰 ──
const DetailView: React.FC<{
  plan: HistoricalMealPlan;
  filterTarget: string;
  onBack: () => void;
  onNavigate: (dir: -1 | 1) => void;
  hasPrev: boolean;
  hasNext: boolean;
}> = ({ plan, filterTarget, onBack, onNavigate, hasPrev, hasNext }) => {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} (${DAY_NAMES[d.getDay()]})`;
  };

  const targets = filterTarget ? plan.targets.filter(t => t.targetType === filterTarget) : plan.targets;

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Calendar className="w-4 h-4" /> 달력으로
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{formatDate(plan.date)}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full ${
                  plan.cycleType === '화수목' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'
                }`}
              >
                {plan.cycleType}
              </span>
              <span className="text-sm text-gray-500">
                {targets.length}개 타겟 | {targets.reduce((s, t) => s + t.items.length, 0)}개 메뉴
              </span>
              {filterTarget && (
                <span className="text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                  {TARGET_LABELS[filterTarget]} 필터 적용
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate(-1)}
            disabled={!hasPrev}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="이전 식단"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => onNavigate(1)}
            disabled={!hasNext}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="다음 식단"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 타겟별 카드 그리드 */}
      <div className="flex-1 overflow-y-auto">
        {targets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <UtensilsCrossed className="w-12 h-12 mb-3 opacity-50" />
            <p className="font-medium">선택한 타겟의 식단이 없습니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {targets.map(target => (
              <TargetCard key={target.targetType} target={target} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── 타겟 카드 ──
const TargetCard: React.FC<{ target: HistoricalTargetPlan }> = ({ target }) => {
  const colorClass = TARGET_COLORS[target.targetType] || 'bg-gray-100 text-gray-600 border-gray-200';
  const label = TARGET_LABELS[target.targetType] || target.targetType;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className={`px-4 py-3 border-b ${colorClass.replace('border-', 'border-b-')}`}>
        <div className="flex items-center justify-between">
          <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-lg ${colorClass}`}>{label}</span>
          <span className="text-xs text-gray-500">{target.items.length}품</span>
        </div>
      </div>
      <div className="p-4">
        <ul className="space-y-1.5">
          {target.items.map((item, idx) => (
            <li key={idx} className="flex items-center gap-2 text-sm">
              <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-medium text-gray-500 flex-shrink-0">
                {idx + 1}
              </span>
              <span className="text-gray-700 truncate" title={item.name}>
                {item.name}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default MealPlanHistory;
