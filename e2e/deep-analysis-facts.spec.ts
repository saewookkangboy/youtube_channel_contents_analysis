import { expect, test } from '@playwright/test';

test.describe('심층 분석 미리보기 — Fact 섹션', () => {
  test('채널 리포트에 팩트 표·고정 수치·rvr 인용이 보인다', async ({ page }) => {
    await page.goto('/?reportPreview=channel');
    await expect(page.getByRole('heading', { level: 2, name: '심층 분석' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /팩트 체크 및 로우 데이터/i })).toBeVisible();
    await expect(page.getByText('12500', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('340000', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('rvr', { exact: false }).first()).toBeVisible();
  });

  test('영상 리포트에 조회·참여율(er) 표기가 보인다', async ({ page }) => {
    await page.goto('/?reportPreview=video');
    await expect(page.getByRole('heading', { level: 2, name: '심층 분석' })).toBeVisible();
    await expect(page.getByText('88200', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('참여율', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('5.2', { exact: false }).first()).toBeVisible();
  });
});
