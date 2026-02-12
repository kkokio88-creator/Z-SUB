import React, { useState, Suspense, lazy } from 'react';
import Layout from './components/Layout';
import { MenuProvider } from './context/MenuContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { SheetsProvider } from './context/SheetsContext';
import ToastContainer from './components/Toast';
import ConfirmDialog from './components/ConfirmDialog';
import AuthGate from './components/AuthGate';

const Dashboard = lazy(() => import('./components/Dashboard'));
const MealPlanner = lazy(() => import('./components/MealPlanner'));
const MasterDataManagement = lazy(() => import('./components/MasterDataManagement'));
const SubscriberManagement = lazy(() => import('./components/SubscriberManagement'));
const SystemSettings = lazy(() => import('./components/SystemSettings'));
const AuditLog = lazy(() => import('./components/AuditLog'));

const TabFallback = () => (
  <div className="flex items-center justify-center h-full">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
      <span className="text-sm text-gray-500">로딩 중...</span>
    </div>
  </div>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('planner');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'planner':
        return <MealPlanner />;
      case 'master-data':
        return <MasterDataManagement />;
      case 'subscribers':
        return <SubscriberManagement />;
      case 'settings':
        return <SystemSettings />;
      case 'audit-log':
        return <AuditLog />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-600">Module Not Found</h3>
              <p>Requested module "{activeTab}" does not exist.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <ToastProvider>
      <AuthProvider>
        <SheetsProvider>
          <MenuProvider>
            <AuthGate>
              <Layout activeTab={activeTab} onTabChange={setActiveTab}>
                <Suspense fallback={<TabFallback />}>{renderContent()}</Suspense>
              </Layout>
            </AuthGate>
          </MenuProvider>
        </SheetsProvider>
      </AuthProvider>
      <ToastContainer />
      <ConfirmDialog />
    </ToastProvider>
  );
};

export default App;
