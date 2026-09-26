import { test, expect } from 'playwright/test';

test('service worker never serves API from offline cache', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await new Promise(r => setTimeout(r, 150));
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBeTruthy();

  const onlineHealth = await page.evaluate(async () => {
    const r = await fetch('/api/v1/health');
    return { ok: r.ok, status: r.status, body: await r.json() };
  });
  expect(onlineHealth.ok).toBeTruthy();
  const cached = await page.evaluate(async () => {
    const hit = await caches.match(new Request(location.origin + '/api/v1/health'));
    return Boolean(hit);
  });
  expect(cached).toBeFalsy();

  await context.setOffline(true);
  await expect.poll(() => page.evaluate(async () => Boolean(await caches.match(new Request(location.origin + '/api/v1/health'))))).toBeFalsy();
  await context.close();
});
