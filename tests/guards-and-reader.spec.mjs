import { test, expect } from 'playwright/test';

test('unauthenticated admin guard and normal reader remain usable', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#grid .card')).toHaveCount(13);

  await page.locator('.actions .btn').nth(2).click();
  await expect(page.locator('#toast')).toContainText('Cần đăng nhập tài khoản admin');
  await expect(page.locator('body')).not.toContainText('Admin Studio 1.6');

  await page.locator('#search').fill('Mùa Sao');
  await expect(page.locator('#grid .card')).toHaveCount(1);
  await page.locator('#grid .card').first().locator('.info').click();
  await page.locator('#chapters .chapter').first().click();
  await expect(page.locator('#reader')).toHaveClass(/show/);
  await expect(page.locator('#rtext')).not.toBeEmpty();

  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#rtitle')).toHaveText('Vệt sáng trong rừng');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#rtitle')).toHaveText('Ánh đèn cuối thung lũng');
});
