import React from 'react';
import { Database, Search, Save, RefreshCw, Plus, Upload, Wand2, Eraser } from 'lucide-react';
import { MenuCategory } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface MenuToolbarProps {
  filteredCount: number;
  stats: { total: number; active: number; unused: number; byCat: Record<string, number> };
  filterCategory: string;
  setFilterCategory: (v: string) => void;
  filterUsage: 'ALL' | 'active' | 'unused';
  setFilterUsage: (v: 'ALL' | 'active' | 'unused') => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  isLoading: boolean;
  onAutoClassify: () => void;
  onResetTags: () => void;
  onCleanup: () => void;
  onRefresh: () => void;
  onImport: () => void;
  onCreateNew: () => void;
  onSave: () => void;
}

const MenuToolbar: React.FC<MenuToolbarProps> = ({
  filteredCount,
  stats,
  filterCategory,
  setFilterCategory,
  filterUsage,
  setFilterUsage,
  searchTerm,
  setSearchTerm,
  isLoading,
  onAutoClassify,
  onResetTags,
  onCleanup,
  onRefresh,
  onImport,
  onCreateNew,
  onSave,
}) => (
  <div className="p-4 border-b border-stone-100 space-y-3 bg-stone-50/50">
    <div className="flex justify-between items-center">
      <h3 className="font-bold text-stone-800 flex items-center gap-2">
        <Database className="w-4 h-4 text-stone-500" /> 반찬 리스트
        <span className="text-xs font-normal text-stone-400 ml-1">({filteredCount.toLocaleString()}개)</span>
      </h3>
      <div className="flex gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={onAutoClassify}
          className="flex items-center gap-1 bg-amber-50 border-amber-200 text-amber-700 text-xs font-medium hover:bg-amber-100"
          title="히스토리 기반 카테고리/주재료/원가/가격 자동 입력"
        >
          <Wand2 className="w-3.5 h-3.5" /> 자동분류
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onResetTags}
          className="flex items-center gap-1 text-xs font-medium text-rose-600 border-rose-200 hover:bg-rose-50"
          title="모든 메뉴의 태그를 초기화"
        >
          <Eraser className="w-3.5 h-3.5" /> 태그 초기화
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onCleanup}
          className="flex items-center gap-1 text-xs font-medium"
          title="빈 이름/중복 항목 정리"
        >
          <Eraser className="w-3.5 h-3.5" /> 정리
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5"
          title="시트 새로고침"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
        <Button variant="outline" size="sm" onClick={onImport} className="p-1.5" title="CSV 가져오기">
          <Upload className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          onClick={onCreateNew}
          className="flex items-center gap-1 bg-primary-600 text-white text-xs font-medium hover:bg-primary-700"
        >
          <Plus className="w-3.5 h-3.5" /> 신규추가
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          className="flex items-center gap-1 bg-green-600 text-white text-xs font-medium hover:bg-green-700"
        >
          <Save className="w-3.5 h-3.5" /> 저장
        </Button>
      </div>
    </div>

    {/* Stats Summary */}
    <div className="flex gap-3 text-[11px] text-stone-500">
      <span>
        전체 <strong className="text-stone-700">{stats.total}</strong>개
      </span>
      <span className="text-stone-300">|</span>
      <span>
        사용 <strong className="text-green-600">{stats.active}</strong>개
      </span>
      <span className="text-stone-300">|</span>
      <span>
        미사용 <strong className="text-stone-400">{stats.unused}</strong>개
      </span>
      <span className="text-stone-300">|</span>
      {Object.entries(stats.byCat).map(([cat, count]) => (
        <span key={cat}>
          {cat} <strong>{count}</strong>
        </span>
      ))}
    </div>

    {/* Filters Row */}
    <div className="flex gap-2 items-center flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
        <Input
          type="text"
          placeholder="메뉴명, 코드 검색..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 text-sm"
        />
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        <Button
          variant={filterCategory === 'ALL' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterCategory('ALL')}
          className={`whitespace-nowrap px-2.5 py-1 text-xs rounded-full ${filterCategory === 'ALL' ? 'bg-stone-800 text-white border-stone-800' : ''}`}
        >
          전체
        </Button>
        {Object.values(MenuCategory).map(cat => (
          <Button
            key={cat}
            variant={filterCategory === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterCategory(cat)}
            className={`whitespace-nowrap px-2.5 py-1 text-xs rounded-full ${filterCategory === cat ? 'bg-primary-50 border-primary-200 text-primary-700 font-medium' : ''}`}
          >
            {cat}
          </Button>
        ))}
      </div>
      <select
        value={filterUsage}
        onChange={e => setFilterUsage(e.target.value as 'ALL' | 'active' | 'unused')}
        className="text-xs bg-white border border-stone-200 rounded-lg px-2 py-1.5 focus:ring-primary-500"
      >
        <option value="ALL">상태: 전체</option>
        <option value="active">사용</option>
        <option value="unused">미사용</option>
      </select>
    </div>
  </div>
);

export default React.memo(MenuToolbar);
