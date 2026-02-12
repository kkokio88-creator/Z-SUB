import React from 'react';
import { ArrowLeft, Clock, User, Tag } from 'lucide-react';
import type { AuditEntry } from '../services/auditService';

interface Props {
  entry: AuditEntry;
  onBack: () => void;
}

const AuditEntryDetail: React.FC<Props> = ({ entry, onBack }) => {
  const formatJSON = (obj: Record<string, unknown> | undefined) => {
    if (!obj) return null;
    return JSON.stringify(obj, null, 2);
  };

  return (
    <div className="h-full flex flex-col">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> 목록으로 돌아가기
      </button>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-800">{entry.entityName}</h3>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              {entry.action}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {entry.userName}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {new Date(entry.timestamp).toLocaleString('ko-KR')}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="p-6 grid grid-cols-2 gap-4 border-b border-gray-100">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase">Entity Type</label>
            <p className="text-sm text-gray-800 mt-1">{entry.entityType}</p>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase">Entity ID</label>
            <p className="text-sm text-gray-800 mt-1 font-mono">{entry.entityId}</p>
          </div>
        </div>

        {/* Before / After */}
        {(entry.before || entry.after) && (
          <div className="p-6">
            <h4 className="text-sm font-bold text-gray-700 mb-4">변경 상세</h4>
            <div className="grid grid-cols-2 gap-4">
              {entry.before && (
                <div>
                  <label className="text-xs font-bold text-red-500 mb-2 block">Before (변경 전)</label>
                  <pre className="bg-red-50 border border-red-100 rounded-lg p-4 text-xs font-mono overflow-auto max-h-64 text-red-800 whitespace-pre-wrap">
                    {formatJSON(entry.before)}
                  </pre>
                </div>
              )}
              {entry.after && (
                <div>
                  <label className="text-xs font-bold text-green-500 mb-2 block">After (변경 후)</label>
                  <pre className="bg-green-50 border border-green-100 rounded-lg p-4 text-xs font-mono overflow-auto max-h-64 text-green-800 whitespace-pre-wrap">
                    {formatJSON(entry.after)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metadata */}
        {entry.metadata && Object.keys(entry.metadata).length > 0 && (
          <div className="p-6 border-t border-gray-100">
            <h4 className="text-sm font-bold text-gray-700 mb-3">메타데이터</h4>
            <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs font-mono overflow-auto max-h-40 whitespace-pre-wrap">
              {formatJSON(entry.metadata)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditEntryDetail;
