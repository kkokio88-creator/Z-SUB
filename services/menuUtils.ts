// 메뉴명 정규화: 냉장/반조리/냉동 태그 + 후미 숫자 제거
export const normalizeMenuName = (name: string): string =>
  name
    .replace(/_냉장|_반조리|_냉동/g, '')
    .replace(/\s+\d+$/, '')
    .trim();

// 공정 접미사만 제거 (후미 숫자는 보존 — 수량 추출 등에 사용)
export const stripProcessSuffix = (name: string): string => name.replace(/_냉장|_반조리|_냉동/g, '').trim();
