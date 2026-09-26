import { test, expect } from 'playwright/test';

test('localStorage quota or permission failures do not break reader settings', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto('/');
  await page.locator('#search').fill('Mùa Sao');
  await page.locator('#grid .card').first().locator('.info').click();
  await page.locator('#chapters .chapter').first().click();
  await expect(page.locator('#reader')).toHaveClass(/show/);

  await page.evaluate(() => {
    const originalSet = Storage.prototype.setItem;
    const originalGet = Storage.prototype.getItem;
    Storage.prototype.setItem = function () { throw new Error('quota'); };
    Storage.prototype.getItem = function () { throw new Error('blocked'); };
    window.__restoreStorage = () => {
      Storage.prototype.setItem = originalSet;
      Storage.prototype.getItem = originalGet;
    };
  });

  await page.locator('#settings').isVisible().catch(()=>{});
  await page.locator('#fontSelect').selectOption('Georgia');
  await page.locator('#themeSelect').selectOption('light');
  await page.locator('#ttsRate').selectOption('1.25');
  await expect(page.locator('#rtext')).not.toBeEmpty();
  await expect(page.locator('#reader')).toHaveClass(/show/);

  await page.evaluate(() => window.__restoreStorage());
  expect(errors).toEqual([]);
});
