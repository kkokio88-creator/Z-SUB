import React from 'react';
import { BrainCircuit, CheckCircle, AlertCircle, RefreshCw, FileSpreadsheet, Server, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface IntegrationSectionProps {
  googleSheetUrl: string;
  setGoogleSheetUrl: (v: string) => void;
  misApiUrl: string;
  setMisApiUrl: (v: string) => void;
  zppsApiUrl: string;
  setZppsApiUrl: (v: string) => void;
  googleChatWebhookUrl: string;
  setGoogleChatWebhookUrl: (v: string) => void;
  testStatus: Record<string, 'idle' | 'loading' | 'success' | 'error'>;
  runConnectionTest: (target: string) => void;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'loading':
      return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
    case 'success':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    default:
      return <div className="w-2 h-2 rounded-full bg-stone-300"></div>;
  }
};

const IntegrationSection: React.FC<IntegrationSectionProps> = ({
  googleSheetUrl,
  setGoogleSheetUrl,
  misApiUrl,
  setMisApiUrl,
  zppsApiUrl,
  setZppsApiUrl,
  googleChatWebhookUrl,
  setGoogleChatWebhookUrl,
  testStatus,
  runConnectionTest,
}) => (
  <div className="space-y-8 max-w-3xl">
    {/* Gemini Status */}
    <Card>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BrainCircuit className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-bold text-stone-800">Google Gemini API</h4>
              <div className="text-xs text-stone-500">지능형 식단 생성 및 검수 엔진</div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => runConnectionTest('gemini')} className="text-xs">
            {getStatusIcon(testStatus.gemini)} 연결 테스트
          </Button>
        </div>
        <div className="bg-stone-50 p-3 rounded text-xs font-mono text-stone-600 flex justify-between">
          <span>API_KEY: ************************** (환경변수)</span>
          <span className="text-green-600 font-bold">활성</span>
        </div>
      </CardContent>
    </Card>

    {/* Google Sheets */}
    <Card>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-bold text-stone-800">구글 시트 (Google Sheets) 연동</h4>
              <div className="text-xs text-stone-500">식단 데이터 백업 및 실시간 공유</div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => runConnectionTest('sheets')} className="text-xs">
            {getStatusIcon(testStatus.sheets)} 연결 테스트
          </Button>
        </div>
        <div className="space-y-2">
          <Label>스프레드시트 주소 (URL)</Label>
          <Input
            type="text"
            value={googleSheetUrl}
            onChange={e => setGoogleSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
          />
        </div>
      </CardContent>
    </Card>

    {/* Legacy Systems (MIS & ZPPS) */}
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
      <CardContent className="p-5">
        <div className="mb-6">
          <h4 className="font-bold text-stone-800 flex items-center gap-2">
            <Server className="w-5 h-5 text-orange-500" /> 기간계 시스템 연동 (Legacy)
          </h4>
          <p className="text-xs text-stone-500 mt-1">MIS(경영정보) 및 ZPPS(생산관리) 시스템 연동 설정</p>
        </div>

        <div className="space-y-6">
          {/* MIS */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>MIS 식단 등록 API</Label>
              <Button
                variant="link"
                size="sm"
                onClick={() => runConnectionTest('mis')}
                className="text-[10px] underline text-blue-600 flex items-center gap-1 h-auto p-0"
              >
                {getStatusIcon(testStatus.mis)} 연결 테스트
              </Button>
            </div>
            <div className="flex gap-2">
              <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-stone-300 bg-stone-50 text-stone-500 text-xs">
                POST
              </span>
              <Input
                type="text"
                value={misApiUrl}
                onChange={e => setMisApiUrl(e.target.value)}
                className="flex-1 font-mono"
              />
            </div>
          </div>

          {/* ZPPS */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>ZPPS 변경/대체 연동 API</Label>
              <Button
                variant="link"
                size="sm"
                onClick={() => runConnectionTest('zpps')}
                className="text-[10px] underline text-blue-600 flex items-center gap-1 h-auto p-0"
              >
                {getStatusIcon(testStatus.zpps)} 연결 테스트
              </Button>
            </div>
            <div className="flex gap-2">
              <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-stone-300 bg-stone-50 text-stone-500 text-xs">
                PUT
              </span>
              <Input
                type="text"
                value={zppsApiUrl}
                onChange={e => setZppsApiUrl(e.target.value)}
                className="flex-1 font-mono"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-stone-100">
          <div className="flex items-center gap-2 text-xs text-orange-700 bg-orange-50 p-2 rounded">
            <Activity className="w-4 h-4" />
            <span>ZPPS 연동은 메뉴 교체(Swap) 발생 시에만 트리거됩니다.</span>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Google Chat Webhook */}
    <Card>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-stone-100 rounded-lg">
              <Activity className="w-5 h-5 text-stone-600" />
            </div>
            <div>
              <h4 className="font-bold text-stone-800">Google Chat 웹훅</h4>
              <div className="text-xs text-stone-500">식단 검토/확정 알림 전송</div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => runConnectionTest('googleChat')} className="text-xs">
            {getStatusIcon(testStatus.googleChat)} 테스트 전송
          </Button>
        </div>
        <div className="space-y-2">
          <Label>Google Chat 웹훅 URL</Label>
          <Input
            type="text"
            value={googleChatWebhookUrl}
            onChange={e => setGoogleChatWebhookUrl(e.target.value)}
            placeholder="https://chat.googleapis.com/v1/spaces/.../messages?key=..."
            className="font-mono text-xs"
          />
          <p className="text-xs text-stone-400">
            * Google Chat 스페이스에서 웹훅 URL을 복사하여 입력하세요. 설정 저장 후 테스트 전송으로 확인할 수 있습니다.
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default IntegrationSection;
