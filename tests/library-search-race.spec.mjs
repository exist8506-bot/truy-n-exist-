import { test, expect } from 'playwright/test';

test('library ignores stale load results when search changes quickly', async ({ page }) => {
  let initialLoads = 0;
  const allStories = [
    { id: 'alpha', title: 'Alpha Story', author: 'A', cat: 'Test', desc: '', status: 'FULL', chapters: 1, chapterMin: 0, chapterMax: 0 },
    { id: 'new', title: 'New Story', author: 'N', cat: 'Test', desc: '', status: 'FULL', chapters: 1, chapterMin: 0, chapterMax: 0 }
  ];

  await page.route('**/api/v1/stories?*', async route => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get('q') || '';
    const pageNo = Number(url.searchParams.get('page') || 1);
    if (pageNo !== 1) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], page: pageNo, pageSize: 100, total: 2, count: 2 }) });
    }
    if (!q) {
      initialLoads++;
      if (initialLoads === 2) await new Promise(r => setTimeout(r, 500));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: allStories, page: 1, pageSize: 100, total: 2, count: 2 }) });
    }
    if (q === 'old') {
      await new Promise(r => setTimeout(r, 350));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [allStories[0]], page: 1, pageSize: 100, total: 1, count: 1 }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [allStories[1]], page: 1, pageSize: 100, total: 1, count: 1 }) });
  });

  await page.goto('/');
  await expect(page.locator('#grid .card')).toHaveCount(2);

  await page.locator('#search').fill('old');
  await page.waitForTimeout(230);
  await page.locator('#search').fill('');
  await page.locator('#search').fill('new');
  await page.waitForTimeout(300);

  await expect(page.locator('#grid .card')).toHaveCount(1);
  await expect(page.locator('#grid .card').first()).toContainText('New Story');
});
