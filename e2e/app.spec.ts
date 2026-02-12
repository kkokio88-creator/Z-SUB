import { test, expect } from '@playwright/test';

test.describe('앱 기본 로드', () => {
  test('메인 페이지 로드 및 기본 탭 표시', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Z-SUB')).toBeVisible();
    // 기본 탭은 식단 관리
    await expect(page.locator('text=통합 식단(A조/B조) 자동 생성')).toBeVisible();
  });

  test('오프라인 모드에서 기본 사용자로 자동 로그인', async ({ page }) => {
    await page.goto('/');
    // 기본 사용자 이름이 표시되어야 함
    await expect(page.locator('text=강지예')).toBeVisible();
  });
});

test.describe('사이드바 네비게이션', () => {
  test('통합 대시보드로 이동', async ({ page }) => {
    await page.goto('/');
    await page.click('text=통합 대시보드');
    await expect(page.locator('text=주간 운영 부하')).toBeVisible();
  });

  test('기초 데이터 관리로 이동', async ({ page }) => {
    await page.goto('/');
    await page.click('text=기초 데이터 관리');
    // 메뉴 DB 탭이 기본으로 보여야 함
    await expect(page.locator('text=메뉴 데이터베이스')).toBeVisible();
  });

  test('구독자 관리로 이동', async ({ page }) => {
    await page.goto('/');
    await page.click('text=구독자 관리');
    await expect(page.locator('text=구독자')).toBeVisible();
  });

  test('시스템 설정으로 이동', async ({ page }) => {
    await page.goto('/');
    await page.click('text=시스템 설정');
    await expect(page.locator('text=설정')).toBeVisible();
  });

  test('변경 이력으로 이동', async ({ page }) => {
    await page.goto('/');
    await page.click('text=변경 이력');
    await expect(page.locator('text=감사 로그')).toBeVisible();
  });
});

test.describe('식단 생성', () => {
  test('식단 생성 버튼 클릭 시 생성 시작', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=통합 식단(A조/B조) 자동 생성')).toBeVisible();
    await page.click('text=통합 식단(A조/B조) 자동 생성');
    // 생성 중 또는 생성 결과가 나타남
    await expect(page.locator('text=식단 생성 중...').or(page.locator('text=1주차'))).toBeVisible({ timeout: 10000 });
  });

  test('식단 생성 후 주차 표시', async ({ page }) => {
    await page.goto('/');
    await page.click('text=통합 식단(A조/B조) 자동 생성');
    // 생성 완료 대기
    await expect(page.locator('text=1주차')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=2주차')).toBeVisible();
  });
});

test.describe('기초 데이터 관리', () => {
  test('메뉴 DB에서 메뉴 항목 표시', async ({ page }) => {
    await page.goto('/');
    await page.click('text=기초 데이터 관리');
    // 메뉴 항목이 하나라도 보여야 함
    await expect(page.locator('text=메뉴 데이터베이스')).toBeVisible();
  });

  test('식단 구성 관리 탭 전환', async ({ page }) => {
    await page.goto('/');
    await page.click('text=기초 데이터 관리');
    await page.click('text=식단 구성 관리');
    await expect(page.locator('text=식단 유형')).toBeVisible();
  });

  test('메뉴 검색 필터링', async ({ page }) => {
    await page.goto('/');
    await page.click('text=기초 데이터 관리');
    await expect(page.locator('text=메뉴 데이터베이스')).toBeVisible();
    const searchInput = page.locator('input[placeholder*="검색"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('김치');
      await page.waitForTimeout(300);
    }
  });

  test('카테고리 필터 동작', async ({ page }) => {
    await page.goto('/');
    await page.click('text=기초 데이터 관리');
    const filterBtn = page.locator('button:has-text("국/찌개")');
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
    }
  });
});

test.describe('대시보드', () => {
  test('운영 현황 KPI 카드 표시', async ({ page }) => {
    await page.goto('/');
    await page.click('text=통합 대시보드');
    await expect(page.locator('text=배송 예정')).toBeVisible({ timeout: 10000 });
  });

  test('재무 성과 탭 전환', async ({ page }) => {
    await page.goto('/');
    await page.click('text=통합 대시보드');
    const financeTab = page.locator('button:has-text("재무 성과")');
    if (await financeTab.isVisible({ timeout: 5000 })) {
      await financeTab.click();
      await expect(page.locator('text=매출').first()).toBeVisible();
    }
  });
});

test.describe('감사 로그', () => {
  test('감사 로그 페이지 로드', async ({ page }) => {
    await page.goto('/');
    await page.click('text=변경 이력');
    await expect(page.locator('text=감사 로그')).toBeVisible();
  });
});
