export interface ChangeRecord {
  id: string;
  planId: string;
  weekIndex: number;
  slotIndex: number;
  previousItemId: string;
  previousItemName: string;
  newItemId: string;
  newItemName: string;
  changedAt: string;
  synced: boolean;
}

const STORAGE_KEY = 'zsub_change_log';

export function getChangeLog(): ChangeRecord[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addChange(change: Omit<ChangeRecord, 'id' | 'changedAt' | 'synced'>): ChangeRecord {
  const record: ChangeRecord = {
    ...change,
    id: `chg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    changedAt: new Date().toISOString(),
    synced: false,
  };

  const log = getChangeLog();
  log.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  return record;
}

export function getUnsyncedChanges(planId: string): ChangeRecord[] {
  return getChangeLog().filter(c => c.planId === planId && !c.synced);
}

export function markChangesSynced(changeIds: string[]): void {
  const log = getChangeLog();
  const idSet = new Set(changeIds);
  log.forEach(c => {
    if (idSet.has(c.id)) c.synced = true;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
}
