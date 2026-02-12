import type { MonthlyMealPlan, MenuItem } from '../types';

export function printMealPlan(plan: MonthlyMealPlan): void {
  const html = generatePrintHTML(plan);
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}

function generatePrintHTML(plan: MonthlyMealPlan): string {
  const weeksHTML = plan.weeks
    .map(week => {
      const itemRows = week.items
        .map(
          (item: MenuItem) =>
            `<tr>
        <td style="padding:6px 10px;border:1px solid #ddd;">${item.name}</td>
        <td style="padding:6px 10px;border:1px solid #ddd;text-align:center;">${item.category}</td>
        <td style="padding:6px 10px;border:1px solid #ddd;text-align:right;">${item.cost.toLocaleString()}원</td>
        <td style="padding:6px 10px;border:1px solid #ddd;">${item.mainIngredient}</td>
      </tr>`
        )
        .join('');

      return `
      <div style="margin-bottom:24px;">
        <h3 style="font-size:14px;margin-bottom:8px;">${week.weekIndex}주차 (원가합: ${week.totalCost.toLocaleString()}원)</h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">메뉴명</th>
              <th style="padding:6px 10px;border:1px solid #ddd;text-align:center;">분류</th>
              <th style="padding:6px 10px;border:1px solid #ddd;text-align:right;">원가</th>
              <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">주재료</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
      </div>
    `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${plan.monthLabel} ${plan.target} 식단표</title>
  <style>
    body { font-family: 'Noto Sans KR', sans-serif; padding: 40px; color: #333; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    h2 { font-size: 14px; color: #666; margin-bottom: 24px; font-weight: normal; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>${plan.monthLabel} ${plan.target} 식단표</h1>
  <h2>주기: ${plan.cycleType} | 생성일: ${new Date().toLocaleDateString('ko-KR')}</h2>
  ${weeksHTML}
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #ddd;font-size:10px;color:#999;">
    Z-SUB 식단 관리 시스템에서 생성됨
  </div>
</body>
</html>`;
}

export function exportToCSV(plan: MonthlyMealPlan): void {
  const header = '주차,메뉴명,분류,원가,판매가,주재료,태그';
  const rows = plan.weeks.flatMap(week =>
    week.items.map(
      item =>
        `${week.weekIndex},"${item.name}","${item.category}",${item.cost},${item.recommendedPrice},"${item.mainIngredient}","${item.tags.join(',')}"`
    )
  );

  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${plan.monthLabel}_${plan.target}_식단표.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
