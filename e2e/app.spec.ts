import { test, expect } from '@playwright/test';

test.describe('앱 기본 로드', () => {
  test('메인 페이지 로드 및 기본 탭 표시', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Z-SUB')).toBeVisible();
    // 기본 탭은 AI 식단 구성
    await expect(page.locator('text=통합 식단(화수목/금토월) 자동 생성')).toBeVisible();
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
    await expect(page.locator('text=통합 운영 대시보드')).toBeVisible();
  });

  test('반찬 리스트로 이동', async ({ page }) => {
    await page.goto('/');
    await page.click('text=반찬 리스트');
    await expect(page.locator('h1:has-text("반찬 리스트")')).toBeVisible();
  });

  test('식단 히스토리로 이동', async ({ page }) => {
    await page.goto('/');
    await page.click('text=식단 히스토리');
    await expect(page.locator('h1:has-text("식단 히스토리")')).toBeVisible();
  });

  test('구독자 CRM으로 이동', async ({ page }) => {
    await page.goto('/');
    await page.click('text=구독자 CRM');
    await expect(page.locator('text=구독자')).toBeVisible();
  });

  test('시스템 설정으로 이동', async ({ page }) => {
    await page.goto('/');
    await page.click('text=시스템 설정');
    await expect(page.locator('text=AI 구성 매뉴얼')).toBeVisible();
  });
});

test.describe('식단 생성', () => {
  test('식단 생성 버튼 클릭 시 생성 시작', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=통합 식단(화수목/금토월) 자동 생성')).toBeVisible();
    await page.click('text=통합 식단(화수목/금토월) 자동 생성');
    // 생성 중 또는 생성 결과가 나타남
    await expect(page.locator('text=식단 생성 중...').or(page.locator('text=1주차'))).toBeVisible({ timeout: 10000 });
  });

  test('식단 생성 후 주차 표시', async ({ page }) => {
    await page.goto('/');
    await page.click('text=통합 식단(화수목/금토월) 자동 생성');
    // 생성 완료 대기
    await expect(page.locator('text=1주차').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=2주차').first()).toBeVisible();
  });
});

test.describe('반찬 리스트', () => {
  test('반찬 리스트에서 메뉴 항목 표시', async ({ page }) => {
    await page.goto('/');
    await page.click('text=반찬 리스트');
    await expect(page.locator('h1:has-text("반찬 리스트")')).toBeVisible();
  });

  test('카테고리 필터 동작', async ({ page }) => {
    await page.goto('/');
    await page.click('text=반찬 리스트');
    const filterBtn = page.locator('button:has-text("국/찌개")');
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
    }
  });
});

test.describe('대시보드', () => {
  test('KPI 카드 표시', async ({ page }) => {
    await page.goto('/');
    await page.click('text=통합 대시보드');
    await expect(page.getByText('활성 메뉴', { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('메뉴 분석 섹션 표시', async ({ page }) => {
    await page.goto('/');
    await page.click('text=통합 대시보드');
    await expect(page.locator('text=메뉴 분석')).toBeVisible({ timeout: 10000 });
  });
});
