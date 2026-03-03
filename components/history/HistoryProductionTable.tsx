import React from 'react';
import { MessageSquare, AlertTriangle } from 'lucide-react';
import { PROCESS_COLORS } from './historyConstants';

interface ConsolidatedItem {
  menuName: string;
  code?: string;
  process: string;
  totalQty: number;
  byTarget: Record<string, number>;
}

const HistoryProductionTable: React.FC<{
  consolidatedProduction: ConsolidatedItem[];
  productionLimits: { category: string; dailyLimit: number; enabled: boolean }[];
  commentCounts: Map<string, number>;
  onItemClick: (menuName: string) => void;
}> = ({ consolidatedProduction, productionLimits, commentCounts, onItemClick }) => {
  const renderSubtotal = (process: string) => {
    const groupItems = consolidatedProduction.filter(i => i.process === process);
    const groupTotal = groupItems.reduce((s, i) => s + i.totalQty, 0);
    const gpc = PROCESS_COLORS[process] || PROCESS_COLORS['기타'];
    const limitCfg = productionLimits.find(l => l.enabled && l.category === process);
    const itemCount = groupItems.length;
    const isCountOver = limitCfg && itemCount > limitCfg.dailyLimit;
    return (
      <tr key={`sub-${process}`} className={`${isCountOver ? 'bg-red-50' : gpc.bg} border-b border-stone-200`}>
        <td colSpan={3} className="px-4 py-1.5 text-[11px] font-bold text-stone-500">
          {process} 소계 ({itemCount}건)
          {isCountOver && limitCfg && (
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-red-500 font-bold">
              <AlertTriangle className="w-3 h-3" />
              한도 초과 ({itemCount}/{limitCfg.dailyLimit})
            </span>
          )}
        </td>
        <td
          className={`px-4 py-1.5 text-right text-xs font-bold tabular-nums ${isCountOver ? 'text-red-600' : 'text-stone-700'}`}
        >
          {groupTotal.toLocaleString()}
        </td>
      </tr>
    );
  };

  let lastProcess = '';
  const rows: React.ReactNode[] = [];
  consolidatedProduction.forEach((item, idx) => {
    if (item.process !== lastProcess) {
      if (lastProcess) rows.push(renderSubtotal(lastProcess));
      lastProcess = item.process;
    }
    const pc = PROCESS_COLORS[item.process] || PROCESS_COLORS['기타'];
    const prodCommentCount = Array.from(commentCounts.entries())
      .filter(([k]) => k.endsWith(`-${item.menuName}`))
      .reduce((s, [, v]) => s + v, 0);
    rows.push(
      <tr key={idx} className="border-b border-stone-100 hover:bg-stone-50">
        <td className="px-4 py-2.5 font-medium text-stone-800">
          <span className="cursor-pointer hover:underline" onClick={() => onItemClick(item.menuName)}>
            {item.menuName}
            {prodCommentCount > 0 && (
              <span className="ml-1 text-[8px] text-blue-500">
                <MessageSquare className="w-2.5 h-2.5 inline" />
                {prodCommentCount}
              </span>
            )}
          </span>
        </td>
        <td className="px-4 py-2.5 text-stone-500 font-mono text-xs">{item.code || '-'}</td>
        <td className="px-4 py-2.5">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${pc.badge}`}>
            {item.process}
          </span>
        </td>
        <td className="px-4 py-2.5 text-right">
          <span className="font-bold tabular-nums text-stone-800">{item.totalQty.toLocaleString()}</span>
        </td>
      </tr>
    );
  });
  if (lastProcess) rows.push(renderSubtotal(lastProcess));

  return (
    <div className="flex-1 overflow-auto">
      <div className="border border-stone-200 rounded-xl overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-stone-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 border-b border-stone-200">
                메뉴명
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 border-b border-stone-200">
                제품코드
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 border-b border-stone-200">
                공정
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-stone-500 border-b border-stone-200">
                총 생산수량
              </th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
          <tfoot>
            <tr className="bg-stone-50 border-t border-stone-200">
              <td colSpan={3} className="px-4 py-3 text-xs font-bold text-stone-600">
                합계
              </td>
              <td className="px-4 py-3 text-right text-sm font-bold text-stone-800">
                {consolidatedProduction.reduce((s, i) => s + i.totalQty, 0).toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default HistoryProductionTable;
