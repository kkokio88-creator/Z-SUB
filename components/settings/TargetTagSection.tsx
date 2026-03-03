import React from 'react';
import { Tags, Plus, Trash2 } from 'lucide-react';
import { TargetType, TargetTagConfig } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface TargetTagSectionProps {
  selectedTagTarget: TargetType;
  setSelectedTagTarget: (v: TargetType) => void;
  newAllowedTag: string;
  setNewAllowedTag: (v: string) => void;
  newBlockedTag: string;
  setNewBlockedTag: (v: string) => void;
  newBlockedProduct: string;
  setNewBlockedProduct: (v: string) => void;
  getTagConfigForTarget: (target: TargetType) => TargetTagConfig;
  addAllowedTag: () => void;
  removeAllowedTag: (tag: string) => void;
  addBlockedTag: () => void;
  removeBlockedTag: (tag: string) => void;
  addBlockedProduct: () => void;
  removeBlockedProduct: (product: string) => void;
}

const TargetTagSection: React.FC<TargetTagSectionProps> = ({
  selectedTagTarget,
  setSelectedTagTarget,
  newAllowedTag,
  setNewAllowedTag,
  newBlockedTag,
  setNewBlockedTag,
  newBlockedProduct,
  setNewBlockedProduct,
  getTagConfigForTarget,
  addAllowedTag,
  removeAllowedTag,
  addBlockedTag,
  removeBlockedTag,
  addBlockedProduct,
  removeBlockedProduct,
}) => (
  <div className="space-y-6 max-w-3xl">
    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 flex gap-3 items-start">
      <Tags className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
      <div>
        <h4 className="font-bold text-indigo-900 text-sm">식단별 태그 관리</h4>
        <p className="text-xs text-indigo-700 mt-1">식단 유형별로 허용/차단 태그와 제외할 제품명을 설정합니다.</p>
      </div>
    </div>

    {/* 식단 선택 드롭다운 */}
    <div>
      <Label className="block mb-2 text-sm font-semibold text-stone-700">식단 유형 선택</Label>
      <select
        value={selectedTagTarget}
        onChange={e => setSelectedTagTarget(e.target.value as TargetType)}
        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
      >
        {Object.values(TargetType).map(target => (
          <option key={target} value={target}>
            {target}
          </option>
        ))}
      </select>
    </div>

    {/* 허용 태그 */}
    <Card>
      <CardContent className="p-4">
        <Label className="block mb-3 text-sm font-semibold text-green-700">허용 태그</Label>
        <div className="flex flex-wrap gap-2 mb-3">
          {getTagConfigForTarget(selectedTagTarget).allowedTags.length === 0 && (
            <span className="text-xs text-stone-400">설정된 허용 태그가 없습니다.</span>
          )}
          {getTagConfigForTarget(selectedTagTarget).allowedTags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium"
            >
              {tag}
              <button onClick={() => removeAllowedTag(tag)} className="hover:text-green-900">
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            type="text"
            value={newAllowedTag}
            onChange={e => setNewAllowedTag(e.target.value)}
            placeholder="새 허용 태그 입력"
            className="flex-1"
            onKeyDown={e => e.key === 'Enter' && addAllowedTag()}
          />
          <Button variant="outline" size="sm" onClick={addAllowedTag} className="shrink-0">
            <Plus className="w-4 h-4" /> 추가
          </Button>
        </div>
      </CardContent>
    </Card>

    {/* 차단 태그 */}
    <Card>
      <CardContent className="p-4">
        <Label className="block mb-3 text-sm font-semibold text-red-700">차단 태그</Label>
        <div className="flex flex-wrap gap-2 mb-3">
          {getTagConfigForTarget(selectedTagTarget).blockedTags.length === 0 && (
            <span className="text-xs text-stone-400">설정된 차단 태그가 없습니다.</span>
          )}
          {getTagConfigForTarget(selectedTagTarget).blockedTags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium"
            >
              {tag}
              <button onClick={() => removeBlockedTag(tag)} className="hover:text-red-900">
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            type="text"
            value={newBlockedTag}
            onChange={e => setNewBlockedTag(e.target.value)}
            placeholder="새 차단 태그 입력"
            className="flex-1"
            onKeyDown={e => e.key === 'Enter' && addBlockedTag()}
          />
          <Button variant="outline" size="sm" onClick={addBlockedTag} className="shrink-0">
            <Plus className="w-4 h-4" /> 추가
          </Button>
        </div>
      </CardContent>
    </Card>

    {/* 차단 제품명 */}
    <Card>
      <CardContent className="p-4">
        <Label className="block mb-3 text-sm font-semibold text-orange-700">차단 제품명</Label>
        <div className="flex flex-wrap gap-2 mb-3">
          {getTagConfigForTarget(selectedTagTarget).blockedProducts.length === 0 && (
            <span className="text-xs text-stone-400">설정된 차단 제품명이 없습니다.</span>
          )}
          {getTagConfigForTarget(selectedTagTarget).blockedProducts.map(product => (
            <span
              key={product}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium"
            >
              {product}
              <button onClick={() => removeBlockedProduct(product)} className="hover:text-orange-900">
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            type="text"
            value={newBlockedProduct}
            onChange={e => setNewBlockedProduct(e.target.value)}
            placeholder="예: 원더스푼"
            className="flex-1"
            onKeyDown={e => e.key === 'Enter' && addBlockedProduct()}
          />
          <Button variant="outline" size="sm" onClick={addBlockedProduct} className="shrink-0">
            <Plus className="w-4 h-4" /> 추가
          </Button>
        </div>
      </CardContent>
    </Card>

    <p className="text-xs text-stone-400">
      * 태그 설정은 AI 식단 생성 시 메뉴 필터링에 반영됩니다. 차단 제품명에 포함된 키워드가 있는 메뉴는 해당 식단에서
      제외됩니다.
    </p>
  </div>
);

export default TargetTagSection;
