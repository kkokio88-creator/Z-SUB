import { useState, useEffect } from 'react';
import { TargetType, IngredientColorConfig, ProductionLimitConfig, TargetTagConfig } from '../types';
import { useToast } from '../context/ToastContext';
import { checkSheetsConnection } from '../services/sheetsService';
import { checkMISHealth } from '../services/misService';
import { checkZPPSHealth } from '../services/zppsService';
import { getWebhookUrl, setWebhookUrl, sendGoogleChatNotification } from '../services/googleChatService';
import { DEFAULT_INGREDIENT_COLORS, DEFAULT_PRODUCTION_LIMITS, DEFAULT_TARGET_TAGS } from '../constants';
import { DEFAULT_AI_MANUAL } from '../components/settings/settingsConstants';

export function useSettingsState() {
  const { addToast } = useToast();

  // AI Algorithm State
  const [aiManual, setAiManual] = useState('');

  // Integration State
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [misApiUrl, setMisApiUrl] = useState('https://api.z-sub.com/v1/mis/sync');
  const [zppsApiUrl, setZppsApiUrl] = useState('https://api.z-sub.com/v1/zpps/update');
  const [googleChatWebhookUrl, setGoogleChatWebhookUrl] = useState('');

  // Shipment volume config
  const [shipmentConfig, setShipmentConfig] = useState<Record<string, { 화수목: number; 금토월: number }>>({});

  // Ingredient color config
  const [ingredientColors, setIngredientColors] = useState<IngredientColorConfig[]>([]);
  const [newIngKey, setNewIngKey] = useState('');
  const [newIngLabel, setNewIngLabel] = useState('');

  // Production limit config
  const [productionLimits, setProductionLimits] = useState<ProductionLimitConfig[]>([]);
  const [newProdCategory, setNewProdCategory] = useState('');
  const [newProdLimit, setNewProdLimit] = useState(100);

  // Target tag config
  const [targetTags, setTargetTags] = useState<TargetTagConfig[]>([]);
  const [selectedTagTarget, setSelectedTagTarget] = useState<TargetType>(TargetType.KIDS);
  const [newAllowedTag, setNewAllowedTag] = useState('');
  const [newBlockedTag, setNewBlockedTag] = useState('');
  const [newBlockedProduct, setNewBlockedProduct] = useState('');

  // Connection Test States
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({
    gemini: 'idle',
    sheets: 'idle',
    mis: 'idle',
    zpps: 'idle',
    googleChat: 'idle',
  });

  // Load settings on mount
  useEffect(() => {
    const savedManual = localStorage.getItem('zsub_ai_manual');
    const savedSheet = localStorage.getItem('zsub_sheet_url');

    if (savedManual) setAiManual(savedManual);
    else setAiManual(DEFAULT_AI_MANUAL);

    if (savedSheet) setGoogleSheetUrl(savedSheet);

    const savedWebhook = getWebhookUrl();
    if (savedWebhook) setGoogleChatWebhookUrl(savedWebhook);

    const savedShipment = localStorage.getItem('zsub_shipment_config');
    if (savedShipment) {
      try {
        setShipmentConfig(JSON.parse(savedShipment));
      } catch {
        /* ignore */
      }
    }

    const savedIngredientColors = localStorage.getItem('zsub_ingredient_colors');
    if (savedIngredientColors) {
      try {
        setIngredientColors(JSON.parse(savedIngredientColors));
      } catch {
        setIngredientColors([...DEFAULT_INGREDIENT_COLORS]);
      }
    } else {
      setIngredientColors([...DEFAULT_INGREDIENT_COLORS]);
    }

    const savedProdLimits = localStorage.getItem('zsub_production_limits');
    if (savedProdLimits) {
      try {
        setProductionLimits(JSON.parse(savedProdLimits));
      } catch {
        setProductionLimits([...DEFAULT_PRODUCTION_LIMITS]);
      }
    } else {
      setProductionLimits([...DEFAULT_PRODUCTION_LIMITS]);
    }

    const savedTargetTags = localStorage.getItem('zsub_target_tags');
    if (savedTargetTags) {
      try {
        const parsed: TargetTagConfig[] = JSON.parse(savedTargetTags);
        const validTargetValues = new Set<string>(Object.values(TargetType));
        const filtered = parsed.filter(cfg => validTargetValues.has(cfg.targetType));
        if (filtered.length !== parsed.length) {
          localStorage.setItem('zsub_target_tags', JSON.stringify(filtered));
        }
        setTargetTags(filtered);
      } catch {
        setTargetTags([...DEFAULT_TARGET_TAGS]);
      }
    } else {
      setTargetTags([...DEFAULT_TARGET_TAGS]);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('zsub_ai_manual', aiManual);
    localStorage.setItem('zsub_sheet_url', googleSheetUrl);
    localStorage.setItem('zsub_mis_url', misApiUrl);
    localStorage.setItem('zsub_zpps_url', zppsApiUrl);
    localStorage.setItem('zsub_shipment_config', JSON.stringify(shipmentConfig));
    localStorage.setItem('zsub_ingredient_colors', JSON.stringify(ingredientColors));
    localStorage.setItem('zsub_production_limits', JSON.stringify(productionLimits));
    localStorage.setItem('zsub_target_tags', JSON.stringify(targetTags));
    setWebhookUrl(googleChatWebhookUrl);

    addToast({
      type: 'success',
      title: '설정 저장 완료',
      message: '시스템 설정이 저장되었습니다. 모든 설정은 로그아웃 후에도 유지됩니다.',
    });
  };

  // ── Ingredient color helpers ──
  const moveIngredient = (index: number, direction: 'up' | 'down') => {
    const newList = [...ingredientColors];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newList.length) return;
    [newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]];
    newList.forEach((item, i) => (item.priority = i + 1));
    setIngredientColors(newList);
  };

  const updateIngredientColor = (
    index: number,
    field: keyof IngredientColorConfig,
    value: string | number | boolean
  ) => {
    setIngredientColors(prev => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const removeIngredientColor = (index: number) => {
    setIngredientColors(prev => prev.filter((_, i) => i !== index));
  };

  const addIngredientColor = () => {
    const key = newIngKey.trim();
    const label = newIngLabel.trim();
    if (!key || !label) return;
    if (ingredientColors.some(c => c.key === key)) {
      addToast({ type: 'error', title: '중복', message: '이미 존재하는 키입니다.' });
      return;
    }
    setIngredientColors(prev => [...prev, { key, label, color: 'green', priority: prev.length + 1, enabled: true }]);
    setNewIngKey('');
    setNewIngLabel('');
  };

  // ── Production limit helpers ──
  const addProductionCategory = () => {
    const trimmed = newProdCategory.trim();
    if (!trimmed) return;
    if (productionLimits.some(p => p.category === trimmed)) {
      addToast({ type: 'error', title: '중복', message: '이미 존재하는 카테고리입니다.' });
      return;
    }
    setProductionLimits(prev => [...prev, { category: trimmed, dailyLimit: newProdLimit, enabled: true }]);
    setNewProdCategory('');
    setNewProdLimit(100);
  };

  const removeProductionCategory = (index: number) => {
    setProductionLimits(prev => prev.filter((_, i) => i !== index));
  };

  const updateProductionLimit = (
    index: number,
    field: keyof ProductionLimitConfig,
    value: string | number | boolean
  ) => {
    setProductionLimits(prev => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  // ── Tag management helpers ──
  const getTagConfigForTarget = (target: TargetType): TargetTagConfig => {
    return (
      targetTags.find(t => t.targetType === target) || {
        targetType: target,
        allowedTags: [],
        blockedTags: [],
        blockedProducts: [],
      }
    );
  };

  const updateTagConfig = (target: TargetType, updater: (cfg: TargetTagConfig) => TargetTagConfig) => {
    setTargetTags(prev => {
      const exists = prev.find(t => t.targetType === target);
      if (exists) {
        return prev.map(t => (t.targetType === target ? updater(t) : t));
      }
      return [...prev, updater({ targetType: target, allowedTags: [], blockedTags: [], blockedProducts: [] })];
    });
  };

  const addAllowedTag = () => {
    const trimmed = newAllowedTag.trim();
    if (!trimmed) return;
    const cfg = getTagConfigForTarget(selectedTagTarget);
    if (cfg.allowedTags.includes(trimmed)) return;
    updateTagConfig(selectedTagTarget, c => ({ ...c, allowedTags: [...c.allowedTags, trimmed] }));
    setNewAllowedTag('');
  };

  const removeAllowedTag = (tag: string) => {
    updateTagConfig(selectedTagTarget, c => ({ ...c, allowedTags: c.allowedTags.filter(t => t !== tag) }));
  };

  const addBlockedTag = () => {
    const trimmed = newBlockedTag.trim();
    if (!trimmed) return;
    const cfg = getTagConfigForTarget(selectedTagTarget);
    if (cfg.blockedTags.includes(trimmed)) return;
    updateTagConfig(selectedTagTarget, c => ({ ...c, blockedTags: [...c.blockedTags, trimmed] }));
    setNewBlockedTag('');
  };

  const removeBlockedTag = (tag: string) => {
    updateTagConfig(selectedTagTarget, c => ({ ...c, blockedTags: c.blockedTags.filter(t => t !== tag) }));
  };

  const addBlockedProduct = () => {
    const trimmed = newBlockedProduct.trim();
    if (!trimmed) return;
    const cfg = getTagConfigForTarget(selectedTagTarget);
    if (cfg.blockedProducts.includes(trimmed)) return;
    updateTagConfig(selectedTagTarget, c => ({ ...c, blockedProducts: [...c.blockedProducts, trimmed] }));
    setNewBlockedProduct('');
  };

  const removeBlockedProduct = (product: string) => {
    updateTagConfig(selectedTagTarget, c => ({ ...c, blockedProducts: c.blockedProducts.filter(p => p !== product) }));
  };

  // ── Connection test ──
  const runConnectionTest = async (target: string) => {
    setTestStatus(prev => ({ ...prev, [target]: 'loading' }));

    try {
      let result: { connected: boolean; message: string };

      switch (target) {
        case 'gemini': {
          const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
          if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
            result = { connected: false, message: 'Gemini API 키가 설정되지 않았습니다.' };
          } else {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
              signal: AbortSignal.timeout(5000),
            });
            result = res.ok
              ? { connected: true, message: 'Gemini API 연결 성공' }
              : { connected: false, message: `Gemini API 오류: ${res.status}` };
          }
          break;
        }
        case 'sheets':
          result = await checkSheetsConnection();
          break;
        case 'mis':
          result = await checkMISHealth(misApiUrl);
          break;
        case 'zpps':
          result = await checkZPPSHealth(zppsApiUrl);
          break;
        case 'googleChat': {
          if (!googleChatWebhookUrl.trim()) {
            result = { connected: false, message: 'Google Chat 웹훅 URL이 설정되지 않았습니다.' };
          } else {
            const ok = await sendGoogleChatNotification({
              title: 'Z-SUB 연결 테스트',
              body: 'Google Chat 웹훅 연결이 정상적으로 작동합니다.',
              status: '테스트 성공',
            });
            result = ok
              ? { connected: true, message: 'Google Chat 웹훅 전송 성공' }
              : { connected: false, message: 'Google Chat 웹훅 전송 실패. URL을 확인해주세요.' };
          }
          break;
        }
        default:
          result = { connected: false, message: '알 수 없는 대상' };
      }

      setTestStatus(prev => ({ ...prev, [target]: result.connected ? 'success' : 'error' }));
      addToast({
        type: result.connected ? 'success' : 'error',
        title: `${target.toUpperCase()} 연결 테스트`,
        message: result.message,
      });
    } catch {
      setTestStatus(prev => ({ ...prev, [target]: 'error' }));
      addToast({
        type: 'error',
        title: `${target.toUpperCase()} 연결 실패`,
        message: '네트워크 오류 또는 시간 초과',
      });
    }
  };

  return {
    // Algorithm
    aiManual,
    setAiManual,
    // Integration
    googleSheetUrl,
    setGoogleSheetUrl,
    misApiUrl,
    setMisApiUrl,
    zppsApiUrl,
    setZppsApiUrl,
    googleChatWebhookUrl,
    setGoogleChatWebhookUrl,
    testStatus,
    runConnectionTest,
    // Shipment
    shipmentConfig,
    setShipmentConfig,
    // Ingredient Color
    ingredientColors,
    newIngKey,
    setNewIngKey,
    newIngLabel,
    setNewIngLabel,
    moveIngredient,
    updateIngredientColor,
    removeIngredientColor,
    addIngredientColor,
    // Production
    productionLimits,
    newProdCategory,
    setNewProdCategory,
    newProdLimit,
    setNewProdLimit,
    addProductionCategory,
    removeProductionCategory,
    updateProductionLimit,
    // Tags
    targetTags,
    selectedTagTarget,
    setSelectedTagTarget,
    newAllowedTag,
    setNewAllowedTag,
    newBlockedTag,
    setNewBlockedTag,
    newBlockedProduct,
    setNewBlockedProduct,
    getTagConfigForTarget,
    addAllowedTag,
    removeAllowedTag,
    addBlockedTag,
    removeBlockedTag,
    addBlockedProduct,
    removeBlockedProduct,
    // Save
    handleSave,
  };
}
