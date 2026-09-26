import { test, expect } from 'playwright/test';

test('malformed reader settings recover without breaking the reader', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    localStorage.setItem('ktf_fs', 'not-a-number');
    localStorage.setItem('ktf_rate', 'NaN');
    localStorage.setItem('ktf_theme', 'unknown-theme');
    localStorage.setItem('ktf_lang', 'xx');
    localStorage.setItem('ktf_font', 'UnknownFont');
  });

  await page.goto('/');
  await page.locator('#search').fill('Mùa Sao');
  await page.locator('#grid .card').first().locator('.info').click();
  await page.locator('#chapters .chapter').first().click();
  await expect(page.locator('#reader')).toHaveClass(/show/);
  await expect(page.locator('#rtext')).not.toBeEmpty();
  await expect(page.locator('#fontSelect')).toHaveValue('system-ui');
  await expect(page.locator('#themeSelect')).toHaveValue('dark');
  await expect(page.locator('#ttsRate')).toHaveValue('1');
  expect(errors).toEqual([]);
});
