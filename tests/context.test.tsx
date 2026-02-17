import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ToastProvider, useToast } from '../context/ToastContext';
import { MenuProvider, useMenu } from '../context/MenuContext';
import { MenuCategory, Season, TasteProfile } from '../types';
import type { MenuItem } from '../types';

describe('ToastContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <ToastProvider>{children}</ToastProvider>;

  it('초기 상태에서 토스트 없음', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    expect(result.current.toasts).toEqual([]);
  });

  it('토스트 추가', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => {
      result.current.addToast({ type: 'success', title: '테스트 메시지' });
    });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('테스트 메시지');
    expect(result.current.toasts[0].type).toBe('success');
  });

  it('토스트 제거', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => {
      result.current.addToast({ type: 'info', title: '삭제할 메시지', duration: 0 });
    });
    const toastId = result.current.toasts[0].id;
    act(() => {
      result.current.removeToast(toastId);
    });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('여러 토스트 추가', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => {
      result.current.addToast({ type: 'success', title: '첫번째', duration: 0 });
      result.current.addToast({ type: 'error', title: '두번째', duration: 0 });
      result.current.addToast({ type: 'warning', title: '세번째', duration: 0 });
    });
    expect(result.current.toasts).toHaveLength(3);
  });

  it('Provider 없이 useToast 사용 시 에러', () => {
    expect(() => {
      renderHook(() => useToast());
    }).toThrow('useToast must be used within a ToastProvider');
  });
});

describe('MenuContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <MenuProvider>{children}</MenuProvider>;

  const testItem: MenuItem = {
    id: 'TEST001',
    name: '테스트 메뉴',
    category: MenuCategory.MAIN,
    cost: 3000,
    recommendedPrice: 8000,
    tastes: [TasteProfile.BLAND],
    season: Season.ALL,
    tags: ['테스트'],
    isSpicy: false,
    mainIngredient: 'beef',
  };

  it('초기 메뉴 항목 로드 (빈 배열 또는 캐시)', () => {
    const { result } = renderHook(() => useMenu(), { wrapper });
    expect(Array.isArray(result.current.menuItems)).toBe(true);
  });

  it('메뉴 항목 추가', () => {
    const { result } = renderHook(() => useMenu(), { wrapper });
    const initialLength = result.current.menuItems.length;
    act(() => {
      result.current.addItem(testItem);
    });
    expect(result.current.menuItems).toHaveLength(initialLength + 1);
    expect(result.current.menuItems[0].id).toBe('TEST001');
  });

  it('메뉴 항목 수정', () => {
    const { result } = renderHook(() => useMenu(), { wrapper });
    act(() => {
      result.current.addItem(testItem);
    });
    act(() => {
      result.current.updateItem('TEST001', { ...testItem, name: '수정된 메뉴' });
    });
    const updated = result.current.menuItems.find(i => i.id === 'TEST001');
    expect(updated?.name).toBe('수정된 메뉴');
  });

  it('메뉴 항목 삭제', () => {
    const { result } = renderHook(() => useMenu(), { wrapper });
    act(() => {
      result.current.addItem(testItem);
    });
    const lengthAfterAdd = result.current.menuItems.length;
    act(() => {
      result.current.deleteItem('TEST001');
    });
    expect(result.current.menuItems).toHaveLength(lengthAfterAdd - 1);
    expect(result.current.menuItems.find(i => i.id === 'TEST001')).toBeUndefined();
  });

  it('Provider 없이 useMenu 사용 시 에러', () => {
    expect(() => {
      renderHook(() => useMenu());
    }).toThrow('useMenu must be used within a MenuProvider');
  });
});
