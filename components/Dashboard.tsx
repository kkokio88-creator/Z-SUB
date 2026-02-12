import React, { useState } from 'react';
import {
  TrendingUp,
  Truck,
  Users,
  CheckCircle,
  CalendarClock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CreditCard,
  Download,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  LineChart,
  Line,
  ComposedChart,
  Bar,
  BarChart,
} from 'recharts';
import { MONTHLY_FINANCIALS, REVENUE_BY_CATEGORY, CHART_COLORS as COLORS } from '../data/mockData';

// Dashboard-specific mock data
const PLAN_TREND_DATA = [
  { week: '3주전', '아이 식단': 280, '시니어 식단': 150, '가족 식단': 210, '실속 식단': 180 },
  { week: '2주전', '아이 식단': 295, '시니어 식단': 148, '가족 식단': 212, '실속 식단': 180 },
  { week: '지난주', '아이 식단': 310, '시니어 식단': 142, '가족 식단': 225, '실속 식단': 179 },
  { week: '이번주', '아이 식단': 335, '시니어 식단': 135, '가족 식단': 240, '실속 식단': 182 },
];

const MATRIX_DATA = [
  { name: '아이 식단', x: 12.5, y: 2.1, z: 335, status: 'Star' },
  { name: '든든한 아이', x: 8.2, y: 1.5, z: 120, status: 'Star' },
  { name: '가족 식단', x: 9.0, y: 3.5, z: 240, status: 'Question' },
  { name: '시니어 식단', x: 1.2, y: 8.5, z: 135, status: 'Danger' },
  { name: '실속 식단', x: 2.0, y: 2.0, z: 182, status: 'CashCow' },
  { name: '청소연구소', x: 15.0, y: 4.0, z: 80, status: 'Star' },
];

const WEEKLY_OPS_DATA = [
  { day: '월', delivery: 380, pause: 12 },
  { day: '화', delivery: 510, pause: 8 },
  { day: '수', delivery: 505, pause: 15 },
  { day: '목', delivery: 490, pause: 10 },
  { day: '금', delivery: 395, pause: 20 },
  { day: '토', delivery: 360, pause: 5 },
  { day: '일', delivery: 0, pause: 0 },
];

const StatCard: React.FC<{
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: React.ElementType;
  colorClass: string;
}> = ({ title, value, trend, trendUp, icon: Icon, colorClass }) => (
  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 mt-2">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
    </div>
    <div className="mt-4 flex items-center text-sm">
      <span className={`flex items-center font-medium ${trendUp ? 'text-green-600' : 'text-red-500'}`}>
        {trendUp ? '↑' : '↓'} {trend}
      </span>
      <span className="text-gray-400 ml-2">지난 주 대비</span>
    </div>
  </div>
);

const CustomScatterTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { name: string; x: number; y: number; z: number } }>;
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg text-xs">
        <p className="font-bold text-gray-800 mb-1">{data.name}</p>
        <p className="text-blue-600">신규 유입률: {data.x}%</p>
        <p className="text-red-500">이탈률: {data.y}%</p>
        <p className="text-gray-500">총 구독자: {data.z}명</p>
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'financial'>('overview');

  return (
    <div className="space-y-6 pb-10">
      {/* 1. Header & Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="bg-white p-1 rounded-lg border border-gray-200 inline-flex shadow-sm">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'overview' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
          >
            운영 현황
          </button>
          <button
            onClick={() => setActiveTab('financial')}
            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'financial' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
          >
            재무 성과
          </button>
        </div>

        {/* Alert Banner for Anomaly */}
        {activeTab === 'overview' && (
          <div className="flex-1 max-w-2xl bg-white border-l-4 border-l-red-500 rounded-r-xl shadow-sm p-3 flex items-center gap-4">
            <div className="p-1.5 bg-red-100 rounded-full">
              <Activity className="w-4 h-4 text-red-600 animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-600">
                <span className="font-bold text-gray-900">'시니어 식단'</span> 이탈률{' '}
                <span className="text-red-600 font-bold">8.5% (주의 필요)</span> 경고
              </p>
            </div>
            <button className="text-xs font-bold text-blue-600 hover:underline px-2">조치하기</button>
          </div>
        )}
      </div>

      {/* 2. Main Content Area */}
      {activeTab === 'overview' ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="이번 주 배송 예정"
              value="2,480건"
              trend="12%"
              trendUp={true}
              icon={Truck}
              colorClass="bg-blue-500 text-blue-600"
            />
            <StatCard
              title="주간 활성 구독자"
              value="892명"
              trend="4.2%"
              trendUp={true}
              icon={Users}
              colorClass="bg-green-500 text-green-600"
            />
            <StatCard
              title="식단 만족도"
              value="4.8/5.0"
              trend="0.1"
              trendUp={true}
              icon={CheckCircle}
              colorClass="bg-purple-500 text-purple-600"
            />
            <StatCard
              title="주간 예상 매출"
              value="1,240만원"
              trend="1.2%"
              trendUp={false}
              icon={TrendingUp}
              colorClass="bg-yellow-500 text-yellow-600"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Weekly Operations (Moved from Subs Management) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <CalendarClock className="w-5 h-5 text-gray-500" /> 주간 운영 부하
                  </h3>
                  <p className="text-xs text-gray-500">요일별 배송 물량 및 일시 정지 현황</p>
                </div>
              </div>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={WEEKLY_OPS_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis orientation="left" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: '#f3f4f6' }} />
                    <Legend />
                    <Bar dataKey="delivery" name="배송 건수" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
                    <Bar dataKey="pause" name="일시 정지" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Matrix Chart */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
              <h3 className="text-lg font-bold text-gray-800 mb-2">성장성 vs 건전성 매트릭스</h3>
              <p className="text-xs text-gray-500 mb-4">식단별 신규유입(X) vs 이탈률(Y) 분석</p>
              <div className="h-[220px] w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="x" name="신규 유입" unit="%" tick={{ fontSize: 10 }} />
                    <YAxis type="number" dataKey="y" name="이탈" unit="%" tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomScatterTooltip />} />
                    <ZAxis type="number" dataKey="z" range={[50, 400]} />
                    <ReferenceLine y={5} stroke="#cbd5e1" strokeDasharray="3 3" />
                    <ReferenceLine x={5} stroke="#cbd5e1" strokeDasharray="3 3" />
                    <Scatter name="Plans" data={MATRIX_DATA} fill="#8884d8">
                      {MATRIX_DATA.map((entry, index) => {
                        let color = '#94a3b8';
                        if (entry.y > 5) color = '#ef4444';
                        else if (entry.x > 8) color = '#3b82f6';
                        else if (entry.x < 5 && entry.y < 5) color = '#10b981';
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Line Trends */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-2">주요 식단별 구독 추이 (최근 4주)</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={PLAN_TREND_DATA} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="아이 식단" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="시니어 식단" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="가족 식단" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Financial KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm font-bold text-gray-500 mb-1">이번 달 예상 매출</p>
              <h3 className="text-2xl font-bold text-gray-900">6,400만원</h3>
              <div className="flex items-center mt-2 text-xs font-bold text-green-600">
                <ArrowUpRight className="w-3 h-3 mr-1" /> +10.3%
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm font-bold text-gray-500 mb-1">영업 이익</p>
              <h3 className="text-2xl font-bold text-gray-900">2,200만원</h3>
              <div className="flex items-center mt-2 text-xs font-bold text-green-600">
                <TrendingUp className="w-3 h-3 mr-1" /> 마진 34%
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm font-bold text-gray-500 mb-1">객단가 (ARPU)</p>
              <h3 className="text-2xl font-bold text-gray-900">71,800원</h3>
              <div className="flex items-center mt-2 text-xs font-bold text-gray-500">
                <CreditCard className="w-3 h-3 mr-1" /> 유지
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm font-bold text-gray-500 mb-1">식재료 원가율</p>
              <h3 className="text-2xl font-bold text-gray-900">32.8%</h3>
              <div className="flex items-center mt-2 text-xs font-bold text-red-500">
                <ArrowDownRight className="w-3 h-3 mr-1" /> 목표 초과
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
            {/* Revenue/Cost Trend */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">월별 매출 및 비용 추이</h3>
                <button className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded text-gray-600 font-bold transition-colors">
                  <Download className="w-3 h-3" /> 리포트
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={MONTHLY_FINANCIALS} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                    <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={value => `${value / 1000000}M`} />
                    <Tooltip formatter={value => `₩${Number(value).toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="revenue" name="매출" barSize={20} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cost" name="비용" barSize={20} fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      name="순이익"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revenue Breakdown */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
              <h3 className="text-lg font-bold text-gray-800 mb-1">상품별 매출 비중</h3>
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
                  <span className="text-xs text-gray-500">전체</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
