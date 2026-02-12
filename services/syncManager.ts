// 동기화 오케스트레이션 서비스
// 앱 데이터 <-> Google Sheets 간 동기화를 관리합니다.

import { getSheetData, pushSheetData, appendSheetData } from './sheetsService';
import {
  menuItemToRow,
  rowToMenuItem,
  MENU_DB_HEADERS,
  configToRow,
  rowToConfig,
  CONFIG_HEADERS,
  mealPlanToRows,
  MEAL_PLAN_HEADERS,
} from './sheetsSerializer';
import { MenuItem, MealPlanConfig, MonthlyMealPlan } from '../types';
import { addSyncRecord } from './syncTracker';

export type SyncDirection = 'push' | 'pull';
export type SyncResult = {
  success: boolean;
  rowCount: number;
  error?: string;
};

// ── 메뉴DB ──

export const pushMenuDB = async (menuItems: MenuItem[]): Promise<SyncResult> => {
  try {
    const rows = [MENU_DB_HEADERS, ...menuItems.map(menuItemToRow)];
    const result = await pushSheetData('메뉴DB', rows);
    await logSync('push', '메뉴DB', menuItems.length, 'success');
    addSyncRecord({
      target: 'SHEETS',
      result: 'success',
      itemCount: menuItems.length,
    });
    return { success: result.success, rowCount: menuItems.length };
  } catch (err) {
    await logSync('push', '메뉴DB', 0, 'error', String(err));
    addSyncRecord({
      target: 'SHEETS',
      result: 'error',
      itemCount: 0,
      errorMessage: String(err),
    });
    return { success: false, rowCount: 0, error: String(err) };
  }
};

export const pullMenuDB = async (): Promise<{
  success: boolean;
  items: MenuItem[];
  error?: string;
}> => {
  try {
    const data = await getSheetData('메뉴DB');
    if (!data.data || data.data.length <= 1) {
      return { success: true, items: [] };
    }
    const items = data.data.slice(1).map(rowToMenuItem);
    await logSync('pull', '메뉴DB', items.length, 'success');
    addSyncRecord({
      target: 'SHEETS',
      result: 'success',
      itemCount: items.length,
    });
    return { success: true, items };
  } catch (err) {
    await logSync('pull', '메뉴DB', 0, 'error', String(err));
    addSyncRecord({
      target: 'SHEETS',
      result: 'error',
      itemCount: 0,
      errorMessage: String(err),
    });
    return { success: false, items: [], error: String(err) };
  }
};

// ── 식단정책 ──

export const pushPlanConfigs = async (configs: MealPlanConfig[]): Promise<SyncResult> => {
  try {
    const rows = [CONFIG_HEADERS, ...configs.map(configToRow)];
    const result = await pushSheetData('식단정책', rows);
    await logSync('push', '식단정책', configs.length, 'success');
    return { success: result.success, rowCount: configs.length };
  } catch (err) {
    await logSync('push', '식단정책', 0, 'error', String(err));
    return { success: false, rowCount: 0, error: String(err) };
  }
};

export const pullPlanConfigs = async (): Promise<{
  success: boolean;
  configs: MealPlanConfig[];
  error?: string;
}> => {
  try {
    const data = await getSheetData('식단정책');
    if (!data.data || data.data.length <= 1) {
      return { success: true, configs: [] };
    }
    const configs = data.data.slice(1).map(rowToConfig);
    await logSync('pull', '식단정책', configs.length, 'success');
    return { success: true, configs };
  } catch (err) {
    await logSync('pull', '식단정책', 0, 'error', String(err));
    return { success: false, configs: [], error: String(err) };
  }
};

// ── 식단데이터 (Push only - App에서 생성) ──

export const pushMealPlan = async (plan: MonthlyMealPlan): Promise<SyncResult> => {
  try {
    const rows = mealPlanToRows(plan);
    await appendSheetData('식단데이터', [MEAL_PLAN_HEADERS, ...rows]);
    await logSync('push', '식단데이터', rows.length, 'success');
    return { success: true, rowCount: rows.length };
  } catch (err) {
    await logSync('push', '식단데이터', 0, 'error', String(err));
    return { success: false, rowCount: 0, error: String(err) };
  }
};

// ── 구독자현황 (Pull only - Sheets에서 입력) ──

export interface SubscriberSnapshot {
  target: string;
  totalSubscribers: number;
  newSubscribers: number;
  churnRate: number;
  satisfaction: number;
  revenue: number;
  tiers: string;
  demographics: string;
  snapshotDate: string;
}

export const pullSubscribers = async (): Promise<{
  success: boolean;
  snapshots: SubscriberSnapshot[];
  error?: string;
}> => {
  try {
    const data = await getSheetData('구독자현황');
    if (!data.data || data.data.length <= 1) {
      return { success: true, snapshots: [] };
    }
    const snapshots = data.data.slice(1).map(
      (row): SubscriberSnapshot => ({
        target: row[0] || '',
        totalSubscribers: Number(row[1]) || 0,
        newSubscribers: Number(row[2]) || 0,
        churnRate: Number(row[3]) || 0,
        satisfaction: Number(row[4]) || 0,
        revenue: Number(row[5]) || 0,
        tiers: row[6] || '',
        demographics: row[7] || '',
        snapshotDate: row[8] || '',
      })
    );
    await logSync('pull', '구독자현황', snapshots.length, 'success');
    return { success: true, snapshots };
  } catch (err) {
    await logSync('pull', '구독자현황', 0, 'error', String(err));
    return { success: false, snapshots: [], error: String(err) };
  }
};

// ── 재무데이터 (Pull only - Sheets에서 입력) ──

export interface FinancialRecord {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
}

export const pullFinancials = async (): Promise<{
  success: boolean;
  records: FinancialRecord[];
  error?: string;
}> => {
  try {
    const data = await getSheetData('재무데이터');
    if (!data.data || data.data.length <= 1) {
      return { success: true, records: [] };
    }
    const records = data.data.slice(1).map(
      (row): FinancialRecord => ({
        month: row[0] || '',
        revenue: Number(row[1]) || 0,
        cost: Number(row[2]) || 0,
        profit: Number(row[3]) || 0,
      })
    );
    await logSync('pull', '재무데이터', records.length, 'success');
    return { success: true, records };
  } catch (err) {
    await logSync('pull', '재무데이터', 0, 'error', String(err));
    return { success: false, records: [], error: String(err) };
  }
};

// ── 동기화 로그 ──

export const logSync = async (
  direction: SyncDirection,
  sheetName: string,
  rowCount: number,
  status: 'success' | 'error',
  error?: string
): Promise<void> => {
  try {
    const logRow = [new Date().toISOString(), direction, sheetName, String(rowCount), status, error || ''];
    await appendSheetData('동기화로그', [logRow]);
  } catch {
    console.error('동기화 로그 기록 실패');
  }
};
