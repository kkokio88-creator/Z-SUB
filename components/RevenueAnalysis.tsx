import React from 'react';
import {
  TrendingUp,
  DollarSign,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Activity,
  Download,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Bar,
} from 'recharts';
import { MONTHLY_FINANCIALS, REVENUE_BY_CATEGORY, CHART_COLORS as COLORS } from '../data/mockData';

const RevenueAnalysis: React.FC = () => {
  const currentRevenue = 64000000;
  const prevRevenue = 58000000;
  const _growth = ((currentRevenue - prevRevenue) / prevRevenue) * 100;

  return (
    <div className="flex flex-col h-full gap-6 pb-10">
      {/* 1. Financial KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-bold text-gray-500">이번 달 예상 매출</p>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">₩64.0M</h3>
          <div className="flex items-center mt-2 text-xs font-bold text-green-600">
            <ArrowUpRight className="w-3 h-3 mr-1" /> +10.3% (전월 대비)
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-bold text-gray-500">영업 이익 (Profit)</p>
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">₩22.0M</h3>
          <div className="flex items-center mt-2 text-xs font-bold text-green-600">
            <ArrowUpRight className="w-3 h-3 mr-1" /> 마진율 34.4%
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-bold text-gray-500">객단가 (ARPU)</p>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">₩71,800</h3>
          <div className="flex items-center mt-2 text-xs font-bold text-gray-500">
            <Activity className="w-3 h-3 mr-1" /> 안정적 유지 중
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-bold text-gray-500">식재료 원가율</p>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <PieChartIcon className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">32.8%</h3>
          <div className="flex items-center mt-2 text-xs font-bold text-red-500">
            <ArrowDownRight className="w-3 h-3 mr-1" /> 목표(30%) 대비 +2.8%
          </div>
        </div>
      </div>

      {/* 2. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
        {/* Main Chart: Revenue & Cost Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800">월별 매출 및 비용 추이</h3>
              <p className="text-xs text-gray-500">상반기 재무 성과 분석 (단위: 원)</p>
            </div>
            <button className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded text-gray-600 font-bold transition-colors">
              <Download className="w-3 h-3" /> 리포트 다운로드
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={MONTHLY_FINANCIALS} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={value => `${value / 1000000}M`}
                />
                <Tooltip
                  formatter={value => `₩${Number(value).toLocaleString()}`}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="revenue" name="매출" barSize={20} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" name="비용" barSize={20} fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="profit" name="순이익" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sub Chart: Revenue Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-1">상품별 매출 비중</h3>
          <p className="text-xs text-gray-500 mb-6">이번 달 기준 카테고리별 기여도</p>

          <div className="flex-1 min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={REVENUE_BY_CATEGORY}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {REVENUE_BY_CATEGORY.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
              <span className="text-3xl font-bold text-gray-800">100%</span>
              <span className="text-xs text-gray-500">Total</span>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-start gap-2">
              <div className="p-1 bg-blue-100 rounded-full mt-0.5">
                <TrendingUp className="w-3 h-3 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800">아이 식단 매출 비중 1위 (35%)</p>
                <p className="text-[10px] text-gray-500 mt-1">
                  전월 대비 아이 식단의 매출 기여도가 5% 상승했습니다. 키즈 특화 마케팅이 유효했습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueAnalysis;
