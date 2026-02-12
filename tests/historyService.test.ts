import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadHistory, saveVersion, deleteVersion, getVersions, diffPlans } from '../services/historyService';
import type { MonthlyMealPlan, MenuItem, WeeklyCyclePlan } from '../types';
import { TargetType, MenuCategory, Season, TasteProfile } from '../types';

// ---------- helpers ----------

const makeItem = (overrides: Partial<MenuItem> = {}): MenuItem => ({
  id: `item-${Math.random().toString(36).slice(2, 7)}`,
  name: 'Test Menu',
  category: MenuCategory.SIDE,
  cost: 1000,
  recommendedPrice: 3000,
  tastes: [TasteProfile.BLAND],
  season: Season.ALL,
  tags: [],
  isSpicy: false,
  mainIngredient: 'vegetable',
  ...overrides,
});

const makeWeek = (weekIndex: number, items: MenuItem[]): WeeklyCyclePlan => ({
  weekIndex,
  items,
  totalCost: items.reduce((s, i) => s + i.cost, 0),
  totalPrice: items.reduce((s, i) => s + i.recommendedPrice, 0),
  isValid: true,
  warnings: [],
});

const makePlan = (overrides: Partial<MonthlyMealPlan> = {}): MonthlyMealPlan => {
  const items = [makeItem({ id: 'a' }), makeItem({ id: 'b' }), makeItem({ id: 'c' })];
  return {
    id: 'plan-1',
    monthLabel: '3월',
    cycleType: '화수목',
    target: TargetType.KIDS,
    weeks: [makeWeek(1, items), makeWeek(2, items), makeWeek(3, items), makeWeek(4, items)],
    ...overrides,
  };
};

describe('historyService', () => {
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

  const baseVersionInput = {
    planId: 'plan-1',
    label: 'v1',
    target: TargetType.KIDS,
    status: 'draft' as const,
    planA: makePlan(),
    planB: makePlan({ cycleType: '금토월' }),
  };

  // ---------- saveVersion ----------

  describe('saveVersion', () => {
    it('stores a plan version with auto-generated id and savedAt', () => {
      const version = saveVersion(baseVersionInput);

      expect(version.id).toBeDefined();
      expect(version.id).toMatch(/^ver_/);
      expect(version.savedAt).toBeDefined();
      expect(new Date(version.savedAt).getTime()).not.toBeNaN();
      expect(version.planId).toBe('plan-1');
      expect(version.label).toBe('v1');
    });

    it('persists the version to localStorage', () => {
      saveVersion(baseVersionInput);

      const raw = store['zsub_plan_history'];
      expect(raw).toBeDefined();
      const parsed = JSON.parse(raw);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].planId).toBe('plan-1');
    });

    it('prepends new versions (most recent first)', () => {
      saveVersion({ ...baseVersionInput, label: 'first' });
      saveVersion({ ...baseVersionInput, label: 'second' });

      const history = loadHistory();
      expect(history[0].label).toBe('second');
      expect(history[1].label).toBe('first');
    });

    it('preserves plan data (planA and planB) in the stored version', () => {
      const version = saveVersion(baseVersionInput);

      expect(version.planA.weeks).toHaveLength(4);
      expect(version.planB.cycleType).toBe('금토월');
    });

    it('enforces maximum of 20 versions', () => {
      const existing = Array.from({ length: 20 }, (_, i) => ({
        id: `ver_existing_${i}`,
        savedAt: new Date().toISOString(),
        ...baseVersionInput,
        label: `existing-${i}`,
      }));
      store['zsub_plan_history'] = JSON.stringify(existing);

      saveVersion({ ...baseVersionInput, label: 'overflow' });

      const history = loadHistory();
      expect(history).toHaveLength(20);
      expect(history[0].label).toBe('overflow');
    });
  });

  // ---------- loadHistory ----------

  describe('loadHistory', () => {
    it('returns empty array when nothing is stored', () => {
      const history = loadHistory();
      expect(history).toEqual([]);
    });

    it('returns all saved versions', () => {
      saveVersion({ ...baseVersionInput, label: 'v1' });
      saveVersion({ ...baseVersionInput, label: 'v2' });

      const history = loadHistory();
      expect(history).toHaveLength(2);
    });

    it('returns empty array on corrupted JSON', () => {
      store['zsub_plan_history'] = 'NOT_VALID_JSON{{{';
      const history = loadHistory();
      expect(history).toEqual([]);
    });
  });

  // ---------- getVersions ----------

  describe('getVersions', () => {
    it('filters versions by planId', () => {
      saveVersion({ ...baseVersionInput, planId: 'plan-1', label: 'p1-v1' });
      saveVersion({ ...baseVersionInput, planId: 'plan-2', label: 'p2-v1' });
      saveVersion({ ...baseVersionInput, planId: 'plan-1', label: 'p1-v2' });

      const versions = getVersions('plan-1');
      expect(versions).toHaveLength(2);
      expect(versions.every(v => v.planId === 'plan-1')).toBe(true);
    });

    it('returns empty array when planId has no matches', () => {
      saveVersion(baseVersionInput);
      const versions = getVersions('nonexistent');
      expect(versions).toEqual([]);
    });
  });

  // ---------- deleteVersion ----------

  describe('deleteVersion', () => {
    it('removes a specific version by planId and versionId', () => {
      const v1 = saveVersion({ ...baseVersionInput, label: 'to-keep' });
      const v2 = saveVersion({ ...baseVersionInput, label: 'to-delete' });

      deleteVersion('plan-1', v2.id);

      const history = loadHistory();
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe(v1.id);
      expect(history[0].label).toBe('to-keep');
    });

    it('does not remove versions from a different planId', () => {
      const v1 = saveVersion({ ...baseVersionInput, planId: 'plan-1' });
      saveVersion({ ...baseVersionInput, planId: 'plan-2' });

      deleteVersion('plan-2', v1.id);

      const history = loadHistory();
      expect(history).toHaveLength(2);
    });

    it('is safe to call with a non-existent versionId', () => {
      saveVersion(baseVersionInput);

      expect(() => deleteVersion('plan-1', 'nonexistent')).not.toThrow();
      expect(loadHistory()).toHaveLength(1);
    });
  });

  // ---------- diffPlans ----------

  describe('diffPlans', () => {
    it('returns empty diff when plans are identical', () => {
      const plan = makePlan();
      const diffs = diffPlans(plan, plan);
      expect(diffs).toHaveLength(0);
    });

    it('detects added items', () => {
      const planA = makePlan();
      const newItem = makeItem({ id: 'new-item' });
      const planB: MonthlyMealPlan = {
        ...planA,
        weeks: planA.weeks.map((w, i) => (i === 0 ? { ...w, items: [...w.items, newItem] } : w)),
      };

      const diffs = diffPlans(planA, planB);
      expect(diffs.length).toBeGreaterThanOrEqual(1);

      const week1Diff = diffs.find(d => d.weekIndex === 1);
      expect(week1Diff).toBeDefined();
      expect(week1Diff!.added).toHaveLength(1);
      expect(week1Diff!.added[0].id).toBe('new-item');
      expect(week1Diff!.removed).toHaveLength(0);
    });

    it('detects removed items', () => {
      const planA = makePlan();
      const planB: MonthlyMealPlan = {
        ...planA,
        weeks: planA.weeks.map((w, i) => (i === 0 ? { ...w, items: w.items.slice(1) } : w)),
      };

      const diffs = diffPlans(planA, planB);
      expect(diffs.length).toBeGreaterThanOrEqual(1);

      const week1Diff = diffs.find(d => d.weekIndex === 1);
      expect(week1Diff).toBeDefined();
      expect(week1Diff!.removed).toHaveLength(1);
      expect(week1Diff!.removed[0].id).toBe('a');
    });

    it('detects both added and removed items in one diff entry', () => {
      const planA = makePlan();
      const replacementItem = makeItem({ id: 'replacement' });
      const planB: MonthlyMealPlan = {
        ...planA,
        weeks: planA.weeks.map((w, i) => (i === 0 ? { ...w, items: [w.items[0], replacementItem, w.items[2]] } : w)),
      };

      const diffs = diffPlans(planA, planB);
      const week1Diff = diffs.find(d => d.weekIndex === 1);
      expect(week1Diff).toBeDefined();
      expect(week1Diff!.removed.some(i => i.id === 'b')).toBe(true);
      expect(week1Diff!.added.some(i => i.id === 'replacement')).toBe(true);
    });

    it('detects changes across multiple weeks independently', () => {
      const planA = makePlan();
      const newItemW1 = makeItem({ id: 'new-w1' });
      const newItemW3 = makeItem({ id: 'new-w3' });
      const planB: MonthlyMealPlan = {
        ...planA,
        weeks: planA.weeks.map((w, i) => {
          if (i === 0) return { ...w, items: [...w.items, newItemW1] };
          if (i === 2) return { ...w, items: [...w.items, newItemW3] };
          return w;
        }),
      };

      const diffs = diffPlans(planA, planB);
      expect(diffs).toHaveLength(2);
      expect(diffs.map(d => d.weekIndex).sort()).toEqual([1, 3]);
    });

    it('ignores weeks that only exist in planA but not planB', () => {
      const planA = makePlan();
      const planB: MonthlyMealPlan = {
        ...planA,
        weeks: planA.weeks.slice(0, 2),
      };

      const diffs = diffPlans(planA, planB);
      expect(diffs).toBeDefined();
    });

    it('always sets cycle field to A', () => {
      const planA = makePlan();
      const planB: MonthlyMealPlan = {
        ...planA,
        weeks: planA.weeks.map((w, i) => (i === 0 ? { ...w, items: [...w.items, makeItem({ id: 'extra' })] } : w)),
      };

      const diffs = diffPlans(planA, planB);
      diffs.forEach(d => expect(d.cycle).toBe('A'));
    });
  });
});
