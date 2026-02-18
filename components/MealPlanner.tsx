import React, { useState, useMemo, useCallback } from 'react';
import { TargetType, MonthlyMealPlan, MenuItem, MenuCategory, ExpertReview } from '../types';
import type { ReviewComment } from '../types';
import { generateMonthlyMealPlan, getSwapCandidates } from '../services/engine';
import { getExpertReview } from '../services/geminiService';
import {
  Sparkles,
  RefreshCw,
  BrainCircuit,
  X,
  LayoutGrid,
  AlertTriangle,
  ArrowRightLeft,
  Flame,
  Layers,
  Database,
  Server,
  Check,
  History,
  Printer,
  Download,
  FileText,
  MessageSquare,
  Replace,
  Eye,
  Send,
  Reply,
  CheckCircle,
  Shield,
  Beaker,
  Factory,
  Table,
} from 'lucide-react';
import { MAJOR_INGREDIENTS, TARGET_CONFIGS } from '../constants';
import { useMenu } from '../context/MenuContext';
import { useToast } from '../context/ToastContext';
import { registerToMIS } from '../services/misService';
import { syncChangesToZPPS, type MenuChange } from '../services/zppsService';
import { addAuditEntry } from '../services/auditService';
import { useAuth } from '../context/AuthContext';
import { loadHistory, saveVersion, type PlanVersion } from '../services/historyService';
import PlanHistory from './PlanHistory';
import PlanDiffView from './PlanDiffView';
import PlanReviewPanel from './PlanReviewPanel';
import { printMealPlan, exportToCSV, exportToPDF } from '../services/exportService';
import { pushMealPlan } from '../services/syncManager';
import {
  addReviewComment,
  getReviewComments,
  getReview,
  requestReview,
  resolveComment,
  DEPARTMENT_LABELS,
} from '../services/reviewService';
import type { PlanReviewRecord, ReviewDepartment } from '../types';

// History & Diff types

const MealPlanner: React.FC = () => {
  const { menuItems } = useMenu();
  const { addToast, confirm } = useToast();
  const { user } = useAuth();
  const [target, setTarget] = useState<TargetType>(TargetType.KIDS);
  const [monthLabel, setMonthLabel] = useState<string>('3월');
  const [checkDupes, setCheckDupes] = useState<boolean>(true);

  // Dual Plans for Cycle A (Tue-Thu) and Cycle B (Fri-Mon)
  const [plans, setPlans] = useState<{ A: MonthlyMealPlan | null; B: MonthlyMealPlan | null }>({ A: null, B: null });
  const [isGenerating, setIsGenerating] = useState(false);

  // Expert Review State
  const [reviewResult, setReviewResult] = useState<ExpertReview | null>(null);
  const [, setIsReviewing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Swap Modal State
  const [swapTarget, setSwapTarget] = useState<{ cycle: 'A' | 'B'; weekIndex: number; item: MenuItem } | null>(null);
  const [swapCandidates, setSwapCandidates] = useState<MenuItem[]>([]);

  // Sync Status State
  const [misSyncStatus, setMisSyncStatus] = useState<'idle' | 'syncing' | 'done'>('idle');
  const [zppsSyncStatus, setZppsSyncStatus] = useState<'idle' | 'syncing' | 'done'>('idle');
  const [unsavedChangesCount, setUnsavedChangesCount] = useState(0);

  // History & Diff State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDiffView, setShowDiffView] = useState(false);
  const [diffBeforePlan, setDiffBeforePlan] = useState<MonthlyMealPlan | null>(null);

  // Action Chooser State (메뉴 클릭 시 대체메뉴/코멘트 선택)
  const [menuActionTarget, setMenuActionTarget] = useState<{
    cycle: 'A' | 'B';
    weekIndex: number;
    item: MenuItem;
  } | null>(null);

  // Comment Form State
  const [commentTarget, setCommentTarget] = useState<{
    cycle: 'A' | 'B';
    weekIndex: number;
    item: MenuItem;
  } | null>(null);
  const [commentText, setCommentText] = useState('');

  // Inline Comments State (loaded per plan)
  const [planComments, setPlanComments] = useState<ReviewComment[]>([]);
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // View Mode: 'card' (default) or 'grid' (table review)
  const [viewMode, setViewMode] = useState<'card' | 'grid'>('card');

  // Review status (top bar)
  const [reviewRecord, setReviewRecord] = useState<PlanReviewRecord | null>(null);

  const handleGenerate = () => {
    setIsGenerating(true);
    setReviewResult(null);
    setPlans({ A: null, B: null });
    setMisSyncStatus('idle');
    setZppsSyncStatus('idle');
    setUnsavedChangesCount(0);

    setTimeout(() => {
      const activeMenu = menuItems.filter(item => !item.isUnused);
      const planA = generateMonthlyMealPlan(target, monthLabel, '화수목', checkDupes, activeMenu);
      const planB = generateMonthlyMealPlan(target, monthLabel, '금토월', checkDupes, activeMenu);
      setPlans({ A: planA, B: planB });
      setIsGenerating(false);
      setPlanComments(getReviewComments(planA.id));
      setReviewRecord(getReview(planA.id));
      addAuditEntry({
        action: 'plan.generate',
        userId: user?.id || '',
        userName: user?.displayName || '',
        entityType: 'meal_plan',
        entityId: planA.id,
        entityName: `${monthLabel} ${target}`,
      });
    }, 800);
  };

  const handleOpenHistory = () => {
    setShowHistoryModal(true);
  };

  const handleRestoreVersion = (version: PlanVersion) => {
    setPlans({ A: version.planA, B: version.planB });
    setTarget(version.target as TargetType);
    setShowHistoryModal(false);
  };

  const handleSaveVersion = () => {
    if (!plans.A || !plans.B) return;
    saveVersion({
      planId: plans.A.id,
      label: `${monthLabel} ${target}`,
      target: target,
      status: 'draft',
      planA: plans.A,
      planB: plans.B,
    });
    addToast({ type: 'success', title: '식단 저장 완료', message: '현재 식단이 히스토리에 저장되었습니다.' });
    addAuditEntry({
      action: 'plan.save',
      userId: user?.id || '',
      userName: user?.displayName || '',
      entityType: 'meal_plan',
      entityId: plans.A.id,
      entityName: `${monthLabel} ${target}`,
    });
  };

  const handleDiffWithPrevious = () => {
    if (!plans.A) return;
    const versions = loadHistory();
    if (versions.length === 0) {
      addToast({ type: 'warning', title: '비교 대상 없음', message: '저장된 이전 버전이 없습니다.' });
      return;
    }
    setDiffBeforePlan(versions[0].planA);
    setShowDiffView(true);
  };

  const handleExpertReview = async (plan: MonthlyMealPlan) => {
    setIsReviewing(true);
    const review = await getExpertReview(plan);
    setReviewResult(review);
    setIsReviewing(false);
    setShowReviewModal(true);
  };

  // 메뉴 클릭 시 액션 선택 모달 열기
  const handleMenuItemClick = (cycle: 'A' | 'B', weekIndex: number, item: MenuItem) => {
    setMenuActionTarget({ cycle, weekIndex, item });
  };

  // 대체메뉴 선정 선택
  const openSwapFromAction = () => {
    if (!menuActionTarget) return;
    const { cycle, weekIndex, item } = menuActionTarget;
    const plan = plans[cycle];
    if (!plan) return;
    const activeMenu = menuItems.filter(m => !m.isUnused);
    const candidates = getSwapCandidates(plan, item, weekIndex, activeMenu);
    setSwapTarget({ cycle, weekIndex, item });
    setSwapCandidates(candidates);
    setMenuActionTarget(null);
  };

  // 식단 코멘트 선택
  const openCommentFromAction = () => {
    if (!menuActionTarget) return;
    setCommentTarget(menuActionTarget);
    setCommentText('');
    setMenuActionTarget(null);
  };

  // 코멘트 등록
  const handleSubmitComment = () => {
    if (!commentTarget || !commentText.trim() || !plans.A) return;
    const cycleLabel = commentTarget.cycle === 'A' ? '화수목' : '금토월';
    const scopeKey = `${cycleLabel}-${commentTarget.weekIndex}-${commentTarget.item.name}`;
    addReviewComment(plans.A.id, {
      department: 'quality',
      reviewer: user?.displayName || '사용자',
      scope: 'item',
      scopeKey,
      comment: commentText,
      status: 'comment',
    });
    addToast({
      type: 'success',
      title: '코멘트 등록',
      message: `${commentTarget.item.name}에 코멘트가 추가되었습니다.`,
    });
    setCommentTarget(null);
    setCommentText('');
    // Refresh comments
    if (plans.A) setPlanComments(getReviewComments(plans.A.id));
  };

  // 쓰레드 답글 등록
  const handleSubmitReply = useCallback(() => {
    if (!replyTarget || !replyText.trim() || !plans.A) return;
    const parentComment = planComments.find(c => c.id === replyTarget);
    if (!parentComment) return;
    addReviewComment(plans.A.id, {
      parentId: replyTarget,
      department: parentComment.department,
      reviewer: user?.displayName || '사용자',
      scope: parentComment.scope,
      scopeKey: parentComment.scopeKey,
      comment: replyText,
      status: 'comment',
    });
    setReplyTarget(null);
    setReplyText('');
    setPlanComments(getReviewComments(plans.A.id));
  }, [replyTarget, replyText, plans.A, planComments, user]);

  // 코멘트 해결 처리
  const handleResolveComment = useCallback(
    (commentId: string) => {
      if (!plans.A) return;
      resolveComment(plans.A.id, commentId);
      setPlanComments(getReviewComments(plans.A.id));
    },
    [plans.A]
  );

  // Load comments when plan changes
  const refreshComments = useCallback(() => {
    if (plans.A) {
      setPlanComments(getReviewComments(plans.A.id));
      setReviewRecord(getReview(plans.A.id));
    }
  }, [plans.A]);

  // Memo: comments grouped by scopeKey for inline display
  const commentsByScope = useMemo(() => {
    const map: Record<string, ReviewComment[]> = {};
    for (const c of planComments) {
      if (!c.parentId) {
        if (!map[c.scopeKey]) map[c.scopeKey] = [];
        map[c.scopeKey].push(c);
      }
    }
    return map;
  }, [planComments]);

  // Memo: replies grouped by parentId
  const repliesByParent = useMemo(() => {
    const map: Record<string, ReviewComment[]> = {};
    for (const c of planComments) {
      if (c.parentId) {
        if (!map[c.parentId]) map[c.parentId] = [];
        map[c.parentId].push(c);
      }
    }
    return map;
  }, [planComments]);

  // 검토 요청
  const handleRequestReviewFromPlanner = useCallback(() => {
    if (!plans.A) return;
    const result = requestReview(plans.A.id, user?.displayName || '사용자');
    setReviewRecord(result);
    addToast({ type: 'success', title: '검토 요청 완료', message: '3개 부서에 검토 요청이 전송되었습니다.' });
  }, [plans.A, user, addToast]);

  const performSwap = (newItem: MenuItem) => {
    if (!swapTarget) return;
    const { cycle } = swapTarget;
    const currentPlan = plans[cycle];

    if (currentPlan) {
      const updatedWeeks = currentPlan.weeks.map(week => {
        if (week.weekIndex === swapTarget.weekIndex) {
          const newItems = week.items.map(i => (i.id === swapTarget.item.id ? newItem : i));
          const newCost = newItems.reduce((acc, i) => acc + i.cost, 0);
          const newPrice = newItems.reduce((acc, i) => acc + i.recommendedPrice, 0);
          return { ...week, items: newItems, totalCost: newCost, totalPrice: newPrice };
        }
        return week;
      });
      setPlans(prev => ({ ...prev, [cycle]: { ...currentPlan, weeks: updatedWeeks } }));
      setUnsavedChangesCount(prev => prev + 1);
      setZppsSyncStatus('idle');

      // Track change for ZPPS
      const slotIndex =
        currentPlan.weeks
          .find(w => w.weekIndex === swapTarget.weekIndex)
          ?.items.findIndex(i => i.id === swapTarget.item.id) ?? 0;
      setSwapChanges(prev => [
        ...prev,
        {
          planId: currentPlan.id,
          weekIndex: swapTarget.weekIndex,
          slotIndex,
          previousItemId: swapTarget.item.id,
          previousItemName: swapTarget.item.name,
          newItemId: newItem.id,
          newItemName: newItem.name,
          reason: 'manual_swap',
        },
      ]);

      addAuditEntry({
        action: 'swap.execute',
        userId: user?.id || '',
        userName: user?.displayName || '',
        entityType: 'menu_item',
        entityId: newItem.id,
        entityName: `${swapTarget.item.name} → ${newItem.name}`,
        before: { item: swapTarget.item.name, cost: swapTarget.item.cost },
        after: { item: newItem.name, cost: newItem.cost },
      });
    }
    setSwapTarget(null);
  };

  const handleRegisterToMIS = async () => {
    if (!plans.A || !plans.B) return;

    const confirmOverwrite = await confirm({
      title: 'MIS 시스템 등록',
      message: `${monthLabel} ${target} 식단(화수목+금토월)을 MIS에 등록하시겠습니까?`,
      confirmLabel: '등록',
      variant: 'warning',
    });
    if (!confirmOverwrite) return;

    setMisSyncStatus('syncing');
    const misUrl = localStorage.getItem('zsub_mis_url') || '/api/mis/meal-plans';

    try {
      const resultA = await registerToMIS(plans.A, misUrl);
      const resultB = await registerToMIS(plans.B, misUrl);

      if (resultA.success && resultB.success) {
        addToast({
          type: 'success',
          title: 'MIS 등록 완료',
          message: `${monthLabel} 식단 정보가 MIS에 성공적으로 등록되었습니다.`,
        });
        setMisSyncStatus('done');
        setUnsavedChangesCount(0);
        addAuditEntry({
          action: 'sync.mis',
          userId: user?.id || '',
          userName: user?.displayName || '',
          entityType: 'meal_plan',
          entityId: plans.A.id,
          entityName: `${monthLabel} ${target}`,
        });
      } else {
        const errMsg = resultA.error || resultB.error || 'MIS 등록 실패';
        addToast({ type: 'error', title: 'MIS 등록 실패', message: errMsg });
        setMisSyncStatus('idle');
      }
    } catch {
      addToast({ type: 'error', title: 'MIS 연결 실패', message: 'MIS 서버에 연결할 수 없습니다.' });
      setMisSyncStatus('idle');
    }
  };

  // Track swap changes for ZPPS sync
  const [swapChanges, setSwapChanges] = useState<MenuChange[]>([]);

  const handleSyncToZPPS = async () => {
    if (unsavedChangesCount === 0 || swapChanges.length === 0) return;

    const confirmSync = await confirm({
      title: 'ZPPS 생산 연동',
      message: `총 ${unsavedChangesCount}건의 메뉴 변경사항이 감지되었습니다.\n생산 시스템(ZPPS)에 변경 내역을 반영하시겠습니까?`,
      confirmLabel: '연동 실행',
      variant: 'warning',
    });
    if (!confirmSync) return;

    setZppsSyncStatus('syncing');
    const zppsUrl = localStorage.getItem('zsub_zpps_url') || '/api/zpps/menu-changes';

    try {
      const result = await syncChangesToZPPS(swapChanges, zppsUrl);
      if (result.success) {
        addToast({
          type: 'success',
          title: 'ZPPS 연동 완료',
          message: `${result.processedCount}건의 변경 정보가 ZPPS로 전송되었습니다.`,
        });
        setZppsSyncStatus('done');
        setUnsavedChangesCount(0);
        setSwapChanges([]);
        addAuditEntry({
          action: 'sync.zpps',
          userId: user?.id || '',
          userName: user?.displayName || '',
          entityType: 'menu_change',
          entityId: plans.A?.id || '',
          entityName: `ZPPS ${result.processedCount}건 동기화`,
        });
      } else {
        addToast({ type: 'error', title: 'ZPPS 연동 실패', message: result.error || 'ZPPS 연동 실패' });
        setZppsSyncStatus('idle');
      }
    } catch {
      addToast({ type: 'error', title: 'ZPPS 연결 실패', message: 'ZPPS 서버에 연결할 수 없습니다.' });
      setZppsSyncStatus('idle');
    }
  };

  // 채소를 제외한 주요 식재료 목록
  const trackedIngredients = useMemo(() => MAJOR_INGREDIENTS.filter(ing => ing.key !== 'vegetable'), []);

  // Helper: Per-week Ingredient Counts
  const ingredientCountsByWeek = useMemo(() => {
    if (!plans.A || !plans.B) return null;
    const result: Record<string, Record<string, number>> = {};
    const total: Record<string, number> = {};
    trackedIngredients.forEach(ing => (total[ing.key] = 0));

    const processPlan = (plan: MonthlyMealPlan, label: string) => {
      plan.weeks.forEach(week => {
        const key = `${label}-${week.weekIndex}`;
        const counts: Record<string, number> = {};
        trackedIngredients.forEach(ing => (counts[ing.key] = 0));
        week.items.forEach(item => {
          const ingKey = item.mainIngredient;
          if (counts[ingKey] !== undefined) {
            counts[ingKey]++;
            total[ingKey]++;
          }
        });
        result[key] = counts;
      });
    };

    processPlan(plans.A, 'A');
    processPlan(plans.B, 'B');
    result['total'] = total;
    return result;
  }, [plans.A, plans.B, trackedIngredients]);
  const currentBudgetCap = TARGET_CONFIGS[target].budgetCap;
  const targetPrice = TARGET_CONFIGS[target].targetPrice;

  // Compute parent composition item count for "extra" menu detection
  const currentConfig = TARGET_CONFIGS[target];
  const parentConfig = currentConfig?.parentTarget ? TARGET_CONFIGS[currentConfig.parentTarget] : null;
  const parentItemCount = parentConfig
    ? Object.values(parentConfig.composition).reduce((sum, n) => sum + (n || 0), 0)
    : null;

  // 검토 완료 여부 확인 (finalized)
  const isFinalized = reviewRecord?.status === 'finalized';

  // Render a Single Cycle Row
  const renderCycleRow = (cycleLabel: string, plan: MonthlyMealPlan, cycleKey: 'A' | 'B') => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
      <div className="bg-gray-50 border-b border-gray-200 p-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded text-xs font-bold ${cycleKey === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}
          >
            {cycleLabel}
          </span>
          <span className="text-sm font-medium text-gray-500">{monthLabel} 식단표</span>
          {parentConfig && (
            <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              옵션 ({currentConfig.parentTarget} 기반)
            </span>
          )}
        </div>
        <button
          onClick={() => handleExpertReview(plan)}
          className="text-xs flex items-center gap-1 text-gray-600 hover:text-purple-600 font-bold bg-white border border-gray-300 px-2 py-1 rounded shadow-sm"
        >
          <BrainCircuit className="w-3 h-3" /> AI 검수
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
        {plan.weeks.map(week => {
          const costRatio = ((week.totalCost / targetPrice) * 100).toFixed(1);
          const isOverBudget = week.totalCost > currentBudgetCap;

          return (
            <div
              key={week.weekIndex}
              className={`p-3 flex flex-col group h-full relative ${isFinalized ? 'select-none' : ''}`}
            >
              {/* 검토완료 블러 오버레이 */}
              {isFinalized && (
                <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[2px] flex items-center justify-center rounded">
                  <span className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> 검토완료
                  </span>
                </div>
              )}
              <div className="flex justify-between items-start mb-3">
                <span className="text-sm font-bold text-gray-800">{week.weekIndex}주차</span>
                <div className="text-right">
                  <div className={`text-xs font-bold ${isOverBudget ? 'text-red-600' : 'text-gray-600'}`}>
                    {week.totalCost.toLocaleString()}원
                  </div>
                  <div className="text-[10px] text-gray-400">({costRatio}%)</div>
                </div>
              </div>

              <div className="space-y-1 flex-1">
                {week.items.map((item, itemIdx) => {
                  const isExtra = parentItemCount !== null && itemIdx >= parentItemCount;
                  const scopeKey = `${cycleLabel}-${week.weekIndex}-${item.name}`;
                  const itemComments = commentsByScope[scopeKey] || [];
                  const hasComments = itemComments.length > 0;
                  const unresolvedCount = itemComments.filter(c => c.status !== 'resolved').length;

                  return (
                    <div key={item.id}>
                      <div
                        onClick={() => handleMenuItemClick(cycleKey, week.weekIndex, item)}
                        className={`flex items-center gap-2 text-xs p-2 rounded hover:bg-gray-50 cursor-pointer transition-all ${
                          isExtra
                            ? 'border border-amber-300 bg-amber-50/50'
                            : hasComments
                              ? 'border border-blue-200 bg-blue-50/30'
                              : 'border border-transparent hover:border-gray-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            item.category === MenuCategory.SOUP
                              ? 'bg-blue-500'
                              : item.category === MenuCategory.MAIN
                                ? 'bg-orange-500'
                                : 'bg-green-500'
                          }`}
                        ></span>
                        <span className="font-medium text-gray-700 truncate flex-1">{item.name}</span>
                        {isExtra && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 rounded border border-amber-200 flex-shrink-0">
                            추가
                          </span>
                        )}
                        {item.isSpicy && <Flame className="w-3 h-3 text-red-400" />}
                        {hasComments && (
                          <span className="flex items-center gap-0.5 text-[10px] text-blue-600 flex-shrink-0">
                            <MessageSquare className="w-3 h-3" />
                            {unresolvedCount > 0 && unresolvedCount}
                          </span>
                        )}
                      </div>

                      {/* Inline Comments Thread */}
                      {hasComments && (
                        <div className="ml-5 mt-1 mb-2 space-y-1">
                          {itemComments.map(comment => (
                            <div
                              key={comment.id}
                              className="text-[11px] rounded border border-gray-100 bg-gray-50/80 p-1.5"
                            >
                              <div className="flex items-center gap-1 mb-0.5">
                                <span className="font-medium text-gray-600">{comment.reviewer}</span>
                                <span className="text-gray-300">·</span>
                                <span className="text-gray-400">{DEPARTMENT_LABELS[comment.department]}</span>
                                {comment.status === 'resolved' && (
                                  <span className="px-1 py-0 rounded text-[9px] font-bold bg-green-100 text-green-600">
                                    해결
                                  </span>
                                )}
                                {comment.status !== 'resolved' && (
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleResolveComment(comment.id);
                                    }}
                                    className="ml-auto text-[9px] text-green-600 hover:underline"
                                  >
                                    해결
                                  </button>
                                )}
                              </div>
                              <p className="text-gray-700">{comment.comment}</p>

                              {/* Replies */}
                              {(repliesByParent[comment.id] || []).map(reply => (
                                <div key={reply.id} className="ml-3 mt-1 pl-2 border-l-2 border-blue-200 text-[10px]">
                                  <span className="font-medium text-gray-600">{reply.reviewer}</span>
                                  <span className="text-gray-300 mx-1">·</span>
                                  <span className="text-gray-500">{reply.comment}</span>
                                </div>
                              ))}

                              {/* Reply input */}
                              {replyTarget === comment.id ? (
                                <div className="mt-1 flex gap-1">
                                  <input
                                    type="text"
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    placeholder="답글 입력..."
                                    className="flex-1 text-[10px] border border-gray-200 rounded px-2 py-1"
                                    onClick={e => e.stopPropagation()}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.stopPropagation();
                                        handleSubmitReply();
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleSubmitReply();
                                    }}
                                    className="px-2 py-1 text-[10px] font-bold text-white bg-blue-500 rounded hover:bg-blue-600"
                                  >
                                    <Send className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    setReplyTarget(comment.id);
                                    setReplyText('');
                                  }}
                                  className="mt-0.5 text-[10px] text-blue-500 hover:underline flex items-center gap-0.5"
                                >
                                  <Reply className="w-2.5 h-2.5" /> 답글
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const IngredientCell: React.FC<{ count: number; isTotal?: boolean }> = ({ count, isTotal }) => {
    if (count === 0) return <span className="text-gray-300">-</span>;
    let colorClass = 'bg-green-100 text-green-700';
    if (count >= 4) colorClass = 'bg-red-100 text-red-700 font-bold';
    else if (count >= 2) colorClass = 'bg-orange-100 text-orange-700 font-bold';
    return (
      <span
        className={`inline-flex items-center justify-center w-6 h-6 rounded text-[11px] ${isTotal ? 'font-bold' : ''} ${colorClass}`}
      >
        {count}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full gap-6 relative">
      {/* 1. Control Bar & Sync Center */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
        {/* Top Row: Generation Controls */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col">
              <label className="text-xs font-bold text-gray-500 mb-1">식단 대상</label>
              <select
                value={target}
                onChange={e => setTarget(e.target.value as TargetType)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-48 p-2.5"
              >
                {Object.values(TargetType).map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-bold text-gray-500 mb-1">월 설정</label>
              <select
                value={monthLabel}
                onChange={e => setMonthLabel(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-24 p-2.5"
              >
                {[3, 4, 5, 6].map(m => (
                  <option key={m} value={`${m}월`}>
                    {m}월
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center h-full pt-6 ml-2">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkDupes}
                  onChange={e => setCheckDupes(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                <span className="ms-2 text-sm font-medium text-gray-600">60일 중복 제외</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenHistory}
              className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl font-bold shadow-sm transition-all"
            >
              <History className="w-5 h-5 text-gray-500" />
              히스토리
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 ${isGenerating ? 'opacity-75 cursor-wait' : ''}`}
            >
              {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {isGenerating ? '식단 생성 중...' : '통합 식단(화수목/금토월) 자동 생성'}
            </button>
          </div>
        </div>

        {/* Bottom Row: Integration Actions (Visible only when plans exist) */}
        {plans.A && (
          <div className="border-t border-gray-100 pt-3 flex justify-end items-center gap-3">
            <div className="text-xs text-gray-400 mr-2 flex items-center gap-1">
              <Server className="w-3 h-3" /> 시스템 연동 센터
            </div>

            {/* MIS Button */}
            <button
              onClick={handleRegisterToMIS}
              disabled={misSyncStatus === 'syncing' || misSyncStatus === 'done'}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border transition-all ${
                misSyncStatus === 'done'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {misSyncStatus === 'syncing' ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : misSyncStatus === 'done' ? (
                <Check className="w-3 h-3" />
              ) : (
                <Database className="w-3 h-3" />
              )}
              {misSyncStatus === 'done' ? 'MIS 등록 완료' : '식단 정보 MIS 등록'}
            </button>

            {/* ZPPS Button */}
            <button
              onClick={handleSyncToZPPS}
              disabled={unsavedChangesCount === 0 || zppsSyncStatus === 'syncing'}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border transition-all ${
                unsavedChangesCount > 0
                  ? 'bg-orange-50 text-orange-700 border-orange-200 animate-pulse hover:bg-orange-100'
                  : 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
              }`}
            >
              {zppsSyncStatus === 'syncing' ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <ArrowRightLeft className="w-3 h-3" />
              )}
              ZPPS 변경 연동 {unsavedChangesCount > 0 && `(${unsavedChangesCount}건)`}
            </button>

            <div className="w-px h-6 bg-gray-200 mx-1" />

            {/* Save */}
            <button
              onClick={handleSaveVersion}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-3 h-3" /> 저장
            </button>
            {/* Diff */}
            <button
              onClick={handleDiffWithPrevious}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              비교
            </button>
            {/* Print */}
            <button
              onClick={() => plans.A && printMealPlan(plans.A)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Printer className="w-3 h-3" /> 인쇄
            </button>
            {/* PDF Export */}
            <button
              onClick={() => plans.A && exportToPDF(plans.A)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <FileText className="w-3 h-3" /> PDF
            </button>
            {/* CSV Export */}
            <button
              onClick={() => plans.A && exportToCSV(plans.A)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              CSV
            </button>
          </div>
        )}
      </div>

      {/* 2. Main Workspace */}
      {!plans.A ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-gray-200 border-dashed p-10 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <Layers className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">통합 식단 생성 (이중 주기)</h3>
          <p className="text-gray-500 max-w-md">
            화수목 및 금토월 식단을 동시에 생성하고,
            <br />두 식단 간의 식재료 중복을 체크하여 다양성을 확보합니다.
          </p>
        </div>
      ) : (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto pb-6">
            {/* Review Status Bar (상단 검토현황) */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h4 className="text-sm font-bold text-gray-800">검토현황</h4>
                  {reviewRecord ? (
                    <>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          reviewRecord.status === 'finalized'
                            ? 'bg-green-100 text-green-700'
                            : reviewRecord.status === 'approved'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {reviewRecord.status === 'draft'
                          ? '초안'
                          : reviewRecord.status === 'review_requested'
                            ? '검토 중'
                            : reviewRecord.status === 'approved'
                              ? '승인 완료'
                              : '최종 등록'}
                      </span>
                      <div className="flex items-center gap-2">
                        {reviewRecord.departments.map(dept => {
                          const DeptIcon =
                            dept.department === 'quality'
                              ? Shield
                              : dept.department === 'development'
                                ? Beaker
                                : Factory;
                          return (
                            <div
                              key={dept.department}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                                dept.status === 'approved'
                                  ? 'bg-green-50 text-green-700 border border-green-200'
                                  : dept.status === 'rejected'
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-gray-50 text-gray-500 border border-gray-200'
                              }`}
                            >
                              <DeptIcon className="w-3 h-3" />
                              {DEPARTMENT_LABELS[dept.department]}
                              {dept.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                            </div>
                          );
                        })}
                      </div>
                      {planComments.filter(c => !c.parentId && c.status !== 'resolved').length > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">
                          <MessageSquare className="w-3 h-3" />
                          미해결 {planComments.filter(c => !c.parentId && c.status !== 'resolved').length}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">검토 요청 전</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setViewMode('card')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                        viewMode === 'card' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5 inline mr-1" />
                      카드
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                        viewMode === 'grid' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Table className="w-3.5 h-3.5 inline mr-1" />
                      그리드
                    </button>
                  </div>
                  {!reviewRecord && (
                    <button
                      onClick={handleRequestReviewFromPlanner}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" /> 검토 요청
                    </button>
                  )}
                </div>
              </div>
            </div>

            {viewMode === 'card' ? (
              <>
                {/* Cycle A Row */}
                {plans.A && renderCycleRow('화수목', plans.A, 'A')}

                {/* Cycle B Row */}
                {plans.B && renderCycleRow('금토월', plans.B, 'B')}
              </>
            ) : (
              /* Grid Review View */
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
                <div className="bg-gray-50 border-b border-gray-200 p-3">
                  <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <Table className="w-4 h-4 text-gray-500" /> 전체 식단 그리드 뷰
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 sticky left-0 bg-gray-50 min-w-[80px]">
                          주기
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">주차</th>
                        {Array.from(
                          {
                            length: Math.max(
                              ...(plans.A?.weeks.map(w => w.items.length) || [0]),
                              ...(plans.B?.weeks.map(w => w.items.length) || [0])
                            ),
                          },
                          (_, i) => (
                            <th
                              key={i}
                              className="px-3 py-2 text-center text-xs font-semibold text-gray-500 min-w-[120px]"
                            >
                              메뉴 {i + 1}
                            </th>
                          )
                        )}
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">원가</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">코멘트</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[
                        ...(plans.A
                          ? plans.A.weeks.map(w => ({ cycle: '화수목' as const, cycleKey: 'A' as const, week: w }))
                          : []),
                        ...(plans.B
                          ? plans.B.weeks.map(w => ({ cycle: '금토월' as const, cycleKey: 'B' as const, week: w }))
                          : []),
                      ].map(({ cycle, cycleKey, week }) => {
                        const weekCommentCount = week.items.reduce((sum, item) => {
                          const key = `${cycle}-${week.weekIndex}-${item.name}`;
                          return sum + (commentsByScope[key]?.filter(c => c.status !== 'resolved').length || 0);
                        }, 0);
                        return (
                          <tr
                            key={`${cycleKey}-${week.weekIndex}`}
                            className={`hover:bg-gray-50/50 ${isFinalized ? 'opacity-50' : ''}`}
                          >
                            <td
                              className={`px-3 py-2 text-xs font-bold sticky left-0 bg-white ${cycleKey === 'A' ? 'text-blue-700' : 'text-purple-700'}`}
                            >
                              {cycle}
                            </td>
                            <td className="px-3 py-2 text-center text-xs font-medium text-gray-700">
                              {week.weekIndex}주
                            </td>
                            {week.items.map((item, idx) => {
                              const scopeKey = `${cycle}-${week.weekIndex}-${item.name}`;
                              const hasC = (commentsByScope[scopeKey]?.length || 0) > 0;
                              return (
                                <td
                                  key={idx}
                                  onClick={() => handleMenuItemClick(cycleKey, week.weekIndex, item)}
                                  className={`px-2 py-2 text-xs cursor-pointer hover:bg-blue-50 transition-colors ${hasC ? 'bg-blue-50/50' : ''}`}
                                >
                                  <div className="flex items-center gap-1">
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                        item.category === MenuCategory.SOUP
                                          ? 'bg-blue-500'
                                          : item.category === MenuCategory.MAIN
                                            ? 'bg-orange-500'
                                            : 'bg-green-500'
                                      }`}
                                    />
                                    <span className="truncate">{item.name}</span>
                                    {hasC && <MessageSquare className="w-2.5 h-2.5 text-blue-500 flex-shrink-0" />}
                                  </div>
                                  <div className="text-[10px] text-gray-400 mt-0.5">{item.cost.toLocaleString()}원</div>
                                </td>
                              );
                            })}
                            <td className="px-3 py-2 text-center text-xs font-bold text-gray-700">
                              {week.totalCost.toLocaleString()}원
                            </td>
                            <td className="px-3 py-2 text-center">
                              {weekCommentCount > 0 ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                                  <MessageSquare className="w-2.5 h-2.5" /> {weekCommentCount}
                                </span>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Ingredient Matrix - Per Week Table */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-gray-500" />
                  주차별 식재료 활용 분포
                </h4>
                <div className="flex gap-2 text-[10px] font-medium text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-100 border border-green-300"></span>1회
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-100 border border-orange-300"></span>2~3회
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-100 border border-red-300"></span>4회+
                  </span>
                </div>
              </div>

              {ingredientCountsByWeek && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-2 py-2 text-left font-semibold text-gray-600 sticky left-0 bg-white min-w-[60px]">
                          재료
                        </th>
                        {[1, 2, 3, 4].map(w => (
                          <th key={`A-${w}`} className="px-2 py-2 text-center font-semibold text-blue-600 min-w-[48px]">
                            화{w}주
                          </th>
                        ))}
                        <th className="px-1 py-2 w-px bg-gray-200"></th>
                        {[1, 2, 3, 4].map(w => (
                          <th
                            key={`B-${w}`}
                            className="px-2 py-2 text-center font-semibold text-purple-600 min-w-[48px]"
                          >
                            금{w}주
                          </th>
                        ))}
                        <th className="px-1 py-2 w-px bg-gray-200"></th>
                        <th className="px-2 py-2 text-center font-bold text-gray-800 min-w-[48px]">합계</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trackedIngredients.map(ing => {
                        const totalCount = ingredientCountsByWeek['total']?.[ing.key] || 0;
                        return (
                          <tr key={ing.key} className="border-b border-gray-100 hover:bg-gray-50/50">
                            <td className="px-2 py-1.5 font-medium text-gray-700 sticky left-0 bg-white">
                              {ing.label}
                            </td>
                            {[1, 2, 3, 4].map(w => {
                              const count = ingredientCountsByWeek[`A-${w}`]?.[ing.key] || 0;
                              return (
                                <td key={`A-${w}`} className="px-2 py-1.5 text-center">
                                  <IngredientCell count={count} />
                                </td>
                              );
                            })}
                            <td className="px-0 py-1.5 bg-gray-100"></td>
                            {[1, 2, 3, 4].map(w => {
                              const count = ingredientCountsByWeek[`B-${w}`]?.[ing.key] || 0;
                              return (
                                <td key={`B-${w}`} className="px-2 py-1.5 text-center">
                                  <IngredientCell count={count} />
                                </td>
                              );
                            })}
                            <td className="px-0 py-1.5 bg-gray-100"></td>
                            <td className="px-2 py-1.5 text-center">
                              <IngredientCell count={totalCount} isTotal />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2 text-center">
                * 화수목과 금토월을 모두 구독하는 고객을 위해 주차별 재료 분포를 확인하세요.
              </p>
            </div>

            {/* Review Panel (부서별 상세 검토) */}
            {plans.A && (
              <div className="mt-6">
                <PlanReviewPanel
                  planId={plans.A.id}
                  onFinalized={async () => {
                    if (plans.A) await pushMealPlan(plans.A);
                    if (plans.B) await pushMealPlan(plans.B);
                    refreshComments();
                    addToast({
                      type: 'success',
                      title: '시트 동기화 완료',
                      message: '확정된 식단이 시트에 등록되었습니다.',
                    });
                  }}
                  onStatusChange={refreshComments}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- Modals --- */}

      {/* 3. Swap Modal */}
      {swapTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-gray-800">
                  메뉴 교체하기 ({swapTarget.cycle === 'A' ? '화수목' : '금토월'})
                </h3>
                <p className="text-xs text-gray-500">
                  현재 메뉴: <span className="font-bold text-blue-600">{swapTarget.item.name}</span>
                </p>
              </div>
              <button
                onClick={() => setSwapTarget(null)}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-2 overflow-y-auto flex-1 bg-gray-50">
              {swapCandidates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
                  <p>조건에 맞는 교체 가능한 메뉴가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-2 p-2">
                  {swapCandidates.map(candidate => {
                    const costDiff = candidate.cost - swapTarget.item.cost;
                    return (
                      <button
                        key={candidate.id}
                        onClick={() => performSwap(candidate)}
                        className="w-full bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-blue-400 hover:shadow-md hover:ring-1 hover:ring-blue-400 transition-all text-left flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${candidate.category === MenuCategory.MAIN ? 'bg-orange-100' : 'bg-green-100'}`}
                          >
                            {candidate.category === MenuCategory.MAIN ? '🍖' : '🥗'}
                          </div>
                          <div>
                            <div className="font-bold text-gray-800">{candidate.name}</div>
                            <div className="text-xs text-gray-500 flex gap-1 mt-0.5">
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded">{candidate.mainIngredient}</span>
                              {candidate.tags.map(t => (
                                <span key={t} className="bg-gray-100 px-1.5 py-0.5 rounded">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">{candidate.cost.toLocaleString()}원</div>
                          <div className={`text-xs font-medium ${costDiff > 0 ? 'text-red-500' : 'text-green-600'}`}>
                            {costDiff > 0 ? `+${costDiff.toLocaleString()}` : costDiff.toLocaleString()}원
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Expert Review Modal */}
      {showReviewModal && reviewResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-white">
              <h3 className="text-xl font-bold text-purple-900 flex items-center gap-2">
                <BrainCircuit className="w-6 h-6" />
                AI 전문가 검수 리포트
              </h3>
              <button onClick={() => setShowReviewModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-8">
              {/* Score Section */}
              <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className={`${reviewResult.overallScore > 80 ? 'text-green-500' : 'text-yellow-500'}`}
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * reviewResult.overallScore) / 100}
                    />
                  </svg>
                  <span className="absolute text-2xl font-bold text-gray-800">{reviewResult.overallScore}</span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">종합 평가 점수</h4>
                  <p className="text-gray-600 text-sm mt-1">
                    {reviewResult.overallScore > 80
                      ? '아주 훌륭한 식단입니다! 영양과 원가 균형이 잘 잡혀있습니다.'
                      : '몇 가지 개선이 필요합니다. 아래 전문가 의견을 참고하세요.'}
                  </p>
                </div>
              </div>

              {/* Expert Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-green-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-4 text-2xl">
                    🥗
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">영양사 분석</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{reviewResult.nutritionistComment}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-2xl">
                    🏭
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">공정 효율성</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{reviewResult.processExpertComment}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-yellow-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mb-4 text-2xl">
                    💰
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">원가/구매 분석</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{reviewResult.costExpertComment}</p>
                </div>
              </div>

              {/* Warnings */}
              {reviewResult.flaggedItemIds && reviewResult.flaggedItemIds.length > 0 && (
                <div className="bg-red-50 p-5 rounded-xl border border-red-100 flex gap-4">
                  <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-red-800 mb-1">주의가 필요한 메뉴</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {reviewResult.flaggedItemIds.map((id: string, idx: number) => (
                        <span
                          key={idx}
                          className="bg-white border border-red-200 text-red-600 px-2.5 py-1 rounded-md text-xs font-bold"
                        >
                          {id}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. History Modal (PlanHistory component) */}
      {showHistoryModal && (
        <PlanHistory
          planId={plans.A?.id || ''}
          onRestore={handleRestoreVersion}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      {/* 6. Diff View Modal */}
      {showDiffView && diffBeforePlan && plans.A && (
        <PlanDiffView before={diffBeforePlan} after={plans.A} onClose={() => setShowDiffView(false)} />
      )}

      {/* 7. Action Chooser Modal (메뉴 클릭 시) */}
      {menuActionTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setMenuActionTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-gray-800">{menuActionTarget.item.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {menuActionTarget.cycle === 'A' ? '화수목' : '금토월'} {menuActionTarget.weekIndex}주차
                  </p>
                </div>
                <button
                  onClick={() => setMenuActionTarget(null)}
                  className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <button
                onClick={openSwapFromAction}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-left group"
              >
                <div className="w-11 h-11 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                  <Replace className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-bold text-gray-800 text-sm">대체메뉴 선정</div>
                  <div className="text-xs text-gray-500 mt-0.5">다른 메뉴로 교체합니다</div>
                </div>
              </button>
              <button
                onClick={openCommentFromAction}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-amber-400 hover:bg-amber-50/50 transition-all text-left group"
              >
                <div className="w-11 h-11 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-amber-200 transition-colors">
                  <MessageSquare className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="font-bold text-gray-800 text-sm">식단 코멘트</div>
                  <div className="text-xs text-gray-500 mt-0.5">이 메뉴에 의견을 남깁니다</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Comment Modal */}
      {commentTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setCommentTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-gray-800">식단 코멘트</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {commentTarget.cycle === 'A' ? '화수목' : '금토월'} {commentTarget.weekIndex}주차 ·{' '}
                    <span className="font-medium text-gray-700">{commentTarget.item.name}</span>
                  </p>
                </div>
                <button
                  onClick={() => setCommentTarget(null)}
                  className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="이 메뉴에 대한 의견을 입력하세요..."
                className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-none"
                rows={4}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setCommentTarget(null)}
                  className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim()}
                  className="px-4 py-2 text-sm font-bold text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  코멘트 등록
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealPlanner;
