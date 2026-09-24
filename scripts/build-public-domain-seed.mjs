import fs from 'node:fs';

const API='https://zh.wikisource.org/w/api.php';
const books=[{
  id:'phong-than-dien-nghia',
  title:'Phong Thần Diễn Nghĩa',
  author:'Trần Trọng Lâm / 陳仲琳',
  category:'Tiên hiệp / Thần ma',
  status:'FULL',
  source:'https://zh.wikisource.org/wiki/封神演義',
  sourceTitle:'封神演義',
  pages:Array.from({length:100},(_,i)=>'卷'+String(i+1).padStart(3,'0'))
}];

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

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
    .replace(/[ \t]+\n/g,'\n')
    .replace(/\n[ \t]+/g,'\n')
    .replace(/\n{3,}/g,'\n\n')
    .trim();
}

async function fetchJson(u){
  let last='WIKISOURCE_HTTP_ERROR';
  for(let attempt=0;attempt<8;attempt++){
    try{
      const r=await fetch(u,{headers:{'User-Agent':'KhoTruyenFull/1.20 public-domain importer'}});
      if(r.ok)return await r.json();
      last='WIKISOURCE_HTTP_'+r.status;
      if(r.status===429||r.status>=500){
        const retry=Number(r.headers.get('retry-after'));
        const delay=Number.isFinite(retry)&&retry>0?Math.min(30000,retry*1000):Math.min(30000,1500*Math.pow(2,attempt));
        await sleep(delay);
        continue;
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
  const data=await api({
    action:'query',
    prop:'revisions',
    rvprop:'content',
    rvslots:'main',
    rvlimit:'1',
    titles:titles.join('|')
  });
  return (data.query?.pages||[]).map(p=>({
    title:p.title,
    content:p.revisions?.[0]?.slots?.main?.content ?? p.revisions?.[0]?.content ?? ''
  }));
}

async function main(){
  const out={
    version:2,
    generatedAt:new Date().toISOString(),
    licenseNote:'The seed uses the original Ming-dynasty text of 封神演義 from Chinese Wikisource; source URLs are retained for attribution.',
    books:[]
  };
  for(const b of books){
    const chapters=[];
    for(let start=0;start<b.pages.length;start+=10){
      const batch=b.pages.slice(start,start+10);
      let pages;
      try{
        pages=await fetchBatch(batch.map(x=>b.sourceTitle+'/'+x));
      }catch(e){
        pages=[];
        for(const page of batch){
          pages.push(...await fetchBatch([b.sourceTitle+'/'+page]));
          await sleep(1200);
        }
      }
      const byTitle=new Map(pages.map(x=>[x.title,x.content]));
      for(let i=0;i<batch.length;i++){
        const pageName=b.sourceTitle+'/'+batch[i];
        const content=cleanWikiText(byTitle.get(pageName)||'');
        if(content.length<200)throw new Error('CHAPTER_TOO_SHORT:'+pageName+':'+content.length);
        chapters.push({
          index:start+i,
          title:'Chương '+(start+i+1),
          content,
          sourcePage:'https://zh.wikisource.org/wiki/'+encodeURIComponent(pageName)
        });
      }
      console.log('Fetched '+Math.min(start+10,b.pages.length)+' / '+b.pages.length+' chapters');
      if(start+10<b.pages.length)await sleep(1200);
    }
    out.books.push({...b,chapters});
  }
  fs.mkdirSync('server',{recursive:true});
  fs.writeFileSync('server/public-domain-seed.json',JSON.stringify(out));
  console.log('Generated '+out.books.length+' book and '+out.books[0].chapters.length+' chapters.');
}
main().catch(e=>{console.error(e);process.exit(1)});
