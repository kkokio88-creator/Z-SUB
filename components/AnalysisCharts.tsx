import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from 'recharts';
import { WeeklyCyclePlan, TasteProfile } from '../types';

interface AnalysisChartsProps {
  plan: WeeklyCyclePlan | null;
  budgetCap: number;
}

const COLORS = ['#10b981', '#f3f4f6']; // Green (Used), Gray (Remaining)

export const AnalysisCharts: React.FC<AnalysisChartsProps> = ({ plan, budgetCap }) => {
  if (!plan) return <div className="h-full flex items-center justify-center text-gray-400">데이터 없음</div>;

  const totalCost = plan.totalCost;
  const allItems = plan.items;

  const costData = [
    { name: '원가', value: totalCost },
    { name: '마진', value: Math.max(0, budgetCap - totalCost) },
  ];

  const tasteCounts = allItems.reduce((acc, item) => {
    item.tastes.forEach(t => {
      acc[t] = (acc[t] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const radarData = [
    { subject: '매움', A: tasteCounts[TasteProfile.SPICY] || 0, fullMark: 3 },
    { subject: '짭짤함', A: tasteCounts[TasteProfile.SALTY] || 0, fullMark: 3 },
    { subject: '달콤함', A: tasteCounts[TasteProfile.SWEET] || 0, fullMark: 3 },
    { subject: '느끼함', A: tasteCounts[TasteProfile.OILY] || 0, fullMark: 3 },
    { subject: '담백함', A: tasteCounts[TasteProfile.BLAND] || 0, fullMark: 3 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
      {/* Cost Efficiency */}
      <div className="relative">
        <h4 className="text-sm font-semibold text-gray-600 mb-2 text-center">예산 활용률</h4>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={costData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {costData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? (totalCost > budgetCap ? '#ef4444' : COLORS[0]) : COLORS[1]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center mt-6 pointer-events-none">
            <span className={`text-2xl font-bold ${totalCost > budgetCap ? 'text-red-500' : 'text-gray-800'}`}>
              {Math.round((totalCost / budgetCap) * 100)}%
            </span>
            <span className="text-xs text-gray-500">사용됨</span>
          </div>
        </div>
      </div>

      {/* Taste Balance */}
      <div>
        <h4 className="text-sm font-semibold text-gray-600 mb-2 text-center">맛 분포도</h4>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 4]} tick={false} axisLine={false} />
              <Radar
                name="Menu"
                dataKey="A"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.4}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};