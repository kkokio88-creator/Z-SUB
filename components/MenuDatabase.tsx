import React from 'react';
import { Edit3, Trash2, ChevronLeft, ChevronRight, RefreshCw, ArrowUpDown } from 'lucide-react';
import ImportDialog from './ImportDialog';
import BulkEditDialog from './BulkEditDialog';
import MenuDetailModal from './MenuDetailModal';
import { MenuItem } from '../types';
import { useMenuFilters } from '../hooks/useMenuFilters';
import { MenuToolbar, MenuRow } from './menu';
import { PAGE_SIZE, type SortField } from './menu/menuConstants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const MenuDatabase: React.FC = () => {
  const f = useMenuFilters();

  const SortHeader: React.FC<{ field: SortField; label: string; className?: string }> = ({
    field,
    label,
    className,
  }) => (
    <th
      className={`px-3 py-2 text-xs font-semibold text-stone-500 cursor-pointer select-none hover:bg-stone-100 transition-colors ${className || ''}`}
      onClick={() => f.handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {f.sortField === field && <ArrowUpDown className="w-3 h-3 text-primary-500" />}
      </span>
    </th>
  );

  return (
    <div className="flex flex-col h-full bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
      {/* Top Action Bar + Stats + Filters */}
      <MenuToolbar
        filteredCount={f.filteredItems.length}
        stats={f.stats}
        filterCategory={f.filterCategory}
        setFilterCategory={f.setFilterCategory}
        filterUsage={f.filterUsage}
        setFilterUsage={f.setFilterUsage}
        searchTerm={f.searchTerm}
        setSearchTerm={f.setSearchTerm}
        isLoading={f.isLoading}
        onAutoClassify={f.handleAutoClassify}
        onResetTags={f.handleResetTags}
        onCleanup={f.handleCleanup}
        onRefresh={f.handleRefresh}
        onImport={() => f.setShowImportDialog(true)}
        onCreateNew={f.handleCreateNew}
        onSave={f.handleSave}
      />

      {/* Bulk Action Bar */}
      {f.selectedIds.size > 0 && (
        <div className="px-4 py-2 bg-primary-50 border-b border-primary-100 flex items-center justify-between">
          <span className="text-xs font-medium text-primary-700">{f.selectedIds.size}개 선택됨</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => f.setShowBulkEdit(true)}
              className="flex items-center gap-1 text-xs font-medium bg-primary-600 hover:bg-primary-700"
            >
              <Edit3 className="w-3 h-3" /> 일괄 편집
            </Button>
            <Button
              size="sm"
              onClick={f.handleDeleteSelected}
              className="flex items-center gap-1 text-xs font-medium bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-3 h-3" /> 삭제
            </Button>
            <Button variant="outline" size="sm" onClick={() => f.setSelectedIds(new Set())} className="text-xs">
              선택 해제
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 sticky top-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <tr className="border-b border-stone-200">
              <th className="w-10 px-3 py-2">
                <Input
                  type="checkbox"
                  checked={f.pageItems.length > 0 && f.selectedIds.size === f.pageItems.length}
                  onChange={f.toggleSelectAll}
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
              <th className="px-3 py-2 text-left text-xs font-semibold text-stone-500 w-32">태그</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-stone-500 w-24">출시일</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-stone-500 w-36">대상 식단</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {f.pageItems.length === 0 ? (
              <tr>
                <td colSpan={15} className="text-center py-12 text-stone-400 text-sm">
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : (
              f.pageItems.map(item => (
                <MenuRow
                  key={item.id}
                  item={item}
                  selectedIds={f.selectedIds}
                  openTagDropdown={f.openTagDropdown}
                  setOpenTagDropdown={f.setOpenTagDropdown}
                  openAgeDropdown={f.openAgeDropdown}
                  setOpenAgeDropdown={f.setOpenAgeDropdown}
                  availableTags={f.availableTags}
                  onSelect={f.toggleSelectItem}
                  onOpenModal={f.setModalItem}
                  onUpdateItem={f.handleUpdateItem}
                  onTagToggle={f.handleTagToggle}
                  onAddNewTag={f.handleAddNewTag}
                  onAgeGroupToggle={f.handleAgeGroupToggle}
                  onLaunchDateChange={f.handleLaunchDateChange}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: Pagination */}
      <div className="px-4 py-2.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
        <div className="text-xs text-stone-500 flex items-center gap-3">
          <span>
            {f.sortedItems.length.toLocaleString()}개 중 {(f.safePage * PAGE_SIZE + 1).toLocaleString()}-
            {Math.min((f.safePage + 1) * PAGE_SIZE, f.sortedItems.length).toLocaleString()}
          </span>
          <span className="text-stone-300">|</span>
          <span className="flex items-center gap-1 cursor-pointer hover:text-green-600" onClick={f.handleRefresh}>
            <RefreshCw className="w-3 h-3" /> {f.lastSynced}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => f.setPage(p => Math.max(0, p - 1))}
            disabled={f.safePage === 0}
            className="p-1"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-stone-600 min-w-[60px] text-center">
            {f.safePage + 1} / {f.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => f.setPage(p => Math.min(f.totalPages - 1, p + 1))}
            disabled={f.safePage >= f.totalPages - 1}
            className="p-1"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      {f.modalItem && (
        <MenuDetailModal item={f.modalItem} onSave={f.handleModalSave} onClose={() => f.setModalItem(null)} />
      )}
      {f.showImportDialog && (
        <ImportDialog
          existingItems={f.menuItems}
          onImport={f.handleImport}
          onClose={() => f.setShowImportDialog(false)}
        />
      )}
      {f.showBulkEdit && (
        <BulkEditDialog
          selectedCount={f.selectedIds.size}
          onApply={f.handleBulkApply}
          onClose={() => f.setShowBulkEdit(false)}
        />
      )}
    </div>
  );
};

export default MenuDatabase;
