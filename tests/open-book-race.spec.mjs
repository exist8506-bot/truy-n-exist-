import { test, expect } from 'playwright/test';

test('latest openBook call wins when story requests return out of order', async ({ page }) => {
  await page.route('**/api/v1/stories/b1', async route => {
    await new Promise(r => setTimeout(r, 350));
    await route.continue();
  });

  await page.goto('/');
  await expect(page.locator('#grid .card')).toHaveCount(13);
  await page.evaluate(async () => {
    await Promise.all([window.openBook('b1'), window.openBook('b2')]);
  });

  await expect(page.locator('#detail')).toHaveClass(/show/);
  await expect(page.locator('#detailBox')).toContainText('Quán Nhỏ Cuối Con Dốc');
  await expect(page.locator('#chapters')).toContainText('Mở cửa');
});
