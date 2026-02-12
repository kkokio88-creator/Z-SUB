
import React, { useState, useMemo } from 'react';
import { TargetType, MonthlyMealPlan, MenuItem, MenuCategory, CycleType, WeeklyCyclePlan } from '../types';
import { generateMonthlyMealPlan, getSwapCandidates } from '../services/engine';
import { getExpertReview } from '../services/geminiService';
import { Sparkles, RefreshCw, Printer, BrainCircuit, X, LayoutGrid, AlertTriangle, ArrowRightLeft, DollarSign, ChefHat, Flame, CalendarClock, Layers, Database, Server, Check, History, RotateCcw } from 'lucide-react';
import { MAJOR_INGREDIENTS, TARGET_CONFIGS } from '../constants';

// --- History Mock Data ---
const HISTORY_PLANS = [
  { id: 'hist_001', label: '2024년 2월 정기 식단 (확정)', date: '2024-01-25', status: 'published' },
  { id: 'hist_002', label: '2024년 1월 정기 식단 (확정)', date: '2023-12-24', status: 'published' },
  { id: 'hist_003', label: '2023년 12월 정기 식단 (확정)', date: '2023-11-25', status: 'published' },
];

const MealPlanner: React.FC = () => {
  const [target, setTarget] = useState<TargetType>(TargetType.KIDS);
  const [monthLabel, setMonthLabel] = useState<string>("3월");
  const [checkDupes, setCheckDupes] = useState<boolean>(true);
  
  // Dual Plans for Cycle A (Tue-Thu) and Cycle B (Fri-Mon)
  const [plans, setPlans] = useState<{ A: MonthlyMealPlan | null; B: MonthlyMealPlan | null }>({ A: null, B: null });
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Expert Review State
  const [reviewResult, setReviewResult] = useState<any>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Swap Modal State
  const [swapTarget, setSwapTarget] = useState<{ cycle: 'A' | 'B'; weekIndex: number; item: MenuItem } | null>(null);
  const [swapCandidates, setSwapCandidates] = useState<MenuItem[]>([]);
  
  // Sync Status State
  const [misSyncStatus, setMisSyncStatus] = useState<'idle' | 'syncing' | 'done'>('idle');
  const [zppsSyncStatus, setZppsSyncStatus] = useState<'idle' | 'syncing' | 'done'>('idle');
  const [unsavedChangesCount, setUnsavedChangesCount] = useState(0);

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setReviewResult(null);
    setPlans({ A: null, B: null });
    setMisSyncStatus('idle');
    setZppsSyncStatus('idle');
    setUnsavedChangesCount(0);
    
    setTimeout(() => {
      const planA = generateMonthlyMealPlan(target, monthLabel, "화수목", checkDupes);
      const planB = generateMonthlyMealPlan(target, monthLabel, "금토월", checkDupes);
      setPlans({ A: planA, B: planB });
      setIsGenerating(false);
    }, 800);
  };

  const handleLoadHistory = (label: string) => {
      setShowHistoryModal(false);
      setIsGenerating(true);
      setPlans({ A: null, B: null });
      
      // Simulate loading past data
      setTimeout(() => {
        const planA = generateMonthlyMealPlan(target, label.split(' ')[0], "화수목", checkDupes);
        const planB = generateMonthlyMealPlan(target, label.split(' ')[0], "금토월", checkDupes);
        setPlans({ A: planA, B: planB });
        setMonthLabel(label.split(' ')[0]);
        setIsGenerating(false);
        alert(`${label} 데이터를 성공적으로 불러왔습니다.`);
      }, 600);
  };

  const handleExpertReview = async (plan: MonthlyMealPlan) => {
    setIsReviewing(true);
    const review = await getExpertReview(plan);
    setReviewResult(review);
    setIsReviewing(false);
    setShowReviewModal(true);
  };

  const openSwapModal = (cycle: 'A' | 'B', weekIndex: number, item: MenuItem) => {
    const plan = plans[cycle];
    if (!plan) return;
    const candidates = getSwapCandidates(plan, item, weekIndex);
    setSwapTarget({ cycle, weekIndex, item });
    setSwapCandidates(candidates);
  };

  const performSwap = (newItem: MenuItem) => {
    if (!swapTarget) return;
    const { cycle } = swapTarget;
    const currentPlan = plans[cycle];
    
    if (currentPlan) {
        const updatedWeeks = currentPlan.weeks.map(week => {
        if (week.weekIndex === swapTarget.weekIndex) {
            const newItems = week.items.map(i => i.id === swapTarget.item.id ? newItem : i);
            const newCost = newItems.reduce((acc, i) => acc + i.cost, 0);
            const newPrice = newItems.reduce((acc, i) => acc + i.recommendedPrice, 0);
            return { ...week, items: newItems, totalCost: newCost, totalPrice: newPrice };
        }
        return week;
        });
        setPlans(prev => ({ ...prev, [cycle]: { ...currentPlan, weeks: updatedWeeks } }));
        setUnsavedChangesCount(prev => prev + 1);
        setZppsSyncStatus('idle'); // Reset sync status on new change
    }
    setSwapTarget(null);
  };

  const handleRegisterToMIS = () => {
      if (!plans.A || !plans.B) return;

      // Simulation: Check for existing data
      setMisSyncStatus('syncing');
      setTimeout(() => {
          // Simulate finding existing records
          const confirmOverwrite = window.confirm(
              `[MIS 시스템 알림]\n\n해당 월(${monthLabel})의 ${target} 식단 정보가 이미 존재합니다.\n(기존: 120건 / 변경: 120건)\n\n기존 데이터를 덮어쓰고 새로 등록하시겠습니까?`
          );

          if (confirmOverwrite) {
              // Simulate API Call
              setTimeout(() => {
                  alert(`[성공] ${monthLabel} 식단 정보가 MIS에 성공적으로 등록되었습니다.`);
                  setMisSyncStatus('done');
                  setUnsavedChangesCount(0); // Assuming initial load is "fresh"
              }, 1000);
          } else {
              setMisSyncStatus('idle');
          }
      }, 800);
  };

  const handleSyncToZPPS = () => {
      if (unsavedChangesCount === 0) return;

      const confirmSync = window.confirm(
          `[ZPPS 생산 연동]\n\n총 ${unsavedChangesCount}건의 메뉴 변경사항이 감지되었습니다.\n생산 시스템(ZPPS)에 변경 내역을 반영하시겠습니까?`
      );

      if (confirmSync) {
          setZppsSyncStatus('syncing');
          setTimeout(() => {
              alert(`[성공] ${unsavedChangesCount}건의 식단 변경 정보가 ZPPS로 전송되었습니다.`);
              setZppsSyncStatus('done');
              setUnsavedChangesCount(0);
          }, 1500);
      }
  };

  // Helper: Combined Ingredient Matrix with Color Coding
  const getIngredientCounts = () => {
    if (!plans.A || !plans.B) return null;
    const counts: Record<string, number> = {};
    MAJOR_INGREDIENTS.forEach(ing => counts[ing.key] = 0);
    
    // Count from both plans
    [plans.A, plans.B].forEach(plan => {
        plan.weeks.forEach(week => {
            week.items.forEach(item => {
                if (counts[item.mainIngredient] !== undefined) counts[item.mainIngredient]++;
            });
        });
    });
    return counts;
  };
  const ingredientCounts = getIngredientCounts();
  const currentBudgetCap = TARGET_CONFIGS[target].budgetCap;
  const targetPrice = TARGET_CONFIGS[target].targetPrice;

  // Render a Single Cycle Row
  const renderCycleRow = (cycleLabel: string, plan: MonthlyMealPlan, cycleKey: 'A' | 'B') => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="bg-gray-50 border-b border-gray-200 p-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded text-xs font-bold ${cycleKey === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {cycleLabel}
                </span>
                <span className="text-sm font-medium text-gray-500">{monthLabel} 식단표</span>
            </div>
            <button 
                onClick={() => handleExpertReview(plan)}
                className="text-xs flex items-center gap-1 text-gray-600 hover:text-purple-600 font-bold bg-white border border-gray-300 px-2 py-1 rounded shadow-sm"
            >
                <BrainCircuit className="w-3 h-3" /> AI 검수
            </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            {plan.weeks.map((week) => {
                const costRatio = ((week.totalCost / targetPrice) * 100).toFixed(1);
                const isOverBudget = week.totalCost > currentBudgetCap;

                return (
                    <div key={week.weekIndex} className="p-3 flex flex-col group h-full">
                        <div className="flex justify-between items-start mb-3">
                            <span className="text-sm font-bold text-gray-800">{week.weekIndex}주차</span>
                            <div className="text-right">
                                <div className={`text-xs font-bold ${isOverBudget ? 'text-red-600' : 'text-gray-600'}`}>
                                    {week.totalCost.toLocaleString()}원
                                </div>
                                <div className="text-[10px] text-gray-400">({costRatio}%)</div>
                            </div>
                        </div>
                        
                        <div className="space-y-2 flex-1">
                             {week.items.map((item) => (
                                 <div 
                                    key={item.id}
                                    onClick={() => openSwapModal(cycleKey, week.weekIndex, item)}
                                    className="flex items-center gap-2 text-xs p-2 rounded hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200 transition-all"
                                 >
                                     <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                         item.category === MenuCategory.SOUP ? 'bg-blue-500' :
                                         item.category === MenuCategory.MAIN ? 'bg-orange-500' :
                                         'bg-green-500'
                                     }`}></span>
                                     <span className="font-medium text-gray-700 truncate flex-1">{item.name}</span>
                                     {item.isSpicy && <Flame className="w-3 h-3 text-red-400" />}
                                 </div>
                             ))}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full gap-6 relative">
      
      {/* 1. Control Bar & Sync Center */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
        {/* Top Row: Generation Controls */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-500 mb-1">식단 대상</label>
                    <select 
                        value={target}
                        onChange={(e) => setTarget(e.target.value as TargetType)}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-48 p-2.5"
                    >
                        {Object.values(TargetType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-500 mb-1">월 설정</label>
                    <select 
                        value={monthLabel}
                        onChange={(e) => setMonthLabel(e.target.value)}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-24 p-2.5"
                    >
                        {[3,4,5,6].map(m => <option key={m} value={`${m}월`}>{m}월</option>)}
                    </select>
                </div>

                <div className="flex items-center h-full pt-6 ml-2">
                    <label className="inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={checkDupes} onChange={e => setCheckDupes(e.target.checked)} className="sr-only peer" />
                        <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                        <span className="ms-2 text-sm font-medium text-gray-600">60일 중복 제외</span>
                    </label>
                </div>
            </div>

            <div className="flex items-center gap-3">
               <button 
                  onClick={() => setShowHistoryModal(true)}
                  className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl font-bold shadow-sm transition-all"
               >
                  <History className="w-5 h-5 text-gray-500" />
                  히스토리
               </button>
               <button 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className={`flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 ${isGenerating ? 'opacity-75 cursor-wait' : ''}`}
               >
                  {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {isGenerating ? '식단 생성 중...' : '통합 식단(A조/B조) 자동 생성'}
               </button>
            </div>
        </div>

        {/* Bottom Row: Integration Actions (Visible only when plans exist) */}
        {plans.A && (
            <div className="border-t border-gray-100 pt-3 flex justify-end items-center gap-3">
                 <div className="text-xs text-gray-400 mr-2 flex items-center gap-1">
                    <Server className="w-3 h-3" /> 시스템 연동 센터
                 </div>
                 
                 {/* MIS Button */}
                 <button
                    onClick={handleRegisterToMIS}
                    disabled={misSyncStatus === 'syncing' || misSyncStatus === 'done'}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border transition-all ${
                        misSyncStatus === 'done' 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                 >
                    {misSyncStatus === 'syncing' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 
                     misSyncStatus === 'done' ? <Check className="w-3 h-3" /> : <Database className="w-3 h-3" />}
                    {misSyncStatus === 'done' ? 'MIS 등록 완료' : '식단 정보 MIS 등록'}
                 </button>

                 {/* ZPPS Button */}
                 <button
                    onClick={handleSyncToZPPS}
                    disabled={unsavedChangesCount === 0 || zppsSyncStatus === 'syncing'}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border transition-all ${
                        unsavedChangesCount > 0
                        ? 'bg-orange-50 text-orange-700 border-orange-200 animate-pulse hover:bg-orange-100'
                        : 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                    }`}
                 >
                    {zppsSyncStatus === 'syncing' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ArrowRightLeft className="w-3 h-3" />}
                    ZPPS 변경 연동 {unsavedChangesCount > 0 && `(${unsavedChangesCount}건)`}
                 </button>
            </div>
        )}
      </div>

      {/* 2. Main Workspace */}
      {!plans.A ? (
         <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-gray-200 border-dashed p-10 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
               <Layers className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">통합 식단 생성 (이중 주기)</h3>
            <p className="text-gray-500 max-w-md">
               A조(화수목) 및 B조(금토월) 식단을 동시에 생성하고,<br/>두 식단 간의 식재료 중복을 체크하여 다양성을 확보합니다.
            </p>
         </div>
      ) : (
        <div className="flex flex-col flex-1 overflow-hidden">
           <div className="flex-1 overflow-y-auto pb-6">
               {/* Cycle A Row */}
               {plans.A && renderCycleRow('화수목 (A조)', plans.A, 'A')}
               
               {/* Cycle B Row */}
               {plans.B && renderCycleRow('금토월 (B조)', plans.B, 'B')}
               
               {/* Ingredient Matrix */}
               <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                   <div className="flex justify-between items-center mb-4">
                       <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                          <LayoutGrid className="w-4 h-4 text-gray-500" /> 
                          통합 식재료 활용 분포 (8주 합계)
                       </h4>
                       <div className="flex gap-2 text-[10px] font-medium text-gray-500">
                           <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-100 border border-green-300"></span>적정(1회)</span>
                           <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-100 border border-orange-300"></span>주의(2~3회)</span>
                           <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-100 border border-red-300"></span>과다(4회+)</span>
                       </div>
                   </div>
                   
                   <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                      {MAJOR_INGREDIENTS.map(ing => {
                          const count = ingredientCounts ? ingredientCounts[ing.key] || 0 : 0;
                          
                          // Color Coding Logic
                          let colorClass = "bg-gray-50 border-gray-200 text-gray-400"; // 0
                          if (count >= 4) colorClass = "bg-red-50 border-red-200 text-red-700 font-bold ring-2 ring-red-100";
                          else if (count >= 2) colorClass = "bg-orange-50 border-orange-200 text-orange-700 font-bold";
                          else if (count === 1) colorClass = "bg-green-50 border-green-200 text-green-700";

                          return (
                             <div key={ing.key} className={`flex-1 min-w-[80px] flex flex-col items-center p-3 rounded-lg border transition-all ${colorClass}`}>
                                <div className="text-lg mb-1">{count}회</div>
                                <span className="text-xs">{ing.label}</span>
                             </div>
                          );
                      })}
                   </div>
                   <p className="text-xs text-gray-400 mt-2 text-center">
                       * A조와 B조를 모두 구독하는 고객을 위해 2회 이상 중복된 재료는 하이라이트됩니다.
                   </p>
               </div>
           </div>
        </div>
      )}

      {/* --- Modals --- */}
      
      {/* 3. Swap Modal */}
      {swapTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div>
                 <h3 className="font-bold text-lg text-gray-800">메뉴 교체하기 ({swapTarget.cycle}타입)</h3>
                 <p className="text-xs text-gray-500">현재 메뉴: <span className="font-bold text-blue-600">{swapTarget.item.name}</span></p>
              </div>
              <button onClick={() => setSwapTarget(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="p-2 overflow-y-auto flex-1 bg-gray-50">
               {swapCandidates.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                    <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
                    <p>조건에 맞는 교체 가능한 메뉴가 없습니다.</p>
                 </div>
               ) : (
                 <div className="space-y-2 p-2">
                   {swapCandidates.map(candidate => {
                      const costDiff = candidate.cost - swapTarget.item.cost;
                      return (
                        <button 
                          key={candidate.id}
                          onClick={() => performSwap(candidate)}
                          className="w-full bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-blue-400 hover:shadow-md hover:ring-1 hover:ring-blue-400 transition-all text-left flex items-center justify-between group"
                        >
                           <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${candidate.category === MenuCategory.MAIN ? 'bg-orange-100' : 'bg-green-100'}`}>
                                 {candidate.category === MenuCategory.MAIN ? '🍖' : '🥗'}
                              </div>
                              <div>
                                 <div className="font-bold text-gray-800">{candidate.name}</div>
                                 <div className="text-xs text-gray-500 flex gap-1 mt-0.5">
                                    <span className="bg-gray-100 px-1.5 py-0.5 rounded">{candidate.mainIngredient}</span>
                                    {candidate.tags.map(t => <span key={t} className="bg-gray-100 px-1.5 py-0.5 rounded">#{t}</span>)}
                                 </div>
                              </div>
                           </div>
                           <div className="text-right">
                              <div className="font-bold text-gray-900">{candidate.cost.toLocaleString()}원</div>
                              <div className={`text-xs font-medium ${costDiff > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                 {costDiff > 0 ? `+${costDiff.toLocaleString()}` : costDiff.toLocaleString()}원
                              </div>
                           </div>
                        </button>
                      );
                   })}
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Expert Review Modal */}
      {showReviewModal && reviewResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-white">
              <h3 className="text-xl font-bold text-purple-900 flex items-center gap-2">
                <BrainCircuit className="w-6 h-6" />
                AI 전문가 검수 리포트
              </h3>
              <button onClick={() => setShowReviewModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-8">
              {/* Score Section */}
              <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                 <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                       <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-200" />
                       <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" 
                          className={`${reviewResult.overallScore > 80 ? 'text-green-500' : 'text-yellow-500'}`}
                          strokeDasharray={251.2}
                          strokeDashoffset={251.2 - (251.2 * reviewResult.overallScore / 100)}
                       />
                    </svg>
                    <span className="absolute text-2xl font-bold text-gray-800">{reviewResult.overallScore}</span>
                 </div>
                 <div>
                    <h4 className="text-lg font-bold text-gray-900">종합 평가 점수</h4>
                    <p className="text-gray-600 text-sm mt-1">
                       {reviewResult.overallScore > 80 ? '아주 훌륭한 식단입니다! 영양과 원가 균형이 잘 잡혀있습니다.' : '몇 가지 개선이 필요합니다. 아래 전문가 의견을 참고하세요.'}
                    </p>
                 </div>
              </div>

              {/* Expert Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-green-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-4 text-2xl">🥗</div>
                  <h4 className="font-bold text-gray-900 mb-2">영양사 분석</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{reviewResult.nutritionistComment}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-2xl">🏭</div>
                  <h4 className="font-bold text-gray-900 mb-2">공정 효율성</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{reviewResult.processExpertComment}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-yellow-100 shadow-sm hover:shadow-md transition-shadow">
                   <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mb-4 text-2xl">💰</div>
                  <h4 className="font-bold text-gray-900 mb-2">원가/구매 분석</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{reviewResult.costExpertComment}</p>
                </div>
              </div>

              {/* Warnings */}
              {reviewResult.flaggedItemNames && reviewResult.flaggedItemNames.length > 0 && (
                <div className="bg-red-50 p-5 rounded-xl border border-red-100 flex gap-4">
                   <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
                   <div>
                      <h4 className="font-bold text-red-800 mb-1">주의가 필요한 메뉴</h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {reviewResult.flaggedItemNames.map((name: string, idx: number) => (
                          <span key={idx} className="bg-white border border-red-200 text-red-600 px-2.5 py-1 rounded-md text-xs font-bold">
                            {name}
                          </span>
                        ))}
                      </div>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. History Modal */}
      {showHistoryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                <div>
                   <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                       <History className="w-5 h-5 text-gray-500" /> 지난 식단 이력
                   </h3>
                   <p className="text-xs text-gray-500 mt-1">이전에 생성하고 확정된 식단 데이터를 조회합니다.</p>
                </div>
                <button onClick={() => setShowHistoryModal(false)} className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              
              <div className="p-4 bg-white max-h-[60vh] overflow-y-auto">
                 <div className="space-y-3">
                    {HISTORY_PLANS.map((plan) => (
                        <div key={plan.id} className="border border-gray-200 rounded-xl p-4 flex justify-between items-center hover:border-primary-500 hover:shadow-md transition-all group">
                            <div>
                                <div className="font-bold text-gray-800">{plan.label}</div>
                                <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                                    <span>확정일: {plan.date}</span>
                                    <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-bold">MIS 등록됨</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleLoadHistory(plan.label)}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-lg flex items-center gap-1 group-hover:bg-primary-50 group-hover:text-primary-700 transition-colors"
                            >
                                <RotateCcw className="w-3 h-3" /> 불러오기
                            </button>
                        </div>
                    ))}
                 </div>
              </div>
            </div>
          </div>
      )}

    </div>
  );
};

export default MealPlanner;
