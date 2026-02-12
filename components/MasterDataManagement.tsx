
import React, { useState } from 'react';
import MenuDatabase from './MenuDatabase';
import PlanManagement from './PlanManagement';

const MasterDataManagement: React.FC = () => {
  const [subTab, setSubTab] = useState<'menu-db' | 'policy'>('menu-db');

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Sub-tab Navigation */}
      <div className="flex bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm w-fit">
        <button
          onClick={() => setSubTab('menu-db')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
            subTab === 'menu-db' 
              ? 'bg-gray-900 text-white shadow-sm' 
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          메뉴 라이브러리 (DB)
        </button>
        <button
          onClick={() => setSubTab('policy')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
            subTab === 'policy' 
              ? 'bg-gray-900 text-white shadow-sm' 
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          식단 정책 및 구성 설정
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {subTab === 'menu-db' ? (
          <MenuDatabase />
        ) : (
          <PlanManagement />
        )}
      </div>
    </div>
  );
};

export default MasterDataManagement;
