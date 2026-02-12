export type AuditAction =
  | 'menu.create'
  | 'menu.update'
  | 'menu.delete'
  | 'plan.generate'
  | 'plan.save'
  | 'plan.delete'
  | 'config.create'
  | 'config.update'
  | 'config.delete'
  | 'swap.execute'
  | 'sync.mis'
  | 'sync.zpps'
  | 'sync.sheets'
  | 'settings.update'
  | 'auth.login'
  | 'auth.logout';

export interface AuditEntry {
  id: string;
  action: AuditAction;
  userId: string;
  userName: string;
  entityType: string;
  entityId: string;
  entityName: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

const STORAGE_KEY = 'zsub_audit_log';
const MAX_ENTRIES = 500;

export function getAuditLog(filters?: { action?: string; search?: string; limit?: number }): AuditEntry[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  let entries: AuditEntry[] = raw ? JSON.parse(raw) : [];

  if (filters?.action) {
    entries = entries.filter(e => e.action.startsWith(filters.action!));
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    entries = entries.filter(
      e =>
        e.entityName.toLowerCase().includes(q) ||
        e.userName.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q)
    );
  }
  if (filters?.limit) {
    entries = entries.slice(0, filters.limit);
  }
  return entries;
}

export function addAuditEntry(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
  const newEntry: AuditEntry = {
    ...entry,
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  const log = getAuditLog();
  log.unshift(newEntry);
  if (log.length > MAX_ENTRIES) log.length = MAX_ENTRIES;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  return newEntry;
}

export function clearAuditLog(): void {
  localStorage.removeItem(STORAGE_KEY);
}
