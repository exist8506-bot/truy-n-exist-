import { test, expect } from 'playwright/test';

test('reader supports non-zero chapter numbering after renumber', async ({ page }) => {
  const story = {
    id: 'renumber-ui',
    title: 'Truyện đánh số 10',
    author: 'Test',
    cat: 'Test',
    desc: 'Renumbered reader regression',
    status: 'FULL',
    chapters: 2,
    chaptersData: []
  };
  story.chapters = chapters;
  const chapters = [
    { bookId: story.id, index: 10, title: 'Chương Mười', content: 'Nội dung chương số mười.' },
    { bookId: story.id, index: 11, title: 'Chương Mười Một', content: 'Nội dung chương số mười một.' }
  ];

  await page.route('**/api/v1/stories?*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      items: [story], page: 1, total: 1, count: 1, pageSize: 100
    }) });
  });
  await page.route('**/api/v1/stories/renumber-ui', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(story) });
  });
  await page.route('**/api/v1/stories/renumber-ui/chapters?*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      items: chapters, page: 1, pageSize: 100, total: 1, count: 2, minIndex: 10, maxIndex: 11
    }) });
  });
  await page.route('**/api/v1/stories/renumber-ui/chapters/10*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(chapters[0]) });
  });
  await page.route('**/api/v1/stories/renumber-ui/chapters/11*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(chapters[1]) });
  });

  await page.goto('/');
  await expect(page.locator('#grid .card')).toHaveCount(1);
  await page.locator('#grid .card').first().locator('.info').click();
  await expect(page.locator('#chapters .chapter').first()).toContainText('10');
  await expect(page.locator('#chapters .chapter').nth(1)).toContainText('11');

  await page.locator('#detailBox .settings .btn').first().click();
  await expect(page.locator('#rtitle')).toHaveText('Chương Mười');
  await expect(page.locator('#readPosition')).toContainText('10 / 2');

  await page.locator('#next').click();
  await expect(page.locator('#rtitle')).toHaveText('Chương Mười Một');
  await expect(page.locator('#readPosition')).toContainText('11 / 2');

  await page.locator('#prev').click();
  await expect(page.locator('#rtitle')).toHaveText('Chương Mười');

  await page.locator('#readerSeek').evaluate(el => {
    el.value = '11';
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('#rtitle')).toHaveText('Chương Mười Một');

  await page.locator('#prev').click();
  await expect(page.locator('#rtitle')).toHaveText('Chương Mười');

  await page.route('**/api/v1/stories/renumber-ui/chapters/11*', route => route.abort());
  await page.locator('#next').click();
  await expect(page.locator('#rtitle')).toHaveText('Chương Mười Một');
  await expect(page.locator('#rtext')).toContainText('Nội dung chương số mười một.');
});
