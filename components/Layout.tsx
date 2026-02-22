import React, { useState } from 'react';
import {
  LayoutDashboard,
  Utensils,
  Settings,
  LogOut,
  Leaf,
  Database,
  FileText,
  History,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const SidebarItem: React.FC<{
  icon: React.ElementType;
  label: string;
  active: boolean;
  collapsed?: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, active, collapsed, onClick }) => (
  <Button
    variant="ghost"
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={`w-full flex items-center gap-3 ${collapsed ? 'justify-center px-2' : 'px-4'} py-3 text-sm font-medium rounded-lg transition-colors ${
      active
        ? 'bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-100 hover:bg-primary-50 hover:text-primary-700'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`}
  >
    <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-primary-600' : 'text-gray-400'}`} />
    {!collapsed && label}
  </Button>
);

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const roleLabel: Record<string, string> = { manager: '최고 관리자', nutritionist: '영양사', operator: '운영자' };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${collapsed ? 'w-16' : 'w-64'} transition-all duration-200 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 z-20`}
      >
        <div
          className={`h-16 flex items-center ${collapsed ? 'justify-center px-2' : 'px-6'} border-b border-gray-100 bg-white`}
        >
          <Leaf className="w-6 h-6 text-primary-600 flex-shrink-0" />
          {!collapsed && <span className="text-xl font-bold text-gray-800 tracking-tight ml-2">Z-SUB</span>}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(c => !c)}
            className={`${collapsed ? '' : 'ml-auto'} h-7 w-7`}
            title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          >
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </Button>
        </div>

        <nav className={`flex-1 ${collapsed ? 'px-1' : 'px-3'} py-6 space-y-1 overflow-y-auto`}>
          {!collapsed && (
            <div className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">운영 및 관리</div>
          )}
          <SidebarItem
            icon={LayoutDashboard}
            label="통합 대시보드"
            active={activeTab === 'dashboard'}
            collapsed={collapsed}
            onClick={() => onTabChange('dashboard')}
          />
          <SidebarItem
            icon={Utensils}
            label="AI 식단 구성"
            active={activeTab === 'planner'}
            collapsed={collapsed}
            onClick={() => onTabChange('planner')}
          />

          {!collapsed && (
            <div className="mt-8 px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              데이터 센터
            </div>
          )}
          {collapsed && <div className="mt-4" />}
          <SidebarItem
            icon={Database}
            label="반찬 리스트"
            active={activeTab === 'master-data'}
            collapsed={collapsed}
            onClick={() => onTabChange('master-data')}
          />
          <SidebarItem
            icon={History}
            label="식단 히스토리"
            active={activeTab === 'meal-history'}
            collapsed={collapsed}
            onClick={() => onTabChange('meal-history')}
          />

          {!collapsed && (
            <div className="mt-8 px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">시스템</div>
          )}
          {collapsed && <div className="mt-4" />}
          <SidebarItem
            icon={Settings}
            label="시스템 설정"
            active={activeTab === 'settings'}
            collapsed={collapsed}
            onClick={() => onTabChange('settings')}
          />
          <SidebarItem
            icon={FileText}
            label="감사 로그"
            active={activeTab === 'audit-log'}
            collapsed={collapsed}
            onClick={() => onTabChange('audit-log')}
          />
        </nav>

        <div className={`${collapsed ? 'p-2' : 'p-4'} border-t border-gray-200 bg-gray-50/50`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold border border-primary-200 shadow-sm flex-shrink-0">
              {user?.displayName?.charAt(0) || 'U'}
            </div>
            {!collapsed && (
              <>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{user?.displayName || '사용자'}</p>
                  <p className="text-xs text-gray-500">{roleLabel[user?.role || 'manager']}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="ml-auto h-8 w-8 text-gray-400 hover:text-gray-600 transition-colors"
                  title="로그아웃"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </>
            )}
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
                  <Utensils className="w-6 h-6 text-gray-400" /> AI 식단 구성
                </>
              )}
              {activeTab === 'master-data' && (
                <>
                  <Database className="w-6 h-6 text-gray-400" /> 반찬 리스트
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
            <Badge variant="success" className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              정상 운영
            </Badge>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-3 py-4 sm:p-6 scroll-smooth">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
