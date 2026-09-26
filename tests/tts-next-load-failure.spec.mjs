import { test, expect } from 'playwright/test';

test('TTS stops cleanly when automatic next chapter cannot load', async ({ page }) => {
  const book = { id:'tts-remote', title:'TTS Remote', author:'CI', cat:'Test', desc:'', status:'FULL', chapterCount:2, chapterMin:0, chapterMax:1 };
  const chapters = { items:[{id:'tts-remote:0',story_id:'tts-remote',index:0,title:'First chapter',content:'A short first chapter for TTS failure regression.'}], page:1,pageSize:100,total:1,count:1,minIndex:0,maxIndex:0 };
  await page.route('**/api/v1/stories?page=*', async route => {
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[book],page:1,pageSize:100,total:1,count:1})});
  });
  await page.route('**/api/v1/stories/tts-remote', async route => {
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(book)});
  });
  await page.route('**/api/v1/stories/tts-remote/chapters?page=*', async route => {
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(chapters)});
  });
  await page.route('**/api/v1/stories/tts-remote/chapters/0?*', async route => {
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({bookId:'tts-remote',index:0,title:'First chapter',content:chapters.items[0].content,language:'vi',translated:false})});
  });
  await page.route('**/api/v1/stories/tts-remote/chapters/1?*', route => route.abort());

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

  await page.goto('/');
  await expect(page.locator('#grid .card')).toHaveCount(1);
  await page.locator('#grid .card').first().locator('.info').click();
  await page.locator('#chapters .chapter').first().click();
  await expect(page.locator('#rtitle')).toHaveText('First chapter');
  await page.getByRole('button',{name:/🔊/}).click();
  await expect(page.locator('#ttsLabel')).toHaveText('Dừng');
  await page.evaluate(() => window.__lastUtterance?.onend?.());
  await expect(page.locator('#ttsLabel')).toHaveText('Đọc');
  await expect(page.locator('#rtitle')).toHaveText('First chapter');
  await expect.poll(() => page.evaluate(() => window.__ttsCycles)).toBe(1);
});
