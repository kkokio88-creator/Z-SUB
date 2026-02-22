import React from 'react';
import { Printer, Download } from 'lucide-react';
import { printMealPlan, exportToCSV } from '../services/exportService';
import type { MonthlyMealPlan } from '../types';

interface Props {
  plan: MonthlyMealPlan;
}

const PrintablePlan: React.FC<Props> = ({ plan }) => {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => printMealPlan(plan)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors"
      >
        <Printer className="w-3.5 h-3.5" /> 인쇄
      </button>
      <button
        onClick={() => exportToCSV(plan)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors"
      >
        <Download className="w-3.5 h-3.5" /> CSV
      </button>
    </div>
  );
};

export default PrintablePlan;
