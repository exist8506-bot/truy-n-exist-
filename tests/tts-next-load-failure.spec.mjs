import { test, expect } from 'playwright/test';

test('TTS stops cleanly when automatic next chapter cannot load', async ({ page }) => {
  await page.addInitScript(() => {
    window.__ttsCycles = 0;
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel(){ this.speaking=false; },
        resume(){},
        getVoices(){ return [{lang:'vi-VN',name:'CI'}]; },
        speak(u){ this.speaking=true; window.__lastUtterance=u; window.__ttsCycles++; },
      }
    });
    window.SpeechSynthesisUtterance = class {
      constructor(text){ this.text=text; this.lang=''; this.rate=1; this.onend=null; this.onerror=null; }
    };
  });

  await page.route('**/api/v1/stories/b1/chapters/1', route => route.abort());
  await page.goto('/');
  await page.locator('#grid .card').filter({hasText:'Mùa Sao Trên Đỉnh Núi'}).locator('.info').click();
  await page.locator('#chapters .chapter').first().click();
  await page.getByRole('button',{name:/🔊/}).click();
  await expect(page.locator('#ttsLabel')).toHaveText('Dừng');

  await page.evaluate(() => window.__lastUtterance?.onend?.());
  await expect(page.locator('#ttsLabel')).toHaveText('Đọc');
  await expect(page.locator('#rtitle')).toHaveText('Ánh đèn cuối thung lũng');
  await expect.poll(() => page.evaluate(() => window.__ttsCycles)).toBe(1);
});
