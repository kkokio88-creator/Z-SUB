import React from 'react';
import type { HistoricalMenuItem, ReviewComment } from '../../types';
import { isValidMenuItem, parseMenuItem } from './historyConstants';
import MenuItemRow from './MenuItemRow';

const MergedTableCell: React.FC<{
  baseItems: HistoricalMenuItem[];
  plusItems: HistoricalMenuItem[];
  plusBadge: string;
  date: string;
  baseTarget: string;
  plusTarget: string;
  editedKeys: Set<string>;
  originalNames: Map<string, string>;
  commentCounts: Map<string, number>;
  allComments: ReviewComment[];
  highlightedIngredient?: string | null;
  onAction: (targetType: string, itemIndex: number, menuName: string) => void;
}> = ({
  baseItems,
  plusItems,
  plusBadge,
  date,
  baseTarget,
  plusTarget,
  editedKeys,
  originalNames,
  commentCounts,
  allComments,
  highlightedIngredient,
  onAction,
}) => {
  const baseNameSet = new Set(baseItems.filter(i => isValidMenuItem(i.name)).map(i => parseMenuItem(i.name).cleanName));
  const allItems: { item: HistoricalMenuItem; isPlusOnly: boolean; targetType: string; idx: number }[] = [];

  baseItems.forEach((item, idx) => {
    if (isValidMenuItem(item.name)) {
      allItems.push({ item, isPlusOnly: false, targetType: baseTarget, idx });
    }
  });

  plusItems.forEach((item, idx) => {
    if (!isValidMenuItem(item.name)) return;
    const { cleanName } = parseMenuItem(item.name);
    if (!baseNameSet.has(cleanName)) {
      allItems.push({ item, isPlusOnly: true, targetType: plusTarget, idx });
    }
  });

  return (
    <div className="space-y-0.5">
      {allItems.map((entry, displayIdx) => {
        const editKey = `${date}|${entry.targetType}|${entry.idx}`;
        const isEdited = editedKeys.has(editKey);
        const origCleanName = originalNames.get(editKey);
        const cKey = origCleanName
          ? `${entry.targetType}-${entry.idx}-${origCleanName}`
          : `${entry.targetType}-${entry.idx}-${parseMenuItem(entry.item.name).cleanName}`;
        const scopeComments = allComments.filter(c => c.scopeKey === cKey);
        return (
          <MenuItemRow
            key={`${entry.targetType}-${entry.idx}-${displayIdx}`}
            item={entry.item}
            idx={entry.idx}
            date={date}
            targetType={entry.targetType}
            isEdited={isEdited}
            originalName={origCleanName}
            isPlusOnly={entry.isPlusOnly}
            plusBadge={plusBadge}
            commentCount={commentCounts.get(cKey) || 0}
            recentComments={scopeComments}
            highlightedIngredient={highlightedIngredient}
            onAction={onAction}
          />
        );
      })}
    </div>
  );
};

export default MergedTableCell;
