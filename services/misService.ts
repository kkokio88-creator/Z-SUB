import type { MonthlyMealPlan } from '../types';

export interface MISRegistrationResult {
  success: boolean;
  registrationId?: string;
  error?: string;
  timestamp: string;
}

export async function registerToMIS(plan: MonthlyMealPlan, apiUrl: string): Promise<MISRegistrationResult> {
  const timestamp = new Date().toISOString();

  try {
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

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { success: false, error: `MIS 서버 응답 오류: ${response.status}`, timestamp };
    }

    const data = await response.json();
    return { success: true, registrationId: data.registrationId || plan.id, timestamp };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'MIS 연결 실패',
      timestamp,
    };
  }
}
