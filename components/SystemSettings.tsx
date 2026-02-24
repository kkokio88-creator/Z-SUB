import React, { useState, useEffect } from 'react';
import {
  Save,
  BrainCircuit,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
  Server,
  Activity,
  Settings,
  BarChart3,
  Palette,
  Factory,
  Tags,
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
} from 'lucide-react';
import PlanManagement from './PlanManagement';
import { TargetType, IngredientColorConfig, ProductionLimitConfig, TargetTagConfig } from '../types';
import { useToast } from '../context/ToastContext';
import { checkSheetsConnection } from '../services/sheetsService';
import { checkMISHealth } from '../services/misService';
import { checkZPPSHealth } from '../services/zppsService';
import {
  DEFAULT_INGREDIENT_COLORS,
  INGREDIENT_COLOR_MAP,
  DEFAULT_PRODUCTION_LIMITS,
  DEFAULT_TARGET_TAGS,
} from '../constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

const SystemSettings: React.FC = () => {
  const { addToast } = useToast();
  const [activeSection, setActiveSection] = useState<
    'algorithm' | 'integration' | 'policy' | 'shipment' | 'ingredient' | 'production' | 'tags'
  >('algorithm');

  // AI Algorithm State
  const [aiManual, setAiManual] = useState('');

  // Integration State
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [misApiUrl, setMisApiUrl] = useState('https://api.z-sub.com/v1/mis/sync');
  const [zppsApiUrl, setZppsApiUrl] = useState('https://api.z-sub.com/v1/zpps/update');

  // Shipment volume config
  const [shipmentConfig, setShipmentConfig] = useState<Record<string, { 화수목: number; 금토월: number }>>({});

  // Ingredient color config
  const [ingredientColors, setIngredientColors] = useState<IngredientColorConfig[]>([]);

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
  const [newIngKey, setNewIngKey] = useState('');
  const [newIngLabel, setNewIngLabel] = useState('');

  // Connection Test States
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({
    gemini: 'idle',
    sheets: 'idle',
    mis: 'idle',
    zpps: 'idle',
  });

  // Load settings on mount
  useEffect(() => {
    const savedManual = localStorage.getItem('zsub_ai_manual');
    const savedSheet = localStorage.getItem('zsub_sheet_url');

    if (savedManual) setAiManual(savedManual);
    else {
      setAiManual(`━━━ 제1장. 대원칙 (모든 식단 공통) ━━━

[1-1. 영양 균형]
- 한 주(1사이클) 내 단백질원은 최소 3종 이상 분산할 것. (예: 소고기, 생선, 두부)
- 동일 주재료가 한 주에 2회를 초과하지 말 것. (채소류 제외)
- 주간 4주 전체에서 소고기·한돈·닭·생선·두부의 출현 비율을 균등하게 유지할 것.

[1-2. 제철·계절 반영]
- 제철 식재료를 매주 최소 2개 이상 포함할 것.
- 여름: 냉국/냉채 우선, 겨울: 탕/전골 우선으로 계절감을 반영할 것.
- 봄(3~5월): 냉이, 달래, 두릅, 미나리 등 봄나물 적극 활용.
- 여름(6~8월): 오이, 열무, 애호박, 옥수수 등 수분감 있는 식재료 활용.
- 가을(9~11월): 버섯, 고구마, 밤, 배추 등 가을 수확물 활용.
- 겨울(12~2월): 시래기, 무, 콩나물, 김장김치 등 활용.

[1-3. 조리법 다양성]
- 튀김류는 주 1회를 초과하지 말 것.
- 한 주 내 동일 조리법(볶음, 조림, 무침 등)이 3회 이상 반복되지 않도록 할 것.
- 국/찌개 내에서도 된장 베이스, 맑은 장국, 매운탕 등을 번갈아 배치할 것.

[1-4. 색감·시각 조화]
- 붉은색(고추장/매운양념), 초록색(나물/채소), 노란색(계란/튀김), 갈색(조림/볶음), 흰색(두부/생선)의 색감이 한 끼에 최소 3색 이상 조합될 것.
- 전체가 갈색 계열로만 구성되는 "단색 식단"을 금지할 것.

[1-5. 식재료 중복 방지]
- 전주 사용된 주재료는 다음 주에 사용하지 않도록 우선 회피할 것.
- 60일 내 사용된 메뉴는 1차 제외, 30일 내 사용 메뉴는 2차 제외 기준 적용.
- 같은 배송 주기(화수목/금토월) 내에서 식재료 중복을 최소화할 것.
- 서로 다른 식단 타겟 간에도 동일 주차에 같은 주재료가 집중되지 않도록 분산할 것.

[1-6. 유사 메뉴 회피]
- 이름이 유사한 메뉴(예: 된장찌개↔된장국)는 같은 주에 편성하지 말 것.
- 같은 주재료 + 같은 조리법 조합은 같은 주에 배치 금지.

━━━ 제2장. 타겟별 특이사항 ━━━

[2-1. 아이/유아/어린이 식단]
- 매운맛 전면 배제. 고추장, 청양고추, 고춧가루 일절 사용 금지.
- 간장·소금·참기름 베이스의 순한 양념 위주로 구성.
- 생선은 가시 100% 제거된 순살만 사용.
- 파, 마늘은 입자가 보이지 않을 정도로 곱게 다져 조리.
- 아이 선호 메뉴(돈까스, 함박, 계란말이, 떡갈비 등) 매주 1개 이상 포함.
- 질긴 식감 재료(우엉, 오징어, 건어물 등) 사용 자제.

[2-2. 시니어/건강한 시니어 식단]
- 질긴 식감 재료 사용 자제. 부드러운 조리법(찜, 조림, 탕) 우선.
- 건강한 시니어는 '부드러움' 태그 필수. 나트륨 과다 메뉴 주의.

[2-3. 청소연구소 식단]
- 젊은 층 선호 메뉴(볶음밥, 카레, 파스타, 덮밥 등) 적극 반영.
- 매운맛 허용하되 극매운맛(마라, 불닭)은 주 1회 이내.

[2-4. 가족 식단]
- 전 연령대가 함께 먹을 수 있는 보편적 메뉴 위주.
- 국/찌개 2종 + 메인 2종 구성이므로 맛 프로필이 겹치지 않도록 할 것.

[2-5. 실속 식단]
- 원가 효율 최우선. 고가 식재료 빈도 최소화, 계절 식재료 적극 활용.

[2-6. 골고루 반찬 식단]
- 국/찌개 없이 메인 1 + 밑반찬 5 구성. 반찬 간 조리법 모두 다르게 배치.

[2-7. 첫만남 식단]
- 호감도 높은 대중적 메뉴 위주. 매운맛 배제, 호불호 식재료 배제.

━━━ 제3장. 원가·가격 정책 ━━━

[3-1. 원가율 관리]
- 모든 식단의 원가율은 30% 이내 목표.

[3-2. 단품합산 가격 범위]
- 단품합산 가격이 정책가의 100%~110% 범위 내에 있도록 할 것.

[3-3. 4주 균등 배분]
- 고가 메뉴가 특정 주에 몰리지 않도록 4주 균등 배분.

━━━ 제4장. 생산·공정 고려사항 ━━━

[4-1. 대량 조리 적합성]
- 튀김류는 눅눅해짐, 생야채 샐러드는 시들음 등 대량 조리 품질 유지 주의.
- 냉장 국물류 일 생산 한도 500개, 반조리 일 생산 한도 300개 이내.

[4-2. 포장·배송 적합성]
- 냉장·냉동·반조리 혼합 배송 시 보관 온도대 호환성 확인.

━━━ 제5장. 맛 프로필 밸런스 ━━━

[5-1. 주간 맛 조합]
- 한 주 내 매운맛/느끼함/짭짤함/달콤함/담백함 중 최소 3가지 포함.
- 짭짤한 메뉴 2개 이상 연속 금지.

━━━ 제6장. 금지사항 ━━━

- 미사용(isUnused) 처리된 메뉴 편성 금지.
- bannedTags 해당 메뉴 편성 금지.
- 호불호 극심한 식재료(간, 천엽, 번데기 등) 전 타겟 자제.`);
    }

    if (savedSheet) setGoogleSheetUrl(savedSheet);

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
        setTargetTags(JSON.parse(savedTargetTags));
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

    addToast({
      type: 'success',
      title: '설정 저장 완료',
      message: '시스템 설정이 저장되었습니다. 모든 설정은 로그아웃 후에도 유지됩니다.',
    });
  };

  // ── Ingredient color helpers ──
  const COLOR_OPTIONS = ['red', 'pink', 'amber', 'blue', 'yellow', 'orange', 'lime', 'teal', 'violet', 'green'];

  const moveIngredient = (index: number, direction: 'up' | 'down') => {
    const newList = [...ingredientColors];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newList.length) return;
    [newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]];
    // 우선순위 재계산
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading':
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-2 h-2 rounded-full bg-stone-300"></div>;
    }
  };

  return (
    <div className="flex h-full gap-6">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden flex flex-col h-full">
        <div className="p-5 border-b border-stone-100 bg-stone-50">
          <h3 className="font-bold text-stone-800">시스템 설정</h3>
          <p className="text-xs text-stone-500 mt-1">AI 튜닝 및 외부 시스템 연동</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          <Button
            variant="ghost"
            onClick={() => setActiveSection('algorithm')}
            className={`w-full justify-start px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${activeSection === 'algorithm' ? 'bg-purple-50 text-purple-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}
          >
            <BrainCircuit className="w-4 h-4" /> AI 구성 매뉴얼
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveSection('integration')}
            className={`w-full justify-start px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${activeSection === 'integration' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}
          >
            <Server className="w-4 h-4" /> 시스템 연동 (API)
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveSection('policy')}
            className={`w-full justify-start px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${activeSection === 'policy' ? 'bg-green-50 text-green-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}
          >
            <Settings className="w-4 h-4" /> 식단 정책
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveSection('shipment')}
            className={`w-full justify-start px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${activeSection === 'shipment' ? 'bg-orange-50 text-orange-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}
          >
            <BarChart3 className="w-4 h-4" /> 출고량 설정
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveSection('ingredient')}
            className={`w-full justify-start px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${activeSection === 'ingredient' ? 'bg-rose-50 text-rose-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}
          >
            <Palette className="w-4 h-4" /> 주재료 컬러링
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveSection('production')}
            className={`w-full justify-start px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${activeSection === 'production' ? 'bg-cyan-50 text-cyan-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}
          >
            <Factory className="w-4 h-4" /> 생산 한도
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveSection('tags')}
            className={`w-full justify-start px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${activeSection === 'tags' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}
          >
            <Tags className="w-4 h-4" /> 태그 관리
          </Button>
        </nav>
        <div className="p-4 border-t border-stone-100 text-center">
          <div className="text-[10px] text-stone-400">Z-SUB System v2.5.0</div>
          <div className="text-[10px] text-stone-300 mt-1">설정값 유지됨</div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-white rounded-xl border border-stone-200 shadow-sm flex flex-col">
        <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/30">
          <div>
            <h2 className="text-xl font-bold text-stone-800">
              {activeSection === 'algorithm' && 'AI 식단 구성 매뉴얼'}
              {activeSection === 'integration' && '외부 시스템 및 데이터 연동'}
              {activeSection === 'policy' && '식단 정책 및 구성 설정'}
              {activeSection === 'shipment' && '출고량 시뮬레이션 설정'}
              {activeSection === 'ingredient' && '주재료 컬러링 우선순위'}
              {activeSection === 'production' && '생산 한도 설정'}
              {activeSection === 'tags' && '식단별 태그 관리'}
            </h2>
            <p className="text-sm text-stone-500 mt-1">
              {activeSection === 'algorithm' && 'AI가 식단을 생성할 때 반드시 준수해야 할 자연어 규칙을 설정합니다.'}
              {activeSection === 'integration' && 'MIS, ZPPS 및 구글 시트와의 실시간 데이터 동기화 상태를 관리합니다.'}
              {activeSection === 'policy' &&
                '기본 식단과 파생된 옵션 상품을 그룹별로 관리하고, 원가율 정책을 수립합니다.'}
              {activeSection === 'shipment' && '식단 유형별 평균 출고량을 설정하여 생산수량 시뮬레이션에 활용합니다.'}
              {activeSection === 'ingredient' && '주재료별 색상과 우선순위를 설정하여 식단표 시각화에 활용합니다.'}
              {activeSection === 'production' && '카테고리별 일일 생산 한도를 설정하여 생산 계획에 반영합니다.'}
              {activeSection === 'tags' && '식단 유형별 허용/차단 태그와 제품명을 관리합니다.'}
            </p>
          </div>
          {activeSection !== 'policy' && (
            <Button onClick={handleSave}>
              <Save className="w-4 h-4" /> 설정 저장
            </Button>
          )}
        </div>

        <div className={`flex-1 overflow-y-auto ${activeSection === 'policy' ? 'p-0' : 'p-8'}`}>
          {/* 1. Algorithm Section */}
          {activeSection === 'algorithm' && (
            <div className="space-y-6 max-w-4xl h-full flex flex-col">
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 flex gap-3 items-start">
                <BrainCircuit className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-purple-900 text-sm">자연어 프롬프트 모드</h4>
                  <p className="text-xs text-purple-700 mt-1">
                    복잡한 수치 설정 대신, 영양사님께서 후임자에게 인수인계 하듯이 상세한 규칙을 글로 적어주세요. AI가
                    문맥을 이해하고 반영합니다.
                  </p>
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                <Label className="block mb-2">식단 생성 가이드라인</Label>
                <textarea
                  value={aiManual}
                  onChange={e => setAiManual(e.target.value)}
                  className="flex-1 w-full min-h-[400px] p-4 text-sm border-stone-300 rounded-xl focus:ring-purple-500 focus:border-purple-500 font-mono leading-relaxed resize-none bg-stone-50 focus:bg-white transition-colors"
                  placeholder="예: 아이 식단에는 매운 재료(고춧가루, 청양고추)를 절대 사용하지 마세요..."
                />
                <p className="text-right text-xs text-stone-400 mt-2">{aiManual.length} 자</p>
              </div>
            </div>
          )}

          {/* 2. Policy Section */}
          {activeSection === 'policy' && <PlanManagement />}

          {/* 3. Integration Section */}
          {activeSection === 'integration' && (
            <div className="space-y-8 max-w-3xl">
              {/* Gemini Status */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <BrainCircuit className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-stone-800">Google Gemini API</h4>
                        <div className="text-xs text-stone-500">지능형 식단 생성 및 검수 엔진</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => runConnectionTest('gemini')} className="text-xs">
                      {getStatusIcon(testStatus.gemini)} 연결 테스트
                    </Button>
                  </div>
                  <div className="bg-stone-50 p-3 rounded text-xs font-mono text-stone-600 flex justify-between">
                    <span>API_KEY: ************************** (환경변수)</span>
                    <span className="text-green-600 font-bold">활성</span>
                  </div>
                </CardContent>
              </Card>

              {/* Google Sheets */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <FileSpreadsheet className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-stone-800">구글 시트 (Google Sheets) 연동</h4>
                        <div className="text-xs text-stone-500">식단 데이터 백업 및 실시간 공유</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => runConnectionTest('sheets')} className="text-xs">
                      {getStatusIcon(testStatus.sheets)} 연결 테스트
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>스프레드시트 주소 (URL)</Label>
                    <Input
                      type="text"
                      value={googleSheetUrl}
                      onChange={e => setGoogleSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Legacy Systems (MIS & ZPPS) */}
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
                <CardContent className="p-5">
                  <div className="mb-6">
                    <h4 className="font-bold text-stone-800 flex items-center gap-2">
                      <Server className="w-5 h-5 text-orange-500" /> 기간계 시스템 연동 (Legacy)
                    </h4>
                    <p className="text-xs text-stone-500 mt-1">MIS(경영정보) 및 ZPPS(생산관리) 시스템 연동 설정</p>
                  </div>

                  <div className="space-y-6">
                    {/* MIS */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label>MIS 식단 등록 API</Label>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => runConnectionTest('mis')}
                          className="text-[10px] underline text-blue-600 flex items-center gap-1 h-auto p-0"
                        >
                          {getStatusIcon(testStatus.mis)} 연결 테스트
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-stone-300 bg-stone-50 text-stone-500 text-xs">
                          POST
                        </span>
                        <Input
                          type="text"
                          value={misApiUrl}
                          onChange={e => setMisApiUrl(e.target.value)}
                          className="flex-1 font-mono"
                        />
                      </div>
                    </div>

                    {/* ZPPS */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label>ZPPS 변경/대체 연동 API</Label>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => runConnectionTest('zpps')}
                          className="text-[10px] underline text-blue-600 flex items-center gap-1 h-auto p-0"
                        >
                          {getStatusIcon(testStatus.zpps)} 연결 테스트
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-stone-300 bg-stone-50 text-stone-500 text-xs">
                          PUT
                        </span>
                        <Input
                          type="text"
                          value={zppsApiUrl}
                          onChange={e => setZppsApiUrl(e.target.value)}
                          className="flex-1 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-stone-100">
                    <div className="flex items-center gap-2 text-xs text-orange-700 bg-orange-50 p-2 rounded">
                      <Activity className="w-4 h-4" />
                      <span>ZPPS 연동은 메뉴 교체(Swap) 발생 시에만 트리거됩니다.</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 4. Shipment Section */}
          {activeSection === 'shipment' && (
            <div className="space-y-6 max-w-3xl">
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 flex gap-3 items-start">
                <BarChart3 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-orange-900 text-sm">출고량 시뮬레이션</h4>
                  <p className="text-xs text-orange-700 mt-1">
                    식단 유형별 평균 출고량(식수)을 입력하면, 히스토리 탭에서 메뉴별 예상 생산수량을 확인할 수 있습니다.
                  </p>
                </div>
              </div>

              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600">식단 유형</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-stone-600">화수목 (식)</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-stone-600">금토월 (식)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {Object.values(TargetType).map(target => (
                      <tr key={target} className="hover:bg-emerald-50/40">
                        <td className="px-4 py-2.5 text-xs font-medium text-stone-700">
                          {target.replace(/ 식단$/, '')}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Input
                            type="number"
                            min="0"
                            value={shipmentConfig[target]?.['화수목'] || 0}
                            onChange={e => {
                              const val = parseInt(e.target.value) || 0;
                              setShipmentConfig(prev => ({
                                ...prev,
                                [target]: { 화수목: val, 금토월: prev[target]?.['금토월'] || 0 },
                              }));
                            }}
                            className="w-20 text-center"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Input
                            type="number"
                            min="0"
                            value={shipmentConfig[target]?.['금토월'] || 0}
                            onChange={e => {
                              const val = parseInt(e.target.value) || 0;
                              setShipmentConfig(prev => ({
                                ...prev,
                                [target]: { 화수목: prev[target]?.['화수목'] || 0, 금토월: val },
                              }));
                            }}
                            className="w-20 text-center"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-stone-400">
                * 설정한 출고량은 히스토리 탭의 &quot;생산수량&quot; 열에서 메뉴별 예상 생산량 계산에 사용됩니다.
              </p>
            </div>
          )}

          {/* 5. Ingredient Color Section */}
          {activeSection === 'ingredient' && (
            <div className="space-y-6 max-w-3xl">
              <div className="bg-rose-50 p-4 rounded-lg border border-rose-100 flex gap-3 items-start">
                <Palette className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-rose-900 text-sm">주재료별 컬러 우선순위</h4>
                  <p className="text-xs text-rose-700 mt-1">
                    식단표에서 주재료에 따른 색상 표시 우선순위를 설정합니다. 위/아래 버튼으로 순서를 변경하세요.
                  </p>
                </div>
              </div>

              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 w-12">순서</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600">재료명</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-stone-600">색상</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-stone-600">우선순위</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-stone-600">활성화</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-stone-600 w-24">이동</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-stone-600 w-16">삭제</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {ingredientColors.map((item, index) => {
                      const colorStyle = INGREDIENT_COLOR_MAP[item.color];
                      return (
                        <tr key={item.key} className={`hover:bg-stone-50/60 ${!item.enabled ? 'opacity-50' : ''}`}>
                          <td className="px-4 py-2.5 text-xs text-stone-500 font-mono">{index + 1}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              {colorStyle && <div className={`w-3 h-3 rounded-full ${colorStyle.dot}`}></div>}
                              <input
                                type="text"
                                value={item.label}
                                onChange={e => updateIngredientColor(index, 'label', e.target.value)}
                                className="text-sm font-medium text-stone-800 bg-transparent border-none focus:ring-1 focus:ring-rose-400 rounded px-1 py-0.5 w-20"
                              />
                              <span className="text-xs text-stone-400">({item.key})</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <select
                              value={item.color}
                              onChange={e => updateIngredientColor(index, 'color', e.target.value)}
                              className="text-xs border border-stone-200 rounded-md px-2 py-1.5 bg-white focus:ring-1 focus:ring-rose-400"
                            >
                              {COLOR_OPTIONS.map(c => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <Input
                              type="number"
                              min="1"
                              value={item.priority}
                              onChange={e => updateIngredientColor(index, 'priority', parseInt(e.target.value) || 1)}
                              className="w-16 text-center"
                            />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => updateIngredientColor(index, 'enabled', !item.enabled)}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${item.enabled ? 'bg-rose-500' : 'bg-stone-300'}`}
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${item.enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`}
                              />
                            </button>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <div className="flex gap-1 justify-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveIngredient(index, 'up')}
                                disabled={index === 0}
                                className="h-7 w-7 p-0"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveIngredient(index, 'down')}
                                disabled={index === ingredientColors.length - 1}
                                className="h-7 w-7 p-0"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setIngredientColors(prev => prev.filter((_, i) => i !== index));
                              }}
                              className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Card>
                <CardContent className="p-4">
                  <Label className="block mb-3 text-sm font-semibold text-stone-700">새 주재료 추가</Label>
                  <div className="flex gap-3 items-end">
                    <div className="w-24">
                      <Label className="text-xs text-stone-500 mb-1 block">키</Label>
                      <Input
                        type="text"
                        value={newIngKey}
                        onChange={e => setNewIngKey(e.target.value)}
                        placeholder="예: shrimp"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-stone-500 mb-1 block">표시명</Label>
                      <Input
                        type="text"
                        value={newIngLabel}
                        onChange={e => setNewIngLabel(e.target.value)}
                        placeholder="예: 새우"
                      />
                    </div>
                    <Button
                      onClick={() => {
                        const key = newIngKey.trim();
                        const label = newIngLabel.trim();
                        if (!key || !label) return;
                        if (ingredientColors.some(c => c.key === key)) {
                          addToast({ type: 'error', title: '중복', message: '이미 존재하는 키입니다.' });
                          return;
                        }
                        setIngredientColors(prev => [
                          ...prev,
                          { key, label, color: 'green', priority: prev.length + 1, enabled: true },
                        ]);
                        setNewIngKey('');
                        setNewIngLabel('');
                      }}
                      className="shrink-0"
                    >
                      <Plus className="w-4 h-4" /> 추가
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <p className="text-xs text-stone-400">
                * 우선순위가 낮은 숫자일수록 식단표에서 먼저 적용됩니다. 비활성화된 재료는 컬러링에서 제외됩니다.
              </p>
            </div>
          )}

          {/* 6. Production Limit Section */}
          {activeSection === 'production' && (
            <div className="space-y-6 max-w-3xl">
              <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-100 flex gap-3 items-start">
                <Factory className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-cyan-900 text-sm">카테고리별 생산 한도</h4>
                  <p className="text-xs text-cyan-700 mt-1">
                    카테고리별 일일 생산 한도를 설정합니다. 한도를 초과하는 메뉴 배치 시 경고가 표시됩니다.
                  </p>
                </div>
              </div>

              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600">카테고리</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-stone-600">일일 한도</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-stone-600">활성화</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-stone-600 w-16">삭제</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {productionLimits.map((item, index) => (
                      <tr
                        key={`${item.category}-${index}`}
                        className={`hover:bg-stone-50/60 ${!item.enabled ? 'opacity-50' : ''}`}
                      >
                        <td className="px-4 py-2.5 text-sm font-medium text-stone-800">{item.category}</td>
                        <td className="px-4 py-2 text-center">
                          <Input
                            type="number"
                            min="0"
                            value={item.dailyLimit}
                            onChange={e => updateProductionLimit(index, 'dailyLimit', parseInt(e.target.value) || 0)}
                            className="w-24 text-center"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => updateProductionLimit(index, 'enabled', !item.enabled)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${item.enabled ? 'bg-cyan-500' : 'bg-stone-300'}`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${item.enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProductionCategory(index)}
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 새 카테고리 추가 */}
              <Card>
                <CardContent className="p-4">
                  <Label className="block mb-3 text-sm font-semibold text-stone-700">새 카테고리 추가</Label>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Label className="text-xs text-stone-500 mb-1 block">카테고리명</Label>
                      <Input
                        type="text"
                        value={newProdCategory}
                        onChange={e => setNewProdCategory(e.target.value)}
                        placeholder="예: 냉동, 상온"
                        onKeyDown={e => e.key === 'Enter' && addProductionCategory()}
                      />
                    </div>
                    <div className="w-32">
                      <Label className="text-xs text-stone-500 mb-1 block">일일 한도</Label>
                      <Input
                        type="number"
                        min="0"
                        value={newProdLimit}
                        onChange={e => setNewProdLimit(parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <Button onClick={addProductionCategory} className="shrink-0">
                      <Plus className="w-4 h-4" /> 추가
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <p className="text-xs text-stone-400">
                * 생산 한도는 식단 편성 시 카테고리별 총 생산량을 제한하는 데 사용됩니다.
              </p>
            </div>
          )}

          {/* 7. Tag Management Section */}
          {activeSection === 'tags' && (
            <div className="space-y-6 max-w-3xl">
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 flex gap-3 items-start">
                <Tags className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-indigo-900 text-sm">식단별 태그 관리</h4>
                  <p className="text-xs text-indigo-700 mt-1">
                    식단 유형별로 허용/차단 태그와 제외할 제품명을 설정합니다.
                  </p>
                </div>
              </div>

              {/* 식단 선택 드롭다운 */}
              <div>
                <Label className="block mb-2 text-sm font-semibold text-stone-700">식단 유형 선택</Label>
                <select
                  value={selectedTagTarget}
                  onChange={e => setSelectedTagTarget(e.target.value as TargetType)}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
                >
                  {Object.values(TargetType).map(target => (
                    <option key={target} value={target}>
                      {target}
                    </option>
                  ))}
                </select>
              </div>

              {/* 허용 태그 */}
              <Card>
                <CardContent className="p-4">
                  <Label className="block mb-3 text-sm font-semibold text-green-700">허용 태그</Label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {getTagConfigForTarget(selectedTagTarget).allowedTags.length === 0 && (
                      <span className="text-xs text-stone-400">설정된 허용 태그가 없습니다.</span>
                    )}
                    {getTagConfigForTarget(selectedTagTarget).allowedTags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium"
                      >
                        {tag}
                        <button onClick={() => removeAllowedTag(tag)} className="hover:text-green-900">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newAllowedTag}
                      onChange={e => setNewAllowedTag(e.target.value)}
                      placeholder="새 허용 태그 입력"
                      className="flex-1"
                      onKeyDown={e => e.key === 'Enter' && addAllowedTag()}
                    />
                    <Button variant="outline" size="sm" onClick={addAllowedTag} className="shrink-0">
                      <Plus className="w-4 h-4" /> 추가
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 차단 태그 */}
              <Card>
                <CardContent className="p-4">
                  <Label className="block mb-3 text-sm font-semibold text-red-700">차단 태그</Label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {getTagConfigForTarget(selectedTagTarget).blockedTags.length === 0 && (
                      <span className="text-xs text-stone-400">설정된 차단 태그가 없습니다.</span>
                    )}
                    {getTagConfigForTarget(selectedTagTarget).blockedTags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium"
                      >
                        {tag}
                        <button onClick={() => removeBlockedTag(tag)} className="hover:text-red-900">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newBlockedTag}
                      onChange={e => setNewBlockedTag(e.target.value)}
                      placeholder="새 차단 태그 입력"
                      className="flex-1"
                      onKeyDown={e => e.key === 'Enter' && addBlockedTag()}
                    />
                    <Button variant="outline" size="sm" onClick={addBlockedTag} className="shrink-0">
                      <Plus className="w-4 h-4" /> 추가
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 차단 제품명 */}
              <Card>
                <CardContent className="p-4">
                  <Label className="block mb-3 text-sm font-semibold text-orange-700">차단 제품명</Label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {getTagConfigForTarget(selectedTagTarget).blockedProducts.length === 0 && (
                      <span className="text-xs text-stone-400">설정된 차단 제품명이 없습니다.</span>
                    )}
                    {getTagConfigForTarget(selectedTagTarget).blockedProducts.map(product => (
                      <span
                        key={product}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium"
                      >
                        {product}
                        <button onClick={() => removeBlockedProduct(product)} className="hover:text-orange-900">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newBlockedProduct}
                      onChange={e => setNewBlockedProduct(e.target.value)}
                      placeholder="예: 원더스푼"
                      className="flex-1"
                      onKeyDown={e => e.key === 'Enter' && addBlockedProduct()}
                    />
                    <Button variant="outline" size="sm" onClick={addBlockedProduct} className="shrink-0">
                      <Plus className="w-4 h-4" /> 추가
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <p className="text-xs text-stone-400">
                * 태그 설정은 AI 식단 생성 시 메뉴 필터링에 반영됩니다. 차단 제품명에 포함된 키워드가 있는 메뉴는 해당
                식단에서 제외됩니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
