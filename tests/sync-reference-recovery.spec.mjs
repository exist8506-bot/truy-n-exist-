import { test, expect } from 'playwright/test';

test('sync ignores stale chapter references from remote data', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ktf_token', 'test-token'));
  await page.route('**/api/v1/auth/me', async route => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ id: 'u-test', username: 'test-user', displayName: 'Test', role: 'user' })
    });
  });
  await page.route('**/api/v1/sync', async route => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        progress: {
          'b1': { chapterIndex: 99, position: 50, updatedAt: new Date().toISOString() }
        },
        bookmarks: {
          'b1': [{ chapterIndex: 99, title: 'Stale', updatedAt: new Date().toISOString() }]
        },
        history: {
          'b1': { chapterIndex: 99, updatedAt: new Date().toISOString() }
        },
        favorites: []
      })
    });
  });
  await page.route('**/api/v1/progress', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });
  await page.route('**/api/v1/favorites', async route => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }
  });

  await page.goto('/');
  await expect(page.locator('#grid .card')).toHaveCount(13);

  const state = await page.evaluate(() => ({
    progress: JSON.parse(localStorage.getItem('ktf_prog') || '{}'),
    bookmarks: JSON.parse(localStorage.getItem('ktf_bookmarks_v1') || '{}'),
    history: JSON.parse(localStorage.getItem('ktf_hist') || '[]')
  }));
  expect(state.progress.b1).toBeUndefined();
  expect(state.bookmarks.b1).toBeUndefined();
  expect(state.history.some(x => x.bookId === 'b1' && x.chapter === 99)).toBeFalsy();
});
