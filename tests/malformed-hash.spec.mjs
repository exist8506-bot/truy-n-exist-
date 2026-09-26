import { test, expect } from 'playwright/test';

test('malformed shared reader hash does not crash app boot', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/#%E0%A4%A/chapter/999999');
  await expect(page.locator('#grid .card')).toHaveCount(13);
  await expect(page.locator('#reader')).not.toHaveClass(/show/);
  expect(errors).toEqual([]);
});
