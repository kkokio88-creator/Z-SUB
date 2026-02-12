import React, { useState, useMemo } from 'react';
import { Search, Filter, Clock, User, ChevronRight, Trash2, FileText } from 'lucide-react';
import { getAuditLog, clearAuditLog, type AuditEntry } from '../services/auditService';
import { useToast } from '../context/ToastContext';
import AuditEntryDetail from './AuditEntryDetail';

const ACTION_LABELS: Record<string, string> = {
  'menu.create': '메뉴 생성',
  'menu.update': '메뉴 수정',
  'menu.delete': '메뉴 삭제',
  'plan.generate': '식단 생성',
  'plan.save': '식단 저장',
  'plan.delete': '식단 삭제',
  'config.create': '정책 생성',
  'config.update': '정책 수정',
  'config.delete': '정책 삭제',
  'swap.execute': '메뉴 교체',
  'sync.mis': 'MIS 동기화',
  'sync.zpps': 'ZPPS 동기화',
  'sync.sheets': 'Sheets 동기화',
  'settings.update': '설정 변경',
  'auth.login': '로그인',
  'auth.logout': '로그아웃',
};

const ACTION_COLORS: Record<string, string> = {
  menu: 'bg-blue-100 text-blue-700',
  plan: 'bg-purple-100 text-purple-700',
  config: 'bg-amber-100 text-amber-700',
  swap: 'bg-orange-100 text-orange-700',
  sync: 'bg-green-100 text-green-700',
  settings: 'bg-gray-100 text-gray-700',
  auth: 'bg-red-100 text-red-700',
};

const AuditLog: React.FC = () => {
  const { addToast, confirm } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const entries = useMemo(() => {
    return getAuditLog({ action: filterAction || undefined, search: searchQuery || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filterAction, refreshKey]);

  const handleClear = async () => {
    const ok = await confirm({
      title: '감사 로그 초기화',
      message: '모든 감사 로그를 삭제합니다. 이 작업은 되돌릴 수 없습니다.',
      variant: 'danger',
      confirmLabel: '전체 삭제',
    });
    if (ok) {
      clearAuditLog();
      setRefreshKey(k => k + 1);
      addToast({ type: 'success', title: '감사 로그 초기화 완료' });
    }
  };

  const getActionColor = (action: string) => {
    const prefix = action.split('.')[0];
    return ACTION_COLORS[prefix] || 'bg-gray-100 text-gray-700';
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (selectedEntry) {
    return <AuditEntryDetail entry={selectedEntry} onBack={() => setSelectedEntry(null)} />;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">감사 로그</h2>
          <p className="text-sm text-gray-500 mt-1">시스템 변경 이력 {entries.length}건</p>
        </div>
        <button
          onClick={handleClear}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
        >
          <Trash2 className="w-4 h-4" /> 전체 삭제
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="이름, 동작으로 검색..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="pl-10 pr-8 py-2.5 text-sm border border-gray-200 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-primary-500"
          >
            <option value="">전체 동작</option>
            <option value="menu">메뉴 관련</option>
            <option value="plan">식단 관련</option>
            <option value="config">정책 관련</option>
            <option value="sync">동기화</option>
            <option value="settings">설정</option>
            <option value="auth">인증</option>
          </select>
        </div>
      </div>

      {/* Log List */}
      <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-sm">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <FileText className="w-12 h-12 mb-3 opacity-50" />
            <p className="font-medium">감사 로그가 없습니다</p>
            <p className="text-sm mt-1">시스템 작업이 수행되면 자동으로 기록됩니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {entries.map(entry => (
              <button
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex-shrink-0">
                  <span
                    className={`inline-flex items-center px-2 py-1 text-xs font-bold rounded ${getActionColor(entry.action)}`}
                  >
                    {ACTION_LABELS[entry.action] || entry.action}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{entry.entityName}</p>
                  <p className="text-xs text-gray-500">{entry.entityType}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {entry.userName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(entry.timestamp)}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;
