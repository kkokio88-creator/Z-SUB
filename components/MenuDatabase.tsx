import React, { useState, useMemo } from 'react';
import {
  Database,
  Search,
  Save,
  RefreshCw,
  Plus,
  Flame,
  Upload,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Wand2,
  Eraser,
  ArrowUpDown,
} from 'lucide-react';
import ImportDialog from './ImportDialog';
import BulkEditDialog from './BulkEditDialog';
import MenuDetailModal from './MenuDetailModal';
import { MenuCategory, MenuItem, Season, TasteProfile } from '../types';
import { useMenu } from '../context/MenuContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { validateMenuItem, type ValidationError } from '../services/validationService';
import { addAuditEntry } from '../services/auditService';
import { autoClassifyBatch } from '../services/autoClassifyService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PAGE_SIZE = 9999;

const INGREDIENT_LABELS: Record<string, string> = {
  beef: '소고기',
  pork: '한돈',
  chicken: '닭',
  fish: '생선',
  tofu: '두부',
  egg: '달걀',
  potato: '감자',
  seaweed: '해조류',
  mushroom: '버섯',
  vegetable: '채소',
};

type SortField = 'name' | 'category' | 'recommendedPrice' | 'cost' | 'season' | 'mainIngredient' | 'weight';
type SortDir = 'asc' | 'desc';

const MenuDatabase: React.FC = () => {
  const {
    menuItems,
    updateItem: contextUpdateItem,
    addItem,
    deleteItems,
    bulkUpdate,
    saveToStorage,
    refreshFromSheet,
    isLoading,
  } = useMenu();
  const { addToast } = useToast();
  const { user } = useAuth();
  const [, setValidationErrors] = useState<ValidationError[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterUsage, setFilterUsage] = useState<'ALL' | 'active' | 'unused'>('active');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [lastSynced, setLastSynced] = useState<string>('\u2014');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [page, setPage] = useState(0);

  // Sort
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Modal
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);

  // Stats
  const stats = useMemo(() => {
    const total = menuItems.length;
    const active = menuItems.filter(i => !i.isUnused).length;
    const unused = menuItems.filter(i => i.isUnused).length;
    const byCat: Record<string, number> = {};
    for (const item of menuItems) {
      byCat[item.category] = (byCat[item.category] || 0) + 1;
    }
    return { total, active, unused, byCat };
  }, [menuItems]);

  const filteredItems = useMemo(
    () =>
      menuItems.filter(item => {
        const matchesCategory = filterCategory === 'ALL' || item.category === filterCategory;
        const matchesUsage = filterUsage === 'ALL' || (filterUsage === 'active' ? !item.isUnused : item.isUnused);
        const matchesSearch =
          !searchTerm ||
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.code || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch && matchesUsage;
      }),
    [menuItems, filterCategory, filterUsage, searchTerm]
  );

  // Sorted items
  const sortedItems = useMemo(() => {
    if (!sortField) return filteredItems;
    const sorted = [...filteredItems].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';
      switch (sortField) {
        case 'name':
          valA = a.name;
          valB = b.name;
          break;
        case 'category':
          valA = a.category;
          valB = b.category;
          break;
        case 'recommendedPrice':
          valA = a.recommendedPrice;
          valB = b.recommendedPrice;
          break;
        case 'cost':
          valA = a.cost;
          valB = b.cost;
          break;
        case 'season':
          valA = a.season;
          valB = b.season;
          break;
        case 'mainIngredient':
          valA = a.mainIngredient;
          valB = b.mainIngredient;
          break;
        case 'weight':
          valA = a.weight || 0;
          valB = b.weight || 0;
          break;
      }
      if (typeof valA === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB as string) : (valB as string).localeCompare(valA);
      }
      return sortDir === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
    return sorted;
  }, [filteredItems, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = sortedItems.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  // Reset page when filters change
  useMemo(() => {
    setPage(0);
  }, [filterCategory, filterUsage, searchTerm]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortHeader: React.FC<{ field: SortField; label: string; className?: string }> = ({
    field,
    label,
    className,
  }) => (
    <th
      className={`px-3 py-2 text-xs font-semibold text-stone-500 cursor-pointer select-none hover:bg-stone-100 transition-colors ${className || ''}`}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortField === field && <ArrowUpDown className="w-3 h-3 text-primary-500" />}
      </span>
    </th>
  );

  const handleUpdateItem = (id: string, field: keyof MenuItem, value: MenuItem[keyof MenuItem]) => {
    const item = menuItems.find(i => i.id === id);
    if (item) {
      contextUpdateItem(id, { ...item, [field]: value });
    }
  };

  const handleCreateNew = () => {
    const newItem: MenuItem = {
      id: `NEW_${Date.now()}`,
      name: '\uC2E0\uADDC \uBA54\uB274',
      category: MenuCategory.MAIN,
      cost: 0,
      recommendedPrice: 0,
      tastes: [],
      season: Season.ALL,
      tags: [],
      isSpicy: false,
      mainIngredient: 'vegetable',
      code: '',
      weight: 0,
      process: 11,
    };
    addItem(newItem);
    setModalItem(newItem);
    addAuditEntry({
      action: 'menu.create',
      userId: user?.id || '',
      userName: user?.displayName || '',
      entityType: 'menu_item',
      entityId: newItem.id,
      entityName: newItem.name,
    });
  };

  const handleSave = () => {
    saveToStorage();
    setLastSynced(new Date().toLocaleString('ko-KR'));
    setValidationErrors([]);
    addToast({
      type: 'success',
      title: '\uC800\uC7A5 \uC644\uB8CC',
      message: '\uBA54\uB274 \uB370\uC774\uD130\uAC00 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.',
    });
  };

  const handleModalSave = (updated: MenuItem) => {
    const result = validateMenuItem(updated);
    if (!result.isValid) {
      setValidationErrors(result.errors);
      addToast({
        type: 'error',
        title: '\uC800\uC7A5 \uC2E4\uD328',
        message: '\uC785\uB825\uAC12\uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694.',
      });
      return;
    }
    contextUpdateItem(updated.id, updated);
    saveToStorage();
    setModalItem(null);
    addToast({
      type: 'success',
      title: '\uC800\uC7A5 \uC644\uB8CC',
      message: `${updated.name} \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.`,
    });
    addAuditEntry({
      action: 'menu.update',
      userId: user?.id || '',
      userName: user?.displayName || '',
      entityType: 'menu_item',
      entityId: updated.id,
      entityName: updated.name,
    });
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pageItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pageItems.map(i => i.id)));
    }
  };

  const handleBulkApply = (changes: {
    category?: MenuCategory;
    addTags?: string[];
    removeTags?: string[];
    isUnused?: boolean;
  }) => {
    const ids = Array.from(selectedIds);
    const directChanges: Partial<MenuItem> = {};
    if (changes.category) directChanges.category = changes.category;
    if (changes.isUnused !== undefined) directChanges.isUnused = changes.isUnused;

    if (Object.keys(directChanges).length > 0) {
      bulkUpdate(ids, directChanges);
    }

    if (changes.addTags || changes.removeTags) {
      for (const id of ids) {
        const item = menuItems.find(i => i.id === id);
        if (!item) continue;
        let tags = [...item.tags];
        if (changes.addTags) {
          for (const t of changes.addTags) {
            if (!tags.includes(t)) tags.push(t);
          }
        }
        if (changes.removeTags) {
          tags = tags.filter(t => !changes.removeTags!.includes(t));
        }
        contextUpdateItem(id, { ...item, ...directChanges, tags });
      }
    }

    saveToStorage();
    setShowBulkEdit(false);
    setSelectedIds(new Set());
    addToast({
      type: 'success',
      title: '\uC77C\uAD04 \uD3B8\uC9D1 \uC644\uB8CC',
      message: `${ids.length}\uAC1C \uBA54\uB274\uAC00 \uBCC0\uACBD\uB418\uC5C8\uC2B5\uB2C8\uB2E4.`,
    });
  };

  const handleDeleteSelected = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    deleteItems(ids);
    saveToStorage();
    setSelectedIds(new Set());
    addToast({
      type: 'success',
      title: '\uC0AD\uC81C \uC644\uB8CC',
      message: `${ids.length}\uAC1C \uBA54\uB274\uAC00 \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.`,
    });
  };

  const handleRefresh = async () => {
    await refreshFromSheet();
    setLastSynced(new Date().toLocaleString('ko-KR'));
    addToast({
      type: 'success',
      title: '\uB3D9\uAE30\uD654 \uC644\uB8CC',
      message: '\uC2DC\uD2B8 \uB370\uC774\uD130\uB97C \uC0C8\uB85C\uACE0\uCE68\uD588\uC2B5\uB2C8\uB2E4.',
    });
  };

  // 자동 분류
  const handleAutoClassify = () => {
    const targets = menuItems.filter(item => item.mainIngredient === 'vegetable' && !item.isUnused);
    const results = autoClassifyBatch(targets);

    if (results.length === 0) {
      addToast({ type: 'info', title: '자동 분류', message: '분류 변경이 필요한 항목이 없습니다.' });
      return;
    }

    if (!window.confirm(`${results.length}개 항목에 자동 분류를 적용하시겠습니까?`)) return;

    for (const change of results) {
      const item = menuItems.find(i => i.id === change.id);
      if (!item) continue;
      const updated: Partial<MenuItem> = {};
      if (change.mainIngredient) updated.mainIngredient = change.mainIngredient;
      if (change.category) updated.category = change.category;
      contextUpdateItem(item.id, { ...item, ...updated });
    }
    saveToStorage();
    addToast({ type: 'success', title: '자동 분류 완료', message: `${results.length}개 항목이 업데이트되었습니다.` });
  };

  // 데이터 정리
  const handleCleanup = () => {
    const emptyNameItems = menuItems.filter(i => !i.name || !i.name.trim());
    const nameMap = new Map<string, string[]>();
    const codeMap = new Map<string, string[]>();
    for (const item of menuItems) {
      if (item.name && item.name.trim()) {
        const key = item.name.trim();
        if (!nameMap.has(key)) nameMap.set(key, []);
        nameMap.get(key)!.push(item.id);
      }
      if (item.code && item.code.trim()) {
        const key = item.code.trim();
        if (!codeMap.has(key)) codeMap.set(key, []);
        codeMap.get(key)!.push(item.id);
      }
    }

    const duplicateNameIds = new Set<string>();
    for (const ids of nameMap.values()) {
      if (ids.length > 1) {
        ids.slice(1).forEach(id => duplicateNameIds.add(id));
      }
    }
    const duplicateCodeIds = new Set<string>();
    for (const ids of codeMap.values()) {
      if (ids.length > 1) {
        ids.slice(1).forEach(id => duplicateCodeIds.add(id));
      }
    }

    const duplicateCount = new Set([...duplicateNameIds, ...duplicateCodeIds]).size;
    const totalToRemove = emptyNameItems.length + duplicateCount;

    if (totalToRemove === 0) {
      addToast({ type: 'info', title: '데이터 정리', message: '정리할 항목이 없습니다.' });
      return;
    }

    const msg = [
      `분석 결과:`,
      emptyNameItems.length > 0 ? `- 빈 이름 항목: ${emptyNameItems.length}개` : null,
      duplicateCount > 0 ? `- 중복 항목: ${duplicateCount}개` : null,
      `\n총 ${totalToRemove}개 항목을 정리하시겠습니까?`,
    ]
      .filter(Boolean)
      .join('\n');

    if (!window.confirm(msg)) return;

    const idsToRemove = new Set([...emptyNameItems.map(i => i.id), ...duplicateNameIds, ...duplicateCodeIds]);
    deleteItems(Array.from(idsToRemove));
    saveToStorage();
    addToast({ type: 'success', title: '정리 완료', message: `${idsToRemove.size}개 항목이 제거되었습니다.` });
  };

  const categoryBadgeClass = (cat: MenuCategory) => {
    switch (cat) {
      case MenuCategory.MAIN:
        return 'bg-orange-100 text-orange-700';
      case MenuCategory.SOUP:
        return 'bg-blue-100 text-blue-700';
      case MenuCategory.DESSERT:
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-green-100 text-green-700';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
      {/* Top Action Bar */}
      <div className="p-4 border-b border-stone-100 space-y-3 bg-stone-50/50">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-stone-800 flex items-center gap-2">
            <Database className="w-4 h-4 text-stone-500" /> 반찬 리스트
            <span className="text-xs font-normal text-stone-400 ml-1">({filteredItems.length.toLocaleString()}개)</span>
          </h3>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoClassify}
              className="flex items-center gap-1 bg-amber-50 border-amber-200 text-amber-700 text-xs font-medium hover:bg-amber-100"
              title="주재료 기본값인 항목에 자동 분류 적용"
            >
              <Wand2 className="w-3.5 h-3.5" /> 자동분류
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCleanup}
              className="flex items-center gap-1 text-xs font-medium"
              title="빈 이름/중복 항목 정리"
            >
              <Eraser className="w-3.5 h-3.5" /> 정리
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-1.5"
              title="\uC2DC\uD2B8 \uC0C8\uB85C\uACE0\uCE68"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportDialog(true)}
              className="p-1.5"
              title="CSV \uAC00\uC838\uC624\uAE30"
            >
              <Upload className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleCreateNew}
              className="flex items-center gap-1 bg-primary-600 text-white text-xs font-medium hover:bg-primary-700"
            >
              <Plus className="w-3.5 h-3.5" /> 신규추가
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
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
              placeholder="\uBA54\uB274\uBA85, \uCF54\uB4DC \uAC80\uC0C9..."
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

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="px-4 py-2 bg-primary-50 border-b border-primary-100 flex items-center justify-between">
          <span className="text-xs font-medium text-primary-700">{selectedIds.size}개 선택됨</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => setShowBulkEdit(true)}
              className="flex items-center gap-1 text-xs font-medium bg-primary-600 hover:bg-primary-700"
            >
              <Edit3 className="w-3 h-3" /> 일괄 편집
            </Button>
            <Button
              size="sm"
              onClick={handleDeleteSelected}
              className="flex items-center gap-1 text-xs font-medium bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-3 h-3" /> 삭제
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())} className="text-xs">
              선택 해제
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 sticky top-0 z-10">
            <tr className="border-b border-stone-200">
              <th className="w-10 px-3 py-2">
                <Input
                  type="checkbox"
                  checked={pageItems.length > 0 && selectedIds.size === pageItems.length}
                  onChange={toggleSelectAll}
                  className="w-3.5 h-3.5 rounded border-stone-300 text-primary-600 focus:ring-primary-500 shadow-none"
                />
              </th>
              <SortHeader field="category" label="구분" className="text-left w-24" />
              <SortHeader field="name" label="메뉴명" className="text-left w-36" />
              <th className="px-3 py-2 text-left text-xs font-semibold text-stone-500 w-24">품목코드</th>
              <SortHeader field="season" label="계절성" className="text-center w-20" />
              <SortHeader field="mainIngredient" label="주재료" className="text-center w-20" />
              <th className="px-3 py-2 text-center text-xs font-semibold text-stone-500 w-28">맛속성</th>
              <SortHeader field="weight" label="용량" className="text-right w-16" />
              <SortHeader field="recommendedPrice" label="가격" className="text-right w-20" />
              <SortHeader field="cost" label="원가" className="text-right w-20" />
              <th className="px-3 py-2 text-center text-xs font-semibold text-stone-500 w-20">사용여부</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-stone-500 w-12">맵</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={12} className="text-center py-12 text-stone-400 text-sm">
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : (
              pageItems.map(item => (
                <tr
                  key={item.id}
                  className="hover:bg-emerald-50/40 cursor-pointer transition-colors"
                  onClick={() => setModalItem(item)}
                >
                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                    <Input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelectItem(item.id)}
                      className="w-3.5 h-3.5 rounded border-stone-300 text-primary-600 focus:ring-primary-500 shadow-none"
                    />
                  </td>
                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                    <select
                      value={item.category}
                      onChange={e => handleUpdateItem(item.id, 'category', e.target.value as MenuCategory)}
                      className={`text-[11px] font-bold rounded px-1.5 py-0.5 border-transparent focus:ring-primary-500 ${categoryBadgeClass(item.category)}`}
                    >
                      {Object.values(MenuCategory).map(c => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-sm font-medium ${item.isUnused ? 'text-stone-400 line-through' : 'text-stone-800'}`}
                    >
                      {item.name}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-xs text-stone-500">{item.code || '\u2014'}</span>
                  </td>
                  <td className="px-2 py-1.5 text-center" onClick={e => e.stopPropagation()}>
                    <select
                      value={item.season}
                      onChange={e => handleUpdateItem(item.id, 'season', e.target.value as Season)}
                      className="text-[11px] bg-transparent border border-transparent hover:border-stone-200 rounded px-1 py-0.5 focus:ring-primary-500 cursor-pointer"
                    >
                      {Object.values(Season).map(s => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5 text-center" onClick={e => e.stopPropagation()}>
                    <select
                      value={item.mainIngredient}
                      onChange={e => handleUpdateItem(item.id, 'mainIngredient', e.target.value)}
                      className="text-[11px] bg-transparent border border-transparent hover:border-stone-200 rounded px-1 py-0.5 focus:ring-primary-500 cursor-pointer"
                    >
                      {Object.entries(INGREDIENT_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1.5 py-1.5" onClick={e => e.stopPropagation()}>
                    <div className="flex flex-wrap gap-0.5">
                      {Object.values(TasteProfile).map(taste => (
                        <Button
                          key={taste}
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newTastes = item.tastes.includes(taste)
                              ? item.tastes.filter(t => t !== taste)
                              : [...item.tastes, taste];
                            handleUpdateItem(item.id, 'tastes', newTastes);
                          }}
                          className={`px-1 py-0.5 h-auto text-[9px] rounded border transition-colors ${
                            item.tastes.includes(taste)
                              ? 'bg-primary-100 text-primary-700 border-primary-200 font-bold'
                              : 'bg-stone-50 text-stone-400 border-stone-100 hover:bg-stone-100'
                          }`}
                        >
                          {taste.replace('맛', '').replace('함', '')}
                        </Button>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-xs text-stone-600">{item.weight ? `${item.weight}g` : '\u2014'}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-xs text-stone-700">{item.recommendedPrice.toLocaleString()}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-xs font-medium text-stone-700">{item.cost.toLocaleString()}</span>
                  </td>
                  <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUpdateItem(item.id, 'isUnused', !item.isUnused)}
                      className={`px-2 py-0.5 h-auto text-[11px] font-medium rounded-full transition-colors ${
                        item.isUnused ? 'bg-stone-200 text-stone-500' : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {item.isUnused ? '미사용' : '사용'}
                    </Button>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {item.isSpicy && <Flame className="w-3.5 h-3.5 text-red-400 mx-auto" />}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: Pagination */}
      <div className="px-4 py-2.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
        <div className="text-xs text-stone-500 flex items-center gap-3">
          <span>
            {sortedItems.length.toLocaleString()}개 중 {(safePage * PAGE_SIZE + 1).toLocaleString()}-
            {Math.min((safePage + 1) * PAGE_SIZE, sortedItems.length).toLocaleString()}
          </span>
          <span className="text-stone-300">|</span>
          <span className="flex items-center gap-1 cursor-pointer hover:text-green-600" onClick={handleRefresh}>
            <RefreshCw className="w-3 h-3" /> {lastSynced}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="p-1"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-stone-600 min-w-[60px] text-center">
            {safePage + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            className="p-1"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      {modalItem && <MenuDetailModal item={modalItem} onSave={handleModalSave} onClose={() => setModalItem(null)} />}
      {showImportDialog && (
        <ImportDialog
          existingItems={menuItems}
          onImport={items => {
            items.forEach(item => {
              if (item.name) addItem(item as MenuItem);
            });
            saveToStorage();
            addToast({
              type: 'success',
              title: 'CSV \uAC00\uC838\uC624\uAE30 \uC644\uB8CC',
              message: `${items.length}\uAC1C \uBA54\uB274\uAC00 \uCD94\uAC00\uB418\uC5C8\uC2B5\uB2C8\uB2E4.`,
            });
            setShowImportDialog(false);
          }}
          onClose={() => setShowImportDialog(false)}
        />
      )}
      {showBulkEdit && (
        <BulkEditDialog
          selectedCount={selectedIds.size}
          onApply={handleBulkApply}
          onClose={() => setShowBulkEdit(false)}
        />
      )}
    </div>
  );
};

export default MenuDatabase;
