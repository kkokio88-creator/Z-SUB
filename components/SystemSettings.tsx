import React, { useState } from 'react';
import { Save, BrainCircuit, Server, Settings, BarChart3, Palette, Factory, Tags } from 'lucide-react';
import { useSettingsState } from '../hooks/useSettingsState';
import {
  AlgorithmSection,
  PolicySection,
  IntegrationSection,
  ShipmentSection,
  IngredientColorSection,
  ProductionLimitSection,
  TargetTagSection,
} from './settings';
import { Button } from '@/components/ui/button';

type ActiveSection = 'algorithm' | 'integration' | 'policy' | 'shipment' | 'ingredient' | 'production' | 'tags';

const SECTION_META: Record<ActiveSection, { title: string; description: string }> = {
  algorithm: {
    title: 'AI 식단 구성 매뉴얼',
    description: 'AI가 식단을 생성할 때 반드시 준수해야 할 자연어 규칙을 설정합니다.',
  },
  integration: {
    title: '외부 시스템 및 데이터 연동',
    description: 'MIS, ZPPS 및 구글 시트와의 실시간 데이터 동기화 상태를 관리합니다.',
  },
  policy: {
    title: '식단 정책 및 구성 설정',
    description: '기본 식단과 파생된 옵션 상품을 그룹별로 관리하고, 원가율 정책을 수립합니다.',
  },
  shipment: {
    title: '출고량 시뮬레이션 설정',
    description: '식단 유형별 평균 출고량을 설정하여 생산수량 시뮬레이션에 활용합니다.',
  },
  ingredient: {
    title: '주재료 컬러링 우선순위',
    description: '주재료별 색상과 우선순위를 설정하여 식단표 시각화에 활용합니다.',
  },
  production: {
    title: '생산 한도 설정',
    description: '카테고리별 일일 생산 한도를 설정하여 생산 계획에 반영합니다.',
  },
  tags: {
    title: '식단별 태그 관리',
    description: '식단 유형별 허용/차단 태그와 제품명을 관리합니다.',
  },
};

const NAV_ITEMS: { key: ActiveSection; icon: React.FC<{ className?: string }>; label: string; activeClass: string }[] =
  [
    {
      key: 'algorithm',
      icon: BrainCircuit,
      label: 'AI 구성 매뉴얼',
      activeClass: 'bg-purple-50 text-purple-700 font-bold',
    },
    { key: 'integration', icon: Server, label: '시스템 연동 (API)', activeClass: 'bg-blue-50 text-blue-700 font-bold' },
    { key: 'policy', icon: Settings, label: '식단 정책', activeClass: 'bg-green-50 text-green-700 font-bold' },
    { key: 'shipment', icon: BarChart3, label: '출고량 설정', activeClass: 'bg-orange-50 text-orange-700 font-bold' },
    { key: 'ingredient', icon: Palette, label: '주재료 컬러링', activeClass: 'bg-rose-50 text-rose-700 font-bold' },
    { key: 'production', icon: Factory, label: '생산 한도', activeClass: 'bg-cyan-50 text-cyan-700 font-bold' },
    { key: 'tags', icon: Tags, label: '태그 관리', activeClass: 'bg-indigo-50 text-indigo-700 font-bold' },
  ];

const SystemSettings: React.FC = () => {
  const [activeSection, setActiveSection] = useState<ActiveSection>('algorithm');
  const s = useSettingsState();
  const meta = SECTION_META[activeSection];

  return (
    <div className="flex h-full gap-6">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden flex flex-col h-full">
        <div className="p-5 border-b border-stone-100 bg-stone-50">
          <h3 className="font-bold text-stone-800">시스템 설정</h3>
          <p className="text-xs text-stone-500 mt-1">AI 튜닝 및 외부 시스템 연동</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV_ITEMS.map(({ key, icon: Icon, label, activeClass }) => (
            <Button
              key={key}
              variant="ghost"
              onClick={() => setActiveSection(key)}
              className={`w-full justify-start px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${activeSection === key ? activeClass : 'text-stone-600 hover:bg-stone-50'}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </Button>
          ))}
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
            <h2 className="text-xl font-bold text-stone-800">{meta.title}</h2>
            <p className="text-sm text-stone-500 mt-1">{meta.description}</p>
          </div>
          {activeSection !== 'policy' && (
            <Button onClick={s.handleSave}>
              <Save className="w-4 h-4" /> 설정 저장
            </Button>
          )}
        </div>

        <div className={`flex-1 overflow-y-auto ${activeSection === 'policy' ? 'p-0' : 'p-8'}`}>
          {activeSection === 'algorithm' && <AlgorithmSection aiManual={s.aiManual} setAiManual={s.setAiManual} />}
          {activeSection === 'policy' && <PolicySection />}
          {activeSection === 'integration' && (
            <IntegrationSection
              googleSheetUrl={s.googleSheetUrl}
              setGoogleSheetUrl={s.setGoogleSheetUrl}
              misApiUrl={s.misApiUrl}
              setMisApiUrl={s.setMisApiUrl}
              zppsApiUrl={s.zppsApiUrl}
              setZppsApiUrl={s.setZppsApiUrl}
              googleChatWebhookUrl={s.googleChatWebhookUrl}
              setGoogleChatWebhookUrl={s.setGoogleChatWebhookUrl}
              testStatus={s.testStatus}
              runConnectionTest={s.runConnectionTest}
            />
          )}
          {activeSection === 'shipment' && (
            <ShipmentSection shipmentConfig={s.shipmentConfig} setShipmentConfig={s.setShipmentConfig} />
          )}
          {activeSection === 'ingredient' && (
            <IngredientColorSection
              ingredientColors={s.ingredientColors}
              newIngKey={s.newIngKey}
              setNewIngKey={s.setNewIngKey}
              newIngLabel={s.newIngLabel}
              setNewIngLabel={s.setNewIngLabel}
              moveIngredient={s.moveIngredient}
              updateIngredientColor={s.updateIngredientColor}
              removeIngredientColor={s.removeIngredientColor}
              addIngredientColor={s.addIngredientColor}
            />
          )}
          {activeSection === 'production' && (
            <ProductionLimitSection
              productionLimits={s.productionLimits}
              newProdCategory={s.newProdCategory}
              setNewProdCategory={s.setNewProdCategory}
              newProdLimit={s.newProdLimit}
              setNewProdLimit={s.setNewProdLimit}
              addProductionCategory={s.addProductionCategory}
              removeProductionCategory={s.removeProductionCategory}
              updateProductionLimit={s.updateProductionLimit}
            />
          )}
          {activeSection === 'tags' && (
            <TargetTagSection
              selectedTagTarget={s.selectedTagTarget}
              setSelectedTagTarget={s.setSelectedTagTarget}
              newAllowedTag={s.newAllowedTag}
              setNewAllowedTag={s.setNewAllowedTag}
              newBlockedTag={s.newBlockedTag}
              setNewBlockedTag={s.setNewBlockedTag}
              newBlockedProduct={s.newBlockedProduct}
              setNewBlockedProduct={s.setNewBlockedProduct}
              getTagConfigForTarget={s.getTagConfigForTarget}
              addAllowedTag={s.addAllowedTag}
              removeAllowedTag={s.removeAllowedTag}
              addBlockedTag={s.addBlockedTag}
              removeBlockedTag={s.removeBlockedTag}
              addBlockedProduct={s.addBlockedProduct}
              removeBlockedProduct={s.removeBlockedProduct}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
