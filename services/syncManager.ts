// 동기화 오케스트레이션 서비스
// 앱 데이터 <-> Google Sheets 간 동기화를 관리합니다.

import { getSheetData, pushSheetData } from './sheetsService';
import { menuItemToRow, rowToMenuItem, MENU_DB_HEADERS } from './sheetsSerializer';
import { MenuItem } from '../types';

export type SyncDirection = 'push' | 'pull';
export type SyncResult = { success: boolean; rowCount: number; error?: string };

// 메뉴DB Push: App -> Sheets
export const pushMenuDB = async (menuItems: MenuItem[]): Promise<SyncResult> => {
  try {
    const rows = [MENU_DB_HEADERS, ...menuItems.map(menuItemToRow)];
    const result = await pushSheetData('메뉴DB', rows);
    return { success: result.success, rowCount: menuItems.length };
  } catch (err) {
    return { success: false, rowCount: 0, error: String(err) };
  }
};

// 메뉴DB Pull: Sheets -> App
export const pullMenuDB = async (): Promise<{ success: boolean; items: MenuItem[]; error?: string }> => {
  try {
    const data = await getSheetData('메뉴DB');
    if (!data.data || data.data.length <= 1) {
      return { success: true, items: [] };
    }
    // Skip header row
    const items = data.data.slice(1).map(rowToMenuItem);
    return { success: true, items };
  } catch (err) {
    return { success: false, items: [], error: String(err) };
  }
};

// 동기화 로그 기록
export const logSync = async (
  direction: SyncDirection,
  sheetName: string,
  rowCount: number,
  status: 'success' | 'error',
  error?: string
): Promise<void> => {
  try {
    const logRow = [new Date().toISOString(), direction, sheetName, String(rowCount), status, error || ''];
    await pushSheetData('동기화로그', [logRow]);
  } catch {
    console.error('동기화 로그 기록 실패');
  }
};
