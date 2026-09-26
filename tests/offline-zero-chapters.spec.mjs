import { test, expect } from 'playwright/test';

test('offline full-book download fails when a remote-only book has no chapter list', async ({ page }) => {
  const book = { id:'remote-only', title:'Remote Only', author:'CI', cat:'Test', desc:'', status:'FULL', chapterCount:2, chapterMin:0, chapterMax:1 };
  await page.route('**/api/v1/stories?page=*', async route => {
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[book],page:1,pageSize:100,total:1,count:1})});
  });
  await page.route('**/api/v1/stories/remote-only', async route => {
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(book)});
  });
  await page.route('**/api/v1/stories/remote-only/chapters*', route => route.abort());

  await page.goto('/');
  await expect(page.locator('#grid .card')).toHaveCount(1);
  await page.locator('#grid .card').first().locator('.info').click();
  await expect(page.locator('#detailBox')).toContainText('Remote Only');
  await expect.poll(()=>page.evaluate(()=>typeof window.downloadBook)).toBe('function');
  await page.evaluate(() => window.downloadBook('remote-only'));

  await expect(page.locator('#downloadList')).toContainText('Lỗi', { timeout: 10000 });
  await expect(page.locator('#downloadList')).not.toContainText('Đã lưu đầy đủ');
});
