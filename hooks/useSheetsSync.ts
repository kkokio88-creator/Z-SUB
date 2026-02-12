// Google Sheets 동기화 편의 훅
import { useCallback } from 'react';
import { useSheets } from '../context/SheetsContext';
import { useToast } from '../context/ToastContext';
import { useMenu } from '../context/MenuContext';
import { pushMenuDB, pullMenuDB, logSync } from '../services/syncManager';

export const useSheetsSync = () => {
  const { setSyncStatus, isConfigured } = useSheets();
  const { addToast } = useToast();
  const { menuItems } = useMenu();

  const pushMenu = useCallback(async () => {
    if (!isConfigured) {
      addToast({ type: 'warning', title: '시트 미연결', message: '시스템 설정에서 Google Sheets URL을 설정하세요.' });
      return;
    }

    setSyncStatus('메뉴DB', 'syncing', 'push');
    const result = await pushMenuDB(menuItems);

    if (result.success) {
      setSyncStatus('메뉴DB', 'success', 'push');
      addToast({
        type: 'success',
        title: 'Push 완료',
        message: `메뉴 ${result.rowCount}건이 Sheets에 저장되었습니다.`,
      });
      await logSync('push', '메뉴DB', result.rowCount, 'success');
    } else {
      setSyncStatus('메뉴DB', 'error', 'push', result.error);
      addToast({ type: 'error', title: 'Push 실패', message: result.error || '알 수 없는 오류' });
      await logSync('push', '메뉴DB', 0, 'error', result.error);
    }
  }, [isConfigured, menuItems, setSyncStatus, addToast]);

  const pullMenu = useCallback(async () => {
    if (!isConfigured) {
      addToast({ type: 'warning', title: '시트 미연결', message: '시스템 설정에서 Google Sheets URL을 설정하세요.' });
      return;
    }

    setSyncStatus('메뉴DB', 'syncing', 'pull');
    const result = await pullMenuDB();

    if (result.success) {
      setSyncStatus('메뉴DB', 'success', 'pull');
      addToast({ type: 'success', title: 'Pull 완료', message: `${result.items.length}건의 메뉴를 가져왔습니다.` });
      await logSync('pull', '메뉴DB', result.items.length, 'success');
      return result.items;
    } else {
      setSyncStatus('메뉴DB', 'error', 'pull', result.error);
      addToast({ type: 'error', title: 'Pull 실패', message: result.error || '알 수 없는 오류' });
      await logSync('pull', '메뉴DB', 0, 'error', result.error);
      return null;
    }
  }, [isConfigured, setSyncStatus, addToast]);

  return { pushMenu, pullMenu, isConfigured };
};
