import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed,
  RefreshCw,
  Shield,
  Clock,
  CheckCircle,
  MessageSquare,
  Download,
  FileText,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useHistoricalPlans } from '../context/HistoricalPlansContext';
import { useMenu } from '../context/MenuContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSheets } from '../context/SheetsContext';
import { pushSheetData } from '../services/sheetsService';
import { TargetType } from '../types';
import { TARGET_CONFIGS, TARGET_LABELS } from '../constants';
import type {
  HistoricalMenuItem,
  HistoricalTargetPlan,
  HistoricalMealPlan,
  PlanReviewRecord,
  ReviewComment,
  MenuItem,
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
  deleteComment,
  resetDepartmentsForReReview,
} from '../services/reviewService';
import HistoryReviewModal from './HistoryReviewModal';
import HistoryIngredientView from './HistoryIngredientView';
import HistoryDistributionView from './HistoryDistributionView';
import { normalizeMenuName } from '../services/menuUtils';
import {
  TARGET_COLORS,
  TARGET_MERGE_MAP,
  STANDALONE_TARGETS,
  INGREDIENT_COLORS,
  INGREDIENT_HIGHLIGHT_TEXT,
  PROCESS_ORDER,
  PROCESS_COLORS,
  DAY_NAMES,
  isValidMenuItem,
  parseMenuItem,
  detectProcess,
  detectIngredient,
  type ColumnDef,
} from './history/historyConstants';
import { HistoryTableCell, MergedTableCell, SwapModal, ActionModal, CommentModal } from './history';

// Inline sub-components extracted to components/history/
// MenuItemRow, MergedTableCell, HistoryTableCell, SwapModal, ActionModal, CommentModal
// Constants/utils extracted to components/history/historyConstants.ts

// ── 메인 컴포넌트 ──

const MealPlanHistory: React.FC = () => {
  const { plans: HISTORICAL_MEAL_PLANS, isLoading, refresh, deletePlansByMonth, deletePlan } = useHistoricalPlans();
  const { menuItems } = useMenu();
  const { user } = useAuth();
  const { addToast } = useToast();
  const { setSyncStatus } = useSheets();
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

  // 삭제 확인 다이얼로그 상태
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'month' | 'single';
    date: string;
    cycleType?: string;
  } | null>(null);

  const handleDeleteMonth = useCallback(() => {
    const yearMonth = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    const count = deletePlansByMonth(yearMonth);
    addToast({
      type: 'success',
      title: '히스토리 삭제',
      message: `${viewYear}년 ${viewMonth + 1}월 히스토리 ${count}건이 삭제되었습니다.`,
    });
    setDeleteConfirm(null);
  }, [viewYear, viewMonth, deletePlansByMonth, addToast]);

  const handleDeleteSingle = useCallback(
    (date: string, cycleType: string) => {
      deletePlan(date, cycleType);
      addToast({ type: 'success', title: '히스토리 삭제', message: `${date} (${cycleType}) 식단이 삭제되었습니다.` });
      setDeleteConfirm(null);
    },
    [deletePlan, addToast]
  );

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
  }, [viewYear, viewMonth, HISTORICAL_MEAL_PLANS]);

  useEffect(() => {
    for (const p of allMonthPlans) {
      const key = makeReviewKey(p.date, p.cycleType);
      if (!commentCache[key]) loadCommentsForPlan(key);
    }
  }, [allMonthPlans, commentCache, loadCommentsForPlan]);

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

  // ── 메뉴 DB 룩업 맵 (이름 → MenuItem) ──
  const menuLookup = useMemo(() => {
    const map = new Map<string, MenuItem>();
    for (const m of menuItems) {
      map.set(m.name, m);
      // 접미사 제거된 이름으로도 매핑
      const clean = normalizeMenuName(m.name);
      if (!map.has(clean)) map.set(clean, m);
    }
    return map;
  }, [menuItems]);

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
          if (!menuProcess.has(cleanName))
            menuProcess.set(cleanName, detectProcess(item.name, menuLookup.get(cleanName)));
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
  }, [monthPlans, shipmentConfig, menuLookup]);

  // ── 타겟별 할인 정보 계산 ──
  const discountSummary = useMemo(() => {
    const result = new Map<
      string,
      { sumRecPrice: number; targetPrice: number; totalCost: number; targetCostRatio: number }
    >();
    for (const plan of monthPlans) {
      for (const target of plan.targets) {
        const key = `${plan.date}-${plan.cycleType}-${target.targetType}`;
        const config = TARGET_CONFIGS[target.targetType as TargetType];
        if (!config) continue;
        let sumRecPrice = 0;
        let totalCost = 0;
        target.items.forEach((item, idx) => {
          if (!isValidMenuItem(item.name)) return;
          const editKey = `${plan.date}|${target.targetType}|${idx}`;
          const edited = editedPlans.get(editKey);
          if (edited) {
            const newMenu = menuItems.find(m => m.name === edited.newName);
            sumRecPrice += newMenu?.recommendedPrice || item.price;
            totalCost += newMenu?.cost || item.cost;
          } else {
            sumRecPrice += item.price;
            totalCost += item.cost;
          }
        });
        result.set(key, {
          sumRecPrice,
          targetPrice: config.targetPrice,
          totalCost,
          targetCostRatio: config.targetCostRatio,
        });
      }
    }
    return result;
  }, [monthPlans, editedPlans, menuItems]);

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

  const [viewMode, setViewMode] = useState<'plan' | 'ingredient' | 'distribution' | 'production'>('plan');
  const contentRef = useRef<HTMLDivElement>(null);

  // 주재료 하이라이트 상태
  const [highlightedIngredient, setHighlightedIngredient] = useState<string | null>(null);

  // 통합 생산 수량 (메뉴별 합산)
  const consolidatedProduction = useMemo(() => {
    const result = new Map<
      string,
      { menuName: string; code?: string; process: string; totalQty: number; byTarget: Record<string, number> }
    >();
    for (const plan of monthPlans) {
      for (const target of plan.targets) {
        const volume = shipmentConfig[target.targetType]?.[plan.cycleType] || 0;
        if (volume === 0) continue;
        for (const item of target.items) {
          if (!isValidMenuItem(item.name)) continue;
          const { cleanName } = parseMenuItem(item.name);
          const existing = result.get(cleanName);
          if (existing) {
            existing.totalQty += volume;
            existing.byTarget[target.targetType] = (existing.byTarget[target.targetType] || 0) + volume;
          } else {
            result.set(cleanName, {
              menuName: cleanName,
              code: item.code,
              process: detectProcess(item.name, menuLookup.get(cleanName)),
              totalQty: volume,
              byTarget: { [target.targetType]: volume },
            });
          }
        }
      }
    }
    // 공정별 그룹 정렬 후 각 그룹 내 수량 내림차순
    const items = [...result.values()];
    const processOrder = new Map(PROCESS_ORDER.map((p, i) => [p, i]));
    return items.sort((a, b) => {
      const pa = processOrder.get(a.process) ?? 999;
      const pb = processOrder.get(b.process) ?? 999;
      if (pa !== pb) return pa - pb;
      return b.totalQty - a.totalQty;
    });
  }, [monthPlans, shipmentConfig, menuLookup]);

  // 생산 한도 설정 로드
  const productionLimits = useMemo(() => {
    try {
      const saved = localStorage.getItem('zsub_production_limits');
      if (saved) return JSON.parse(saved) as { category: string; dailyLimit: number; enabled: boolean }[];
    } catch {
      /* ignore */
    }
    return [
      { category: '냉장국', dailyLimit: 10, enabled: true },
      { category: '반조리', dailyLimit: 10, enabled: true },
    ];
  }, []);

  const exportToHistoryCSV = useCallback(() => {
    if (monthPlans.length === 0) return;
    let csv: string;
    const suffix =
      viewMode === 'ingredient'
        ? '재료검토'
        : viewMode === 'distribution'
          ? '현장배포'
          : viewMode === 'production'
            ? '생산통합'
            : '식단표';
    if (viewMode === 'plan') {
      const targetLabels = columns.map(col =>
        col.type === 'standalone' ? TARGET_LABELS[col.target] || col.target : col.group.groupLabel
      );
      const header = '날짜,주기,' + targetLabels.join(',');
      const rows: string[] = [];
      for (const plan of monthPlans) {
        const targetMap = new Map(plan.targets.map(t => [t.targetType, t]));
        const cells = columns.map(col => {
          if (col.type === 'standalone') {
            const target = targetMap.get(col.target);
            if (!target) return '';
            const names = target.items.map(item => item.name).filter(n => n && n.trim());
            return `"${names.join('/')}"`;
          } else {
            const baseTarget = targetMap.get(col.group.baseTarget);
            const plusTarget = targetMap.get(col.group.plusTarget);
            const names = [
              ...(baseTarget ? baseTarget.items.map(item => item.name).filter(n => n && n.trim()) : []),
              ...(plusTarget ? plusTarget.items.map(item => item.name).filter(n => n && n.trim()) : []),
            ];
            return `"${names.join('/')}"`;
          }
        });
        rows.push(`${plan.date},"${plan.cycleType}",${cells.join(',')}`);
      }
      csv = [header, ...rows].join('\n');
    } else if (viewMode === 'ingredient' || viewMode === 'distribution') {
      const header = '날짜,주기,식단유형,메뉴명,공정,판매가,원가';
      const rows: string[] = [];
      for (const plan of monthPlans) {
        for (const target of plan.targets) {
          for (const item of target.items) {
            if (!item.name || !item.name.trim()) continue;
            const proc = item.name.includes('_반조리')
              ? '반조리'
              : item.name.includes('_냉장')
                ? '냉장'
                : item.name.includes('_냉동')
                  ? '냉동'
                  : '';
            const cleanName = normalizeMenuName(item.name);
            rows.push(
              `${plan.date},"${plan.cycleType}","${TARGET_LABELS[target.targetType] || target.targetType}","${cleanName}","${proc}",${item.price},${item.cost}`
            );
          }
        }
      }
      csv = [header, ...rows].join('\n');
    } else {
      // production - 공정별 그룹 + 소계
      const header = '메뉴명,제품코드,공정,총생산수량';
      const rows: string[] = [];
      let lastProcess = '';
      for (const item of consolidatedProduction) {
        if (item.process !== lastProcess) {
          if (lastProcess) {
            const groupTotal = consolidatedProduction
              .filter(i => i.process === lastProcess)
              .reduce((s, i) => s + i.totalQty, 0);
            rows.push(`"${lastProcess} 소계","","${lastProcess}",${groupTotal}`);
          }
          lastProcess = item.process;
        }
        rows.push(`"${item.menuName}","${item.code ?? ''}","${item.process}",${item.totalQty}`);
      }
      if (lastProcess) {
        const groupTotal = consolidatedProduction
          .filter(i => i.process === lastProcess)
          .reduce((s, i) => s + i.totalQty, 0);
        rows.push(`"${lastProcess} 소계","","${lastProcess}",${groupTotal}`);
      }
      rows.push(`"합계","","",${consolidatedProduction.reduce((s, i) => s + i.totalQty, 0)}`);
      csv = [header, ...rows].join('\n');
    }
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `식단히스토리_${viewYear}년${viewMonth + 1}월_${suffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [monthPlans, consolidatedProduction, columns, viewYear, viewMonth, viewMode]);

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

  const exportToGoogleSheets = useCallback(async () => {
    if (monthPlans.length === 0) {
      addToast({ type: 'error', title: '내보내기 실패', message: '내보낼 식단 데이터가 없습니다.' });
      return;
    }
    const sheetName = `식단_히스토리_${viewYear}년${viewMonth + 1}월`;
    setSyncStatus(sheetName, 'syncing', 'push');
    try {
      const headers = ['날짜', '주기', '식단유형', '메뉴명', '판매가', '원가'];
      const rows: string[][] = [];
      for (const plan of monthPlans) {
        for (const target of plan.targets) {
          for (const item of target.items) {
            if (!item.name || !item.name.trim()) continue;
            rows.push([
              plan.date,
              plan.cycleType,
              TARGET_LABELS[target.targetType] || target.targetType,
              item.name,
              String(item.price),
              String(item.cost),
            ]);
          }
        }
      }
      const result = await pushSheetData(sheetName, [headers, ...rows]);
      if (result.success) {
        setSyncStatus(sheetName, 'success', 'push');
        addToast({
          type: 'success',
          title: '시트 내보내기 완료',
          message: `${rows.length}건을 "${sheetName}" 시트에 내보냈습니다.`,
        });
      } else {
        throw new Error(result.message || '시트 쓰기 실패');
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setSyncStatus(sheetName, 'error', 'push', errMsg);
      addToast({
        type: 'error',
        title: '시트 내보내기 실패',
        message: errMsg,
      });
    }
  }, [monthPlans, viewYear, viewMonth, setSyncStatus, addToast]);

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
    [swapTarget, loadCommentsForPlan, commentCache, user, refreshReviewStatus, editedPlans]
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

      if (commentTarget.scopeKey.startsWith('PROD|')) {
        // Production comment → propagate to all targets containing this menu
        const cleanName = commentTarget.scopeKey.split('|')[1];
        const plan = monthPlans.find(p => makeReviewKey(p.date, p.cycleType) === commentTarget.planKey);
        if (plan) {
          for (const target of plan.targets) {
            target.items.forEach((item, idx) => {
              if (!isValidMenuItem(item.name)) return;
              const { cleanName: itemClean } = parseMenuItem(item.name);
              if (itemClean === cleanName) {
                addReviewComment(commentTarget.planKey, {
                  department: 'quality',
                  reviewer: user?.displayName || '익명',
                  scope: 'item',
                  scopeKey: `${target.targetType}-${idx}-${cleanName}`,
                  comment: text,
                  status: 'comment',
                });
              }
            });
          }
          addToast({ type: 'success', title: '코멘트 등록', message: '모든 해당 식단에 의견이 반영되었습니다.' });
        }
      } else {
        addReviewComment(commentTarget.planKey, {
          department: 'quality',
          reviewer: user?.displayName || '익명',
          scope: 'item',
          scopeKey: commentTarget.scopeKey,
          comment: text,
          status: 'comment',
        });
        addToast({ type: 'success', title: '코멘트 등록', message: '의견이 등록되었습니다.' });
      }

      loadCommentsForPlan(commentTarget.planKey);
    },
    [commentTarget, user, loadCommentsForPlan, addToast, monthPlans]
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')}(${DAY_NAMES[d.getDay()]})`;
  };

  const getColumnLabel = (col: ColumnDef): string =>
    col.type === 'standalone' ? TARGET_LABELS[col.target] || col.target : col.group.groupLabel;
  const getColumnColor = (col: ColumnDef): string =>
    col.type === 'standalone' ? TARGET_COLORS[col.target] || 'bg-stone-100 text-stone-600' : col.group.color;

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={goToPrevMonth} className="p-2">
            <ChevronLeft className="w-5 h-5 text-stone-600" />
          </Button>
          <h2 className="text-2xl font-bold text-stone-800 min-w-[160px] text-center">
            {viewYear}년 {viewMonth + 1}월
          </h2>
          <Button variant="outline" size="sm" onClick={goToNextMonth} className="p-2">
            <ChevronRight className="w-5 h-5 text-stone-600" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday} className="ml-2 text-xs font-medium">
            오늘
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isLoading}
            className="ml-2 p-1.5"
            title="시트에서 새로고침"
          >
            <RefreshCw className={`w-4 h-4 text-stone-500 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {monthPlans.length > 0 && (
            <Badge variant="secondary" className="ml-2 px-2.5 py-1 text-xs font-medium text-primary-700 bg-primary-50">
              {monthPlans.length}건
            </Badge>
          )}
          {allMonthPlans.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setDeleteConfirm({ type: 'month', date: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}` })
              }
              className="ml-2 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50"
              title={`${viewYear}년 ${viewMonth + 1}월 전체 삭제`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
        {editedPlans.size > 0 && (
          <Badge
            variant="outline"
            className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border-amber-200"
          >
            {editedPlans.size}건 수정됨
          </Badge>
        )}
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-2 mb-3">
        {(
          [
            { key: 'all' as const, label: '전체', color: 'bg-stone-100 text-stone-700 border-stone-300' },
            { key: 'pending' as const, label: '대기', color: 'bg-stone-50 text-stone-600 border-stone-300' },
            { key: 'in_progress' as const, label: '검토중', color: 'bg-blue-50 text-blue-600 border-blue-300' },
            { key: 'completed' as const, label: '완료', color: 'bg-green-50 text-green-600 border-green-300' },
          ] as const
        ).map(f => (
          <Button
            key={f.key}
            variant={reviewFilter === f.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setReviewFilter(f.key)}
            className={`px-3 py-1.5 text-xs font-bold ${reviewFilter === f.key ? f.color + ' ring-1 ring-offset-1' : 'bg-white text-stone-500 border-stone-200'}`}
          >
            {f.label}
            <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-white/60">
              {filterCounts[f.key]}
            </Badge>
          </Button>
        ))}
      </div>

      {/* 뷰 모드 & 내보내기 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg">
          {[
            { key: 'plan' as const, label: '식단표' },
            { key: 'ingredient' as const, label: '재료검토' },
            { key: 'distribution' as const, label: '현장배포' },
            { key: 'production' as const, label: '생산통합' },
          ].map(v => (
            <Button
              key={v.key}
              variant={viewMode === v.key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode(v.key)}
              className={`px-3 py-1.5 text-xs font-bold ${viewMode === v.key ? 'bg-white text-stone-800 shadow-sm' : ''}`}
            >
              {v.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToHistoryCSV}
            className="flex items-center gap-1 text-xs font-medium"
            title="CSV 다운로드"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToHistoryPDF}
            className="flex items-center gap-1 text-xs font-medium"
            title="PDF 다운로드"
          >
            <FileText className="w-3.5 h-3.5" /> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToGoogleSheets}
            className="flex items-center gap-1 text-xs font-medium text-green-700 border-green-300 hover:bg-green-50"
            title="Google Sheets 내보내기"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> 시트 내보내기
          </Button>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div ref={contentRef} className="flex-1 flex flex-col min-h-0">
        {monthPlans.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-400">
            <UtensilsCrossed className="w-12 h-12 mb-3 opacity-50" />
            <p className="font-medium">이 달의 식단 데이터가 없습니다</p>
          </div>
        ) : viewMode === 'ingredient' ? (
          <HistoryIngredientView monthPlans={monthPlans} formatDate={formatDate} />
        ) : viewMode === 'distribution' ? (
          <HistoryDistributionView monthPlans={monthPlans} formatDate={formatDate} />
        ) : viewMode === 'production' ? (
          <div className="flex-1 overflow-auto">
            {/* Consolidated production table (US-016: inline warnings per item) */}
            <div className="border border-stone-200 rounded-xl overflow-hidden">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-stone-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 border-b border-stone-200">
                      메뉴명
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 border-b border-stone-200">
                      제품코드
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 border-b border-stone-200">
                      공정
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-stone-500 border-b border-stone-200">
                      총 생산수량
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // 공정별 품목 수 집계 (한도 경고용)
                    const processItemCounts = new Map<string, number>();
                    for (const item of consolidatedProduction) {
                      processItemCounts.set(item.process, (processItemCounts.get(item.process) || 0) + 1);
                    }
                    const renderSubtotal = (process: string) => {
                      const groupItems = consolidatedProduction.filter(i => i.process === process);
                      const groupTotal = groupItems.reduce((s, i) => s + i.totalQty, 0);
                      const gpc = PROCESS_COLORS[process] || PROCESS_COLORS['기타'];
                      const limitCfg = productionLimits.find(l => l.enabled && l.category === process);
                      const itemCount = groupItems.length;
                      const isCountOver = limitCfg && itemCount > limitCfg.dailyLimit;
                      return (
                        <tr
                          key={`sub-${process}`}
                          className={`${isCountOver ? 'bg-red-50' : gpc.bg} border-b border-stone-200`}
                        >
                          <td colSpan={3} className="px-4 py-1.5 text-[11px] font-bold text-stone-500">
                            {process} 소계 ({itemCount}건)
                            {isCountOver && limitCfg && (
                              <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-red-500 font-bold">
                                <AlertTriangle className="w-3 h-3" />
                                한도 초과 ({itemCount}/{limitCfg.dailyLimit})
                              </span>
                            )}
                          </td>
                          <td
                            className={`px-4 py-1.5 text-right text-xs font-bold tabular-nums ${isCountOver ? 'text-red-600' : 'text-stone-700'}`}
                          >
                            {groupTotal.toLocaleString()}
                          </td>
                        </tr>
                      );
                    };
                    let lastProcess = '';
                    const rows: React.ReactNode[] = [];
                    consolidatedProduction.forEach((item, idx) => {
                      if (item.process !== lastProcess) {
                        if (lastProcess) {
                          rows.push(renderSubtotal(lastProcess));
                        }
                        lastProcess = item.process;
                      }
                      const pc = PROCESS_COLORS[item.process] || PROCESS_COLORS['기타'];
                      rows.push(
                        <tr key={idx} className="border-b border-stone-100 hover:bg-stone-50">
                          <td className="px-4 py-2.5 font-medium text-stone-800">{item.menuName}</td>
                          <td className="px-4 py-2.5 text-stone-500 font-mono text-xs">{item.code || '-'}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${pc.badge}`}>
                              {item.process}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="font-bold tabular-nums text-stone-800">
                              {item.totalQty.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                    // 마지막 그룹 소계
                    if (lastProcess) {
                      rows.push(renderSubtotal(lastProcess));
                    }
                    return rows;
                  })()}
                </tbody>
                <tfoot>
                  <tr className="bg-stone-50 border-t border-stone-200">
                    <td colSpan={3} className="px-4 py-3 text-xs font-bold text-stone-600">
                      합계
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-stone-800">
                      {consolidatedProduction.reduce((s, i) => s + i.totalQty, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="flex-1 overflow-auto border border-stone-200 rounded-xl">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-stone-50">
                    <th className="sticky left-0 z-30 bg-stone-50 px-2 py-2.5 text-left text-xs font-semibold text-stone-500 border-b border-r border-stone-200 min-w-[72px]">
                      날짜
                    </th>
                    <th className="sticky left-[72px] z-30 bg-stone-50 px-1.5 py-2.5 text-center text-xs font-semibold text-stone-500 border-b border-r border-stone-200 min-w-[56px]">
                      주기
                    </th>
                    <th className="px-1.5 py-2.5 text-center text-xs font-semibold text-stone-500 border-b border-r border-stone-200 min-w-[80px]">
                      검토상태
                    </th>
                    <th className="px-2 py-2.5 text-center text-xs font-semibold text-stone-500 border-b border-r border-stone-200 min-w-[220px]">
                      생산수량
                    </th>
                    {columns.map((col, idx) => (
                      <th
                        key={idx}
                        className="px-2 py-2.5 text-center text-xs font-semibold border-b border-r border-stone-200"
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
                  <tr className="bg-stone-50 border-b border-stone-200">
                    <td colSpan={columns.length + 4} className="px-2 py-1.5">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[11px] font-medium text-stone-500">주재료 필터:</span>
                        {Object.entries(INGREDIENT_COLORS)
                          .filter(([k]) => k !== 'other')
                          .map(([key, val]) => {
                            const isActive = highlightedIngredient === key;
                            return (
                              <button
                                key={key}
                                onClick={() => setHighlightedIngredient(isActive ? null : key)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-all ${
                                  isActive
                                    ? `bg-stone-100 ${INGREDIENT_HIGHLIGHT_TEXT[key] || 'text-stone-700'} ring-2 ring-offset-1 ring-current shadow-sm font-bold`
                                    : 'bg-stone-50 text-stone-500 hover:bg-stone-100'
                                }`}
                              >
                                {val.label}
                              </button>
                            );
                          })}
                        {highlightedIngredient && (
                          <button
                            onClick={() => setHighlightedIngredient(null)}
                            className="text-[10px] text-stone-400 hover:text-stone-600 underline ml-1"
                          >
                            초기화
                          </button>
                        )}
                      </div>
                    </td>
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
                        className={`group border-b border-stone-100 hover:bg-emerald-50/40 ${isCompleted ? 'opacity-60 bg-stone-50/50' : ''}`}
                      >
                        <td className="sticky left-0 z-10 bg-white px-2 py-2 border-r border-stone-200 text-xs font-medium text-stone-700 whitespace-nowrap align-top">
                          <div className="flex items-center gap-1">
                            {formatDate(plan.date)}
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setDeleteConfirm({ type: 'single', date: plan.date, cycleType: plan.cycleType });
                              }}
                              className="opacity-0 group-hover:opacity-100 hover:text-red-500 text-stone-300 transition-opacity p-0.5"
                              title="이 식단 삭제"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="sticky left-[72px] z-10 bg-white px-1.5 py-2 border-r border-stone-200 text-center align-top">
                          <span className="inline-flex px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600 whitespace-nowrap">
                            {plan.cycleType}
                          </span>
                        </td>
                        <td className="px-1.5 py-2 border-r border-stone-200 text-center align-top">
                          {(() => {
                            const rKey = makeReviewKey(plan.date, plan.cycleType);
                            const record = reviewStatusMap.get(rKey);
                            const cat = record ? getFilterStatus(record.status) : 'pending';
                            const styles: Record<string, { cls: string; label: string; icon: typeof Clock }> = {
                              pending: {
                                cls: 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100',
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
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedReview(plan)}
                                  className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-full whitespace-nowrap ${s.cls}`}
                                >
                                  <StatusIcon className="w-3 h-3" />
                                  {s.label}
                                </Button>
                                {record && record.departments && record.departments.length > 0 && (
                                  <div className="flex flex-col gap-0.5 mt-0.5">
                                    {record.departments.map(dept => (
                                      <div
                                        key={dept.department}
                                        className="flex items-center gap-1 text-[9px] text-stone-500"
                                      >
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full ${
                                            dept.status === 'approved'
                                              ? 'bg-green-500'
                                              : dept.status === 'rejected'
                                                ? 'bg-red-500'
                                                : 'bg-stone-300'
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
                        {/* 생산수량 (2열 배치) */}
                        <td className="px-1.5 py-2 border-r border-stone-200 align-top">
                          {(() => {
                            const sumKey = `${plan.date}-${plan.cycleType}`;
                            const groups = productionSummary.get(sumKey) || [];
                            if (groups.length === 0) {
                              return <span className="text-[10px] text-stone-300 whitespace-nowrap">설정 필요</span>;
                            }
                            const leftCol: typeof groups = [];
                            const rightCol: typeof groups = [];
                            let leftH = 0;
                            let rightH = 0;
                            for (const g of groups) {
                              const h = g.items.length + 1;
                              if (leftH <= rightH) {
                                leftCol.push(g);
                                leftH += h;
                              } else {
                                rightCol.push(g);
                                rightH += h;
                              }
                            }
                            const renderGroup = (group: (typeof groups)[0]) => {
                              const pc = PROCESS_COLORS[group.process] || PROCESS_COLORS['기타'];
                              return (
                                <div key={group.process}>
                                  <div className={`text-[9px] font-bold px-1 py-0.5 rounded ${pc.badge} mb-0.5`}>
                                    {group.process} ({group.totalQty})
                                  </div>
                                  {group.items.map(item => {
                                    const prodCommentCount = Array.from(commentCounts.entries())
                                      .filter(([k]) => k.endsWith(`-${item.name}`))
                                      .reduce((s, [, v]) => s + v, 0);
                                    return (
                                      <div
                                        key={item.name}
                                        onClick={() => {
                                          const pk = makeReviewKey(plan.date, plan.cycleType);
                                          setCommentTarget({
                                            planKey: pk,
                                            scopeKey: `PROD|${item.name}`,
                                            menuName: item.name,
                                          });
                                        }}
                                        className="flex items-center gap-1 text-[10px] leading-tight whitespace-nowrap pl-1 cursor-pointer hover:bg-stone-100 rounded px-0.5 -mx-0.5"
                                      >
                                        <span className="text-stone-600 truncate">{item.name}</span>
                                        <span className="text-stone-800 font-bold shrink-0">{item.qty}</span>
                                        {prodCommentCount > 0 && (
                                          <span className="text-[8px] text-blue-500 shrink-0">
                                            <MessageSquare className="w-2.5 h-2.5 inline" />
                                            {prodCommentCount}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            };
                            return (
                              <div className="grid grid-cols-2 gap-x-2">
                                <div className="space-y-1">{leftCol.map(renderGroup)}</div>
                                <div className="space-y-1">{rightCol.map(renderGroup)}</div>
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
                                  className="px-2 py-2 border-r border-stone-100 text-center text-xs text-stone-300 align-top"
                                >
                                  —
                                </td>
                              );
                            const items = getItems(plan.date, col.target, target.items);
                            const planKey = makeReviewKey(plan.date, plan.cycleType);
                            const discKey = `${plan.date}-${plan.cycleType}-${col.target}`;
                            const dInfo = discountSummary.get(discKey);
                            return (
                              <td key={colIdx} className="px-2 py-1.5 border-r border-stone-100 align-top">
                                {dInfo &&
                                  (() => {
                                    const priceDiff = dInfo.sumRecPrice - dInfo.targetPrice;
                                    const costRatio =
                                      dInfo.targetPrice > 0
                                        ? Math.round((dInfo.totalCost / dInfo.targetPrice) * 100)
                                        : 0;
                                    const isOverCostRatio =
                                      dInfo.targetCostRatio > 0 && costRatio > dInfo.targetCostRatio;
                                    if (priceDiff === 0 && !dInfo.totalCost) return null;
                                    return (
                                      <div className="mb-1 px-1 py-0.5 rounded text-[9px] space-y-0.5">
                                        {priceDiff !== 0 && (
                                          <div className={`${priceDiff > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                            <span className="text-stone-500">
                                              판매가 {dInfo.sumRecPrice.toLocaleString()}원
                                            </span>{' '}
                                            <span className="font-bold tabular-nums">
                                              ({Math.abs(priceDiff).toLocaleString()}원{' '}
                                              {priceDiff > 0 ? '초과' : '미달'})
                                            </span>
                                          </div>
                                        )}
                                        {dInfo.totalCost > 0 && (
                                          <div className={isOverCostRatio ? 'text-red-500' : 'text-stone-500'}>
                                            원가 {dInfo.totalCost.toLocaleString()}원{' '}
                                            <span
                                              className={`font-bold tabular-nums ${isOverCostRatio ? 'text-red-600' : 'text-emerald-600'}`}
                                            >
                                              ({costRatio}%
                                              {dInfo.targetCostRatio > 0 ? `/${dInfo.targetCostRatio}%` : ''})
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                <HistoryTableCell
                                  items={items}
                                  date={plan.date}
                                  targetType={col.target}
                                  editedKeys={editedKeys}
                                  originalNames={originalNameMap}
                                  commentCounts={commentCounts}
                                  allComments={commentCache[planKey] || []}
                                  highlightedIngredient={highlightedIngredient}
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
                                className="px-2 py-2 border-r border-stone-100 text-center text-xs text-stone-300 align-top"
                              >
                                —
                              </td>
                            );
                          const baseItems = baseData ? getItems(plan.date, col.group.baseTarget, baseData.items) : [];
                          const plusItems = plusData ? getItems(plan.date, col.group.plusTarget, plusData.items) : [];
                          const mergedPlanKey = makeReviewKey(plan.date, plan.cycleType);
                          const baseDiscKey = `${plan.date}-${plan.cycleType}-${col.group.baseTarget}`;
                          const baseDInfo = discountSummary.get(baseDiscKey);
                          const plusDiscKey = `${plan.date}-${plan.cycleType}-${col.group.plusTarget}`;
                          const plusDInfo = discountSummary.get(plusDiscKey);
                          return (
                            <td key={colIdx} className="px-2 py-1.5 border-r border-stone-100 align-top">
                              {(() => {
                                const renderDiscBadge = (dI: typeof baseDInfo, label?: string) => {
                                  if (!dI) return null;
                                  const pDiff = dI.sumRecPrice - dI.targetPrice;
                                  const costRatio =
                                    dI.targetPrice > 0 ? Math.round((dI.totalCost / dI.targetPrice) * 100) : 0;
                                  const isOverCostRatio = dI.targetCostRatio > 0 && costRatio > dI.targetCostRatio;
                                  if (pDiff === 0 && !dI.totalCost) return null;
                                  return (
                                    <div className="px-1 py-0.5 rounded text-[9px] space-y-0.5">
                                      {label && <span className="text-stone-400 text-[8px]">{label} </span>}
                                      {pDiff !== 0 && (
                                        <div className={`${pDiff > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                          <span className="text-stone-500">
                                            판매가 {dI.sumRecPrice.toLocaleString()}원
                                          </span>{' '}
                                          <span className="font-bold tabular-nums">
                                            ({Math.abs(pDiff).toLocaleString()}원 {pDiff > 0 ? '초과' : '미달'})
                                          </span>
                                        </div>
                                      )}
                                      {dI.totalCost > 0 && (
                                        <div className={isOverCostRatio ? 'text-red-500' : 'text-stone-500'}>
                                          원가 {dI.totalCost.toLocaleString()}원{' '}
                                          <span
                                            className={`font-bold tabular-nums ${isOverCostRatio ? 'text-red-600' : 'text-emerald-600'}`}
                                          >
                                            ({costRatio}%{dI.targetCostRatio > 0 ? `/${dI.targetCostRatio}%` : ''})
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                };
                                const baseEl = renderDiscBadge(baseDInfo);
                                const plusEl = renderDiscBadge(plusDInfo, col.group.plusBadge);
                                if (!baseEl && !plusEl) return null;
                                return (
                                  <div className="mb-1 space-y-0.5">
                                    {baseEl}
                                    {plusEl}
                                  </div>
                                );
                              })()}
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
                                highlightedIngredient={highlightedIngredient}
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
          onDelete={commentId => {
            deleteComment(commentTarget.planKey, commentId);
            loadCommentsForPlan(commentTarget.planKey);
          }}
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

      {/* 삭제 확인 다이얼로그 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-base font-bold text-stone-800">히스토리 삭제</h3>
            </div>
            <p className="text-sm text-stone-600 mb-4">
              {deleteConfirm.type === 'month'
                ? `${viewYear}년 ${viewMonth + 1}월 전체 히스토리(${allMonthPlans.length}건)를 삭제하시겠습니까?`
                : `${deleteConfirm.date} (${deleteConfirm.cycleType}) 식단을 삭제하시겠습니까?`}
            </p>
            <p className="text-xs text-red-500 mb-4">삭제된 데이터는 복구할 수 없습니다.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>
                취소
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (deleteConfirm.type === 'month') {
                    handleDeleteMonth();
                  } else if (deleteConfirm.cycleType) {
                    handleDeleteSingle(deleteConfirm.date, deleteConfirm.cycleType);
                  }
                }}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                삭제
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealPlanHistory;
