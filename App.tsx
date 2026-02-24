import React, { useState, Suspense, lazy } from 'react';
import Layout from './components/Layout';
import { MenuProvider } from './context/MenuContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { SheetsProvider } from './context/SheetsContext';
import { HistoricalPlansProvider } from './context/HistoricalPlansContext';
import ToastContainer from './components/Toast';
import ConfirmDialog from './components/ConfirmDialog';
import AuthGate from './components/AuthGate';
import ErrorBoundary from './components/ErrorBoundary';

const Dashboard = lazy(() => import('./components/Dashboard'));
const MealPlanner = lazy(() => import('./components/MealPlanner'));
const MasterDataManagement = lazy(() => import('./components/MasterDataManagement'));
const SystemSettings = lazy(() => import('./components/SystemSettings'));
const MealPlanHistory = lazy(() => import('./components/MealPlanHistory'));

const TabFallback = () => (
  <div className="flex items-center justify-center h-full">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
      <span className="text-sm text-stone-500">로딩 중...</span>
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
      case 'settings':
        return <SystemSettings />;
      case 'meal-history':
        return <MealPlanHistory />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-stone-400">
            <div className="text-center">
              <h3 className="text-lg font-medium text-stone-600">Module Not Found</h3>
              <p>Requested module "{activeTab}" does not exist.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <SheetsProvider>
            <MenuProvider>
              <HistoricalPlansProvider>
                <AuthGate>
                  <Layout activeTab={activeTab} onTabChange={setActiveTab}>
                    <ErrorBoundary>
                      <Suspense fallback={<TabFallback />}>{renderContent()}</Suspense>
                    </ErrorBoundary>
                  </Layout>
                </AuthGate>
              </HistoricalPlansProvider>
            </MenuProvider>
          </SheetsProvider>
        </AuthProvider>
        <ToastContainer />
        <ConfirmDialog />
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
