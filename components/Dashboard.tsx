import React, { useMemo } from 'react';
import { AlertTriangle, Package, DollarSign, ClipboardList, RefreshCw } from 'lucide-react';
import DashboardMenuAnalysis from './DashboardMenuAnalysis';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, BarChart, Cell } from 'recharts';
import { useMenu } from '../context/MenuContext';
import { useHistoricalPlans } from '../context/HistoricalPlansContext';
import { TARGET_CONFIGS } from '../constants';
import { MenuCategory, TargetType, MenuItem } from '../types';

const CATEGORY_COLORS: Record<string, string> = {
  [MenuCategory.SOUP]: '#3b82f6',
  [MenuCategory.MAIN]: '#f97316',
  [MenuCategory.SIDE]: '#22c55e',
  [MenuCategory.DESSERT]: '#a855f7',
};

const TRAFFIC_LIGHT = {
  ok: 'bg-green-100 text-green-700',
  warn: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
};

const Dashboard: React.FC = () => {
  const { menuItems, isLoading: menuLoading } = useMenu();
  const { plans, isLoading: historyLoading } = useHistoricalPlans();

  // ── 1. 메뉴 포트폴리오 현황 ──
  const portfolioData = useMemo(() => {
    const cats = Object.values(MenuCategory);
    return cats.map(cat => {
      const inCat = menuItems.filter(m => m.category === cat);
      return {
        category: cat,
        active: inCat.filter(m => !m.isUnused).length,
        unused: inCat.filter(m => m.isUnused).length,
        total: inCat.length,
      };
    });
  }, [menuItems]);

  // ── 2. 가격/원가 분포 ──
  const priceDistribution = useMemo(() => {
    const active = menuItems.filter(m => !m.isUnused);
    const buckets = [
      { label: '~500원', min: 0, max: 500 },
      { label: '500~1000', min: 500, max: 1000 },
      { label: '1000~2000', min: 1000, max: 2000 },
      { label: '2000~3000', min: 2000, max: 3000 },
      { label: '3000~5000', min: 3000, max: 5000 },
      { label: '5000원~', min: 5000, max: Infinity },
    ];
    return buckets.map(b => ({
      range: b.label,
      count: active.filter(m => m.cost >= b.min && m.cost < b.max).length,
    }));
  }, [menuItems]);

  // ── 3. 식단 구성 가능 여부 ──
  const compositionCheck = useMemo(() => {
    const active = menuItems.filter(m => !m.isUnused);
    return Object.values(TargetType)
      .map(targetType => {
        const config = TARGET_CONFIGS[targetType];
        if (!config) return null;

        const checks: { cat: string; required: number; available: number; status: 'ok' | 'warn' | 'danger' }[] = [];
        const comp = config.composition;

        for (const [cat, needed] of Object.entries(comp)) {
          if (!needed) continue;
          let available = active.filter(m => m.category === cat);

          // Apply banned tags filter
          if (config.bannedTags.length > 0) {
            available = available.filter(m => !m.tags.some(t => config.bannedTags.includes(t)));
          }

          const count = available.length;
          // 60일 비중복 기준: 60일 ≈ 9주, 화수목+금토월 2개 주기
          const weeksNeeded = needed * Math.ceil(60 / 7); // 9주치
          const status = count >= weeksNeeded * 2 ? 'ok' : count >= weeksNeeded ? 'warn' : 'danger';
          checks.push({ cat, required: needed, available: count, status });
        }

        const worstStatus = checks.some(c => c.status === 'danger')
          ? 'danger'
          : checks.some(c => c.status === 'warn')
            ? 'warn'
            : 'ok';

        return {
          target: targetType,
          shortLabel: targetType.replace(/ 식단$/, ''),
          checks,
          worstStatus,
          totalRequired: Object.values(comp).reduce((sum, n) => sum + (n || 0), 0),
        };
      })
      .filter(Boolean) as {
      target: TargetType;
      shortLabel: string;
      checks: { cat: string; required: number; available: number; status: 'ok' | 'warn' | 'danger' }[];
      worstStatus: 'ok' | 'warn' | 'danger';
      totalRequired: number;
    }[];
  }, [menuItems]);

  // ── 4. 중복 위험 분석 (최근 30일) ──
  const duplicationData = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoff = cutoffDate.toISOString().slice(0, 10);

    const menuCount: Record<string, number> = {};
    const recentPlans = plans.filter(p => p.date >= cutoff);

    for (const plan of recentPlans) {
      for (const target of plan.targets) {
        for (const item of target.items) {
          const name = item.name
            .replace(/_냉장|_반조리|_냉동/g, '')
            .replace(/\s+\d+$/, '')
            .trim();
          menuCount[name] = (menuCount[name] || 0) + 1;
        }
      }
    }

    return Object.entries(menuCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, count]) => ({ name, count }));
  }, [plans]);

  if (menuLoading && menuItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">메뉴 데이터 로딩 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500 mb-1">전체 메뉴</p>
          <h3 className="text-2xl font-bold text-gray-900">{menuItems.length}개</h3>
          <p className="text-xs text-gray-400 mt-1">
            활성 {menuItems.filter(m => !m.isUnused).length} / 미사용 {menuItems.filter(m => m.isUnused).length}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500 mb-1">평균 원가</p>
          <h3 className="text-2xl font-bold text-gray-900">
            {menuItems.length > 0
              ? `${Math.round(menuItems.filter(m => !m.isUnused).reduce((s, m) => s + m.cost, 0) / Math.max(menuItems.filter(m => !m.isUnused).length, 1)).toLocaleString()}원`
              : '-'}
          </h3>
          <p className="text-xs text-gray-400 mt-1">활성 메뉴 기준</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500 mb-1">식단 유형</p>
          <h3 className="text-2xl font-bold text-gray-900">{Object.keys(TARGET_CONFIGS).length}개</h3>
          <p className="text-xs text-gray-400 mt-1">구성 정책 설정됨</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500 mb-1">히스토리</p>
          <h3 className="text-2xl font-bold text-gray-900">{plans.length}일</h3>
          <p className="text-xs text-gray-400 mt-1">{historyLoading ? '로딩 중...' : '식단 데이터 누적'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. 메뉴 포트폴리오 현황 */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-bold text-gray-800">메뉴 포트폴리오 현황</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">카테고리별 활성/미사용 메뉴 수</p>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={portfolioData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="active" name="활성" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="unused" name="미사용" stackId="a" fill="#d1d5db" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. 가격/원가 분포 */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-bold text-gray-800">원가 분포</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">활성 메뉴의 원가대별 분포</p>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priceDistribution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="메뉴 수" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                  {priceDistribution.map((_, index) => (
                    <Cell key={index} fill={index < 3 ? '#22c55e' : index < 5 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. 식단 구성 가능 여부 */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-bold text-gray-800">식단 구성 가능 여부</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          {Object.keys(TARGET_CONFIGS).length}개 타겟별 카테고리 메뉴 충분도 (60일 비중복 기준)
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">식단 유형</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">구성 (개)</th>
                {Object.values(MenuCategory).map(cat => (
                  <th key={cat} className="px-3 py-2 text-center text-xs font-semibold text-gray-500">
                    {cat}
                  </th>
                ))}
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {compositionCheck.map(row => {
                const config = TARGET_CONFIGS[row.target as TargetType];
                return (
                  <tr key={row.target} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 text-xs font-medium text-gray-700">{row.shortLabel}</td>
                    <td className="px-3 py-2 text-center text-xs text-gray-600">{row.totalRequired}</td>
                    {Object.values(MenuCategory).map(cat => {
                      const check = row.checks.find(c => c.cat === cat);
                      if (!check)
                        return (
                          <td key={cat} className="px-3 py-2 text-center text-xs text-gray-300">
                            —
                          </td>
                        );
                      return (
                        <td key={cat} className="px-3 py-2 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${TRAFFIC_LIGHT[check.status]}`}
                          >
                            {check.available}개
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${TRAFFIC_LIGHT[row.worstStatus]}`}
                      >
                        {row.worstStatus === 'ok' ? '충분' : row.worstStatus === 'warn' ? '주의' : '부족'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. 메뉴 분석 (유사 클러스터 / 반찬 갭 / 히스토리 태그 학습) */}
      <DashboardMenuAnalysis />

      {/* 5. 중복 위험 분석 */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-bold text-gray-800">중복 위험 분석</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">최근 30일 가장 많이 반복된 메뉴 Top 15</p>
        {duplicationData.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            {historyLoading ? '히스토리 로딩 중...' : '최근 30일 식단 데이터가 없습니다'}
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={duplicationData} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={95} />
                <Tooltip />
                <Bar dataKey="count" name="사용 횟수" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                  {duplicationData.map((entry, index) => (
                    <Cell key={index} fill={entry.count >= 10 ? '#ef4444' : entry.count >= 5 ? '#f59e0b' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
