import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed,
  RefreshCw,
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
import { TargetType } from '../types';
import { TARGET_CONFIGS, TARGET_LABELS } from '../constants';
import type { MenuItem } from '../types';
import { makeReviewKey } from '../services/historyReviewService';
import HistoryReviewModal from './HistoryReviewModal';
import HistoryIngredientView from './HistoryIngredientView';
import HistoryDistributionView from './HistoryDistributionView';
import { normalizeMenuName } from '../services/menuUtils';
import { isValidMenuItem, parseMenuItem, detectProcess } from './history/historyConstants';
import { SwapModal, ActionModal, CommentModal, HistoryPlanTable, HistoryProductionTable } from './history';
import { useHistoryNavigation } from '../hooks/useHistoryNavigation';
import { useHistoryReview } from '../hooks/useHistoryReview';
import { useHistoryEdit } from '../hooks/useHistoryEdit';
import {
  computeColumns,
  computeConsolidatedProduction,
  computeProductionSummary,
  doExportCSV,
  doExportPDF,
  doExportGoogleSheets,
} from './history/historyExports';

const MealPlanHistory: React.FC = () => {
  const { plans: HISTORICAL_MEAL_PLANS, isLoading, refresh, deletePlansByMonth, deletePlan } = useHistoricalPlans();
  const { menuItems } = useMenu();
  const { user } = useAuth();
  const { addToast } = useToast();
  const { setSyncStatus } = useSheets();
  const contentRef = useRef<HTMLDivElement>(null);

  // Custom hooks
  const nav = useHistoryNavigation(HISTORICAL_MEAL_PLANS);
  const review = useHistoryReview({ allMonthPlans: nav.allMonthPlans, user, addToast });
  const edit = useHistoryEdit({
    viewYear: nav.viewYear,
    viewMonth: nav.viewMonth,
    deletePlansByMonth,
    deletePlan,
    addToast,
    commentCache: review.commentCache,
    user,
    refreshReviewStatus: review.refreshReviewStatus,
    loadCommentsForPlan: review.loadCommentsForPlan,
  });

  // Shipment config
  const [shipmentConfig, setShipmentConfig] = useState<Record<string, { 화수목: number; 금토월: number }>>({});
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zsub_shipment_config');
      if (saved) setShipmentConfig(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);

  // Menu DB lookup
  const menuLookup = useMemo(() => {
    const map = new Map<string, MenuItem>();
    for (const m of menuItems) {
      map.set(m.name, m);
      const clean = normalizeMenuName(m.name);
      if (!map.has(clean)) map.set(clean, m);
    }
    return map;
  }, [menuItems]);

  // Production summary per date
  const productionSummary = useMemo(
    () => computeProductionSummary(review.monthPlans, shipmentConfig, menuLookup, detectProcess),
    [review.monthPlans, shipmentConfig, menuLookup]
  );

  // Discount summary
  const discountSummary = useMemo(() => {
    const result = new Map<
      string,
      { sumRecPrice: number; targetPrice: number; totalCost: number; targetCostRatio: number }
    >();
    for (const plan of review.monthPlans) {
      for (const target of plan.targets) {
        const key = `${plan.date}-${plan.cycleType}-${target.targetType}`;
        const config = TARGET_CONFIGS[target.targetType as TargetType];
        if (!config) continue;
        let sumRecPrice = 0;
        let totalCost = 0;
        target.items.forEach((item, idx) => {
          if (!isValidMenuItem(item.name)) return;
          const editKey = `${plan.date}|${target.targetType}|${idx}`;
          const edited = edit.editedPlans.get(editKey);
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
  }, [review.monthPlans, edit.editedPlans, menuItems]);

  // Consolidated production
  const consolidatedProduction = useMemo(
    () => computeConsolidatedProduction(review.monthPlans, shipmentConfig, menuLookup, detectProcess),
    [review.monthPlans, shipmentConfig, menuLookup]
  );

  // Production limits
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

  const columns = useMemo(() => computeColumns(review.monthPlans), [review.monthPlans]);

  const formatDate = useCallback((d: string) => {
    const dt = new Date(d);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${dt.getMonth() + 1}.${String(dt.getDate()).padStart(2, '0')}(${days[dt.getDay()]})`;
  }, []);

  // Bridge handler: chooseComment needs both edit and review hooks
  const handleChooseComment = useCallback(() => {
    if (!edit.actionTarget) return;
    const planKey = makeReviewKey(edit.actionTarget.date, edit.actionTarget.cycleType);
    const editKey = `${edit.actionTarget.date}|${edit.actionTarget.targetType}|${edit.actionTarget.itemIndex}`;
    const origCleanName = edit.originalNameMap.get(editKey);
    const { cleanName } = parseMenuItem(edit.actionTarget.menuName);
    const scopeKey = origCleanName
      ? `${edit.actionTarget.targetType}-${edit.actionTarget.itemIndex}-${origCleanName}`
      : `${edit.actionTarget.targetType}-${edit.actionTarget.itemIndex}-${cleanName}`;
    review.setCommentTarget({ planKey, scopeKey, menuName: edit.actionTarget.menuName });
    edit.setActionTarget(null);
  }, [edit.actionTarget, edit.originalNameMap, review]);

  // Export handlers (delegated to historyExports)
  const exportDeps = useMemo(
    () => ({
      monthPlans: review.monthPlans,
      viewYear: nav.viewYear,
      viewMonth: nav.viewMonth,
      viewMode: nav.viewMode,
      columns,
      consolidatedProduction,
      addToast,
      setSyncStatus,
    }),
    [
      review.monthPlans,
      nav.viewYear,
      nav.viewMonth,
      nav.viewMode,
      columns,
      consolidatedProduction,
      addToast,
      setSyncStatus,
    ]
  );
  const exportToHistoryCSV = useCallback(() => doExportCSV(exportDeps), [exportDeps]);
  const exportToHistoryPDF = useCallback(
    () => doExportPDF(contentRef, nav.viewYear, nav.viewMonth),
    [nav.viewYear, nav.viewMonth]
  );
  const exportToGoogleSheets = useCallback(() => doExportGoogleSheets(exportDeps), [exportDeps]);

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={nav.goToPrevMonth} className="p-2">
            <ChevronLeft className="w-5 h-5 text-stone-600" />
          </Button>
          <h2 className="text-2xl font-bold text-stone-800 min-w-[160px] text-center">
            {nav.viewYear}년 {nav.viewMonth + 1}월
          </h2>
          <Button variant="outline" size="sm" onClick={nav.goToNextMonth} className="p-2">
            <ChevronRight className="w-5 h-5 text-stone-600" />
          </Button>
          <Button variant="outline" size="sm" onClick={nav.goToToday} className="ml-2 text-xs font-medium">
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
          {review.monthPlans.length > 0 && (
            <Badge variant="secondary" className="ml-2 px-2.5 py-1 text-xs font-medium text-primary-700 bg-primary-50">
              {review.monthPlans.length}건
            </Badge>
          )}
          {nav.allMonthPlans.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                edit.setDeleteConfirm({
                  type: 'month',
                  date: `${nav.viewYear}-${String(nav.viewMonth + 1).padStart(2, '0')}`,
                })
              }
              className="ml-2 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50"
              title={`${nav.viewYear}년 ${nav.viewMonth + 1}월 전체 삭제`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
        {edit.editedPlans.size > 0 && (
          <Badge
            variant="outline"
            className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border-amber-200"
          >
            {edit.editedPlans.size}건 수정됨
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
            variant={review.reviewFilter === f.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => review.setReviewFilter(f.key)}
            className={`px-3 py-1.5 text-xs font-bold ${review.reviewFilter === f.key ? f.color + ' ring-1 ring-offset-1' : 'bg-white text-stone-500 border-stone-200'}`}
          >
            {f.label}
            <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-white/60">
              {review.filterCounts[f.key]}
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
              variant={nav.viewMode === v.key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => nav.setViewMode(v.key)}
              className={`px-3 py-1.5 text-xs font-bold ${nav.viewMode === v.key ? 'bg-white text-stone-800 shadow-sm' : ''}`}
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
        {review.monthPlans.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-400">
            <UtensilsCrossed className="w-12 h-12 mb-3 opacity-50" />
            <p className="font-medium">이 달의 식단 데이터가 없습니다</p>
          </div>
        ) : nav.viewMode === 'ingredient' ? (
          <HistoryIngredientView monthPlans={review.monthPlans} formatDate={formatDate} />
        ) : nav.viewMode === 'distribution' ? (
          <HistoryDistributionView monthPlans={review.monthPlans} formatDate={formatDate} />
        ) : nav.viewMode === 'production' ? (
          <HistoryProductionTable
            consolidatedProduction={consolidatedProduction}
            productionLimits={productionLimits}
            commentCounts={review.commentCounts}
            onItemClick={menuName => {
              const plan = review.monthPlans[0];
              if (plan) {
                review.setCommentTarget({
                  planKey: makeReviewKey(plan.date, plan.cycleType),
                  scopeKey: `PROD|${menuName}`,
                  menuName,
                });
              }
            }}
          />
        ) : (
          <HistoryPlanTable
            monthPlans={review.monthPlans}
            reviewStatusMap={review.reviewStatusMap}
            editedKeys={edit.editedKeys}
            originalNameMap={edit.originalNameMap}
            commentCounts={review.commentCounts}
            commentCache={review.commentCache}
            highlightedIngredient={nav.highlightedIngredient}
            setHighlightedIngredient={nav.setHighlightedIngredient}
            productionSummary={productionSummary}
            discountSummary={discountSummary}
            menuItems={menuItems}
            shipmentConfig={shipmentConfig}
            editedPlans={edit.editedPlans}
            getItems={edit.getItems}
            onMenuAction={edit.handleMenuAction}
            onReviewClick={review.setSelectedReview}
            onDeleteClick={edit.setDeleteConfirm}
            onProductionCommentClick={(planKey, scopeKey, menuName) =>
              review.setCommentTarget({ planKey, scopeKey, menuName })
            }
          />
        )}
      </div>

      {/* 액션 선택 모달 */}
      {edit.actionTarget && (
        <ActionModal
          menuName={edit.actionTarget.menuName}
          onComment={handleChooseComment}
          onSwap={edit.handleChooseSwap}
          onClose={() => edit.setActionTarget(null)}
        />
      )}

      {/* 코멘트 모달 */}
      {review.commentTarget && (
        <CommentModal
          planKey={review.commentTarget.planKey}
          scopeKey={review.commentTarget.scopeKey}
          menuName={review.commentTarget.menuName}
          comments={review.commentCache[review.commentTarget.planKey] || []}
          onSubmit={review.handleSubmitComment}
          onDelete={commentId => review.handleDeleteComment(review.commentTarget!.planKey, commentId)}
          onClose={() => review.setCommentTarget(null)}
        />
      )}

      {/* 교체 모달 */}
      {edit.swapTarget && (
        <SwapModal
          currentName={edit.swapTarget.currentName}
          menuItems={menuItems}
          onSelect={edit.handleSwap}
          onClose={() => edit.setSwapTarget(null)}
        />
      )}

      {/* 검토 모달 */}
      {review.selectedReview && (
        <HistoryReviewModal
          plan={review.selectedReview}
          reviewKey={makeReviewKey(review.selectedReview.date, review.selectedReview.cycleType)}
          onClose={() => review.setSelectedReview(null)}
          onStatusChange={review.refreshReviewStatus}
        />
      )}

      {/* 삭제 확인 다이얼로그 */}
      {edit.deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-base font-bold text-stone-800">히스토리 삭제</h3>
            </div>
            <p className="text-sm text-stone-600 mb-4">
              {edit.deleteConfirm.type === 'month'
                ? `${nav.viewYear}년 ${nav.viewMonth + 1}월 전체 히스토리(${nav.allMonthPlans.length}건)를 삭제하시겠습니까?`
                : `${edit.deleteConfirm.date} (${edit.deleteConfirm.cycleType}) 식단을 삭제하시겠습니까?`}
            </p>
            <p className="text-xs text-red-500 mb-4">삭제된 데이터는 복구할 수 없습니다.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => edit.setDeleteConfirm(null)}>
                취소
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (edit.deleteConfirm!.type === 'month') {
                    edit.handleDeleteMonth();
                  } else if (edit.deleteConfirm!.cycleType) {
                    edit.handleDeleteSingle(edit.deleteConfirm!.date, edit.deleteConfirm!.cycleType);
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
