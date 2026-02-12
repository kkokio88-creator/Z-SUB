
import React, { useState, useMemo } from 'react';
import { TargetType } from '../types';
import { Users, UserPlus, TrendingUp, Crown, Star, AlertCircle, PieChart as PieChartIcon, BarChart3, Download } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

// --- Mock Data Generator ---
interface SubscriberStats {
  target: TargetType;
  totalSubscribers: number;
  newSubscribers: number;
  churnRate: number; // %
  satisfaction: number; // 5.0 scale
  tiers: { name: string; value: number }[]; // VIP, Gold, Standard
  demographics: { name: string; value: number }[]; // Age groups
  revenue: number;
}

const generateMockData = (): SubscriberStats[] => {
  return Object.values(TargetType).map((target) => {
    const baseCount = target.includes('가족') ? 450 : target.includes('아이') ? 600 : 300;
    const total = Math.floor(Math.random() * 200) + baseCount;
    const isPremium = target.includes('든든한');
    
    return {
      target,
      totalSubscribers: total,
      newSubscribers: Math.floor(Math.random() * 50) + 10,
      churnRate: parseFloat((Math.random() * 5 + 1).toFixed(1)),
      satisfaction: parseFloat((Math.random() * 0.8 + 4.1).toFixed(1)), // 4.1 ~ 4.9
      revenue: total * (isPremium ? 58000 : 42000),
      tiers: [
        { name: 'VIP', value: Math.floor(total * 0.2) },
        { name: '골드', value: Math.floor(total * 0.35) },
        { name: '일반', value: Math.floor(total * 0.45) },
      ],
      demographics: target.includes('아이') 
        ? [{ name: '30대 부모', value: 60 }, { name: '40대 부모', value: 30 }, { name: '기타', value: 10 }]
        : target.includes('시니어')
        ? [{ name: '50대 자녀', value: 40 }, { name: '60대 본인', value: 20 }, { name: '70대 이상', value: 40 }]
        : [{ name: '20-30대', value: 30 }, { name: '40대', value: 40 }, { name: '50대+', value: 30 }]
    };
  });
};

const DATA = generateMockData();
const TIER_COLORS = ['#7c3aed', '#f59e0b', '#94a3b8']; // VIP, Gold, Standard

const SubscriberManagement: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriberStats>(DATA[0]);

  // Total KPI Calculation
  const kpi = useMemo(() => {
    return DATA.reduce((acc, curr) => ({
      total: acc.total + curr.totalSubscribers,
      new: acc.new + curr.newSubscribers,
      revenue: acc.revenue + curr.revenue
    }), { total: 0, new: 0, revenue: 0 });
  }, []);

  return (
    <div className="flex flex-col h-full gap-6">
      
      {/* 1. Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">총 활성 구독자</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{kpi.total.toLocaleString()}명</h3>
            <span className="text-xs text-green-600 font-medium flex items-center mt-1">
              <TrendingUp className="w-3 h-3 mr-1" /> 전월 대비 +4.2%
            </span>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">이번 주 신규 유입</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{kpi.new.toLocaleString()}명</h3>
            <span className="text-xs text-green-600 font-medium flex items-center mt-1">
              <UserPlus className="w-3 h-3 mr-1" /> 목표 달성률 102%
            </span>
          </div>
          <div className="p-3 bg-green-50 rounded-lg text-green-600">
            <UserPlus className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">평균 만족도</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">4.6 / 5.0</h3>
            <span className="text-xs text-yellow-600 font-medium flex items-center mt-1">
              <Star className="w-3 h-3 mr-1 fill-yellow-600" /> 높은 수준 유지 중
            </span>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg text-yellow-600">
            <Crown className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. Main CRM Content */}
      <div className="flex flex-col lg:flex-row gap-6 h-[600px]">
        {/* Left: Plan List */}
        <div className="lg:w-3/5 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-gray-600" /> 식단별 구독 성과
                </h3>
                <button className="flex items-center gap-1 text-xs bg-white border border-gray-300 px-2 py-1 rounded text-gray-600 hover:bg-gray-50">
                <Download className="w-3 h-3" /> 엑셀 다운로드
                </button>
            </div>
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-600 font-semibold sticky top-0 z-10">
                    <tr>
                    <th className="p-3 pl-4 border-b">식단명</th>
                    <th className="p-3 border-b text-right">구독자 수</th>
                    <th className="p-3 border-b text-right">신규 유입</th>
                    <th className="p-3 border-b text-right">이탈률</th>
                    <th className="p-3 border-b text-center">만족도</th>
                    <th className="p-3 pr-4 border-b text-right">매출 기여도</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {DATA.map((item) => (
                    <tr 
                        key={item.target} 
                        onClick={() => setSelectedPlan(item)}
                        className={`cursor-pointer transition-colors ${selectedPlan.target === item.target ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    >
                        <td className="p-3 pl-4 font-medium text-gray-800 flex items-center gap-2">
                        {selectedPlan.target === item.target && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                        {item.target}
                        </td>
                        <td className="p-3 text-right font-bold text-gray-700">{item.totalSubscribers.toLocaleString()}</td>
                        <td className="p-3 text-right text-green-600">+{item.newSubscribers}</td>
                        <td className="p-3 text-right text-red-500">{item.churnRate}%</td>
                        <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.satisfaction >= 4.5 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {item.satisfaction}
                        </span>
                        </td>
                        <td className="p-3 pr-4 text-right text-gray-500 text-xs">
                        {((item.revenue / kpi.revenue) * 100).toFixed(1)}%
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
        </div>

        {/* Right: Detailed Insight */}
        <div className="lg:w-2/5 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-blue-50">
                <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-700" />
                <div>
                    <h3 className="font-bold text-blue-900">{selectedPlan.target} 상세 분석</h3>
                    <p className="text-xs text-blue-600">AI 기반 고객 세그먼트 분석</p>
                </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                
                {/* 1. Membership Tiers */}
                <div>
                <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-500" /> 멤버십 등급 분포
                </h4>
                <div className="h-48 w-full bg-gray-50 rounded-lg p-2 border border-gray-100">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={selectedPlan.tiers}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                        >
                        {selectedPlan.tiers.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={TIER_COLORS[index % TIER_COLORS.length]} />
                        ))}
                        </Pie>
                        <Legend verticalAlign="bottom" height={36} iconSize={10} />
                        <RechartsTooltip />
                    </PieChart>
                    </ResponsiveContainer>
                </div>
                </div>

                {/* 2. Demographics */}
                <div>
                <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" /> 주요 구매 연령층
                </h4>
                <div className="space-y-2">
                    {selectedPlan.demographics.map((demo, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className="w-20 text-gray-600 font-medium">{demo.name}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: `${demo.value}%` }}
                        ></div>
                        </div>
                        <span className="w-8 text-right text-gray-800 font-bold">{demo.value}%</span>
                    </div>
                    ))}
                </div>
                </div>

                {/* 3. Action Items */}
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <h4 className="text-xs font-bold text-yellow-800 flex items-center gap-1 mb-1">
                    <AlertCircle className="w-3 h-3" /> 관리자 노트
                </h4>
                <p className="text-xs text-yellow-800 leading-relaxed">
                    {selectedPlan.churnRate > 3.0 
                    ? '이탈률이 다소 높습니다. 장기 구독 혜택(반찬 추가 등) 프로모션을 고려해보세요.'
                    : '안정적인 성장세를 보이고 있습니다. VIP 고객 대상 신메뉴 시식권 제공을 추천합니다.'}
                </p>
                </div>

            </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriberManagement;
