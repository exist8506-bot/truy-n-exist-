import { test, expect } from 'playwright/test';

test('Google TTS fallback does not skip text from large chunks', async ({ page }) => {
  await page.goto('/');
  await page.locator('#search').fill('Mùa Sao');
  await page.locator('#grid .card').first().locator('.info').click();
  await page.locator('#chapters .chapter').first().click();
  await expect(page.locator('#reader')).toHaveClass(/show/);

  await page.evaluate(() => {
    const longText = Array.from({ length: 420 }, (_, i) => 'Câu kiểm tra số ' + i + ' có nội dung đủ dài để buộc TTS chia nhiều đoạn.').join(' ');
    document.querySelector('#rtext').textContent = longText;
    window.__ttsAudioCount = 0;
    window.Audio = class {
      constructor(url) {
        this.url = url;
        window.__ttsAudioCount++;
      }
      play() {
        setTimeout(() => this.onended?.(), 0);
        return Promise.resolve();
      }
      pause() {}
      set src(v) { this._src = v; }
      get src() { return this._src; }
    };
    const ss = window.speechSynthesis;
    Object.defineProperty(ss, 'getVoices', { value: () => { throw new Error('voice lookup failure'); } });
    ss.speak = utterance => setTimeout(() => utterance.onerror?.(new Error('speech failed')), 0);
    ss.cancel = () => {};
    ss.resume = () => {};
  });

  await page.evaluate(() => window.speak());
  await expect.poll(() => page.evaluate(() => window.__ttsAudioCount), { timeout: 10000 }).toBeGreaterThan(1);
  await expect(page.locator('#ttsLabel')).toHaveText('Đọc', { timeout: 10000 });
});
