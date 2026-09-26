/* Kho Truyen Full 1.18.0 - compact application shell */
(()=> {
'use strict';
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const localBooks=()=>Array.isArray(window.books)?window.books:[];
const readerFont=(()=>{const f=localStorage.getItem('ktf_font');return f==='Georgia'||f==='system-ui'?f:'system-ui'})();
const state={books:[],book:null,chapter:0,chapterMin:0,chapterMax:-1,chapters:[],remoteSearch:false,apiAvailable:false,order:'asc',filter:'all',sort:'title',mode:'all',libraryPage:1,libraryPageSize:100,libraryTotal:0,fontSize:+localStorage.getItem('ktf_fs')||19,font:readerFont,theme:localStorage.getItem('ktf_theme')||'dark',rate:+localStorage.getItem('ktf_rate')||1,continuous:false,lang:localStorage.getItem('ktf_lang')||'vi',user:null,token:localStorage.getItem('ktf_token')||'',offline:new Set()};
const I18N={
 vi:{title:'Kho Truyện Full',story:'Truyện',chapterUnit:'chương',page:'trang',open:'Mở',noHistory:'Chưa có lịch sử.',noBookmarks:'Chưa đánh dấu chương nào.',noReading:'Chưa có truyện đang đọc.',searchBooks:'Tìm truyện, tác giả, thể loại…',tagline:'Demo offline • đọc liền mạch',status:'Đọc liền mạch từ chương đầu đến chương cuối. Dữ liệu được tách khỏi giao diện để dễ mở rộng kho truyện về sau.',books:'Bộ truyện FULL',chapters:'Tổng chương',shelf:'Trong tủ',offline:'Đã lưu offline',explore:'Khám phá',reading:'Đang đọc',history:'Lịch sử',search:'Tìm kiếm',rank:'Xếp hạng',new:'Mới cập nhật',all:'Tất cả',full:'FULL',anyStatus:'Mọi trạng thái',byTitle:'Tên A–Z',byChapters:'Nhiều chương',byAuthor:'Tác giả',updated:'Mới cập nhật',chapterList:'Danh sách chương',searchChapter:'Tìm chương…',contents:'☰ Mục lục',read:'Đọc',stop:'Dừng',mark:'🔖 Đánh dấu',marked:'🔖 Đã đánh dấu',top:'↑',bottom:'↓',fullscreen:'⛶',settings:'⚙',prev:'← Chương trước',next:'Chương sau →',downloadChapter:'⬇ Tải chương',back:'← Thư viện',offlineAll:'⬇ Lưu cả truyện offline',readFromStart:'▶ Đọc từ đầu',continue:'↪ Đọc tiếp',addShelf:'♡ Thêm tủ',removeShelf:'♥ Bỏ tủ',share:'↗ Chia sẻ',autoNear:'Đã gần cuối chương',autoNext:'Chương sau →',lang:'Ngôn ngữ',ttsError:'Âm thanh gặp lỗi, đã dừng.',translationError:'Không dịch được chương; đang hiển thị bản gốc.'},
 en:{title:'Full Story Library',story:'Story',chapterUnit:'chapters',page:'page',open:'Open',noHistory:'No reading history.',noBookmarks:'No bookmarked chapters.',noReading:'Nothing is being read.',searchBooks:'Search stories, authors, categories…',tagline:'Offline demo • continuous reading',status:'Read continuously from the first chapter to the last. Data is separated from the UI for easy expansion.',books:'FULL books',chapters:'Total chapters',shelf:'In shelf',offline:'Saved offline',explore:'Explore',reading:'Reading',history:'History',search:'Search',rank:'Ranking',new:'Recently updated',all:'All',full:'FULL',anyStatus:'Any status',byTitle:'Title A–Z',byChapters:'Most chapters',byAuthor:'Author',updated:'Recently updated',chapterList:'Chapter list',searchChapter:'Search chapters…',contents:'☰ Contents',read:'Read',stop:'Stop',mark:'🔖 Bookmark',marked:'🔖 Bookmarked',top:'↑',bottom:'↓',fullscreen:'⛶',settings:'⚙',prev:'← Previous chapter',next:'Next chapter →',downloadChapter:'⬇ Download chapter',back:'← Library',offlineAll:'⬇ Save whole book offline',readFromStart:'▶ Start reading',continue:'↪ Continue',addShelf:'♡ Add to shelf',removeShelf:'♥ Remove from shelf',share:'↗ Share',autoNear:'Near the end of this chapter',autoNext:'Next chapter →',lang:'Language',ttsError:'Audio error, reading stopped.',translationError:'Chapter translation failed; showing original text.'},
 zh:{title:'完本书库',story:'小说',chapterUnit:'章',page:'页',open:'打开',noHistory:'暂无阅读历史。',noBookmarks:'暂无收藏章节。',noReading:'暂无正在阅读的小说。',searchBooks:'搜索小说、作者、分类…',tagline:'离线演示 • 连续阅读',status:'从第一章连续阅读到最后一章。数据与界面分离，方便继续扩充书库。',books:'完本小说',chapters:'总章节',shelf:'书架',offline:'已离线保存',explore:'发现',reading:'正在阅读',history:'阅读历史',search:'搜索',rank:'排行',new:'最近更新',all:'全部',full:'完本',anyStatus:'全部状态',byTitle:'书名 A–Z',byChapters:'章节最多',byAuthor:'作者',updated:'最近更新',chapterList:'章节目录',searchChapter:'搜索章节…',contents:'☰ 目录',read:'朗读',stop:'停止',mark:'🔖 收藏章节',marked:'🔖 已收藏',top:'↑',bottom:'↓',fullscreen:'⛶',settings:'⚙',prev:'← 上一章',next:'下一章 →',downloadChapter:'⬇ 下载本章',back:'← 书库',offlineAll:'⬇ 整本离线保存',readFromStart:'▶ 从头阅读',continue:'↪ 继续阅读',addShelf:'♡ 加入书架',removeShelf:'♥ 移出书架',share:'↗ 分享',autoNear:'本章即将结束',autoNext:'下一章 →',lang:'语言',ttsError:'朗读出错，已停止。',translationError:'章节翻译失败，正在显示原文。'}
};
const T=k=>I18N[state.lang]?.[k]??I18N.vi[k]??k;
function applyLanguage(){
 document.documentElement.lang=state.lang==='zh'?'zh-CN':state.lang==='en'?'en':'vi';
 const set=(sel,key)=>{const el=$(sel);if(el&&T(key)!=null)el.textContent=T(key)};
 set('.brand b','title');set('#brandTagline','tagline');set('#libraryTitle','title');
 const hero=$('#libraryTitle')?.parentElement?.querySelector('p');if(hero){const status=$('#apiStatus');hero.childNodes.forEach(n=>{if(n.nodeType===3)n.textContent=' · '+T('status')});}
 const searchBooks=$('#search');if(searchBooks)searchBooks.placeholder=T('searchBooks');set('#segAll','explore');set('#segReading','reading');set('#segRank','rank');set('#segNew','new');set('#filterAll','all');
 const filterButtons=document.querySelectorAll('#dataTools>button');if(filterButtons[1])filterButtons[1].textContent=T('full');
 const cf=$('#categoryFilter'),sf=$('#statusFilter'),ss=$('#sortBooks');if(cf?.options[0])cf.options[0].textContent=T('all');if(sf?.options[0])sf.options[0].textContent=T('anyStatus');if(sf?.options[1])sf.options[1].textContent=T('full');
 if(ss){const keys=['byTitle','byChapters','byAuthor','updated'];[...ss.options].forEach((o,i)=>o.textContent=T(keys[i]||'byTitle'))}
 const chapterTools=$('#chapterSearch');if(chapterTools)chapterTools.placeholder=T('searchChapter');set('#detail .back','back');set('#history .back','back');set('#bookcase .back','back');
 const cl=$('.chapterTools b');if(cl)cl.textContent=T('chapterList');
 const speakBtn=$('#ttsLabel')?.closest('button');if(speakBtn){const icon=speakBtn.childNodes[0];const label=$('#ttsLabel');if(icon&&icon.nodeType===3)icon.textContent='🔊 ';label.textContent=ttsState.active?T('stop'):T('read')}
 const reader=$('#reader');if(reader){const mb=$('#bookmarkBtn');if(mb)mb.textContent=isBookmarked()?T('marked'):T('mark');const next=$('#next');if(next)next.textContent=T('next');const prev=$('#prev');if(prev)prev.textContent=T('prev');const dl=reader.querySelector('.pager .btn.good');if(dl)dl.textContent=T('downloadChapter');const menu=reader.querySelector('.readerbar>.btn');if(menu)menu.textContent=T('contents');const auto=$('#autoNext');if(auto){const as=auto.querySelector('span');if(as)as.textContent=T('autoNear');const ab=auto.querySelector('button');if(ab)ab.textContent=T('autoNext')}}
 const bottom=document.querySelector('.bottomnav');if(bottom){bottom.innerHTML='<button onclick="home()"><b>⌂</b>'+T('explore')+'</button><button onclick="showBookcase()"><b>♡</b>'+T('shelf')+'</button><button onclick="showHistory()"><b>◷</b>'+T('history')+'</button><button onclick="focusSearch()"><b>⌕</b>'+T('search')+'</button>'}
 const detailButtons=$('#detailBox')?.querySelectorAll('.settings .btn');
 if(detailButtons?.length){
  if(detailButtons[0])detailButtons[0].textContent=T('readFromStart');
  if(detailButtons[1])detailButtons[1].textContent=T('continue');
  if(detailButtons[2])detailButtons[2].textContent=favs().includes(state.book?.id)?T('removeShelf'):T('addShelf');
  if(detailButtons[3])detailButtons[3].textContent=T('share');
  if(detailButtons[4])detailButtons[4].textContent=T('offlineAll');
 }
 if(state.book&&$('#detail')?.classList.contains('show'))window.renderChapters?.();
 if(state.book&&$('#reader')?.classList.contains('show'))$('#rmeta').textContent=T('chapterUnit')+' '+chapterDisplayNumber(state.chapter)+' · '+(state.book.author||'');
 const ls=$('#langSelect');if(ls)ls.value=state.lang;const alias=$('#readerLangSelect');if(alias)alias.value=state.lang;
 document.title=T('title');
}
window.setLanguage=async lang=>{
 if(!I18N[lang])lang='vi';
 const changed=state.lang!==lang;
 state.lang=lang;save('ktf_lang',lang);const reading=$('#reader')?.classList.contains('show');if(!reading)renderLibrary();applyLanguage();applyReader();
 if(changed&&state.book&&reading){
  const i=state.chapter;
  stopTTS(true);
  await readChapter(i,{languageChange:true,skipHistory:true});
 }
};
const apiBase=()=>window.KhoAPI?.base?.()||'/api/v1';
const api=async(path,opt={})=>{const base=apiBase();const h={'Accept':'application/json',...(opt.headers||{})};if(state.token)h.Authorization='Bearer '+state.token;let r;try{r=await fetch(base+path,{...opt,headers:h})}catch(e){const err=new Error('API_UNREACHABLE');err.cause=e;throw err}if(!r.ok){let m='HTTP_'+r.status;try{const j=await r.json();m=j.error||j.message||m}catch{}const err=new Error(m);err.status=r.status;err.apiBase=base;throw err}return r.status===204?null:r.json()};
window.configureApi=()=>{const current=window.KhoAPI?.base?.()||'';const value=prompt('URL API backend (ví dụ: https://api.example.com/api/v1)\\nĐể trống để dùng mặc định của trang.',current);if(value===null)return;const v=value.trim().replace(/\/$/,'');if(v)localStorage.setItem('ktf_api_base',v);else localStorage.removeItem('ktf_api_base');toast(v?'Đã lưu địa chỉ API. Đang tải lại…':'Đã khôi phục API mặc định. Đang tải lại…');setTimeout(()=>location.reload(),350)};
function toast(x){const t=$('#toast');if(!t)return;t.textContent=x;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2200)}
function save(k,v){localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v))}
function get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return localStorage.getItem(k)??d}}
function favs(){return get('ktf_favs',[])} function setFavs(v){save('ktf_favs',v)}
function deletedFavs(){return get('ktf_deleted_favs',[])} function setDeletedFavs(v){save('ktf_deleted_favs',v)}
function deletedBookmarks(){return get('ktf_deleted_bookmarks',{})} function setDeletedBookmarks(v){save('ktf_deleted_bookmarks',v)}
function hist(){return get('ktf_hist',[])} function setHist(v){save('ktf_hist',v)}
function historyClearPending(){return get('ktf_history_clear_pending',false)} function setHistoryClearPending(v){save('ktf_history_clear_pending',!!v)}
function progress(){return get('ktf_prog',{})} function setProgress(v){save('ktf_prog',v)}
function show(id){['library','detail','reader','history','bookcase'].forEach(x=>$('#'+x)?.classList.remove('show'));$('#'+id)?.classList.add('show');document.body.classList.toggle('reading-mode',id==='reader');scrollTo(0,0)}
window.home=()=>{show('library');renderLibrary()}; window.focusSearch=()=>{$('#search')?.focus();show('library')};
window.goNextUnread=()=>{if(!state.book)return;const p=progress()[state.book.id],min=state.chapterMin,max=state.chapterMax;const total=totalChapterCount();if(!total||max<min)return;let start=Number.isFinite(Number(p?.chapter))?Number(p.chapter):min;if(Number(p?.percent||0)>=95)start++;if(start<min)start=min;if(start>max)return toast('Bạn đã đọc đến chương cuối');readChapter(start)};
window.showHistory=()=>{show('history');renderHistory()}; window.showBookcase=()=>{show('bookcase');renderBookcase()};window.openAdmin=()=>window.adminStudio?.();
function normalizeBook(b){
 const src=b||{};
 const count=Number(src.chapterCount??(Array.isArray(src.chapters)?src.chapters.length:src.chapters??0));
 return {
  ...src,
  id:String(src.id??''),
  title:String(src.title??'Truyện chưa có tên'),
  author:String(src.author??'Không rõ tác giả'),
  cat:String(src.cat??src.category??'Khác'),
  desc:String(src.desc??src.description??''),
  status:String(src.status??'FULL'),
  tone:String(src.tone??''),
  chapterCount:Number.isFinite(count)?Math.max(0,count):0,
  chapters:Array.isArray(src.chapters)?src.chapters:[]
 };
}
async function loadStaticSeed(){
 const paths=['public-domain-seed.json','server/public-domain-seed.json'];
 for(const path of paths){
  try{
   const r=await fetch(path,{cache:'no-store'});
   if(!r.ok)continue;
   const d=await r.json();
   if(Array.isArray(d.books))return d.books.map(normalizeBook);
  }catch{}
 }
 return[];
}
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
  state.books=out.map(normalizeBook);state.apiAvailable=true;state.remoteSearch=false;$('#apiStatus').textContent='● SQLite API';renderFilterOptions();
 }catch{
  const local=localBooks().map(normalizeBook);
  const staticBooks=await loadStaticSeed();
  const map=new Map(local.map(b=>[b.id,b]));
  for(const item of staticBooks)if(!map.has(item.id))map.set(item.id,item);
  state.books=[...map.values()];
  state.apiAvailable=false;
  state.remoteSearch=false;
  $('#apiStatus').textContent=staticBooks.length?'● Dữ liệu tĩnh':'● Dữ liệu local';
  renderFilterOptions();
 }
 updateStats(); return state.books;
}
function getBookChapterCount(b){
 const value=b?.chapterCount;
 if(value!=null&&Number.isFinite(Number(value)))return Math.max(0,Number(value));
 if(typeof b?.chapters==='number'&&Number.isFinite(b.chapters))return Math.max(0,Number(b.chapters));
 if(Array.isArray(b?.chapters))return b.chapters.length;
 return 0;
}
async function updateStats(){
 const n=state.books.reduce((a,b)=>a+getBookChapterCount(b),0);
 $('#statBooks').textContent=String(state.books.length);
 $('#statChapters').textContent=String(n);
 $('#statFav').textContent=String(favs().length);
 $('#statDownloaded').textContent=String(state.offline.size);
 refreshOfflineUI();
}
function filtered(){
 let a=state.books.slice();
 const category=$('#categoryFilter')?.value||'all', status=$('#statusFilter')?.value||'all';
 if(state.filter!=='all')a=a.filter(b=>String(b.status||'').toUpperCase()===String(state.filter).toUpperCase());
 if(category!=='all')a=a.filter(b=>String(b.cat||'')===String(category));
 if(status!=='all')a=a.filter(b=>String(b.status||'').toUpperCase()===String(status).toUpperCase());
 const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('vi');
 const q=norm($('#search')?.value||'');
 if(q)a=a.filter(b=>norm(b.title+' '+b.author+' '+b.cat+' '+(b.desc||'')).includes(q));
 if(state.mode==='reading'){const p=progress();a=a.filter(b=>p[b.id]?.percent>0)}
 if(state.mode==='new')a=a.slice().sort((x,y)=>String(y.updatedAt||y.updated_at||'').localeCompare(String(x.updatedAt||x.updated_at||'')));
 else if(state.sort==='chapters')a.sort((x,y)=>(y.chapterCount||y.chapters?.length||0)-(x.chapterCount||x.chapters?.length||0));
 else if(state.sort==='author')a.sort((x,y)=>String(x.author||'').localeCompare(String(y.author||''),'vi'));
 else a.sort((x,y)=>String(x.title||'').localeCompare(String(y.title||''),'vi'));
 return a;
}
function card(b){const on=favs().includes(b.id), p=progress()[b.id]?.percent||0;return '<div class="card"><div class="cover" style="background:'+esc(b.tone||'linear-gradient(145deg,#182848,#4b6cb7)')+'"><span class="book">📖</span><span class="tag">'+esc(b.cat||T('story'))+'</span><button class="favbtn '+(on?'on':'')+'" onclick="event.stopPropagation();toggleFav(\''+esc(b.id)+'\')">'+(on?'♥':'♡')+'</button><h3>'+esc(b.title)+'</h3></div><div class="info" onclick="openBook(\''+esc(b.id)+'\')" style="cursor:pointer"><b>'+esc(b.title)+'</b><div class="muted">'+esc(b.author||'')+'</div><div class="meta"><span>'+((b.chapterCount||b.chapters?.length||0))+' '+T('chapterUnit')+'</span><span class="status">'+esc(b.status||'FULL')+'</span></div><div class="mini-progress"><i style="width:'+p+'%"></i></div></div></div>'}
function renderFilterOptions(){
 const c=$('#categoryFilter');if(c){const current=c.value, cats=[...new Set(state.books.map(b=>b.cat).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'vi'));c.innerHTML='<option value="all">Tất cả thể loại</option>'+cats.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');if(cats.includes(current))c.value=current}
}
let searchTimer=0,librarySearchId=0,chapterLoadId=0;
async function refreshRemoteSearch(page=1){
 const requestId=++librarySearchId;
 if(!state.remoteSearch)return;
 const q=($('#search')?.value||'').trim(),cat=$('#categoryFilter')?.value||'all',status=$('#statusFilter')?.value||'all',sort=$('#sortBooks')?.value||'title';
 const params=new URLSearchParams({page:String(page),pageSize:String(state.libraryPageSize),sort});if(q)params.set('q',q);if(cat!=='all')params.set('category',cat);if(status!=='all')params.set('status',status);
 try{
  const j=await api('/stories?'+params.toString());if(requestId!==librarySearchId)return;state.books=(j.items||[]).map(normalizeBook);state.libraryPage=Number(j.page||page);state.libraryTotal=Number(j.count||state.books.length);$('#apiStatus').textContent='● SQLite API · '+state.libraryTotal+' kết quả';renderFilterOptions();const c=$('#categoryFilter');if(c)c.value=cat;renderLibraryGridOnly();
 }catch{
  if(requestId!==librarySearchId)return;
  state.remoteSearch=false;
  $('#apiStatus').textContent='● Dữ liệu tĩnh';
  renderFilterOptions();
  renderLibraryGridOnly();
  toast('Đang dùng dữ liệu tĩnh trên web');
 }
}
function renderLibraryGridOnly(){
 const a=filtered();$('#grid').innerHTML=a.length?a.map(card).join(''):'<div class="empty">Không tìm thấy truyện phù hợp.</div>';
 if(state.remoteSearch&&state.libraryTotal>state.libraryPageSize){const pages=Math.ceil(state.libraryTotal/state.libraryPageSize);let h='<div class="row pagerrow"><button class="btn" '+(state.libraryPage<=1?'disabled':'')+' onclick="refreshRemoteSearch('+(state.libraryPage-1)+')">← Trước</button><span class="muted">Trang '+state.libraryPage+'/'+pages+'</span><button class="btn" '+(state.libraryPage>=pages?'disabled':'')+' onclick="refreshRemoteSearch('+(state.libraryPage+1)+')">Sau →</button></div>';$('#pager').innerHTML=h}else $('#pager').innerHTML='';
 renderHomeMode();updateStats()
}
window.renderLibrary=()=>{state.libraryPage=1;librarySearchId++;renderLibraryGridOnly();clearTimeout(searchTimer);if(!state.apiAvailable)return;state.remoteSearch=true;const requestId=librarySearchId;searchTimer=setTimeout(()=>{if(requestId===librarySearchId)refreshRemoteSearch(1)},180)};
window.setAdvancedFilter=()=>{state.libraryPage=1;librarySearchId++;renderLibraryGridOnly();if(!state.apiAvailable)return;state.remoteSearch=true;refreshRemoteSearch(1)};

function renderHomeMode(){
 const c=$('#homeMode');if(!c)return;
 if(state.mode==='all'){c.innerHTML='<div class="panel"><h3>✨ Khám phá</h3><div class="muted">Kho truyện được sắp xếp theo lựa chọn bên dưới.</div></div>';return}
 if(state.mode==='rank'){const a=state.books.slice().sort((x,y)=>(y.chapterCount||0)-(x.chapterCount||0)).slice(0,5);c.innerHTML='<div class="panel"><h3>📈 Xếp hạng theo số chương</h3>'+a.map((b,i)=>'<div class="rankrow"><span class="rankno">'+(i+1)+'</span><span class="rankcover">📖</span><span class="grow"><b>'+esc(b.title)+'</b><div class="muted">'+esc(b.author)+'</div></span><b>'+(b.chapterCount||0)+'</b></div>').join('')+'</div>';return}
 if(state.mode==='reading'){const p=progress();const a=state.books.filter(b=>p[b.id]?.percent>0).sort((x,y)=>(p[y.id]?.percent||0)-(p[x.id]?.percent||0)).slice(0,6);c.innerHTML='<div class="panel"><h3>📖 '+T('reading')+'</h3>'+(a.length?a.map(b=>'<div class="rankrow"><span class="rankcover">📚</span><span class="grow"><b>'+esc(b.title)+'</b><div class="muted">'+Math.round(p[b.id].percent||0)+'% · '+T('chapterUnit')+' '+(Number(p[b.id].chapter||0)+(state.book?.id===b.id&&state.chapterMin!==0?0:1))+'</div></span><button class="btn" onclick="openBook(\''+esc(b.id)+'\')">'+T('open')+'</button></div>').join(''):'<div class="empty">'+T('noReading')+'</div>')+'</div>';return}
 if(state.mode==='new'){
  const a=state.books.slice().sort((x,y)=>String(y.updatedAt||y.updated_at||'').localeCompare(String(x.updatedAt||x.updated_at||''))).slice(0,6);
  c.innerHTML='<div class="panel"><h3>🆕 Mới cập nhật</h3>'+a.map(b=>'<div class="rankrow"><span class="rankcover">🆕</span><span class="grow"><b>'+esc(b.title)+'</b><div class="muted">'+esc(b.author)+' · '+(b.chapterCount||0)+' chương</div></span><button class="btn" onclick="openBook(\''+esc(b.id)+'\')">Đọc</button></div>').join('')+'</div>';return
 }
}window.setHomeMode=m=>{state.mode=m;state.remoteSearch=false;document.querySelectorAll('#segAll,#segReading,#segRank,#segNew').forEach(x=>x.classList.remove('active'));$('#seg'+({all:'All',reading:'Reading',rank:'Rank',new:'New'}[m]||'All'))?.classList.add('active');renderLibrary()};
window.setDataFilter=x=>{state.filter=x;renderLibrary()};window.setDataSort=x=>{state.sort=x;renderLibrary()};
window.toggleFav=async id=>{let a=favs(),d=deletedFavs();const active=!a.includes(id);a=active?[...a,id]:a.filter(x=>x!==id);d=active?d.filter(x=>x!==id):[...new Set([...d,id])];setFavs(a);setDeletedFavs(d);updateStats();renderLibrary();if(state.token)try{await api('/favorites',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({storyId:id,active})});if(active)setDeletedFavs(deletedFavs().filter(x=>x!==id));else setDeletedFavs(deletedFavs().filter(x=>x!==id))}catch{toast('Đã lưu cục bộ, sẽ đồng bộ khi online')}};
let chapterPage=1,chapterPageSize=100,chapterTotal=0;
async function loadChapterPage(page=1){
 const requestId=++chapterLoadId;
 if(!state.book)return;
 const q=($('#chapterSearch')?.value||'').trim();
 const renderLocal=()=>{
  const local=Array.isArray(state.book.chapters)?state.book.chapters:[];
  const normalized=local.map((c,i)=>Array.isArray(c)
    ? {bookId:state.book.id,index:i,title:c[0]||('Chương '+(i+1)),content:c[1]||''}
    : {...c,index:Number(c?.index??i),title:c?.title||('Chương '+(i+1)),content:c?.content||''});
  const nq=String(q||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('vi');
  const filteredLocal=nq?normalized.filter(c=>{
    const title=String(c.title||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('vi');
    const content=String(c.content||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('vi');
    return title.includes(nq)||content.includes(nq);
  }):normalized;
  const startIndex=(Math.max(1,page)-1)*chapterPageSize;
  const orderedLocal=state.order==='desc'?filteredLocal.slice().reverse():filteredLocal;
  state.chapters=orderedLocal.slice(startIndex,startIndex+chapterPageSize);
  chapterPage=Math.max(1,page);
   const localIndexes=normalized.map(c=>Number(c.index)).filter(Number.isInteger);state.chapterMin=localIndexes.length?Math.min(...localIndexes):0;state.chapterMax=localIndexes.length?Math.max(...localIndexes):-1;chapterTotal=filteredLocal.length;
  state.book.chapterCount=normalized.length;
  renderChapters();
 };
 if(!state.apiAvailable){renderLocal();return}
 const params=new URLSearchParams({page:String(page),pageSize:String(chapterPageSize),sort:state.order||'asc'});
 if(q)params.set('q',q);
 try{
  const j=await api('/stories/'+encodeURIComponent(state.book.id)+'/chapters?'+params);if(requestId!==chapterLoadId)return;
  state.chapters=(j.items||[]).map(c=>({...c,index:Number(c.index??c.chapter??0)}));
  chapterPage=Number(j.page||page);chapterTotal=Number(j.count??state.chapters.length);
   chapterPage=Number(j.page||page);chapterTotal=Number(j.count??state.chapters.length);state.chapterMin=Number.isInteger(Number(j.minIndex))?Number(j.minIndex):(state.chapters.length?Math.min(...state.chapters.map(c=>Number(c.index))):0);state.chapterMax=Number.isInteger(Number(j.maxIndex))?Number(j.maxIndex):(state.chapters.length?Math.max(...state.chapters.map(c=>Number(c.index))):-1);
  renderChapters();
 }catch{
  if(requestId!==chapterLoadId)return;
  state.apiAvailable=false;
  renderLocal();
 }
}
window.loadChapterPage=loadChapterPage;
async function openBook(id){
 show('detail');let b=state.books.find(x=>x.id===id);
 if(state.apiAvailable){
  try{b=normalizeBook(await api('/stories/'+encodeURIComponent(id)))}catch{}
 }
 if(!b){show('library');toast('Truyện này không còn tồn tại hoặc chưa tải được dữ liệu');return null}
 state.book=b;chapterPage=1;chapterTotal=Number(b.chapterCount||0);state.chapters=[];const chapterBox=$('#chapters');if(chapterBox)chapterBox.innerHTML='<div class="empty">Đang tải danh sách chương…</div>';const chapterPagerBox=$('#chapterPager');if(chapterPagerBox)chapterPagerBox.innerHTML='';
 $('#detailBox').innerHTML='<div class="detailbox"><div class="detailcover" style="background:'+esc(b.tone||'#26324b')+'"><span style="font-size:48px">📚</span><span>'+esc(b.cat||'Truyện')+'</span></div><div><div class="badges"><span class="badge good">'+esc(b.status||'FULL')+'</span><span class="badge">'+esc(b.author||'')+'</span></div><h2>'+esc(b.title)+'</h2><p class="muted">'+esc(b.desc||'')+'</p><div class="settings"><button class="btn primary" onclick="startBook(0)">▶ Đọc từ đầu</button><button class="btn" onclick="continueBook()">↪ Đọc tiếp</button><button class="btn" onclick="toggleFav(\''+esc(b.id)+'\');openBook(\''+esc(b.id)+'\')">'+(favs().includes(b.id)?T('removeShelf'):T('addShelf'))+'</button><button class="btn" onclick="shareCurrent()">↗ Chia sẻ</button><button class="btn good" onclick="downloadBook(\''+esc(b.id)+'\')">⬇ Lưu cả truyện offline</button></div></div></div>';
 await loadChapterPage(1);
}
window.openBook=openBook;window.openDetail=()=>state.book&&openBook(state.book.id);
window.renderChapters=()=>{
 const order=state.chapters.slice();
 $('#chapterCount').textContent=(chapterTotal||order.length)+' '+T('chapterUnit')+' · '+T('page')+' '+chapterPage;
 $('#chapters').innerHTML=order.map(c=>'<button class="chapter" onclick="readChapter('+(c.index??c.chapter??0)+')">'+T('chapterUnit')+' '+chapterDisplayNumber(Number(c.index??c.chapter??0))+' · '+esc(c.title||'')+'</button>').join('')||'<div class="empty">Không tìm thấy chương.</div>';
 const pages=Math.max(1,Math.ceil((chapterTotal||0)/chapterPageSize));
 const pager=$('#chapterPager');if(pager)pager.innerHTML=pages>1?'<button class="btn" '+(chapterPage<=1?'disabled':'')+' onclick="loadChapterPage('+(chapterPage-1)+')">← Trước</button><span class="muted"> '+chapterPage+' / '+pages+' </span><button class="btn" '+(chapterPage>=pages?'disabled':'')+' onclick="loadChapterPage('+(chapterPage+1)+')">Sau →</button>':'';
};
window.toggleOrder=()=>{state.order=state.order==='asc'?'desc':'asc';chapterPage=1;loadChapterPage(1)};
window.startBook=i=>{const requested=Number(i);readChapter(Number.isInteger(requested)&&requested>=state.chapterMin&&requested<=state.chapterMax?requested:state.chapterMin)};
window.continueBook=()=>readChapter(progress()[state.book.id]?.chapter??state.chapterMin);
const chapterInflight=new Map();
const translatedChapterCache=new Map();
function storyTargetLanguage(){
 return state.lang==='zh'?'zh-CN':state.lang==='en'?'en':'vi';
}
function translationCacheKey(bookId,index,lang){return bookId+':'+index+':'+lang}
function detectSourceLanguage(text){
 const s=String(text||'');
 if(/[\u3400-\u9fff]/.test(s))return 'zh';
 if(/[ăâđêôơưĂÂĐÊÔƠƯÀ-ỹ]/.test(s))return 'vi';
 return 'en';
}
function targetTranslationCode(target){return target==='zh-CN'?'zh':target==='en'?'en':'vi'}
async function clientProviderLingva(text,target){
 const source=detectSourceLanguage(text),dst=targetTranslationCode(target);
 if(source===dst)return String(text||'');
 const url='https://lingva.ml/api/v1/'+encodeURIComponent(source)+'/'+encodeURIComponent(dst)+'/'+encodeURIComponent(String(text||''));
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 let r;
 try{r=await fetch(url,{headers:{Accept:'application/json'},signal:controller.signal})}
 catch(e){if(e?.name==='AbortError')throw Error('TRANSLATION_TIMEOUT');throw e}
 finally{clearTimeout(timer)}
 if(!r.ok)throw Error('LINGVA_HTTP_'+r.status);
 const j=await r.json(),v=String(j?.translation||'').trim();
 if(!v||v===String(text||'').trim())throw Error('TRANSLATION_EMPTY');
 return v;
}
async function clientProviderGoogle(text,target){
 const u='https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl='+encodeURIComponent(target)+'&dt=t&q='+encodeURIComponent(text);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);
 let r;
 try{r=await fetch(u,{headers:{Accept:'application/json'},signal:controller.signal})}
 catch(e){if(e?.name==='AbortError')throw Error('TRANSLATION_TIMEOUT');throw e}
 finally{clearTimeout(timer)}
 if(!r.ok)throw Error('TRANSLATION_HTTP_'+r.status);
 const j=await r.json(),translated=Array.isArray(j?.[0])?j[0].map(x=>x?.[0]||'').join(''):'';
 if(!translated)throw Error('TRANSLATION_EMPTY');
 return translated;
}
function utf8Chunks(text,maxBytes=500){
 const out=[],chars=[...String(text||'')];let cur='',bytes=0;
 for(const ch of chars){
  const n=new TextEncoder().encode(ch).length;
  if(cur&&bytes+n>maxBytes){out.push(cur);cur='';bytes=0}
  cur+=ch;bytes+=n;
 }
 if(cur)out.push(cur);return out;
}
async function clientProviderMyMemory(text,target){
 const sourceLang=detectSourceLanguage(text),dst=targetTranslationCode(target);
 if(sourceLang===dst)return String(text||'');
 const url='https://api.mymemory.translated.net/get?q='+encodeURIComponent(String(text||''))+'&langpair='+encodeURIComponent(sourceLang+'|'+dst);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);
 let r;
 try{r=await fetch(url,{headers:{Accept:'application/json'},signal:controller.signal})}
 catch(e){if(e?.name==='AbortError')throw Error('TRANSLATION_TIMEOUT');throw e}
 finally{clearTimeout(timer)}
 if(!r.ok)throw Error('TRANSLATION_MEMORY_HTTP_'+r.status);
 const j=await r.json(),translated=String(j?.responseData?.translatedText||'').trim();
 if(!translated||translated===String(text||'').trim())throw Error('TRANSLATION_EMPTY');
 return translated;
}
async function translateClientText(text,target){
 const source=String(text||'').trim();
 if(!source)return '';
 if(detectSourceLanguage(source)===targetTranslationCode(target))return source;
 const chunks=splitTTSText(source,1600),out=[];
 for(const chunk of chunks){
  let translated;
  try{translated=await clientProviderLingva(chunk,target)}
  catch{try{translated=await clientProviderGoogle(chunk,target)}catch{
    const pieces=utf8Chunks(chunk,500),translatedPieces=[];
    for(const piece of pieces)translatedPieces.push(await clientProviderMyMemory(piece,target));
    translated=translatedPieces.join('');
  }}
  if(!translated)throw Error('TRANSLATION_EMPTY');
  out.push(translated);
 }
 return out.join('\n');
}
async function translateChapterFallback(chapter,lang){
 if(lang==='vi'&&/[㐀-鿿]/.test(String(chapter.content||''))===false){
  return {...chapter,language:'vi',translated:false};
 }
 if(lang==='en'&&/^[\x00-\x7F\s\p{P}\p{N}]+$/u.test(String(chapter.content||''))){
  return {...chapter,language:'en',translated:false};
 }
 if(lang==='zh-CN'&&/[\u3400-\u9fff]/.test(String(chapter.content||''))){
  return {...chapter,language:'zh-CN',translated:false};
 }
 const key=translationCacheKey(state.book.id,chapter.index??state.chapter,lang);
 if(translatedChapterCache.has(key))return translatedChapterCache.get(key);
 const [content,title]=await Promise.all([
  translateClientText(chapter.content||'',lang),
  translateClientText(chapter.title||'',lang).catch(()=>chapter.title||'')
 ]);
 const result={...chapter,title,content,language:lang,translated:true};
 translatedChapterCache.set(key,result);
 return result;
}
async function fetchChapterData(i){
 const lang=storyTargetLanguage();
 const key=state.book.id+':'+i+':'+lang;
 if(chapterInflight.has(key))return chapterInflight.get(key);
 const fallback=async()=>{
  const cachedTranslated=await offlineGet(state.book.id,i,lang).catch(()=>null);
  if(cachedTranslated?.language===lang&&cachedTranslated.translated)return cachedTranslated;
  const cached=await offlineGet(state.book.id,i,'original').catch(()=>null);
  const base=cached||state.chapters.find(x=>(x.index??x.chapter)===i)||state.book.chapters?.[i];
  const original=cached||{bookId:state.book.id,index:i,title:base?.title||('Chương '+(i+1)),content:base?.content||base?.[1]||''};
  if(lang==='vi'&&!/[\u3400-\u9fff]/.test(String(original.content||'')))return {...original,language:'vi',translated:false};
  try{
   const translated=await translateChapterFallback(original,lang);
   if(translated?.translated)offlinePut(state.book.id,i,translated,lang).catch(()=>{});
   return translated;
  }catch(e){return {...original,language:null,translated:false,translationError:String(e.message||e)}}
 };
 const job=(async()=>{
  if(!state.apiAvailable)return fallback();
  try{
   const j=await api('/stories/'+encodeURIComponent(state.book.id)+'/chapters/'+i+'?lang='+encodeURIComponent(lang));
   if(j?.translated===false){
    try{
     const translated=await translateChapterFallback(j,lang);
     if(translated?.translated)offlinePut(state.book.id,i,translated,lang).catch(()=>{});
     return translated;
    }catch{return j}
   }
   offlinePut(state.book.id,i,j,lang).catch(()=>{});
   return j;
  }catch{
   try{return await fallback()}catch{state.apiAvailable=false;return fallback()}
  }
 })();
 chapterInflight.set(key,job);try{return await job}finally{chapterInflight.delete(key)}
}
async function prefetchChapter(i){if(!state.book||i<state.chapterMin||i>state.chapterMax)return;try{await fetchChapterData(i)}catch{}}
let autoAdvanceTimer=0,ttsRunId=0,readerLoadId=0,ttsAudio=null;
function totalChapterCount(){return Number(state.book?.chapterCount||state.book?.chapters?.length||state.chapters.length||0)}
function chapterDisplayNumber(index){const n=Number(index);return Number.isInteger(n)?(state.chapterMin===0?n+1:n):''}
function scheduleAutoAdvance(){
 if(autoAdvanceTimer||!state.book)return;
  const n=totalChapterCount();if(state.chapterMax<state.chapter+1)return;
 $('#autoNext').style.display='flex';
 autoAdvanceTimer=setTimeout(async()=>{
  autoAdvanceTimer=0;
  const next=state.chapter+1;
  const keepTts=ttsState.active,runId=ttsRunId;
  if(keepTts)try{speechSynthesis?.cancel?.()}catch{}
  await readChapter(next);
  if(keepTts&&runId===ttsRunId)startTTSCurrent();
 },900);
}
async function readChapter(i,options={}){
 if(!state.book)return;
 if(autoAdvanceTimer){clearTimeout(autoAdvanceTimer);autoAdvanceTimer=0}
 const n=totalChapterCount();
  if(i<state.chapterMin||i>state.chapterMax||state.chapterMax<state.chapterMin)return;
 const loadId=++readerLoadId;
 const bookId=state.book.id;
 const lang=state.lang;
 const j=await fetchChapterData(i);
 if(loadId!==readerLoadId||bookId!==state.book?.id||lang!==state.lang)return;
 state.chapter=i;state.current=j;if(j?.translationError&&state.lang!=='vi')toast(T('translationError'));show('reader');$('#rbook').textContent=state.book.title;$('#rtitle').textContent=j.title||((T('chapterUnit'))+' '+chapterDisplayNumber(i));$('#rmeta').textContent=T('chapterUnit')+' '+chapterDisplayNumber(i)+' · '+(state.book.author||'');const bookmarkBtn=$('#bookmarkBtn');if(bookmarkBtn)bookmarkBtn.textContent=isBookmarked()?T('marked'):T('mark');$('#rtext').innerHTML=String(j.content||'').split(/\n+/).filter(Boolean).map(x=>'<p>'+esc(x)+'</p>').join('');
 applyReader();recordRead();updateReaderProgress();restoreScroll();if(!options.skipHistory)history.pushState({},'',location.pathname+'#'+encodeURIComponent(state.book.id)+'/chapter/'+i);
 requestAnimationFrame(()=>prefetchChapter(i+1));
}
window.readChapter=readChapter;
window.addEventListener('popstate',async()=>{
 const m=location.hash.match(/^#([^/]+)\/chapter\/(\d+)$/);
 if(m){const id=decodeURIComponent(m[1]);if(state.books.some(b=>b.id===id)){if(state.book?.id!==id)await openBook(id);await readChapter(Number(m[2]),{skipHistory:true});return}}
 if(state.book&&($('#reader')?.classList.contains('show')||$('#detail')?.classList.contains('show')))openDetail();
});
function recordRead(){const h=hist().filter(x=>!(x.bookId===state.book.id&&x.chapter===state.chapter));h.unshift({bookId:state.book.id,chapter:state.chapter,title:state.current?.title||'',at:Date.now()});setHist(h.slice(0,50));const p=progress();p[state.book.id]={chapter:state.chapter,percent:(p[state.book.id]?.chapter===state.chapter?Number(p[state.book.id]?.percent)||0:0),updated:Date.now()};setProgress(p);if(state.token)syncProgress().catch(()=>{})}
function updateReaderProgress(){const p=progress()[state.book.id]||{}, n=totalChapterCount()||1;const ordinal=state.chapterMax>=state.chapterMin?state.chapter-state.chapterMin+1:0,chapterPct=state.chapterMax>=state.chapterMin?Math.min(100,Math.round((ordinal/n)*100)):0;const localPct=state.chapter===p.chapter?Number(p.percent)||0:0;$('#rprogress').style.width=Math.max(chapterPct,Math.min(100,localPct))+'%';$('#readPosition').textContent=T('chapterUnit')+' '+chapterDisplayNumber(state.chapter)+' / '+n+' · '+Math.round(localPct||chapterPct)+'%';$('#prev').disabled=state.chapter<=state.chapterMin;$('#autoNext').style.display=state.chapter<state.chapterMax?'flex':'none';const jump=$('#readerSeek');if(jump){jump.min=String(state.chapterMin);jump.max=String(state.chapterMax);jump.value=String(state.chapter)}}
function bookmarks(){try{return JSON.parse(localStorage.getItem('ktf_bookmarks_v1')||'{}')}catch{return{}}}
function setBookmarks(v){localStorage.setItem('ktf_bookmarks_v1',JSON.stringify(v||{}))}
function isBookmarked(){const b=bookmarks();return !!(state.book&&b[state.book.id]&&b[state.book.id][state.chapter])}
window.toggleBookmark=async()=>{if(!state.book)return;const b=bookmarks(),d=deletedBookmarks();b[state.book.id]=b[state.book.id]||{};d[state.book.id]=d[state.book.id]||{};const active=!!b[state.book.id][state.chapter];if(active){delete b[state.book.id][state.chapter];d[state.book.id][state.chapter]=Date.now()}else{b[state.book.id][state.chapter]={title:state.current?.title||'',at:Date.now()};delete d[state.book.id][state.chapter]}setBookmarks(b);setDeletedBookmarks(d);const el=$('#bookmarkBtn');if(el)el.textContent=isBookmarked()?'🔖 Đã đánh dấu':'🔖 Đánh dấu';if(state.token)api('/bookmarks',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({storyId:state.book.id,chapterIndex:state.chapter,title:state.current?.title||'',active:!active})}).then(()=>{const dd=deletedBookmarks();if(dd[state.book.id]){delete dd[state.book.id][state.chapter];if(!Object.keys(dd[state.book.id]).length)delete dd[state.book.id];setDeletedBookmarks(dd)}}).catch(()=>{});renderBookcase();toast(!active?'Đã đánh dấu chương':'Đã bỏ đánh dấu')}
function renderBookmarks(){const box=$('#bookmarkList');if(!box)return;const b=bookmarks(),items=[];for(const [storyId,chs] of Object.entries(b)){const story=state.books.find(x=>x.id===storyId);for(const [idx,v] of Object.entries(chs||{}))items.push({storyId,index:Number(idx),title:v?.title||('Chương '+(Number(idx)+1)),at:Number(v?.at||0),storyTitle:story?.title||storyId})}items.sort((a,b)=>b.at-a.at);box.innerHTML=items.length?items.map(x=>'<div class="histrow"><div><b>'+esc(x.storyTitle)+'</b><div class="muted">'+T('chapterUnit')+' '+chapterDisplayNumber(x.index)+' · '+esc(x.title)+'</div></div><button class="btn" onclick="openBook(\''+esc(x.storyId)+'\').then(()=>readChapter('+x.index+'))">'+T('read')+'</button></div>').join(''):'<div class="empty">'+T('noBookmarks')+'</div>'}
window.goChapter=d=>{const x=state.chapter+d;if(x<state.chapterMin||x>state.chapterMax){toast(d<0?T('prev'):T('next'));return}const keepTts=ttsState.active,runId=ttsRunId;if(keepTts)try{speechSynthesis?.cancel?.()}catch{}readChapter(x).then(()=>{if(keepTts&&runId===ttsRunId)startTTSCurrent()})};
window.font=d=>{state.fontSize=Math.max(14,Math.min(30,state.fontSize+d));save('ktf_fs',state.fontSize);applyReader()};window.setFont=x=>{state.font=x;save('ktf_font',x);applyReader()};window.setTheme=x=>{state.theme=x;save('ktf_theme',x);applyReader()};let ttsState={active:false,chunks:[],pos:0,chapterKey:'',mode:''};
function stopTTS(silent=false){
 ttsRunId++;
 try{speechSynthesis?.cancel?.()}catch{}
 if(ttsAudio){try{ttsAudio.pause();ttsAudio.src=''}catch{}ttsAudio=null}
 ttsState={active:false,chunks:[],pos:0,chapterKey:'',mode:''};
 const l=$('#ttsLabel');if(l)l.textContent=T('read');
 if(!silent)toast(T('read'));
}
function splitTTSText(text,limit=1500){
 let rest=String(text||'').trim(),out=[];
 while(rest.length>limit){
  let cut=Math.max(rest.lastIndexOf('。',limit),rest.lastIndexOf('！',limit),rest.lastIndexOf('？',limit),rest.lastIndexOf('.',limit),rest.lastIndexOf('!',limit),rest.lastIndexOf('?',limit));
  if(cut<Math.floor(limit*.55))cut=limit;
  out.push(rest.slice(0,cut+1).trim());rest=rest.slice(cut+1).trim();
 }
 if(rest)out.push(rest);return out;
}
function ttsLanguage(){
 const explicit=String(state.current?.language||'').trim();
 if(explicit){
  const e=explicit.toLowerCase();
  if(e.startsWith('zh'))return 'zh-CN';
  if(e.startsWith('vi'))return 'vi-VN';
  if(e.startsWith('en'))return 'en-US';
  if(e!=='auto')return explicit;
 }
 const text=$('#rtext')?.innerText||'';
 if(/[\u3400-\u9fff]/.test(text))return 'zh-CN';
 if(/[ăâđêôơưĂÂĐÊÔƠƯÀ-ỹ]/.test(text))return 'vi-VN';
 return state.lang==='zh'?'zh-CN':state.lang==='vi'?'vi-VN':'en-US';
}
function getTTSVoiceState(){
 const hasApi=typeof window.speechSynthesis?.getVoices==='function';
 if(!hasApi)return {known:false,voices:[]};
 try{const v=window.speechSynthesis.getVoices();return {known:true,voices:Array.isArray(v)?v:[]}}
 catch{return {known:true,voices:[]}}
}
function getTTSVoices(){return getTTSVoiceState().voices}
function preferredTTSVoice(lang){
 const voices=getTTSVoices(),want=String(lang||'').toLowerCase();
 return voices.find(v=>String(v.lang||'').toLowerCase()===want)||voices.find(v=>String(v.lang||'').toLowerCase().startsWith(want.split('-')[0]))||null;
}
function remoteTTSUrl(text,lang){
 const q=encodeURIComponent(String(text||'').slice(0,220));
 return 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl='+encodeURIComponent(lang)+'&q='+q;
}
function lingvaAudioLang(lang){return String(lang||'').toLowerCase().startsWith('zh')?'zh':String(lang||'').toLowerCase().startsWith('vi')?'vi':'en'}
async function playLingvaAudio(text,lang,runId){
 const code=lingvaAudioLang(lang),url='https://lingva.ml/api/v1/audio/'+code+'/'+encodeURIComponent(String(text||''));
 const r=await fetch(url,{headers:{Accept:'application/json'}});if(!r.ok)throw Error('LINGVA_AUDIO_HTTP_'+r.status);
 const j=await r.json(),bytes=Array.isArray(j?.audio)?new Uint8Array(j.audio):null;if(!bytes?.length)throw Error('LINGVA_AUDIO_EMPTY');
 const blobUrl=URL.createObjectURL(new Blob([bytes],{type:'audio/mpeg'})),audio=new Audio(blobUrl);audio.preload='auto';ttsAudio=audio;ttsState.mode='audio';
 const cleanup=()=>{try{URL.revokeObjectURL(blobUrl)}catch{}};
 audio.onended=()=>{cleanup();if(ttsState.active&&runId===ttsRunId){ttsAudio=null;setTimeout(()=>speakTTSChunk(runId),25)}};
 audio.onerror=()=>{cleanup();ttsAudio=null;playGoogleAudio(text,lang,runId)};
 try{await audio.play()}catch{cleanup();ttsAudio=null;playGoogleAudio(text,lang,runId)}
}
function playGoogleAudio(text,lang,runId){
 toast('Đang dùng âm thanh dự phòng '+lang);
 const audio=new Audio(remoteTTSUrl(text,lang));audio.preload='auto';ttsAudio=audio;ttsState.mode='audio';
 audio.onended=()=>{if(ttsState.active&&runId===ttsRunId){ttsAudio=null;setTimeout(()=>speakTTSChunk(runId),25)}};
 audio.onerror=()=>{ttsAudio=null;stopTTS(true);toast(T('ttsError'))};
 audio.play().catch(()=>{ttsAudio=null;stopTTS(true);toast(T('ttsError'))});
}
function playTTSAudio(text,lang,runId){playGoogleAudio(text,lang,runId);}

function startTTSCurrent(){
 const text=$('#rtext')?.innerText?.trim()||'';if(!text)return;
 const key=state.book.id+':'+state.chapter,lang=ttsLanguage(),voice=preferredTTSVoice(lang),voiceState=getTTSVoiceState(),nativeUnknown=!voiceState.known,limit=(voice||nativeUnknown)?1500:220;
 ttsRunId++;
 ttsState={active:true,chunks:splitTTSText(text,limit),pos:0,chapterKey:key,mode:(voice||nativeUnknown)?'speech':'audio'};
 $('#ttsLabel').textContent=T('stop');
 speakTTSChunk(ttsRunId);
}
function speakTTSChunk(runId=ttsRunId){
 if(!ttsState.active||runId!==ttsRunId)return;
 if(ttsState.chapterKey!==state.book.id+':'+state.chapter)return;
 if(ttsState.pos>=ttsState.chunks.length){
   const next=state.chapter+1;
   if(next<=state.chapterMax){
   const keep=runId;
   try{speechSynthesis?.cancel?.()}catch{}
   readChapter(next).then(()=>{if(keep===ttsRunId&&ttsState.active)startTTSCurrent()});
  }else stopTTS(true);
  return;
 }
 const text=ttsState.chunks[ttsState.pos++],lang=ttsLanguage();
 const voiceState=getTTSVoiceState(),voice=preferredTTSVoice(lang);
 if(window.SpeechSynthesisUtterance&&(voice||!voiceState.known)){
  const u=new SpeechSynthesisUtterance(text);u.lang=voice?.lang||lang;if(voice)u.voice=voice;u.rate=state.rate;ttsState.mode='speech';
  u.onend=()=>{if(ttsState.active&&runId===ttsRunId)setTimeout(()=>speakTTSChunk(runId),25)};
  u.onerror=()=>{if(runId===ttsRunId)playTTSAudio(text,lang,runId)};
  try{speechSynthesis.speak(u);speechSynthesis.resume?.();return}catch{}
 }
 playTTSAudio(text,lang,runId)
}
window.speak=()=>{if(ttsState.active){stopTTS(true);return}startTTSCurrent()};
window.setTTSRate=x=>{state.rate=+x;save('ktf_rate',state.rate);if(ttsState.active){stopTTS(true);startTTSCurrent()}};
window.toggleSettings=()=>{const x=$('#settings');x.style.display=x.style.display==='none'?'flex':'none'};
function applyReader(){const r=$('#reader'),a=$('#rtext');if(!a)return;state.font=(state.font==='Georgia'||state.font==='system-ui')?state.font:'system-ui';const readerLang=$('#readerLangSelect');if(readerLang)readerLang.value=state.lang;a.style.fontSize=state.fontSize+'px';a.style.fontFamily=state.font;r.classList.toggle('continuous',state.continuous);if(state.theme==='light'){r.style.background='#fff';r.style.color='#172033';a.style.color='#263241'}else if(state.theme==='sepia'){r.style.background='#f3ead7';r.style.color='#4b3a28';a.style.color='#4b3a28'}else{r.style.background='var(--reader)';r.style.color='var(--text)';a.style.color='var(--readerText)'}$('#themeSelect').value=state.theme;$('#fontSelect').value=state.font;$('#ttsRate').value=String(state.rate)}
window.toggleContinuous=()=>{state.continuous=!state.continuous;applyReader()};

let scrollSaveTimer=0,scrollUiFrame=0,restoringScroll=false,lastPersistKey='',lastPersistPct=-1;
function scrollKey(){return state.book?state.book.id+':'+state.chapter:null}
function scrollPercent(){const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);return Math.max(0,Math.min(100,Math.round((scrollY/max)*1000)/10))}
function updateScrollUi(pct){if(!state.book)return;$('#rprogress').style.width=Math.min(100,pct)+'%';$('#readPosition').textContent=T('chapterUnit')+' '+(state.chapter+1)+' / '+(state.book.chapterCount||1)+' · '+Math.round(pct)+'%'}
function persistScroll(pct,force=false){const key=scrollKey();if(!key||!state.book)return;if(!force&&key===lastPersistKey&&Math.abs(pct-lastPersistPct)<0.5)return;const p=progress();p[state.book.id]={chapter:state.chapter,percent:pct,updated:Date.now()};setProgress(p);lastPersistKey=key;lastPersistPct=pct;if(state.token){clearTimeout(scrollSaveTimer);scrollSaveTimer=setTimeout(()=>syncProgress().catch(()=>{}),700)}}
function handleReaderScroll(){if(restoringScroll||!$('#reader')?.classList.contains('show'))return;if(!scrollUiFrame)scrollUiFrame=requestAnimationFrame(()=>{scrollUiFrame=0;const pct=scrollPercent();updateScrollUi(pct);const p=progress()[state.book?.id];if(pct>=99){if(!p||Number(p.percent)<99)markChapterRead();scheduleAutoAdvance()}else if(p&&p.percent<95&&autoAdvanceTimer){clearTimeout(autoAdvanceTimer);autoAdvanceTimer=0}});clearTimeout(scrollSaveTimer);scrollSaveTimer=setTimeout(()=>{if(!restoringScroll&&$('#reader')?.classList.contains('show'))persistScroll(scrollPercent())},350)}
function saveScroll(force=false){if($('#reader')?.classList.contains('show')&&!restoringScroll)persistScroll(scrollPercent(),force)}
function restoreScroll(){const p=progress()[state.book?.id];if(!p||p.chapter!==state.chapter)return;restoringScroll=true;requestAnimationFrame(()=>{const max=Math.max(0,document.documentElement.scrollHeight-innerHeight);window.scrollTo(0,max*(Math.max(0,Math.min(100,p.percent))/100));setTimeout(()=>{restoringScroll=false},120)})}
function markChapterRead(){const p=progress();const cur=p[state.book?.id];if(!state.book||!cur||Number(cur.percent)>=100)return;cur.percent=100;cur.updated=Date.now();setProgress(p);lastPersistKey=scrollKey();lastPersistPct=100;if(state.token)syncProgress().catch(()=>{});updateReaderProgress()}
window.addEventListener('scroll',handleReaderScroll,{passive:true});
window.addEventListener('pagehide',()=>{if($('#reader')?.classList.contains('show'))saveScroll(true)});
window.readerSeekChapter=async v=>{const i=Number(v);if(Number.isFinite(i)&&state.book&&state.chapterMax>=state.chapterMin){await readChapter(Math.max(state.chapterMin,Math.min(state.chapterMax,i)))}};window.readerTop=()=>window.scrollTo({top:0,behavior:'smooth'});
window.readerBottom=()=>{window.scrollTo({top:document.documentElement.scrollHeight,behavior:'smooth'});setTimeout(()=>{if($('#reader')?.classList.contains('show')&&!restoringScroll){const max=Math.max(0,document.documentElement.scrollHeight-innerHeight);if(max<=8||scrollY>=max-8){markChapterRead();scheduleAutoAdvance()}}},120)};
const nativeReaderScrollTo=window.scrollTo.bind(window);
window.scrollTo=function(...args){const target=typeof args[0]==='object'?Number(args[0]?.top||0):Number(args[1]||0);nativeReaderScrollTo(...args);if(target>0&&$('#reader')?.classList.contains('show')&&$('#rtext')?.innerText?.trim()){setTimeout(()=>{if(!restoringScroll&&!$('#reader')?.classList.contains('show'))return;const max=Math.max(0,document.documentElement.scrollHeight-innerHeight);if(target>=document.documentElement.scrollHeight-2||max<=8){markChapterRead();scheduleAutoAdvance()}},0)}};
window.readerToggleFullscreen=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen()}catch{}};
let touchStartX=0,touchStartY=0;
document.addEventListener('touchstart',e=>{if(!$('#reader')?.classList.contains('show'))return;const t=e.changedTouches[0];touchStartX=t.clientX;touchStartY=t.clientY},{passive:true});
document.addEventListener('touchend',e=>{if(!$('#reader')?.classList.contains('show'))return;const t=e.changedTouches[0],dx=t.clientX-touchStartX,dy=t.clientY-touchStartY;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.4)goChapter(dx<0?1:-1)},{passive:true});

const OFFDB='ktf_offline_v2';
function offlineOpen(){return new Promise((resolve,reject)=>{if(!indexedDB)return reject(Error('NO_INDEXEDDB'));const r=indexedDB.open(OFFDB,2);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('chapters'))db.createObjectStore('chapters',{keyPath:'key'});if(!db.objectStoreNames.contains('downloads'))db.createObjectStore('downloads',{keyPath:'bookId'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
const offlineKey=(bookId,index,lang='original')=>bookId+':'+index+':'+lang;
async function offlinePut(bookId,index,data,lang='original'){const db=await offlineOpen();return new Promise((res,rej)=>{const tx=db.transaction('chapters','readwrite');tx.objectStore('chapters').put({key:offlineKey(bookId,index,lang),bookId,index,lang,data,at:Date.now()});tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function offlineGet(bookId,index,lang='original'){const db=await offlineOpen();return new Promise((res,rej)=>{const tx=db.transaction('chapters');const r=tx.objectStore('chapters').get(offlineKey(bookId,index,lang));r.onsuccess=()=>res(r.result?.data||null);r.onerror=()=>rej(r.error)})}
async function offlineListDownloads(){const db=await offlineOpen();return new Promise((res,rej)=>{const tx=db.transaction('downloads');const r=tx.objectStore('downloads').getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)})}
async function offlineGetDownload(bookId){const db=await offlineOpen();return new Promise((res,rej)=>{const tx=db.transaction('downloads');const r=tx.objectStore('downloads').get(bookId);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})}
async function offlineSetDownload(job){const db=await offlineOpen();return new Promise((res,rej)=>{const tx=db.transaction('downloads','readwrite');tx.objectStore('downloads').put(job);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function offlineDeleteBook(bookId){const db=await offlineOpen();return new Promise((res,rej)=>{const tx=db.transaction(['chapters','downloads'],'readwrite');const cs=tx.objectStore('chapters'),ds=tx.objectStore('downloads');const q=cs.openCursor();q.onsuccess=()=>{const cur=q.result;if(cur){if(cur.value.bookId===bookId)cur.delete();cur.continue()}else ds.delete(bookId)};tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function offlineEstimate(){try{return await navigator.storage?.estimate?.()||{}}catch{return {}}}
async function refreshOfflineUI(){const jobs=await offlineListDownloads().catch(()=>[]);state.offline=new Set(jobs.filter(x=>x.status==='complete').map(x=>x.bookId));const used=jobs.reduce((n,x)=>n+Number(x.bytes||0),0);const box=$('#downloadList');if(box)box.innerHTML=jobs.length?jobs.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).map(j=>{const pct=j.total?Math.round(j.done/j.total*100):0;const b=state.books.find(x=>x.id===j.bookId);const action=j.status==='complete'?'<button class="btn" onclick="removeOffline(\''+esc(j.bookId)+'\')">Xóa</button>':j.status==='downloading'?'<button class="btn" onclick="cancelOffline(\''+esc(j.bookId)+'\')">Dừng</button>':'<button class="btn" onclick="downloadBook(\''+esc(j.bookId)+'\')">Tiếp tục</button>';return '<div class="histrow"><div class="grow"><b>'+esc(b?.title||j.title||j.bookId)+'</b><div class="muted">'+(j.status==='complete'?'Đã lưu đầy đủ':j.status==='downloading'?'Đang tải '+pct+'%':j.status==='cancelled'?'Đã dừng · '+pct+'%':'Lỗi · '+esc(j.error||''))+' · '+j.done+'/'+j.total+' chương</div></div>'+action+'</div>'}).join(''):'<div class="empty">Chưa có truyện offline.</div>';$('#statDownloaded').textContent=state.offline.size;const est=await offlineEstimate();if(box&&est.quota)box.insertAdjacentHTML('afterbegin','<div class="muted" style="margin-bottom:10px">Bộ nhớ offline: '+Math.round(Number(est.usage||used)/1048576)+' MB / '+Math.round(Number(est.quota)/1048576)+' MB</div>')}
let offlineCancel=new Set();
function localChapterData(bookId,index){
 const b=state.book?.id===bookId?state.book:state.books.find(x=>x.id===bookId);
 if(!b)return null;
 const local=Array.isArray(b.chapters)?b.chapters:[];
 const c=local.find((v,i)=>Number(v?.index??i)===Number(index)) ?? local[index];
 if(!c)return null;
 return Array.isArray(c)
   ? {bookId,index:Number(index),title:c[0]||('Chương '+(Number(index)+1)),content:c[1]||''}
   : {...c,bookId,index:Number(c.index??index),title:c.title||('Chương '+(Number(index)+1)),content:c.content||''};
}
async function fetchChapterForOffline(bookId,index){
 if(!state.apiAvailable){
  const local=localChapterData(bookId,index);
  if(local)return local;
 }
 try{return await api('/stories/'+encodeURIComponent(bookId)+'/chapters/'+Number(index))}
 catch{
  const local=localChapterData(bookId,index);
  if(local)return local;
  throw Error('CHAPTER_NOT_AVAILABLE');
 }
}
async function getDownloadChapterMeta(bookId){
 try{
  let page=1,total=0,chapters=[];
  do{
    const j=await api('/stories/'+encodeURIComponent(bookId)+'/chapters?page='+page+'&pageSize=100');
    const items=j.items||[];
    chapters.push(...items);total=Number(j.count??chapters.length);
    if(!items.length||chapters.length>=total||items.length<100)break;
    page++;
  }while(page<10000);
  if(chapters.length)return chapters;
 }catch{}
 const b=state.book?.id===bookId?state.book:state.books.find(x=>x.id===bookId),local=Array.isArray(b?.chapters)?b.chapters:[];
 return local.map((c,i)=>Array.isArray(c)
   ? {index:i,title:c[0]||('Chương '+(i+1))}
   : {index:Number(c?.index??i),title:c?.title||('Chương '+(i+1))});
}
async function downloadBook(bookId){
 const b=state.books.find(x=>x.id===bookId)||state.book;if(!b)return;
 let job=await offlineGetDownload(bookId)||{bookId,title:b.title,done:0,total:0,status:'queued',bytes:0,updatedAt:new Date().toISOString()};
 job.status='downloading';job.error='';job.updatedAt=new Date().toISOString();await offlineSetDownload(job);refreshOfflineUI();
 try{
  let chapters=[];
  if(!state.apiAvailable){
   try{
    const staticBooks=await loadStaticSeed();
    const sb=staticBooks.find(x=>x.id===bookId);
    if(sb&&Array.isArray(sb.chapters)&&sb.chapters.length){
     chapters=sb.chapters.map((c,i)=>Array.isArray(c)
       ? {index:i,title:c[0]||('Chương '+(i+1)),content:c[1]||'',bookId}
       : {...c,index:Number(c?.index??i),title:c?.title||('Chương '+(i+1)),content:c?.content||'',bookId});
    }
   }catch{}
  }
  if(!chapters.length)chapters=await getDownloadChapterMeta(bookId);
  job.total=chapters.length;
  job.done=0;
  job.updatedAt=new Date().toISOString();
  await offlineSetDownload(job);
  for(let k=0;k<chapters.length;k++){
    if(offlineCancel.has(bookId)){
      offlineCancel.delete(bookId);job.status='cancelled';job.updatedAt=new Date().toISOString();await offlineSetDownload(job);refreshOfflineUI();return;
    }
    const meta=chapters[k],idx=Number(meta.index??k),existing=await offlineGet(bookId,idx);
    if(existing){job.done++;continue}
    const data=String(meta.content||'').trim()?meta:await fetchChapterForOffline(bookId,idx);
    await offlinePut(bookId,idx,data);
    job.done++;job.bytes+=JSON.stringify(data).length;job.updatedAt=new Date().toISOString();
    if(job.done===1||job.done%10===0||job.done===job.total){await offlineSetDownload(job);refreshOfflineUI()}
    if(job.done%3===0)await new Promise(resolve=>setTimeout(resolve,0));
  }
  job.status='complete';job.updatedAt=new Date().toISOString();await offlineSetDownload(job);toast('Đã lưu '+b.title+' offline');refreshOfflineUI();
 }catch(e){
  job.status='error';job.error=e.message||'DOWNLOAD_FAILED';job.updatedAt=new Date().toISOString();await offlineSetDownload(job);refreshOfflineUI();toast('Tải offline bị gián đoạn, có thể tiếp tục');
 }
}
window.downloadBook=downloadBook;window.cancelOffline=id=>{offlineCancel.add(id);toast('Đang dừng tải…')};window.removeOffline=async id=>{await offlineDeleteBook(id).catch(()=>{});refreshOfflineUI();toast('Đã xóa dữ liệu offline')};
window.downloadChapter=()=>{const text=state.book.title+'\n'+$('#rtitle').textContent+'\n\n'+$('#rtext').innerText;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));a.download=(state.book.title+'-'+state.chapter+'.txt').replace(/[^\w\-À-ỹ ]/g,'_');a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);toast('Đã tải chương')};
window.shareCurrent=async()=>{const u=location.href;if(navigator.share)try{await navigator.share({title:state.book?.title||'Kho Truyện Full',url:u});return}catch{}
 try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(u);toast('Đã sao chép liên kết');return}}catch{}
 window.prompt('Sao chép liên kết truyện:',u)};
function renderHistory(){const h=hist();$('#historyList').innerHTML=h.length?h.map(x=>{const b=state.books.find(b=>b.id===x.bookId);return '<div class="histrow"><div><b>'+esc(b?.title||x.bookId)+'</b><div class="muted">'+T('chapterUnit')+' '+chapterDisplayNumber(Number(x.chapter))+' · '+esc(x.title)+'</div></div><button class="btn" onclick="openBook(\''+esc(x.bookId)+'\').then(()=>readChapter('+x.chapter+'))">'+T('read')+'</button></div>'}).join(''):'<div class="empty">'+T('noHistory')+'</div>'}
window.clearHistory=async()=>{setHist([]);setHistoryClearPending(true);renderHistory();if(state.token){try{await api('/history',{method:'DELETE'});setHistoryClearPending(false);toast('Đã xóa lịch sử')}catch{toast('Đã xóa trên máy; sẽ đồng bộ khi online')}}else toast('Đã xóa lịch sử')};
function renderBookcase(){renderBookmarks();const a=favs();$('#favList').innerHTML=a.length?a.map(id=>{const b=state.books.find(x=>x.id===id);return b?'<div class="histrow"><div><b>'+esc(b.title)+'</b><div class="muted">'+esc(b.author)+'</div></div><button class="btn" onclick="openBook(\''+esc(id)+'\')">Mở</button></div>':''}).join(''):'<div class="empty">Tủ truyện đang trống.</div>';refreshOfflineUI()}
async function syncProgress(){if(!state.token||!state.book)return;const p=progress();await api('/progress',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({storyId:state.book.id,chapterIndex:state.chapter,position:p[state.book.id]?.percent||0})})}
async function pushLocalSync(){
 if(!state.token)return;
 if(historyClearPending()){try{await api('/history',{method:'DELETE'});setHistoryClearPending(false)}catch{}}
 const p=progress(),f=favs(),b=bookmarks(),jobs=[],deletedF=deletedFavs(),deletedB=deletedBookmarks(),clearedF=[],clearedB=[];
 for(const [id,v] of Object.entries(p))jobs.push(api('/progress',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({storyId:id,chapterIndex:Number(v.chapter||0),position:Number(v.percent)||0})}).catch(()=>null));
 for(const id of f)jobs.push(api('/favorites',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({storyId:id,active:true})}).catch(()=>null));
 for(const id of deletedF)jobs.push(api('/favorites',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({storyId:id,active:false})}).then(()=>clearedF.push(id)).catch(()=>null));
 for(const [storyId,chs] of Object.entries(b))for(const [idx,v] of Object.entries(chs||{}))jobs.push(api('/bookmarks',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({storyId,chapterIndex:Number(idx),title:v?.title||'',active:true})}).catch(()=>null));
 for(const [storyId,chs] of Object.entries(deletedB))for(const idx of Object.keys(chs||{}))jobs.push(api('/bookmarks',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({storyId,chapterIndex:Number(idx),active:false})}).then(()=>{clearedB.push([storyId,idx])}).catch(()=>null));
 const result=await Promise.all(jobs);
 if(clearedF.length){const remain=deletedFavs().filter(id=>!clearedF.includes(id));setDeletedFavs(remain)}
 if(clearedB.length){const cur=deletedBookmarks();for(const [storyId,idx] of clearedB)if(cur[storyId]){delete cur[storyId][idx];if(!Object.keys(cur[storyId]).length)delete cur[storyId]}setDeletedBookmarks(cur)}
 return result;
}
async function restoreAccount(){
 if(!state.token)return;
 try{
  const u=await api('/auth/me');state.user=u;
  const remote=await api('/sync'), localP=progress(), localF=favs(), localB=bookmarks();
  const remoteP=remote.progress||{};
  for(const [id,v] of Object.entries(remoteP)){
   const local=localP[id];
   if(!local||new Date(v.updatedAt||0)>=new Date(local.updatedAt||0))localP[id]={chapter:Number(v.chapterIndex)||0,percent:Number(v.position)||0,updated:new Date(v.updatedAt||Date.now()).getTime()};
  }
  setProgress(localP);
  const remoteB=remote.bookmarks||{},deletedB=deletedBookmarks();for(const [id,items] of Object.entries(remoteB)){localB[id]=localB[id]||{};for(const v of (items||[])){const idx=Number(v.chapterIndex||0);if(deletedB[id]?.[idx])continue;const cur=localB[id][idx];const remoteTime=Date.parse(v.updatedAt||'')||0;const localTime=Number(cur?.at||0);if(!cur||remoteTime>=localTime)localB[id][idx]={title:v.title||'',at:remoteTime||Date.now()}}}setBookmarks(localB);
  const remoteH=remote.history||{},localH=hist(),historyByKey=new Map(localH.map(x=>[x.bookId+':'+x.chapter,{...x}]));for(const [id,v] of Object.entries(remoteH)){const key=id+':'+Number(v.chapterIndex||0),cur=historyByKey.get(key),rt=Date.parse(v.updatedAt||'')||0,lt=Number(cur?.at||0);if(!cur||rt>=lt)historyByKey.set(key,{bookId:id,chapter:Number(v.chapterIndex||0),title:cur?.title||'',at:rt||Date.now()})}setHist([...historyByKey.values()].sort((a,b)=>Number(b.at||0)-Number(a.at||0)).slice(0,200));
  const deletedF=new Set(deletedFavs());const mergedF=[...new Set([...(Array.isArray(remote.favorites)?remote.favorites:[]).filter(id=>!deletedF.has(id)),...localF])];setFavs(mergedF);
  await pushLocalSync();
  updateStats();renderBookcase();
 }catch(e){
  if(e?.message==='UNAUTHORIZED'||e?.message==='INVALID_CREDENTIALS'){
   state.token='';localStorage.removeItem('ktf_token');state.user=null;
  } else {
   toast('Chưa đồng bộ được dữ liệu; sẽ thử lại khi online');
  }
 }
}
window.syncNow=async()=>{if(!state.token)return toast('Hãy đăng nhập trước');try{await pushLocalSync();await restoreAccount();toast('Đã đồng bộ tủ truyện và tiến độ')}catch{toast('Đồng bộ chưa hoàn tất')}}
window.addEventListener('online',()=>{if(state.token)window.syncNow?.()});
function accountError(e){
 const map={API_UNREACHABLE:'Chưa kết nối được máy chủ đăng nhập. Trang GitHub Pages đang thiếu backend API; hãy cấu hình URL API bằng nút 🌐 một lần.',HTTP_404:'Không tìm thấy máy chủ API đăng nhập. Kiểm tra URL API.',INVALID_ACCOUNT:'Tên đăng nhập 3–32 ký tự, chỉ dùng a-z, 0-9, dấu chấm, gạch dưới hoặc gạch ngang; mật khẩu tối thiểu 6 ký tự.',USERNAME_EXISTS:'Tên đăng nhập đã tồn tại.',INVALID_CREDENTIALS:'Tên đăng nhập hoặc mật khẩu không đúng.',UNAUTHORIZED:'Phiên đăng nhập đã hết hạn.'};
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
   '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn primary" id="accountSave">Lưu hồ sơ</button><button class="btn" id="accountPassword">Đổi mật khẩu</button><button class="btn" id="accountLogout">Đăng xuất</button></div><div id="passwordBox" style="display:none;margin-top:12px"></div>';
   $('#accountHint').textContent='Bạn đang đăng nhập';
   $('#accountSave').onclick=async()=>{try{const j=await api('/profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({displayName:$('#accountDisplay').value.trim()})});state.user={...state.user,displayName:j.displayName};toast('Đã cập nhật hồ sơ');render()}catch(e){$('#accountMsg').textContent=accountError(e)}};
   $('#accountPassword').onclick=()=>{$('#passwordBox').style.display='block';$('#passwordBox').innerHTML='<div style="display:grid;gap:8px"><input id="currentPassword" type="password" placeholder="Mật khẩu hiện tại"><input id="newPassword" type="password" placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"><button class="btn good" id="passwordSave">Cập nhật mật khẩu</button></div>';$('#passwordSave').onclick=async()=>{try{await api('/account/password',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword:$('#currentPassword').value,newPassword:$('#newPassword').value})});$('#accountMsg').textContent='Đã đổi mật khẩu. Các phiên khác đã được đăng xuất.';$('#passwordBox').style.display='none'}catch(e){$('#accountMsg').textContent=accountError(e)}}};$('#accountLogout').onclick=logout;
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
    }catch(e){const msg=$('#accountMsg');if(e.message==='API_UNREACHABLE'||e.message==='HTTP_404'){msg.innerHTML=esc(accountError(e))+' <button type="button" class="btn" id="accountApiConfig" style="margin-top:8px">🌐 Cấu hình máy chủ API</button><div class="muted" style="margin-top:5px;font-size:11px">API hiện tại: '+esc(apiBase())+'</div>';$('#accountApiConfig').onclick=configureApi}else msg.textContent=accountError(e)}
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
s.querySelector('#adBackup').onclick=async()=>{try{const j=await api('/admin/backup');const blob=new Blob([JSON.stringify(j)],{type:'application/json'});const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='kho-truyen-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);out.textContent='Đã tạo backup'}catch(e){out.textContent='Backup lỗi: '+e.message}};
s.querySelector('#adRestoreBtn').onclick=async()=>{const f=s.querySelector('#adRestore').files[0];if(!f)return out.textContent='Chọn file backup JSON';if(!confirm('Restore sẽ thay toàn bộ dữ liệu hiện tại. Tiếp tục?'))return;try{const j=JSON.parse(await f.text());await api('/admin/backup/restore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(j)});out.textContent='Restore thành công. Đang tải lại...';location.reload()}catch(e){out.textContent='Restore lỗi: '+e.message}};
s.querySelector('#adDiag').onclick=async()=>{try{out.textContent=JSON.stringify(await api('/admin/stories/diagnostics'),null,2)}catch(e){out.textContent='Diagnostics lỗi: '+e.message}};
};
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;if(e.key==='ArrowRight')goChapter(1);else if(e.key==='ArrowLeft')goChapter(-1);else if(e.code==='Space'){e.preventDefault();speak()}else if(e.key==='Escape')$('#reader')?.classList.toggle('focus')});
async function boot(){applyLanguage();await loadBooks();await refreshOfflineUI();await restoreAccount();renderLibrary();applyLanguage();const m=location.hash.match(/^#([^/]+)\/chapter\/(\d+)/);if(m){const id=decodeURIComponent(m[1]);if(state.books.some(b=>b.id===id))await openBook(id).then(()=>readChapter(+m[2],{skipHistory:true}))}if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{})}
boot();
})();