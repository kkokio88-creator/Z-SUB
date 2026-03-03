import { TargetType } from '../../types';
import type { HistoricalMealPlan, MenuItem } from '../../types';
import type { ToastMessage } from '../../context/ToastContext';
import type { SyncStatus, SyncDirection } from '../../context/SheetsContext';
import { TARGET_LABELS } from '../../constants';
import { normalizeMenuName } from '../../services/menuUtils';
import { pushSheetData } from '../../services/sheetsService';
import {
  TARGET_MERGE_MAP,
  STANDALONE_TARGETS,
  PROCESS_ORDER,
  isValidMenuItem,
  parseMenuItem,
  type ColumnDef,
} from './historyConstants';

export function computeColumns(monthPlans: HistoricalMealPlan[]): ColumnDef[] {
  const targetSet = new Set<string>();
  for (const plan of monthPlans) {
    for (const target of plan.targets) targetSet.add(target.targetType);
  }
  const result: ColumnDef[] = [];
  const usedTargets = new Set<string>();
  for (const group of TARGET_MERGE_MAP) {
    if (targetSet.has(group.baseTarget) || targetSet.has(group.plusTarget)) {
      result.push({ type: 'merged', group });
      usedTargets.add(group.baseTarget);
      usedTargets.add(group.plusTarget);
    }
  }
  for (const target of STANDALONE_TARGETS) {
    if (targetSet.has(target) && !usedTargets.has(target)) {
      result.push({ type: 'standalone', target });
      usedTargets.add(target);
    }
  }
  for (const t of targetSet) {
    if (!usedTargets.has(t)) result.push({ type: 'standalone', target: t as TargetType });
  }
  return result;
}

interface ConsolidatedItem {
  menuName: string;
  code?: string;
  process: string;
  totalQty: number;
  byTarget: Record<string, number>;
}

export function buildPlanCSV(monthPlans: HistoricalMealPlan[], columns: ColumnDef[]): string {
  const targetLabels = columns.map(col =>
    col.type === 'standalone' ? TARGET_LABELS[col.target] || col.target : col.group.groupLabel
  );
  const header = '날짜,주기,' + targetLabels.join(',');
  const rows: string[] = [];
  for (const plan of monthPlans) {
    const targetMap = new Map(plan.targets.map(t => [t.targetType, t]));
    const cells = columns.map(col => {
      if (col.type === 'standalone') {
        const target = targetMap.get(col.target);
        if (!target) return '';
        const names = target.items.map(item => item.name).filter(n => n && n.trim());
        return `"${names.join('/')}"`;
      } else {
        const baseTarget = targetMap.get(col.group.baseTarget);
        const plusTarget = targetMap.get(col.group.plusTarget);
        const names = [
          ...(baseTarget ? baseTarget.items.map(item => item.name).filter(n => n && n.trim()) : []),
          ...(plusTarget ? plusTarget.items.map(item => item.name).filter(n => n && n.trim()) : []),
        ];
        return `"${names.join('/')}"`;
      }
    });
    rows.push(`${plan.date},"${plan.cycleType}",${cells.join(',')}`);
  }
  return [header, ...rows].join('\n');
}

export function buildDetailCSV(monthPlans: HistoricalMealPlan[]): string {
  const header = '날짜,주기,식단유형,메뉴명,공정,판매가,원가';
  const rows: string[] = [];
  for (const plan of monthPlans) {
    for (const target of plan.targets) {
      for (const item of target.items) {
        if (!item.name || !item.name.trim()) continue;
        const proc = item.name.includes('_반조리')
          ? '반조리'
          : item.name.includes('_냉장')
            ? '냉장'
            : item.name.includes('_냉동')
              ? '냉동'
              : '';
        const cleanName = normalizeMenuName(item.name);
        rows.push(
          `${plan.date},"${plan.cycleType}","${TARGET_LABELS[target.targetType] || target.targetType}","${cleanName}","${proc}",${item.price},${item.cost}`
        );
      }
    }
  }
  return [header, ...rows].join('\n');
}

export function buildProductionCSV(consolidatedProduction: ConsolidatedItem[]): string {
  const header = '메뉴명,제품코드,공정,총생산수량';
  const rows: string[] = [];
  let lastProcess = '';
  for (const item of consolidatedProduction) {
    if (item.process !== lastProcess) {
      if (lastProcess) {
        const groupTotal = consolidatedProduction
          .filter(i => i.process === lastProcess)
          .reduce((s, i) => s + i.totalQty, 0);
        rows.push(`"${lastProcess} 소계","","${lastProcess}",${groupTotal}`);
      }
      lastProcess = item.process;
    }
    rows.push(`"${item.menuName}","${item.code ?? ''}","${item.process}",${item.totalQty}`);
  }
  if (lastProcess) {
    const groupTotal = consolidatedProduction
      .filter(i => i.process === lastProcess)
      .reduce((s, i) => s + i.totalQty, 0);
    rows.push(`"${lastProcess} 소계","","${lastProcess}",${groupTotal}`);
  }
  rows.push(`"합계","","",${consolidatedProduction.reduce((s, i) => s + i.totalQty, 0)}`);
  return [header, ...rows].join('\n');
}

export function buildSheetsRows(monthPlans: HistoricalMealPlan[]): string[][] {
  const rows: string[][] = [];
  for (const plan of monthPlans) {
    for (const target of plan.targets) {
      for (const item of target.items) {
        if (!item.name || !item.name.trim()) continue;
        rows.push([
          plan.date,
          plan.cycleType,
          TARGET_LABELS[target.targetType] || target.targetType,
          item.name,
          String(item.price),
          String(item.cost),
        ]);
      }
    }
  }
  return rows;
}

export type ProcessGroup = { process: string; items: { name: string; qty: number }[]; totalQty: number };

export function computeProductionSummary(
  monthPlans: HistoricalMealPlan[],
  shipmentConfig: Record<string, { 화수목: number; 금토월: number }>,
  menuLookup: Map<string, MenuItem>,
  detectProcessFn: (name: string, menu?: MenuItem) => string
): Map<string, ProcessGroup[]> {
  const result = new Map<string, ProcessGroup[]>();
  for (const plan of monthPlans) {
    const key = `${plan.date}-${plan.cycleType}`;
    const menuQty = new Map<string, number>();
    const menuProcess = new Map<string, string>();
    for (const target of plan.targets) {
      const volume = shipmentConfig[target.targetType]?.[plan.cycleType as '화수목' | '금토월'] || 0;
      if (volume === 0) continue;
      for (const item of target.items) {
        if (!isValidMenuItem(item.name)) continue;
        const { cleanName } = parseMenuItem(item.name);
        menuQty.set(cleanName, (menuQty.get(cleanName) || 0) + volume);
        if (!menuProcess.has(cleanName))
          menuProcess.set(cleanName, detectProcessFn(item.name, menuLookup.get(cleanName)));
      }
    }
    const processGroups = new Map<string, { name: string; qty: number }[]>();
    for (const [name, qty] of menuQty) {
      const process = menuProcess.get(name) || '기타';
      if (!processGroups.has(process)) processGroups.set(process, []);
      processGroups.get(process)!.push({ name, qty });
    }
    const groups = PROCESS_ORDER.filter(p => processGroups.has(p)).map(p => {
      const items = processGroups.get(p)!.sort((a, b) => b.qty - a.qty);
      return { process: p, items, totalQty: items.reduce((s, i) => s + i.qty, 0) };
    });
    result.set(key, groups);
  }
  return result;
}

// --- Export action helpers (extracted from MealPlanHistory) ---

interface ExportDeps {
  monthPlans: HistoricalMealPlan[];
  viewYear: number;
  viewMonth: number;
  viewMode: string;
  columns: ColumnDef[];
  consolidatedProduction: ConsolidatedItem[];
  addToast: (t: Omit<ToastMessage, 'id'>) => void;
  setSyncStatus: (name: string, status: SyncStatus, direction?: SyncDirection, error?: string) => void;
}

export function doExportCSV(deps: ExportDeps): void {
  if (deps.monthPlans.length === 0) return;
  const suffix =
    deps.viewMode === 'ingredient'
      ? '재료검토'
      : deps.viewMode === 'distribution'
        ? '현장배포'
        : deps.viewMode === 'production'
          ? '생산통합'
          : '식단표';
  let csv: string;
  if (deps.viewMode === 'plan') csv = buildPlanCSV(deps.monthPlans, deps.columns);
  else if (deps.viewMode === 'ingredient' || deps.viewMode === 'distribution') csv = buildDetailCSV(deps.monthPlans);
  else csv = buildProductionCSV(deps.consolidatedProduction);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `식단히스토리_${deps.viewYear}년${deps.viewMonth + 1}월_${suffix}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function doExportPDF(
  contentRef: React.RefObject<HTMLDivElement | null>,
  viewYear: number,
  viewMonth: number
): Promise<void> {
  if (!contentRef.current) return;
  const html2pdf = (await import('html2pdf.js')).default;
  const opt = {
    margin: [10, 10, 10, 10] as [number, number, number, number],
    filename: `식단히스토리_${viewYear}년${viewMonth + 1}월.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { orientation: 'landscape' as const, unit: 'mm' as const, format: 'a4' as const } as const,
  };
  html2pdf().set(opt).from(contentRef.current).save();
}

export async function doExportGoogleSheets(deps: ExportDeps): Promise<void> {
  if (deps.monthPlans.length === 0) {
    deps.addToast({ type: 'error', title: '내보내기 실패', message: '내보낼 식단 데이터가 없습니다.' });
    return;
  }
  const sheetName = `식단_히스토리_${deps.viewYear}년${deps.viewMonth + 1}월`;
  deps.setSyncStatus(sheetName, 'syncing', 'push');
  try {
    const headers = ['날짜', '주기', '식단유형', '메뉴명', '판매가', '원가'];
    const rows = buildSheetsRows(deps.monthPlans);
    const result = await pushSheetData(sheetName, [headers, ...rows]);
    if (result.success) {
      deps.setSyncStatus(sheetName, 'success', 'push');
      deps.addToast({
        type: 'success',
        title: '시트 내보내기 완료',
        message: `${rows.length}건을 "${sheetName}" 시트에 내보냈습니다.`,
      });
    } else {
      throw new Error(result.message || '시트 쓰기 실패');
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    deps.setSyncStatus(sheetName, 'error', 'push', errMsg);
    deps.addToast({ type: 'error', title: '시트 내보내기 실패', message: errMsg });
  }
}

export function computeConsolidatedProduction(
  monthPlans: HistoricalMealPlan[],
  shipmentConfig: Record<string, { 화수목: number; 금토월: number }>,
  menuLookup: Map<string, MenuItem>,
  detectProcessFn: (name: string, menu?: MenuItem) => string
): ConsolidatedItem[] {
  const result = new Map<string, ConsolidatedItem>();
  for (const plan of monthPlans) {
    for (const target of plan.targets) {
      const volume = shipmentConfig[target.targetType]?.[plan.cycleType as '화수목' | '금토월'] || 0;
      if (volume === 0) continue;
      for (const item of target.items) {
        if (!isValidMenuItem(item.name)) continue;
        const { cleanName } = parseMenuItem(item.name);
        const existing = result.get(cleanName);
        if (existing) {
          existing.totalQty += volume;
          existing.byTarget[target.targetType] = (existing.byTarget[target.targetType] || 0) + volume;
        } else {
          result.set(cleanName, {
            menuName: cleanName,
            code: item.code,
            process: detectProcessFn(item.name, menuLookup.get(cleanName)),
            totalQty: volume,
            byTarget: { [target.targetType]: volume },
          });
        }
      }
    }
  }
  const items = [...result.values()];
  const processOrder = new Map(PROCESS_ORDER.map((p, i) => [p, i]));
  return items.sort((a, b) => {
    const pa = processOrder.get(a.process) ?? 999;
    const pb = processOrder.get(b.process) ?? 999;
    if (pa !== pb) return pa - pb;
    return b.totalQty - a.totalQty;
  });
}
