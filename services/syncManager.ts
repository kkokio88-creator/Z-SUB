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

// 원본 시트(읽기 전용)와 앱 전용 사본 시트
const MENU_ORIGINAL_SHEET = '반찬';
const MENU_APP_SHEET = '반찬_APP';

// ── 메뉴DB (앱 전용 사본 시트에 저장) ──

export const pushMenuDB = async (menuItems: MenuItem[]): Promise<SyncResult> => {
  try {
    const rows = [MENU_DB_HEADERS, ...menuItems.map(menuItemToRow)];
    const result = await pushSheetData(MENU_APP_SHEET, rows);
    await logSync('push', MENU_APP_SHEET, menuItems.length, 'success');
    addSyncRecord({
      target: 'SHEETS',
      result: 'success',
      itemCount: menuItems.length,
    });
    return { success: result.success, rowCount: menuItems.length };
  } catch (err) {
    await logSync('push', MENU_APP_SHEET, 0, 'error', String(err));
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
    // 1차: 앱 전용 사본 시트에서 읽기
    const appData = await getSheetData(MENU_APP_SHEET).catch(() => null);
    if (appData?.data && appData.data.length > 1) {
      const items = appData.data
        .slice(1)
        .filter(row => row[1] && row[1].trim())
        .map((row, i) => rowToMenuItem(row, i));
      await logSync('pull', MENU_APP_SHEET, items.length, 'success');
      addSyncRecord({ target: 'SHEETS', result: 'success', itemCount: items.length });
      return { success: true, items };
    }

    // 2차: 사본이 비어있으면 원본에서 복사 후 반환
    const copied = await copyOriginalToApp();
    if (copied.success) {
      await logSync('pull', MENU_APP_SHEET, copied.items.length, 'success');
      addSyncRecord({ target: 'SHEETS', result: 'success', itemCount: copied.items.length });
      return { success: true, items: copied.items };
    }

    // 3차: 복사 실패 시 원본에서 직접 읽기 (읽기 전용 폴백)
    const origData = await getSheetData(MENU_ORIGINAL_SHEET);
    if (!origData.data || origData.data.length <= 1) {
      return { success: true, items: [] };
    }
    const items = origData.data
      .slice(1)
      .filter(row => row[1] && row[1].trim())
      .map((row, i) => rowToMenuItem(row, i));
    await logSync('pull', MENU_ORIGINAL_SHEET, items.length, 'success');
    addSyncRecord({ target: 'SHEETS', result: 'success', itemCount: items.length });
    return { success: true, items };
  } catch (err) {
    await logSync('pull', MENU_APP_SHEET, 0, 'error', String(err));
    addSyncRecord({
      target: 'SHEETS',
      result: 'error',
      itemCount: 0,
      errorMessage: String(err),
    });
    return { success: false, items: [], error: String(err) };
  }
};

// 원본 '반찬' 시트 → '반찬_APP' 시트로 초기 복사
export const copyOriginalToApp = async (): Promise<{ success: boolean; items: MenuItem[]; error?: string }> => {
  try {
    const origData = await getSheetData(MENU_ORIGINAL_SHEET);
    if (!origData.data || origData.data.length <= 1) {
      return { success: true, items: [] };
    }
    // 원본 데이터를 그대로 사본에 저장
    await pushSheetData(MENU_APP_SHEET, origData.data);
    const items = origData.data
      .slice(1)
      .filter(row => row[1] && row[1].trim())
      .map((row, i) => rowToMenuItem(row, i));
    await logSync('push', MENU_APP_SHEET, items.length, 'success');
    return { success: true, items };
  } catch (err) {
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

// ── 식단 내보내기 (양방향 동기화 - 덮어쓰기) ──

export const exportMealPlanToSheet = async (
  planA: MonthlyMealPlan,
  planB: MonthlyMealPlan,
  monthLabel: string,
  target: string
): Promise<SyncResult> => {
  try {
    const headers = ['월', '대상', '주기', '주차', '제품코드', '메뉴명', '분류', '원가', '판매가', '주재료', '태그'];
    const rows: string[][] = [];

    const addPlanRows = (plan: MonthlyMealPlan) => {
      plan.weeks.forEach(week => {
        week.items.forEach(item => {
          rows.push([
            monthLabel,
            target,
            plan.cycleType,
            String(week.weekIndex),
            item.code || '',
            item.name,
            item.category,
            String(item.cost),
            String(item.recommendedPrice),
            item.mainIngredient,
            item.tags.join(','),
          ]);
        });
      });
    };

    addPlanRows(planA);
    addPlanRows(planB);

    const result = await pushSheetData('식단_내보내기', [headers, ...rows]);
    await logSync('push', '식단_내보내기', rows.length, 'success');
    addSyncRecord({
      target: 'SHEETS',
      result: 'success',
      itemCount: rows.length,
    });
    return { success: result.success, rowCount: rows.length };
  } catch (err) {
    await logSync('push', '식단_내보내기', 0, 'error', String(err));
    addSyncRecord({
      target: 'SHEETS',
      result: 'error',
      itemCount: 0,
      errorMessage: String(err),
    });
    return { success: false, rowCount: 0, error: String(err) };
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
