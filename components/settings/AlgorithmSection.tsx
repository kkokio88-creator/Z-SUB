import React from 'react';
import { BrainCircuit } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface AlgorithmSectionProps {
  aiManual: string;
  setAiManual: (v: string) => void;
}

const AlgorithmSection: React.FC<AlgorithmSectionProps> = ({ aiManual, setAiManual }) => (
  <div className="space-y-6 max-w-4xl h-full flex flex-col">
    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 flex gap-3 items-start">
      <BrainCircuit className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
      <div>
        <h4 className="font-bold text-purple-900 text-sm">자연어 프롬프트 모드</h4>
        <p className="text-xs text-purple-700 mt-1">
          복잡한 수치 설정 대신, 영양사님께서 후임자에게 인수인계 하듯이 상세한 규칙을 글로 적어주세요. AI가 문맥을
          이해하고 반영합니다.
        </p>
      </div>
    </div>

    <div className="flex-1 flex flex-col">
      <Label className="block mb-2">식단 생성 가이드라인</Label>
      <textarea
        value={aiManual}
        onChange={e => setAiManual(e.target.value)}
        className="flex-1 w-full min-h-[400px] p-4 text-sm border-stone-300 rounded-xl focus:ring-purple-500 focus:border-purple-500 font-mono leading-relaxed resize-none bg-stone-50 focus:bg-white transition-colors"
        placeholder="예: 아이 식단에는 매운 재료(고춧가루, 청양고추)를 절대 사용하지 마세요..."
      />
      <p className="text-right text-xs text-stone-400 mt-2">{aiManual.length} 자</p>
    </div>
  </div>
);

export default AlgorithmSection;
