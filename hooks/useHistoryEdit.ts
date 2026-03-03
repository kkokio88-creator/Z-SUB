import { useState, useMemo, useCallback } from 'react';
import type { HistoricalMenuItem, ReviewComment } from '../types';
import type { ToastType } from '../context/ToastContext';
import { makeReviewKey } from '../services/historyReviewService';
import { addReviewComment, resolveComment, resetDepartmentsForReReview } from '../services/reviewService';
import { parseMenuItem } from '../components/history/historyConstants';

interface UseHistoryEditParams {
  viewYear: number;
  viewMonth: number;
  deletePlansByMonth: (yearMonth: string) => number;
  deletePlan: (date: string, cycleType: string) => void;
  addToast: (toast: { type: ToastType; title: string; message: string }) => void;
  commentCache: Record<string, ReviewComment[]>;
  user: { displayName?: string } | null;
  refreshReviewStatus: () => void;
  loadCommentsForPlan: (planKey: string) => void;
}

export function useHistoryEdit({
  viewYear,
  viewMonth,
  deletePlansByMonth,
  deletePlan,
  addToast,
  commentCache,
  user,
  refreshReviewStatus,
  loadCommentsForPlan,
}: UseHistoryEditParams) {
  const [editedPlans, setEditedPlans] = useState<Map<string, { newName: string; originalName: string }>>(new Map());
  const editedKeys = useMemo(() => new Set(editedPlans.keys()), [editedPlans]);
  const originalNameMap = useMemo(() => {
    const map = new Map<string, string>();
    editedPlans.forEach((val, key) => {
      map.set(key, parseMenuItem(val.originalName).cleanName);
    });
    return map;
  }, [editedPlans]);

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
      const existingComments = (commentCache[planKey] || []).filter(
        c => c.scopeKey === oldScopeKey && c.status !== 'resolved'
      );

      for (const c of existingComments) {
        resolveComment(planKey, c.id);
      }

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

  const handleMenuAction = useCallback(
    (date: string, cycleType: string, targetType: string, itemIndex: number, menuName: string) => {
      setActionTarget({ date, cycleType, targetType, itemIndex, menuName });
    },
    []
  );

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

  return {
    editedPlans,
    editedKeys,
    originalNameMap,
    deleteConfirm,
    setDeleteConfirm,
    handleDeleteMonth,
    handleDeleteSingle,
    actionTarget,
    setActionTarget,
    swapTarget,
    setSwapTarget,
    getItems,
    handleSwap,
    handleMenuAction,
    handleChooseSwap,
  };
}
