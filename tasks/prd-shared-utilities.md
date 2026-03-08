# PRD: 코드 중복 제거 + 공유 유틸리티 추출

## Introduction

Z-SUB 코드베이스에 동일한 상수/유틸리티가 여러 파일에 복사-붙여넣기로 산재해 있다. `TARGET_LABELS`는 4곳, 메뉴명 정규화 정규식은 23곳, `INGREDIENT_KEYWORDS`는 3곳에 각각 다른 버전으로 존재한다. 특히 INGREDIENT_KEYWORDS의 불일치는 같은 메뉴가 경로에 따라 다르게 분류되는 실제 버그를 유발한다. 또한 알림 벨의 red dot이 항상 표시되어 UX 혼란을 준다. 이 PRD는 공유 유틸리티를 한 곳에서 관리하도록 추출하여 코드 품질과 데이터 정합성을 개선한다.

## Goals

- `TARGET_LABELS`를 `constants.ts`에 단일 정의하여 4곳 중복 제거
- `normalizeMenuName` 유틸을 공유 모듈로 추출하여 23곳 인라인 정규식 제거
- `INGREDIENT_KEYWORDS`를 단일 소스로 통합하여 분류 일관성 버그 수정
- 알림 벨 red dot을 실제 미확인 건수 기반으로 조건부 표시
- `PAGE_SIZE = 9999` 제거하여 죽은 페이지네이션 코드 정리
- 모든 변경 후 기존 빌드/테스트 통과 유지

## User Stories

### US-001: TARGET_LABELS를 constants.ts로 통합

**Description:** As a developer, 식단 타입 라벨을 한 곳에서 관리하여 신규 타입 추가 시 누락을 방지한다.

**Acceptance Criteria:**

- [ ] `constants.ts`에 `TARGET_LABELS: Record<TargetType, string>` export 추가
- [ ] Dashboard.tsx의 로컬 TARGET_LABELS 제거, constants import로 교체
- [ ] MealPlanHistory.tsx의 로컬 TARGET_LABELS 제거, constants import로 교체
- [ ] HistoryDistributionView.tsx의 로컬 TARGET_LABELS 제거, constants import로 교체
- [ ] HistoryIngredientView.tsx의 로컬 TARGET_LABELS 제거, constants import로 교체
- [ ] 4개 파일 모두 동일한 import 경로 사용
- [ ] Typecheck passes
- [ ] npx vite build passes

### US-002: normalizeMenuName 공유 유틸 추출

**Description:** As a developer, 메뉴명 정규화 로직을 한 곳에서 관리하여 정규식 불일치를 방지한다.

**Acceptance Criteria:**

- [ ] `services/menuUtils.ts` 신규 파일 생성
- [ ] `normalizeMenuName(name: string): string` 함수 export (냉장/반조리/냉동 접미사 + 후미 숫자 제거)
- [ ] `engine.ts`의 기존 `normalizeMenuName` 를 `menuUtils.ts`에서 import하도록 변경 (로컬 정의 제거)
- [ ] `MealPlanner.tsx`의 인라인 정규식(10곳)을 `normalizeMenuName` import로 교체
- [ ] `MealPlanHistory.tsx`의 인라인 정규식(4곳)을 `normalizeMenuName` import로 교체
- [ ] `Dashboard.tsx`의 인라인 정규식(1곳)을 import로 교체
- [ ] `HistoryReviewModal.tsx`의 인라인 정규식(2곳)을 import로 교체
- [ ] `HistoryDistributionView.tsx`의 인라인 정규식(1곳)을 import로 교체
- [ ] `HistoryIngredientView.tsx`의 인라인 정규식(1곳)을 import로 교체
- [ ] `autoClassifyService.ts`의 인라인 정규식(1곳)을 import로 교체
- [ ] `tagAnalysisService.ts`의 인라인 정규식(1곳)을 import로 교체
- [ ] Typecheck passes
- [ ] npx vite build passes

### US-003: INGREDIENT_KEYWORDS 단일 소스 통합

**Description:** As a developer, 주재료 키워드 매핑을 한 곳에서 관리하여 '닭강정'이 경로에 따라 다르게 분류되는 버그를 수정한다.

**Acceptance Criteria:**

- [ ] `constants.ts`에 `INGREDIENT_KEYWORDS: Record<string, string[]>` export 추가
- [ ] 3곳의 가장 완전한 버전(autoClassifyService.ts)을 기준으로 통합
- [ ] `sheetsSerializer.ts`의 로컬 INGREDIENT_KEYWORDS 제거, constants import로 교체
- [ ] `autoClassifyService.ts`의 로컬 INGREDIENT_KEYWORDS 제거, constants import로 교체
- [ ] `MealPlanHistory.tsx`의 로컬 INGREDIENT_KEYWORDS 제거, constants import로 교체
- [ ] 모든 경로에서 동일 키워드셋 사용 확인 ('닭강정' → chicken 일관 분류)
- [ ] Typecheck passes
- [ ] npx vite build passes

### US-004: 알림 벨 red dot 조건부 표시

**Description:** As a user, 미확인 알림이 있을 때만 red dot이 표시되어 알림의 의미가 정확해야 한다.

**Acceptance Criteria:**

- [ ] Layout.tsx에서 `getAllReviews` + `getReviewComments` import
- [ ] pending/issue 상태의 미확인 건수 계산 로직 추가
- [ ] 미확인 건수 > 0일 때만 red dot 표시
- [ ] 미확인 건수를 배지 숫자로 표시 (예: 빨간 원 안에 "3")
- [ ] 미확인 건수 0일 때 red dot 완전 미표시
- [ ] Typecheck passes
- [ ] npx vite build passes

### US-005: PAGE_SIZE 9999 제거 및 실제 페이지네이션 활성화

**Description:** As a user, 반찬 리스트가 적절한 페이지 크기로 표시되어 대량 데이터 시 성능이 유지된다.

**Acceptance Criteria:**

- [ ] `MenuDatabase.tsx`의 `PAGE_SIZE`를 9999에서 50으로 변경
- [ ] 기존 페이지네이션 UI(이전/다음 버튼, 페이지 표시)가 정상 동작
- [ ] 검색/필터 변경 시 page가 1로 리셋
- [ ] 총 건수 / 페이지 수 표시 정확
- [ ] Typecheck passes
- [ ] npx vite build passes

### US-006: 미사용 import 및 dead code 정리

**Description:** As a developer, 미사용 import와 dead code를 제거하여 빌드 경고를 줄인다.

**Acceptance Criteria:**

- [ ] 각 파일에서 US-001~003으로 인해 불필요해진 로컬 상수 정의 완전 제거 확인
- [ ] 리팩토링 과정에서 발생한 미사용 import 정리
- [ ] `MasterDataManagement.tsx` (8줄 wrapper) 검토 - 불필요 시 MenuDatabase 직접 라우팅으로 변경
- [ ] npx vite build 경고 0건
- [ ] Typecheck passes
- [ ] npx vite build passes

## Functional Requirements

- FR-1: `constants.ts`에 `TARGET_LABELS` export. 모든 TargetType enum 값에 대한 한국어 라벨 포함
- FR-2: `services/menuUtils.ts`에 `normalizeMenuName` export. `/_냉장|_반조리|_냉동/g` 제거 + `/\s+\d+$/` 후미 숫자 제거 + `.trim()` 적용
- FR-3: `constants.ts`에 `INGREDIENT_KEYWORDS` export. `autoClassifyService.ts`의 최완전 버전 기준 통합
- FR-4: Layout.tsx 알림 벨에 실제 미확인 건수 기반 조건부 표시
- FR-5: MenuDatabase.tsx PAGE_SIZE를 50으로 변경하여 실제 페이지네이션 활성화
- FR-6: 모든 소비 파일에서 로컬 중복 정의 제거, 공유 모듈 import로 교체

## Non-Goals

- localStorage 추상화 레이어 도입 (2순위 개선안으로 별도 진행)
- MealPlanHistory.tsx 컴포넌트 분리 리팩토링 (3순위 개선안으로 별도 진행)
- 접근성(ARIA) 전면 개선 (별도 PRD 필요)
- 기능 로직 변경 (기존 동작 100% 유지, 코드 구조만 개선)

## Technical Considerations

- `constants.ts`는 이미 `MAJOR_INGREDIENTS`, `TARGET_CONFIGS` 등을 export하는 프로젝트의 중앙 상수 파일
- `engine.ts`의 `normalizeMenuName`은 현재 모듈 로컬(not exported). export 시 순환 의존성 확인 필요 → `menuUtils.ts` 별도 파일로 분리가 안전
- INGREDIENT_KEYWORDS 통합 시 기존 3곳의 키워드 차이를 문서화하여 의도적 차이 vs 누락 구분
- 알림 건수 계산은 MyPage.tsx의 `pendingItems` useMemo 로직과 동일 패턴 재사용
- PAGE_SIZE 변경 시 검색 결과가 50건 초과인 경우의 UX 확인 필요

## Success Metrics

- 중복 상수/유틸 정의 수: 30+ → 0 (모든 중복 제거)
- INGREDIENT_KEYWORDS 불일치 버그: 해결 (동일 메뉴 → 동일 분류 보장)
- 빌드 경고 감소
- 알림 벨 false positive 제거 (미확인 건수 0 → dot 미표시)

## Open Questions

- MasterDataManagement.tsx (8줄 wrapper)를 제거하고 MenuDatabase를 직접 라우팅할 것인지, 향후 확장 가능성을 위해 유지할 것인지
- PAGE_SIZE 50이 적절한지, 100이나 다른 값이 더 나은지
