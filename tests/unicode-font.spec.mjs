import { test, expect } from 'playwright/test';

test('Unicode font regression: Vietnamese reader text stays readable', async ({ browser }) => {
  const context=await browser.newContext();
  const page=await context.newPage();
  await page.goto('/');
  await page.locator('#search').fill('Mùa Sao');
  await expect(page.locator('#grid .card')).toHaveCount(1);
  await page.locator('#grid .card').first().locator('.info').click();
  await page.locator('#chapters .chapter').first().click();
  await expect(page.locator('#rtext')).toContainText('Đêm ấy');
  const font=await page.locator('#rtext').evaluate(el=>getComputedStyle(el).fontFamily);
  expect(font).toMatch(/system-ui|Segoe UI|Noto Sans|Arial/);
  const readerText=await page.locator('#rtext').innerText();
  expect(readerText).not.toMatch(/Ã|Â|á»|Ä|Æ/);
  await page.locator('.readerbar .btn').filter({hasText:'⚙'}).click();
  await page.locator('#fontSelect').selectOption('Georgia');
  await expect(page.locator('#fontSelect')).toHaveValue('Georgia');
  await page.locator('#fontSelect').selectOption('system-ui');
  await expect(page.locator('#fontSelect')).toHaveValue('system-ui');
  await context.close();
});
