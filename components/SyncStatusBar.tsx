import React from 'react';
import { RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { useSheets } from '../context/SheetsContext';

const SyncStatusBar: React.FC = () => {
  const { syncStates, isConfigured } = useSheets();

  const activeSyncs = Object.entries(syncStates).filter(([, s]) => s.status === 'syncing');
  const hasErrors = Object.entries(syncStates).some(([, s]) => s.status === 'error');

  if (!isConfigured) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <CloudOff className="w-3.5 h-3.5" />
        <span>Sheets 미연결</span>
      </div>
    );
  }

  if (activeSyncs.length > 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span>동기화 중...</span>
      </div>
    );
  }

  if (hasErrors) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
        <Cloud className="w-3.5 h-3.5" />
        <span>동기화 오류</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-green-600">
      <Cloud className="w-3.5 h-3.5" />
      <span>연결됨</span>
    </div>
  );
};

export default SyncStatusBar;
