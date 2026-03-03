import type { MenuItem } from '../../types';
import type { HistoricalMealPlan } from '../../types';
import type { ToastMessage } from '../../context/ToastContext';
import { autoClassifyFull, buildHistoryLookup } from '../../services/autoClassifyService';
import { pushMenuDB } from '../../services/syncManager';

interface ActionDeps {
  menuItems: MenuItem[];
  contextUpdateItem: (id: string, item: MenuItem) => void;
  addItem: (item: MenuItem) => void;
  deleteItems: (ids: string[]) => void;
  bulkUpdate: (ids: string[], changes: Partial<MenuItem>) => void;
  saveToStorage: () => void;
  addToast: (t: Omit<ToastMessage, 'id'>) => void;
}

export async function autoClassifyMenuItems(deps: ActionDeps, historicalPlans: HistoricalMealPlan[]): Promise<void> {
  const targets = deps.menuItems.filter(item => !item.isUnused);
  const historyLookup = buildHistoryLookup(historicalPlans);
  const results = autoClassifyFull(targets, historyLookup);
  if (results.length === 0) {
    deps.addToast({ type: 'info', title: '자동 분류', message: '분류 변경이 필요한 항목이 없습니다.' });
    return;
  }
  const summary = results.reduce(
    (acc, r) => {
      r.fieldsChanged.forEach(f => {
        acc[f] = (acc[f] || 0) + 1;
      });
      return acc;
    },
    {} as Record<string, number>
  );
  const summaryText = Object.entries(summary)
    .map(([field, count]) => `${field} ${count}건`)
    .join(', ');
  if (
    !window.confirm(
      `${results.length}개 메뉴에 자동 분류를 적용합니다.\n\n변경 내역: ${summaryText}\n\n적용하시겠습니까?`
    )
  )
    return;
  for (const change of results) {
    const item = deps.menuItems.find(i => i.id === change.id);
    if (!item) continue;
    const updated: Partial<MenuItem> = {};
    if (change.mainIngredient) updated.mainIngredient = change.mainIngredient;
    if (change.category) updated.category = change.category;
    if (change.cost !== undefined) updated.cost = change.cost;
    if (change.recommendedPrice !== undefined) updated.recommendedPrice = change.recommendedPrice;
    if (change.isSpicy !== undefined) updated.isSpicy = change.isSpicy;
    if (change.tags) updated.tags = change.tags;
    if (change.targetAgeGroup) updated.targetAgeGroup = change.targetAgeGroup;
    deps.contextUpdateItem(item.id, { ...item, ...updated });
  }
  deps.saveToStorage();
  const allUpdated = deps.menuItems.map(item => {
    const change = results.find(r => r.id === item.id);
    if (!change) return item;
    const updated: Partial<MenuItem> = {};
    if (change.mainIngredient) updated.mainIngredient = change.mainIngredient;
    if (change.category) updated.category = change.category;
    if (change.cost !== undefined) updated.cost = change.cost;
    if (change.recommendedPrice !== undefined) updated.recommendedPrice = change.recommendedPrice;
    if (change.isSpicy !== undefined) updated.isSpicy = change.isSpicy;
    if (change.tags) updated.tags = change.tags;
    if (change.targetAgeGroup) updated.targetAgeGroup = change.targetAgeGroup;
    return { ...item, ...updated };
  });
  try {
    const syncResult = await pushMenuDB(allUpdated);
    if (syncResult.success) {
      deps.addToast({
        type: 'success',
        title: '자동 분류 + DB 동기화 완료',
        message: `${results.length}개 메뉴 업데이트 (${summaryText}) → Sheets 반영 완료`,
      });
    } else {
      deps.addToast({
        type: 'warning',
        title: '자동 분류 완료 (DB 동기화 실패)',
        message: `로컬 ${results.length}개 업데이트 완료. Sheets 동기화 실패: ${syncResult.error}`,
      });
    }
  } catch {
    deps.addToast({
      type: 'success',
      title: '자동 분류 완료',
      message: `${results.length}개 메뉴 업데이트 (${summaryText})`,
    });
  }
}

export function cleanupMenuItems(deps: ActionDeps): void {
  const emptyNameItems = deps.menuItems.filter(i => !i.name || !i.name.trim());
  const nameMap = new Map<string, string[]>();
  const codeMap = new Map<string, string[]>();
  for (const item of deps.menuItems) {
    if (item.name && item.name.trim()) {
      const key = item.name.trim();
      if (!nameMap.has(key)) nameMap.set(key, []);
      nameMap.get(key)!.push(item.id);
    }
    if (item.code && item.code.trim()) {
      const key = item.code.trim();
      if (!codeMap.has(key)) codeMap.set(key, []);
      codeMap.get(key)!.push(item.id);
    }
  }
  const duplicateNameIds = new Set<string>();
  for (const ids of nameMap.values()) {
    if (ids.length > 1) ids.slice(1).forEach(id => duplicateNameIds.add(id));
  }
  const duplicateCodeIds = new Set<string>();
  for (const ids of codeMap.values()) {
    if (ids.length > 1) ids.slice(1).forEach(id => duplicateCodeIds.add(id));
  }
  const duplicateCount = new Set([...duplicateNameIds, ...duplicateCodeIds]).size;
  const totalToRemove = emptyNameItems.length + duplicateCount;
  if (totalToRemove === 0) {
    deps.addToast({ type: 'info', title: '데이터 정리', message: '정리할 항목이 없습니다.' });
    return;
  }
  const msg = [
    `분석 결과:`,
    emptyNameItems.length > 0 ? `- 빈 이름 항목: ${emptyNameItems.length}개` : null,
    duplicateCount > 0 ? `- 중복 항목: ${duplicateCount}개` : null,
    `\n총 ${totalToRemove}개 항목을 정리하시겠습니까?`,
  ]
    .filter(Boolean)
    .join('\n');
  if (!window.confirm(msg)) return;
  const idsToRemove = new Set([...emptyNameItems.map(i => i.id), ...duplicateNameIds, ...duplicateCodeIds]);
  deps.deleteItems(Array.from(idsToRemove));
  deps.saveToStorage();
  deps.addToast({ type: 'success', title: '정리 완료', message: `${idsToRemove.size}개 항목이 제거되었습니다.` });
}
