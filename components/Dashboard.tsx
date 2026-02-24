import React, { useMemo, useState } from 'react';
import { AlertTriangle, TrendingUp, BarChart3, Target, RefreshCw, X } from 'lucide-react';
import DashboardMenuAnalysis from './DashboardMenuAnalysis';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  BarChart,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
} from 'recharts';
import { useMenu } from '../context/MenuContext';
import { useHistoricalPlans } from '../context/HistoricalPlansContext';
import { TARGET_CONFIGS } from '../constants';
import { MenuCategory, TargetType } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// 정책에 저장된 식단 목록 로드
const loadPolicyTargets = (): Set<TargetType> => {
  try {
    const raw = localStorage.getItem('zsub_plan_configs');
    if (raw) {
      const parsed = JSON.parse(raw);
      const keys = Object.keys(parsed) as TargetType[];
      if (keys.length > 0) return new Set(keys);
    }
  } catch {
    // ignore parse errors
  }
  return new Set(Object.keys(TARGET_CONFIGS) as TargetType[]);
};

const CATEGORY_COLORS: Record<string, string> = {
  [MenuCategory.SOUP]: '#3b82f6',
  [MenuCategory.MAIN]: '#f97316',
  [MenuCategory.SIDE]: '#22c55e',
  [MenuCategory.DESSERT]: '#a855f7',
};

const TARGET_LABELS: Record<string, string> = {
  [TargetType.VALUE]: '실속',
  [TargetType.SENIOR_HEALTH]: '건강시니어',
  [TargetType.SENIOR]: '시니어',
  [TargetType.YOUTH]: '청소연구소',
  [TargetType.YOUTH_MAIN]: '청소메인',
  [TargetType.FAMILY_PLUS]: '든든가족',
  [TargetType.FAMILY]: '가족',
  [TargetType.KIDS_PLUS]: '든든아이',
  [TargetType.KIDS]: '아이',
  [TargetType.SIDE_ONLY]: '골고루반찬',
};

const CYCLES_8WEEKS = 16; // 8주 × 2주기(화수목+금토월)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BubbleTooltip = ({ active, payload }: any) => {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-stone-200 rounded-lg px-3 py-2 shadow-lg text-xs">
      <div className="font-bold text-stone-800 mb-1">{d.category}</div>
      <div className="text-stone-600">판매가: {d.x.toLocaleString()}원</div>
      <div className="text-stone-600">원가율: {d.y}%</div>
      <div className="text-stone-600">메뉴 수: {d.z}개</div>
      <div className="text-stone-400 mt-1 text-[10px]">클릭하면 메뉴 목록 표시</div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { menuItems, isLoading: menuLoading } = useMenu();
  const { plans, isLoading: historyLoading } = useHistoricalPlans();
  const policyTargets = useMemo(() => loadPolicyTargets(), []);
  const [selectedTarget, setSelectedTarget] = useState<TargetType>(Object.keys(TARGET_CONFIGS)[0] as TargetType);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBubble, setSelectedBubble] = useState<{
    category: string;
    menus: string[];
    avgPrice: number;
    avgRatio: number;
  } | null>(null);
  const [dupTargetFilter, setDupTargetFilter] = useState<string>('all');

  // ── 1. 버블 차트: 판매가(X) × 원가율(Y) × 카테고리별 메뉴 수(Size) ──
  const bubbleData = useMemo(() => {
    const active = menuItems.filter(m => !m.isUnused && m.recommendedPrice > 0);
    const priceBucket = 3000;
    const ratioBucket = 10;

    return Object.values(MenuCategory)
      .map(cat => {
        const items = active.filter(m => m.category === cat);
        const buckets = new Map<string, { prices: number[]; ratios: number[]; names: string[] }>();

        items.forEach(m => {
          const ratio = (m.cost / m.recommendedPrice) * 100;
          const pk = Math.floor(m.recommendedPrice / priceBucket);
          const rk = Math.floor(ratio / ratioBucket);
          const key = `${pk}-${rk}`;
          if (!buckets.has(key)) buckets.set(key, { prices: [], ratios: [], names: [] });
          const b = buckets.get(key)!;
          b.prices.push(m.recommendedPrice);
          b.ratios.push(ratio);
          b.names.push(m.name);
        });

        return {
          category: cat,
          color: CATEGORY_COLORS[cat],
          data: Array.from(buckets.values()).map(d => ({
            x: Math.round(d.prices.reduce((a, b) => a + b, 0) / d.prices.length),
            y: Math.round((d.ratios.reduce((a, b) => a + b, 0) / d.ratios.length) * 10) / 10,
            z: d.prices.length,
            category: cat,
            menuNames: d.names,
          })),
        };
      })
      .filter(d => d.data.length > 0);
  }, [menuItems]);

  // ── 2. 식단별 구성 충분도 (8주 기준) ──
  const compositionData = useMemo(() => {
    const active = menuItems.filter(m => !m.isUnused);

    return Object.entries(TARGET_CONFIGS)
      .filter(([key]) => policyTargets.has(key as TargetType))
      .map(([targetType, config]) => {
        const cats = Object.entries(config.composition)
          .filter(([, n]) => n && n > 0)
          .map(([cat, needed]) => {
            let available = active.filter(m => m.category === cat);
            if (config.bannedTags.length > 0) {
              available = available.filter(m => !m.tags.some(t => config.bannedTags.includes(t)));
            }
            if (config.requiredTags.length > 0) {
              available = available.filter(m => config.requiredTags.some(t => m.tags.includes(t)));
            }
            const neededTotal = (needed || 0) * CYCLES_8WEEKS;
            const availCount = available.length;
            const fillRate = neededTotal > 0 ? Math.round((availCount / neededTotal) * 100) : 100;
            const shortage = Math.max(0, neededTotal - availCount);
            return { category: cat, needed: neededTotal, available: availCount, fillRate, shortage };
          });

        return {
          targetType: targetType as TargetType,
          label: TARGET_LABELS[targetType] || (targetType as string).replace(/ 식단$/, ''),
          categories: cats,
        };
      });
  }, [menuItems, policyTargets]);

  // 사용된 카테고리 목록
  const compositionCategories = useMemo(() => {
    const set = new Set<string>();
    compositionData.forEach(d => d.categories.forEach(c => set.add(c.category)));
    return Array.from(set);
  }, [compositionData]);

  // 선택된 식단 상세
  const selectedDetail = useMemo(() => {
    return compositionData.find(d => d.targetType === selectedTarget) || null;
  }, [compositionData, selectedTarget]);

  // 상세분석: 선택된 카테고리의 보유 메뉴 리스트
  const categoryMenus = useMemo(() => {
    if (!selectedCategory || !selectedDetail) return [];
    const config = TARGET_CONFIGS[selectedTarget];
    return menuItems
      .filter(m => {
        if (m.isUnused) return false;
        if (m.category !== selectedCategory) return false;
        if (config.bannedTags.length > 0 && m.tags.some(t => config.bannedTags.includes(t))) return false;
        if (config.requiredTags.length > 0 && !config.requiredTags.some(t => m.tags.includes(t))) return false;
        return true;
      })
      .sort((a, b) => b.recommendedPrice - a.recommendedPrice);
  }, [selectedCategory, selectedDetail, selectedTarget, menuItems]);

  // ── 3. 중복 위험 분석 (최근 30일) ──
  const duplicationData = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoff = cutoffDate.toISOString().slice(0, 10);

    const menuCount: Record<string, number> = {};
    const recentPlans = plans.filter(p => p.date >= cutoff);

    for (const plan of recentPlans) {
      for (const target of plan.targets) {
        if (dupTargetFilter !== 'all' && target.targetType !== dupTargetFilter) continue;
        for (const item of target.items) {
          const name = item.name
            .replace(/_냉장|_반조리|_냉동/g, '')
            .replace(/\s+\d+$/, '')
            .trim();
          if (!name || /^\d+$/.test(name) || name.length < 2) continue;
          menuCount[name] = (menuCount[name] || 0) + 1;
        }
      }
    }

    return Object.entries(menuCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, count]) => ({ name, count }));
  }, [plans, dupTargetFilter]);

  if (menuLoading && menuItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-stone-400" />
        <span className="ml-2 text-stone-500">메뉴 데이터 로딩 중...</span>
      </div>
    );
  }

  const activeCount = menuItems.filter(m => !m.isUnused).length;

  return (
    <div className="space-y-6 pb-10">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <p className="text-sm font-medium text-stone-500 mb-1">활성 메뉴</p>
          <h3 className="text-2xl font-bold text-stone-900">{activeCount}개</h3>
          <p className="text-xs text-stone-400 mt-1">전체 {menuItems.length}개 중</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-blue-500">
          <p className="text-sm font-medium text-stone-500 mb-1">평균 원가</p>
          <h3 className="text-2xl font-bold text-stone-900">
            {activeCount > 0
              ? `${Math.round(menuItems.filter(m => !m.isUnused).reduce((s, m) => s + m.cost, 0) / activeCount).toLocaleString()}원`
              : '-'}
          </h3>
          <p className="text-xs text-stone-400 mt-1">활성 메뉴 기준</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-purple-500">
          <p className="text-sm font-medium text-stone-500 mb-1">식단 유형</p>
          <h3 className="text-2xl font-bold text-stone-900">{Object.keys(TARGET_CONFIGS).length}개</h3>
          <p className="text-xs text-stone-400 mt-1">구성 정책 설정됨</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500">
          <p className="text-sm font-medium text-stone-500 mb-1">히스토리</p>
          <h3 className="text-2xl font-bold text-stone-900">{plans.length}일</h3>
          <p className="text-xs text-stone-400 mt-1">{historyLoading ? '로딩 중...' : '식단 데이터 누적'}</p>
        </Card>
      </div>

      {/* 1. 가격-원가 포트폴리오 (Bubble Chart) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            메뉴 가격-원가 포트폴리오
          </CardTitle>
          <p className="text-xs text-stone-500">
            판매가격(X) x 원가율(Y) 기준 카테고리별 메뉴 분포 · 버블 크기 = 메뉴 수 · 클릭 시 메뉴 목록 표시
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className={selectedBubble ? 'flex-1 min-w-0' : 'w-full'}>
              <div className="h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="판매가"
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}천`}
                      tick={{ fontSize: 11 }}
                      label={{ value: '판매가격 (원)', position: 'bottom', offset: -5, fontSize: 11, fill: '#9ca3af' }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="원가율"
                      unit="%"
                      tick={{ fontSize: 11 }}
                      label={{
                        value: '원가율 (%)',
                        angle: -90,
                        position: 'insideLeft',
                        offset: 10,
                        fontSize: 11,
                        fill: '#9ca3af',
                      }}
                    />
                    <ZAxis type="number" dataKey="z" range={[150, 1500]} name="메뉴 수" />
                    <Tooltip content={<BubbleTooltip />} />
                    <Legend />
                    {bubbleData.map(series => (
                      <Scatter
                        key={series.category}
                        name={series.category}
                        data={series.data}
                        fill={series.color}
                        fillOpacity={0.6}
                        stroke={series.color}
                        strokeWidth={1}
                        cursor="pointer"
                        onClick={(data: { category: string; menuNames: string[]; x: number; y: number }) => {
                          setSelectedBubble({
                            category: data.category,
                            menus: data.menuNames,
                            avgPrice: data.x,
                            avgRatio: data.y,
                          });
                        }}
                      />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
            {selectedBubble && (
              <div className="w-64 shrink-0 border border-stone-200 rounded-lg p-4 bg-stone-50 overflow-y-auto max-h-[380px]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-stone-800">{selectedBubble.category}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedBubble(null)}
                    className="h-auto p-0 text-stone-400 hover:text-stone-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-xs text-stone-500 mb-3 space-y-0.5">
                  <div>평균 판매가: {selectedBubble.avgPrice.toLocaleString()}원</div>
                  <div>평균 원가율: {selectedBubble.avgRatio}%</div>
                  <div>메뉴 수: {selectedBubble.menus.length}개</div>
                </div>
                <div className="border-t border-stone-200 pt-2">
                  <p className="text-[11px] font-semibold text-stone-600 mb-1.5">메뉴 목록</p>
                  <div className="space-y-1">
                    {selectedBubble.menus.map((name, i) => (
                      <div
                        key={i}
                        className="text-xs text-stone-700 bg-white px-2 py-1 rounded border border-stone-100"
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. 식단별 메뉴풀 현황 (2개 그래프) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2A. 전체 요약: 히트맵 테이블 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              전체 식단 메뉴 충분도
            </CardTitle>
            <p className="text-xs text-stone-500">
              8주(16회) 비반복 기준 · 보유/필요 · 색상: 초록(100%+) / 노랑(50%+) / 빨강(50% 미만)
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="px-2 py-2 text-left text-[11px] font-semibold text-stone-500 w-24">식단</th>
                    {compositionCategories.map(cat => (
                      <th key={cat} className="px-2 py-2 text-center text-[11px] font-semibold text-stone-500">
                        {cat}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {compositionData.map(d => (
                    <tr key={d.targetType} className="hover:bg-stone-50/30">
                      <td className="px-2 py-1.5 text-[11px] font-medium text-stone-700 whitespace-nowrap">
                        {d.label}
                      </td>
                      {compositionCategories.map(cat => {
                        const c = d.categories.find(cc => cc.category === cat);
                        if (!c)
                          return (
                            <td key={cat} className="px-2 py-1.5 text-center text-stone-300">
                              -
                            </td>
                          );
                        const bg =
                          c.fillRate >= 100
                            ? 'bg-green-100 text-green-800'
                            : c.fillRate >= 50
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800';
                        return (
                          <td key={cat} className="px-1 py-1">
                            <div className={`rounded px-1.5 py-1 text-center ${bg}`}>
                              <div className="font-bold text-[11px]">
                                {c.available}/{c.needed}
                              </div>
                              {c.shortage > 0 && <div className="text-[9px] opacity-80">-{c.shortage}</div>}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 2B. 식단 상세: 선택한 식단의 필요 vs 보유 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="w-5 h-5 text-emerald-600" />
                식단 상세 분석
              </CardTitle>
              <select
                value={selectedTarget}
                onChange={e => setSelectedTarget(e.target.value as TargetType)}
                className="text-sm border border-stone-300 rounded-lg px-3 py-1.5 bg-white"
              >
                {compositionData.map(d => (
                  <option key={d.targetType} value={d.targetType}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-stone-500">
              {TARGET_LABELS[selectedTarget] || selectedTarget} 식단의 카테고리별 필요 vs 보유 메뉴 수
            </p>
          </CardHeader>
          <CardContent>
            {selectedDetail ? (
              <>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={selectedDetail.categories.map(c => ({
                        category: c.category,
                        '필요 (8주)': c.needed,
                        보유: c.available,
                      }))}
                      margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="필요 (8주)" fill="#e5e7eb" radius={[2, 2, 0, 0]} />
                      <Bar
                        dataKey="보유"
                        radius={[2, 2, 0, 0]}
                        cursor="pointer"
                        onClick={(_data: unknown, index: number) => {
                          const cat = selectedDetail!.categories[index]?.category;
                          if (cat) setSelectedCategory(prev => (prev === cat ? null : cat));
                        }}
                      >
                        {selectedDetail.categories.map((c, i) => (
                          <Cell
                            key={i}
                            fill={c.fillRate >= 100 ? '#22c55e' : c.fillRate >= 50 ? '#f59e0b' : '#ef4444'}
                            stroke={selectedCategory === c.category ? '#1d4ed8' : undefined}
                            strokeWidth={selectedCategory === c.category ? 2 : 0}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* 부족 메뉴군 요약 */}
                <div className="mt-4 space-y-1.5">
                  {selectedDetail.categories
                    .filter(c => c.shortage > 0)
                    .map(c => (
                      <div
                        key={c.category}
                        className="flex items-center justify-between text-sm px-3 py-1.5 bg-red-50 rounded-lg"
                      >
                        <span className="text-stone-700 font-medium">{c.category}</span>
                        <span className="text-red-600 font-bold">
                          {c.shortage}개 부족
                          <span className="text-red-400 font-normal text-xs ml-1">
                            (보유 {c.available} / 필요 {c.needed})
                          </span>
                        </span>
                      </div>
                    ))}
                  {selectedDetail.categories.every(c => c.shortage === 0) && (
                    <div className="text-center py-3 text-green-600 text-sm font-medium bg-green-50 rounded-lg">
                      모든 카테고리 메뉴 충분
                    </div>
                  )}
                </div>

                {/* 카테고리 클릭 시 보유 메뉴 리스트 */}
                {selectedCategory && categoryMenus.length > 0 && (
                  <div className="mt-4 border border-blue-200 rounded-lg overflow-hidden">
                    <div className="bg-blue-50 px-3 py-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-800">
                        {selectedCategory} 보유 메뉴 ({categoryMenus.length}개)
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCategory(null)}
                        className="h-auto p-0 text-blue-400 hover:text-blue-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto divide-y divide-stone-100">
                      {categoryMenus.map(m => (
                        <div
                          key={m.id}
                          className="px-3 py-1.5 flex items-center justify-between text-xs hover:bg-stone-50"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-stone-800 truncate">{m.name}</span>
                            <div className="flex gap-1 flex-shrink-0">
                              {m.tags.slice(0, 3).map(t => (
                                <span key={t} className="px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded text-[10px]">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                            <span className="text-stone-500">{m.recommendedPrice.toLocaleString()}원</span>
                            <span className="text-stone-400">원가 {m.cost.toLocaleString()}원</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-stone-400 text-sm">식단을 선택하세요</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. 메뉴 분석 (유사 클러스터 / 반찬 갭 / 히스토리 태그 학습) */}
      <DashboardMenuAnalysis />

      {/* 4. 중복 위험 분석 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-emerald-600" />
              중복 위험 분석
            </CardTitle>
            <select
              value={dupTargetFilter}
              onChange={e => setDupTargetFilter(e.target.value)}
              className="text-sm border border-stone-300 rounded-lg px-3 py-1.5 bg-white"
            >
              <option value="all">전체 식단</option>
              {Object.entries(TARGET_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-stone-500">최근 30일 가장 많이 반복된 메뉴 Top 15</p>
        </CardHeader>
        <CardContent>
          {duplicationData.length === 0 ? (
            <div className="text-center py-8 text-stone-400 text-sm">
              {historyLoading ? '히스토리 로딩 중...' : '최근 30일 식단 데이터가 없습니다'}
            </div>
          ) : (
            <div className="h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={duplicationData} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={95} />
                  <Tooltip />
                  <Bar dataKey="count" name="사용 횟수" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                    {duplicationData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.count >= 10 ? '#ef4444' : entry.count >= 5 ? '#f59e0b' : '#3b82f6'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
