import React, { useMemo } from 'react';
import type { HistoricalMenuItem, ReviewComment } from '../../types';
import { isValidMenuItem, parseMenuItem } from './historyConstants';
import MenuItemRow from './MenuItemRow';

const HistoryTableCell: React.FC<{
  items: HistoricalMenuItem[];
  date: string;
  targetType: string;
  editedKeys: Set<string>;
  originalNames: Map<string, string>;
  commentCounts: Map<string, number>;
  allComments: ReviewComment[];
  highlightedIngredient?: string | null;
  onAction: (targetType: string, itemIndex: number, menuName: string) => void;
}> = ({
  items,
  date,
  targetType,
  editedKeys,
  originalNames,
  commentCounts,
  allComments,
  highlightedIngredient,
  onAction,
}) => {
  const validItems = useMemo(
    () => items.map((item, idx) => ({ item, originalIdx: idx })).filter(({ item }) => isValidMenuItem(item.name)),
    [items]
  );

  return (
    <div className="space-y-0.5">
      {validItems.map(({ item, originalIdx }) => {
        const editKey = `${date}|${targetType}|${originalIdx}`;
        const isEdited = editedKeys.has(editKey);
        const origCleanName = originalNames.get(editKey);
        const cKey = origCleanName
          ? `${targetType}-${originalIdx}-${origCleanName}`
          : `${targetType}-${originalIdx}-${parseMenuItem(item.name).cleanName}`;
        const scopeComments = allComments.filter(c => c.scopeKey === cKey);
        return (
          <MenuItemRow
            key={originalIdx}
            item={item}
            idx={originalIdx}
            date={date}
            targetType={targetType}
            isEdited={isEdited}
            originalName={origCleanName}
            commentCount={commentCounts.get(cKey) || 0}
            recentComments={scopeComments}
            highlightedIngredient={highlightedIngredient}
            onAction={(tt, ii, name) => onAction(tt, ii, name)}
          />
        );
      })}
    </div>
  );
};

export default HistoryTableCell;
