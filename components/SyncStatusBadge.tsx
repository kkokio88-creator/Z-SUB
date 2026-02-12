import React from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';

type BadgeStatus = 'idle' | 'syncing' | 'done' | 'error';

interface Props {
  status: BadgeStatus;
  label?: string;
}

const config: Record<BadgeStatus, { icon: React.ElementType; color: string; text: string }> = {
  idle: { icon: Clock, color: 'bg-gray-100 text-gray-500', text: '대기' },
  syncing: { icon: RefreshCw, color: 'bg-blue-100 text-blue-600', text: '동기화 중' },
  done: { icon: CheckCircle, color: 'bg-green-100 text-green-600', text: '완료' },
  error: { icon: AlertCircle, color: 'bg-red-100 text-red-600', text: '오류' },
};

const SyncStatusBadge: React.FC<Props> = ({ status, label }) => {
  const { icon: Icon, color, text } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${color}`}>
      <Icon className={`w-3 h-3 ${status === 'syncing' ? 'animate-spin' : ''}`} />
      {label || text}
    </span>
  );
};

export default SyncStatusBadge;
