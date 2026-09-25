import { test, expect } from 'playwright/test';

test.describe.configure({mode:'serial'});

test('desktop end-to-end: library, reader, account, admin, offline', async ({ browser }) => {
  const context=await browser.newContext({acceptDownloads:true});
  await context.addInitScript(() => {
    window.__shared=null;
    Object.defineProperty(navigator,'share',{configurable:true,value:async v=>{window.__shared=v;}});
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speaking:false,cancel(){this.speaking=false},resume(){},getVoices(){return [{lang:'vi-VN',name:'CI Vietnamese'}]},speak(){this.speaking=true}}});
    window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;this.lang='';this.rate=1;this.onend=null;}};
    document.documentElement.requestFullscreen=async function(){this.__fullscreen=true;};
    document.exitFullscreen=async function(){document.documentElement.__fullscreen=false;};
  });
  const page=await context.newPage();
  await page.goto('/');
  await expect(page.locator('#grid .card')).toHaveCount(13);
  await expect(page.locator('#statBooks')).toHaveText('13');
  await expect(page.locator('#statChapters')).not.toHaveText('126');
  await expect(page.locator('#grid')).toContainText('Phong Thần Diễn Nghĩa');

  await page.locator('#search').fill('Phong Thần');
  await expect(page.locator('#grid .card')).toHaveCount(1);
  await page.locator('#search').fill('');
  await page.locator('#categoryFilter').selectOption({label:'Tiên hiệp / Thần ma'});
  expect(await page.locator('#grid .card').count()).toBeGreaterThanOrEqual(10);
  await page.locator('#categoryFilter').selectOption('all');
  await page.locator('#sortBooks').selectOption('chapters');
  await expect(page.locator('#grid .card')).toHaveCount(13);

  await page.locator('#grid .card').filter({hasText:'Phong Thần Diễn Nghĩa'}).locator('.info').click();
  await expect(page.locator('#chapterCount')).toContainText('100 chương');
  await page.selectOption('#readerLangSelect','en');
  await expect(page.locator('#detailBox .settings .btn').first()).toContainText('Start reading');
  await expect(page.locator('#chapterCount')).toContainText('chapters');
  await page.selectOption('#langSelect','vi');
  await page.locator('#chapters .chapter').first().click();
  await expect(page.locator('#reader')).toHaveClass(/show/);
  await expect(page.locator('#rtitle')).toHaveText('Chương 1');
  await expect(page.locator('#rtext')).not.toBeEmpty();
  const firstReaderUrl=page.url();
  await page.locator('#next').click();
  await expect(page.locator('#rtitle')).toHaveText('Chương 2');
  await page.goBack();
  await expect(page.locator('#rtitle')).toHaveText('Chương 1');
  expect(page.url()).toBe(firstReaderUrl);
  await page.goForward();
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
  await page.locator('.actions .btn').first().click();
  await page.locator('#accountLogout').click();
  await page.locator('.actions .btn').first().click();
  await page.locator('#accountUser').fill('NGUYENVANHOA');
  await page.locator('#accountPass').fill('123');
  await page.locator('#accountSubmit').click();
  await expect(page.locator('#accountBody')).toContainText('nguyenvanhoa');
  await expect(page.locator('#accountBody')).toContainText('admin');
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
  await expect(page.locator('#grid .card')).toHaveCount(13);
  await expect(page.locator('#grid')).toContainText('Phong Thần Diễn Nghĩa');
  await expect(page.locator('#statChapters')).not.toHaveText('126');

  await page.locator('#search').fill('Phong Thần');
  await expect(page.locator('#grid .card')).toHaveCount(1);
  await page.locator('#search').fill('');
  await page.locator('#categoryFilter').selectOption({label:'Tiên hiệp / Thần ma'});
  expect(await page.locator('#grid .card').count()).toBeGreaterThanOrEqual(10);
  await page.locator('#grid .card').filter({hasText:'Phong Thần Diễn Nghĩa'}).locator('.info').click();
  await expect(page.locator('#chapterCount')).toContainText('100 chương');
  await page.locator('#chapters .chapter').first().click();
  await expect(page.locator('#rtitle')).not.toBeEmpty();
  await expect(page.locator('#rtext')).not.toBeEmpty();
  await page.getByRole('button',{name:'☰ Mục lục'}).click();
  await page.getByRole('button',{name:/Lưu cả truyện offline/}).click();
  await page.locator('.actions .btn').nth(3).click();
  await expect(page.locator('#downloadList')).toContainText('Đã lưu đầy đủ',{timeout:30000});

  const cache=await page.evaluate(async()=>{await navigator.serviceWorker.ready;const keys=await caches.keys();return {keys,seed:!!await caches.match('./public-domain-seed.json')};});
  expect(cache.keys.some(k=>k.includes('kho-truyen-1.22.0'))).toBeTruthy();
  expect(cache.seed).toBeTruthy();
  await context.close();
});


test('all ten public stories: first chapter smoke', async ({ browser }) => {
  test.setTimeout(120000);
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  const page=await context.newPage();
  await context.addInitScript(() => { localStorage.setItem('ktf_api_base','http://127.0.0.1:9/api/v1'); localStorage.setItem('ktf_lang','zh'); });
  const browserErrors=[];page.on('pageerror',e=>browserErrors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')browserErrors.push('console:'+m.text())});
  await page.goto('/');
  const cases=[['Phong Thần Diễn Nghĩa','Phong Thần Diễn Nghĩa'],['Ngô Thừa Ân','Tây Du Ký'],['Đài Sơn Nhân','Hậu Tây Du Ký'],['Đông Du Ký','Đông Du Ký'],['Nam Du Ký','Nam Du Ký'],['Bắc Du Ký','Bắc Du Ký'],['Bát Tiên Đắc Đạo','Bát Tiên Đắc Đạo'],['Nữ Tiên Ngoại Sử','Nữ Tiên Ngoại Sử'],['Lục Dã Tiên Tung','Lục Dã Tiên Tung'],['Tam Toại Bình Yêu Truyện','Tam Toại Bình Yêu Truyện']];
  for(const [query,title] of cases){
    await page.locator('#search').fill(query);
    await expect(page.locator('#grid .card')).toHaveCount(1);
    await page.locator('#grid .card').first().locator('.info').click();
    await page.locator('#chapters .chapter').first().click();
    await expect(page.locator('#reader')).toHaveClass(/show/,{message:query+' browserErrors='+JSON.stringify(browserErrors)+' url='+page.url()});
    await expect(page.locator('#rtext')).not.toBeEmpty();
    await page.locator('#reader .readerbar>.btn').first().click();
    await expect(page.locator('#detail')).toHaveClass(/show/);
    await page.locator('#detail .back').click();
    await expect(page.locator('#library')).toHaveClass(/show/);
  }
  await context.close();
});

test('real translation provider translates the exact text and returns real provider metadata', async ({ request }) => {
  test.setTimeout(120000);
  const login=await request.post('/api/v1/auth/login',{data:{username:'nguyenvanhoa',password:'123'}});
  expect(login.ok()).toBeTruthy();
  const {token}=await login.json();
  const auth={Authorization:'Bearer '+token};
  const created=await request.post('/api/v1/admin/stories',{headers:auth,data:{title:'__E2E_TRANSLATION__',author:'E2E',cat:'E2E'}});
  expect(created.ok()).toBeTruthy();
  const story=await created.json();
  try{
    const added=await request.post('/api/v1/admin/stories/'+encodeURIComponent(story.id)+'/chapters',{headers:auth,data:{title:'Đó là văn bản.',content:'Đó là văn bản.'}});
    expect(added.ok()).toBeTruthy();
    const en=await request.get('/api/v1/stories/'+encodeURIComponent(story.id)+'/chapters/0?lang=en');
    expect(en.ok()).toBeTruthy();
    const enJson=await en.json();
    expect(enJson.translated).toBeTruthy();
    expect(enJson.content).not.toBe('Đó là văn bản.');
    expect(enJson.content).toMatch(/text/i);
    expect(enJson.provider).not.toBe('local-memory');
    const zhSource=await request.post('/api/v1/admin/stories/'+encodeURIComponent(story.id)+'/chapters',{headers:auth,data:{index:1,title:'中文测试',content:'那是文本。'}});expect(zhSource.ok()).toBeTruthy();
    const zhFromCn=await request.get('/api/v1/stories/'+encodeURIComponent(story.id)+'/chapters/1?lang=en');expect(zhFromCn.ok()).toBeTruthy();const zhFromCnJson=await zhFromCn.json();expect(zhFromCnJson.translated).toBeTruthy();expect(zhFromCnJson.content).not.toBe('那是文本。');expect(zhFromCnJson.content).toMatch(/text/i);
    const zh=await request.get('/api/v1/stories/'+encodeURIComponent(story.id)+'/chapters/0?lang=zh-CN');
    expect(zh.ok()).toBeTruthy();
    const zhJson=await zh.json();
    expect(zhJson.translated).toBeTruthy();
    expect(zhJson.content).not.toBe('Đó là văn bản.');
    expect(zhJson.content).toMatch(/[\u3400-\u9fff]/);
    expect(zhJson.provider).not.toBe('local-memory');

    // UI/TTS is covered by separate browser regression tests; this test isolates the real translation provider.

  }finally{
    await fetch('http://127.0.0.1:8787/api/v1/admin/stories/'+encodeURIComponent(story.id),{method:'DELETE',headers:auth}).catch(()=>{});
  }
});
test('live browser translation provider is reachable without mocks', async ({ browser }) => {
  const context=await browser.newContext();
  const page=await context.newPage();
  await page.goto('/');
  const result=await page.evaluate(async()=>{
    const q=encodeURIComponent('Đó là văn bản.');
    const u='https://api.mymemory.translated.net/get?q='+q+'&langpair=vi%7Cen';
    const r=await fetch(u,{headers:{Accept:'application/json'}});
    const j=await r.json();
    return {ok:r.ok,status:r.status,text:String(j?.responseData?.translatedText||'')};
  });
  expect(result.ok).toBeTruthy();
  expect(result.status).toBe(200);
  expect(result.text).not.toBe('Đó là văn bản.');
  expect(result.text).toMatch(/[A-Za-z]/);
  await context.close();
});

test('live Chinese TTS audio endpoint returns playable audio', async ({ request }) => {
  const text=String.fromCharCode(0x90a3,0x662f,0x6587,0x672c,0x3002);
  const url='https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=zh-CN&q='+encodeURIComponent(text);
  const response=await request.get(url,{timeout:15000});
  expect(response.ok()).toBeTruthy();
  const body=await response.body();
  expect(body.length).toBeGreaterThan(1000);
});

test('static reader uses Lingva translation when Google translation is unavailable', async ({ browser }) => {
  const context=await browser.newContext();
  await context.addInitScript(() => localStorage.setItem('ktf_api_base','http://127.0.0.1:9/api/v1'));
  const page=await context.newPage();
  await page.route('https://lingva.ml/api/v1/**',async route=>{
    const u=new URL(route.request().url()),parts=u.pathname.split('/');
    const target=parts[4]||'en';
    const body=target==='zh'?String.fromCharCode(0x90a3,0x662f,0x6587,0x672c,0x3002):'That is the text.';
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({translation:body})});
  });
  await page.route('https://translate.googleapis.com/**',route=>route.abort());
  await page.goto('/');
  await page.locator('#grid .card').filter({hasText:'Mùa Sao Trên Đỉnh Núi'}).locator('.info').click();
  await page.locator('#chapters .chapter').first().click();
  await page.locator('#rtext').evaluate(el=>el.textContent='Đó là văn bản.');
  await page.selectOption('#langSelect','en');
  await expect(page.locator('#rtext')).toContainText('That is the text.');
  await page.selectOption('#langSelect','zh');
  await expect(page.locator('#rtext')).toContainText(String.fromCharCode(0x90a3,0x662f,0x6587,0x672c,0x3002));
  await context.close();
});

test('TTS uses Google Chinese audio when system Chinese voice is missing', async ({ browser }) => {
  const context=await browser.newContext();
  await context.addInitScript(() => {
    localStorage.setItem('ktf_api_base','http://127.0.0.1:9/api/v1');
    window.__audioUrl=null;
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
      speaking:false,cancel(){this.speaking=false},resume(){},getVoices(){return []},speak(){this.speaking=true}
    }});
    window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;this.lang='';this.rate=1;this.onend=null;this.onerror=null;}};
    const RealAudio=window.Audio;
    window.Audio=function(url){window.__audioUrl=url;const a=new RealAudio();a.play=()=>Promise.resolve();return a};
  });
  const page=await context.newPage();
  let audioRequests=0;
  await page.route('https://translate.google.com/translate_tts/**',async route=>{audioRequests++;return route.fulfill({status:200,contentType:'audio/mpeg',body:Buffer.from([73,68,51,3,0,0,0,0,0,0,0,0])})});
  await page.goto('/');
  await page.locator('#grid .card').filter({hasText:'Mùa Sao Trên Đỉnh Núi'}).locator('.info').click();
  await page.locator('#chapters .chapter').first().click();
  await page.locator('#rtext').evaluate(el=>{el.textContent=String.fromCharCode(0x90a3,0x662f,0x6587,0x672c,0x3002)});
  await page.getByRole('button',{name:/🔊/}).click();
  await expect.poll(()=>audioRequests).toBe(1);
  await expect.poll(()=>page.evaluate(()=>String(window.__audioUrl||''))).toContain('tl=zh-CN');
  await context.close();
});

test('chapter ordering and chapter search', async ({ browser }) => {
  const context=await browser.newContext();
  const page=await context.newPage();
  await page.goto('/');
  await page.locator('#grid .card').filter({hasText:'Mùa Sao Trên Đỉnh Núi'}).locator('.info').click();
  await expect(page.locator('#chapters .chapter').first()).toContainText('chương 1');
  await page.locator('#chapterSearch').fill('Vệt sáng trong rừng');
  await expect(page.locator('#chapters .chapter')).toHaveCount(1);
  await expect(page.locator('#chapters .chapter').first()).toContainText('Vệt sáng trong rừng');
  await page.locator('#chapterSearch').fill('');
  await page.locator('#detail .chapterTools button').click();
  await expect(page.locator('#chapters .chapter').first()).toContainText('chương 10');
  await page.locator('#detail .chapterTools button').click();
  await expect(page.locator('#chapters .chapter').first()).toContainText('chương 1');
  await context.close();
});

test('offline download can cancel and resume', async ({ browser }) => {
  const context=await browser.newContext();
  const page=await context.newPage();
  await page.goto('/');
  const bookId='phong-than-dien-nghia';
  await page.evaluate(async id=>{if(window.removeOffline)await window.removeOffline(id)},bookId);
  await page.locator('#grid .card').filter({hasText:'Phong Thần Diễn Nghĩa'}).locator('.info').click();
  await page.evaluate(id=>{window.downloadBook(id);setTimeout(()=>window.cancelOffline(id),80)},bookId);
  await expect(page.locator('#downloadList')).toContainText('Đã dừng',{timeout:15000});
  await page.evaluate(()=>window.showBookcase());
  await page.locator('#downloadList .btn').first().click();
  await expect(page.locator('#downloadList')).toContainText('Đã lưu đầy đủ',{timeout:60000});
  await context.close();
});

test('mobile responsive: bottom navigation, reader, bookmark and persistence', async ({ browser }) => {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true});
  await context.addInitScript(() => localStorage.setItem('ktf_api_base','http://127.0.0.1:9/api/v1'));
  const page=await context.newPage();
  await page.goto('/');
  await expect(page.locator('.bottomnav')).toBeVisible();
  await expect(page.locator('.bottomnav button')).toHaveCount(4);
  await expect(page.locator('#grid .card')).toHaveCount(13);

  await page.locator('.bottomnav button').nth(3).click();
  await expect(page.locator('#search')).toBeFocused();
  await page.locator('#search').fill('Mùa Sao');
  await expect(page.locator('#grid .card')).toHaveCount(1);
  await page.locator('#grid .card').first().locator('.info').click();
  await expect(page.locator('#detail')).toHaveClass(/show/);
  await expect(page.locator('#chapters .chapter').first()).toBeVisible();

  await page.locator('#chapters .chapter').first().click();
  await expect(page.locator('#reader')).toHaveClass(/show/);
  await expect(page.locator('#library')).toBeHidden();
  await expect(page.locator('#detail')).toBeHidden();
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


test('remaining navigation and chapter controls', async ({ browser }) => {
  const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
  await context.addInitScript(() => localStorage.setItem('ktf_api_base','http://127.0.0.1:9/api/v1'));
  const page=await context.newPage();
  await page.goto('/');
  await page.selectOption('#langSelect','en');
  await expect(page.locator('#libraryTitle')).toHaveText('Full Story Library');
  await page.reload();
  await expect(page.locator('#libraryTitle')).toHaveText('Full Story Library');
  await page.selectOption('#langSelect','zh');
  await expect(page.locator('#libraryTitle')).toHaveText('完本书库');
  await page.selectOption('#langSelect','vi');
  await page.getByRole('button',{name:'Xếp hạng'}).click();
  await expect(page.locator('#homeMode')).not.toBeEmpty();
  await page.getByRole('button',{name:'Mới cập nhật'}).click();
  await expect(page.locator('#homeMode')).not.toBeEmpty();
  await page.getByRole('button',{name:'Đang đọc'}).click();
  await expect(page.locator('#grid .card')).toHaveCount(0);

  await page.getByRole('button',{name:'Khám phá'}).click();
  await page.locator('#grid .card').filter({hasText:'Phong Thần Diễn Nghĩa'}).locator('.info').click();
  await expect(page.locator('#chapterCount')).toContainText('100 chương');
  await page.locator('#chapterSearch').fill('100');
  await expect(page.locator('#chapters .chapter')).toHaveCount(1);
  await expect(page.locator('#chapters')).toContainText('Chương 100');
  await page.locator('#chapterSearch').fill('');
  await page.locator('.chapterTools .btn').click();
  await expect(page.locator('#chapters .chapter').first()).toContainText('Chương 100');
  await page.locator('.chapterTools .btn').click();
  await expect(page.locator('#chapters .chapter').first()).toContainText('chương 1');

  await page.locator('#chapters .chapter').first().click();
  await page.locator('#readerSeek').evaluate((el)=>{el.value='5';el.dispatchEvent(new Event('change',{bubbles:true}))});
  await expect(page.locator('#rtitle')).not.toBeEmpty();
  await page.locator('#readerSeek').evaluate((el)=>{el.value='0';el.dispatchEvent(new Event('change',{bubbles:true}))});
  await expect(page.locator('#rtitle')).not.toBeEmpty();
  await context.close();
});


test('reader scroll performance: focused mode and debounced persistence', async ({ browser }) => {
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  await context.addInitScript(() => {
    localStorage.setItem('ktf_api_base','http://127.0.0.1:9/api/v1');
    window.__setItemCalls=0;
    window.__apiCalls=0;
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(...args){window.__setItemCalls++;return original.apply(this,args)};
    const realFetch=window.fetch.bind(window);
    window.fetch=(input,init)=>{const u=String(typeof input==='string'?input:input?.url||'');if(u.includes('/api/v1/'))window.__apiCalls++;return realFetch(input,init)};
  });
  const page=await context.newPage();
  await page.goto('/');
  await page.evaluate(()=>window.__apiCalls=0);
  await page.locator('#grid .card').filter({hasText:'Mùa Sao Trên Đỉnh Núi'}).locator('.info').click();
  await page.locator('#chapters .chapter').first().click();
  expect(await page.evaluate(()=>window.__apiCalls)).toBe(0);
  await expect(page.locator('body')).toHaveClass(/reading-mode/);
  await expect(page.locator('.top')).toBeHidden();
  await page.locator('#rtext').scrollIntoViewIfNeeded();
  const before=await page.evaluate(()=>window.__setItemCalls);
  await page.evaluate(() => {
    window.scrollBy(0,120);
    window.scrollBy(0,120);
    window.scrollBy(0,120);
  });
  const during=await page.evaluate(b=>window.__setItemCalls-b,before);
  expect(during).toBe(0);
  await page.waitForTimeout(450);
  const after=await page.evaluate(b=>window.__setItemCalls-b,before);
  expect(after).toBeLessThanOrEqual(2);
  await context.close();
});

test('reader auto advance and tts continuation', async ({ browser }) => {
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  await context.addInitScript(() => {
    localStorage.setItem('ktf_api_base','http://127.0.0.1:9/api/v1');
    window.__ttsCycles=0;
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
      speaking:false,
      cancel(){this.speaking=false},
      resume(){},
      speak(u){this.speaking=true;window.__ttsCycles++;window.__lastUtterance=u;}
    }});
    window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;this.onend=null;this.onerror=null;this.lang='';this.rate=1;}};
  });
  const page=await context.newPage();
  await page.goto('/');
  await page.locator('#grid .card').filter({hasText:'Mùa Sao Trên Đỉnh Núi'}).locator('.info').click();
  await page.locator('#chapters .chapter').first().click();
  await expect(page.locator('#rtext')).not.toBeEmpty();
  const first=await page.locator('#rtitle').textContent();
  await page.getByRole('button',{name:/🔊/}).click();
  await expect(page.locator('#ttsLabel')).toHaveText('Dừng');
  await page.evaluate(()=>window.__lastUtterance?.onend?.());
  await expect(page.locator('#rtitle')).toHaveText('Vệt sáng trong rừng',{timeout:5000});
  await expect(page.locator('#ttsLabel')).toHaveText('Dừng');
  await expect.poll(()=>page.evaluate(()=>window.__ttsCycles)).toBe(2);
  await page.getByRole('button',{name:/🔊/}).click();
  await expect(page.locator('#ttsLabel')).toHaveText('Đọc');
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  await expect(page.locator('#rtitle')).not.toHaveText('Vệt sáng trong rừng',{timeout:5000});
  await expect(page.locator('#readPosition')).toContainText('3 / 10');
  await context.close();
});
