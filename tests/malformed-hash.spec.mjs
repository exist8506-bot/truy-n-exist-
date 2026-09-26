import { test, expect } from 'playwright/test';

test('malformed shared reader hash does not crash app boot', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/#%E0%A4%A/chapter/999999');
  await expect(page.locator('#grid .card')).toHaveCount(13);
  await expect(page.locator('#reader')).not.toHaveClass(/show/);
  await page.evaluate(() => { history.pushState({}, '', '#%E0%A4%A/chapter/1'); window.dispatchEvent(new PopStateEvent('popstate')); });
  await expect(page.locator('#grid .card')).toHaveCount(13);
  expect(errors).toEqual([]);

  await page.route('**/api/v1/stories/story-0/chapters/0*', route => route.abort());
  await page.locator('#search').fill('Mùa Sao');
  await page.locator('#grid .card').first().locator('.info').click();
  await page.route('**/api/v1/stories/b1/chapters/0*', route => route.abort());
  await page.locator('#chapters .chapter').first().click();
  await expect(page.locator('#toast')).toContainText('Không tải được chương; hãy thử lại');
  expect(errors).toEqual([]);
});
