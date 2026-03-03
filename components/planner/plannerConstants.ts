// ── 식재료별 컬러 맵 ──
export const PLANNER_INGREDIENT_COLORS: Record<string, { text: string; label: string }> = {
  beef: { text: 'text-red-700', label: '소고기' },
  pork: { text: 'text-pink-700', label: '한돈' },
  chicken: { text: 'text-amber-700', label: '닭' },
  fish: { text: 'text-blue-700', label: '생선' },
  tofu: { text: 'text-yellow-700', label: '두부' },
  egg: { text: 'text-orange-700', label: '달걀' },
  vegetable: { text: 'text-green-700', label: '채소' },
};
export const DEFAULT_INGREDIENT_COLOR = {
  text: 'text-stone-600',
  label: '기타',
};

// 식단 배송 날짜 계산: 해당 월의 N번째 주 월요일 기준
export const getDeliveryDate = (year: number, month: number, weekIndex: number): Date => {
  // 해당 월 1일
  const firstDay = new Date(year, month - 1, 1);
  // 첫째 주 월요일 (1일이 속한 주의 월요일)
  const dayOfWeek = firstDay.getDay(); // 0=일 ~ 6=토
  const daysToMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
  const firstMonday = new Date(year, month - 1, 1 + daysToMonday);
  // weekIndex번째 주 (1-based)
  const deliveryDate = new Date(firstMonday);
  deliveryDate.setDate(firstMonday.getDate() + (weekIndex - 1) * 7);
  return deliveryDate;
};

// 식단 배송일 기준 경과일 계산 + 라벨 생성
export const calcDaysGap = (
  lastUsedDate: string,
  deliveryDate: Date
): { days: number; label: string; dateStr: string } => {
  const used = new Date(lastUsedDate);
  used.setHours(0, 0, 0, 0);
  const delivery = new Date(deliveryDate);
  delivery.setHours(0, 0, 0, 0);
  const days = Math.max(0, Math.floor((delivery.getTime() - used.getTime()) / 86400000));
  const label = days < 7 ? `${days}일` : days < 60 ? `${Math.floor(days / 7)}주` : `${Math.floor(days / 30)}개월`;
  return { days, label, dateStr: lastUsedDate };
};
