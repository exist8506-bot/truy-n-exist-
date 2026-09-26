import { test, expect } from 'playwright/test';

test('library modes keep the complete loaded dataset beyond 100 stories', async ({ page }) => {
  const pageOne = Array.from({ length: 100 }, (_, i) => ({
    id: 'story-' + (i + 1), title: 'Story ' + (i + 1), author: 'Author',
    cat: 'Test', desc: '', status: 'FULL', chapters: 1, chapterMin: 0, chapterMax: 0
  }));
  const pageTwo = Array.from({ length: 20 }, (_, i) => ({
    id: 'story-' + (i + 101), title: 'Story ' + (i + 101), author: 'Author',
    cat: 'Test', desc: '', status: 'FULL',
    chapters: i === 19 ? 999 : 2, chapterMin: 0, chapterMax: i === 19 ? 998 : 1
  }));

  await page.route('**/api/v1/stories?*', async route => {
    const url = new URL(route.request().url());
    const requestedPage = Number(url.searchParams.get('page') || 1);
    const q = url.searchParams.get('q') || '';
    const items = q ? [pageTwo[19]] : (requestedPage === 1 ? pageOne : pageTwo);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items, page: requestedPage, pageSize: 100, total: 120, count: 120 })
    });
  });

  await page.goto('/');
  await expect(page.locator('#grid .card')).toHaveCount(120);
  await page.locator('#segRank').click();
  await expect(page.locator('#homeMode')).toContainText('Story 120');
  await expect(page.locator('#grid .card')).toHaveCount(120);

  await page.locator('#search').fill('Story 120');
  await expect(page.locator('#grid .card')).toHaveCount(1);
  await page.locator('#search').fill('');
  await expect(page.locator('#grid .card')).toHaveCount(120);
  await page.locator('#filterAll').click();
  await page.locator('#dataTools button').nth(1).click();
  await expect(page.locator('#grid .card')).toHaveCount(1);
  await expect(page.locator('#grid .card').first()).toContainText('Story 120');
});
