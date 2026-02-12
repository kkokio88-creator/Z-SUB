export interface MenuChange {
  planId: string;
  weekIndex: number;
  slotIndex: number;
  previousItemId: string;
  previousItemName: string;
  newItemId: string;
  newItemName: string;
  reason?: string;
}

export interface ZPPSResult {
  success: boolean;
  processedCount: number;
  error?: string;
  timestamp: string;
}

export async function syncChangesToZPPS(changes: MenuChange[], apiUrl: string): Promise<ZPPSResult> {
  const timestamp = new Date().toISOString();

  if (changes.length === 0) {
    return { success: true, processedCount: 0, timestamp };
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes, timestamp }),
    });

    if (!response.ok) {
      return { success: false, processedCount: 0, error: `ZPPS 서버 응답 오류: ${response.status}`, timestamp };
    }

    return { success: true, processedCount: changes.length, timestamp };
  } catch (err) {
    return {
      success: false,
      processedCount: 0,
      error: err instanceof Error ? err.message : 'ZPPS 연결 실패',
      timestamp,
    };
  }
}
