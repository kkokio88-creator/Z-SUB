import React, { useState, useMemo } from 'react';
import {
  Settings,
  Plus,
  Save,
  Trash2,
  AlertCircle,
  X,
  Percent,
  PlusCircle,
  Minus,
  ArrowDownRight,
  Layers,
} from 'lucide-react';
import { TARGET_CONFIGS } from '../constants';
import { MenuCategory, TargetType, MealPlanConfig } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { addAuditEntry } from '../services/auditService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface ManagedMealPlanConfig extends MealPlanConfig {
  id: string;
}

const PLAN_STORAGE_KEY = 'zsub_plan_configs';

const loadConfigs = (): ManagedMealPlanConfig[] => {
  try {
    const stored = localStorage.getItem(PLAN_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return Object.entries(TARGET_CONFIGS).map(([key, config]) => ({
    id: key,
    ...config,
  }));
};

const PlanManagement: React.FC = () => {
  const { addToast, confirm } = useToast();
  const { user } = useAuth();
  const [configs, setConfigs] = useState<ManagedMealPlanConfig[]>(loadConfigs);
  const [globalCostRatio, setGlobalCostRatio] = useState<number>(30);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleSaveAll = () => {
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(configs));
    setHasUnsavedChanges(false);
    addToast({ type: 'success', title: '저장 완료', message: '식단 정책 설정이 저장되었습니다.' });
    addAuditEntry({
      action: 'config.update',
      userId: user?.id || '',
      userName: user?.displayName || '',
      entityType: 'meal_plan_config',
      entityId: 'all',
      entityName: '식단 정책 일괄 저장',
    });
  };

  // Group configs by Parent (Base) -> Children (Options)
  const groupedConfigs = useMemo(() => {
    const groups: { base: ManagedMealPlanConfig; options: ManagedMealPlanConfig[] }[] = [];
    const basePlans = configs.filter(c => !c.parentTarget);

    basePlans.forEach(base => {
      const options = configs.filter(c => c.parentTarget === base.target);
      groups.push({ base, options });
    });

    return groups;
  }, [configs]);

  const handleUpdate = (id: string, field: string, value: string | number | boolean) => {
    setConfigs(prev =>
      prev.map(config => {
        if (config.id !== id) return config;

        let updated = { ...config };

        // Handle Composition nesting
        if (field.includes('.')) {
          const [parent, child] = field.split('.');
          if (parent === 'composition') {
            updated = { ...updated, composition: { ...config.composition, [child]: Math.max(0, Number(value) || 0) } };
          }
        } else {
          updated = { ...updated, [field]: value } as ManagedMealPlanConfig;
        }

        // Auto-calculate Budget Cap if Price or Ratio changes
        if (field === 'targetPrice' || field === 'targetCostRatio') {
          const price = field === 'targetPrice' ? Number(value) || 0 : config.targetPrice;
          const ratio = field === 'targetCostRatio' ? Number(value) || 0 : config.targetCostRatio;
          updated = { ...updated, budgetCap: Math.round(price * (ratio / 100)) };
        }

        return updated;
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleApplyGlobalRatio = async () => {
    const confirmed = await confirm({
      title: '일괄 원가율 적용',
      message: `모든 식단의 원가율을 ${globalCostRatio}%로 일괄 적용하시겠습니까?`,
      confirmLabel: '일괄 적용',
      variant: 'warning',
    });
    if (confirmed) {
      setConfigs(prev =>
        prev.map(config => ({
          ...config,
          targetCostRatio: globalCostRatio,
          budgetCap: Math.round(config.targetPrice * (globalCostRatio / 100)),
        }))
      );
      setHasUnsavedChanges(true);
      addToast({
        type: 'info',
        title: '일괄 적용 완료',
        message: `모든 식단의 원가율이 ${globalCostRatio}%로 변경되었습니다.`,
      });
    }
  };

  const handleAddBasePlan = () => {
    const newId = `BASE_${crypto.randomUUID().substring(0, 5).toUpperCase()}`;
    const newPlan: ManagedMealPlanConfig = {
      id: newId,
      target: '신규 기본 식단' as TargetType,
      budgetCap: 10500,
      targetPrice: 35000,
      targetCostRatio: 30,
      composition: {
        [MenuCategory.SOUP]: 1,
        [MenuCategory.MAIN]: 1,
        [MenuCategory.SIDE]: 3,
      },
      bannedTags: [],
      requiredTags: [],
    };

    setConfigs([...configs, newPlan]);
    setHasUnsavedChanges(true);
  };

  const handleAddOptionPlan = (parentId: string, parentTarget: TargetType) => {
    const newId = `OPT_${crypto.randomUUID().substring(0, 5).toUpperCase()}`;
    const newPlan: ManagedMealPlanConfig = {
      id: newId,
      target: `${parentTarget} (옵션)` as TargetType,
      budgetCap: 12000,
      targetPrice: 40000,
      targetCostRatio: 30,
      composition: {
        [MenuCategory.SOUP]: 1,
        [MenuCategory.MAIN]: 1,
        [MenuCategory.SIDE]: 4,
      },
      bannedTags: [],
      requiredTags: [],
      parentTarget: parentTarget,
    };

    setConfigs([...configs, newPlan]);
    setHasUnsavedChanges(true);
  };

  const handleDeletePlan = async (id: string) => {
    const confirmed = await confirm({
      title: '식단 정책 삭제',
      message: '정말 삭제하시겠습니까? 하위 옵션 식단이 있다면 함께 관리해야 할 수 있습니다.',
      confirmLabel: '삭제',
      variant: 'danger',
    });
    if (confirmed) {
      setConfigs(prev => prev.filter(c => c.id !== id));
      setHasUnsavedChanges(true);
    }
  };

  const handleAddTag = (id: string, field: 'bannedTags' | 'requiredTags', tag: string) => {
    if (!tag.trim()) return;
    setConfigs(prev =>
      prev.map(c => {
        if (c.id === id) {
          return { ...c, [field]: [...c[field], tag.trim()] };
        }
        return c;
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleRemoveTag = (id: string, field: 'bannedTags' | 'requiredTags', tag: string) => {
    setConfigs(prev =>
      prev.map(c => {
        if (c.id === id) {
          return { ...c, [field]: c[field].filter(t => t !== tag) };
        }
        return c;
      })
    );
    setHasUnsavedChanges(true);
  };

  const renderCompositionStepper = (
    config: ManagedMealPlanConfig,
    category: MenuCategory,
    label: string,
    colorClass: string
  ) => (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-[10px] font-bold ${colorClass}`}>{label}</span>
      <div className="flex items-center bg-stone-50 rounded-lg border border-stone-200">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleUpdate(config.id, `composition.${category}`, (config.composition[category] || 0) - 1)}
          className="w-6 h-6 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-l-lg rounded-r-none"
        >
          <Minus className="w-3 h-3" />
        </Button>
        <Input
          type="number"
          value={config.composition[category] || 0}
          readOnly
          className="w-8 text-center bg-transparent border-none p-0 text-sm font-bold text-stone-800 focus:ring-0"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleUpdate(config.id, `composition.${category}`, (config.composition[category] || 0) + 1)}
          className="w-6 h-6 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-r-lg rounded-l-none"
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full gap-6">
      {/* 1. Header & Global Controls */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">
                <Settings className="w-6 h-6 text-primary-600" />
                식단 정책 관리
              </h2>
              <p className="text-sm text-stone-500 mt-1">
                기본 식단과 파생된 옵션 상품을 그룹별로 관리하고, 원가율 정책을 수립합니다.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {hasUnsavedChanges && (
                <span className="bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full text-xs font-bold border border-orange-200 animate-pulse flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> 저장되지 않음
                </span>
              )}
              <Button onClick={handleSaveAll}>
                <Save className="w-4 h-4" />
                변경사항 저장
              </Button>
            </div>
          </div>

          {/* Global Ratio Toolbar */}
          <div className="flex items-center gap-4 bg-stone-50 p-4 rounded-lg border border-stone-200">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white rounded-md border border-stone-200 shadow-sm">
                <Percent className="w-4 h-4 text-stone-500" />
              </div>
              <span className="text-sm font-bold text-stone-700">전체 목표 원가율 설정</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-24">
                <Input
                  type="number"
                  value={globalCostRatio}
                  onChange={e => setGlobalCostRatio(parseFloat(e.target.value))}
                  className="pr-6"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-bold">%</span>
              </div>
              <Button variant="outline" onClick={handleApplyGlobalRatio}>
                일괄 적용
              </Button>
            </div>

            <div className="flex-1"></div>

            <Button onClick={handleAddBasePlan}>
              <PlusCircle className="w-4 h-4" /> 새 기본 식단 추가
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Plan Groups List */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-10">
        {groupedConfigs.map(({ base, options }) => (
          <div key={base.id} className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
            {/* Group Header (Base Plan) */}
            <div className="bg-stone-50 border-b border-stone-200 p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border border-stone-200 shadow-sm">
                  <Layers className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <Input
                    type="text"
                    value={base.target}
                    onChange={e => handleUpdate(base.id, 'target', e.target.value)}
                    className="font-bold text-lg bg-transparent border-none p-0 focus:ring-0 text-stone-900 placeholder-stone-400"
                    placeholder="기본 식단명 입력"
                  />
                  <div className="text-xs text-stone-500 font-mono">ID: {base.id}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddOptionPlan(base.id, base.target)}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <ArrowDownRight className="w-3 h-3" /> 옵션 상품 추가
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeletePlan(base.id)}
                  className="text-stone-400 hover:text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white border-b border-stone-100 text-stone-500 font-semibold text-xs uppercase">
                  <tr>
                    <th className="p-4 w-[20%]">구분 / 상품명</th>
                    <th className="p-4 w-[25%] text-center">메뉴 구성 (개수)</th>
                    <th className="p-4 w-[25%]">가격 정책 (판매가 / 원가율)</th>
                    <th className="p-4 w-[25%]">필터링 태그</th>
                    <th className="p-4 w-[5%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {/* Base Plan Row */}
                  <tr className="bg-white">
                    <td className="p-4">
                      <span className="inline-block px-2 py-0.5 mb-1 rounded text-[10px] font-bold bg-stone-800 text-white">
                        기본 (Base)
                      </span>
                      <div className="font-bold text-stone-900">{base.target}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-4">
                        {renderCompositionStepper(base, MenuCategory.SOUP, '국', 'text-blue-600')}
                        {renderCompositionStepper(base, MenuCategory.MAIN, '메인', 'text-orange-600')}
                        {renderCompositionStepper(base, MenuCategory.SIDE, '반찬', 'text-green-600')}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-stone-500">판매가</span>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={base.targetPrice}
                              onChange={e => handleUpdate(base.id, 'targetPrice', parseInt(e.target.value))}
                              className="w-20 text-right p-0 border-none border-b rounded-none"
                            />
                            <span className="text-xs text-stone-500">원</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-stone-500">원가율</span>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={base.targetCostRatio}
                              onChange={e => handleUpdate(base.id, 'targetCostRatio', parseFloat(e.target.value))}
                              className="w-12 text-right p-0 border-none border-b rounded-none"
                            />
                            <span className="text-xs text-stone-500">%</span>
                          </div>
                        </div>
                        <div className="pt-1 mt-1 border-t border-stone-100 flex justify-between">
                          <span className="text-xs font-bold text-stone-400">원가한도</span>
                          <span className="text-xs font-bold text-primary-600">
                            {base.budgetCap.toLocaleString()}원
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {base.requiredTags.map(tag => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-100"
                            >
                              {tag}{' '}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-4 h-4 p-0 ml-1"
                                onClick={() => handleRemoveTag(base.id, 'requiredTags', tag)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </span>
                          ))}
                          <Input
                            type="text"
                            placeholder="+ 필수태그"
                            className="w-16 text-[10px] border-none p-0 focus:ring-0 h-auto"
                            onKeyDown={e =>
                              e.key === 'Enter' &&
                              (handleAddTag(base.id, 'requiredTags', e.currentTarget.value),
                              (e.currentTarget.value = ''))
                            }
                          />
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {base.bannedTags.map(tag => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-red-50 text-red-700 border border-red-100"
                            >
                              {tag}{' '}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-4 h-4 p-0 ml-1"
                                onClick={() => handleRemoveTag(base.id, 'bannedTags', tag)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </span>
                          ))}
                          <Input
                            type="text"
                            placeholder="+ 제외태그"
                            className="w-16 text-[10px] border-none p-0 focus:ring-0 text-red-500 placeholder-red-300 h-auto"
                            onKeyDown={e =>
                              e.key === 'Enter' &&
                              (handleAddTag(base.id, 'bannedTags', e.currentTarget.value), (e.currentTarget.value = ''))
                            }
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-4"></td>
                  </tr>

                  {/* Option Plans Rows */}
                  {options.map(opt => (
                    <tr key={opt.id} className="bg-stone-50/50 hover:bg-emerald-50/40 transition-colors">
                      <td className="p-4 pl-8 relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 border-l-2 border-b-2 border-stone-300 rounded-bl-md"></div>
                        <span className="inline-block px-2 py-0.5 mb-1 rounded text-[10px] font-bold bg-white border border-stone-200 text-stone-500">
                          옵션 (Option)
                        </span>
                        <Input
                          type="text"
                          value={opt.target}
                          onChange={e => handleUpdate(opt.id, 'target', e.target.value)}
                          className="block w-full font-medium text-stone-700 bg-transparent border-none p-0 focus:ring-0 text-sm h-auto"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-4 opacity-90">
                          {renderCompositionStepper(opt, MenuCategory.SOUP, '국', 'text-stone-500')}
                          {renderCompositionStepper(opt, MenuCategory.MAIN, '메인', 'text-stone-500')}
                          {renderCompositionStepper(opt, MenuCategory.SIDE, '반찬', 'text-stone-500')}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-2 opacity-90">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-stone-400">판매가</span>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={opt.targetPrice}
                                onChange={e => handleUpdate(opt.id, 'targetPrice', parseInt(e.target.value))}
                                className="w-20 text-right p-0 border-none border-b rounded-none bg-transparent"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-stone-400">원가율</span>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={opt.targetCostRatio}
                                onChange={e => handleUpdate(opt.id, 'targetCostRatio', parseFloat(e.target.value))}
                                className="w-12 text-right p-0 border-none border-b rounded-none bg-transparent"
                              />
                            </div>
                          </div>
                          <div className="pt-1 mt-1 border-t border-stone-200 flex justify-between">
                            <span className="text-xs font-bold text-stone-400">원가한도</span>
                            <span className="text-xs font-bold text-stone-500">{opt.budgetCap.toLocaleString()}원</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs text-stone-400 italic mb-1">기본 태그 상속됨</div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1">
                            {opt.requiredTags.map(tag => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800"
                              >
                                {tag}{' '}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-4 h-4 p-0 ml-1"
                                  onClick={() => handleRemoveTag(opt.id, 'requiredTags', tag)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </span>
                            ))}
                            <Input
                              type="text"
                              placeholder="+ 추가"
                              className="w-12 text-[10px] bg-transparent border-none p-0 focus:ring-0 h-auto"
                              onKeyDown={e =>
                                e.key === 'Enter' &&
                                (handleAddTag(opt.id, 'requiredTags', e.currentTarget.value),
                                (e.currentTarget.value = ''))
                              }
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePlan(opt.id)}
                          className="w-7 h-7 text-stone-300 hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {/* Empty State for Options */}
                  {options.length === 0 && (
                    <tr className="bg-stone-50/30">
                      <td
                        colSpan={5}
                        className="p-4 text-center text-xs text-stone-400 border-t border-dashed border-stone-200"
                      >
                        등록된 옵션 상품이 없습니다. 상단 '옵션 상품 추가' 버튼을 눌러 구성하세요.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlanManagement;
