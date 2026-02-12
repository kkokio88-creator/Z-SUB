
import React, { useState } from 'react';
import { Database, Search, Filter, Save, FileSpreadsheet, RefreshCw, Plus, Trash2, Hash, Flame, Leaf, Snowflake, Sun, CloudRain, Check, X } from 'lucide-react';
import { MOCK_MENU_DB } from '../constants';
import { MenuCategory, MenuItem, Season, TasteProfile } from '../types';

const MenuDatabase: React.FC = () => {
  const [items, setItems] = useState<MenuItem[]>(MOCK_MENU_DB);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // New Item / Sync States
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<string>('2024-03-05 09:30');

  const filteredItems = items.filter(item => {
    const matchesCategory = filterCategory === 'ALL' || item.category === filterCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.code || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const selectedItem = items.find(i => i.id === selectedId) || null;

  const handleUpdateItem = (id: string, field: keyof MenuItem, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleTasteToggle = (id: string, taste: TasteProfile) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const newTastes = item.tastes.includes(taste)
        ? item.tastes.filter(t => t !== taste)
        : [...item.tastes, taste];
    
    // Auto-update isSpicy based on TasteProfile
    handleUpdateItem(id, 'tastes', newTastes);
    if (taste === TasteProfile.SPICY) {
       handleUpdateItem(id, 'isSpicy', newTastes.includes(TasteProfile.SPICY));
    }
  };

  const handleAddTag = (id: string, tag: string) => {
    const item = items.find(i => i.id === id);
    if (item && tag.trim()) {
        const newTags = [...item.tags, tag.trim()];
        handleUpdateItem(id, 'tags', newTags);
    }
  };

  const handleRemoveTag = (id: string, tag: string) => {
    const item = items.find(i => i.id === id);
    if (item) {
        handleUpdateItem(id, 'tags', item.tags.filter(t => t !== tag));
    }
  };

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
      process: 11
    };
    setItems([newItem, ...items]);
    setSelectedId(newItem.id);
  };

  const getSeasonIcon = (season: Season) => {
      switch(season) {
          case Season.SPRING: return <Leaf className="w-3 h-3 text-green-500" />;
          case Season.SUMMER: return <Sun className="w-3 h-3 text-orange-500" />;
          case Season.AUTUMN: return <CloudRain className="w-3 h-3 text-brown-500" />;
          case Season.WINTER: return <Snowflake className="w-3 h-3 text-blue-500" />;
          default: return <span className="text-[10px]">전체</span>;
      }
  };

  return (
    <div className="flex h-full gap-4 overflow-hidden">
      
      {/* Left Panel: List View */}
      <div className="w-1/3 flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* Search & Header */}
        <div className="p-4 border-b border-gray-100 space-y-3 bg-gray-50/50">
           <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                 <Database className="w-4 h-4 text-gray-500" /> 메뉴 목록
              </h3>
              <button onClick={handleCreateNew} className="p-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors">
                 <Plus className="w-4 h-4" />
              </button>
           </div>
           
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="메뉴명, 코드 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
           </div>
           
           <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button 
                onClick={() => setFilterCategory('ALL')}
                className={`whitespace-nowrap px-2.5 py-1 text-xs rounded-full border ${filterCategory === 'ALL' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                전체
              </button>
              {Object.values(MenuCategory).map(cat => (
                <button 
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`whitespace-nowrap px-2.5 py-1 text-xs rounded-full border ${filterCategory === cat ? 'bg-primary-50 border-primary-200 text-primary-700 font-medium' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  {cat}
                </button>
              ))}
           </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
           {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                 검색 결과가 없습니다.
              </div>
           ) : (
              <div className="divide-y divide-gray-100">
                 {filteredItems.map(item => (
                    <div 
                       key={item.id}
                       onClick={() => setSelectedId(item.id)}
                       className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-center border-l-4 ${selectedId === item.id ? 'bg-blue-50 border-l-blue-500' : 'border-l-transparent'}`}
                    >
                       <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                             <span className={`text-[10px] px-1.5 rounded font-bold ${
                                 item.category === MenuCategory.MAIN ? 'bg-orange-100 text-orange-700' :
                                 item.category === MenuCategory.SOUP ? 'bg-blue-100 text-blue-700' :
                                 'bg-green-100 text-green-700'
                             }`}>
                                {item.category.substring(0, 2)}
                             </span>
                             <span className={`text-sm font-medium truncate ${item.isUnused ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                {item.name}
                             </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                             <span className="font-mono">{item.code}</span>
                             <span>·</span>
                             <span>{item.cost.toLocaleString()}원</span>
                          </div>
                       </div>
                       {item.isSpicy && <Flame className="w-3 h-3 text-red-400 flex-shrink-0" />}
                    </div>
                 ))}
              </div>
           )}
        </div>
        
        {/* List Footer */}
        <div className="p-3 bg-gray-50 text-xs text-gray-500 border-t border-gray-200 flex justify-between">
           <span>{filteredItems.length}개 항목</span>
           <div className="flex items-center gap-1 cursor-pointer hover:text-green-600">
              <RefreshCw className="w-3 h-3" /> 동기화: {lastSynced.split(' ')[1]}
           </div>
        </div>
      </div>

      {/* Right Panel: Detail View */}
      <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
         {selectedItem ? (
            <>
               {/* Detail Header */}
               <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                  <div>
                     <div className="flex items-center gap-2 mb-2">
                        <select 
                           value={selectedItem.category}
                           onChange={(e) => handleUpdateItem(selectedItem.id, 'category', e.target.value)}
                           className="text-xs font-bold bg-gray-100 border-transparent rounded px-2 py-1 focus:ring-primary-500 focus:bg-white"
                        >
                           {Object.values(MenuCategory).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        {selectedItem.isUnused && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">미사용</span>}
                     </div>
                     <input 
                        type="text" 
                        value={selectedItem.name}
                        onChange={(e) => handleUpdateItem(selectedItem.id, 'name', e.target.value)}
                        className="text-2xl font-bold text-gray-900 border-none p-0 focus:ring-0 w-full placeholder-gray-300"
                        placeholder="메뉴명 입력"
                     />
                     <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                           <span className="text-gray-400">품목코드:</span>
                           <input 
                              value={selectedItem.code || ''}
                              onChange={(e) => handleUpdateItem(selectedItem.id, 'code', e.target.value)}
                              className="font-mono bg-transparent border-none p-0 w-24 focus:ring-0 text-gray-600"
                              placeholder="CODE"
                           />
                        </div>
                     </div>
                  </div>
                  <div className="flex gap-2">
                     <button 
                        onClick={() => handleUpdateItem(selectedItem.id, 'isUnused', !selectedItem.isUnused)}
                        className={`px-3 py-1.5 text-xs font-medium rounded border ${selectedItem.isUnused ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border-gray-300'}`}
                     >
                        {selectedItem.isUnused ? '사용으로 전환' : '미사용 처리'}
                     </button>
                     <button className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-600 text-white text-sm font-medium rounded hover:bg-primary-700 shadow-sm">
                        <Save className="w-4 h-4" /> 저장
                     </button>
                  </div>
               </div>

               {/* Detail Body */}
               <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  
                  {/* 1. Basic Info Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                     <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <label className="text-xs font-bold text-gray-400 block mb-1">원가</label>
                        <div className="flex items-center">
                           <span className="text-gray-400 text-sm mr-1">₩</span>
                           <input 
                              type="number"
                              value={selectedItem.cost}
                              onChange={(e) => handleUpdateItem(selectedItem.id, 'cost', parseInt(e.target.value))}
                              className="bg-transparent border-none p-0 font-bold text-lg text-gray-800 w-full focus:ring-0"
                           />
                        </div>
                     </div>
                     <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <label className="text-xs font-bold text-gray-400 block mb-1">권장 판매가</label>
                        <div className="flex items-center">
                           <span className="text-gray-400 text-sm mr-1">₩</span>
                           <input 
                              type="number"
                              value={selectedItem.recommendedPrice}
                              onChange={(e) => handleUpdateItem(selectedItem.id, 'recommendedPrice', parseInt(e.target.value))}
                              className="bg-transparent border-none p-0 font-bold text-lg text-gray-800 w-full focus:ring-0"
                           />
                        </div>
                     </div>
                     <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <label className="text-xs font-bold text-gray-400 block mb-1">중량 (g)</label>
                        <input 
                           type="number"
                           value={selectedItem.weight || 0}
                           onChange={(e) => handleUpdateItem(selectedItem.id, 'weight', parseInt(e.target.value))}
                           className="bg-transparent border-none p-0 font-bold text-lg text-gray-800 w-full focus:ring-0"
                        />
                     </div>
                     <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <label className="text-xs font-bold text-gray-400 block mb-1">공정 번호</label>
                        <input 
                           type="number"
                           value={selectedItem.process || 0}
                           onChange={(e) => handleUpdateItem(selectedItem.id, 'process', parseInt(e.target.value))}
                           className="bg-transparent border-none p-0 font-bold text-lg text-gray-800 w-full focus:ring-0"
                        />
                     </div>
                  </div>

                  {/* 2. Characteristics */}
                  <div className="space-y-4">
                     <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 pb-2 border-b border-gray-100">
                        <Filter className="w-4 h-4 text-gray-400" /> 메뉴 속성 상세
                     </h4>
                     
                     <div className="flex gap-8">
                        {/* Season */}
                        <div>
                           <label className="text-xs font-bold text-gray-500 mb-2 block">계절성</label>
                           <div className="flex gap-2">
                              {Object.values(Season).map(s => (
                                 <button
                                    key={s}
                                    onClick={() => handleUpdateItem(selectedItem.id, 'season', s)}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border ${selectedItem.season === s ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                 >
                                    {getSeasonIcon(s)} {s}
                                 </button>
                              ))}
                           </div>
                        </div>

                        {/* Main Ingredient */}
                        <div className="flex-1">
                           <label className="text-xs font-bold text-gray-500 mb-2 block">주재료</label>
                           <select
                              value={selectedItem.mainIngredient}
                              onChange={(e) => handleUpdateItem(selectedItem.id, 'mainIngredient', e.target.value)}
                              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-primary-500 focus:border-primary-500"
                           >
                              <option value="vegetable">채소류</option>
                              <option value="pork">돼지고기</option>
                              <option value="beef">소고기</option>
                              <option value="chicken">닭고기</option>
                              <option value="fish">생선</option>
                              <option value="seafood">해산물</option>
                              <option value="tofu">두부/콩</option>
                              <option value="seaweed">해조류</option>
                           </select>
                        </div>
                     </div>

                     {/* Taste Profile */}
                     <div>
                        <label className="text-xs font-bold text-gray-500 mb-2 block">맛 속성</label>
                        <div className="flex flex-wrap gap-2">
                           {Object.values(TasteProfile).map(t => {
                              const isActive = selectedItem.tastes.includes(t);
                              return (
                                 <button
                                    key={t}
                                    onClick={() => handleTasteToggle(selectedItem.id, t)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isActive ? 'bg-gray-800 text-white shadow-md transform scale-105' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                 >
                                    {t}
                                    {isActive && <Check className="w-3 h-3 inline ml-1" />}
                                 </button>
                              );
                           })}
                        </div>
                     </div>
                  </div>

                  {/* 3. Tags */}
                  <div>
                     <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 pb-2 border-b border-gray-100 mb-4">
                        <Hash className="w-4 h-4 text-gray-400" /> 관리 태그
                     </h4>
                     <div className="flex flex-wrap gap-2 mb-3">
                        {selectedItem.tags.map((tag, idx) => (
                           <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                              #{tag}
                              <button onClick={() => handleRemoveTag(selectedItem.id, tag)} className="ml-1.5 hover:text-blue-900">
                                 <X className="w-3 h-3" />
                              </button>
                           </span>
                        ))}
                     </div>
                     <input 
                        type="text"
                        placeholder="태그 추가 (Enter)..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                        onKeyDown={(e) => {
                           if (e.key === 'Enter') {
                              handleAddTag(selectedItem.id, e.currentTarget.value);
                              e.currentTarget.value = '';
                           }
                        }}
                     />
                     <p className="text-xs text-gray-400 mt-2">
                        * '아이선호', '시니어', '제철', '인기' 등의 태그를 사용하여 식단 생성 로직에 가중치를 부여할 수 있습니다.
                     </p>
                  </div>

               </div>
            </>
         ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
               <Database className="w-12 h-12 mb-4 opacity-20" />
               <p>좌측 목록에서 메뉴를 선택하거나</p>
               <button onClick={handleCreateNew} className="mt-2 text-primary-600 font-bold hover:underline">새 메뉴를 추가하세요</button>
            </div>
         )}
      </div>
    </div>
  );
};

export default MenuDatabase;
