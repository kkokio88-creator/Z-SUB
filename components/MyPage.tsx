import React, { useMemo, useState } from 'react';
import { Bell, CheckCircle, MessageSquare, RefreshCw, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../context/AuthContext';
import { getAllReviews, getReviewComments, DEPARTMENT_LABELS } from '../services/reviewService';
import type { PlanReviewRecord, ReviewComment } from '../types';

const MyPage: React.FC = () => {
  const { user, loginWithGoogle, isOfflineMode } = useAuth();
  const [activeSection, setActiveSection] = useState<'notifications' | 'profile'>('notifications');

  // Collect pending items for current user
  const pendingItems = useMemo(() => {
    const reviews = getAllReviews();
    const items: {
      type: 'review' | 'comment' | 'reReview';
      planId: string;
      detail: string;
      timestamp: string;
    }[] = [];

    for (const review of reviews) {
      // Pending reviews assigned to current user's department
      for (const dept of review.departments) {
        if (dept.status === 'pending' && dept.reviewer === '') {
          items.push({
            type: 'review',
            planId: review.planId,
            detail: `${DEPARTMENT_LABELS[dept.department]} 검토 대기 중`,
            timestamp: review.requestedAt,
          });
        }
        if (dept.status === 'pending' && dept.reviewer !== '' && dept.comment.includes('[재검토')) {
          items.push({
            type: 'reReview',
            planId: review.planId,
            detail: `${DEPARTMENT_LABELS[dept.department]} 재검토 요청`,
            timestamp: review.requestedAt,
          });
        }
      }

      // Unresolved comments
      const comments = getReviewComments(review.planId);
      for (const comment of comments) {
        if (comment.status === 'issue') {
          items.push({
            type: 'comment',
            planId: review.planId,
            detail: `이슈: ${comment.comment.slice(0, 50)}${comment.comment.length > 50 ? '...' : ''}`,
            timestamp: comment.createdAt,
          });
        }
      }
    }

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, []);

  const roleLabel: Record<string, string> = { manager: '최고 관리자', nutritionist: '영양사', operator: '운영자' };

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 text-2xl font-bold border-2 border-emerald-200">
            {user?.displayName?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-800">{user?.displayName || '사용자'}</h2>
            <p className="text-sm text-stone-500">{user?.email}</p>
            <p className="text-xs text-stone-400 mt-1">{roleLabel[user?.role || 'manager']}</p>
          </div>
          {isOfflineMode && (
            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await loginWithGoogle();
                }}
                className="text-xs"
              >
                Google 로그인 연동
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2">
        <Button
          variant={activeSection === 'notifications' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveSection('notifications')}
          className="gap-1.5"
        >
          <Bell className="w-4 h-4" /> 알림 ({pendingItems.length})
        </Button>
        <Button
          variant={activeSection === 'profile' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveSection('profile')}
          className="gap-1.5"
        >
          <User className="w-4 h-4" /> 프로필 설정
        </Button>
      </div>

      {/* Notifications */}
      {activeSection === 'notifications' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2">
              <Bell className="w-4 h-4 text-stone-400" /> 미확인 사항
            </h3>
            <span className="text-xs text-stone-400">{pendingItems.length}건</span>
          </div>
          <div className="divide-y divide-stone-50">
            {pendingItems.length === 0 ? (
              <div className="p-8 text-center text-sm text-stone-400">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                미확인 사항이 없습니다
              </div>
            ) : (
              pendingItems.map((item, idx) => (
                <div key={idx} className="px-4 py-3 hover:bg-stone-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 p-1.5 rounded-lg ${
                        item.type === 'review'
                          ? 'bg-blue-50 text-blue-600'
                          : item.type === 'reReview'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {item.type === 'comment' ? (
                        <MessageSquare className="w-4 h-4" />
                      ) : item.type === 'reReview' ? (
                        <RefreshCw className="w-4 h-4" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-700">{item.detail}</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">
                        {item.planId} - {new Date(item.timestamp).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Profile Settings */}
      {activeSection === 'profile' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-bold text-stone-800">프로필 정보</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-xs text-stone-400 block mb-1">이름</label>
              <p className="font-medium text-stone-700">{user?.displayName || '-'}</p>
            </div>
            <div>
              <label className="text-xs text-stone-400 block mb-1">이메일</label>
              <p className="font-medium text-stone-700">{user?.email || '-'}</p>
            </div>
            <div>
              <label className="text-xs text-stone-400 block mb-1">역할</label>
              <p className="font-medium text-stone-700">{roleLabel[user?.role || 'manager']}</p>
            </div>
            <div>
              <label className="text-xs text-stone-400 block mb-1">로그인 방식</label>
              <p className="font-medium text-stone-700">{isOfflineMode ? '오프라인 모드' : 'Google 로그인'}</p>
            </div>
          </div>
          <p className="text-xs text-stone-400 mt-4">
            Google 로그인 연동 후 담당자 태깅, 실시간 알림 등 추가 기능을 사용할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
};

export default MyPage;
