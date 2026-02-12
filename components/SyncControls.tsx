import React from 'react';
import { ArrowUpFromLine, ArrowDownToLine, RefreshCw } from 'lucide-react';
import { useSheets, type SyncState } from '../context/SheetsContext';

interface SyncControlsProps {
  sheetName: string;
  onPush: () => void;
  onPull: () => void;
}

const SyncControls: React.FC<SyncControlsProps> = ({ sheetName, onPush, onPull }) => {
  const { getSheetSyncState } = useSheets();
  const state: SyncState = getSheetSyncState(sheetName);
  const isSyncing = state.status === 'syncing';

  return (
    <div className="flex items-center gap-2">
      {state.lastSynced && <span className="text-[10px] text-gray-400">최종: {state.lastSynced}</span>}
      <button
        onClick={onPush}
        disabled={isSyncing}
        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {isSyncing && state.direction === 'push' ? (
          <RefreshCw className="w-3 h-3 animate-spin" />
        ) : (
          <ArrowUpFromLine className="w-3 h-3" />
        )}
        Push
      </button>
      <button
        onClick={onPull}
        disabled={isSyncing}
        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {isSyncing && state.direction === 'pull' ? (
          <RefreshCw className="w-3 h-3 animate-spin" />
        ) : (
          <ArrowDownToLine className="w-3 h-3" />
        )}
        Pull
      </button>
    </div>
  );
};

export default SyncControls;
