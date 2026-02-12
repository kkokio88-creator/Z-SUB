import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import MealPlanner from './components/MealPlanner';
import MasterDataManagement from './components/MasterDataManagement';
import SubscriberManagement from './components/SubscriberManagement';
import SystemSettings from './components/SystemSettings';
import AuditLog from './components/AuditLog';
import { MenuProvider } from './context/MenuContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { SheetsProvider } from './context/SheetsContext';
import ToastContainer from './components/Toast';
import ConfirmDialog from './components/ConfirmDialog';
import AuthGate from './components/AuthGate';

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
                {renderContent()}
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
