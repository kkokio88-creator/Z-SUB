import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  X,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Beaker,
  Factory,
  MessageSquare,
  Send,
  Reply,
  FileText,
  Download,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getReview,
  requestReview,
  submitDepartmentReview,
  finalizeReview,
  DEPARTMENT_LABELS,
  addReviewComment,
  getReviewComments,
  resolveComment,
  requestReReviewAll,
} from '../services/reviewService';
import { exportHistoricalPlanToCSV, exportHistoricalPlanToPDF } from '../services/historyReviewService';
import type { HistoricalMealPlan, PlanReviewRecord, ReviewDepartment, ReviewComment } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const DEPT_ICONS: Record<ReviewDepartment, React.ElementType> = {
  quality: Shield,
  development: Beaker,
  process: Factory,
};

const STATUS_STYLES = {
  pending: { bg: 'bg-stone-100', text: 'text-stone-600', icon: Clock, label: '대기' },
  approved: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: '승인' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: '반려' },
};

interface HistoryReviewModalProps {
  plan: HistoricalMealPlan;
  reviewKey: string;
  onClose: () => void;
  onStatusChange: () => void;
}

const HistoryReviewModal: React.FC<HistoryReviewModalProps> = ({ plan, reviewKey, onClose, onStatusChange }) => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [review, setReview] = useState<PlanReviewRecord | null>(null);
  const [activeDept, setActiveDept] = useState<ReviewDepartment | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Lazy-create review on mount
  useEffect(() => {
    let existing = getReview(reviewKey);
    if (!existing) {
      existing = requestReview(reviewKey, user?.displayName || '사용자');
    }
    setReview(existing);
    setComments(getReviewComments(reviewKey));
  }, [reviewKey, user]);

  const refreshData = useCallback(() => {
    setReview(getReview(reviewKey));
    setComments(getReviewComments(reviewKey));
    onStatusChange();
  }, [reviewKey, onStatusChange]);

  const handleDeptReview = useCallback(
    (dept: ReviewDepartment, approved: boolean) => {
      const result = submitDepartmentReview(reviewKey, dept, user?.displayName || '사용자', approved, reviewComment);
      if (result) {
        setReview({ ...result });
        setActiveDept(null);
        setReviewComment('');
        addToast({
          type: approved ? 'success' : 'warning',
          title: `${DEPARTMENT_LABELS[dept]} ${approved ? '승인' : '반려'}`,
          message: approved ? '검토가 완료되었습니다.' : '반려 사유가 기록되었습니다.',
        });
        refreshData();
      }
    },
    [reviewKey, user, reviewComment, addToast, refreshData]
  );

  const handleFinalize = useCallback(() => {
    const result = finalizeReview(reviewKey);
    if (result) {
      setReview({ ...result });
      addToast({ type: 'success', title: '최종 승인 완료', message: '식단이 최종 확정되었습니다.' });
      refreshData();
    }
  }, [reviewKey, addToast, refreshData]);

  const handleReReview = useCallback(() => {
    const result = requestReReviewAll(reviewKey);
    if (result) {
      setReview({ ...result });
      addToast({ type: 'info', title: '재검토 요청', message: '모든 부서의 검토 상태가 초기화되었습니다.' });
      refreshData();
    }
  }, [reviewKey, addToast, refreshData]);

  const handleAddComment = useCallback(() => {
    if (!newComment.trim()) return;
    addReviewComment(reviewKey, {
      department: 'quality',
      reviewer: user?.displayName || '사용자',
      scope: 'plan',
      scopeKey: reviewKey,
      comment: newComment,
      status: 'comment',
    });
    setNewComment('');
    refreshData();
  }, [reviewKey, newComment, user, refreshData]);

  const handleSubmitReply = useCallback(() => {
    if (!replyTarget || !replyText.trim()) return;
    const parent = comments.find(c => c.id === replyTarget);
    if (!parent) return;
    addReviewComment(reviewKey, {
      parentId: replyTarget,
      department: parent.department,
      reviewer: user?.displayName || '사용자',
      scope: parent.scope,
      scopeKey: parent.scopeKey,
      comment: replyText,
      status: 'comment',
    });
    setReplyTarget(null);
    setReplyText('');
    refreshData();
  }, [reviewKey, replyTarget, replyText, comments, user, refreshData]);

  const handleResolveComment = useCallback(
    (commentId: string) => {
      resolveComment(reviewKey, commentId);
      refreshData();
    },
    [reviewKey, refreshData]
  );

  const topLevelComments = useMemo(() => comments.filter(c => !c.parentId), [comments]);

  const repliesByParent = useMemo(() => {
    const map: Record<string, ReviewComment[]> = {};
    for (const c of comments) {
      if (c.parentId) {
        if (!map[c.parentId]) map[c.parentId] = [];
        map[c.parentId].push(c);
      }
    }
    return map;
  }, [comments]);

  const allApproved = review?.departments.every(d => d.status === 'approved') ?? false;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-stone-800">{plan.date} 식단 검토</h2>
            <Badge variant={plan.cycleType === '화수목' ? 'info' : 'warning'}>{plan.cycleType}</Badge>
            {review && (
              <Badge
                variant={review.status === 'finalized' ? 'success' : review.status === 'approved' ? 'info' : 'warning'}
              >
                {review.status === 'draft'
                  ? '초안'
                  : review.status === 'review_requested'
                    ? '검토 중'
                    : review.status === 'approved'
                      ? '승인 완료'
                      : '최종 확정'}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Plan Summary */}
          <Card className="p-4 bg-stone-50">
            <h3 className="text-sm font-bold text-stone-700 mb-3">식단 요약</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {plan.targets.map(t => (
                <div key={t.targetType} className="bg-white rounded-lg border border-stone-100 p-3">
                  <div className="text-xs font-bold text-stone-600 mb-1">{t.targetType}</div>
                  <div className="text-[11px] text-stone-500">
                    {t.items.length}품 / 원가 {t.totalCost.toLocaleString()}원
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {t.items.slice(0, 4).map((item, i) => (
                      <span key={i} className="px-1.5 py-0.5 text-[10px] bg-stone-100 text-stone-600 rounded">
                        {item.name
                          .replace(/_냉장|_반조리|_냉동/g, '')
                          .replace(/\s+\d+$/, '')
                          .trim()}
                      </span>
                    ))}
                    {t.items.length > 4 && (
                      <span className="px-1.5 py-0.5 text-[10px] text-stone-400">+{t.items.length - 4}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Department Review Cards */}
          {review && (
            <div>
              <h3 className="text-sm font-bold text-stone-700 mb-3">부서별 검토</h3>
              <div className="space-y-3">
                {review.departments.map(dept => {
                  const style = STATUS_STYLES[dept.status];
                  const Icon = DEPT_ICONS[dept.department];
                  const StatusIcon = style.icon;
                  const isActive = activeDept === dept.department;

                  return (
                    <div
                      key={dept.department}
                      className={`rounded-xl border p-4 ${
                        dept.status === 'pending'
                          ? 'border-stone-200'
                          : dept.status === 'approved'
                            ? 'border-green-200 bg-green-50/30'
                            : 'border-red-200 bg-red-50/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-stone-500" />
                          <span className="text-sm font-medium text-stone-700">
                            {DEPARTMENT_LABELS[dept.department]}
                          </span>
                          <Badge
                            variant={
                              dept.status === 'approved'
                                ? 'success'
                                : dept.status === 'rejected'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            <StatusIcon className="w-3 h-3" /> {style.label}
                          </Badge>
                        </div>
                        {dept.status === 'pending' && review.status !== 'finalized' && (
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => setActiveDept(isActive ? null : dept.department)}
                            className="text-xs text-blue-600 font-medium h-auto p-0"
                          >
                            {isActive ? '접기' : '검토하기'}
                          </Button>
                        )}
                      </div>

                      {dept.comment && (
                        <p className="mt-2 text-xs text-stone-600 bg-white rounded-lg p-2.5 border border-stone-100">
                          {dept.reviewer && <span className="font-medium">{dept.reviewer}: </span>}
                          {dept.comment}
                        </p>
                      )}

                      {isActive && (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={reviewComment}
                            onChange={e => setReviewComment(e.target.value)}
                            placeholder="검토 의견을 입력하세요..."
                            className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
                              onClick={() => handleDeptReview(dept.department, true)}
                            >
                              <CheckCircle className="w-3 h-3" /> 승인
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleDeptReview(dept.department, false)}
                            >
                              <XCircle className="w-3 h-3" /> 반려
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Threaded Comments */}
          <div>
            <h3 className="text-sm font-bold text-stone-700 mb-3 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-stone-500" />
              코멘트
              {topLevelComments.length > 0 && (
                <span className="text-xs font-normal text-stone-400">({topLevelComments.length})</span>
              )}
            </h3>

            {/* Add comment */}
            <div className="flex gap-2 mb-4">
              <Input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="코멘트를 입력하세요..."
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddComment();
                }}
              />
              <Button onClick={handleAddComment} disabled={!newComment.trim()} size="icon">
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {topLevelComments.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-4">등록된 코멘트가 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {topLevelComments.map(comment => (
                  <div
                    key={comment.id}
                    className={`rounded-lg border p-3 ${
                      comment.status === 'resolved'
                        ? 'border-stone-200 bg-stone-50 opacity-60'
                        : 'border-stone-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-stone-600">{comment.reviewer}</span>
                        <span className="text-stone-300">·</span>
                        <span className="text-[11px] text-stone-400">{DEPARTMENT_LABELS[comment.department]}</span>
                        {comment.status === 'resolved' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">
                            해결
                          </span>
                        )}
                      </div>
                      {review?.status !== 'finalized' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolveComment(comment.id)}
                          className={`text-[10px] font-medium h-auto px-2 py-0.5 ${
                            comment.status === 'resolved'
                              ? 'text-stone-500 bg-white border-stone-200 hover:bg-stone-50'
                              : 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100'
                          }`}
                        >
                          {comment.status === 'resolved' ? '재오픈' : '해결'}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-stone-700 mb-1">{comment.comment}</p>
                    <div className="text-[10px] text-stone-400">
                      {new Date(comment.createdAt).toLocaleString('ko-KR')}
                    </div>

                    {/* Replies */}
                    {(repliesByParent[comment.id] || []).map(reply => (
                      <div key={reply.id} className="ml-4 mt-2 pl-3 border-l-2 border-blue-200">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[11px] font-medium text-stone-600">{reply.reviewer}</span>
                          <span className="text-stone-300">·</span>
                          <span className="text-[10px] text-stone-400">
                            {new Date(reply.createdAt).toLocaleString('ko-KR')}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600">{reply.comment}</p>
                      </div>
                    ))}

                    {/* Reply input */}
                    {replyTarget === comment.id ? (
                      <div className="mt-2 ml-4 flex gap-1">
                        <Input
                          type="text"
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder="답글 입력..."
                          className="flex-1 text-[11px] h-6 px-2 py-1"
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSubmitReply();
                          }}
                          autoFocus
                        />
                        <Button onClick={handleSubmitReply} size="icon" className="h-6 w-6">
                          <Send className="w-2.5 h-2.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => {
                          setReplyTarget(comment.id);
                          setReplyText('');
                        }}
                        className="mt-1 text-[10px] text-blue-500 h-auto p-0 gap-0.5"
                      >
                        <Reply className="w-2.5 h-2.5" /> 답글
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => exportHistoricalPlanToCSV(plan)}>
              <Download className="w-3 h-3" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportHistoricalPlanToPDF(plan)}>
              <FileText className="w-3 h-3" /> PDF
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {review &&
              review.status !== 'finalized' &&
              review.status !== 'draft' &&
              review.departments.some(d => d.status !== 'pending') && (
                <Button
                  variant="outline"
                  className="text-amber-600 border-amber-300 hover:bg-amber-50"
                  onClick={handleReReview}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> 재검토 요청
                </Button>
              )}
            {allApproved && review?.status === 'approved' && (
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleFinalize}>
                <CheckCircle className="w-4 h-4" /> 최종 확정
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              닫기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryReviewModal;
