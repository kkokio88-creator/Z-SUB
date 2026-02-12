
import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import MealPlanner from './components/MealPlanner';
import MasterDataManagement from './components/MasterDataManagement';
import SubscriberManagement from './components/SubscriberManagement';
import SystemSettings from './components/SystemSettings';

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
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default App;
