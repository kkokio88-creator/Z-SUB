-- Z-SUB 초기 스키마 마이그레이션
-- 생성일: 2026-02-12

-- ============================================================
-- 1. profiles: 사용자 프로필 (auth.users 연동)
-- ============================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('manager', 'nutritionist', 'operator')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 신규 사용자 가입 시 자동으로 profiles 레코드 생성
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. menu_items: 메뉴 라이브러리
-- ============================================================
CREATE TABLE menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(20) UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('국/찌개', '메인요리', '밑반찬', '디저트/간식')),
  cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  recommended_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  tastes TEXT[] DEFAULT '{}',
  season TEXT DEFAULT '사계절',
  tags TEXT[] DEFAULT '{}',
  is_spicy BOOLEAN NOT NULL DEFAULT FALSE,
  main_ingredient TEXT DEFAULT '',
  process TEXT DEFAULT '',
  weight TEXT DEFAULT '',
  is_unused BOOLEAN NOT NULL DEFAULT FALSE,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_menu_items_category ON menu_items(category);
CREATE INDEX idx_menu_items_is_unused ON menu_items(is_unused);

-- ============================================================
-- 3. meal_plan_configs: 식단 정책 (타겟별)
-- ============================================================
CREATE TABLE meal_plan_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target VARCHAR(50) NOT NULL UNIQUE,
  budget_cap NUMERIC(10,2) NOT NULL DEFAULT 0,
  target_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  target_cost_ratio NUMERIC(5,2) NOT NULL DEFAULT 0,
  composition JSONB NOT NULL DEFAULT '{"soup":1,"main":1,"side":2}',
  banned_tags TEXT[] DEFAULT '{}',
  required_tags TEXT[] DEFAULT '{}',
  parent_target VARCHAR(50) REFERENCES meal_plan_configs(target) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE meal_plan_configs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. monthly_meal_plans: 월간 식단 계획
-- ============================================================
CREATE TABLE monthly_meal_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month_label VARCHAR(20) NOT NULL,
  cycle_type VARCHAR(10) NOT NULL CHECK (cycle_type IN ('화수목', '금토월')),
  target VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'published', 'finalized')),
  version INT NOT NULL DEFAULT 1,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE monthly_meal_plans ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_meal_plans_target ON monthly_meal_plans(target);
CREATE INDEX idx_meal_plans_month ON monthly_meal_plans(month_label);

-- ============================================================
-- 5. weekly_cycle_plans: 주차별 식단
-- ============================================================
CREATE TABLE weekly_cycle_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_plan_id UUID NOT NULL REFERENCES monthly_meal_plans(id) ON DELETE CASCADE,
  week_index INT NOT NULL CHECK (week_index BETWEEN 1 AND 4),
  total_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_valid BOOLEAN NOT NULL DEFAULT TRUE,
  warnings TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(meal_plan_id, week_index)
);

ALTER TABLE weekly_cycle_plans ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. week_plan_items: 주차별 메뉴 항목
-- ============================================================
CREATE TABLE week_plan_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  weekly_plan_id UUID NOT NULL REFERENCES weekly_cycle_plans(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE week_plan_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_week_plan_items_weekly ON week_plan_items(weekly_plan_id);

-- ============================================================
-- 7. expert_reviews: AI 검수 결과
-- ============================================================
CREATE TABLE expert_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_plan_id UUID NOT NULL REFERENCES monthly_meal_plans(id) ON DELETE CASCADE,
  nutritionist_comment TEXT DEFAULT '',
  process_comment TEXT DEFAULT '',
  cost_comment TEXT DEFAULT '',
  overall_score INT NOT NULL DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 100),
  flagged_item_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE expert_reviews ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. subscriber_snapshots: 구독자 현황 스냅샷
-- ============================================================
CREATE TABLE subscriber_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target VARCHAR(50) NOT NULL,
  total_subscribers INT NOT NULL DEFAULT 0,
  new_subscribers INT NOT NULL DEFAULT 0,
  churn_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  satisfaction NUMERIC(3,1) NOT NULL DEFAULT 0,
  revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  tiers JSONB DEFAULT '[]',
  demographics JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subscriber_snapshots ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_subscriber_snapshots_target ON subscriber_snapshots(target);
CREATE INDEX idx_subscriber_snapshots_date ON subscriber_snapshots(snapshot_date);

-- ============================================================
-- 9. monthly_financials: 월별 재무 데이터
-- ============================================================
CREATE TABLE monthly_financials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month_label VARCHAR(20) NOT NULL UNIQUE,
  revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  profit NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE monthly_financials ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 10. revenue_by_target: 상품별 매출 비중
-- ============================================================
CREATE TABLE revenue_by_target (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  financial_id UUID NOT NULL REFERENCES monthly_financials(id) ON DELETE CASCADE,
  target_name VARCHAR(50) NOT NULL,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE revenue_by_target ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 11. system_settings: 시스템 설정 (Key-Value)
-- ============================================================
CREATE TABLE system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 12. audit_logs: 감사 로그
-- ============================================================
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100),
  before_data JSONB,
  after_data JSONB,
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ============================================================
-- updated_at 자동 갱신 트리거 함수
-- ============================================================
CREATE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 updated_at 트리거 적용
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON meal_plan_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON monthly_meal_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
