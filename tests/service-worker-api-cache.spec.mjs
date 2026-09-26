import { test, expect } from 'playwright/test';

test('service worker never serves API from offline cache', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await new Promise(r => setTimeout(r, 150));
  });

  const onlineHealth = await page.evaluate(async () => {
    const r = await fetch('/api/v1/health');
    return { ok: r.ok, status: r.status, body: await r.json() };
  });
  expect(onlineHealth.ok).toBeTruthy();

  await context.setOffline(true);
  const offlineResult = await page.evaluate(async () => {
    try {
      const r = await fetch('/api/v1/health');
      return { ok: true, status: r.status };
    } catch (e) {
      return { ok: false, error: String(e.message || e) };
    }
  });
  expect(offlineResult.ok).toBeFalsy();
  await context.close();
});
