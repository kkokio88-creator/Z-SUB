import { addAuditEntry } from './auditService';

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
  retries?: number;
}

const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function syncChangesToZPPS(changes: MenuChange[], apiUrl: string): Promise<ZPPSResult> {
  const timestamp = new Date().toISOString();

  if (changes.length === 0) {
    return { success: true, processedCount: 0, timestamp, retries: 0 };
  }

  let lastError = '';
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) await delay(RETRY_DELAY_MS * attempt);

      const response = await fetchWithTimeout(
        apiUrl,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ changes, timestamp }),
        },
        REQUEST_TIMEOUT_MS
      );

      if (!response.ok) {
        lastError = `ZPPS 서버 응답 오류: ${response.status}`;
        continue;
      }

      const result: ZPPSResult = {
        success: true,
        processedCount: changes.length,
        timestamp,
        retries: attempt,
      };

      addAuditEntry({
        action: 'sync.zpps',
        userId: 'system',
        userName: '시스템',
        entityType: 'menu_change',
        entityId: changes[0]?.planId || '',
        entityName: `${changes.length}건 메뉴 변경 연동`,
        metadata: {
          changeCount: changes.length,
          retries: attempt,
          changes: changes.map(c => ({
            from: c.previousItemName,
            to: c.newItemName,
            week: c.weekIndex,
          })),
        },
      });

      return result;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        lastError = `ZPPS 서버 응답 시간 초과 (${REQUEST_TIMEOUT_MS / 1000}초)`;
      } else {
        lastError = err instanceof Error ? err.message : 'ZPPS 연결 실패';
      }
    }
  }

  addAuditEntry({
    action: 'sync.zpps',
    userId: 'system',
    userName: '시스템',
    entityType: 'menu_change',
    entityId: changes[0]?.planId || '',
    entityName: `${changes.length}건 메뉴 변경 연동 실패`,
    metadata: { error: lastError, retries: MAX_RETRIES },
  });

  return { success: false, processedCount: 0, error: lastError, timestamp, retries: MAX_RETRIES };
}

export async function checkZPPSHealth(apiUrl: string): Promise<{ connected: boolean; message: string }> {
  try {
    const response = await fetchWithTimeout(apiUrl.replace(/\/[^/]*$/, '/health'), { method: 'GET' }, 5000);
    if (response.ok) {
      return { connected: true, message: 'ZPPS 시스템 연결 성공' };
    }
    return { connected: false, message: `ZPPS 응답 오류: ${response.status}` };
  } catch {
    return { connected: false, message: 'ZPPS 시스템에 연결할 수 없습니다.' };
  }
}
