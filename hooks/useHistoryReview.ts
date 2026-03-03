import { useState, useMemo, useCallback, useEffect } from 'react';
import type { HistoricalMealPlan, PlanReviewRecord, ReviewComment } from '../types';
import type { ToastType } from '../context/ToastContext';
import {
  makeReviewKey,
  buildReviewStatusMap,
  getFilterStatus,
  type ReviewFilterCategory,
} from '../services/historyReviewService';
import { addReviewComment, getReviewComments, deleteComment as deleteCommentService } from '../services/reviewService';
import { isValidMenuItem, parseMenuItem } from '../components/history/historyConstants';

interface UseHistoryReviewParams {
  allMonthPlans: HistoricalMealPlan[];
  user: { displayName?: string } | null;
  addToast: (toast: { type: ToastType; title: string; message: string }) => void;
}

export function useHistoryReview({ allMonthPlans, user, addToast }: UseHistoryReviewParams) {
  const [reviewFilter, setReviewFilter] = useState<ReviewFilterCategory>('all');
  const [selectedReview, setSelectedReview] = useState<HistoricalMealPlan | null>(null);
  const [reviewStatusMap, setReviewStatusMap] = useState<Map<string, PlanReviewRecord>>(() => buildReviewStatusMap());

  const refreshReviewStatus = useCallback(() => {
    setReviewStatusMap(buildReviewStatusMap());
  }, []);

  const [commentCache, setCommentCache] = useState<Record<string, ReviewComment[]>>({});
  const [commentTarget, setCommentTarget] = useState<{
    planKey: string;
    scopeKey: string;
    menuName: string;
  } | null>(null);

  const loadCommentsForPlan = useCallback((planKey: string) => {
    const comments = getReviewComments(planKey);
    setCommentCache(prev => ({ ...prev, [planKey]: comments }));
  }, []);

  const commentCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const comments of Object.values(commentCache)) {
      for (const c of comments) {
        map.set(c.scopeKey, (map.get(c.scopeKey) || 0) + 1);
      }
    }
    return map;
  }, [commentCache]);

  useEffect(() => {
    for (const p of allMonthPlans) {
      const key = makeReviewKey(p.date, p.cycleType);
      if (!commentCache[key]) loadCommentsForPlan(key);
    }
  }, [allMonthPlans, commentCache, loadCommentsForPlan]);

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

  const handleSubmitComment = useCallback(
    (text: string) => {
      if (!commentTarget) return;
      if (commentTarget.scopeKey.startsWith('PROD|')) {
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

  const handleDeleteComment = useCallback(
    (planKey: string, commentId: string) => {
      deleteCommentService(planKey, commentId);
      loadCommentsForPlan(planKey);
    },
    [loadCommentsForPlan]
  );

  return {
    reviewFilter,
    setReviewFilter,
    selectedReview,
    setSelectedReview,
    reviewStatusMap,
    refreshReviewStatus,
    commentCache,
    loadCommentsForPlan,
    commentTarget,
    setCommentTarget,
    commentCounts,
    filterCounts,
    monthPlans,
    handleSubmitComment,
    handleDeleteComment,
  };
}
