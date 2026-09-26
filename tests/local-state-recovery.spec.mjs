import { test, expect } from 'playwright/test';

test('malformed local reading state does not break the app', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  await page.addInitScript(() => {
    localStorage.setItem('ktf_favs', JSON.stringify({ broken: true }));
    localStorage.setItem('ktf_hist', JSON.stringify({ broken: true }));
    localStorage.setItem('ktf_bookmarks_v1', JSON.stringify('broken'));
    localStorage.setItem('ktf_prog', JSON.stringify({
      good: { chapter: 0, percent: 25 },
      badNegative: { chapter: -5, percent: 40 },
      badChapter: { chapter: 'abc', percent: 20 },
      badPercent: { chapter: 1, percent: 'abc' }
    }));
  });

  await page.goto('/');
  await expect(page.locator('#grid .card')).toHaveCount(13);
  await page.locator('#search').fill('Mùa Sao');
  await page.locator('#grid .card').first().locator('.info').click();
  await page.locator('#chapters .chapter').first().click();
  await expect(page.locator('#reader')).toHaveClass(/show/);
  expect(errors).toEqual([]);
});
