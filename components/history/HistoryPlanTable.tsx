import React, { useMemo } from 'react';
import { Shield, Clock, CheckCircle, MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TARGET_LABELS } from '../../constants';
import type {
  HistoricalMenuItem,
  HistoricalMealPlan,
  HistoricalTargetPlan,
  PlanReviewRecord,
  ReviewComment,
  MenuItem,
} from '../../types';
import { makeReviewKey, getFilterStatus } from '../../services/historyReviewService';
import {
  TARGET_COLORS,
  INGREDIENT_COLORS,
  INGREDIENT_HIGHLIGHT_TEXT,
  PROCESS_COLORS,
  DAY_NAMES,
  isValidMenuItem,
  type ColumnDef,
} from './historyConstants';
import { computeColumns } from './historyExports';
import { HistoryTableCell, MergedTableCell } from './index';

interface ProductionGroup {
  process: string;
  items: { name: string; qty: number }[];
  totalQty: number;
}

interface DiscountInfo {
  sumRecPrice: number;
  targetPrice: number;
  totalCost: number;
  targetCostRatio: number;
}

const DEPT_LABELS: Record<string, string> = {
  quality: '품질',
  development: '개발',
  process: '공정',
};

const HistoryPlanTable: React.FC<{
  monthPlans: HistoricalMealPlan[];
  reviewStatusMap: Map<string, PlanReviewRecord>;
  editedKeys: Set<string>;
  originalNameMap: Map<string, string>;
  commentCounts: Map<string, number>;
  commentCache: Record<string, ReviewComment[]>;
  highlightedIngredient: string | null;
  setHighlightedIngredient: (v: string | null) => void;
  productionSummary: Map<string, ProductionGroup[]>;
  discountSummary: Map<string, DiscountInfo>;
  menuItems: MenuItem[];
  shipmentConfig: Record<string, { 화수목: number; 금토월: number }>;
  editedPlans: Map<string, { newName: string; originalName: string }>;
  getItems: (date: string, targetType: string, items: HistoricalMenuItem[]) => HistoricalMenuItem[];
  onMenuAction: (date: string, cycleType: string, targetType: string, itemIndex: number, menuName: string) => void;
  onReviewClick: (plan: HistoricalMealPlan) => void;
  onDeleteClick: (confirm: { type: 'month' | 'single'; date: string; cycleType?: string }) => void;
  onProductionCommentClick: (planKey: string, scopeKey: string, menuName: string) => void;
}> = ({
  monthPlans,
  reviewStatusMap,
  editedKeys,
  originalNameMap,
  commentCounts,
  commentCache,
  highlightedIngredient,
  setHighlightedIngredient,
  productionSummary,
  discountSummary,
  getItems,
  onMenuAction,
  onReviewClick,
  onDeleteClick,
  onProductionCommentClick,
}) => {
  const columns = useMemo(() => computeColumns(monthPlans), [monthPlans]);

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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')}(${DAY_NAMES[d.getDay()]})`;
  };
  const getColumnLabel = (col: ColumnDef): string =>
    col.type === 'standalone' ? TARGET_LABELS[col.target] || col.target : col.group.groupLabel;
  const getColumnColor = (col: ColumnDef): string =>
    col.type === 'standalone' ? TARGET_COLORS[col.target] || 'bg-stone-100 text-stone-600' : col.group.color;

  const renderDiscBadge = (dInfo: DiscountInfo | undefined, label?: string) => {
    if (!dInfo) return null;
    const priceDiff = dInfo.sumRecPrice - dInfo.targetPrice;
    const costRatio = dInfo.targetPrice > 0 ? Math.round((dInfo.totalCost / dInfo.targetPrice) * 100) : 0;
    const isOverCostRatio = dInfo.targetCostRatio > 0 && costRatio > dInfo.targetCostRatio;
    if (priceDiff === 0 && !dInfo.totalCost) return null;
    return (
      <div className="px-1 py-0.5 rounded text-[9px] space-y-0.5">
        {label && <span className="text-stone-400 text-[8px]">{label} </span>}
        {priceDiff !== 0 && (
          <div className={`${priceDiff > 0 ? 'text-red-500' : 'text-blue-500'}`}>
            <span className="text-stone-500">판매가 {dInfo.sumRecPrice.toLocaleString()}원</span>{' '}
            <span className="font-bold tabular-nums">
              ({Math.abs(priceDiff).toLocaleString()}원 {priceDiff > 0 ? '초과' : '미달'})
            </span>
          </div>
        )}
        {dInfo.totalCost > 0 && (
          <div className={isOverCostRatio ? 'text-red-500' : 'text-stone-500'}>
            원가 {dInfo.totalCost.toLocaleString()}원{' '}
            <span className={`font-bold tabular-nums ${isOverCostRatio ? 'text-red-600' : 'text-emerald-600'}`}>
              ({costRatio}%{dInfo.targetCostRatio > 0 ? `/${dInfo.targetCostRatio}%` : ''})
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
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
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${getColumnColor(col)}`}>
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
                          onDeleteClick({ type: 'single', date: plan.date, cycleType: plan.cycleType });
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
                      return (
                        <div className="flex flex-col items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onReviewClick(plan)}
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
                                  onClick={() => onProductionCommentClick(rowRKey, `PROD|${item.name}`, item.name)}
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
                          {dInfo && <div className="mb-1">{renderDiscBadge(dInfo)}</div>}
                          <HistoryTableCell
                            items={items}
                            date={plan.date}
                            targetType={col.target}
                            editedKeys={editedKeys}
                            originalNames={originalNameMap}
                            commentCounts={commentCounts}
                            allComments={commentCache[planKey] || []}
                            highlightedIngredient={highlightedIngredient}
                            onAction={(tt, ii, name) => onMenuAction(plan.date, plan.cycleType, tt, ii, name)}
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
                    const plusDiscKey = `${plan.date}-${plan.cycleType}-${col.group.plusTarget}`;
                    const baseDInfo = discountSummary.get(baseDiscKey);
                    const plusDInfo = discountSummary.get(plusDiscKey);
                    return (
                      <td key={colIdx} className="px-2 py-1.5 border-r border-stone-100 align-top">
                        {(() => {
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
                          onAction={(tt, ii, name) => onMenuAction(plan.date, plan.cycleType, tt, ii, name)}
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
  );
};

export default HistoryPlanTable;
