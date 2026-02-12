import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { MOCK_MENU_DB } from '../constants';
import { MenuItem } from '../types';

const STORAGE_KEY = 'zsub_menu_db';

const loadMenuFromStorage = (): MenuItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore parse errors
  }
  return MOCK_MENU_DB;
};

interface MenuContextType {
  menuItems: MenuItem[];
  updateItem: (id: string, updated: MenuItem) => void;
  addItem: (item: MenuItem) => void;
  deleteItem: (id: string) => void;
  saveToStorage: () => void;
  resetToDefault: () => void;
}

const MenuContext = createContext<MenuContextType | null>(null);

export const MenuProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(loadMenuFromStorage);

  const updateItem = useCallback((id: string, updated: MenuItem) => {
    setMenuItems(prev => prev.map(item => (item.id === id ? updated : item)));
  }, []);

  const addItem = useCallback((item: MenuItem) => {
    setMenuItems(prev => [item, ...prev]);
  }, []);

  const deleteItem = useCallback((id: string) => {
    setMenuItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const saveToStorage = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(menuItems));
  }, [menuItems]);

  const resetToDefault = useCallback(() => {
    setMenuItems(MOCK_MENU_DB);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <MenuContext.Provider value={{ menuItems, updateItem, addItem, deleteItem, saveToStorage, resetToDefault }}>
      {children}
    </MenuContext.Provider>
  );
};

export const useMenu = (): MenuContextType => {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('useMenu must be used within a MenuProvider');
  return ctx;
};
