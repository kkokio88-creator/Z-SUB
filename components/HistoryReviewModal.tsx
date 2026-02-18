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
} from '../services/reviewService';
import { exportHistoricalPlanToCSV, exportHistoricalPlanToPDF } from '../services/historyReviewService';
import type { HistoricalMealPlan, PlanReviewRecord, ReviewDepartment, ReviewComment } from '../types';

const DEPT_ICONS: Record<ReviewDepartment, React.ElementType> = {
  quality: Shield,
  development: Beaker,
  process: Factory,
};

const STATUS_STYLES = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-600', icon: Clock, label: '대기' },
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
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-800">{plan.date} 식단 검토</h2>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                plan.cycleType === '화수목' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
              }`}
            >
              {plan.cycleType}
            </span>
            {review && (
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  review.status === 'finalized'
                    ? 'bg-green-100 text-green-700'
                    : review.status === 'approved'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {review.status === 'draft'
                  ? '초안'
                  : review.status === 'review_requested'
                    ? '검토 중'
                    : review.status === 'approved'
                      ? '승인 완료'
                      : '최종 확정'}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Plan Summary */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">식단 요약</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {plan.targets.map(t => (
                <div key={t.targetType} className="bg-white rounded-lg border border-gray-100 p-3">
                  <div className="text-xs font-bold text-gray-600 mb-1">{t.targetType}</div>
                  <div className="text-[11px] text-gray-500">
                    {t.items.length}품 / 원가 {t.totalCost.toLocaleString()}원
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {t.items.slice(0, 4).map((item, i) => (
                      <span key={i} className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded">
                        {item.name
                          .replace(/_냉장|_반조리|_냉동/g, '')
                          .replace(/\s+\d+$/, '')
                          .trim()}
                      </span>
                    ))}
                    {t.items.length > 4 && (
                      <span className="px-1.5 py-0.5 text-[10px] text-gray-400">+{t.items.length - 4}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Department Review Cards */}
          {review && (
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3">부서별 검토</h3>
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
                          ? 'border-gray-200'
                          : dept.status === 'approved'
                            ? 'border-green-200 bg-green-50/30'
                            : 'border-red-200 bg-red-50/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">
                            {DEPARTMENT_LABELS[dept.department]}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${style.bg} ${style.text}`}
                          >
                            <StatusIcon className="w-3 h-3" /> {style.label}
                          </span>
                        </div>
                        {dept.status === 'pending' && review.status !== 'finalized' && (
                          <button
                            onClick={() => setActiveDept(isActive ? null : dept.department)}
                            className="text-xs text-blue-600 font-medium hover:underline"
                          >
                            {isActive ? '접기' : '검토하기'}
                          </button>
                        )}
                      </div>

                      {dept.comment && (
                        <p className="mt-2 text-xs text-gray-600 bg-white rounded-lg p-2.5 border border-gray-100">
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
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeptReview(dept.department, true)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-green-600 rounded-lg hover:bg-green-700"
                            >
                              <CheckCircle className="w-3 h-3" /> 승인
                            </button>
                            <button
                              onClick={() => handleDeptReview(dept.department, false)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-red-500 rounded-lg hover:bg-red-600"
                            >
                              <XCircle className="w-3 h-3" /> 반려
                            </button>
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
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-gray-500" />
              코멘트
              {topLevelComments.length > 0 && (
                <span className="text-xs font-normal text-gray-400">({topLevelComments.length})</span>
              )}
            </h3>

            {/* Add comment */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="코멘트를 입력하세요..."
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddComment();
                }}
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {topLevelComments.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">등록된 코멘트가 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {topLevelComments.map(comment => (
                  <div
                    key={comment.id}
                    className={`rounded-lg border p-3 ${
                      comment.status === 'resolved'
                        ? 'border-gray-200 bg-gray-50 opacity-60'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-gray-600">{comment.reviewer}</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-[11px] text-gray-400">{DEPARTMENT_LABELS[comment.department]}</span>
                        {comment.status === 'resolved' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">
                            해결
                          </span>
                        )}
                      </div>
                      {review?.status !== 'finalized' && (
                        <button
                          onClick={() => handleResolveComment(comment.id)}
                          className={`text-[10px] font-medium px-2 py-0.5 rounded border transition-colors ${
                            comment.status === 'resolved'
                              ? 'text-gray-500 bg-white border-gray-200 hover:bg-gray-50'
                              : 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100'
                          }`}
                        >
                          {comment.status === 'resolved' ? '재오픈' : '해결'}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-700 mb-1">{comment.comment}</p>
                    <div className="text-[10px] text-gray-400">
                      {new Date(comment.createdAt).toLocaleString('ko-KR')}
                    </div>

                    {/* Replies */}
                    {(repliesByParent[comment.id] || []).map(reply => (
                      <div key={reply.id} className="ml-4 mt-2 pl-3 border-l-2 border-blue-200">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[11px] font-medium text-gray-600">{reply.reviewer}</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(reply.createdAt).toLocaleString('ko-KR')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">{reply.comment}</p>
                      </div>
                    ))}

                    {/* Reply input */}
                    {replyTarget === comment.id ? (
                      <div className="mt-2 ml-4 flex gap-1">
                        <input
                          type="text"
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder="답글 입력..."
                          className="flex-1 text-[11px] border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-400"
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSubmitReply();
                          }}
                          autoFocus
                        />
                        <button
                          onClick={handleSubmitReply}
                          className="px-2 py-1 text-[10px] font-bold text-white bg-blue-500 rounded hover:bg-blue-600"
                        >
                          <Send className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setReplyTarget(comment.id);
                          setReplyText('');
                        }}
                        className="mt-1 text-[10px] text-blue-500 hover:underline flex items-center gap-0.5"
                      >
                        <Reply className="w-2.5 h-2.5" /> 답글
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportHistoricalPlanToCSV(plan)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-3 h-3" /> CSV
            </button>
            <button
              onClick={() => exportHistoricalPlanToPDF(plan)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <FileText className="w-3 h-3" /> PDF
            </button>
          </div>

          <div className="flex items-center gap-2">
            {allApproved && review?.status === 'approved' && (
              <button
                onClick={handleFinalize}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 shadow-sm"
              >
                <CheckCircle className="w-4 h-4" /> 최종 확정
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryReviewModal;
