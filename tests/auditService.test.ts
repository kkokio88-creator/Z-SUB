import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addAuditEntry, getAuditLog, clearAuditLog, type AuditAction, type AuditEntry } from '../services/auditService';

describe('auditService', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => store[key] ?? null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      store[key] = value;
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => {
      delete store[key];
    });
  });

  const baseEntry = {
    action: 'menu.create' as AuditAction,
    userId: 'user-1',
    userName: 'Alice',
    entityType: 'menu',
    entityId: 'item-1',
    entityName: '소고기볶음',
  };

  // ---------- addAuditEntry ----------

  describe('addAuditEntry', () => {
    it('creates an entry with auto-generated id and timestamp', () => {
      const entry = addAuditEntry(baseEntry);

      expect(entry.id).toBeDefined();
      expect(entry.id).toMatch(/^audit_/);
      expect(entry.timestamp).toBeDefined();
      expect(new Date(entry.timestamp).getTime()).not.toBeNaN();
      expect(entry.action).toBe('menu.create');
      expect(entry.userName).toBe('Alice');
      expect(entry.entityName).toBe('소고기볶음');
    });

    it('persists the entry to localStorage', () => {
      addAuditEntry(baseEntry);

      const raw = store['zsub_audit_log'];
      expect(raw).toBeDefined();
      const parsed: AuditEntry[] = JSON.parse(raw);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].entityName).toBe('소고기볶음');
    });

    it('prepends new entries (most recent first)', () => {
      addAuditEntry({ ...baseEntry, entityName: 'first' });
      addAuditEntry({ ...baseEntry, entityName: 'second' });

      const log = getAuditLog();
      expect(log[0].entityName).toBe('second');
      expect(log[1].entityName).toBe('first');
    });

    it('stores optional before/after fields', () => {
      const entry = addAuditEntry({
        ...baseEntry,
        before: { cost: 1000 },
        after: { cost: 2000 },
      });

      expect(entry.before).toEqual({ cost: 1000 });
      expect(entry.after).toEqual({ cost: 2000 });
    });

    it('stores optional metadata field', () => {
      const entry = addAuditEntry({
        ...baseEntry,
        metadata: { source: 'import' },
      });

      expect(entry.metadata).toEqual({ source: 'import' });
    });

    it('enforces maximum of 500 entries', () => {
      const existingEntries: AuditEntry[] = Array.from({ length: 500 }, (_, i) => ({
        id: `audit_existing_${i}`,
        timestamp: new Date().toISOString(),
        ...baseEntry,
        entityName: `item-${i}`,
      }));
      store['zsub_audit_log'] = JSON.stringify(existingEntries);

      addAuditEntry({ ...baseEntry, entityName: 'overflow' });

      const log = getAuditLog();
      expect(log).toHaveLength(500);
      expect(log[0].entityName).toBe('overflow');
    });
  });

  // ---------- getAuditLog ----------

  describe('getAuditLog', () => {
    it('returns empty array when no entries exist', () => {
      const log = getAuditLog();
      expect(log).toEqual([]);
    });

    it('returns all entries when no filters are given', () => {
      addAuditEntry({ ...baseEntry, action: 'menu.create' });
      addAuditEntry({ ...baseEntry, action: 'plan.save' });
      addAuditEntry({ ...baseEntry, action: 'config.update' });

      const log = getAuditLog();
      expect(log).toHaveLength(3);
    });

    it('filters by action prefix', () => {
      addAuditEntry({ ...baseEntry, action: 'menu.create' });
      addAuditEntry({ ...baseEntry, action: 'menu.update' });
      addAuditEntry({ ...baseEntry, action: 'plan.save' });

      const menuLog = getAuditLog({ action: 'menu' });
      expect(menuLog).toHaveLength(2);
      expect(menuLog.every(e => e.action.startsWith('menu'))).toBe(true);
    });

    it('filters by exact action', () => {
      addAuditEntry({ ...baseEntry, action: 'menu.create' });
      addAuditEntry({ ...baseEntry, action: 'menu.update' });

      const createLog = getAuditLog({ action: 'menu.create' });
      expect(createLog).toHaveLength(1);
      expect(createLog[0].action).toBe('menu.create');
    });

    it('filters by search term against entityName', () => {
      addAuditEntry({ ...baseEntry, entityName: '소고기볶음' });
      addAuditEntry({ ...baseEntry, entityName: '김치찌개' });

      const log = getAuditLog({ search: '소고기' });
      expect(log).toHaveLength(1);
      expect(log[0].entityName).toBe('소고기볶음');
    });

    it('filters by search term against userName (case-insensitive)', () => {
      addAuditEntry({ ...baseEntry, userName: 'Alice' });
      addAuditEntry({ ...baseEntry, userName: 'Bob' });

      const log = getAuditLog({ search: 'alice' });
      expect(log).toHaveLength(1);
      expect(log[0].userName).toBe('Alice');
    });

    it('filters by search term against action', () => {
      addAuditEntry({ ...baseEntry, action: 'menu.create' });
      addAuditEntry({ ...baseEntry, action: 'plan.save' });

      const log = getAuditLog({ search: 'plan' });
      expect(log).toHaveLength(1);
      expect(log[0].action).toBe('plan.save');
    });

    it('limits results', () => {
      addAuditEntry({ ...baseEntry, entityName: 'a' });
      addAuditEntry({ ...baseEntry, entityName: 'b' });
      addAuditEntry({ ...baseEntry, entityName: 'c' });

      const log = getAuditLog({ limit: 2 });
      expect(log).toHaveLength(2);
    });

    it('applies action filter and limit together', () => {
      addAuditEntry({ ...baseEntry, action: 'menu.create' });
      addAuditEntry({ ...baseEntry, action: 'menu.update' });
      addAuditEntry({ ...baseEntry, action: 'menu.delete' });
      addAuditEntry({ ...baseEntry, action: 'plan.save' });

      const log = getAuditLog({ action: 'menu', limit: 2 });
      expect(log).toHaveLength(2);
      expect(log.every(e => e.action.startsWith('menu'))).toBe(true);
    });
  });

  // ---------- clearAuditLog ----------

  describe('clearAuditLog', () => {
    it('removes all entries from localStorage', () => {
      addAuditEntry(baseEntry);
      addAuditEntry(baseEntry);
      expect(getAuditLog()).toHaveLength(2);

      clearAuditLog();

      expect(getAuditLog()).toHaveLength(0);
      expect(store['zsub_audit_log']).toBeUndefined();
    });

    it('is safe to call when log is already empty', () => {
      expect(() => clearAuditLog()).not.toThrow();
      expect(getAuditLog()).toHaveLength(0);
    });
  });
});
