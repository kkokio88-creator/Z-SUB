import React from 'react';
import { Flame, ChevronDown } from 'lucide-react';
import { MenuCategory, MenuItem, Season, TasteProfile, TargetType } from '../../types';
import { INGREDIENT_LABELS, categoryBadgeClass } from './menuConstants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface MenuRowProps {
  item: MenuItem;
  selectedIds: Set<string>;
  openTagDropdown: string | null;
  setOpenTagDropdown: (v: string | null) => void;
  openAgeDropdown: string | null;
  setOpenAgeDropdown: (v: string | null) => void;
  availableTags: string[];
  onSelect: (id: string) => void;
  onOpenModal: (item: MenuItem) => void;
  onUpdateItem: (id: string, field: keyof MenuItem, value: MenuItem[keyof MenuItem]) => void;
  onTagToggle: (item: MenuItem, tag: string) => void;
  onAddNewTag: (item: MenuItem) => void;
  onAgeGroupToggle: (item: MenuItem, tg: TargetType) => void;
  onLaunchDateChange: (item: MenuItem, value: string) => void;
}

const MenuRow: React.FC<MenuRowProps> = ({
  item,
  selectedIds,
  openTagDropdown,
  setOpenTagDropdown,
  openAgeDropdown,
  setOpenAgeDropdown,
  availableTags,
  onSelect,
  onOpenModal,
  onUpdateItem,
  onTagToggle,
  onAddNewTag,
  onAgeGroupToggle,
  onLaunchDateChange,
}) => (
  <tr className="hover:bg-emerald-50/40 cursor-pointer transition-colors" onClick={() => onOpenModal(item)}>
    <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
      <Input
        type="checkbox"
        checked={selectedIds.has(item.id)}
        onChange={() => onSelect(item.id)}
        className="w-3.5 h-3.5 rounded border-stone-300 text-primary-600 focus:ring-primary-500 shadow-none"
      />
    </td>
    <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
      <select
        value={item.category}
        onChange={e => onUpdateItem(item.id, 'category', e.target.value as MenuCategory)}
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
      <span className={`text-sm font-medium ${item.isUnused ? 'text-stone-400 line-through' : 'text-stone-800'}`}>
        {item.name}
      </span>
    </td>
    <td className="px-3 py-2">
      <span className="font-mono text-xs text-stone-500">{item.code || '\u2014'}</span>
    </td>
    <td className="px-2 py-1.5 text-center" onClick={e => e.stopPropagation()}>
      <select
        value={item.season}
        onChange={e => onUpdateItem(item.id, 'season', e.target.value as Season)}
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
        onChange={e => onUpdateItem(item.id, 'mainIngredient', e.target.value)}
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
              onUpdateItem(item.id, 'tastes', newTastes);
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
        onClick={() => onUpdateItem(item.id, 'isUnused', !item.isUnused)}
        className={`px-2 py-0.5 h-auto text-[11px] font-medium rounded-full transition-colors ${
          item.isUnused ? 'bg-stone-200 text-stone-500' : 'bg-green-100 text-green-700'
        }`}
      >
        {item.isUnused ? '미사용' : '사용'}
      </Button>
    </td>
    <td className="px-3 py-2 text-center">{item.isSpicy && <Flame className="w-3.5 h-3.5 text-red-400 mx-auto" />}</td>

    {/* Tags column */}
    <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>
      <div className="relative">
        <div
          className="flex flex-wrap gap-0.5 min-h-[20px] cursor-pointer"
          onClick={e => {
            e.stopPropagation();
            setOpenTagDropdown(openTagDropdown === item.id ? null : item.id);
            setOpenAgeDropdown(null);
          }}
        >
          {item.tags && item.tags.length > 0 ? (
            item.tags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex px-1.5 py-0.5 text-[9px] bg-blue-50 text-blue-600 rounded font-medium"
              >
                {tag}
              </span>
            ))
          ) : (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-stone-300 hover:text-stone-400">
              <ChevronDown className="w-3 h-3" />
            </span>
          )}
        </div>
        {openTagDropdown === item.id && (
          <div
            className="absolute left-0 top-full mt-1 z-50 bg-white border border-stone-200 rounded-lg shadow-lg p-2 min-w-[140px] max-h-48 overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {availableTags.map(tag => {
              const isSelected = (item.tags || []).includes(tag);
              return (
                <label
                  key={tag}
                  className="flex items-center gap-1.5 px-1.5 py-1 rounded cursor-pointer hover:bg-stone-50 text-[11px] text-stone-700"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onTagToggle(item, tag)}
                    className="w-3 h-3 rounded border-stone-300 text-primary-600"
                  />
                  {tag}
                </label>
              );
            })}
            <div className="border-t border-stone-100 mt-1 pt-1">
              <button
                onClick={() => onAddNewTag(item)}
                className="w-full text-left px-1.5 py-1 text-[11px] text-blue-600 hover:bg-blue-50 rounded font-medium"
              >
                + 신규 추가
              </button>
            </div>
          </div>
        )}
      </div>
    </td>

    {/* Launch date column */}
    <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>
      <input
        type="date"
        value={item.launchDate || ''}
        onChange={e => onLaunchDateChange(item, e.target.value)}
        className="text-[10px] bg-transparent border border-transparent hover:border-stone-200 focus:border-stone-300 rounded px-1 py-0.5 w-full focus:outline-none text-stone-600"
      />
    </td>

    {/* Target age group column */}
    <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>
      <div className="relative">
        <div
          className="flex flex-wrap gap-0.5 min-h-[20px] cursor-pointer"
          onClick={e => {
            e.stopPropagation();
            setOpenAgeDropdown(openAgeDropdown === item.id ? null : item.id);
            setOpenTagDropdown(null);
          }}
        >
          {item.targetAgeGroup && item.targetAgeGroup.length > 0 ? (
            item.targetAgeGroup.map((tg, i) => (
              <span
                key={i}
                className="inline-flex px-1.5 py-0.5 text-[9px] bg-emerald-50 text-emerald-700 rounded font-medium leading-tight"
              >
                {tg}
              </span>
            ))
          ) : (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-stone-300 hover:text-stone-400">
              전체 <ChevronDown className="w-3 h-3" />
            </span>
          )}
        </div>
        {openAgeDropdown === item.id && (
          <div
            className="absolute left-0 top-full mt-1 z-50 bg-white border border-stone-200 rounded-lg shadow-lg p-2 min-w-[180px] max-h-56 overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {Object.values(TargetType).map(tg => {
              const isSelected = (item.targetAgeGroup || []).includes(tg);
              return (
                <label
                  key={tg}
                  className="flex items-center gap-1.5 px-1.5 py-1 rounded cursor-pointer hover:bg-stone-50 text-[11px] text-stone-700"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onAgeGroupToggle(item, tg)}
                    className="w-3 h-3 rounded border-stone-300 text-primary-600"
                  />
                  {tg}
                </label>
              );
            })}
          </div>
        )}
      </div>
    </td>
  </tr>
);

export default React.memo(MenuRow);
