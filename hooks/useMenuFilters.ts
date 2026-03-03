import { useState, useMemo, useEffect, useCallback } from 'react';
import { MenuCategory, MenuItem, Season, TargetType, TargetTagConfig } from '../types';
import { useMenu } from '../context/MenuContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { validateMenuItem, type ValidationError } from '../services/validationService';
import { addAuditEntry } from '../services/auditService';
import { useHistoricalPlans } from '../context/HistoricalPlansContext';
import { MAJOR_INGREDIENTS } from '../constants';
import { autoClassifyMenuItems, cleanupMenuItems } from '../components/menu/menuActions';
import { PAGE_SIZE, type SortField, type SortDir } from '../components/menu/menuConstants';

export function useMenuFilters() {
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
  const { plans: historicalPlans } = useHistoricalPlans();

  const [, setValidationErrors] = useState<ValidationError[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterUsage, setFilterUsage] = useState<'ALL' | 'active' | 'unused'>('active');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [lastSynced, setLastSynced] = useState<string>('\u2014');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [openTagDropdown, setOpenTagDropdown] = useState<string | null>(null);
  const [openAgeDropdown, setOpenAgeDropdown] = useState<string | null>(null);
  const [tagVersion, setTagVersion] = useState(0);

  const availableTags = useMemo<string[]>(() => {
    void tagVersion;
    try {
      const raw = localStorage.getItem('zsub_target_tags');
      if (!raw) return [];
      const configs: TargetTagConfig[] = JSON.parse(raw);
      const tagSet = new Set<string>();
      for (const cfg of configs) {
        for (const t of cfg.allowedTags) tagSet.add(t);
      }
      return Array.from(tagSet).sort();
    } catch {
      return [];
    }
  }, [tagVersion]);

  // One-time tag reset on mount
  useEffect(() => {
    const RESET_KEY = 'zsub_tags_reset_v3';
    if (localStorage.getItem(RESET_KEY)) return;
    if (menuItems.length === 0) return;
    let resetCount = 0;
    for (const item of menuItems) {
      if (item.tags && item.tags.length > 0) {
        contextUpdateItem(item.id, { ...item, tags: [] });
        resetCount++;
      }
    }
    if (resetCount > 0) console.log(`[US-020] 태그 초기화 완료: ${resetCount}건`);
    localStorage.setItem(RESET_KEY, '1');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuItems.length > 0]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = () => {
      setOpenTagDropdown(null);
      setOpenAgeDropdown(null);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const stats = useMemo(() => {
    const total = menuItems.length;
    const active = menuItems.filter(i => !i.isUnused).length;
    const unused = menuItems.filter(i => i.isUnused).length;
    const byCat: Record<string, number> = {};
    for (const item of menuItems) byCat[item.category] = (byCat[item.category] || 0) + 1;
    return { total, active, unused, byCat };
  }, [menuItems]);

  const filteredItems = useMemo(
    () =>
      menuItems.filter(item => {
        const matchesCategory = filterCategory === 'ALL' || item.category === filterCategory;
        const matchesUsage = filterUsage === 'ALL' || (filterUsage === 'active' ? !item.isUnused : item.isUnused);
        const s = searchTerm.toLowerCase();
        const ingredientLabel = MAJOR_INGREDIENTS.find(m => m.key === item.mainIngredient)?.label || '';
        const matchesSearch =
          !searchTerm ||
          item.name.toLowerCase().includes(s) ||
          (item.code || '').toLowerCase().includes(s) ||
          item.tags.some(t => t.toLowerCase().includes(s)) ||
          ingredientLabel.includes(s) ||
          item.mainIngredient.toLowerCase().includes(s) ||
          (item.season || '').includes(s) ||
          (item.category || '').includes(s);
        return matchesCategory && matchesSearch && matchesUsage;
      }),
    [menuItems, filterCategory, filterUsage, searchTerm]
  );

  const sortedItems = useMemo(() => {
    if (!sortField) return filteredItems;
    return [...filteredItems].sort((a, b) => {
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
  }, [filteredItems, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = sortedItems.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [filterCategory, filterUsage, searchTerm]);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
      else {
        setSortField(field);
        setSortDir('asc');
      }
    },
    [sortField]
  );

  const handleUpdateItem = useCallback(
    (id: string, field: keyof MenuItem, value: MenuItem[keyof MenuItem]) => {
      const item = menuItems.find(i => i.id === id);
      if (item) contextUpdateItem(id, { ...item, [field]: value });
    },
    [menuItems, contextUpdateItem]
  );

  const handleCreateNew = () => {
    const newItem: MenuItem = {
      id: `NEW_${Date.now()}`,
      name: '신규 메뉴',
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
    addToast({ type: 'success', title: '저장 완료', message: '메뉴 데이터가 저장되었습니다.' });
  };

  const handleModalSave = (updated: MenuItem) => {
    const result = validateMenuItem(updated);
    if (!result.isValid) {
      setValidationErrors(result.errors);
      addToast({ type: 'error', title: '저장 실패', message: '입력값을 확인해주세요.' });
      return;
    }
    contextUpdateItem(updated.id, updated);
    saveToStorage();
    setModalItem(null);
    addToast({ type: 'success', title: '저장 완료', message: `${updated.name} 저장되었습니다.` });
    addAuditEntry({
      action: 'menu.update',
      userId: user?.id || '',
      userName: user?.displayName || '',
      entityType: 'menu_item',
      entityId: updated.id,
      entityName: updated.name,
    });
  };

  const toggleSelectItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === pageItems.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(pageItems.map(i => i.id)));
  }, [selectedIds.size, pageItems]);

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
    if (Object.keys(directChanges).length > 0) bulkUpdate(ids, directChanges);
    if (changes.addTags || changes.removeTags) {
      for (const id of ids) {
        const item = menuItems.find(i => i.id === id);
        if (!item) continue;
        let tags = [...item.tags];
        if (changes.addTags)
          for (const t of changes.addTags) {
            if (!tags.includes(t)) tags.push(t);
          }
        if (changes.removeTags) tags = tags.filter(t => !changes.removeTags!.includes(t));
        contextUpdateItem(id, { ...item, ...directChanges, tags });
      }
    }
    saveToStorage();
    setShowBulkEdit(false);
    setSelectedIds(new Set());
    addToast({ type: 'success', title: '일괄 편집 완료', message: `${ids.length}개 메뉴가 변경되었습니다.` });
  };

  const handleDeleteSelected = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    deleteItems(ids);
    saveToStorage();
    setSelectedIds(new Set());
    addToast({ type: 'success', title: '삭제 완료', message: `${ids.length}개 메뉴가 삭제되었습니다.` });
  };

  const handleRefresh = async () => {
    await refreshFromSheet();
    setLastSynced(new Date().toLocaleString('ko-KR'));
    addToast({ type: 'success', title: '동기화 완료', message: '시트 데이터를 새로고침했습니다.' });
  };

  const handleAutoClassify = () =>
    autoClassifyMenuItems(
      { menuItems, contextUpdateItem, addItem, deleteItems, bulkUpdate, saveToStorage, addToast },
      historicalPlans
    );

  const handleResetTags = () => {
    const withTags = menuItems.filter(i => i.tags && i.tags.length > 0);
    if (withTags.length === 0) {
      addToast({ type: 'info', title: '태그 초기화', message: '태그가 설정된 항목이 없습니다.' });
      return;
    }
    if (!window.confirm(`${withTags.length}개 항목의 태그를 모두 초기화하시겠습니까?`)) return;
    bulkUpdate(
      withTags.map(i => i.id),
      { tags: [] }
    );
    saveToStorage();
    addToast({
      type: 'success',
      title: '태그 초기화 완료',
      message: `${withTags.length}개 항목의 태그가 초기화되었습니다.`,
    });
  };

  const handleCleanup = () =>
    cleanupMenuItems({ menuItems, contextUpdateItem, addItem, deleteItems, bulkUpdate, saveToStorage, addToast });

  const handleImport = (items: Partial<MenuItem>[]) => {
    const existingNames = new Set(
      menuItems.map(m => (m.code && m.code.trim() ? `${m.code.trim()}|${m.name.trim()}` : m.name.trim()))
    );
    let added = 0;
    items.forEach(item => {
      if (!item.name) return;
      const key = item.code && item.code.trim() ? `${item.code.trim()}|${item.name.trim()}` : item.name!.trim();
      if (existingNames.has(key)) return;
      existingNames.add(key);
      addItem(item as MenuItem);
      added++;
    });
    saveToStorage();
    addToast({
      type: 'success',
      title: 'CSV 가져오기 완료',
      message:
        added < items.length
          ? `${added}개 추가 (${items.length - added}개 중복 건너뜀)`
          : `${added}개 메뉴가 추가되었습니다.`,
    });
    setShowImportDialog(false);
  };

  const handleTagToggle = useCallback(
    (item: MenuItem, tag: string) => {
      const current = item.tags || [];
      const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
      contextUpdateItem(item.id, { ...item, tags: next });
    },
    [contextUpdateItem]
  );

  const handleAddNewTag = useCallback(
    (item: MenuItem) => {
      const newTag = prompt('새 태그 이름:');
      if (!newTag || !newTag.trim()) return;
      const trimmed = newTag.trim();
      const current = item.tags || [];
      if (!current.includes(trimmed)) contextUpdateItem(item.id, { ...item, tags: [...current, trimmed] });
      try {
        const raw = localStorage.getItem('zsub_target_tags');
        const configs: TargetTagConfig[] = raw ? JSON.parse(raw) : [];
        let changed = false;
        for (const cfg of configs) {
          if (!cfg.allowedTags.includes(trimmed)) {
            cfg.allowedTags.push(trimmed);
            changed = true;
          }
        }
        if (changed) {
          localStorage.setItem('zsub_target_tags', JSON.stringify(configs));
          setTagVersion(v => v + 1);
        }
      } catch {
        /* ignore */
      }
    },
    [contextUpdateItem]
  );

  const handleAgeGroupToggle = useCallback(
    (item: MenuItem, tg: TargetType) => {
      const current = item.targetAgeGroup || [];
      const next = current.includes(tg) ? current.filter(t => t !== tg) : [...current, tg];
      contextUpdateItem(item.id, { ...item, targetAgeGroup: next });
    },
    [contextUpdateItem]
  );

  const handleLaunchDateChange = useCallback(
    (item: MenuItem, value: string) => {
      contextUpdateItem(item.id, { ...item, launchDate: value || undefined });
    },
    [contextUpdateItem]
  );

  return {
    // State
    menuItems,
    isLoading,
    filterCategory,
    setFilterCategory,
    filterUsage,
    setFilterUsage,
    searchTerm,
    setSearchTerm,
    lastSynced,
    showImportDialog,
    setShowImportDialog,
    sortField,
    sortDir,
    modalItem,
    setModalItem,
    selectedIds,
    setSelectedIds,
    showBulkEdit,
    setShowBulkEdit,
    openTagDropdown,
    setOpenTagDropdown,
    openAgeDropdown,
    setOpenAgeDropdown,
    availableTags,
    // Computed
    stats,
    filteredItems,
    sortedItems,
    totalPages,
    safePage,
    pageItems,
    page,
    setPage,
    // Handlers
    handleSort,
    handleUpdateItem,
    handleCreateNew,
    handleSave,
    handleModalSave,
    toggleSelectItem,
    toggleSelectAll,
    handleBulkApply,
    handleDeleteSelected,
    handleRefresh,
    handleAutoClassify,
    handleResetTags,
    handleCleanup,
    handleImport,
    handleTagToggle,
    handleAddNewTag,
    handleAgeGroupToggle,
    handleLaunchDateChange,
  };
}
