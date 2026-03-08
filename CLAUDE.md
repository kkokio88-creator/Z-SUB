# Z-SUB 프로젝트 지침

## Compact Instructions

### 자동 compact 규칙

- Ralph Loop에서 User Story 1개를 완료하고 git commit한 직후, 반드시 /compact 실행
- /compact 실행 시 보존할 핵심 정보:
  - ralph/prd.json의 현재 passes 상태 (어떤 스토리가 true/false인지)
  - ralph/progress.txt의 Codebase Patterns 섹션 전체
  - 현재 브랜치명과 마지막 커밋 해시
  - 직전 스토리에서 발생한 에러와 해결 방법
- compact 후 첫 번째 행동: ralph/prd.json과 ralph/progress.txt를 다시 읽어서 상태 확인

### 컨텍스트 위기 대응

- /context 명령으로 남은 토큰이 30% 이하이면, 현재 작업을 즉시 중단하고 /compact를 먼저 실행
- compact가 실패할 경우: 현재 진행 상황을 ralph/progress.txt에 기록한 뒤 /clear 실행

## tmux 팀 모니터링 규칙 (자동 적용)

사용자는 tmux 환경에서 작업합니다. 에이전트 팀원 배치 시 반드시 다음 패턴을 따르세요:

### 1. 팀 작업 시작 시

- 백그라운드 에이전트를 실행하면, tmux 우측 패인을 열어 진행상황을 실시간 모니터링
- 명령어: `tmux split-window -h -l 60 "tail -f <output_file1> <output_file2> ..."`
- 여러 에이전트의 출력 파일을 하나의 패인에서 동시 모니터링

### 2. 작업 완료 시

- 모든 에이전트 작업이 끝나면 우측 모니터링 패인을 종료
- 명령어: `tmux kill-pane -t <pane_id>`

### 3. 새로운 작업 시작 시

- 새 작업에 맞는 팀을 구성하고, 다시 우측 패인을 열어 진행상황 표시
- 각 작업마다 이 사이클을 반복

### 규칙 요약

```
팀 구성 → 우측 패인 열기(tail -f) → 작업 진행 → 완료 시 패인 종료
```

## Multi-Agent Collaboration System

### 에이전트 역할

**Leader Agent (Opus)**:

- 아키텍처 결정, 태스크 설계, 코드 리뷰, 품질 관리
- 위치: tmux 왼쪽 윈도우 (window 0: "leader")
- 도구: Superpowers (기획/분석), bkit (선택)
- 책임:
  - 이 CLAUDE.md의 모든 규칙 준수
  - 서브 에이전트에게 필요한 컨텍스트만 전달 (전체 CLAUDE.md 전달 금지)
  - 최종 품질 검증: `npx vite build && npx vitest run`

**Sub-agents (Sonnet)**:

- 구체적 구현 작업 수행, 리팩토링, 파일 수정
- 위치: tmux 우측 윈도우들 (window 1-N, 동적 생성/종료)
- 도구: Ralph Loop (반복 실행)
- 책임:
  - 할당된 태스크만 집중 (다른 작업 범위 외)
  - 완료 시 결과 파일 생성 후 자동 종료
  - Leader의 피드백에 따라 재작업

### 사용 시나리오 구분

**멀티 에이전트 모드 사용 조건** (모두 만족 시):

- 3개 이상의 독립적 하위 작업 존재
- 병렬 처리 가능 (파일 의존성 낮음)
- 예상 소요 시간 30분 이상
- API 예산 충분 (단일 대비 4-5배 비용)

적합 예시: 새 기능 개발 (UI + 서비스 + 테스트), 대규모 리팩토링, 마이그레이션

**단일 에이전트 모드 사용** (하나라도 해당 시):

- 단순 작업 (버그 수정, 작은 기능 추가)
- 순차 처리 필요 (작업 간 강한 의존성)
- 15분 이내 완료 가능
- 비용 절약 우선

적합 예시: 버그 수정, 문서 업데이트, 설정 변경, 단일 파일 수정

### 작업 프로토콜

```
사용자 요청
  ↓
[Leader] CLAUDE.md + 코드베이스 분석
  ↓
[Leader] 복잡도 판단 (단일 vs 멀티)
  ↓
단일 모드: Leader가 직접 처리
멀티 모드:
  1. 비용 추정 및 사용자 승인 요청
  2. 컨텍스트 스냅샷 생성
  3. 작업 분해 (의존성 분석 + 파일 충돌 예측)
  4. 서브 에이전트 스폰 (최소 필요 수만)
  5. 병렬 실행 + tmux 모니터링
  6. Leader 점진적 검토 (완료된 것부터)
  7. 통합 테스트: npx vite build && npx vitest run
  8. 서브 에이전트 종료 + 비용 리포트
  9. 사용자 보고
```

상세 단계:

1. Opus가 TaskCreate로 구체적 태스크 정의 (파일 경로, 변경 범위, 금지 사항 명시)
2. Sonnet 에이전트를 백그라운드로 실행, tmux 패인에서 모니터링
3. 완료 후 Opus가 결과 검증 및 빌드 테스트

### 협업 디렉토리 구조

```
.claude/
├── scripts/
│   ├── init-agent-team.sh          # 팀 초기화 (tmux 세션 + 스냅샷)
│   ├── spawn-subagent.sh           # 서브 에이전트 생성
│   ├── terminate-subagent.sh       # 서브 에이전트 종료 + 아카이브
│   ├── snapshot-context.sh         # CLAUDE.md + git hash 스냅샷
│   ├── acquire-lock.sh             # 파일 락 획득 (충돌 방지)
│   ├── release-lock.sh             # 파일 락 해제
│   └── cost-estimate.sh            # 비용 추정 (실행 전 확인)
├── context/
│   ├── project-snapshot.md         # CLAUDE.md 스냅샷 (버전 고정)
│   ├── current-task.md             # 현재 작업 정의
│   └── decisions.log               # 의사결정 기록
├── handoffs/
│   └── {agent-name}/
│       ├── assignment.md           # 작업 지시 (압축된 컨텍스트)
│       ├── context-extract.md      # 필요한 규칙만 발췌
│       └── feedback.md             # 리더 피드백 (필요 시)
├── results/
│   └── {agent-name}/
│       ├── summary.md              # 작업 완료 보고
│       ├── changes.txt             # 변경 파일 목록
│       ├── cost.txt                # 실제 소요 비용
│       └── DONE                    # 완료 마커
├── locks/                          # 파일 락 디렉토리
├── hooks/                          # Stop Hook 등 설정
├── skills/                         # Superpowers, Ralph 등 스킬
└── commands/                       # /ralph-loop, /cancel-ralph 등
```

### 파일 기반 협업 프로토콜

**Leader -> Sub 통신** (`.claude/handoffs/{agent-name}/assignment.md`):

```markdown
작업: {간결한 제목}

## 목표

{1-2문장 요약}

## 입력 파일

- components/MealPlanner.tsx (수정 대상)
- types.ts (참고만)

## 출력 요구사항

- TypeScript 에러 0개
- npx vite build 통과

## 필수 프로젝트 규칙 (CLAUDE.md에서 발췌)

- 기능 로직(useState, useEffect, 핸들러) 변경 금지
- import 경로 정확성 확인
- 기존 print 스타일 보존

## 제한사항

- 시간: 30분 이내
- 수정 금지 파일: types.ts (읽기만)
- 동시 최대 4개 서브 에이전트

## 성공 기준

npx vite build && npx vitest run

## 완료 시

1. .claude/results/{agent-name}/summary.md 작성
2. .claude/results/{agent-name}/DONE 파일 생성
```

핵심 원칙:

- 전체 CLAUDE.md를 서브 에이전트에 전달하지 않음
- 해당 작업에 필요한 규칙만 발췌 (20k 토큰 이내)
- 파일 충돌 가능성이 있으면 acquire-lock.sh 사용

**Sub -> Leader 통신** (`.claude/results/{agent-name}/summary.md`):

```markdown
## 작업 완료 보고: {agent-name}

### 완료 항목

- [x] 구현 완료
- [x] 타입 체크 통과
- [x] 빌드 통과

### 변경 파일

- components/MealPlanner.tsx (수정, 15줄 변경)

### 테스트 결과

npx vite build: PASS
npx vitest run: 98/98 PASS

### 발견된 이슈

- (해당 시 기술)

### 소요 시간

- 12분, 반복 5회
```

### 코드 리뷰 기준

- 기능 로직(useState, useEffect, 핸들러) 변경 금지
- import 경로 정확성 확인
- TypeScript 타입 호환성 확인
- 기존 print 스타일 보존

## Superpowers + Ralph Loop 워크플로우

모든 신규 기능 개발은 다음 프로세스를 따릅니다:

```
/superpowers [feature]          ← 분석 + 브레인스토밍 + 3가지 접근법
    ↓
  사용자 승인
    ↓
/prd [feature]                  ← PRD 마크다운 생성
    ↓
/ralph                          ← PRD → ralph/prd.json 변환
    ↓
  사용자 스토리 검토
    ↓
/ralph-loop                     ← 자율 실행 (Stop Hook 기반)
    ↓
  [반복: 스토리 하나씩 구현]
    ↓
  ALL stories pass → COMPLETE
```

### Superpowers 스킬 (Leader 전용)

Leader가 기획/설계 시 사용하는 11가지 스킬:

1. **Brainstorming**: 3가지 이상 접근법 비교 (YAGNI 검토 포함)
2. **Writing Plans**: 2-5분 단위 원자적 태스크 분해
3. **TDD**: RED-GREEN-REFACTOR 사이클 (테스트 먼저)
4. **Systematic Debugging**: 4단계 과학적 방법 (추측 금지)
5. **Verification**: 완료 선언 전 반드시 빌드/테스트 증거 제시

Anti-rationalization: "간단한 변경", "이미 알고 있음", "나중에 테스트" 등은 스킬 생략 사유가 되지 않음.

### Ralph Loop (Sub-agent 전용)

각 반복(iteration)에서 하나의 스토리만 구현:

1. `ralph/prd.json` + `ralph/progress.txt` 읽기
2. Codebase Patterns 섹션 먼저 확인
3. `passes: false`인 첫 번째 스토리 선택
4. 구현 + `npx vite build` 검증
5. `passes: true`로 업데이트 + 커밋
6. 전체 완료 시 `<promise>RALPH_COMPLETE</promise>` 출력

안전장치:

- **Max iterations**: 기본 25회
- **Circuit breaker**: 3회 연속 진전 없으면 자동 중단
- **취소**: `/cancel-ralph` 또는 `.claude/ralph-loop.local.md` 삭제

### Z-SUB 프로젝트 빌드/검증 명령어

```bash
npx vite build          # 프론트엔드 빌드 검증
npx vitest run          # 단위 테스트 (98개)
npx playwright test     # E2E 테스트 (13개)
npx tsc --noEmit        # 타입 체크
```

Ralph prd.json의 모든 스토리에 반드시 포함할 acceptance criteria:

- "Typecheck passes"
- "npx vite build passes"

## 비용 최적화 가이드라인

### 작업 전 비용 추정

멀티 에이전트 모드 진입 전 반드시 확인:

```
=== 비용 추정 ===
에이전트: Leader(Opus) + N Sub(Sonnet)
예상 비용: 단일 Sonnet 대비 약 4-5배
```

사용자 승인 없이 멀티 에이전트 모드를 시작하지 않습니다.

### 비용 절감 전략

1. **최소 서브 에이전트 원칙**: 동시 4개 이하, 순차 가능한 것은 하나로 통합
2. **컨텍스트 압축**: CLAUDE.md 전체 전달 금지, 필요한 규칙만 발췌 (20k 토큰 이내)
3. **조기 종료**: 에러 3회 반복 시 즉시 중단, 비용 임계값 도달 시 알림
4. **작업 전 시뮬레이션**: 단일 에이전트로 1차 실행 후 복잡도 확인, 필요 시 멀티 전환

### 도구 통합

| 도구        | 사용자     | 용도                     | 필수 여부 |
| ----------- | ---------- | ------------------------ | --------- |
| Superpowers | Leader     | 기획, 분석, 브레인스토밍 | 권장      |
| Ralph Loop  | Sub-agents | 반복 실행, 자율 구현     | 필수      |
| bkit        | Leader     | BDD 요구사항 정의        | 선택      |
| spec-kit    | Leader     | 상세 기술 스펙 작성      | 선택      |

## 핵심 스크립트 명세

스크립트 위치: `.claude/scripts/`

### init-agent-team.sh

- tmux 세션 생성 (z-sub-dev)
- Leader 윈도우 시작 (Opus)
- CLAUDE.md 스냅샷 생성 → `.claude/context/project-snapshot.md`
- 작업 디렉토리 구조 생성
- 기존 세션이 있으면 덮어쓰기 전 확인

### spawn-subagent.sh `<agent-name> <task-description>`

- 새 tmux 윈도우 생성 + Sonnet Claude Code 시작
- assignment.md 생성 (`.claude/handoffs/{name}/`)
- 필요한 컨텍스트만 발췌 전달
- 동시 최대 4개, 30분 타임아웃

### terminate-subagent.sh `<agent-name>`

- DONE 파일 존재 확인, 미완료 시 경고
- 결과 아카이브 (타임스탬프 디렉토리)
- 파일 락 자동 해제
- tmux 윈도우 종료

### snapshot-context.sh

- 현재 CLAUDE.md + Git commit hash + 타임스탬프 기록
- 모든 에이전트가 동일 버전 참조 보장

### acquire-lock.sh / release-lock.sh `<file-path> <agent-name>`

- 파일 락 획득 (최대 30초 대기) / 해제
- 동시 파일 수정 충돌 방지

### cost-estimate.sh `<num-subagents> <estimated-minutes>`

- Opus + Sonnet 비용 계산
- 단일 에이전트 대비 비용 비교
- 일일 예산 잔여 표시
