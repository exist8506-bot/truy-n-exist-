import { test, expect } from 'playwright/test';

test.describe.configure({mode:'serial'});

test('desktop end-to-end: library, reader, account, admin, offline', async ({ browser }) => {
  const context=await browser.newContext({acceptDownloads:true});
  await context.addInitScript(() => {
    window.__shared=null;
    Object.defineProperty(navigator,'share',{configurable:true,value:async v=>{window.__shared=v;}});
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speaking:false,cancel(){this.speaking=false},speak(){this.speaking=true}}});
    window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;this.lang='';this.rate=1;this.onend=null;}};
    document.documentElement.requestFullscreen=async function(){this.__fullscreen=true;};
    document.exitFullscreen=async function(){document.documentElement.__fullscreen=false;};
  });
  const page=await context.newPage();
  await page.goto('/');
  await expect(page.locator('#grid .card')).toHaveCount(4);
  await expect(page.locator('#statBooks')).toHaveText('4');
  await expect(page.locator('#statChapters')).toHaveText('126');
  await expect(page.locator('#grid')).toContainText('Phong Thần Diễn Nghĩa');

  await page.locator('#search').fill('Phong Thần');
  await expect(page.locator('#grid .card')).toHaveCount(1);
  await page.locator('#search').fill('');
  await page.locator('#categoryFilter').selectOption({label:'Tiên hiệp / Thần ma'});
  await expect(page.locator('#grid .card')).toHaveCount(1);
  await page.locator('#categoryFilter').selectOption('all');
  await page.locator('#sortBooks').selectOption('chapters');
  await expect(page.locator('#grid .card').first()).toContainText('Phong Thần Diễn Nghĩa');

  await page.locator('#grid .card').filter({hasText:'Phong Thần Diễn Nghĩa'}).locator('.info').click();
  await expect(page.locator('#chapterCount')).toContainText('100 chương');
  await page.locator('#chapters .chapter').first().click();
  await expect(page.locator('#reader')).toHaveClass(/show/);
  await expect(page.locator('#rtitle')).toHaveText('Chương 1');
  await expect(page.locator('#rtext')).not.toBeEmpty();
  await page.locator('#next').click();
  await expect(page.locator('#rtitle')).toHaveText('Chương 2');

  await page.locator('#bookmarkBtn').click();
  await expect(page.locator('#bookmarkBtn')).toContainText('Đã đánh dấu');
  await page.locator('.readerbar').getByRole('button',{name:'⚙'}).click();
  await page.locator('#themeSelect').selectOption('light');
  await page.locator('#fontSelect').selectOption('system-ui');
  await page.locator('#ttsRate').selectOption('1.25');
  await page.evaluate(() => {
    const p=JSON.parse(localStorage.getItem('ktf_prog')||'{}');
    p['phong-than-dien-nghia']={chapter:1,percent:100,updated:Date.now()};
    localStorage.setItem('ktf_prog',JSON.stringify(p));
  });
  await page.getByRole('button',{name:'↪ Chương chưa đọc'}).click();
  await expect(page.locator('#rtitle')).toHaveText('Chương 3');
  await page.getByRole('button',{name:/🔊/}).click();
  await expect(page.locator('#ttsLabel')).toHaveText('Dừng');
  await page.getByRole('button',{name:'⛶'}).click();

  const [chapterDownload]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'⬇ Tải chương'}).click()]);
  expect(await chapterDownload.suggestedFilename()).toContain('Phong');

  await page.getByRole('button',{name:'☰ Mục lục'}).click();
  await page.getByRole('button',{name:/↗ Chia sẻ/}).click();
  expect(await page.evaluate(()=>window.__shared?.url)).toContain('#phong-than-dien-nghia/chapter/2');

  await page.getByRole('button',{name:/Lưu cả truyện offline/}).click();
  await page.locator('.actions .btn').nth(3).click();
  await expect(page.locator('#downloadList')).toContainText('Đã lưu đầy đủ',{timeout:30000});

  await page.locator('.actions .btn').nth(4).click();
  await expect(page.locator('#historyList')).toContainText('Chương 3');
  await page.locator('.actions .btn').nth(3).click();
  await expect(page.locator('#bookmarkList')).toContainText('Chương 2');

  await page.locator('.actions .btn').first().click();
  await page.locator('#accountRegisterTab').click();
  await page.locator('#accountDisplay').fill('E2E Admin');
  await page.locator('#accountUser').fill('e2e_admin');
  await page.locator('#accountPass').fill('secret123');
  await page.locator('#accountSubmit').click();
  await expect(page.locator('#accountBody')).toContainText('e2e_admin');
  await page.locator('#accountDisplay').fill('E2E Updated');
  await page.locator('#accountSave').click();
  await page.locator('#accountPassword').click();
  await page.locator('#currentPassword').fill('secret123');
  await page.locator('#newPassword').fill('secret456');
  await page.locator('#passwordSave').click();
  await page.locator('#accountLogout').click();

  await page.locator('.actions .btn').first().click();
  await page.locator('#accountUser').fill('e2e_admin');
  await page.locator('#accountPass').fill('secret456');
  await page.locator('#accountSubmit').click();
  await expect(page.locator('#accountBody')).toContainText('e2e_admin');
  await page.locator('#accountClose').click();

  await page.locator('.actions .btn').nth(2).click();
  await expect(page.locator('#adBook')).toBeVisible();
  await page.locator('#adTitle').fill('E2E UI Story');
  await page.locator('#adAuthor').fill('E2E');
  await page.locator('#adCat').fill('Tiên hiệp / Thần ma');
  await page.locator('#adCreate').click();
  await expect(page.locator('#adOut')).toContainText('Đã tạo');

  const txt=['Chương 1','Nội dung chương một đủ dài để kiểm tra import trong giao diện quản trị.','Chương 2','Nội dung chương hai đủ dài để kiểm tra import trong giao diện quản trị.'].join('\n');
  await page.locator('#adFile').setInputFiles({name:'e2e-import.txt',mimeType:'text/plain',buffer:Buffer.from(txt)});
  await page.locator('#adPreview').click();
  await expect(page.locator('#adOut')).toContainText('"total": 2');
  await page.locator('#adImport').click();
  await expect(page.locator('#adOut')).toContainText('Import thành công: 2 chương');
  await page.locator('#adDiag').click();
  await expect(page.locator('#adOut')).toContainText('"stories"');
  const [backup]=await Promise.all([page.waitForEvent('download'),page.locator('#adBackup').click()]);
  expect(await backup.suggestedFilename()).toContain('backup');
  await page.locator('#adClose').click();
  await context.close();
});

test('static fallback mode: real public seed, search, read, PWA cache and offline full book', async ({ browser }) => {
  const context=await browser.newContext();
  await context.addInitScript(() => localStorage.setItem('ktf_api_base','http://127.0.0.1:9/api/v1'));
  const page=await context.newPage();
  await page.goto('/');
  await expect(page.locator('#apiStatus')).toContainText('Dữ liệu tĩnh');
  await expect(page.locator('#grid .card')).toHaveCount(4);
  await expect(page.locator('#grid')).toContainText('Phong Thần Diễn Nghĩa');
  await expect(page.locator('#statChapters')).toHaveText('126');

  await page.locator('#search').fill('Phong Thần');
  await expect(page.locator('#grid .card')).toHaveCount(1);
  await page.locator('#search').fill('');
  await page.locator('#categoryFilter').selectOption({label:'Tiên hiệp / Thần ma'});
  await expect(page.locator('#grid .card')).toHaveCount(1);
  await page.locator('#grid .card').first().locator('.info').click();
  await expect(page.locator('#chapterCount')).toContainText('100 chương');
  await page.locator('#chapters .chapter').first().click();
  await expect(page.locator('#rtitle')).not.toBeEmpty();
  await expect(page.locator('#rtext')).not.toBeEmpty();
  await page.getByRole('button',{name:'☰ Mục lục'}).click();
  await page.getByRole('button',{name:/Lưu cả truyện offline/}).click();
  await page.locator('.actions .btn').nth(3).click();
  await expect(page.locator('#downloadList')).toContainText('Đã lưu đầy đủ',{timeout:30000});

  const cache=await page.evaluate(async()=>{await navigator.serviceWorker.ready;const keys=await caches.keys();return {keys,seed:!!await caches.match('./public-domain-seed.json')};});
  expect(cache.keys.some(k=>k.includes('kho-truyen-1.20.0'))).toBeTruthy();
  expect(cache.seed).toBeTruthy();
  await context.close();
});


test('mobile responsive: bottom navigation, reader, bookmark and persistence', async ({ browser }) => {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true});
  await context.addInitScript(() => localStorage.setItem('ktf_api_base','http://127.0.0.1:9/api/v1'));
  const page=await context.newPage();
  await page.goto('/');
  await expect(page.locator('.bottomnav')).toBeVisible();
  await expect(page.locator('.bottomnav button')).toHaveCount(4);
  await expect(page.locator('#grid .card')).toHaveCount(3);

  await page.locator('.bottomnav button').nth(3).click();
  await expect(page.locator('#search')).toBeFocused();
  await page.locator('#search').fill('Mùa Sao');
  await expect(page.locator('#grid .card')).toHaveCount(1);
  await page.locator('#grid .card').first().locator('.info').click();
  await expect(page.locator('#detail')).toHaveClass(/show/);
  await expect(page.locator('#chapters .chapter').first()).toBeVisible();

  await page.locator('#chapters .chapter').first().click();
  await expect(page.locator('#reader')).toHaveClass(/show/);
  await expect(page.locator('#rtext')).not.toBeEmpty();
  const firstTitle=await page.locator('#rtitle').textContent();
  await page.locator('#next').click();
  await expect(page.locator('#rtitle')).not.toHaveText(firstTitle||'');
  await page.locator('#prev').click();
  await expect(page.locator('#rtitle')).toHaveText(firstTitle||'');

  await page.locator('#bookmarkBtn').click();
  await page.locator('#reader').getByRole('button',{name:'☰ Mục lục'}).click();
  await page.locator('.bottomnav button').nth(1).click();
  await expect(page.locator('#bookmarkList')).toContainText('Ánh đèn cuối thung lũng');

  await page.reload();
  await page.locator('.bottomnav button').nth(1).click();
  await expect(page.locator('#bookmarkList')).toContainText('Ánh đèn cuối thung lũng');

  await page.locator('.bottomnav button').nth(2).click();
  await expect(page.locator('#historyList')).toContainText('Ánh đèn cuối thung lũng');

  const manifest=await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifest).toBe('manifest.webmanifest');
  expect(await page.evaluate(()=>!!navigator.serviceWorker)).toBeTruthy();
  await context.close();
});
