import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettingsState } from '../../hooks/useSettingsState';

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('../../services/sheetsService', () => ({
  checkSheetsConnection: vi.fn().mockResolvedValue({ connected: true, message: 'ok' }),
}));

vi.mock('../../services/misService', () => ({
  checkMISHealth: vi.fn().mockResolvedValue({ connected: true, message: 'ok' }),
}));

vi.mock('../../services/zppsService', () => ({
  checkZPPSHealth: vi.fn().mockResolvedValue({ connected: true, message: 'ok' }),
}));

vi.mock('../../services/googleChatService', () => ({
  getWebhookUrl: vi.fn().mockReturnValue(''),
  setWebhookUrl: vi.fn(),
  sendGoogleChatNotification: vi.fn().mockResolvedValue(true),
}));

beforeEach(() => {
  localStorage.clear();
});

describe('useSettingsState', () => {
  it('초기 aiManual이 DEFAULT_AI_MANUAL로 설정', () => {
    const { result } = renderHook(() => useSettingsState());
    expect(result.current.aiManual).toBeTruthy();
    expect(result.current.aiManual.length).toBeGreaterThan(0);
  });

  it('setAiManual로 AI 매뉴얼 변경', () => {
    const { result } = renderHook(() => useSettingsState());
    act(() => result.current.setAiManual('새 매뉴얼'));
    expect(result.current.aiManual).toBe('새 매뉴얼');
  });

  it('handleSave가 localStorage에 저장', () => {
    const { result } = renderHook(() => useSettingsState());
    act(() => result.current.setAiManual('테스트 매뉴얼'));
    act(() => result.current.handleSave());
    expect(localStorage.getItem('zsub_ai_manual')).toBe('테스트 매뉴얼');
  });

  it('ingredientColors 추가/삭제', () => {
    const { result } = renderHook(() => useSettingsState());
    const initialCount = result.current.ingredientColors.length;

    act(() => {
      result.current.setNewIngKey('test');
      result.current.setNewIngLabel('테스트');
    });
    act(() => result.current.addIngredientColor());

    expect(result.current.ingredientColors.length).toBe(initialCount + 1);
    expect(result.current.ingredientColors[initialCount].key).toBe('test');

    act(() => result.current.removeIngredientColor(initialCount));
    expect(result.current.ingredientColors.length).toBe(initialCount);
  });

  it('productionLimits 추가/삭제', () => {
    const { result } = renderHook(() => useSettingsState());
    const initialCount = result.current.productionLimits.length;

    act(() => {
      result.current.setNewProdCategory('테스트카테고리');
      result.current.setNewProdLimit(50);
    });
    act(() => result.current.addProductionCategory());

    expect(result.current.productionLimits.length).toBe(initialCount + 1);

    act(() => result.current.removeProductionCategory(initialCount));
    expect(result.current.productionLimits.length).toBe(initialCount);
  });

  it('testStatus 초기값 모두 idle', () => {
    const { result } = renderHook(() => useSettingsState());
    expect(result.current.testStatus.gemini).toBe('idle');
    expect(result.current.testStatus.sheets).toBe('idle');
    expect(result.current.testStatus.mis).toBe('idle');
  });
});
