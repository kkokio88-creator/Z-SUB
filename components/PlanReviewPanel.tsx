import React, { useState, useCallback } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Shield,
  Beaker,
  Factory,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getReview,
  requestReview,
  submitDepartmentReview,
  finalizeReview,
  DEPARTMENT_LABELS,
  getReviewComments,
  resolveComment,
} from '../services/reviewService';
import type { PlanReviewRecord, ReviewDepartment, ReviewComment } from '../types';

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

const SCOPE_LABELS = {
  plan: '식단 전체',
  week: '주차',
  item: '메뉴',
};

const SCOPE_BADGE_COLORS = {
  plan: 'bg-blue-100 text-blue-700',
  week: 'bg-purple-100 text-purple-700',
  item: 'bg-green-100 text-green-700',
};

interface PlanReviewPanelProps {
  planId: string;
  onFinalized?: () => void;
  onStatusChange?: () => void;
}

const PlanReviewPanel: React.FC<PlanReviewPanelProps> = ({ planId, onFinalized, onStatusChange }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [review, setReview] = useState<PlanReviewRecord | null>(() => getReview(planId));
  const [expanded, setExpanded] = useState(true);
  const [reviewComment, setReviewComment] = useState('');
  const [activeDept, setActiveDept] = useState<ReviewDepartment | null>(null);

  // Inline Comments State
  const [comments, setComments] = useState<ReviewComment[]>(() => getReviewComments(planId));

  const unresolvedCount = comments.filter(c => c.status !== 'resolved').length;

  const handleRequestReview = useCallback(() => {
    const result = requestReview(planId, user?.displayName || '사용자');
    setReview(result);
    addToast({ type: 'success', title: '검토 요청 완료', message: '3개 부서에 검토 요청이 전송되었습니다.' });
    onStatusChange?.();
  }, [planId, user, addToast, onStatusChange]);

  const handleDeptReview = useCallback(
    (dept: ReviewDepartment, approved: boolean) => {
      const result = submitDepartmentReview(planId, dept, user?.displayName || '사용자', approved, reviewComment);
      if (result) {
        setReview({ ...result });
        setActiveDept(null);
        setReviewComment('');
        addToast({
          type: approved ? 'success' : 'warning',
          title: `${DEPARTMENT_LABELS[dept]} ${approved ? '승인' : '반려'}`,
          message: approved ? '검토가 완료되었습니다.' : '반려 사유가 기록되었습니다.',
        });
        onStatusChange?.();
      }
    },
    [planId, user, reviewComment, addToast, onStatusChange]
  );

  const handleFinalize = useCallback(() => {
    const result = finalizeReview(planId);
    if (result) {
      setReview({ ...result });
      addToast({ type: 'success', title: '최종 등록 완료', message: '식단이 최종 확정되었습니다.' });
      onStatusChange?.();
      onFinalized?.();
    }
  }, [planId, addToast, onFinalized, onStatusChange]);

  const handleResolveComment = useCallback(
    (commentId: string) => {
      const updated = resolveComment(planId, commentId);
      if (updated) {
        setComments(prev => prev.map(c => (c.id === commentId ? updated : c)));
      }
    },
    [planId]
  );

  // No review yet → show request button
  if (!review) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-gray-800">검토/승인 워크플로우</h4>
            <p className="text-xs text-gray-500 mt-0.5">식단을 3개 부서에 검토 요청할 수 있습니다.</p>
          </div>
          <button
            onClick={handleRequestReview}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
          >
            <Send className="w-4 h-4" /> 전체 식단 검토 요청
          </button>
        </div>
      </div>
    );
  }

  const allApproved = review.departments.every(d => d.status === 'approved');

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-gray-800">검토 현황</h4>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
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
                  : '최종 등록'}
          </span>
          {unresolvedCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">
              <MessageSquare className="w-3 h-3" />
              미해결 {unresolvedCount}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </div>

      {expanded && (
        <div className="p-4 space-y-3">
          {/* Department Review Cards */}
          {review.departments.map(dept => {
            const style = STATUS_STYLES[dept.status];
            const Icon = DEPT_ICONS[dept.department];
            const StatusIcon = style.icon;
            const isActive = activeDept === dept.department;

            return (
              <div
                key={dept.department}
                className={`rounded-lg border p-3 ${dept.status === 'pending' ? 'border-gray-200' : dept.status === 'approved' ? 'border-green-200' : 'border-red-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">{DEPARTMENT_LABELS[dept.department]}</span>
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
                  <p className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-2">
                    {dept.reviewer && <span className="font-medium">{dept.reviewer}: </span>}
                    {dept.comment}
                  </p>
                )}

                {/* Review Form */}
                {isActive && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                      placeholder="검토 의견을 입력하세요..."
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-primary-500 resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeptReview(dept.department, true)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-green-600 rounded hover:bg-green-700"
                      >
                        <CheckCircle className="w-3 h-3" /> 승인
                      </button>
                      <button
                        onClick={() => handleDeptReview(dept.department, false)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-red-500 rounded hover:bg-red-600"
                      >
                        <XCircle className="w-3 h-3" /> 반려
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Inline Comments Section */}
          <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-gray-500" />
                코멘트
                {comments.length > 0 && <span className="text-xs font-normal text-gray-400">({comments.length})</span>}
              </h5>
              <span className="text-[10px] text-gray-400">메뉴를 클릭하여 코멘트를 추가하세요</span>
            </div>

            {/* Comments List */}
            {comments.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">등록된 코멘트가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {comments.map(comment => (
                  <div
                    key={comment.id}
                    className={`rounded-lg border p-2.5 ${
                      comment.status === 'resolved'
                        ? 'border-gray-200 bg-gray-50 opacity-60'
                        : comment.status === 'issue'
                          ? 'border-red-200 bg-red-50/50'
                          : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-medium text-gray-500">
                          {DEPARTMENT_LABELS[comment.department]}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${SCOPE_BADGE_COLORS[comment.scope]}`}
                        >
                          {SCOPE_LABELS[comment.scope]}
                          {comment.scope !== 'plan' && `: ${comment.scopeKey}`}
                        </span>
                        {comment.status === 'issue' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                            이슈
                          </span>
                        )}
                        {comment.status === 'resolved' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">
                            해결됨
                          </span>
                        )}
                      </div>
                      {review.status !== 'finalized' && (
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
                    <p className="text-xs text-gray-700">{comment.comment}</p>
                    <div className="mt-1 text-[10px] text-gray-400">
                      {comment.reviewer} · {new Date(comment.createdAt).toLocaleString('ko-KR')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Finalize Button */}
          {allApproved && review.status === 'approved' && (
            <button
              onClick={handleFinalize}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 shadow-sm"
            >
              <CheckCircle className="w-4 h-4" /> 최종 등록 (시트 동기화)
            </button>
          )}

          {review.status === 'finalized' && (
            <div className="text-center py-2 text-xs text-green-600 font-medium">
              {review.finalizedAt && `${new Date(review.finalizedAt).toLocaleString('ko-KR')} 최종 확정`}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlanReviewPanel;
