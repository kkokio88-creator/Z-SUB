import React from 'react';
import { BarChart3 } from 'lucide-react';
import { TargetType } from '../../types';
import { Input } from '@/components/ui/input';

interface ShipmentSectionProps {
  shipmentConfig: Record<string, { 화수목: number; 금토월: number }>;
  setShipmentConfig: React.Dispatch<React.SetStateAction<Record<string, { 화수목: number; 금토월: number }>>>;
}

const ShipmentSection: React.FC<ShipmentSectionProps> = ({ shipmentConfig, setShipmentConfig }) => (
  <div className="space-y-6 max-w-3xl">
    <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 flex gap-3 items-start">
      <BarChart3 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
      <div>
        <h4 className="font-bold text-orange-900 text-sm">출고량 시뮬레이션</h4>
        <p className="text-xs text-orange-700 mt-1">
          식단 유형별 평균 출고량(식수)을 입력하면, 히스토리 탭에서 메뉴별 예상 생산수량을 확인할 수 있습니다.
        </p>
      </div>
    </div>

    <div className="border border-stone-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-stone-50 border-b border-stone-200">
            <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600">식단 유형</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-stone-600">화수목 (식)</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-stone-600">금토월 (식)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {Object.values(TargetType).map(target => (
            <tr key={target} className="hover:bg-emerald-50/40">
              <td className="px-4 py-2.5 text-xs font-medium text-stone-700">{target.replace(/ 식단$/, '')}</td>
              <td className="px-4 py-2 text-center">
                <Input
                  type="number"
                  min="0"
                  value={shipmentConfig[target]?.['화수목'] || 0}
                  onChange={e => {
                    const val = parseInt(e.target.value) || 0;
                    setShipmentConfig(prev => ({
                      ...prev,
                      [target]: { 화수목: val, 금토월: prev[target]?.['금토월'] || 0 },
                    }));
                  }}
                  className="w-20 text-center"
                />
              </td>
              <td className="px-4 py-2 text-center">
                <Input
                  type="number"
                  min="0"
                  value={shipmentConfig[target]?.['금토월'] || 0}
                  onChange={e => {
                    const val = parseInt(e.target.value) || 0;
                    setShipmentConfig(prev => ({
                      ...prev,
                      [target]: { 화수목: prev[target]?.['화수목'] || 0, 금토월: val },
                    }));
                  }}
                  className="w-20 text-center"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <p className="text-xs text-stone-400">
      * 설정한 출고량은 히스토리 탭의 &quot;생산수량&quot; 열에서 메뉴별 예상 생산량 계산에 사용됩니다.
    </p>
  </div>
);

export default ShipmentSection;
