-- Z-SUB RLS (Row Level Security) 정책
-- 권한 매트릭스 기반: Manager(전체), Nutritionist(제한적 쓰기), Operator(읽기)

-- ============================================================
-- 헬퍼 함수: 현재 사용자의 역할 조회
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

-- ============================================================
-- 1. profiles: 모든 인증 사용자 조회 가능, 본인만 수정
-- ============================================================
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- ============================================================
-- 2. menu_items: Manager/Nutritionist CRUD, Operator 읽기만
-- ============================================================
CREATE POLICY "menu_items_select" ON menu_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "menu_items_insert" ON menu_items
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('manager', 'nutritionist'));

CREATE POLICY "menu_items_update" ON menu_items
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('manager', 'nutritionist'));

CREATE POLICY "menu_items_delete" ON menu_items
  FOR DELETE TO authenticated
  USING (public.get_user_role() IN ('manager', 'nutritionist'));

-- ============================================================
-- 3. meal_plan_configs: Manager만 수정, 나머지 읽기
-- ============================================================
CREATE POLICY "configs_select" ON meal_plan_configs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "configs_insert" ON meal_plan_configs
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'manager');

CREATE POLICY "configs_update" ON meal_plan_configs
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'manager');

CREATE POLICY "configs_delete" ON meal_plan_configs
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'manager');

-- ============================================================
-- 4. monthly_meal_plans: Manager/Nutritionist 생성/수정
-- ============================================================
CREATE POLICY "meal_plans_select" ON monthly_meal_plans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "meal_plans_insert" ON monthly_meal_plans
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('manager', 'nutritionist'));

CREATE POLICY "meal_plans_update" ON monthly_meal_plans
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('manager', 'nutritionist'));

CREATE POLICY "meal_plans_delete" ON monthly_meal_plans
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'manager');

-- ============================================================
-- 5. weekly_cycle_plans: 식단과 동일 권한
-- ============================================================
CREATE POLICY "weekly_plans_select" ON weekly_cycle_plans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "weekly_plans_insert" ON weekly_cycle_plans
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('manager', 'nutritionist'));

CREATE POLICY "weekly_plans_update" ON weekly_cycle_plans
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('manager', 'nutritionist'));

CREATE POLICY "weekly_plans_delete" ON weekly_cycle_plans
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'manager');

-- ============================================================
-- 6. week_plan_items: 식단과 동일 권한
-- ============================================================
CREATE POLICY "plan_items_select" ON week_plan_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "plan_items_insert" ON week_plan_items
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('manager', 'nutritionist'));

CREATE POLICY "plan_items_update" ON week_plan_items
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('manager', 'nutritionist'));

CREATE POLICY "plan_items_delete" ON week_plan_items
  FOR DELETE TO authenticated
  USING (public.get_user_role() IN ('manager', 'nutritionist'));

-- ============================================================
-- 7. expert_reviews: 모두 조회, Manager/Nutritionist 작성
-- ============================================================
CREATE POLICY "reviews_select" ON expert_reviews
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "reviews_insert" ON expert_reviews
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('manager', 'nutritionist'));

-- ============================================================
-- 8. subscriber_snapshots: 모든 인증 사용자 조회
-- ============================================================
CREATE POLICY "subscribers_select" ON subscriber_snapshots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "subscribers_insert" ON subscriber_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'manager');

-- ============================================================
-- 9. monthly_financials: 모든 인증 사용자 조회
-- ============================================================
CREATE POLICY "financials_select" ON monthly_financials
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "financials_insert" ON monthly_financials
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'manager');

-- ============================================================
-- 10. revenue_by_target: 모든 인증 사용자 조회
-- ============================================================
CREATE POLICY "revenue_select" ON revenue_by_target
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "revenue_insert" ON revenue_by_target
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'manager');

-- ============================================================
-- 11. system_settings: Manager만 수정
-- ============================================================
CREATE POLICY "settings_select" ON system_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "settings_insert" ON system_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'manager');

CREATE POLICY "settings_update" ON system_settings
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'manager');

-- ============================================================
-- 12. audit_logs: 모든 인증 사용자 조회, 시스템 자동 삽입
-- ============================================================
CREATE POLICY "audit_select" ON audit_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "audit_insert" ON audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);
