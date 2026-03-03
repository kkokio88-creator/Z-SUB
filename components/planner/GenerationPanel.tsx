import React from 'react';
import { TargetType } from '../../types';
import { Sparkles, RefreshCw, History, Save } from 'lucide-react';
import { MEAL_PLAN_INTEGRATION_GROUPS } from '../../constants';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface GenerationPanelProps {
  target: TargetType;
  setTarget: (t: TargetType) => void;
  selectedYear: number;
  setSelectedYear: (y: number) => void;
  selectedMonth: number;
  setSelectedMonth: (m: number) => void;
  isGenerating: boolean;
  hasPlans: boolean;
  onGenerate: () => void;
  onLoadSnapshot: () => void;
  onSaveVersion: () => void;
}

const GenerationPanel: React.FC<GenerationPanelProps> = ({
  target,
  setTarget,
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  isGenerating,
  hasPlans,
  onGenerate,
  onLoadSnapshot,
  onSaveVersion,
}) => (
  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-col gap-4">
    <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-col">
          <Label className="text-xs font-bold text-stone-500 mb-1">식단 대상</Label>
          <select
            value={target}
            onChange={e => setTarget(e.target.value as TargetType)}
            className="bg-stone-50 border border-stone-300 text-stone-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-48 p-2.5"
          >
            {Object.values(TargetType).map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {MEAL_PLAN_INTEGRATION_GROUPS.some(g => g.baseTarget === target || g.plusTarget === target) && (
            <div className="text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200 mt-1">
              {MEAL_PLAN_INTEGRATION_GROUPS.find(g => g.baseTarget === target || g.plusTarget === target)?.groupLabel ||
                '통합 식단'}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <Label className="text-xs font-bold text-stone-500 mb-1">연도</Label>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="bg-stone-50 border border-stone-300 text-stone-900 text-sm rounded-lg block w-24 p-2.5"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <Label className="text-xs font-bold text-stone-500 mb-1">월</Label>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            className="bg-stone-50 border border-stone-300 text-stone-900 text-sm rounded-lg block w-20 p-2.5"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={onLoadSnapshot}
          className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold shadow-sm"
        >
          <History className="w-5 h-5 text-stone-500" />
          조회
        </Button>
        <Button
          onClick={onGenerate}
          disabled={isGenerating}
          className={`flex items-center gap-2 px-6 py-3 bg-stone-900 hover:bg-black text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 ${isGenerating ? 'opacity-75 cursor-wait' : ''}`}
        >
          {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {isGenerating ? '식단 생성 중...' : 'AI 식단 구성'}
        </Button>
        {hasPlans && (
          <Button
            variant="outline"
            onClick={onSaveVersion}
            className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold shadow-sm"
          >
            <Save className="w-5 h-5 text-stone-500" />
            저장
          </Button>
        )}
      </div>
    </div>
  </div>
);

export default GenerationPanel;
