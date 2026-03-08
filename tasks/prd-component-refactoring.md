# PRD: Build Fix & Large Component Refactoring

## Introduction

Z-SUB의 4개 대형 컴포넌트(MealPlanHistory 2,136줄, MealPlanner 1,262줄, SystemSettings 1,234줄, MenuDatabase 1,142줄)를 500줄 이하 단위로 분리하고, 빌드 차단 TypeScript 에러를 수정한다. 성능 최적화(useMemo/useCallback)와 간단한 UX 개선도 포함하며, 추출된 커스텀 훅에 대한 단위 테스트를 추가한다.

## Goals

- Dashboard.tsx TypeScript 빌드 에러 수정 (P0 blocker)
- 4개 대형 컴포넌트를 각각 500줄 이하 파일들로 분리
- 서브컴포넌트 + 커스텀 훅 패턴으로 관심사 분리
- useMemo/useCallback 최적화로 불필요한 리렌더링 제거
- 추출된 커스텀 훅에 대한 단위 테스트 추가
- 기존 98개 단위 테스트 + 13개 E2E 테스트 전부 통과 유지

## User Stories

### US-001: Dashboard TypeScript 빌드 에러 수정

**Description:** As a developer, I want the build to succeed so that CI/CD pipeline and deployment work correctly.

**Acceptance Criteria:**

- [ ] Dashboard.tsx:690의 Recharts BarChart onClick 핸들러 타입을 올바르게 수정
- [ ] `npx tsc --noEmit` 에러 0개
- [ ] `npx vite build` 성공
- [ ] `npx vitest run` 98개 전부 통과

### US-002: MealPlanHistory 인라인 서브컴포넌트를 별도 파일로 추출

**Description:** As a developer, I want MealPlanHistory's 6 inline components extracted to separate files so that each file has a single responsibility.

**Details:**
현재 MealPlanHistory.tsx에는 다음 인라인 컴포넌트들이 정의되어 있다 (줄 253~724):

- `MenuItemRow` (줄 253) → `components/history/MenuItemRow.tsx`
- `MergedTableCell` (줄 358) → `components/history/MergedTableCell.tsx`
- `TableCell` (줄 436) → `components/history/TableCell.tsx`
- `SwapModal` (줄 494) → `components/history/SwapModal.tsx`
- `ActionModal` (줄 593) → `components/history/ActionModal.tsx`
- `CommentModal` (줄 634) → `components/history/CommentModal.tsx`

공유 상수/유틸(TARGET_COLORS, INGREDIENT_COLORS, detectIngredient, parseMenuItem 등)은 `components/history/historyConstants.ts`로 추출한다.

**Acceptance Criteria:**

- [ ] 6개 인라인 컴포넌트가 `components/history/` 폴더 내 개별 파일로 추출됨
- [ ] 공유 상수/유틸이 `components/history/historyConstants.ts`로 분리됨
- [ ] MealPlanHistory.tsx 본체가 줄 727 이후의 메인 로직만 포함 (대폭 축소)
- [ ] 모든 import 경로가 정확하며 순환 참조 없음
- [ ] `npx tsc --noEmit` 에러 0개
- [ ] `npx vite build` 성공
- [ ] `npx vitest run` 전부 통과
- [ ] 기존 UI 동작 변경 없음

### US-003: MealPlanHistory 메인 컴포넌트 커스텀 훅 추출

**Description:** As a developer, I want MealPlanHistory's complex state logic extracted into custom hooks so that the main component focuses on rendering only.

**Details:**
메인 컴포넌트(줄 727~2136, 약 1,400줄)에서 다음 훅을 추출한다:

- `useHistoryNavigation` → 연/월 네비게이션, 날짜 필터링 로직 (viewYear, viewMonth 상태 등)
- `useHistoryReview` → 리뷰 상태, 필터, 코멘트 관리 (reviewFilter, reviewStatusMap, selectedReview 등)
- `useHistoryEdit` → 편집/삭제/교체 상태 관리 (editedPlans, deleteConfirm, swap 관련 상태)

각 훅은 `hooks/` 폴더에 생성한다.

**Acceptance Criteria:**

- [ ] 3개 커스텀 훅이 `hooks/useHistoryNavigation.ts`, `hooks/useHistoryReview.ts`, `hooks/useHistoryEdit.ts`로 추출됨
- [ ] MealPlanHistory.tsx 메인 컴포넌트가 500줄 이하
- [ ] 각 훅 파일이 300줄 이하
- [ ] `npx tsc --noEmit` 에러 0개
- [ ] `npx vite build` 성공
- [ ] `npx vitest run` 전부 통과

### US-004: MealPlanner 서브컴포넌트 및 훅 추출

**Description:** As a developer, I want MealPlanner split into focused sub-components and hooks so that each piece is independently testable and maintainable.

**Details:**
MealPlanner.tsx (1,262줄, 단일 컴포넌트)를 분리:

- 상단 유틸(PLANNER_INGREDIENT_COLORS, getDeliveryDate, calcDaysGap) → `components/planner/plannerConstants.ts`
- 식단 생성 폼 UI → `components/planner/GenerationPanel.tsx`
- 식단 표시 테이블/카드 → `components/planner/PlanDisplay.tsx`
- 메뉴 교체 모달 → `components/planner/PlanSwapModal.tsx`
- 생성 로직 훅 → `hooks/usePlanGeneration.ts` (generateMonthlyMealPlan 호출, 파라미터 관리, 결과 상태)
- 식단 상태 관리 훅 → `hooks/usePlanState.ts` (수정, 저장, 임시 스냅샷)

**Acceptance Criteria:**

- [ ] MealPlanner.tsx가 500줄 이하로 축소 (서브컴포넌트 조합만)
- [ ] 3개 서브컴포넌트 + 1개 상수파일이 `components/planner/`에 생성됨
- [ ] 2개 커스텀 훅이 `hooks/`에 생성됨
- [ ] 각 파일이 500줄 이하
- [ ] useMemo로 식단 생성 결과 메모이제이션 적용
- [ ] `npx tsc --noEmit` 에러 0개
- [ ] `npx vite build` 성공
- [ ] `npx vitest run` 전부 통과

### US-005: SystemSettings 섹션별 서브컴포넌트 추출

**Description:** As a developer, I want SystemSettings' 7 sections extracted into individual components so that each setting panel is independently editable.

**Details:**
SystemSettings.tsx (1,234줄)의 7개 activeSection 탭:

- `algorithm` → `components/settings/AlgorithmSection.tsx`
- `integration` → `components/settings/IntegrationSection.tsx`
- `policy` → `components/settings/PolicySection.tsx`
- `shipment` → `components/settings/ShipmentSection.tsx`
- `ingredient` → `components/settings/IngredientColorSection.tsx`
- `production` → `components/settings/ProductionLimitSection.tsx`
- `tags` → `components/settings/TargetTagSection.tsx`

각 섹션의 useState를 해당 서브컴포넌트로 이동하고, 공유 저장 로직은 `hooks/useSettingsState.ts`로 추출한다.

**Acceptance Criteria:**

- [ ] SystemSettings.tsx가 500줄 이하 (탭 네비게이션 + 섹션 라우팅만)
- [ ] 7개 섹션 컴포넌트가 `components/settings/`에 생성됨
- [ ] 각 섹션 파일이 300줄 이하
- [ ] `hooks/useSettingsState.ts`로 공유 저장/상태 로직 추출됨
- [ ] `npx tsc --noEmit` 에러 0개
- [ ] `npx vite build` 성공
- [ ] `npx vitest run` 전부 통과

### US-006: MenuDatabase 훅 추출 및 컴포넌트 분리

**Description:** As a developer, I want MenuDatabase's filtering/sorting/pagination logic extracted into hooks and toolbar extracted as a sub-component.

**Details:**
MenuDatabase.tsx (1,142줄)에서:

- 필터/정렬/페이지네이션 로직 → `hooks/useMenuFilters.ts` (filterCategory, searchTerm, sortField, page 등 15개+ useState)
- 상단 필터 바 UI → `components/menu/MenuToolbar.tsx`
- 테이블 행 + 인라인 편집 → `components/menu/MenuRow.tsx`
- 통계 카드 → `components/menu/MenuStats.tsx`
- 상수(INGREDIENT_LABELS, PAGE_SIZE) → `components/menu/menuConstants.ts`

**Acceptance Criteria:**

- [ ] MenuDatabase.tsx가 500줄 이하
- [ ] `hooks/useMenuFilters.ts`로 필터/정렬/페이지네이션 로직 추출됨
- [ ] 3개 서브컴포넌트 + 상수파일이 `components/menu/`에 생성됨
- [ ] useMemo로 filteredItems, sortedItems, stats 메모이제이션 유지
- [ ] `npx tsc --noEmit` 에러 0개
- [ ] `npx vite build` 성공
- [ ] `npx vitest run` 전부 통과

### US-007: 성능 최적화 (useMemo / useCallback 점검)

**Description:** As a developer, I want unnecessary re-renders eliminated by applying proper memoization across refactored components.

**Acceptance Criteria:**

- [ ] MealPlanner: 식단 생성 결과를 useMemo로 캐싱 (의존성: menuItems, 생성 파라미터)
- [ ] MealPlanHistory: filteredPlans, 리뷰 맵 계산을 useMemo로 메모이제이션
- [ ] MenuDatabase: filteredItems/sortedItems/stats가 useMemo 유지 (이미 적용된 것 확인)
- [ ] 이벤트 핸들러에 useCallback 적용 (자식 컴포넌트에 props로 전달되는 함수들)
- [ ] React.memo로 순수 서브컴포넌트 래핑 (MenuItemRow, MenuRow 등)
- [ ] `npx vite build` 성공
- [ ] `npx vitest run` 전부 통과

### US-008: 추출된 커스텀 훅 단위 테스트 추가

**Description:** As a developer, I want unit tests for all extracted custom hooks so that refactored logic has regression protection.

**Details:**
다음 커스텀 훅에 대해 Vitest + @testing-library/react-hooks로 테스트:

- `useHistoryNavigation` — 연/월 전환, 초기값 계산
- `useHistoryReview` — 리뷰 필터 변경, 상태 맵 빌드
- `useHistoryEdit` — 편집 시작/취소, 삭제 확인
- `usePlanGeneration` — 생성 파라미터 변경, 생성 호출
- `usePlanState` — 식단 수정, 스냅샷 저장/로드
- `useMenuFilters` — 필터 변경, 정렬, 페이지 전환
- `useSettingsState` — 상태 저장, 연결 테스트

각 훅당 최소 3개 테스트 케이스.

**Acceptance Criteria:**

- [ ] `tests/hooks/` 폴더에 7개 테스트 파일 생성됨
- [ ] 각 훅당 최소 3개 테스트 케이스 (총 21개+)
- [ ] 모든 테스트가 `npx vitest run` 통과
- [ ] 기존 98개 테스트도 그대로 통과
- [ ] `npx vite build` 성공

### US-009: 최종 검증 및 파일 크기 확인

**Description:** As a developer, I want a final verification that all refactoring goals are met: no file exceeds 500 lines, all tests pass, and the build succeeds.

**Acceptance Criteria:**

- [ ] `components/MealPlanHistory.tsx` ≤ 500줄
- [ ] `components/MealPlanner.tsx` ≤ 500줄
- [ ] `components/SystemSettings.tsx` ≤ 500줄
- [ ] `components/MenuDatabase.tsx` ≤ 500줄
- [ ] 새로 생성된 모든 파일 ≤ 500줄
- [ ] `npx tsc --noEmit` 에러 0개
- [ ] `npx vite build` 성공
- [ ] `npx vitest run` 전부 통과 (기존 98개 + 신규 훅 테스트 21개+)
- [ ] `npx playwright test` E2E 13개 통과
- [ ] 기존 UI 기능/레이아웃 변경 없음 (순수 리팩토링)

## Functional Requirements

- FR-1: Dashboard.tsx의 Recharts BarChart onClick 핸들러 타입을 `BarRectangleItem` 또는 적절한 타입으로 수정하여 TS 에러 해소
- FR-2: MealPlanHistory.tsx의 6개 인라인 컴포넌트를 `components/history/` 하위 개별 파일로 추출
- FR-3: MealPlanHistory.tsx의 상태 관리 로직을 3개 커스텀 훅으로 분리
- FR-4: MealPlanner.tsx를 3개 서브컴포넌트 + 2개 커스텀 훅으로 분해
- FR-5: SystemSettings.tsx의 7개 탭 섹션을 개별 컴포넌트로 추출
- FR-6: MenuDatabase.tsx의 필터/정렬 로직을 커스텀 훅으로, 툴바/행을 서브컴포넌트로 분리
- FR-7: 식단 생성 결과 등 비용이 높은 계산에 useMemo 적용
- FR-8: 자식 컴포넌트에 props로 전달되는 핸들러에 useCallback 적용
- FR-9: 순수 렌더링 서브컴포넌트에 React.memo 적용
- FR-10: 추출된 7개 커스텀 훅 각각에 최소 3개 단위 테스트 작성

## Non-Goals (Out of Scope)

- 새로운 기능 추가 (모바일 반응형, 키보드 단축키 등)
- 서비스 레이어 리팩토링 (engine.ts, sheetsSerializer.ts 등)
- 컨텍스트 구조 변경 (MenuContext, AuthContext 등)
- E2E 테스트 추가 (기존 13개 통과 확인만)
- CSS/스타일링 변경 (Tailwind 클래스 변경 없음)
- 패키지 업그레이드 또는 새 의존성 추가

## Technical Considerations

- **디렉토리 구조:** 서브컴포넌트는 기능별 하위 폴더 (`components/history/`, `components/planner/`, `components/settings/`, `components/menu/`), 훅은 `hooks/` 폴더에 배치
- **Import 경로:** 기존 `@/components/ui/*` alias 패턴 유지, 새 파일도 동일 패턴 사용
- **React 19 호환:** React.memo, useMemo, useCallback 모두 React 19에서 정상 동작
- **Barrel exports:** 각 하위 폴더에 `index.ts` 생성하여 import 깔끔하게 유지
- **TypeScript strict mode:** 기존 `strict: true` 설정 유지, 새 파일에도 적용
- **순환 참조 방지:** 상수/타입은 별도 파일로 분리하여 컴포넌트 간 직접 import 회피
- **테스트 환경:** Vitest + @testing-library/react, 훅 테스트는 renderHook 사용

## Success Metrics

- 4개 대형 컴포넌트 모두 500줄 이하로 축소
- 전체 빌드 파이프라인(tsc → build → test → e2e) 통과
- 신규 훅 테스트 21개+ 추가 → 총 테스트 119개+
- 새로 생성된 파일 중 500줄 초과 파일 0개

## Open Questions

- MealPlanHistory의 `HistoryReviewModal` (557줄, 별도 파일)도 이번 리팩토링 범위에 포함할지?
- `PlanManagement.tsx` (591줄)도 500줄 상한 적용 대상인지?
- barrel export(index.ts) 없이 직접 import 방식을 선호하는지?
