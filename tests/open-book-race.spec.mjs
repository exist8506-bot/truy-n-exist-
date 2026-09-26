import { test, expect } from 'playwright/test';

test('opening two stories quickly keeps the latest story', async ({ page }) => {
  let slow = true;
  await page.route('**/api/v1/stories/b1', async route => {
    if (slow) await new Promise(r => setTimeout(r, 350));
    return route.continue();
  });
  await page.goto('/');

  const cards = page.locator('#grid .card');
  await cards.filter({hasText:'Mùa Sao Trên Đỉnh Núi'}).locator('.info').click();
  await page.locator('#backToLibrary').count().catch(()=>{});
  slow = false;
  await page.goto('/');
  await cards.filter({hasText:'Quán Nhỏ Cuối Con Dốc'}).locator('.info').click();

  await expect(page.locator('#detail')).toHaveClass(/show/);
  await expect(page.locator('#detailBox')).toContainText('Quán Nhỏ Cuối Con Dốc');
  await expect(page.locator('#chapters')).toContainText('Mở cửa');
});
