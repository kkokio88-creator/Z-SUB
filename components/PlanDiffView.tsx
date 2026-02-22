import React from 'react';
import { ArrowRight, X } from 'lucide-react';
import type { MonthlyMealPlan } from '../types';
import { Button } from '@/components/ui/button';

interface Props {
  before: MonthlyMealPlan;
  after: MonthlyMealPlan;
  onClose: () => void;
}

const PlanDiffView: React.FC<Props> = ({ before, after, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">버전 비교</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {before.weeks.map((weekBefore, wi) => {
            const weekAfter = after.weeks[wi];
            if (!weekAfter) return null;

            return (
              <div key={wi} className="mb-6">
                <h4 className="text-sm font-bold text-stone-700 mb-3">{wi + 1}주차</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-red-500 mb-1">이전</div>
                    {weekBefore.items.map((item, ii) => {
                      const changed = weekAfter.items[ii]?.id !== item.id;
                      return (
                        <div
                          key={item.id + ii}
                          className={`px-3 py-1.5 rounded text-xs ${changed ? 'bg-red-50 text-red-700 font-medium' : 'text-stone-600'}`}
                        >
                          {item.name} ({item.category})
                        </div>
                      );
                    })}
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-green-500 mb-1 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" />
                      이후
                    </div>
                    {weekAfter.items.map((item, ii) => {
                      const changed = weekBefore.items[ii]?.id !== item.id;
                      return (
                        <div
                          key={item.id + ii}
                          className={`px-3 py-1.5 rounded text-xs ${changed ? 'bg-green-50 text-green-700 font-medium' : 'text-stone-600'}`}
                        >
                          {item.name} ({item.category})
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlanDiffView;
