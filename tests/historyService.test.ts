import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadSnapshot, saveTempSnapshot, clearSnapshot } from '../services/historyService';
import type { MonthlyMealPlan, MenuItem, WeeklyCyclePlan } from '../types';
import { TargetType, MenuCategory, Season, TasteProfile } from '../types';

// ---------- helpers ----------

const makeItem = (overrides: Partial<MenuItem> = {}): MenuItem => ({
  id: `item-${Math.random().toString(36).slice(2, 7)}`,
  name: 'Test Menu',
  category: MenuCategory.SIDE,
  cost: 1000,
  recommendedPrice: 3000,
  tastes: [TasteProfile.GANJANG],
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

  // ---------- saveTempSnapshot ----------

  describe('saveTempSnapshot', () => {
    it('stores a snapshot with savedAt timestamp', () => {
      const planA = makePlan();
      const planB = makePlan({ cycleType: '금토월' });
      const snapshot = saveTempSnapshot(planA, planB, TargetType.KIDS);

      expect(snapshot.savedAt).toBeDefined();
      expect(new Date(snapshot.savedAt).getTime()).not.toBeNaN();
      expect(snapshot.target).toBe(TargetType.KIDS);
    });

    it('persists the snapshot to localStorage', () => {
      const planA = makePlan();
      const planB = makePlan({ cycleType: '금토월' });
      saveTempSnapshot(planA, planB, TargetType.KIDS);

      const raw = store['zsub_plan_snapshot'];
      expect(raw).toBeDefined();
      const parsed = JSON.parse(raw);
      expect(parsed.target).toBe(TargetType.KIDS);
      expect(parsed.planA.weeks).toHaveLength(4);
    });

    it('overwrites previous snapshot', () => {
      const planA = makePlan();
      const planB = makePlan({ cycleType: '금토월' });
      saveTempSnapshot(planA, planB, TargetType.KIDS);
      saveTempSnapshot(planA, planB, TargetType.SENIOR);

      const snapshot = loadSnapshot();
      expect(snapshot).not.toBeNull();
      expect(snapshot!.target).toBe(TargetType.SENIOR);
    });

    it('preserves plan data (planA and planB) in the stored snapshot', () => {
      const planA = makePlan();
      const planB = makePlan({ cycleType: '금토월' });
      const snapshot = saveTempSnapshot(planA, planB, TargetType.KIDS);

      expect(snapshot.planA.weeks).toHaveLength(4);
      expect(snapshot.planB.cycleType).toBe('금토월');
    });
  });

  // ---------- loadSnapshot ----------

  describe('loadSnapshot', () => {
    it('returns null when nothing is stored', () => {
      const snapshot = loadSnapshot();
      expect(snapshot).toBeNull();
    });

    it('returns stored snapshot', () => {
      const planA = makePlan();
      const planB = makePlan({ cycleType: '금토월' });
      saveTempSnapshot(planA, planB, TargetType.KIDS);

      const snapshot = loadSnapshot();
      expect(snapshot).not.toBeNull();
      expect(snapshot!.target).toBe(TargetType.KIDS);
    });

    it('returns null on corrupted JSON', () => {
      store['zsub_plan_snapshot'] = 'NOT_VALID_JSON{{{';
      const snapshot = loadSnapshot();
      expect(snapshot).toBeNull();
    });
  });

  // ---------- clearSnapshot ----------

  describe('clearSnapshot', () => {
    it('removes the snapshot from localStorage', () => {
      const planA = makePlan();
      const planB = makePlan({ cycleType: '금토월' });
      saveTempSnapshot(planA, planB, TargetType.KIDS);

      clearSnapshot();

      const snapshot = loadSnapshot();
      expect(snapshot).toBeNull();
    });

    it('is safe to call when no snapshot exists', () => {
      expect(() => clearSnapshot()).not.toThrow();
    });
  });
});
