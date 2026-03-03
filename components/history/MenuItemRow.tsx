import React from 'react';
import { MessageSquare } from 'lucide-react';
import type { HistoricalMenuItem, ReviewComment } from '../../types';
import { detectIngredient, parseMenuItem, INGREDIENT_HIGHLIGHT_TEXT } from './historyConstants';

const MenuItemRow: React.FC<{
  item: HistoricalMenuItem;
  idx: number;
  date: string;
  targetType: string;
  isEdited: boolean;
  originalName?: string;
  isPlusOnly?: boolean;
  plusBadge?: string;
  commentCount: number;
  recentComments?: ReviewComment[];
  highlightedIngredient?: string | null;
  onAction: (targetType: string, itemIndex: number, menuName: string) => void;
}> = ({
  item,
  idx,
  date: _date,
  targetType,
  isEdited,
  originalName,
  isPlusOnly,
  plusBadge,
  commentCount,
  recentComments,
  highlightedIngredient,
  onAction,
}) => {
  const ingredient = detectIngredient(item.name);
  const { cleanName, quantity } = parseMenuItem(item.name);
  const hasUnresolvedComment = !isEdited && recentComments?.some(c => c.status === 'comment' || c.status === 'issue');
  const isHighlighted = highlightedIngredient != null && ingredient === highlightedIngredient;

  return (
    <div
      onClick={() => onAction(targetType, idx, item.name)}
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] leading-tight cursor-pointer bg-white hover:ring-1 hover:ring-stone-200 transition-all ${isEdited ? 'ring-1 ring-green-300 bg-green-50/30' : hasUnresolvedComment ? 'ring-2 ring-red-400 bg-red-50/30' : ''}`}
      title={isEdited && originalName ? `변경: ${originalName} → ${cleanName}` : item.name}
    >
      <span
        className={`${isHighlighted ? (INGREDIENT_HIGHLIGHT_TEXT[ingredient] || 'text-stone-700') + ' font-bold' : 'text-stone-700'} truncate flex-1`}
      >
        {cleanName}
      </span>
      {item.cost > 0 && (
        <span className="text-[9px] text-stone-400 tabular-nums shrink-0">{item.cost.toLocaleString()}</span>
      )}
      {quantity !== null && (
        <span className="px-1 py-0 text-[9px] font-bold text-stone-400 bg-stone-50 rounded shrink-0">{quantity}</span>
      )}
      {isPlusOnly && plusBadge && (
        <span className="px-1 py-0 text-[9px] font-medium text-slate-500 bg-slate-100 rounded shrink-0">
          {plusBadge}
        </span>
      )}
      {isEdited && originalName && (
        <span className="text-[9px] text-green-600 font-medium shrink-0" title={`${originalName} → ${cleanName}`}>
          {'\u2713'}
        </span>
      )}
      {commentCount > 0 &&
        (() => {
          const hasIssue = recentComments?.some(c => c.status === 'issue');
          const allResolved =
            recentComments && recentComments.length > 0 && recentComments.every(c => c.status === 'resolved');
          const iconColor = allResolved ? 'text-green-600' : hasIssue ? 'text-red-500' : 'text-slate-400';
          return (
            <span className={`relative group/comment flex items-center gap-0.5 text-[9px] ${iconColor} shrink-0`}>
              <MessageSquare className="w-2.5 h-2.5" />
              {commentCount}
              {recentComments && recentComments.length > 0 && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/comment:block z-50 w-52 p-2 bg-stone-800 text-white text-[10px] rounded-lg shadow-lg pointer-events-none">
                  {isEdited && originalName && (
                    <span className="block mb-1.5 pb-1 border-b border-stone-600 text-green-400 text-[9px]">
                      {'\u2713'} {originalName} → {cleanName}
                    </span>
                  )}
                  {recentComments.slice(-3).map((c, i) => {
                    const statusColor =
                      c.status === 'resolved'
                        ? 'text-green-400'
                        : c.status === 'issue'
                          ? 'text-red-400'
                          : 'text-stone-300';
                    const statusPrefix = c.status === 'resolved' ? '\u2713 ' : c.status === 'issue' ? '\u2717 ' : '';
                    return (
                      <span key={i} className={`block mb-1 last:mb-0 ${statusColor}`}>
                        <span className="font-bold">
                          {statusPrefix}
                          {c.reviewer}:
                        </span>{' '}
                        {c.comment.length > 40 ? c.comment.slice(0, 40) + '...' : c.comment}
                      </span>
                    );
                  })}
                </span>
              )}
            </span>
          );
        })()}
    </div>
  );
};

export default MenuItemRow;
