import { test, expect } from 'playwright/test';

test('remote search error returns to real static catalog', async ({ page }) => {
  let searchFailed = false;
  await page.route('**/api/v1/stories?*', async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.has('q')) {
      searchFailed = true;
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'TEST_SEARCH_FAILURE' }) });
    }
    const items = Array.from({ length: 13 }, (_, i) => ({
      id: 'story-' + i, title: 'Story ' + i, author: 'Author', cat: 'Test',
      desc: '', status: 'FULL', chapters: 1, chapterMin: 0, chapterMax: 0
    }));
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items, page: 1, pageSize: 100, total: 13, count: 13 }) });
  });

  await page.goto('/');
  await expect(page.locator('#grid .card')).toHaveCount(13);

  await page.locator('#search').fill('Mùa Sao');
  await page.waitForTimeout(300);
  expect(searchFailed).toBeTruthy();
  await expect(page.locator('#grid .card')).toHaveCount(1);
  await expect(page.locator('#apiStatus')).toContainText('Dữ liệu tĩnh');
});
