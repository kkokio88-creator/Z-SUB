import React, { useState, useEffect } from 'react';
import {
  Save,
  BrainCircuit,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
  Server,
  Activity,
  Settings,
} from 'lucide-react';
import PlanManagement from './PlanManagement';
import { useToast } from '../context/ToastContext';
import { checkSheetsConnection } from '../services/sheetsService';
import { checkMISHealth } from '../services/misService';
import { checkZPPSHealth } from '../services/zppsService';

const SystemSettings: React.FC = () => {
  const { addToast } = useToast();
  const [activeSection, setActiveSection] = useState<'algorithm' | 'integration' | 'policy'>('algorithm');

  // AI Algorithm State
  const [aiManual, setAiManual] = useState('');

  // Integration State
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [misApiUrl, setMisApiUrl] = useState('https://api.z-sub.com/v1/mis/sync');
  const [zppsApiUrl, setZppsApiUrl] = useState('https://api.z-sub.com/v1/zpps/update');

  // Connection Test States
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({
    gemini: 'idle',
    sheets: 'idle',
    mis: 'idle',
    zpps: 'idle',
  });

  // Load settings on mount
  useEffect(() => {
    const savedManual = localStorage.getItem('zsub_ai_manual');
    const savedSheet = localStorage.getItem('zsub_sheet_url');

    if (savedManual) setAiManual(savedManual);
    else {
      setAiManual(`[기본 원칙]
1. 제철 식재료를 최소 2회 이상 포함할 것.
2. 튀김류는 주 1회를 초과하지 말 것.
3. 붉은색(매운맛), 초록색(나물), 노란색(계란/튀김)의 색감 조화를 고려할 것.

[아이 식단 특이사항]
- 생선 가시는 100% 제거된 순살만 사용.
- 파, 마늘 입자는 최대한 작게 다져서 조리.
- 매운맛은 전면 배제하되, 간장 베이스로 대체.`);
    }

    if (savedSheet) setGoogleSheetUrl(savedSheet);
  }, []);

  const handleSave = () => {
    localStorage.setItem('zsub_ai_manual', aiManual);
    localStorage.setItem('zsub_sheet_url', googleSheetUrl);
    localStorage.setItem('zsub_mis_url', misApiUrl);
    localStorage.setItem('zsub_zpps_url', zppsApiUrl);

    addToast({
      type: 'success',
      title: '설정 저장 완료',
      message: '시스템 설정이 저장되었습니다. 모든 설정은 로그아웃 후에도 유지됩니다.',
    });
  };

  const runConnectionTest = async (target: string) => {
    setTestStatus(prev => ({ ...prev, [target]: 'loading' }));

    try {
      let result: { connected: boolean; message: string };

      switch (target) {
        case 'gemini': {
          const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
          if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
            result = { connected: false, message: 'Gemini API 키가 설정되지 않았습니다.' };
          } else {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
              signal: AbortSignal.timeout(5000),
            });
            result = res.ok
              ? { connected: true, message: 'Gemini API 연결 성공' }
              : { connected: false, message: `Gemini API 오류: ${res.status}` };
          }
          break;
        }
        case 'sheets':
          result = await checkSheetsConnection();
          break;
        case 'mis':
          result = await checkMISHealth(misApiUrl);
          break;
        case 'zpps':
          result = await checkZPPSHealth(zppsApiUrl);
          break;
        default:
          result = { connected: false, message: '알 수 없는 대상' };
      }

      setTestStatus(prev => ({ ...prev, [target]: result.connected ? 'success' : 'error' }));
      addToast({
        type: result.connected ? 'success' : 'error',
        title: `${target.toUpperCase()} 연결 테스트`,
        message: result.message,
      });
    } catch {
      setTestStatus(prev => ({ ...prev, [target]: 'error' }));
      addToast({
        type: 'error',
        title: `${target.toUpperCase()} 연결 실패`,
        message: '네트워크 오류 또는 시간 초과',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading':
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-2 h-2 rounded-full bg-gray-300"></div>;
    }
  };

  return (
    <div className="flex h-full gap-6">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
        <div className="p-5 border-b border-gray-100 bg-gray-50">
          <h3 className="font-bold text-gray-800">시스템 설정</h3>
          <p className="text-xs text-gray-500 mt-1">AI 튜닝 및 외부 시스템 연동</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          <button
            onClick={() => setActiveSection('algorithm')}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${activeSection === 'algorithm' ? 'bg-purple-50 text-purple-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <BrainCircuit className="w-4 h-4" /> AI 구성 매뉴얼
          </button>
          <button
            onClick={() => setActiveSection('integration')}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${activeSection === 'integration' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Server className="w-4 h-4" /> 시스템 연동 (API)
          </button>
          <button
            onClick={() => setActiveSection('policy')}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${activeSection === 'policy' ? 'bg-green-50 text-green-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Settings className="w-4 h-4" /> 식단 정책
          </button>
        </nav>
        <div className="p-4 border-t border-gray-100 text-center">
          <div className="text-[10px] text-gray-400">Z-SUB System v2.5.0</div>
          <div className="text-[10px] text-gray-300 mt-1">설정값 유지됨</div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {activeSection === 'algorithm' && 'AI 식단 구성 매뉴얼'}
              {activeSection === 'integration' && '외부 시스템 및 데이터 연동'}
              {activeSection === 'policy' && '식단 정책 및 구성 설정'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {activeSection === 'algorithm' && 'AI가 식단을 생성할 때 반드시 준수해야 할 자연어 규칙을 설정합니다.'}
              {activeSection === 'integration' && 'MIS, ZPPS 및 구글 시트와의 실시간 데이터 동기화 상태를 관리합니다.'}
              {activeSection === 'policy' &&
                '기본 식단과 파생된 옵션 상품을 그룹별로 관리하고, 원가율 정책을 수립합니다.'}
            </p>
          </div>
          {activeSection !== 'policy' && (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-black transition-all shadow-md active:scale-95"
            >
              <Save className="w-4 h-4" /> 설정 저장
            </button>
          )}
        </div>

        <div className={`flex-1 overflow-y-auto ${activeSection === 'policy' ? 'p-0' : 'p-8'}`}>
          {/* 1. Algorithm Section */}
          {activeSection === 'algorithm' && (
            <div className="space-y-6 max-w-4xl h-full flex flex-col">
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 flex gap-3 items-start">
                <BrainCircuit className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-purple-900 text-sm">자연어 프롬프트 모드</h4>
                  <p className="text-xs text-purple-700 mt-1">
                    복잡한 수치 설정 대신, 영양사님께서 후임자에게 인수인계 하듯이 상세한 규칙을 글로 적어주세요. AI가
                    문맥을 이해하고 반영합니다.
                  </p>
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                <label className="block text-sm font-bold text-gray-700 mb-2">식단 생성 가이드라인</label>
                <textarea
                  value={aiManual}
                  onChange={e => setAiManual(e.target.value)}
                  className="flex-1 w-full p-4 text-sm border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500 font-mono leading-relaxed resize-none bg-gray-50 focus:bg-white transition-colors"
                  placeholder="예: 아이 식단에는 매운 재료(고춧가루, 청양고추)를 절대 사용하지 마세요..."
                />
                <p className="text-right text-xs text-gray-400 mt-2">{aiManual.length} 자</p>
              </div>
            </div>
          )}

          {/* 2. Policy Section */}
          {activeSection === 'policy' && <PlanManagement />}

          {/* 3. Integration Section */}
          {activeSection === 'integration' && (
            <div className="space-y-8 max-w-3xl">
              {/* Gemini Status */}
              <div className="p-5 border border-gray-200 rounded-xl bg-white shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <BrainCircuit className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">Google Gemini API</h4>
                      <div className="text-xs text-gray-500">지능형 식단 생성 및 검수 엔진</div>
                    </div>
                  </div>
                  <button
                    onClick={() => runConnectionTest('gemini')}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded font-bold text-gray-600 flex items-center gap-1"
                  >
                    {getStatusIcon(testStatus.gemini)} 연결 테스트
                  </button>
                </div>
                <div className="bg-gray-50 p-3 rounded text-xs font-mono text-gray-600 flex justify-between">
                  <span>API_KEY: ************************** (환경변수)</span>
                  <span className="text-green-600 font-bold">활성</span>
                </div>
              </div>

              {/* Google Sheets */}
              <div className="p-5 border border-gray-200 rounded-xl bg-white shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">구글 시트 (Google Sheets) 연동</h4>
                      <div className="text-xs text-gray-500">식단 데이터 백업 및 실시간 공유</div>
                    </div>
                  </div>
                  <button
                    onClick={() => runConnectionTest('sheets')}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded font-bold text-gray-600 flex items-center gap-1"
                  >
                    {getStatusIcon(testStatus.sheets)} 연결 테스트
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">스프레드시트 주소 (URL)</label>
                  <input
                    type="text"
                    value={googleSheetUrl}
                    onChange={e => setGoogleSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full text-sm border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Legacy Systems (MIS & ZPPS) */}
              <div className="p-5 border border-gray-200 rounded-xl bg-white shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
                <div className="mb-6">
                  <h4 className="font-bold text-gray-800 flex items-center gap-2">
                    <Server className="w-5 h-5 text-orange-500" /> 기간계 시스템 연동 (Legacy)
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">MIS(경영정보) 및 ZPPS(생산관리) 시스템 연동 설정</p>
                </div>

                <div className="space-y-6">
                  {/* MIS */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-gray-700">MIS 식단 등록 API</label>
                      <button
                        onClick={() => runConnectionTest('mis')}
                        className="text-[10px] underline text-blue-600 flex items-center gap-1"
                      >
                        {getStatusIcon(testStatus.mis)} 연결 테스트
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-xs">
                        POST
                      </span>
                      <input
                        type="text"
                        value={misApiUrl}
                        onChange={e => setMisApiUrl(e.target.value)}
                        className="flex-1 text-sm border-gray-300 rounded-r-lg font-mono text-gray-600"
                      />
                    </div>
                  </div>

                  {/* ZPPS */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-gray-700">ZPPS 변경/대체 연동 API</label>
                      <button
                        onClick={() => runConnectionTest('zpps')}
                        className="text-[10px] underline text-blue-600 flex items-center gap-1"
                      >
                        {getStatusIcon(testStatus.zpps)} 연결 테스트
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-xs">
                        PUT
                      </span>
                      <input
                        type="text"
                        value={zppsApiUrl}
                        onChange={e => setZppsApiUrl(e.target.value)}
                        className="flex-1 text-sm border-gray-300 rounded-r-lg font-mono text-gray-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs text-orange-700 bg-orange-50 p-2 rounded">
                    <Activity className="w-4 h-4" />
                    <span>ZPPS 연동은 메뉴 교체(Swap) 발생 시에만 트리거됩니다.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
