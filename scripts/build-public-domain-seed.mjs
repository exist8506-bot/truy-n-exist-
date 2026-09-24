const fs=require('node:fs');

const API='https://vi.wikisource.org/w/api.php';
const books=[
  {
    id:'hoang-le-nhat-thong-chi',
    title:'Hoàng Lê nhất thống chí',
    author:'Ngô gia văn phái',
    category:'Lịch sử',
    status:'FULL',
    source:'https://vi.wikisource.org/wiki/Ho%C3%A0ng_L%C3%AA_nh%E1%BA%A5t_th%E1%BB%91ng_ch%C3%AD',
    pages:['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI']
  },
  {
    id:'nhi-do-mai',
    title:'Nhị độ mai',
    author:'Khuyết danh',
    category:'Truyện Nôm',
    status:'FULL',
    source:'https://vi.wikisource.org/wiki/Nh%E1%BB%8B_%C4%91%E1%BB%99_mai',
    pages:['I','II','III','IV']
  },
  {
    id:'phan-tran',
    title:'Phan Trần',
    author:'Khuyết danh',
    category:'Truyện Nôm',
    status:'FULL',
    source:'https://vi.wikisource.org/wiki/Phan_Tr%E1%BA%A7n',
    pages:['I','II','III','IV']
  },
  {
    id:'luc-van-tien',
    title:'Lục Vân Tiên',
    author:'Nguyễn Đình Chiểu',
    category:'Truyện thơ',
    status:'FULL',
    source:'https://vi.wikisource.org/wiki/L%E1%BB%A5c_V%C3%A2n_Ti%C3%AAn',
    pages:['I','II','III','IV']
  }
];

function stripHtml(html){
  return String(html||'')
    .replace(/<script[\\s\\S]*?<\\/script>/gi,' ')
    .replace(/<style[\\s\\S]*?<\\/style>/gi,' ')
    .replace(/<sup[\\s\\S]*?<\\/sup>/gi,' ')
    .replace(/<br\\s*\\/?>/gi,'\\n')
    .replace(/<\\/(p|div|h[1-6]|li|blockquote|dd|dt|tr)>/gi,'\\n')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;/gi,"'")
    .replace(/&#x27;/gi,"'")
    .replace(/&#(\\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
    .replace(/[ \\t]+\\n/g,'\\n')
    .replace(/\\n[ \\t]+/g,'\\n')
    .replace(/\\n{3,}/g,'\\n\\n')
    .trim();
}
function cleanWikiText(text){
  return String(text||'')
    .replace(/\\{\\{[\\s\\S]*?\\}\\}/g,' ')
    .replace(/\\[\\[File:[^\\]]+\\]\\]/gi,' ')
    .replace(/\\[\\[[^\\]|]+\\|([^\\]]+)\\]\\]/g,'$1')
    .replace(/\\[\\[([^\\]]+)\\]\\]/g,'$1')
    .replace(/\\'\\'\\'([^']+)\\'\\'\\'/g,'$1')
    .replace(/\\'\\'([^']+)\\'\\'/g,'$1')
    .replace(/<ref[\\s\\S]*?<\\/ref>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/\\r/g,'')
    .replace(/[ \\t]+\\n/g,'\\n')
    .replace(/\\n{3,}/g,'\\n\\n')
    .trim();
}
async function api(params){
  const u=new URL(API);
  for(const [k,v] of Object.entries({...params,format:'json',formatversion:'2'}))u.searchParams.set(k,v);
  const r=await fetch(u,{headers:{'User-Agent':'KhoTruyenFull/1.19 public-domain importer'}});
  if(!r.ok)throw new Error('WIKISOURCE_HTTP_'+r.status);
  return r.json();
}
async function pageText(page){
  const data=await api({action:'parse',page,prop:'text',disablelimitreport:'1'});
  const html=data.parse?.text||'';
  if(!html)throw new Error('EMPTY_PAGE:'+page);
  return stripHtml(html);
}
async function main(){
  const out={version:1,generatedAt:new Date().toISOString(),licenseNote:'Imported from Wikisource pages whose source metadata identifies the underlying works as public-domain/compatible for reuse; source URLs are retained for attribution.',books:[]};
  for(const b of books){
    const chapters=[];
    for(let i=0;i<b.pages.length;i++){
      const page=b.title+'/'+b.pages[i];
      const content=await pageText(page);
      if(content.length<500)throw new Error('CHAPTER_TOO_SHORT:'+page+':'+content.length);
      chapters.push({index:i,title:'Chương '+(i+1),content,sourcePage:'https://vi.wikisource.org/wiki/'+encodeURIComponent(page.replace(/ /g,'_'))});
    }
    out.books.push({...b,chapters});
  }
  fs.mkdirSync('server',{recursive:true});
  fs.writeFileSync('server/public-domain-seed.json',JSON.stringify(out));
  console.log('Generated',out.books.length,'books and',out.books.reduce((n,b)=>n+b.chapters.length,0),'chapters.');
  for(const b of out.books)console.log(b.title,b.chapters.map(c=>c.content.length).join(','));
}
main().catch(e=>{console.error(e);process.exit(1)});