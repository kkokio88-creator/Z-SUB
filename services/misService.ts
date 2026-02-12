import type { MonthlyMealPlan } from '../types';
import { addAuditEntry } from './auditService';

export interface MISRegistrationResult {
  success: boolean;
  registrationId?: string;
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

export async function registerToMIS(plan: MonthlyMealPlan, apiUrl: string): Promise<MISRegistrationResult> {
  const timestamp = new Date().toISOString();

  const payload = {
    planId: plan.id,
    monthLabel: plan.monthLabel,
    target: plan.target,
    cycleType: plan.cycleType,
    weeks: plan.weeks.map(w => ({
      weekIndex: w.weekIndex,
      items: w.items.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        cost: item.cost,
        code: item.code || '',
      })),
      totalCost: w.totalCost,
    })),
  };

  let lastError = '';
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) await delay(RETRY_DELAY_MS * attempt);

      const response = await fetchWithTimeout(
        apiUrl,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        REQUEST_TIMEOUT_MS
      );

      if (!response.ok) {
        lastError = `MIS 서버 응답 오류: ${response.status}`;
        continue;
      }

      const data = await response.json();
      const result: MISRegistrationResult = {
        success: true,
        registrationId: data.registrationId || plan.id,
        timestamp,
        retries: attempt,
      };

      addAuditEntry({
        action: 'sync.mis',
        userId: 'system',
        userName: '시스템',
        entityType: 'meal_plan',
        entityId: plan.id,
        entityName: `${plan.target} ${plan.monthLabel} ${plan.cycleType}`,
        metadata: { registrationId: result.registrationId, retries: attempt },
      });

      return result;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        lastError = `MIS 서버 응답 시간 초과 (${REQUEST_TIMEOUT_MS / 1000}초)`;
      } else {
        lastError = err instanceof Error ? err.message : 'MIS 연결 실패';
      }
    }
  }

  addAuditEntry({
    action: 'sync.mis',
    userId: 'system',
    userName: '시스템',
    entityType: 'meal_plan',
    entityId: plan.id,
    entityName: `${plan.target} ${plan.monthLabel} ${plan.cycleType}`,
    metadata: { error: lastError, retries: MAX_RETRIES },
  });

  return { success: false, error: lastError, timestamp, retries: MAX_RETRIES };
}

export async function checkMISHealth(apiUrl: string): Promise<{ connected: boolean; message: string }> {
  try {
    const response = await fetchWithTimeout(apiUrl.replace(/\/[^/]*$/, '/health'), { method: 'GET' }, 5000);
    if (response.ok) {
      return { connected: true, message: 'MIS 시스템 연결 성공' };
    }
    return { connected: false, message: `MIS 응답 오류: ${response.status}` };
  } catch {
    return { connected: false, message: 'MIS 시스템에 연결할 수 없습니다.' };
  }
}
