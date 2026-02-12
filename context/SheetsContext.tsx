import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type SyncDirection = 'push' | 'pull';
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncState {
  status: SyncStatus;
  lastSynced: string | null;
  error: string | null;
  direction: SyncDirection | null;
}

interface SheetsContextType {
  syncStates: Record<string, SyncState>;
  isConfigured: boolean;
  setSyncStatus: (sheetName: string, status: SyncStatus, direction?: SyncDirection, error?: string) => void;
  getSheetSyncState: (sheetName: string) => SyncState;
}

const defaultSyncState: SyncState = { status: 'idle', lastSynced: null, error: null, direction: null };

const SheetsContext = createContext<SheetsContextType | null>(null);

export const SheetsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [syncStates, setSyncStates] = useState<Record<string, SyncState>>({});

  const isConfigured = !!localStorage.getItem('zsub_sheet_url');

  const setSyncStatus = useCallback(
    (sheetName: string, status: SyncStatus, direction?: SyncDirection, error?: string) => {
      setSyncStates(prev => ({
        ...prev,
        [sheetName]: {
          status,
          lastSynced: status === 'success' ? new Date().toLocaleString('ko-KR') : (prev[sheetName]?.lastSynced ?? null),
          error: error ?? null,
          direction: direction ?? prev[sheetName]?.direction ?? null,
        },
      }));
    },
    []
  );

  const getSheetSyncState = useCallback(
    (sheetName: string): SyncState => {
      return syncStates[sheetName] ?? defaultSyncState;
    },
    [syncStates]
  );

  return (
    <SheetsContext.Provider value={{ syncStates, isConfigured, setSyncStatus, getSheetSyncState }}>
      {children}
    </SheetsContext.Provider>
  );
};

export const useSheets = () => {
  const ctx = useContext(SheetsContext);
  if (!ctx) throw new Error('useSheets must be used within a SheetsProvider');
  return ctx;
};
