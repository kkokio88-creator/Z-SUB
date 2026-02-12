import React from 'react';
import { LayoutDashboard, Utensils, Users, Settings, LogOut, Leaf, Database, FileText, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const SidebarItem: React.FC<{
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
      active
        ? 'bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-100'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`}
  >
    <Icon className={`w-5 h-5 ${active ? 'text-primary-600' : 'text-gray-400'}`} />
    {label}
  </button>
);

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { user, logout } = useAuth();
  const roleLabel: Record<string, string> = { manager: '최고 관리자', nutritionist: '영양사', operator: '운영자' };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 z-20">
        <div className="h-16 flex items-center px-6 border-b border-gray-100 bg-white">
          <Leaf className="w-6 h-6 text-primary-600 mr-2" />
          <span className="text-xl font-bold text-gray-800 tracking-tight">Z-SUB</span>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          <div className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">운영 및 관리</div>
          <SidebarItem
            icon={LayoutDashboard}
            label="통합 대시보드"
            active={activeTab === 'dashboard'}
            onClick={() => onTabChange('dashboard')}
          />
          <SidebarItem
            icon={Utensils}
            label="지능형 식단 생성"
            active={activeTab === 'planner'}
            onClick={() => onTabChange('planner')}
          />

          <div className="mt-8 px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">데이터 센터</div>
          <SidebarItem
            icon={Database}
            label="기준 정보 관리"
            active={activeTab === 'master-data'}
            onClick={() => onTabChange('master-data')}
          />
          <SidebarItem
            icon={Users}
            label="구독자 CRM"
            active={activeTab === 'subscribers'}
            onClick={() => onTabChange('subscribers')}
          />
          <SidebarItem
            icon={History}
            label="식단 히스토리"
            active={activeTab === 'meal-history'}
            onClick={() => onTabChange('meal-history')}
          />

          <div className="mt-8 px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">시스템</div>
          <SidebarItem
            icon={Settings}
            label="시스템 설정"
            active={activeTab === 'settings'}
            onClick={() => onTabChange('settings')}
          />
          <SidebarItem
            icon={FileText}
            label="감사 로그"
            active={activeTab === 'audit-log'}
            onClick={() => onTabChange('audit-log')}
          />
        </nav>

        <div className="p-4 border-t border-gray-200 bg-gray-50/50">
          <div className="flex items-center">
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold border border-primary-200 shadow-sm">
              {user?.displayName?.charAt(0) || 'U'}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">{user?.displayName || '사용자'}</p>
              <p className="text-xs text-gray-500">{roleLabel[user?.role || 'manager']}</p>
            </div>
            <button onClick={logout} className="ml-auto text-gray-400 hover:text-gray-600 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-gray-50">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 flex-shrink-0 z-10 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              {activeTab === 'dashboard' && (
                <>
                  <LayoutDashboard className="w-6 h-6 text-gray-400" /> 통합 운영 대시보드
                </>
              )}
              {activeTab === 'planner' && (
                <>
                  <Utensils className="w-6 h-6 text-gray-400" /> 지능형 식단 생성
                </>
              )}
              {activeTab === 'master-data' && (
                <>
                  <Database className="w-6 h-6 text-gray-400" /> 기준 정보 관리
                </>
              )}
              {activeTab === 'subscribers' && (
                <>
                  <Users className="w-6 h-6 text-gray-400" /> 구독자 CRM
                </>
              )}
              {activeTab === 'meal-history' && (
                <>
                  <History className="w-6 h-6 text-gray-400" /> 식단 히스토리
                </>
              )}
              {activeTab === 'settings' && (
                <>
                  <Settings className="w-6 h-6 text-gray-400" /> 시스템 설정
                </>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-gray-800">2024년 3월 5일 (화)</p>
              <p className="text-[10px] text-gray-500">A조 배송일</p>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              정상 운영
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
