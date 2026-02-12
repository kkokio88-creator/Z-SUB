export type SyncTarget = 'MIS' | 'ZPPS' | 'SHEETS';
export type SyncResult = 'success' | 'error' | 'partial';

export interface SyncRecord {
  id: string;
  target: SyncTarget;
  result: SyncResult;
  itemCount: number;
  errorMessage?: string;
  timestamp: string;
}

const STORAGE_KEY = 'zsub_sync_log';
const MAX_RECORDS = 200;

export function getSyncLog(): SyncRecord[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addSyncRecord(record: Omit<SyncRecord, 'id' | 'timestamp'>): SyncRecord {
  const newRecord: SyncRecord = {
    ...record,
    id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  const log = getSyncLog();
  log.unshift(newRecord);
  if (log.length > MAX_RECORDS) log.length = MAX_RECORDS;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  return newRecord;
}

export function clearSyncLog(): void {
  localStorage.removeItem(STORAGE_KEY);
}
