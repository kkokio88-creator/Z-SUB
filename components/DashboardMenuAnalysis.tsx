import React, { useMemo, useState, useCallback } from 'react';
import { Layers, Search, BookOpen, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useMenu } from '../context/MenuContext';
import { useHistoricalPlans } from '../context/HistoricalPlansContext';
import {
  buildSimilarMenuClusters,
  analyzeKoreanBanchanGap,
  analyzeTagGapByCategory,
  analyzeHistoryForTags,
  TagSuggestion,
} from '../services/tagAnalysisService';

const TRAFFIC_LIGHT = {
  ok: 'bg-green-100 text-green-700',
  warn: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
};

type TabId = 'clusters' | 'gaps' | 'history';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'clusters', label: '유사 메뉴 클러스터', icon: <Layers className="w-4 h-4" /> },
  { id: 'gaps', label: '반찬 갭 + 태깅률', icon: <Search className="w-4 h-4" /> },
  { id: 'history', label: '히스토리 태그 학습', icon: <BookOpen className="w-4 h-4" /> },
];

const DashboardMenuAnalysis: React.FC = () => {
  const { menuItems, updateItem, saveToStorage } = useMenu();
  const { plans } = useHistoricalPlans();
  const [activeTab, setActiveTab] = useState<TabId>('clusters');
  const [showAllClusters, setShowAllClusters] = useState(false);
  const [tagFilter, setTagFilter] = useState<'all' | '아이선호' | '시니어'>('all');
  const [appliedTags, setAppliedTags] = useState<Set<string>>(new Set());

  // ── 데이터 계산 ──
  const clusters = useMemo(() => buildSimilarMenuClusters(menuItems), [menuItems]);
  const banchanGaps = useMemo(() => analyzeKoreanBanchanGap(menuItems), [menuItems]);
  const tagGaps = useMemo(() => analyzeTagGapByCategory(menuItems), [menuItems]);
  const historySuggestions = useMemo(() => analyzeHistoryForTags(plans, menuItems), [plans, menuItems]);

  const filteredSuggestions = useMemo(() => {
    if (tagFilter === 'all') return historySuggestions;
    return historySuggestions.filter(s => s.suggestedTag === tagFilter);
  }, [historySuggestions, tagFilter]);

  const missingBanchan = useMemo(() => banchanGaps.filter(g => !g.hasMatch).length, [banchanGaps]);
  const dangerCategories = useMemo(
    () => tagGaps.filter(g => g.kidStatus === 'danger' || g.seniorStatus === 'danger').length,
    [tagGaps]
  );

  // ── 태그 추가 핸들러 ──
  const handleAddTag = useCallback(
    (suggestion: TagSuggestion) => {
      const item = menuItems.find(m => m.id === suggestion.menuId);
      if (!item || item.tags.includes(suggestion.suggestedTag)) return;
      const updated = { ...item, tags: [...item.tags, suggestion.suggestedTag] };
      updateItem(item.id, updated);
      setAppliedTags(prev => new Set(prev).add(`${item.id}-${suggestion.suggestedTag}`));
    },
    [menuItems, updateItem]
  );

  const handleAddAll = useCallback(() => {
    for (const s of filteredSuggestions) {
      const key = `${s.menuId}-${s.suggestedTag}`;
      if (appliedTags.has(key)) continue;
      const item = menuItems.find(m => m.id === s.menuId);
      if (!item || item.tags.includes(s.suggestedTag)) continue;
      const updated = { ...item, tags: [...item.tags, s.suggestedTag] };
      updateItem(item.id, updated);
      setAppliedTags(prev => new Set(prev).add(key));
    }
    saveToStorage();
  }, [filteredSuggestions, appliedTags, menuItems, updateItem, saveToStorage]);

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <h3 className="text-lg font-bold text-gray-800 mb-4">메뉴 분석</h3>

      {/* 탭 네비게이션 */}
      <div className="flex gap-1 border-b border-gray-200 mb-5">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 탭 1: 유사 메뉴 클러스터 ── */}
      {activeTab === 'clusters' && (
        <div>
          <p className="text-xs text-gray-500 mb-3">유사한 이름의 메뉴를 그룹핑 ({clusters.length}개 클러스터)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(showAllClusters ? clusters : clusters.slice(0, 10)).map((cluster, idx) => (
              <div key={idx} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-800">{cluster.representative}</span>
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                    {cluster.members.length}개
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {cluster.members.map(m => (
                    <span key={m.id} className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                      {m.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {clusters.length > 10 && (
            <button
              onClick={() => setShowAllClusters(v => !v)}
              className="flex items-center gap-1 mt-3 text-sm text-blue-600 hover:text-blue-800"
            >
              {showAllClusters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showAllClusters ? '접기' : `전체 보기 (${clusters.length}개)`}
            </button>
          )}
        </div>
      )}

      {/* ── 탭 2: 반찬 갭 + 태깅률 ── */}
      {activeTab === 'gaps' && (
        <div className="space-y-6">
          {/* 요약 */}
          <div className="flex gap-4 text-sm">
            <span
              className={`px-3 py-1 rounded ${missingBanchan > 5 ? TRAFFIC_LIGHT.danger : missingBanchan > 0 ? TRAFFIC_LIGHT.warn : TRAFFIC_LIGHT.ok}`}
            >
              없는 반찬: {missingBanchan}개
            </span>
            <span className={`px-3 py-1 rounded ${dangerCategories > 0 ? TRAFFIC_LIGHT.danger : TRAFFIC_LIGHT.ok}`}>
              부족 카테고리: {dangerCategories}개
            </span>
          </div>

          {/* 한식 반찬 매칭 테이블 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">한식 반찬 레퍼런스 매칭</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">반찬명</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">분류</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">상태</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">매칭 메뉴</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {banchanGaps.map((gap, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="px-3 py-1.5 text-xs text-gray-700">{gap.reference.name}</td>
                      <td className="px-3 py-1.5 text-xs text-gray-500">{gap.reference.category}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${gap.hasMatch ? TRAFFIC_LIGHT.ok : TRAFFIC_LIGHT.danger}`}
                        >
                          {gap.hasMatch ? '있음' : '없음'}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-xs text-gray-500 max-w-[200px] truncate">
                        {gap.matchedMenus.length > 0 ? gap.matchedMenus.slice(0, 3).join(', ') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 카테고리별 태깅률 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">카테고리별 태깅률</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">카테고리</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">활성 메뉴</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">아이선호</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">시니어</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tagGaps.map(gap => (
                    <tr key={gap.category} className="hover:bg-gray-50/50">
                      <td className="px-3 py-1.5 text-xs font-medium text-gray-700">{gap.category}</td>
                      <td className="px-3 py-1.5 text-center text-xs text-gray-600">{gap.totalActive}개</td>
                      <td className="px-3 py-1.5 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${TRAFFIC_LIGHT[gap.kidStatus]}`}
                        >
                          {gap.kidTagged}개 ({gap.kidRate}%)
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${TRAFFIC_LIGHT[gap.seniorStatus]}`}
                        >
                          {gap.seniorTagged}개 ({gap.seniorRate}%)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 탭 3: 히스토리 태그 학습 ── */}
      {activeTab === 'history' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500">
              히스토리에서 2회+ 사용되었지만 태그 없는 메뉴 ({filteredSuggestions.length}건)
            </p>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {(['all', '아이선호', '시니어'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setTagFilter(f)}
                    className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                      tagFilter === f ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f === 'all' ? '전체' : f}
                  </button>
                ))}
              </div>
              {filteredSuggestions.length > 0 && (
                <button
                  onClick={handleAddAll}
                  className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  전체 추가
                </button>
              )}
            </div>
          </div>

          {filteredSuggestions.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              {plans.length === 0 ? '히스토리 데이터가 없습니다' : '추천할 태그가 없습니다'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">메뉴명</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">카테고리</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">추천 태그</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">사용 횟수</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">식단 유형</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSuggestions.map(s => {
                    const key = `${s.menuId}-${s.suggestedTag}`;
                    const isApplied = appliedTags.has(key);
                    return (
                      <tr key={key} className="hover:bg-gray-50/50">
                        <td className="px-3 py-1.5 text-xs font-medium text-gray-700">{s.menuName}</td>
                        <td className="px-3 py-1.5 text-xs text-gray-500">{s.category}</td>
                        <td className="px-3 py-1.5 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                              s.suggestedTag === '아이선호'
                                ? 'bg-pink-100 text-pink-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {s.suggestedTag}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-center text-xs text-gray-600">{s.usageCount}회</td>
                        <td className="px-3 py-1.5 text-xs text-gray-500 max-w-[150px] truncate">
                          {s.usedInTargets.map(t => t.replace(/ 식단$/, '')).join(', ')}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {isApplied ? (
                            <span className="inline-flex items-center gap-0.5 text-green-600 text-xs">
                              <Check className="w-3.5 h-3.5" /> 추가됨
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAddTag(s)}
                              className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                            >
                              태그 추가
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardMenuAnalysis;
