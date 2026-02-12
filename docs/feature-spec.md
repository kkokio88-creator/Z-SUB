# Z-SUB 기능정의서 (Feature Specification)

## 1. 유저 플로우

### 1.1 식단 생성 플로우

```
[타겟 선택] → [월 설정] → [생성 버튼 클릭]
    ↓
[엔진: A조(화수목) 4주 생성] + [엔진: B조(금토월) 4주 생성]
    ↓
[식단표 렌더링] → [AI 검수 (선택)] → [메뉴 교체 (선택)]
    ↓
[MIS 등록] → [ZPPS 동기화 (교체 시)] → [Sheets 저장]
```

### 1.2 메뉴 관리 플로우

```
[메뉴 목록 조회] → [필터/검색]
    ↓
[메뉴 선택] → [상세 편집 (원가, 속성, 태그)]
    ↓
[저장] → [Sheets 동기화 (선택)]
```

### 1.3 식단 상태 머신

```
[초기] → [생성됨(Draft)] → [검수 완료(Reviewed)]
    ↓                           ↓
[교체 발생] ← ─ ─ ─ ─ ─ ─ [수정 필요]
    ↓
[MIS 등록(Published)] → [ZPPS 반영(Synced)]
    ↓
[확정(Finalized)] → [히스토리 저장]
```

---

## 2. 화면별 기능 명세

### 2.1 통합 대시보드 (Dashboard)

**탭 구조:** 운영 현황 | 재무 성과

#### 운영 현황 탭

| 영역                      | 설명                                      |
| ------------------------- | ----------------------------------------- |
| KPI 카드 (4개)            | 배송 예정, 활성 구독자, 만족도, 주간 매출 |
| 이상 알림 배너            | 이탈률 5% 초과 식단 경고                  |
| 주간 운영 부하 차트       | 요일별 배송 건수 + 일시정지 (BarChart)    |
| 성장성 vs 건전성 매트릭스 | 식단별 신규유입 vs 이탈률 (ScatterChart)  |
| 구독 추이 차트            | 주요 식단별 4주 추이 (LineChart)          |

#### 재무 성과 탭

| 영역                | 설명                                |
| ------------------- | ----------------------------------- |
| 재무 KPI 카드 (4개) | 예상매출, 영업이익, ARPU, 원가율    |
| 매출/비용 추이      | 월별 매출·비용·이익 (ComposedChart) |
| 상품별 매출 비중    | 식단별 기여도 (PieChart)            |

**데이터 소스:** subscriber_snapshots, monthly_financials, revenue_by_target

---

### 2.2 지능형 식단 생성 (MealPlanner)

| 영역             | 설명                                                         |
| ---------------- | ------------------------------------------------------------ |
| 컨트롤 바        | 타겟 선택, 월 설정, 중복 제외 토글, 히스토리 버튼, 생성 버튼 |
| 연동 센터        | MIS 등록 버튼, ZPPS 변경 연동 버튼 (변경 건수 배지)          |
| A조 식단표       | 화수목 4주 그리드 (주차별 메뉴 목록, 원가, 원가율)           |
| B조 식단표       | 금토월 4주 그리드 (동일 구조)                                |
| 식재료 활용 분포 | 7개 주재료별 사용 횟수 (색상 코딩: 적정/주의/과다)           |

**모달:**

- 메뉴 교체: 카테고리 동일, 비중복 후보 목록, 원가 차이 표시
- AI 검수 리포트: 종합 점수, 영양사/공정/원가 3자 의견, 문제 메뉴
- 히스토리: 과거 확정 식단 목록, 불러오기

---

### 2.3 기준 정보 관리 (MasterDataManagement)

**서브 탭:** 메뉴 라이브러리 (DB) | 식단 정책 및 구성 설정

#### 2.3.1 메뉴 라이브러리 (MenuDatabase)

| 영역      | 설명                                       |
| --------- | ------------------------------------------ |
| 좌측 패널 | 메뉴 목록 (카테고리 필터, 검색, 신규 추가) |
| 우측 패널 | 선택된 메뉴 상세 편집                      |

**상세 편집 필드:**

- 기본 정보: 카테고리, 이름, 품목코드, 원가, 판매가, 중량, 공정번호
- 속성: 계절성, 주재료, 맛 속성(5종 토글)
- 태그: 관리 태그 추가/삭제
- 액션: 저장, 미사용 처리

#### 2.3.2 식단 정책 (PlanManagement)

| 영역             | 설명                                     |
| ---------------- | ---------------------------------------- |
| 전체 원가율 도구 | 일괄 원가율 설정 + 적용                  |
| 정책 그룹 카드   | 기본(Base) 식단 + 하위 옵션(Option) 식단 |

**그룹당 설정:**

- 메뉴 구성: 국/메인/반찬 개수 스테퍼
- 가격 정책: 판매가, 원가율, 원가한도(자동 계산)
- 필터 태그: 필수 태그(파란), 제외 태그(빨간)

---

### 2.4 구독자 CRM (SubscriberManagement)

| 영역                     | 설명                                                          |
| ------------------------ | ------------------------------------------------------------- |
| KPI 카드 (3개)           | 총 구독자, 신규 유입, 평균 만족도                             |
| 좌측: 식단별 성과 테이블 | 구독자수, 신규, 이탈률, 만족도, 매출기여도                    |
| 우측: 상세 분석          | 선택된 식단의 멤버십 분포(PieChart), 연령층 분석, 관리자 노트 |

---

### 2.5 시스템 설정 (SystemSettings)

**섹션:** AI 구성 매뉴얼 | 시스템 연동 (API)

#### AI 구성 매뉴얼

- 자연어 프롬프트 편집기 (textarea)
- AI 식단 생성 시 참조되는 가이드라인

#### 시스템 연동

| 항목          | 설명                               |
| ------------- | ---------------------------------- |
| Gemini API    | 연결 상태, API 키(환경변수)        |
| Google Sheets | 스프레드시트 URL 입력, 연결 테스트 |
| MIS API       | POST 엔드포인트 설정, 연결 테스트  |
| ZPPS API      | PUT 엔드포인트 설정, 연결 테스트   |

---

## 3. 데이터 구조 (ER 다이어그램)

```
[profiles]
  ├─ id (UUID, FK → auth.users)
  ├─ display_name
  ├─ role (manager | nutritionist | operator)
  └─ avatar_url

[menu_items]
  ├─ id (UUID, PK)
  ├─ code (VARCHAR, UNIQUE)
  ├─ name, category, cost, recommended_price
  ├─ tastes (TEXT[]), season, tags (TEXT[])
  ├─ is_spicy, main_ingredient
  ├─ process, weight, is_unused
  └─ created_at, updated_at

[meal_plan_configs]
  ├─ id (UUID, PK)
  ├─ target (VARCHAR, UNIQUE)
  ├─ budget_cap, target_price, target_cost_ratio
  ├─ composition (JSONB)
  ├─ banned_tags (TEXT[]), required_tags (TEXT[])
  └─ parent_target (FK → self)

[monthly_meal_plans]
  ├─ id (UUID, PK)
  ├─ month_label, cycle_type, target
  ├─ status (draft | reviewed | published | finalized)
  ├─ version (INT)
  └─ created_by (FK → profiles)

[weekly_cycle_plans]
  ├─ id (UUID, PK)
  ├─ meal_plan_id (FK → monthly_meal_plans)
  ├─ week_index (1~4)
  ├─ total_cost, total_price
  └─ is_valid, warnings (TEXT[])

[week_plan_items]
  ├─ id (UUID, PK)
  ├─ weekly_plan_id (FK → weekly_cycle_plans)
  ├─ menu_item_id (FK → menu_items)
  └─ position (INT)

[expert_reviews]
  ├─ id (UUID, PK)
  ├─ meal_plan_id (FK → monthly_meal_plans)
  ├─ nutritionist_comment, process_comment, cost_comment
  ├─ overall_score
  └─ flagged_item_ids (TEXT[])

[subscriber_snapshots]
  ├─ id (UUID, PK)
  ├─ snapshot_date, target
  ├─ total_subscribers, new_subscribers
  ├─ churn_rate, satisfaction, revenue
  └─ tiers (JSONB), demographics (JSONB)

[monthly_financials]
  ├─ id (UUID, PK)
  ├─ month_label
  └─ revenue, cost, profit

[revenue_by_target]
  ├─ id (UUID, PK)
  ├─ financial_id (FK → monthly_financials)
  ├─ target_name
  └─ percentage

[system_settings]
  ├─ key (VARCHAR, PK)
  ├─ value (TEXT)
  └─ updated_at, updated_by

[audit_logs]
  ├─ id (UUID, PK)
  ├─ timestamp, user_id (FK → profiles)
  ├─ action (VARCHAR)
  ├─ entity_type, entity_id
  ├─ before_data (JSONB), after_data (JSONB)
  └─ metadata (JSONB)
```

---

## 4. API 명세

### 4.1 MIS API

```
POST /api/mis/meal-plans
Request:
{
  "monthLabel": "3월",
  "target": "아이 식단",
  "cycleType": "화수목",
  "weeks": [{ weekIndex: 1, items: [...menuItemIds] }]
}
Response: { "success": true, "registeredCount": 120 }
```

### 4.2 ZPPS API

```
PUT /api/zpps/menu-changes
Request:
{
  "changes": [
    { "weekIndex": 1, "oldItemId": "M001", "newItemId": "M005", "reason": "manual_swap" }
  ]
}
Response: { "success": true, "appliedCount": 3 }
```

### 4.3 Google Sheets 프록시 API (Vite 미들웨어)

```
GET  /api/sheets/:sheetName              → 시트 데이터 조회
POST /api/sheets/:sheetName              → 시트 데이터 덮어쓰기
PUT  /api/sheets/:sheetName/append       → 시트에 행 추가
GET  /api/sheets/status                  → 연결 상태 확인
```

---

## 5. Google Sheets 시트 구조

### 마스터 스프레드시트 (7개 탭)

| #   | 시트명     | 설명                    | 컬럼                                                                                                                                 |
| --- | ---------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 메뉴DB     | 전체 메뉴 라이브러리    | id, code, name, category, cost, recommendedPrice, tastes, season, tags, isSpicy, mainIngredient, process, weight, isUnused, imageUrl |
| 2   | 식단정책   | 10개 타겟 정책          | target, budgetCap, targetPrice, targetCostRatio, soupCount, mainCount, sideCount, bannedTags, requiredTags, parentTarget, id         |
| 3   | 식단데이터 | 생성된 식단 (flat rows) | planId, monthLabel, cycleType, target, weekIndex, menuItemId, menuItemName, category, cost, position, createdAt                      |
| 4   | 구독자현황 | 구독자 통계             | target, totalSubscribers, newSubscribers, churnRate, satisfaction, revenue, tiers, demographics, snapshotDate                        |
| 5   | 재무데이터 | 월별 매출/비용/이익     | month, revenue, cost, profit                                                                                                         |
| 6   | 매출비중   | 상품별 매출 비중        | name, value                                                                                                                          |
| 7   | 동기화로그 | 동기화 이력             | timestamp, direction, sheetName, rowCount, status, error                                                                             |

**배열 필드 규칙:** tastes, tags 등 배열 필드는 셀 내 쉼표(`,`) 구분 문자열로 저장.

---

## 6. 동기화 전략

### 6.1 기본 원칙

- **기본 수동, 선택적 자동:** 사용자가 명시적으로 Push/Pull 실행
- **충돌 감지:** 양쪽 모두 변경된 경우 사용자 확인 다이얼로그
- **Last-write-wins:** 동일 레코드 충돌 시 최신 타임스탬프 우선
- **로그 기록:** 모든 동기화 이벤트를 동기화로그 시트에 기록

### 6.2 시트별 전략

| 시트       | Push 방향              | Pull 방향     |
| ---------- | ---------------------- | ------------- |
| 메뉴DB     | App → Sheets           | Sheets → App  |
| 식단정책   | App → Sheets           | Sheets → App  |
| 식단데이터 | App → Sheets (생성 시) | - (읽기 전용) |
| 구독자현황 | - (읽기 전용)          | Sheets → App  |
| 재무데이터 | - (읽기 전용)          | Sheets → App  |

---

## 7. 권한 매트릭스 (RLS)

| 기능            | Manager | Nutritionist | Operator |
| --------------- | ------- | ------------ | -------- |
| 메뉴 CRUD       | O       | O            | 읽기만   |
| 식단 정책 변경  | O       | X            | X        |
| 식단 생성/교체  | O       | O            | X        |
| MIS/ZPPS 동기화 | O       | O            | X        |
| Sheets 동기화   | O       | O            | 읽기만   |
| 시스템 설정     | O       | X            | X        |
| 구독자 조회     | O       | O            | O        |
| 감사 로그 조회  | O       | O            | O        |
