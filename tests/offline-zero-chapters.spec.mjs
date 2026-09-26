import { test, expect } from 'playwright/test';

test('offline full-book download fails when chapter list is unavailable', async ({ page }) => {
  await page.route('**/api/v1/stories/b1/chapters*', route => route.abort());
  await page.goto('/');
  await expect(page.locator('#grid .card').filter({hasText:'Mùa Sao Trên Đỉnh Núi'})).toHaveCount(1);

  await page.evaluate(async () => {
    await window.removeOffline?.('b1');
    window.downloadBook('b1');
  });

  await expect(page.locator('#downloadList')).toContainText('Lỗi', { timeout: 10000 });
  await expect(page.locator('#downloadList')).not.toContainText('Đã lưu đầy đủ');
});
