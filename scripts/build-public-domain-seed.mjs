import fs from 'node:fs';

const API='https://zh.wikisource.org/w/api.php';

const books=[
  {id:'phong-than-dien-nghia',title:'Phong Thần Diễn Nghĩa',author:'Trần Trọng Lâm / 陳仲琳',category:'Tiên hiệp / Thần ma',status:'FULL',source:'https://zh.wikisource.org/wiki/封神演義',sourceTitle:'封神演義',mode:'fixed',expected:100,fixedPattern:i=>'卷'+String(i).padStart(3,'0')},
  {id:'tay-du-ky',title:'Tây Du Ký',author:'Ngô Thừa Ân / 吳承恩',category:'Tiên hiệp / Thần ma',status:'FULL',source:'https://zh.wikisource.org/wiki/西遊記',sourceTitle:'西遊記',mode:'chapters',expected:100},
  {id:'hau-tay-du-ky',title:'Hậu Tây Du Ký',author:'Đài Sơn Nhân / 無名氏',category:'Tiên hiệp / Thần ma',status:'FULL',source:'https://zh.wikisource.org/wiki/後西遊記',sourceTitle:'後西遊記',mode:'chapters',expected:40},
  {id:'dong-du-ky',title:'Đông Du Ký',author:'Ngô Nguyên Thái / 吳元泰',category:'Tiên hiệp / Thần ma',status:'FULL',source:'https://zh.wikisource.org/wiki/東遊記',sourceTitle:'東遊記',mode:'chapters',expected:56},
  {id:'nam-du-ky',title:'Nam Du Ký',author:'Dư Tượng Đẩu / 余象斗',category:'Tiên hiệp / Thần ma',status:'FULL',source:'https://zh.wikisource.org/wiki/南遊記',sourceTitle:'南遊記',mode:'south-volumes'},
  {id:'bac-du-ky',title:'Bắc Du Ký',author:'Dư Tượng Đẩu / 余象斗',category:'Tiên hiệp / Thần ma',status:'FULL',source:'https://zh.wikisource.org/wiki/北遊記',sourceTitle:'北遊記',mode:'chapters',expected:24},
  {id:'bat-tien-dac-dao',title:'Bát Tiên Đắc Đạo',author:'Vô Danh Thị / 無名氏',category:'Tiên hiệp / Thần ma',status:'FULL',source:'https://zh.wikisource.org/wiki/八仙得道',sourceTitle:'八仙得道',mode:'chapters',expected:100},
  {id:'nu-tien-ngoai-su',title:'Nữ Tiên Ngoại Sử',author:'Lữ Hùng / 呂熊',category:'Tiên hiệp / Thần ma',status:'FULL',source:'https://zh.wikisource.org/wiki/女仙外史',sourceTitle:'女仙外史',mode:'chapters',expected:100},
  {id:'luc-da-tien-tung',title:'Lục Dã Tiên Tung',author:'Lý Bách Xuyên / 李百川',category:'Tiên hiệp / Thần ma',status:'FULL',source:'https://zh.wikisource.org/wiki/綠野仙蹤',sourceTitle:'綠野仙蹤',mode:'chapters',expected:100},
  {id:'tam-toai-binh-yeu-truyen',title:'Tam Toại Bình Yêu Truyện',author:'La Quán Trung / 羅貫中',category:'Tiên hiệp / Thần ma',status:'FULL',source:'https://zh.wikisource.org/wiki/三遂平妖傳',sourceTitle:'三遂平妖傳',mode:'chapters',expected:20},
  {id:'kinh-hoa-duyen',title:'Kính Hoa Duyên',author:'Lý Nhữ Trân / 李汝珍',category:'Tiên hiệp / Thần ma',status:'FULL',source:'https://zh.wikisource.org/wiki/鏡花緣',sourceTitle:'鏡花緣',mode:'chapters',expected:100}
];

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function chineseNumber(s){
  s=String(s||'').replace(/^第/,'').replace(/[回章卷]$/,'');
  const map={零:0,〇:0,一:1,二:2,兩:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9};
  let total=0,section=0,seen=false;
  for(const ch of s){
    if(map[ch]!=null){section=map[ch];seen=true;continue}
    const unit={十:10,百:100,千:1000}[ch];
    if(unit){total+=(section||1)*unit;section=0;continue}
    return null;
  }
  return seen?total+section:null;
}

function chapterNumber(title){
  const suffix=String(title||'').split('/').pop();
  let m=suffix.match(/^(?:第)?(\d{1,4})(?:回|章)?$/);
  if(m)return Number(m[1]);
  m=suffix.match(/^卷?(\d{1,4})$/);
  if(m)return Number(m[1]);
  m=suffix.match(/^第?([零〇一二兩两三四五六七八九十百千]+)(?:回|章)$/);
  return m?chineseNumber(m[1]):null;
}

async function fetchJson(u){
  let last='WIKISOURCE_HTTP_ERROR';
  for(let attempt=0;attempt<8;attempt++){
    try{
      const r=await fetch(u,{headers:{'User-Agent':'KhoTruyenFull/1.21 public-domain importer'}});
      if(r.ok)return await r.json();
      last='WIKISOURCE_HTTP_'+r.status;
      if(r.status===429||r.status>=500){
        const retry=Number(r.headers.get('retry-after'));
        const delay=Number.isFinite(retry)&&retry>0?Math.min(30000,retry*1000):Math.min(30000,1500*Math.pow(2,attempt));
        await sleep(delay);continue;
      }
      throw new Error(last);
    }catch(e){
      last=e?.message||last;
      if(attempt===7)break;
      await sleep(Math.min(30000,1500*Math.pow(2,attempt)));
    }
  }
  throw new Error(last);
}

async function api(params){
  const u=new URL(API);
  for(const [k,v] of Object.entries({...params,format:'json',formatversion:'2'}))u.searchParams.set(k,String(v));
  return fetchJson(u);
}

async function fetchBatch(titles){
  const data=await api({action:'query',prop:'revisions',rvprop:'ids|timestamp|content',rvslots:'main',titles:titles.join('|')});
  return (data.query?.pages||[]).map(p=>({title:p.title,content:p.revisions?.[0]?.slots?.main?.content ?? p.revisions?.[0]?.content ?? ''}));
}

async function listSubpages(prefix){
  const out=[];let gapcontinue='';
  for(let page=0;page<30;page++){
    const params={action:'query',list:'allpages',apnamespace:0,apprefix:prefix,aplimit:'max'};
    if(gapcontinue)params.gapcontinue=gapcontinue;
    const d=await api(params);
    out.push(...(d.query?.allpages||[]).map(x=>x.title));
    gapcontinue=d.continue?.gapcontinue||'';
    if(!gapcontinue)break;
  }
  return out;
}

async function discoverChapterPages(sourceTitle){
  const direct=await listSubpages(sourceTitle+'/');
  const map=new Map();
  for(const t of direct){
    const n=chapterNumber(t);
    if(n!=null)map.set(n,t);
  }
  if(map.size===0){
    const prefixes=[...new Set(direct.filter(t=>t.startsWith(sourceTitle+'/')).filter(t=>chapterNumber(t)==null))];
    for(const p of prefixes){
      const nested=await listSubpages(p+'/');
      for(const t of nested){
        const n=chapterNumber(t);
        if(n!=null)map.set(n,t);
      }
    }
  }
  return [...map.entries()].sort((a,b)=>a[0]-b[0]).map(([,t])=>t);
}

function cleanWikiText(text){
  return String(text||'')
    .replace(/<!--[\s\S]*?-->/g,' ')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/\{\{[\s\S]*?\}\}/g,' ')
    .replace(/\[\[File:[^\]]+\]\]/gi,' ')
    .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g,'$1')
    .replace(/\[\[([^\]]+)\]\]/g,'$1')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;/gi,"'")
    .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
    .replace(/^\s*(?:本回\s*完|\[编辑\]|\[编辑本段\])\s*$/gmi,'')
    .replace(/^[=]{2,4}\s*(.+?)\s*[=]{2,4}\s*$/gmi,'$1')
    .replace(/[ \t]+\n/g,'\n').replace(/\n[ \t]+/g,'\n')
    .replace(/\n{3,}/g,'\n\n').trim();
}

function parseSouthVolume(text,volumeTitle){
  const src=String(text||'').replace(/\r/g,'');
  const re=/^==+\s*(.+?)\s*==+\s*$/gmi;let m;const hits=[];
  while((m=re.exec(src)))hits.push({title:m[1].trim(),start:m.index,end:re.lastIndex});
  const out=[];
  if(!hits.length){
    const clean=cleanWikiText(src);
    if(clean.length>200)out.push({title:volumeTitle,content:clean});
    return out;
  }
  for(let i=0;i<hits.length;i++){
    const body=src.slice(hits[i].end,i+1<hits.length?hits[i+1].start:src.length);
    const content=cleanWikiText(body);
    if(content.length>=200)out.push({title:hits[i].title,content});
  }
  return out;
}

async function buildBook(b){
  const chapters=[];
  if(b.mode==='south-volumes'){
    const volumePages=await listSubpages(b.sourceTitle+'/');
    const volumes=volumePages.filter(t=>/^\d{2}$/.test(t.split('/').pop()||'')).sort((a,z)=>Number(a.split('/').pop())-Number(z.split('/').pop()));
    if(volumes.length<4)throw new Error('SOUTH_VOLUME_PAGES_MISSING:'+volumes.length);
    for(let vi=0;vi<volumes.length;vi++){
      const rows=await fetchBatch([volumes[vi]]);
      const parsed=parseSouthVolume(rows[0]?.content||'','Quyen '+(vi+1));
      for(const c of parsed)chapters.push({index:chapters.length,title:c.title,content:c.content,sourcePage:'https://zh.wikisource.org/wiki/'+encodeURIComponent(volumes[vi])});
      await sleep(800);
    }
  }else{
    const pageNames=b.mode==='fixed'
      ?Array.from({length:b.expected},(_,i)=>b.fixedPattern(i+1))
      :await discoverChapterPages(b.sourceTitle);
    if(!pageNames.length)throw new Error('NO_CHAPTER_PAGES:'+b.sourceTitle);
    let added=0;
    for(let start=0;start<pageNames.length;start+=10){
      const batch=pageNames.slice(start,start+10);
      let pages;
      try{pages=await fetchBatch(batch)}
      catch(e){
        pages=[];
        for(const page of batch){pages.push(...await fetchBatch([page]));await sleep(1200);}
      }
      const byTitle=new Map(pages.map(x=>[x.title,x.content]));
      for(const pageName of batch){
        const content=cleanWikiText(byTitle.get(pageName)||'');
        const idx=chapterNumber(pageName);
        if(idx==null||content.length<200){console.log('Skipping non-chapter '+pageName+' ('+content.length+' chars)');continue;}
        chapters.push({index:added++,title:'Chương '+added,content,sourcePage:'https://zh.wikisource.org/wiki/'+encodeURIComponent(pageName)});
      }
      console.log(b.id+': Checked '+Math.min(start+10,pageNames.length)+' / '+pageNames.length+'; kept '+chapters.length);
      if(start+10<pageNames.length)await sleep(1200);
    }
  }
  if(b.expected!=null&&chapters.length!==b.expected)throw new Error('EXPECTED_'+b.id+':'+b.expected+' got '+chapters.length);
  if(chapters.length<1)throw new Error('EMPTY_BOOK:'+b.id);
  if(chapters.some(c=>String(c.content||'').trim().length<200))throw new Error('SHORT_BOOK:'+b.id);
  return {...b,chapters,ttsLang:'zh-CN',chapterCount:chapters.length};
}

async function main(){
  const out={version:3,generatedAt:new Date().toISOString(),licenseNote:'Underlying classic works are public-domain texts on Chinese Wikisource; source pages are retained for attribution. Chapter text remains the source text.',books:[]};
  for(const b of books){
    console.log('Building '+b.title);
    out.books.push(await buildBook(b));
  }
  fs.mkdirSync('server',{recursive:true});
  fs.writeFileSync('server/public-domain-seed.json',JSON.stringify(out));
  console.log('Generated '+out.books.length+' books / '+out.books.reduce((n,b)=>n+b.chapters.length,0)+' chapters.');
}
main().catch(e=>{console.error(e);process.exit(1)});
