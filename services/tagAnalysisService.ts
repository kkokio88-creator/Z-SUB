// 태그 분석 서비스 - 히스토리 학습, 유사 메뉴 클러스터링, 갭 분석
import { MenuItem, MenuCategory, HistoricalMealPlan, TargetType } from '../types';
import { KOREAN_BANCHAN_REFERENCE, BanchanReference } from '../constants';
import { isSimilarMenu } from './engine';

// ── 타입 정의 ──

export interface TagSuggestion {
  menuId: string;
  menuName: string;
  category: MenuCategory;
  suggestedTag: '아이선호' | '시니어';
  usageCount: number;
  usedInTargets: string[];
}

export interface MenuCluster {
  representative: string;
  members: { id: string; name: string; category: MenuCategory }[];
  category: MenuCategory;
}

export interface BanchanGap {
  reference: BanchanReference;
  hasMatch: boolean;
  matchedMenus: string[];
}

export interface TagGapByCategory {
  category: MenuCategory;
  totalActive: number;
  kidTagged: number;
  seniorTagged: number;
  kidRate: number;
  seniorRate: number;
  kidStatus: 'ok' | 'warn' | 'danger';
  seniorStatus: 'ok' | 'warn' | 'danger';
}

// ── KID / SENIOR 타겟 목록 ──

const KID_TARGETS = new Set<string>([
  TargetType.KIDS,
  TargetType.KIDS_PLUS,
  TargetType.TODDLER,
  TargetType.TODDLER_PLUS,
  TargetType.CHILD,
  TargetType.CHILD_PLUS,
]);

const SENIOR_TARGETS = new Set<string>([TargetType.SENIOR, TargetType.SENIOR_HEALTH]);

// ── 1. 히스토리 분석 → 태그 추천 ──

export function analyzeHistoryForTags(plans: HistoricalMealPlan[], menuItems: MenuItem[]): TagSuggestion[] {
  // 메뉴명 → { tag, count, targets } 맵
  const kidUsage = new Map<string, { count: number; targets: Set<string> }>();
  const seniorUsage = new Map<string, { count: number; targets: Set<string> }>();

  for (const plan of plans) {
    for (const target of plan.targets) {
      const isKidTarget = KID_TARGETS.has(target.targetType);
      const isSeniorTarget = SENIOR_TARGETS.has(target.targetType);
      if (!isKidTarget && !isSeniorTarget) continue;

      for (const item of target.items) {
        const name = item.name
          .replace(/_냉장|_반조리|_냉동/g, '')
          .replace(/\s+\d+$/, '')
          .trim();
        if (!name) continue;

        const map = isKidTarget ? kidUsage : seniorUsage;
        const entry = map.get(name) || { count: 0, targets: new Set<string>() };
        entry.count++;
        entry.targets.add(target.targetType);
        map.set(name, entry);
      }
    }
  }

  const suggestions: TagSuggestion[] = [];
  const menuByName = new Map<string, MenuItem>();
  for (const mi of menuItems) {
    if (!mi.isUnused) menuByName.set(mi.name, mi);
  }

  // 아이선호 태그 추천: 히스토리 2회+ 사용 & 현재 태그 없음
  for (const [name, usage] of kidUsage) {
    if (usage.count < 2) continue;
    const mi = menuByName.get(name);
    if (!mi || mi.tags.includes('아이선호')) continue;
    suggestions.push({
      menuId: mi.id,
      menuName: mi.name,
      category: mi.category,
      suggestedTag: '아이선호',
      usageCount: usage.count,
      usedInTargets: Array.from(usage.targets),
    });
  }

  // 시니어 태그 추천
  for (const [name, usage] of seniorUsage) {
    if (usage.count < 2) continue;
    const mi = menuByName.get(name);
    if (!mi || mi.tags.includes('시니어')) continue;
    suggestions.push({
      menuId: mi.id,
      menuName: mi.name,
      category: mi.category,
      suggestedTag: '시니어',
      usageCount: usage.count,
      usedInTargets: Array.from(usage.targets),
    });
  }

  return suggestions.sort((a, b) => b.usageCount - a.usageCount);
}

// ── 2. 유사 메뉴 클러스터링 ──

export function buildSimilarMenuClusters(menuItems: MenuItem[]): MenuCluster[] {
  const active = menuItems.filter(m => !m.isUnused);
  const visited = new Set<string>();
  const clusters: MenuCluster[] = [];

  for (const item of active) {
    if (visited.has(item.id)) continue;

    const members: MenuCluster['members'] = [{ id: item.id, name: item.name, category: item.category }];
    visited.add(item.id);

    for (const other of active) {
      if (visited.has(other.id)) continue;
      if (isSimilarMenu(item.name, other.name)) {
        members.push({ id: other.id, name: other.name, category: other.category });
        visited.add(other.id);
      }
    }

    if (members.length >= 2) {
      // 대표명: 가장 짧은 이름
      const representative = members.reduce(
        (shortest, m) => (m.name.length < shortest.length ? m.name : shortest),
        members[0].name
      );
      clusters.push({ representative, members, category: item.category });
    }
  }

  return clusters.sort((a, b) => b.members.length - a.members.length);
}

// ── 3. 한식 반찬 갭 분석 ──

export function analyzeKoreanBanchanGap(menuItems: MenuItem[]): BanchanGap[] {
  const active = menuItems.filter(m => !m.isUnused);

  return KOREAN_BANCHAN_REFERENCE.map(ref => {
    const matchedMenus: string[] = [];
    for (const mi of active) {
      const normalized = mi.name.replace(/\s+/g, '');
      if (ref.keywords.some(kw => normalized.includes(kw))) {
        matchedMenus.push(mi.name);
      }
    }
    return { reference: ref, hasMatch: matchedMenus.length > 0, matchedMenus };
  });
}

// ── 4. 카테고리별 태깅률 분석 ──

function rateStatus(rate: number): 'ok' | 'warn' | 'danger' {
  if (rate >= 30) return 'ok';
  if (rate >= 15) return 'warn';
  return 'danger';
}

export function analyzeTagGapByCategory(menuItems: MenuItem[]): TagGapByCategory[] {
  const active = menuItems.filter(m => !m.isUnused);
  const categories = Object.values(MenuCategory);

  return categories.map(cat => {
    const inCat = active.filter(m => m.category === cat);
    const totalActive = inCat.length;
    const kidTagged = inCat.filter(m => m.tags.includes('아이선호')).length;
    const seniorTagged = inCat.filter(m => m.tags.includes('시니어')).length;
    const kidRate = totalActive > 0 ? Math.round((kidTagged / totalActive) * 100) : 0;
    const seniorRate = totalActive > 0 ? Math.round((seniorTagged / totalActive) * 100) : 0;

    return {
      category: cat,
      totalActive,
      kidTagged,
      seniorTagged,
      kidRate,
      seniorRate,
      kidStatus: rateStatus(kidRate),
      seniorStatus: rateStatus(seniorRate),
    };
  });
}
