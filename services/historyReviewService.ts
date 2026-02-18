import type { HistoricalMealPlan, PlanReviewRecord, PlanStatus } from '../types';
import { getAllReviews } from './reviewService';

export type ReviewFilterCategory = 'all' | 'pending' | 'in_progress' | 'completed';

export const makeReviewKey = (date: string, cycleType: string): string => `${date}|${cycleType}`;

export const buildReviewStatusMap = (): Map<string, PlanReviewRecord> => {
  const reviews = getAllReviews();
  const map = new Map<string, PlanReviewRecord>();
  for (const r of reviews) {
    map.set(r.planId, r);
  }
  return map;
};

export const getFilterStatus = (status: PlanStatus | undefined): ReviewFilterCategory => {
  if (!status) return 'pending';
  switch (status) {
    case 'draft':
    case 'review_requested':
      return 'in_progress';
    case 'approved':
    case 'finalized':
      return 'completed';
    default:
      return 'pending';
  }
};

export function exportHistoricalPlanToCSV(plan: HistoricalMealPlan): void {
  const header = '날짜,주기,대상,메뉴명,원가,판매가';
  const rows = plan.targets.flatMap(t =>
    t.items.map(
      item => `"${plan.date}","${plan.cycleType}","${t.targetType}","${item.name}",${item.cost},${item.price}`
    )
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `식단_${plan.date}_${plan.cycleType}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportHistoricalPlanToPDF(plan: HistoricalMealPlan): Promise<void> {
  const html2pdf = (await import('html2pdf.js')).default;

  const targetsHTML = plan.targets
    .map(
      t => `
      <h3 style="font-size:13px;margin:12px 0 6px;">${t.targetType} (${t.items.length}품)</h3>
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead><tr style="background:#f5f5f5;">
          <th style="padding:4px 8px;border:1px solid #ddd;text-align:left;">메뉴명</th>
          <th style="padding:4px 8px;border:1px solid #ddd;text-align:right;">원가</th>
          <th style="padding:4px 8px;border:1px solid #ddd;text-align:right;">판매가</th>
        </tr></thead>
        <tbody>${t.items
          .map(
            item => `<tr>
            <td style="padding:4px 8px;border:1px solid #ddd;">${item.name}</td>
            <td style="padding:4px 8px;border:1px solid #ddd;text-align:right;">${item.cost.toLocaleString()}원</td>
            <td style="padding:4px 8px;border:1px solid #ddd;text-align:right;">${item.price.toLocaleString()}원</td>
          </tr>`
          )
          .join('')}</tbody>
      </table>`
    )
    .join('');

  const wrapper = document.createElement('div');
  wrapper.style.fontFamily = "'Noto Sans KR', sans-serif";
  wrapper.style.padding = '20px';
  wrapper.style.color = '#333';
  wrapper.innerHTML = `
    <h1 style="font-size:18px;margin-bottom:4px;">${plan.date} ${plan.cycleType} 식단표</h1>
    <p style="font-size:12px;color:#666;margin-bottom:16px;">출력일: ${new Date().toLocaleDateString('ko-KR')}</p>
    ${targetsHTML}
    <div style="margin-top:24px;padding-top:12px;border-top:1px solid #ddd;font-size:10px;color:#999;">
      Z-SUB 식단 관리 시스템에서 생성됨
    </div>`;

  html2pdf()
    .set({
      margin: [10, 10, 10, 10],
      filename: `식단_${plan.date}_${plan.cycleType}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
    })
    .from(wrapper)
    .save();
}
