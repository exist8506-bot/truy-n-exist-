import { test, expect } from 'playwright/test';

test('offline chapter search ignores Vietnamese accents including đ', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ktf_api_base', 'http://127.0.0.1:9/api/v1'));
  await page.goto('/');
  await page.locator('#search').fill('Mùa Sao');
  await page.locator('#grid .card').first().locator('.info').click();
  await page.locator('#chapterSearch').fill('dinh');
  await expect(page.locator('#chapters .chapter')).not.toHaveCount(0);
  await expect(page.locator('#chapters')).toContainText('chương 1');
});
