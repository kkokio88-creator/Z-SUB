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
  rowsToHistoricalPlans,
} from './sheetsSerializer';
import { MenuItem, MealPlanConfig, MonthlyMealPlan, HistoricalMealPlan } from '../types';
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
    const result = await pushSheetData('반찬', rows);
    await logSync('push', '반찬', menuItems.length, 'success');
    addSyncRecord({
      target: 'SHEETS',
      result: 'success',
      itemCount: menuItems.length,
    });
    return { success: result.success, rowCount: menuItems.length };
  } catch (err) {
    await logSync('push', '반찬', 0, 'error', String(err));
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
    const data = await getSheetData('반찬');
    if (!data.data || data.data.length <= 1) {
      return { success: true, items: [] };
    }
    const items = data.data.slice(1).map((row, i) => rowToMenuItem(row, i));
    await logSync('pull', '반찬', items.length, 'success');
    addSyncRecord({
      target: 'SHEETS',
      result: 'success',
      itemCount: items.length,
    });
    return { success: true, items };
  } catch (err) {
    await logSync('pull', '반찬', 0, 'error', String(err));
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
    await appendSheetData('식단_히스토리', [MEAL_PLAN_HEADERS, ...rows]);
    await logSync('push', '식단_히스토리', rows.length, 'success');
    return { success: true, rowCount: rows.length };
  } catch (err) {
    await logSync('push', '식단_히스토리', 0, 'error', String(err));
    return { success: false, rowCount: 0, error: String(err) };
  }
};

// ── 식단데이터 (Pull - 히스토리 로드) ──

export const pullHistoricalPlans = async (): Promise<{
  success: boolean;
  plans: HistoricalMealPlan[];
  error?: string;
}> => {
  try {
    const data = await getSheetData('식단_히스토리');
    if (!data.data || data.data.length <= 1) {
      return { success: true, plans: [] };
    }
    const plans = rowsToHistoricalPlans(data.data);
    await logSync('pull', '식단_히스토리', plans.length, 'success');
    return { success: true, plans };
  } catch (err) {
    await logSync('pull', '식단_히스토리', 0, 'error', String(err));
    return { success: false, plans: [], error: String(err) };
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
    // 동기화로그 시트 미존재 시 무시
  }
};
