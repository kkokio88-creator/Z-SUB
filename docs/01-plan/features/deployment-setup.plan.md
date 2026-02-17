# Plan: 배포 환경설정 (Deployment Setup)

## 1. 개요

Z-SUB 프로젝트의 마지막 2%를 완료하는 배포 환경설정 작업.
Supabase DB 마이그레이션, Google Sheets 서비스 계정 연결, Vercel 프로덕션 배포를 수행한다.

## 2. 목표

- Supabase 프로젝트에 12테이블 스키마 + RLS 정책 마이그레이션 실행
- Google Sheets 서비스 계정 환경변수 설정 및 연결 검증
- Vercel 프로젝트 생성, 환경변수 주입, 첫 프로덕션 배포 완료
- CI/CD 파이프라인 (GitHub Actions) 정상 동작 확인

## 3. 작업 범위

### 3.1 Supabase 설정

| 항목              | 설명                                          |
| ----------------- | --------------------------------------------- |
| Supabase CLI 설치 | `npx supabase` 또는 글로벌 설치               |
| 프로젝트 링크     | `supabase link --project-ref <ref>`           |
| 마이그레이션 실행 | `supabase db push` (001 + 002 SQL)            |
| 환경변수          | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| 검증              | Supabase Dashboard에서 12테이블 + RLS 확인    |

### 3.2 Google Sheets 서비스 계정

| 항목              | 설명                                                                          |
| ----------------- | ----------------------------------------------------------------------------- |
| 서비스 계정 키    | JSON 키 파일에서 email, private_key 추출                                      |
| 스프레드시트 공유 | 서비스 계정 이메일에 편집자 권한 부여                                         |
| 환경변수          | `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SPREADSHEET_ID` |
| 로컬 검증         | `.env.local`에 설정 후 `GET /api/sheets/status` 테스트                        |

### 3.3 Vercel 배포

| 항목          | 설명                                                  |
| ------------- | ----------------------------------------------------- |
| Vercel CLI    | `npx vercel` 로 프로젝트 링크                         |
| 환경변수 설정 | Vercel Dashboard 또는 CLI로 6개 환경변수 주입         |
| 첫 배포       | `vercel --prod` 또는 GitHub push 트리거               |
| 검증          | 프로덕션 URL 접속, Sheets 연결 테스트, 기능 동작 확인 |

### 3.4 CI/CD 확인

| 항목            | 설명                                      |
| --------------- | ----------------------------------------- |
| GitHub Actions  | `ci.yml` 워크플로우 정상 동작 확인        |
| Pre-commit hook | ESLint + Prettier 통과 확인               |
| 자동 배포       | main 브랜치 push 시 Vercel 자동 배포 확인 |

## 4. 필요 환경변수 전체 목록

| 변수명                         | 용도                  | 설정 위치                       |
| ------------------------------ | --------------------- | ------------------------------- |
| `VITE_SUPABASE_URL`            | Supabase 프로젝트 URL | .env.local + Vercel             |
| `VITE_SUPABASE_ANON_KEY`       | Supabase 익명 키      | .env.local + Vercel             |
| `VITE_GEMINI_API_KEY`          | Gemini AI API 키      | .env.local (이미 설정) + Vercel |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Sheets 서비스 계정    | Vercel (서버리스 전용)          |
| `GOOGLE_PRIVATE_KEY`           | Sheets 서비스 계정 키 | Vercel (서버리스 전용)          |
| `GOOGLE_SPREADSHEET_ID`        | 대상 스프레드시트 ID  | Vercel (서버리스 전용)          |

## 5. 작업 순서 (의존성 고려)

```
[1] Supabase 마이그레이션 ──→ [2] .env.local 업데이트 ──→ [3] 로컬 통합 테스트
                                        ↓
[4] Vercel 프로젝트 생성 ──→ [5] 환경변수 설정 ──→ [6] 첫 프로덕션 배포
                                                           ↓
                                                   [7] 프로덕션 검증
```

## 6. 리스크 및 대응

| 리스크                                    | 영향                          | 대응                                          |
| ----------------------------------------- | ----------------------------- | --------------------------------------------- |
| Supabase 마이그레이션 실패                | 인증/데이터 미작동            | SQL 수동 실행 or Dashboard에서 직접 생성      |
| Sheets private_key 줄바꿈 이슈            | API 인증 실패                 | `\\n` → `\n` 변환 코드 확인 (api/sheets.ts:9) |
| Vercel 서버리스 함수 googleapis 번들 크기 | 빌드 실패                     | 함수 메모리 한도 상향 or 경량 클라이언트 전환 |
| CORS 이슈                                 | 프론트→서버리스 API 호출 실패 | vercel.json rewrites + CORS 헤더 확인         |

## 7. 완료 기준

- [ ] Supabase: 12테이블 생성, RLS 정책 활성, `handle_new_user` 트리거 동작
- [ ] Sheets: `GET /api/sheets/status` → `{ connected: true }`
- [ ] Vercel: 프로덕션 URL에서 7개 탭 전체 접근 가능
- [ ] Gemini: AI 검수 기능 정상 동작
- [ ] CI: GitHub Actions 워크플로우 green 상태
