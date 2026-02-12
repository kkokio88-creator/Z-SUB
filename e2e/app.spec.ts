import { test, expect } from '@playwright/test';

test('메인 페이지 로드', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=Z-SUB')).toBeVisible();
});

test('식단 생성 버튼 클릭', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=통합 식단(A조/B조) 자동 생성')).toBeVisible();
  await page.click('text=통합 식단(A조/B조) 자동 생성');
  await expect(page.locator('text=식단 생성 중...')).toBeVisible();
});

test('사이드바 네비게이션 동작', async ({ page }) => {
  await page.goto('/');
  await page.click('text=통합 대시보드');
  await expect(page.locator('text=주간 운영 부하')).toBeVisible();
});
