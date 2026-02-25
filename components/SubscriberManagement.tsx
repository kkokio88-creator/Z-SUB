import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  TrendingUp,
  Crown,
  Star,
  AlertCircle,
  PieChart as PieChartIcon,
  BarChart3,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TargetType } from '../types';

interface SubscriberStats {
  target: string;
  totalSubscribers: number;
  newSubscribers: number;
  churnRate: number;
  satisfaction: number;
  tiers: { name: string; value: number }[];
  demographics: { name: string; value: number }[];
  revenue: number;
}

const SUBSCRIBER_DATA: SubscriberStats[] = [
  {
    target: TargetType.FAMILY,
    totalSubscribers: 3420,
    newSubscribers: 89,
    churnRate: 2.1,
    satisfaction: 4.7,
    tiers: [
      { name: 'VIP', value: 820 },
      { name: '골드', value: 1560 },
      { name: '일반', value: 1040 },
    ],
    demographics: [
      { name: '30대', value: 42 },
      { name: '40대', value: 35 },
      { name: '50대', value: 15 },
      { name: '20대', value: 8 },
    ],
    revenue: 158_000_000,
  },
  {
    target: TargetType.FAMILY_PLUS,
    totalSubscribers: 2180,
    newSubscribers: 63,
    churnRate: 1.8,
    satisfaction: 4.8,
    tiers: [
      { name: 'VIP', value: 650 },
      { name: '골드', value: 980 },
      { name: '일반', value: 550 },
    ],
    demographics: [
      { name: '30대', value: 38 },
      { name: '40대', value: 40 },
      { name: '50대', value: 16 },
      { name: '20대', value: 6 },
    ],
    revenue: 106_000_000,
  },
  {
    target: TargetType.KIDS,
    totalSubscribers: 1890,
    newSubscribers: 52,
    churnRate: 2.5,
    satisfaction: 4.6,
    tiers: [
      { name: 'VIP', value: 420 },
      { name: '골드', value: 810 },
      { name: '일반', value: 660 },
    ],
    demographics: [
      { name: '30대', value: 55 },
      { name: '40대', value: 30 },
      { name: '20대', value: 12 },
      { name: '50대', value: 3 },
    ],
    revenue: 69_000_000,
  },
  {
    target: TargetType.KIDS_PLUS,
    totalSubscribers: 1340,
    newSubscribers: 41,
    churnRate: 2.2,
    satisfaction: 4.5,
    tiers: [
      { name: 'VIP', value: 310 },
      { name: '골드', value: 600 },
      { name: '일반', value: 430 },
    ],
    demographics: [
      { name: '30대', value: 50 },
      { name: '40대', value: 33 },
      { name: '20대', value: 14 },
      { name: '50대', value: 3 },
    ],
    revenue: 65_000_000,
  },
  {
    target: TargetType.SENIOR,
    totalSubscribers: 1560,
    newSubscribers: 38,
    churnRate: 1.5,
    satisfaction: 4.8,
    tiers: [
      { name: 'VIP', value: 520 },
      { name: '골드', value: 680 },
      { name: '일반', value: 360 },
    ],
    demographics: [
      { name: '60대', value: 45 },
      { name: '50대', value: 35 },
      { name: '70대', value: 15 },
      { name: '40대', value: 5 },
    ],
    revenue: 72_000_000,
  },
  {
    target: TargetType.SENIOR_HEALTH,
    totalSubscribers: 980,
    newSubscribers: 29,
    churnRate: 1.2,
    satisfaction: 4.9,
    tiers: [
      { name: 'VIP', value: 380 },
      { name: '골드', value: 410 },
      { name: '일반', value: 190 },
    ],
    demographics: [
      { name: '60대', value: 40 },
      { name: '50대', value: 30 },
      { name: '70대', value: 22 },
      { name: '40대', value: 8 },
    ],
    revenue: 54_000_000,
  },
  {
    target: TargetType.YOUTH,
    totalSubscribers: 2210,
    newSubscribers: 78,
    churnRate: 3.1,
    satisfaction: 4.4,
    tiers: [
      { name: 'VIP', value: 440 },
      { name: '골드', value: 890 },
      { name: '일반', value: 880 },
    ],
    demographics: [
      { name: '20대', value: 40 },
      { name: '30대', value: 35 },
      { name: '10대', value: 15 },
      { name: '40대', value: 10 },
    ],
    revenue: 88_000_000,
  },
  {
    target: TargetType.YOUTH_MAIN,
    totalSubscribers: 1450,
    newSubscribers: 55,
    churnRate: 2.8,
    satisfaction: 4.5,
    tiers: [
      { name: 'VIP', value: 290 },
      { name: '골드', value: 620 },
      { name: '일반', value: 540 },
    ],
    demographics: [
      { name: '20대', value: 42 },
      { name: '30대', value: 33 },
      { name: '10대', value: 18 },
      { name: '40대', value: 7 },
    ],
    revenue: 71_000_000,
  },
  {
    target: TargetType.VALUE,
    totalSubscribers: 2650,
    newSubscribers: 72,
    churnRate: 3.5,
    satisfaction: 4.3,
    tiers: [
      { name: 'VIP', value: 390 },
      { name: '골드', value: 1050 },
      { name: '일반', value: 1210 },
    ],
    demographics: [
      { name: '30대', value: 35 },
      { name: '20대', value: 30 },
      { name: '40대', value: 25 },
      { name: '50대', value: 10 },
    ],
    revenue: 92_000_000,
  },
  {
    target: TargetType.SIDE_ONLY,
    totalSubscribers: 1120,
    newSubscribers: 34,
    churnRate: 2.0,
    satisfaction: 4.6,
    tiers: [
      { name: 'VIP', value: 260 },
      { name: '골드', value: 480 },
      { name: '일반', value: 380 },
    ],
    demographics: [
      { name: '40대', value: 38 },
      { name: '30대', value: 32 },
      { name: '50대', value: 20 },
      { name: '60대', value: 10 },
    ],
    revenue: 39_000_000,
  },
];

const TIER_COLORS = ['#7c3aed', '#f59e0b', '#94a3b8'];

const SubscriberManagement: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriberStats>(SUBSCRIBER_DATA[0]);
  const [managerNote, setManagerNote] = useState('');

  const kpi = useMemo(() => {
    const totals = SUBSCRIBER_DATA.reduce(
      (acc, curr) => ({
        total: acc.total + curr.totalSubscribers,
        newSubs: acc.newSubs + curr.newSubscribers,
        revenue: acc.revenue + curr.revenue,
        satisfactionSum: acc.satisfactionSum + curr.satisfaction,
      }),
      { total: 0, newSubs: 0, revenue: 0, satisfactionSum: 0 }
    );
    return {
      ...totals,
      avgSatisfaction: (totals.satisfactionSum / SUBSCRIBER_DATA.length).toFixed(1),
    };
  }, []);

  return (
    <div className="flex flex-col h-full gap-6 p-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-500">총 활성 구독자</p>
              <h3 className="text-2xl font-bold text-stone-900 mt-1">{kpi.total.toLocaleString()}명</h3>
              <span className="text-xs text-emerald-600 font-medium flex items-center mt-1">
                <TrendingUp className="w-3 h-3 mr-1" /> 전월 대비 +4.2%
              </span>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-500">이번 주 신규 유입</p>
              <h3 className="text-2xl font-bold text-stone-900 mt-1">{kpi.newSubs.toLocaleString()}명</h3>
              <span className="text-xs text-emerald-600 font-medium flex items-center mt-1">
                <UserPlus className="w-3 h-3 mr-1" /> 목표 달성률 102%
              </span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
              <UserPlus className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-500">평균 만족도</p>
              <h3 className="text-2xl font-bold text-stone-900 mt-1">{kpi.avgSatisfaction} / 5.0</h3>
              <span className="text-xs text-amber-600 font-medium flex items-center mt-1">
                <Star className="w-3 h-3 mr-1 fill-amber-600" /> 높은 수준 유지 중
              </span>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
              <Crown className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main CRM Content */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Left: Plan Performance Table */}
        <Card className="lg:w-3/5 flex flex-col overflow-hidden">
          <CardHeader className="border-b border-stone-200 bg-stone-50 py-3 px-4">
            <CardTitle className="text-sm font-bold text-stone-800 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-stone-600" /> 식단별 구독 성과
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-100 text-stone-600 font-semibold sticky top-0 z-10">
                <tr>
                  <th className="p-3 pl-4 border-b border-stone-200">식단명</th>
                  <th className="p-3 border-b border-stone-200 text-right">구독자 수</th>
                  <th className="p-3 border-b border-stone-200 text-right">신규 유입</th>
                  <th className="p-3 border-b border-stone-200 text-right">이탈률</th>
                  <th className="p-3 border-b border-stone-200 text-center">만족도</th>
                  <th className="p-3 pr-4 border-b border-stone-200 text-right">매출 기여도</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {SUBSCRIBER_DATA.map(item => (
                  <tr
                    key={item.target}
                    onClick={() => setSelectedPlan(item)}
                    className={`cursor-pointer transition-colors ${
                      selectedPlan.target === item.target ? 'bg-blue-50' : 'hover:bg-stone-50'
                    }`}
                  >
                    <td className="p-3 pl-4 font-medium text-stone-800 flex items-center gap-2">
                      {selectedPlan.target === item.target && (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      )}
                      {item.target}
                    </td>
                    <td className="p-3 text-right font-bold text-stone-700">
                      {item.totalSubscribers.toLocaleString()}
                    </td>
                    <td className="p-3 text-right text-emerald-600">+{item.newSubscribers}</td>
                    <td className="p-3 text-right">
                      <span className={item.churnRate > 3.0 ? 'text-red-500 font-semibold' : 'text-stone-500'}>
                        {item.churnRate}%
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          item.satisfaction >= 4.5 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {item.satisfaction}
                      </span>
                    </td>
                    <td className="p-3 pr-4 text-right text-stone-500 text-xs">
                      {((item.revenue / kpi.revenue) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Right: Detail Analysis */}
        <Card className="lg:w-2/5 flex flex-col overflow-hidden">
          <CardHeader className="border-b border-stone-200 bg-blue-50 py-3 px-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-700" />
              <div>
                <CardTitle className="text-sm font-bold text-blue-900">{selectedPlan.target} 상세 분석</CardTitle>
                <p className="text-xs text-blue-600">고객 세그먼트 분석</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Membership Tiers */}
            <div>
              <h4 className="text-sm font-bold text-stone-700 mb-2 flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" /> 멤버십 등급 분포
              </h4>
              <div className="h-48 w-full bg-stone-50 rounded-lg p-2 border border-stone-100">
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
                      {selectedPlan.tiers.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={TIER_COLORS[index % TIER_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={36} iconSize={10} />
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Demographics */}
            <div>
              <h4 className="text-sm font-bold text-stone-700 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-stone-500" /> 주요 구매 연령층
              </h4>
              <div className="space-y-2">
                {selectedPlan.demographics.map((demo, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span className="w-12 text-stone-600 font-medium">{demo.name}</span>
                    <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${demo.value}%` }} />
                    </div>
                    <span className="w-8 text-right text-stone-800 font-bold">{demo.value}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Manager Notes */}
            <div>
              <h4 className="text-xs font-bold text-stone-700 flex items-center gap-1 mb-2">
                <AlertCircle className="w-3 h-3" /> 관리자 노트
              </h4>
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 mb-2">
                <p className="text-xs text-amber-800 leading-relaxed">
                  {selectedPlan.churnRate > 3.0
                    ? '이탈률이 다소 높습니다. 장기 구독 혜택(반찬 추가 등) 프로모션을 고려해보세요.'
                    : '안정적인 성장세를 보이고 있습니다. VIP 고객 대상 신메뉴 시식권 제공을 추천합니다.'}
                </p>
              </div>
              <textarea
                className="w-full text-xs border border-stone-200 rounded-lg p-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholder="메모를 입력하세요..."
                value={managerNote}
                onChange={e => setManagerNote(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SubscriberManagement;
