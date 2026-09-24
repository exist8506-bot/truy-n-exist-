/* Kho Truyen Full 1.6.5 - compact application shell */
(()=> {
'use strict';
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const localBooks=()=>Array.isArray(window.books)?window.books:[];
const state={books:[],book:null,chapter:0,chapters:[],remoteSearch:false,order:'asc',filter:'all',sort:'title',mode:'all',fontSize:+localStorage.getItem('ktf_fs')||19,font:localStorage.getItem('ktf_font')||'Georgia',theme:localStorage.getItem('ktf_theme')||'dark',rate:+localStorage.getItem('ktf_rate')||1,continuous:false,user:null,token:localStorage.getItem('ktf_token')||'',offline:new Set()};
const apiBase=()=>window.KhoAPI?.base?.()||'/api/v1';
const api=async(path,opt={})=>{const h={'Accept':'application/json',...(opt.headers||{})};if(state.token)h.Authorization='Bearer '+state.token;const r=await fetch(apiBase()+path,{...opt,headers:h});if(!r.ok){let m='HTTP_'+r.status;try{const j=await r.json();m=j.error||j.message||m}catch{}throw Error(m)}return r.status===204?null:r.json()};
function toast(x){const t=$('#toast');if(!t)return;t.textContent=x;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2200)}
function save(k,v){localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v))}
function get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return localStorage.getItem(k)??d}}
function favs(){return get('ktf_favs',[])} function setFavs(v){save('ktf_favs',v)}
function hist(){return get('ktf_hist',[])} function setHist(v){save('ktf_hist',v)}
function progress(){return get('ktf_prog',{})} function setProgress(v){save('ktf_prog',v)}
function show(id){['library','detail','reader','history','bookcase'].forEach(x=>$('#'+x)?.classList.remove('show'));$('#'+id)?.classList.add('show');scrollTo(0,0)}
window.home=()=>{show('library');renderAll()}; window.focusSearch=()=>{$('#search')?.focus();show('library')};
window.showHistory=()=>{show('history');renderHistory()}; window.showBookcase=()=>{show('bookcase');renderBookcase()};window.openAdmin=()=>window.adminStudio?.();
function normalizeBook(b){const count=Number(b.chapterCount??(Array.isArray(b.chapters)?b.chapters.length:b.chapters??0));return {...b,chapterCount:count,chapters:Array.isArray(b.chapters)?b.chapters:[]}}
async function loadBooks(){
 try{
  const out=[];let page=1,total=0;
  do{
   const j=await api('/stories?page='+page+'&pageSize=100');
   const items=j.items||j.books||j.stories||j.data||[];
   out.push(...items);
   total=Number(j.count??j.total??out.length);
   page++;
   if(!items.length||items.length<100||out.length>=total)break;
  }while(page<10000);
  state.books=out.map(normalizeBook);state.remoteSearch=false;$('#apiStatus').textContent='● SQLite API';renderFilterOptions();
 }catch{state.books=localBooks().map(normalizeBook);$('#apiStatus').textContent='● Dữ liệu local'}
 updateStats(); return state.books;
}
function updateStats(){const n=state.books.reduce((a,b)=>a+(Array.isArray(b.chapters)?b.chapters.length:(b.chapterCount||0)),0);$('#statBooks').textContent=state.books.length;$('#statChapters').textContent=n;$('#statFav').textContent=favs().length;$('#statDownloaded').textContent=get('ktf_offline',[]).length}
function filtered(){
 let a=state.books.filter(b=>state.filter==='all'||String(b.status||'').toUpperCase()===state.filter);
 const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('vi');const q=norm($('#search')?.value||'');if(q)a=a.filter(b=>norm(b.title+' '+b.author+' '+b.cat+' '+(b.desc||'')).includes(q));
 if(state.mode==='reading'){const p=progress();a=a.filter(b=>p[b.id]?.percent>0)}
 if(state.mode==='new')a=a.slice().sort((a,b)=>String(b.updated_at||b.updated||'').localeCompare(String(a.updated_at||a.updated||'')));
 else if(state.sort==='chapters')a.sort((a,b)=>(b.chapterCount||b.chapters?.length||0)-(a.chapterCount||a.chapters?.length||0));
 else if(state.sort==='author')a.sort((a,b)=>String(a.author).localeCompare(String(b.author),'vi'));
 else a.sort((a,b)=>String(a.title).localeCompare(String(b.title),'vi'));
 return a;
}
function card(b){const on=favs().includes(b.id), p=progress()[b.id]?.percent||0;return '<div class="card"><div class="cover" style="background:'+esc(b.tone||'linear-gradient(145deg,#182848,#4b6cb7)')+'"><span class="book">📖</span><span class="tag">'+esc(b.cat||'Truyện')+'</span><button class="favbtn '+(on?'on':'')+'" onclick="event.stopPropagation();toggleFav(\''+esc(b.id)+'\')">'+(on?'♥':'♡')+'</button><h3>'+esc(b.title)+'</h3></div><div class="info" onclick="openBook(\''+esc(b.id)+'\')" style="cursor:pointer"><b>'+esc(b.title)+'</b><div class="muted">'+esc(b.author||'')+'</div><div class="meta"><span>'+((b.chapterCount||b.chapters?.length||0))+' chương</span><span class="status">'+esc(b.status||'FULL')+'</span></div><div class="mini-progress"><i style="width:'+p+'%"></i></div></div></div>'}
function renderFilterOptions(){
 const c=$('#categoryFilter');if(c){const current=c.value, cats=[...new Set(state.books.map(b=>b.cat).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'vi'));c.innerHTML='<option value="all">Tất cả thể loại</option>'+cats.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');if(cats.includes(current))c.value=current}
}
let searchTimer=0;
async function refreshRemoteSearch(){
 if(!state.remoteSearch)return;
 const q=($('#search')?.value||'').trim(),cat=$('#categoryFilter')?.value||'all',status=$('#statusFilter')?.value||'all',sort=$('#sortBooks')?.value||'title';
 const params=new URLSearchParams({page:'1',pageSize:'100',sort});if(q)params.set('q',q);if(cat!=='all')params.set('category',cat);if(status!=='all')params.set('status',status);
 try{
  const j=await api('/stories?'+params.toString());state.books=(j.items||[]).map(normalizeBook);$('#apiStatus').textContent='● SQLite API · '+Number(j.count||0)+' kết quả';renderFilterOptions();const c=$('#categoryFilter');if(c)c.value=cat;renderLibraryGridOnly();
 }catch{toast('Không thể tìm kiếm từ máy chủ')}
}
function renderLibraryGridOnly(){const a=filtered();$('#grid').innerHTML=a.length?a.map(card).join(''):'<div class="empty">Không tìm thấy truyện phù hợp.</div>';$('#pager').innerHTML='';renderHomeMode();updateStats()}
window.renderLibrary=()=>{state.remoteSearch=true;renderLibraryGridOnly();clearTimeout(searchTimer);searchTimer=setTimeout(refreshRemoteSearch,180)};
window.setAdvancedFilter=()=>{state.remoteSearch=true;refreshRemoteSearch()};

function renderHomeMode(){
 const c=$('#homeMode');if(!c)return;
 if(state.mode==='all'){c.innerHTML='<div class="panel"><h3>✨ Khám phá</h3><div class="muted">Kho truyện được sắp xếp theo lựa chọn bên dưới.</div></div>';return}
 if(state.mode==='rank'){const a=state.books.slice().sort((x,y)=>(y.chapterCount||0)-(x.chapterCount||0)).slice(0,5);c.innerHTML='<div class="panel"><h3>📈 Xếp hạng theo số chương</h3>'+a.map((b,i)=>'<div class="rankrow"><span class="rankno">'+(i+1)+'</span><span class="rankcover">📖</span><span class="grow"><b>'+esc(b.title)+'</b><div class="muted">'+esc(b.author)+'</div></span><b>'+(b.chapterCount||0)+'</b></div>').join('')+'</div>';return}
 if(state.mode==='reading'){const p=progress();const a=state.books.filter(b=>p[b.id]?.percent>0).sort((x,y)=>(p[y.id]?.percent||0)-(p[x.id]?.percent||0)).slice(0,6);c.innerHTML='<div class="panel"><h3>📖 Đang đọc</h3>'+(a.length?a.map(b=>'<div class="rankrow"><span class="rankcover">📚</span><span class="grow"><b>'+esc(b.title)+'</b><div class="muted">'+Math.round(p[b.id].percent||0)+'% · chương '+(Number(p[b.id].chapter||0)+1)+'</div></span><button class="btn" onclick="openBook(\''+esc(b.id)+'\')">Mở</button></div>').join(''):'<div class="empty">Chưa có truyện đang đọc.</div>')+'</div>';return}
 if(state.mode==='new'){
  const a=state.books.slice().sort((x,y)=>String(y.updatedAt||y.updated_at||'').localeCompare(String(x.updatedAt||x.updated_at||''))).slice(0,6);
  c.innerHTML='<div class="panel"><h3>🆕 Mới cập nhật</h3>'+a.map(b=>'<div class="rankrow"><span class="rankcover">🆕</span><span class="grow"><b>'+esc(b.title)+'</b><div class="muted">'+esc(b.author)+' · '+(b.chapterCount||0)+' chương</div></span><button class="btn" onclick="openBook(\''+esc(b.id)+'\')">Đọc</button></div>').join('')+'</div>';return
 }
}window.setHomeMode=m=>{state.mode=m;state.remoteSearch=false;document.querySelectorAll('.seg button').forEach(x=>x.classList.remove('active'));$('#seg'+({all:'All',reading:'Reading',rank:'Rank',new:'New'}[m]||'All'))?.classList.add('active');renderLibrary()};
window.setDataFilter=x=>{state.filter=x;renderLibrary()};window.setDataSort=x=>{state.sort=x;renderLibrary();if(state.remoteSearch)refreshRemoteSearch()};
window.toggleFav=async id=>{let a=favs();const active=!a.includes(id);a=active?[...a,id]:a.filter(x=>x!==id);setFavs(a);updateStats();renderLibrary();if(state.token)try{await api('/favorites',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({storyId:id,active})})}catch{toast('Đã lưu cục bộ, sẽ đồng bộ khi online')}};
async function openBook(id){show('detail');let b=state.books.find(x=>x.id===id);try{b=normalizeBook(await api('/stories/'+encodeURIComponent(id)));}catch{}state.book=b;try{const out=[];let page=1,total=1;do{const j=await api('/stories/'+encodeURIComponent(id)+'/chapters?page='+page+'&pageSize=100');const items=j.items||[];out.push(...items);total=Number(j.count??items.length);if(!j.items)break;page++;if(!items.length)break}while(out.length<total);state.chapters=out}catch{state.chapters=[]}$('#detailBox').innerHTML='<div class="detailbox"><div class="detailcover" style="background:'+esc(b.tone||'#26324b')+'"><span style="font-size:48px">📚</span><span>'+esc(b.cat||'Truyện')+'</span></div><div><div class="badges"><span class="badge good">'+esc(b.status||'FULL')+'</span><span class="badge">'+esc(b.author||'')+'</span></div><h2>'+esc(b.title)+'</h2><p class="muted">'+esc(b.desc||'')+'</p><div class="settings"><button class="btn primary" onclick="startBook(0)">▶ Đọc từ đầu</button><button class="btn" onclick="continueBook()">↪ Đọc tiếp</button><button class="btn" onclick="toggleFav(\''+esc(b.id)+'\');openBook(\''+esc(b.id)+'\')">'+(favs().includes(b.id)?'♥ Bỏ tủ':'♡ Thêm tủ')+'</button><button class="btn" onclick="shareCurrent()">↗ Chia sẻ</button></div></div></div>';b.chapterCount=state.chapters.length;renderChapters()}
window.openBook=openBook;window.openDetail=()=>state.book&&openBook(state.book.id);
window.renderChapters=()=>{let a=state.chapters.slice();const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('vi');const q=norm($('#chapterSearch')?.value||'');if(q)a=a.filter(c=>norm(c.title||'').includes(q)||String(Number(c.index??c.chapter??0)+1).includes(q));if(state.order==='desc')a.reverse();$('#chapterCount').textContent=state.chapters.length+' chương';$('#chapters').innerHTML=a.map(c=>'<button class="chapter" onclick="readChapter('+(c.index??c.chapter??0)+')">Chương '+(Number(c.index??c.chapter??0)+1)+' · '+esc(c.title||'')+'</button>').join('')||'<div class="empty">Chưa có chương.</div>'};
window.toggleOrder=()=>{state.order=state.order==='asc'?'desc':'asc';renderChapters()};
window.startBook=i=>readChapter(i);window.continueBook=()=>readChapter(progress()[state.book.id]?.chapter||0);
async function readChapter(i){if(!state.book)return;let j;try{j=await api('/stories/'+encodeURIComponent(state.book.id)+'/chapters/'+i);offlinePut(state.book.id,i,j).catch(()=>{})}catch{j=await offlineGet(state.book.id,i).catch(()=>null);if(!j){const c=state.chapters.find(x=>(x.index??x.chapter)===i)||state.book.chapters?.[i];j={chapter:c,index:i,title:c?.title||('Chương '+(i+1)),content:c?.content||c?.[1]||''}}}state.chapter=i;state.current=j;show('reader');$('#rbook').textContent=state.book.title;$('#rtitle').textContent=j.title||('Chương '+i);$('#rmeta').textContent='Chương '+(i+1)+' · '+(state.book.author||'');$('#rtext').innerHTML=String(j.content||'').split(/\n+/).filter(Boolean).map(x=>'<p>'+esc(x)+'</p>').join('');applyReader();recordRead();updateReaderProgress();restoreScroll();history.pushState({},'',location.pathname+'#'+encodeURIComponent(state.book.id)+'/chapter/'+i)}
window.readChapter=readChapter;
function recordRead(){const h=hist().filter(x=>!(x.bookId===state.book.id&&x.chapter===state.chapter));h.unshift({bookId:state.book.id,chapter:state.chapter,title:state.current?.title||'',at:Date.now()});setHist(h.slice(0,50));const p=progress();p[state.book.id]={chapter:state.chapter,percent:0,updated:Date.now()};setProgress(p);if(state.token)syncProgress().catch(()=>{})}
function updateReaderProgress(){const p=progress()[state.book.id]||{}, n=state.chapters.length||state.book.chapterCount||state.book.chapters?.length||1;const pct=Math.min(100,Math.round(((state.chapter+1)/n)*100));$('#rprogress').style.width=pct+'%';$('#readPosition').textContent='Chương '+(state.chapter+1)+' / '+n+' · '+pct+'%';$('#prev').disabled=state.chapter<=0;$('#autoNext').style.display=state.chapter<n-1?'flex':'none'}
window.goChapter=d=>{const n=state.chapters.length||state.book?.chapters?.length||state.book?.chapterCount||0;const x=state.chapter+d;if(x>=0&&x<n)readChapter(x);else toast('Đã đến cuối truyện')};
window.font=d=>{state.fontSize=Math.max(14,Math.min(30,state.fontSize+d));save('ktf_fs',state.fontSize);applyReader()};window.setFont=x=>{state.font=x;save('ktf_font',x);applyReader()};window.setTheme=x=>{state.theme=x;save('ktf_theme',x);applyReader()};window.setTTSRate=x=>{state.rate=+x;save('ktf_rate',state.rate);if(speechSynthesis.speaking)speak()};
window.toggleSettings=()=>{const x=$('#settings');x.style.display=x.style.display==='none'?'flex':'none'};
function applyReader(){const r=$('#reader'),a=$('#rtext');if(!a)return;a.style.fontSize=state.fontSize+'px';a.style.fontFamily=state.font;r.classList.toggle('continuous',state.continuous);if(state.theme==='light'){r.style.background='#fff';r.style.color='#172033';a.style.color='#263241'}else if(state.theme==='sepia'){r.style.background='#f3ead7';r.style.color='#4b3a28';a.style.color='#4b3a28'}else{r.style.background='var(--reader)';r.style.color='var(--text)';a.style.color='var(--readerText)'}$('#themeSelect').value=state.theme;$('#fontSelect').value=state.font;$('#ttsRate').value=String(state.rate)}
window.toggleContinuous=()=>{state.continuous=!state.continuous;applyReader()};
window.speak=()=>{if(!window.speechSynthesis)return toast('Thiết bị không hỗ trợ TTS');speechSynthesis.cancel();const u=new SpeechSynthesisUtterance($('#rtext').innerText);u.lang='vi-VN';u.rate=state.rate;speechSynthesis.speak(u);$('#ttsLabel').textContent='Dừng';u.onend=()=>$('#ttsLabel').textContent='Đọc'};
let scrollSaveTimer=0;
function scrollKey(){return state.book?state.book.id+':'+state.chapter:null}
function saveScroll(){const k=scrollKey();if(!k)return;const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);const pct=Math.round((scrollY/max)*1000)/10;const p=progress();p[state.book.id]={chapter:state.chapter,percent:Math.max(0,Math.min(100,pct)),updated:Date.now()};setProgress(p);$('#rprogress').style.width=Math.min(100,pct)+'%';$('#readPosition').textContent='Chương '+(state.chapter+1)+' / '+(state.chapters.length||state.book.chapterCount||1)+' · '+Math.round(pct)+'%';if(state.token){clearTimeout(scrollSaveTimer);scrollSaveTimer=setTimeout(()=>syncProgress().catch(()=>{}),600)}}
function restoreScroll(){const p=progress()[state.book?.id];if(!p||p.chapter!==state.chapter)return;requestAnimationFrame(()=>{const max=Math.max(0,document.documentElement.scrollHeight-innerHeight);scrollTo(0,max*(Math.max(0,Math.min(100,p.percent))/100))})}
window.addEventListener('scroll',()=>{if($('#reader')?.classList.contains('show'))saveScroll()},{passive:true});
const OFFDB='ktf_offline_v1';
function offlineOpen(){return new Promise((resolve,reject)=>{if(!indexedDB)return reject(Error('NO_INDEXEDDB'));const r=indexedDB.open(OFFDB,1);r.onupgradeneeded=()=>r.result.createObjectStore('chapters',{keyPath:'key'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function offlinePut(bookId,index,data){const db=await offlineOpen();return new Promise((res,rej)=>{const tx=db.transaction('chapters','readwrite');tx.objectStore('chapters').put({key:bookId+':'+index,bookId,index,data,at:Date.now()});tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function offlineGet(bookId,index){const db=await offlineOpen();return new Promise((res,rej)=>{const tx=db.transaction('chapters');const r=tx.objectStore('chapters').get(bookId+':'+index);r.onsuccess=()=>res(r.result?.data||null);r.onerror=()=>rej(r.error)})}
window.downloadChapter=()=>{const text=state.book.title+'\n'+$('#rtitle').textContent+'\n\n'+$('#rtext').innerText;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));a.download=(state.book.title+'-'+state.chapter+'.txt').replace(/[^\w\-À-ỹ ]/g,'_');a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);toast('Đã tải chương')};
window.shareCurrent=async()=>{const u=location.href;if(navigator.share)try{await navigator.share({title:state.book?.title||'Kho Truyện Full',url:u})}catch{}else{await navigator.clipboard?.writeText(u);toast('Đã sao chép liên kết')}};
function renderHistory(){const h=hist();$('#historyList').innerHTML=h.length?h.map(x=>{const b=state.books.find(b=>b.id===x.bookId);return '<div class="histrow"><div><b>'+esc(b?.title||x.bookId)+'</b><div class="muted">Chương '+x.chapter+' · '+esc(x.title)+'</div></div><button class="btn" onclick="openBook(\''+esc(x.bookId)+'\').then(()=>readChapter('+x.chapter+'))">Đọc</button></div>'}).join(''):'<div class="empty">Chưa có lịch sử.</div>'}
window.clearHistory=()=>{setHist([]);renderHistory();toast('Đã xóa lịch sử')};
function renderBookcase(){const a=favs();$('#favList').innerHTML=a.length?a.map(id=>{const b=state.books.find(x=>x.id===id);return b?'<div class="histrow"><div><b>'+esc(b.title)+'</b><div class="muted">'+esc(b.author)+'</div></div><button class="btn" onclick="openBook(\''+esc(id)+'\')">Mở</button></div>':''}).join(''):'<div class="empty">Tủ truyện đang trống.</div>';$('#downloadList').innerHTML='<div class="muted">Offline của trình duyệt được lưu trong bộ nhớ cục bộ. Chương hiện tại có thể tải bằng nút trong Reader.</div>'}
async function syncProgress(){if(!state.token||!state.book)return;const p=progress();await api('/progress',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({storyId:state.book.id,chapterIndex:state.chapter,position:p[state.book.id]?.percent||0})})}
async function pushLocalSync(){
 if(!state.token)return;
 const p=progress(), f=favs(), h=hist();
 const jobs=[];
 for(const [id,v] of Object.entries(p))jobs.push(api('/progress',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({storyId:id,chapterIndex:Number(v.chapter||0),position:Number(v.percent)||0})}).catch(()=>null));
 for(const id of f)jobs.push(api('/favorites',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({storyId:id,active:true})}).catch(()=>null));
 return Promise.all(jobs);
}
async function restoreAccount(){
 if(!state.token)return;
 try{
  const u=await api('/auth/me');state.user=u;
  const remote=await api('/sync'), localP=progress(), localF=favs();
  const remoteP=remote.progress||{};
  for(const [id,v] of Object.entries(remoteP)){
   const local=localP[id];
   if(!local||new Date(v.updatedAt||0)>=new Date(local.updatedAt||0))localP[id]={chapter:Number(v.chapterIndex)||0,percent:Number(v.position)||0,updated:new Date(v.updatedAt||Date.now()).getTime()};
  }
  setProgress(localP);
  const mergedF=[...new Set([...(Array.isArray(remote.favorites)?remote.favorites:[]),...localF])];setFavs(mergedF);
  await pushLocalSync();
  updateStats();renderBookcase();
 }catch{state.token='';localStorage.removeItem('ktf_token');state.user=null}
}
window.syncNow=async()=>{if(!state.token)return toast('Hãy đăng nhập trước');try{await pushLocalSync();await restoreAccount();toast('Đã đồng bộ tủ truyện và tiến độ')}catch{toast('Đồng bộ chưa hoàn tất')}}
window.addEventListener('online',()=>{if(state.token)window.syncNow?.()});
function accountError(e){
 const map={INVALID_ACCOUNT:'Tên đăng nhập 3–32 ký tự, chỉ dùng a-z, 0-9, dấu chấm, gạch dưới hoặc gạch ngang; mật khẩu tối thiểu 6 ký tự.',USERNAME_EXISTS:'Tên đăng nhập đã tồn tại.',INVALID_CREDENTIALS:'Tên đăng nhập hoặc mật khẩu không đúng.',UNAUTHORIZED:'Phiên đăng nhập đã hết hạn.'};
 return map[e.message]||('Có lỗi: '+e.message);
}
function closeAccount(){document.querySelector('#accountModal')?.remove()}
function accountModal(){
 closeAccount();
 const m=document.createElement('section');m.id='accountModal';m.style.cssText='position:fixed;inset:0;z-index:250;background:#0009;display:grid;place-items:center;padding:18px';
 m.innerHTML='<div style="width:min(460px,100%);max-height:90vh;overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:20px;box-shadow:0 24px 70px #0008">'+
 '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><div><b style="font-size:22px">Tài khoản</b><div class="muted" id="accountHint"></div></div><button class="btn" id="accountClose">Đóng</button></div><div id="accountBody" style="margin-top:16px"></div></div>';
 document.body.appendChild(m);$('#accountClose').onclick=closeAccount;
 const bodyEl=$('#accountBody');
 const render=()=>{
  if(state.user){
   bodyEl.innerHTML='<div class="panel" style="padding:14px;border:1px solid var(--line);border-radius:12px"><div class="muted">Tên đăng nhập</div><b>'+esc(state.user.username)+'</b><div class="muted" style="margin-top:12px">Vai trò</div><b>'+esc(state.user.role||'user')+'</b></div>'+
   '<label style="display:block;margin-top:14px">Tên hiển thị<input id="accountDisplay" value="'+esc(state.user.displayName||state.user.username)+'" style="width:100%;margin-top:6px;padding:11px;border-radius:10px;background:#0d1526;border:1px solid var(--line);color:var(--text)"></label>'+
   '<div id="accountMsg" class="muted" style="min-height:22px;margin-top:8px"></div>'+
   '<div style="display:flex;gap:8px;margin-top:8px"><button class="btn primary" id="accountSave">Lưu hồ sơ</button><button class="btn" id="accountLogout">Đăng xuất</button></div>';
   $('#accountHint').textContent='Bạn đang đăng nhập';
   $('#accountSave').onclick=async()=>{try{const j=await api('/profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({displayName:$('#accountDisplay').value.trim()})});state.user={...state.user,displayName:j.displayName};toast('Đã cập nhật hồ sơ');render()}catch(e){$('#accountMsg').textContent=accountError(e)}};
   $('#accountLogout').onclick=logout;
   return;
  }
  bodyEl.innerHTML='<div style="display:flex;gap:8px;margin-bottom:14px"><button class="btn primary" id="accountLoginTab">Đăng nhập</button><button class="btn" id="accountRegisterTab">Đăng ký</button></div><div id="accountForm"></div>';
  $('#accountHint').textContent='Đồng bộ tiến độ, lịch sử và tủ truyện trên máy chủ';
  const form=(register=false)=>{
   $('#accountForm').innerHTML='<div style="display:grid;gap:10px">'+(register?'<label>Tên hiển thị<input id="accountDisplay" placeholder="Ví dụ: Nguyễn Văn Hòa" style="width:100%;margin-top:5px;padding:11px;border-radius:10px;background:#0d1526;border:1px solid var(--line);color:var(--text)"></label>':'')+
   '<label>Tên đăng nhập<input id="accountUser" autocomplete="username" placeholder="hoaxxx_01" style="width:100%;margin-top:5px;padding:11px;border-radius:10px;background:#0d1526;border:1px solid var(--line);color:var(--text)"></label>'+
   '<label>Mật khẩu<input id="accountPass" type="password" autocomplete="'+(register?'new-password':'current-password')+'" placeholder="Tối thiểu 6 ký tự" style="width:100%;margin-top:5px;padding:11px;border-radius:10px;background:#0d1526;border:1px solid var(--line);color:var(--text)"></label>'+
   '<div id="accountMsg" class="muted" style="min-height:22px"></div><button class="btn primary" id="accountSubmit">'+(register?'Tạo tài khoản':'Đăng nhập')+'</button></div>';
   $('#accountSubmit').onclick=async()=>{
    const username=$('#accountUser').value.trim().toLowerCase(),password=$('#accountPass').value;
    if(!username||!password)return $('#accountMsg').textContent='Vui lòng nhập đủ thông tin.';
    try{
     const payload={username,password};if(register)payload.displayName=$('#accountDisplay').value.trim()||username;
     const j=await api(register?'/auth/register':'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
     state.token=j.token;save('ktf_token',state.token);state.user=j.user;await restoreAccount();toast(register?'Đăng ký thành công':'Đăng nhập thành công');render();
    }catch(e){$('#accountMsg').textContent=accountError(e)}
   };
  };
  $('#accountLoginTab').onclick=()=>{render();form(false)};
  $('#accountRegisterTab').onclick=()=>{form(true)};
  form(false);
 };
 render();return m;
}
window.login=async()=>accountModal();
window.logout=async()=>{try{await api('/auth/logout',{method:'POST'})}catch{}state.token='';localStorage.removeItem('ktf_token');state.user=null;updateStats();toast('Đã đăng xuất');closeAccount()};
window.showAccount=()=>accountModal();
window.adminStudio=async()=>{if(!state.token)return toast('Cần đăng nhập tài khoản admin');let stats;try{stats=await api('/admin/stats')}catch(e){return toast('Không có quyền admin')};const s=document.createElement('section');s.className='panel';s.style.cssText='position:fixed;inset:2%;z-index:200;overflow:auto;background:var(--panel,#fff);padding:20px;border-radius:16px;color:var(--text)';s.innerHTML=`
<button class="btn" id="adClose">Đóng</button> <b>Admin Studio 1.6</b>
<div class="muted">SQLite · <span id="adStats">${esc(JSON.stringify(stats))}</span></div>
<hr><h3>Truyện</h3><div style="display:grid;gap:8px">
<input id="adTitle" placeholder="Tên truyện"><input id="adAuthor" placeholder="Tác giả"><input id="adCat" placeholder="Thể loại" value="Khác"><textarea id="adDesc" placeholder="Mô tả"></textarea>
<button class="btn" id="adCreate">Tạo truyện</button>
<select id="adBook"></select><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="adUpdateStory">Lưu sửa truyện</button><button class="btn" id="adDeleteStory">Xóa truyện</button></div>
</div>
<hr><h3>Chương</h3><div style="display:grid;gap:8px">
<input id="adIndex" type="number" min="0" placeholder="Index chương (0 = chương 1)"><input id="adChapterTitle" placeholder="Tiêu đề chương"><textarea id="adContent" rows="8" placeholder="Nội dung chương"></textarea>
<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="adAddChapter">Thêm chương</button><button class="btn" id="adUpdateChapter">Lưu sửa chương</button><button class="btn" id="adDeleteChapter">Xóa chương</button></div>
<button class="btn" id="adRenumber">Đánh lại số chương từ...</button>
</div>
<hr><h3>Nhập TXT / EPUB</h3><input id="adFile" type="file" accept=".txt,.epub"><input id="adBatch" type="number" min="1" max="500" value="100">
<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="adPreview">Xem trước</button><button class="btn" id="adImport">Import</button></div>
<hr><h3>Bìa truyện</h3><input id="adCover" type="file" accept="image/png,image/jpeg,image/webp"><button class="btn" id="adCoverBtn">Tải bìa</button>
<hr><h3>Sao lưu / phục hồi</h3><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="adBackup">Backup JSON</button><input id="adRestore" type="file" accept=".json"><button class="btn" id="adRestoreBtn">Restore</button></div>
<hr><h3>Chẩn đoán</h3><button class="btn" id="adDiag">Diagnostics</button><pre id="adOut">Sẵn sàng.</pre>`;
document.body.appendChild(s);
const out=s.querySelector('#adOut'),sel=s.querySelector('#adBook');
const refresh=async()=>{const list=await api('/admin/stories');sel.innerHTML=list.map(b=>'<option value="'+esc(b.id)+'">'+esc(b.title)+' ('+(b.chapters||0)+')</option>').join('');if(sel.value)loadStoryForm()};
const loadStoryForm=async()=>{try{const b=await api('/stories/'+encodeURIComponent(sel.value));s.querySelector('#adTitle').value=b.title||'';s.querySelector('#adAuthor').value=b.author||'';s.querySelector('#adCat').value=b.cat||'';s.querySelector('#adDesc').value=b.desc||''}catch{}};
const readFileData=async(f,mime)=>{const buf=new Uint8Array(await f.arrayBuffer());let bin='';for(let i=0;i<buf.length;i+=0x8000)bin+=String.fromCharCode(...buf.subarray(i,i+0x8000));return 'data:'+(mime||f.type||'application/octet-stream')+';base64,'+btoa(bin)};
s.querySelector('#adClose').onclick=()=>s.remove();sel.onchange=loadStoryForm;
await refresh();
s.querySelector('#adCreate').onclick=async()=>{try{const j=await api('/admin/stories',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:s.querySelector('#adTitle').value,author:s.querySelector('#adAuthor').value,cat:s.querySelector('#adCat').value,desc:s.querySelector('#adDesc').value})});out.textContent='Đã tạo: '+j.title;await loadBooks();await refresh()}catch(e){out.textContent='Lỗi tạo truyện: '+e.message}};
s.querySelector('#adUpdateStory').onclick=async()=>{try{const j=await api('/admin/stories/'+encodeURIComponent(sel.value),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:s.querySelector('#adTitle').value,author:s.querySelector('#adAuthor').value,cat:s.querySelector('#adCat').value,desc:s.querySelector('#adDesc').value})});out.textContent='Đã lưu: '+j.title;await loadBooks();await refresh()}catch(e){out.textContent='Lỗi sửa truyện: '+e.message}};
s.querySelector('#adDeleteStory').onclick=async()=>{if(!confirm('Xóa truyện và toàn bộ chương?'))return;try{await api('/admin/stories/'+encodeURIComponent(sel.value),{method:'DELETE'});out.textContent='Đã xóa truyện';await loadBooks();await refresh()}catch(e){out.textContent='Lỗi xóa truyện: '+e.message}};
s.querySelector('#adAddChapter').onclick=async()=>{try{const j=await api('/admin/stories/'+encodeURIComponent(sel.value)+'/chapters',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({index:Number(s.querySelector('#adIndex').value),title:s.querySelector('#adChapterTitle').value,content:s.querySelector('#adContent').value})});out.textContent='Đã thêm: '+j.title;await loadBooks();await refresh()}catch(e){out.textContent='Lỗi thêm chương: '+e.message}};
s.querySelector('#adUpdateChapter').onclick=async()=>{try{const i=Number(s.querySelector('#adIndex').value);const j=await api('/admin/stories/'+encodeURIComponent(sel.value)+'/chapters/'+i,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:s.querySelector('#adChapterTitle').value,content:s.querySelector('#adContent').value})});out.textContent='Đã sửa: '+j.title;await loadBooks();await refresh()}catch(e){out.textContent='Lỗi sửa chương: '+e.message}};
s.querySelector('#adDeleteChapter').onclick=async()=>{const i=Number(s.querySelector('#adIndex').value);if(!confirm('Xóa chương '+(i+1)+'?'))return;try{await api('/admin/stories/'+encodeURIComponent(sel.value)+'/chapters/'+i,{method:'DELETE'});out.textContent='Đã xóa chương';await loadBooks();await refresh()}catch(e){out.textContent='Lỗi xóa chương: '+e.message}};
s.querySelector('#adRenumber').onclick=async()=>{const start=Number(prompt('Bắt đầu từ số chương','1'));if(!start)return;try{const j=await api('/admin/stories/'+encodeURIComponent(sel.value)+'/renumber',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({start})});out.textContent='Đã đánh lại '+j.count+' chương từ '+j.start;await loadBooks();await refresh()}catch(e){out.textContent='Lỗi đánh số: '+e.message}};
s.querySelector('#adPreview').onclick=async()=>{const f=s.querySelector('#adFile').files[0];if(!f)return out.textContent='Chọn TXT hoặc EPUB';try{const data=await readFileData(f);const j=await api('/admin/import/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:f.name,data})});out.textContent=JSON.stringify({format:j.format,title:j.title,total:j.total,duplicates:j.duplicates,missing:j.missing,chapters:j.chapters?.slice(0,20)},null,2)}catch(e){out.textContent='Preview lỗi: '+e.message}};
s.querySelector('#adImport').onclick=async()=>{const f=s.querySelector('#adFile').files[0];if(!f)return out.textContent='Chọn TXT hoặc EPUB';try{const data=await readFileData(f);const j=await api('/admin/import/batch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:f.name,data,batchSize:Number(s.querySelector('#adBatch').value||100)})});out.textContent='Import thành công: '+j.imported+' chương';await loadBooks();await refresh()}catch(e){out.textContent='Import lỗi: '+e.message}};
s.querySelector('#adCoverBtn').onclick=async()=>{const f=s.querySelector('#adCover').files[0];if(!f)return out.textContent='Chọn ảnh bìa';try{const data=await readFileData(f,f.type);const j=await api('/admin/stories/'+encodeURIComponent(sel.value)+'/cover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data})});out.textContent='Đã tải bìa: '+j.cover;await loadBooks();await refresh()}catch(e){out.textContent='Lỗi bìa: '+e.message}};
s.querySelector('#adBackup').onclick=async()=>{try{const j=await api('/admin/backup');const blob=new Blob([JSON.stringify(j)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='kho-truyen-backup.json';a.click();URL.revokeObjectURL(a.href);out.textContent='Đã tạo backup'}catch(e){out.textContent='Backup lỗi: '+e.message}};
s.querySelector('#adRestoreBtn').onclick=async()=>{const f=s.querySelector('#adRestore').files[0];if(!f)return out.textContent='Chọn file backup JSON';if(!confirm('Restore sẽ thay toàn bộ dữ liệu hiện tại. Tiếp tục?'))return;try{const j=JSON.parse(await f.text());await api('/admin/backup/restore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(j)});out.textContent='Restore thành công. Đang tải lại...';location.reload()}catch(e){out.textContent='Restore lỗi: '+e.message}};
s.querySelector('#adDiag').onclick=async()=>{try{out.textContent=JSON.stringify(await api('/admin/stories/diagnostics'),null,2)}catch(e){out.textContent='Diagnostics lỗi: '+e.message}};
};
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;if(e.key==='ArrowRight')goChapter(1);else if(e.key==='ArrowLeft')goChapter(-1);else if(e.code==='Space'){e.preventDefault();speak()}else if(e.key==='Escape')$('#reader')?.classList.toggle('focus')});
let touchX=0;document.addEventListener('touchstart',e=>touchX=e.changedTouches[0].screenX,{passive:true});document.addEventListener('touchend',e=>{const d=e.changedTouches[0].screenX-touchX;if(Math.abs(d)>70&&$('#reader')?.classList.contains('show'))goChapter(d<0?1:-1)},{passive:true});
async function boot(){await loadBooks();await restoreAccount();renderLibrary();const m=location.hash.match(/^#([^/]+)\/chapter\/(\d+)/);if(m){const id=decodeURIComponent(m[1]);if(state.books.some(b=>b.id===id))await openBook(id).then(()=>readChapter(+m[2]))}if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{})}
boot();
})();