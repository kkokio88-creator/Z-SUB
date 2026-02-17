-- Z-SUB 보안 수정 마이그레이션
-- 생성일: 2026-02-17
-- 목적: Supabase 마이그레이션 보안 취약점 4개 수정

-- ============================================================
-- Fix 1: profiles UPDATE - 역할 에스컬레이션 방지
-- ============================================================
-- 문제: 002_rls_policies.sql 의 profiles_update_own 정책은
--       USING 절만 있고 WITH CHECK 가 없어서, 인증된 사용자가
--       자신의 role 컬럼을 임의로 변경할 수 있음.
-- 해결: WITH CHECK 절을 추가해 기존 role 값을 유지하도록 강제.

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- ============================================================
-- Fix 2: audit_logs INSERT - service_role / 제한된 action 만 허용
-- ============================================================
-- 문제: 002_rls_policies.sql 의 audit_insert 정책은
--       WITH CHECK (true) 로 모든 인증 사용자가 임의의 데이터를
--       audit_logs 에 삽입할 수 있어 감사 로그 위변조 가능.
-- 해결: 삽입 가능한 user_id 를 본인으로, action 을 허용 목록으로 제한.

DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
DROP POLICY IF EXISTS "audit_insert" ON audit_logs;

-- 인증된 사용자는 본인 user_id 이고 허용된 action 값만 삽입 가능.
-- 서버사이드(service_role) 삽입은 RLS 를 우회하므로 별도 정책 불필요.
CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND action IN ('login', 'logout', 'view', 'generate', 'export')
  );

-- ============================================================
-- Fix 3: update_updated_at() 함수 search_path 고정
-- ============================================================
-- 문제: 001_initial_schema.sql 에서 생성된 update_updated_at() 함수는
--       SET search_path 없이 정의되어 search_path injection 공격에 노출됨.
-- 해결: SET search_path = '' 를 추가해 스키마를 명시적으로 고정.

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- Fix 4: system_settings 테이블에 updated_at 트리거 추가
-- ============================================================
-- 문제: 001_initial_schema.sql 에서 system_settings 에는
--       updated_at 컬럼이 있으나 set_updated_at 트리거가 누락됨.
--       (profiles, menu_items, meal_plan_configs, monthly_meal_plans
--        에만 트리거가 등록되어 있고 system_settings 는 빠져 있음.)
-- 해결: IF NOT EXISTS 를 사용해 멱등성을 보장하면서 트리거를 추가.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_updated_at_system_settings'
      AND tgrelid = 'system_settings'::regclass
  ) THEN
    CREATE TRIGGER set_updated_at_system_settings
      BEFORE UPDATE ON system_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END;
$$;
