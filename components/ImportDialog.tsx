import React, { useState, useCallback } from 'react';
import { X, Upload, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { parseCSV, executeImport, type ColumnMapping } from '../services/importService';
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
