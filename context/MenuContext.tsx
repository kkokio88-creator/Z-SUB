import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { MenuItem } from '../types';
import { pullMenuDB } from '../services/syncManager';
import { detectMainIngredient } from '../services/sheetsSerializer';

const STORAGE_KEY = 'zsub_menu_db';

// 캐시된 아이템의 mainIngredient가 'vegetable'(기본값)이면 메뉴명에서 재감지
const redetectIngredients = (items: MenuItem[]): MenuItem[] =>
  items.map(item =>
    item.mainIngredient === 'vegetable' ? { ...item, mainIngredient: detectMainIngredient(item.name) } : item
  );

const loadMenuFromStorage = (): MenuItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const items: MenuItem[] = JSON.parse(stored);
      return redetectIngredients(items.filter(item => item.name && item.name.trim()));
    }
  } catch {
    // ignore parse errors
  }
  return [];
};

interface MenuContextType {
  menuItems: MenuItem[];
  isLoading: boolean;
  updateItem: (id: string, updated: MenuItem) => void;
  addItem: (item: MenuItem) => void;
  deleteItem: (id: string) => void;
  deleteItems: (ids: string[]) => void;
  bulkUpdate: (ids: string[], changes: Partial<MenuItem>) => void;
  saveToStorage: () => void;
  refreshFromSheet: () => Promise<void>;
}

const MenuContext = createContext<MenuContextType | null>(null);

export const MenuProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(loadMenuFromStorage);
  const [isLoading, setIsLoading] = useState(false);

  const refreshFromSheet = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await pullMenuDB();
      if (result.success && result.items.length > 0) {
        const filtered = result.items.filter(item => item.name && item.name.trim());
        setMenuItems(filtered);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch {
      // keep cached data on failure
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshFromSheet();
  }, [refreshFromSheet]);

  const updateItem = useCallback((id: string, updated: MenuItem) => {
    setMenuItems(prev => prev.map(item => (item.id === id ? updated : item)));
  }, []);

  const addItem = useCallback((item: MenuItem) => {
    setMenuItems(prev => [item, ...prev]);
  }, []);

  const deleteItem = useCallback((id: string) => {
    setMenuItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const deleteItems = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setMenuItems(prev => prev.filter(item => !idSet.has(item.id)));
  }, []);

  const bulkUpdate = useCallback((ids: string[], changes: Partial<MenuItem>) => {
    setMenuItems(prev => prev.map(item => (ids.includes(item.id) ? { ...item, ...changes } : item)));
  }, []);

  const saveToStorage = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(menuItems));
  }, [menuItems]);

  return (
    <MenuContext.Provider
      value={{
        menuItems,
        isLoading,
        updateItem,
        addItem,
        deleteItem,
        deleteItems,
        bulkUpdate,
        saveToStorage,
        refreshFromSheet,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
};

export const useMenu = (): MenuContextType => {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('useMenu must be used within a MenuProvider');
  return ctx;
};
