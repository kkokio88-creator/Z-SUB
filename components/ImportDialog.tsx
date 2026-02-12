import React, { useState, useCallback } from 'react';
import { X, Upload, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { parseCSV, executeImport, mapRowToMenuItem, type ColumnMapping } from '../services/importService';
import type { MenuItem } from '../types';

interface Props {
  existingItems: MenuItem[];
  onImport: (items: Partial<MenuItem>[]) => void;
  onClose: () => void;
}

type Step = 'upload' | 'mapping' | 'preview' | 'result';

const FIELD_OPTIONS: { value: keyof MenuItem | ''; label: string }[] = [
  { value: '', label: '(매핑 안 함)' },
  { value: 'name', label: '메뉴명' },
  { value: 'category', label: '분류' },
  { value: 'cost', label: '원가' },
  { value: 'recommendedPrice', label: '권장 판매가' },
  { value: 'mainIngredient', label: '주재료' },
  { value: 'tags', label: '태그 (쉼표 구분)' },
  { value: 'tastes', label: '맛 프로필 (쉼표 구분)' },
  { value: 'season', label: '시즌' },
  { value: 'isSpicy', label: '매운맛 여부' },
  { value: 'code', label: '품목코드' },
  { value: 'weight', label: '용량(g)' },
];

function autoDetectField(header: string): keyof MenuItem | '' {
  const h = header.toLowerCase().trim();
  const map: Record<string, keyof MenuItem> = {
    name: 'name',
    이름: 'name',
    메뉴명: 'name',
    category: 'category',
    분류: 'category',
    cost: 'cost',
    원가: 'cost',
    price: 'recommendedPrice',
    판매가: 'recommendedPrice',
    ingredient: 'mainIngredient',
    주재료: 'mainIngredient',
    tags: 'tags',
    태그: 'tags',
    code: 'code',
    품목코드: 'code',
    weight: 'weight',
    중량: 'weight',
    season: 'season',
    시즌: 'season',
  };
  return map[h] || '';
}

const ImportDialog: React.FC<Props> = ({ existingItems, onImport, onClose }) => {
  const [step, setStep] = useState<Step>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      const parsed = parseCSV(text);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setMappings(
        parsed.headers.map(col => ({
          csvColumn: col,
          fieldName: autoDetectField(col),
        }))
      );
      setStep('mapping');
    };
    reader.readAsText(file);
  }, []);

  const handleMapping = (idx: number, field: keyof MenuItem | '') => {
    setMappings(prev => prev.map((m, i) => (i === idx ? { ...m, fieldName: field } : m)));
  };

  const handleExecute = () => {
    const existingIds = new Set(existingItems.map(item => item.id));
    const r = executeImport(rows, headers, mappings, existingIds);
    setResult(r);
    const items = rows.map(row => mapRowToMenuItem(row, headers, mappings)).filter(item => item.name);
    onImport(items);
    setStep('result');
  };

  const stepLabels = ['파일 선택', '컬럼 매핑', '미리보기', '결과'];
  const allSteps: Step[] = ['upload', 'mapping', 'preview', 'result'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">CSV 가져오기</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-4 flex items-center gap-2 text-xs font-medium">
          {allSteps.map((s, i) => (
            <React.Fragment key={s}>
              <span className={`px-2 py-1 rounded ${step === s ? 'bg-gray-900 text-white' : 'text-gray-400'}`}>
                {stepLabels[i]}
              </span>
              {i < 3 && <ArrowRight className="w-3 h-3 text-gray-300" />}
            </React.Fragment>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Upload className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-sm text-gray-600 mb-4">CSV 파일을 선택해주세요</p>
              <input type="file" accept=".csv" onChange={handleFileSelect} className="text-sm" />
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                각 CSV 컬럼을 메뉴 필드에 매핑해주세요. ({rows.length}행 감지됨)
              </p>
              {mappings.map((m, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-40 text-sm font-mono bg-gray-50 px-3 py-2 rounded truncate">{m.csvColumn}</span>
                  <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <select
                    value={m.fieldName}
                    onChange={e => handleMapping(i, e.target.value as keyof MenuItem | '')}
                    className="flex-1 text-sm border-gray-200 rounded-lg"
                  >
                    {FIELD_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <button
                onClick={() => setStep('preview')}
                disabled={!mappings.some(m => m.fieldName === 'name')}
                className="mt-4 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg disabled:opacity-40 hover:bg-gray-800"
              >
                다음: 미리보기
              </button>
            </div>
          )}

          {step === 'preview' && (
            <div>
              <p className="text-sm text-gray-600 mb-3">총 {rows.length}행 (처음 5행 미리보기)</p>
              <div className="overflow-auto max-h-64 border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      {mappings
                        .filter(m => m.fieldName)
                        .map(m => (
                          <th key={m.csvColumn} className="px-3 py-2 text-left font-bold text-gray-600">
                            {FIELD_OPTIONS.find(o => o.value === m.fieldName)?.label}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((row, ri) => (
                      <tr key={ri} className="border-t border-gray-100">
                        {mappings
                          .filter(m => m.fieldName)
                          .map(m => {
                            const ci = headers.indexOf(m.csvColumn);
                            return (
                              <td key={m.csvColumn} className="px-3 py-2 text-gray-700">
                                {row[ci] || '-'}
                              </td>
                            );
                          })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 5 && <p className="text-xs text-gray-400 mt-2">...외 {rows.length - 5}행</p>}
              <button
                onClick={handleExecute}
                className="mt-4 px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700"
              >
                가져오기 실행
              </button>
            </div>
          )}

          {step === 'result' && result && (
            <div className="text-center py-8">
              {result.errors.length === 0 ? (
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              ) : (
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              )}
              <h4 className="text-lg font-bold text-gray-800">가져오기 완료</h4>
              <p className="text-sm text-gray-600 mt-2">
                {result.imported}건 가져옴 / {result.skipped}건 건너뜀
              </p>
              {result.errors.length > 0 && (
                <div className="mt-4 text-left bg-amber-50 p-4 rounded-lg max-h-32 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-amber-700">
                      {err}
                    </p>
                  ))}
                </div>
              )}
              <button onClick={onClose} className="mt-6 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg">
                닫기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportDialog;
