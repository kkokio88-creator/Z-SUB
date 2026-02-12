// Google Sheets HTTP 클라이언트
// Vite 미들웨어 프록시(/api/sheets/*)를 통해 통신합니다.

export interface SheetData {
  sheetName: string;
  data: string[][];
  message?: string;
}

export interface SheetWriteResult {
  sheetName: string;
  success: boolean;
  message?: string;
}

export interface SheetStatus {
  connected: boolean;
  message: string;
}

const BASE_URL = '/api/sheets';

export const checkSheetsConnection = async (): Promise<SheetStatus> => {
  try {
    const res = await fetch(`${BASE_URL}/status`);
    return await res.json();
  } catch {
    return { connected: false, message: '서버에 연결할 수 없습니다.' };
  }
};

export const getSheetData = async (sheetName: string): Promise<SheetData> => {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(sheetName)}`);
  if (!res.ok) throw new Error(`Failed to fetch sheet: ${sheetName}`);
  return await res.json();
};

export const pushSheetData = async (sheetName: string, data: string[][]): Promise<SheetWriteResult> => {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(sheetName)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error(`Failed to push to sheet: ${sheetName}`);
  return await res.json();
};

export const appendSheetData = async (sheetName: string, rows: string[][]): Promise<SheetWriteResult> => {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(sheetName)}/append`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows }),
  });
  if (!res.ok) throw new Error(`Failed to append to sheet: ${sheetName}`);
  return await res.json();
};
