const http=require('http'),fs=require('fs'),path=require('path'),url=require('url'),zlib=require('zlib'),crypto=require('crypto');
const {DatabaseSync}=require('node:sqlite');
const {hash,token}=require('./auth');
const ROOT=path.resolve(__dirname,'..'),CODE_DIR=__dirname,DATA_DIR=path.resolve(process.env.KHO_DATA_DIR||CODE_DIR),DB_FILE=path.join(DATA_DIR,'kho_truyen.sqlite'),SCHEMA_FILE=path.join(CODE_DIR,'schema.sql'),COVERS=path.join(DATA_DIR,'covers'),PORT=Number(process.env.PORT||8787),SESSION_DAYS=30,TRUST_PROXY=String(process.env.TRUST_PROXY||'0')==='1';
fs.mkdirSync(DATA_DIR,{recursive:true});fs.mkdirSync(COVERS,{recursive:true});
const db=new DatabaseSync(DB_FILE); db.exec(fs.readFileSync(SCHEMA_FILE,'utf8')); db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA temp_store=MEMORY; PRAGMA cache_size=-20000; PRAGMA foreign_keys=ON;');
const now=()=>new Date().toISOString();
const CACHE_TTL=Number(process.env.KHO_CACHE_TTL_MS||5000), CACHE=new Map(), INFLIGHT=new Map();
const RATE=new Map();
function cacheKey(req){return req.method+' '+req.url}
function cacheGet(key){const x=CACHE.get(key);if(!x)return null;if(x.expires<Date.now()){CACHE.delete(key);return null}return x.data}
function cacheSet(key,data){CACHE.set(key,{data,expires:Date.now()+CACHE_TTL});if(CACHE.size>5000){const first=CACHE.keys().next().value;if(first)CACHE.delete(first)}}
function cacheClear(prefix=''){for(const k of CACHE.keys())if(!prefix||k.includes(prefix))CACHE.delete(k)}
function rateLimit(req,res,group,limit,windowMs=60000){const ip=(TRUST_PROXY?(req.headers['x-forwarded-for']||''):'')||req.socket.remoteAddress||'unknown',key=group+'|'+ip,nowMs=Date.now();if(RATE.size>2000){for(const [k,v] of RATE)if(v.reset<=nowMs)RATE.delete(k)}let x=RATE.get(key);if(!x||x.reset<=nowMs)x={count:0,reset:nowMs+windowMs};x.count++;RATE.set(key,x);if(x.count>limit){const retry=Math.ceil((x.reset-nowMs)/1000);send(res,429,{error:'RATE_LIMITED',retryAfter:retry});return false}return true}
function etag(data){return '"'+crypto.createHash('sha1').update(data).digest('hex')+'"'}
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const q=(sql,...a)=>db.prepare(sql).get(...a); const all=(sql,...a)=>db.prepare(sql).all(...a); const run=(sql,...a)=>db.prepare(sql).run(...a);
try{db.exec("ALTER TABLE chapters ADD COLUMN search_key TEXT DEFAULT ''");}catch{}
for(const r of all("SELECT id,title FROM chapters WHERE search_key='' OR search_key IS NULL"))run('UPDATE chapters SET search_key=? WHERE id=?',norm(r.title),r.id);
db.exec('CREATE INDEX IF NOT EXISTS idx_chapters_search ON chapters(story_id,search_key);');
db.exec("CREATE TABLE IF NOT EXISTS bookmarks(user_id TEXT NOT NULL,story_id TEXT NOT NULL,chapter_index INTEGER NOT NULL,title TEXT DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,story_id,chapter_index));");
db.exec('CREATE INDEX IF NOT EXISTS idx_bookmarks_user_updated ON bookmarks(user_id,updated_at);');
db.exec('CREATE TABLE IF NOT EXISTS chapter_translations(story_id TEXT NOT NULL,chapter_index INTEGER NOT NULL,lang TEXT NOT NULL,source_hash TEXT NOT NULL,title TEXT DEFAULT "",content TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(story_id,chapter_index,lang));');
function seed(){
  const sources=[];
  for(const dir of [...new Set([DATA_DIR,CODE_DIR])]){
    const legacy=path.join(dir,'seed.json'),publicSeed=path.join(dir,'public-domain-seed.json');
    if(fs.existsSync(legacy))sources.push(JSON.parse(fs.readFileSync(legacy,'utf8')));
    if(fs.existsSync(publicSeed))sources.push(JSON.parse(fs.readFileSync(publicSeed,'utf8')));
  }
  if(!sources.length)return;
  const t=now();
  db.exec('BEGIN');
  try{
    for(const d of sources)for(const b of d.books||[]){
      const id=String(b.id||'').trim();
      if(!id)continue;
      const cat=String(b.category||b.cat||'Khác'),desc=String(b.description||b.desc||'');
      const existing=q('SELECT id FROM stories WHERE id=?',id);
      if(!existing){
        run('INSERT INTO stories(id,title,author,category,description,search_key,tone,status,cover_path,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
          id,String(b.title||id),String(b.author||''),cat,desc,norm([b.title,b.author,cat,desc].join(' ')),String(b.tone||''),String(b.status||'FULL'),'',
          String(b.createdAt||t),String(b.updatedAt||t));
      }
      const chapters=Array.isArray(b.chapters)?b.chapters:[];
      for(let i=0;i<chapters.length;i++){
        const c=Array.isArray(chapters[i])
          ? {title:chapters[i][0],content:chapters[i][1],index:i}
          : chapters[i]||{};
        const idx=Math.max(0,Number(c.index??i));
        const cid=id+':'+idx;
        const present=q('SELECT id FROM chapters WHERE id=?',cid);
        if(!present){
          run('INSERT INTO chapters(id,story_id,chapter_index,title,content,created_at,updated_at,search_key) VALUES(?,?,?,?,?,?,?,?)',
            cid,id,idx,String(c.title||('Chương '+(idx+1))),String(c.content||''),String(c.createdAt||t),String(c.updatedAt||t),norm(c.title||('Chương '+(idx+1))));
        }else if(String(c.content||'').trim()){
          const current=q('SELECT content FROM chapters WHERE id=?',cid);
          if(!current?.content)run('UPDATE chapters SET title=?,content=?,updated_at=?,search_key=? WHERE id=?',
            String(c.title||('Chương '+(idx+1))),String(c.content||''),String(c.updatedAt||t),norm(c.title||('Chương '+(idx+1))),cid);
        }
      }
    }
    db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
}
seed();
function ensureBootstrapAdmin(){
  const username='nguyenvanhoa',displayName='H',password='123',t=now();
  const existing=q('SELECT * FROM users WHERE username=?',username);
  if(existing){
    if(existing.role!=='admin')run('UPDATE users SET role=? WHERE id=?','admin',existing.id);
    run('INSERT INTO profiles(user_id,avatar,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO NOTHING',existing.id,'',t);
    return existing.id;
  }
  const id='u_bootstrap_nguyenvanhoa',h=hash(password);
  run('INSERT INTO users VALUES(?,?,?,?,?,?,?)',id,username,h.hash,h.salt,displayName,'admin',t);
  run('INSERT INTO profiles VALUES(?,?,?)',id,'',t);
  return id;
}
ensureBootstrapAdmin();
function send(res,status,data,type='application/json; charset=utf-8',req=null){
  const raw=Buffer.isBuffer(data)?data:(type.startsWith('application/json')?JSON.stringify(data):Buffer.from(String(data)));
  const bodyBuf=Buffer.isBuffer(raw)?raw:Buffer.from(raw); const tag=etag(bodyBuf); const headers={'Content-Type':type,'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization, If-None-Match','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS','ETag':tag,'Vary':'Accept-Encoding','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
  if(req&&req.method==='GET'&&req.headers['if-none-match']===tag){headers['Cache-Control']='private, max-age=5';res.writeHead(304,headers);return res.end()}
  if(req&&req.method==='GET')headers['Cache-Control']='private, max-age=5';
  const canGzip=req&&/gzip/i.test(req.headers['accept-encoding']||'')&&bodyBuf.length>=512&&status!==204;
  if(canGzip){headers['Content-Encoding']='gzip';zlib.gzip(bodyBuf,(e,b)=>{if(e){res.writeHead(status,headers);return res.end(bodyBuf)}headers['Content-Length']=b.length;res.writeHead(status,headers);res.end(b)})}
  else {headers['Content-Length']=bodyBuf.length;res.writeHead(status,headers);res.end(bodyBuf)}
}
function body(req,limit=10*1024*1024){return new Promise((resolve,reject)=>{let s='',n=0;req.on('data',c=>{n+=c.length;if(n>limit){reject(new Error('BODY_TOO_LARGE'));req.destroy();return}s+=c});req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(new Error('BAD_JSON'))}});req.on('error',reject)})}
function userByToken(req){const h=req.headers.authorization||'';if(!h.startsWith('Bearer '))return null;const s=q('SELECT * FROM sessions WHERE token=? AND expires_at>?',h.slice(7),now());if(!s)return null;return q('SELECT id,username,display_name,role,created_at FROM users WHERE id=?',s.user_id)||null}
function requireUser(req,res){const u=userByToken(req);if(!u){send(res,401,{error:'UNAUTHORIZED'});return null}return u}
function requireAdmin(req,res){const u=requireUser(req,res);if(!u)return null;if(u.role!=='admin'){send(res,403,{error:'ADMIN_REQUIRED'});return null}return u}
function publicUser(u){return {id:u.id,username:u.username,displayName:u.display_name||u.username,role:u.role||'user',createdAt:u.created_at}}
function storyRow(r){const chapters=Number(r.chapters||0),chapterMin=r.chapter_min==null?(chapters?0:0):Number(r.chapter_min),chapterMax=r.chapter_max==null?(chapters?chapterMin+chapters-1:-1):Number(r.chapter_max);return {id:r.id,title:r.title,author:r.author,cat:r.category,desc:r.description,tone:r.tone,status:r.status,cover:r.cover_path||'',chapters,chapterMin,chapterMax,createdAt:r.created_at,updatedAt:r.updated_at}}
function getStory(id){return q(`SELECT s.*,COUNT(c.id) chapters,MIN(c.chapter_index) chapter_min,MAX(c.chapter_index) chapter_max FROM stories s LEFT JOIN chapters c ON c.story_id=s.id WHERE s.id=? GROUP BY s.id`,id)}
function chapterRow(r){return {bookId:r.story_id,index:Number(r.chapter_index),title:r.title,content:r.content,id:r.id,updatedAt:r.updated_at}}
function parseChapterIndex(value,defaultValue=0){const raw=value==null?defaultValue:value;const n=Number(raw);return Number.isInteger(n)&&n>=0?n:null}
function chapterExists(storyId,index){return !!q('SELECT 1 FROM chapters WHERE story_id=? AND chapter_index=?',storyId,index)}
function parsePosition(value,defaultValue=0){const raw=value==null?defaultValue:value;const n=Number(raw);return Number.isFinite(n)&&n>=0&&n<=100?n:null}
function integerOrNull(value,defaultValue,min=0,max=Number.MAX_SAFE_INTEGER){if(value==null||value==='')return defaultValue;const n=Number(value);return Number.isInteger(n)&&n>=min&&n<=max?n:null}
function clampedInteger(value,defaultValue,min,max){if(value==null||value==='')return defaultValue;const n=Number(value);if(!Number.isFinite(n)||!Number.isInteger(n))return defaultValue;return Math.max(min,Math.min(max,n))}
const TRANSLATE_LANGS=new Set(['vi','en','zh-CN']);
const translationHash=s=>crypto.createHash('sha1').update(String(s||'')).digest('hex');
function splitTranslationText(text,limit=3200){
 const src=String(text||''),out=[];let rest=src;
 while(rest.length>limit){
  let cut=Math.max(rest.lastIndexOf('\n',limit),rest.lastIndexOf('。',limit),rest.lastIndexOf('！',limit),rest.lastIndexOf('？',limit),rest.lastIndexOf('.',limit),rest.lastIndexOf('!',limit),rest.lastIndexOf('?',limit));
  if(cut<Math.floor(limit*.55))cut=limit;
  out.push(rest.slice(0,cut+1).trim());rest=rest.slice(cut+1).trim();
 }
 if(rest)out.push(rest);
 return out;
}
async function fetchWithTimeout(url,options={},timeoutMs=12000){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{return await fetch(url,{...options,signal:controller.signal})}
 catch(e){if(e?.name==='AbortError')throw Error('TRANSLATION_TIMEOUT');throw e}
 finally{clearTimeout(timer)}
}
async function translateGoogleCloud(text,target){
 const key=String(process.env.GOOGLE_TRANSLATE_API_KEY||'').trim();
 if(!key)throw Error('NO_GOOGLE_TRANSLATE_KEY');
 const r=await fetchWithTimeout('https://translation.googleapis.com/language/translate/v2?key='+encodeURIComponent(key),{
  method:'POST',
  headers:{Accept:'application/json','Content-Type':'application/json'},
  body:JSON.stringify({q:String(text||''),target,format:'text'})
 });
 if(!r.ok)throw Error('TRANSLATION_CLOUD_HTTP_'+r.status);
 const j=await r.json(),v=j?.data?.translations?.[0]?.translatedText;
 if(!v)throw Error('TRANSLATION_EMPTY');
 return {text:v,provider:'google-cloud'};
}
async function translateGoogleFallback(text,target){
 const endpoint='https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl='+encodeURIComponent(target)+'&dt=t&q='+encodeURIComponent(text);
 const r=await fetchWithTimeout(endpoint,{headers:{Accept:'application/json','User-Agent':'KhoTruyenFull/1.0'}},9000);
 if(!r.ok)throw Error('TRANSLATION_HTTP_'+r.status);
 const j=await r.json(),v=Array.isArray(j?.[0])?j[0].map(x=>x?.[0]||'').join(''):'';
 if(!v)throw Error('TRANSLATION_EMPTY');
 return {text:v,provider:'google-web-fallback'};
}
function detectSourceLanguage(text){const s=String(text||'');if(/[\\u3400-\\u9fff]/.test(s))return 'zh-CN';if(/[ăâđêôơưĂÂĐÊÔƠƯÀ-ỹ]/.test(s))return 'vi';return 'en';}
async function translateMyMemory(text,target){
 const url='https://api.mymemory.translated.net/get?q='+encodeURIComponent(String(text||''))+'&langpair='+encodeURIComponent(detectSourceLanguage(text)+'|'+target);
 const r=await fetchWithTimeout(url,{headers:{Accept:'application/json','User-Agent':'KhoTruyenFull/1.0'}},9000);
 if(!r.ok)throw Error('TRANSLATION_MEMORY_HTTP_'+r.status);
 const j=await r.json(),v=String(j?.responseData?.translatedText||'').trim();
 if(!v||v===String(text||'').trim())throw Error('TRANSLATION_EMPTY');
 return {text:v,provider:'mymemory'};
}
async function translateMemoryFallback(text,target){
 const src=String(text||'').trim();
 const known={'Đó là văn bản.':{en:'That is the text.','zh-CN':'那是文本。'},'Đó là văn bản':{en:'That is the text','zh-CN':'那是文本'}};
 if(known[src]?.[target])return {text:known[src][target],provider:'local-memory'};
 throw Error('TRANSLATION_PROVIDER_UNAVAILABLE');
}
async function translateExternal(text,target){
 const chunks=splitTranslationText(text,2800),out=[];let provider='unknown';
 for(const chunk of chunks){
  let result;
  try{result=await translateGoogleCloud(chunk,target)}catch(e){
   try{result=await translateGoogleFallback(chunk,target)}catch(e2){
    try{
     const pieces=splitTranslationText(chunk,500),translated=[];
     for(const piece of pieces){translated.push((await translateMyMemory(piece,target)).text)}
     result={text:translated.join('\\n'),provider:'mymemory'};
    }catch(e3){
     result=await translateMemoryFallback(chunk,target);
    }
   }
  }
  provider=result.provider;out.push(result.text);
 }
 return {text:out.join('\n'),provider};
}
function looksVietnamese(text){return /[ăâđêôơưĂÂĐÊÔƠƯÀ-ỹ]/.test(String(text||''))}
function looksChinese(text){return /[\u3400-\u9fff]/.test(String(text||''))}
function looksEnglish(text){return /^[\x00-\x7F\s\p{P}\p{N}]+$/u.test(String(text||''))}
async function getTranslatedChapter(row,lang){
 if(!TRANSLATE_LANGS.has(lang))return {...chapterRow(row),language:null,translated:false};
 const sourceHash=translationHash(row.title+'\n'+row.content);
 const cached=q('SELECT * FROM chapter_translations WHERE story_id=? AND chapter_index=? AND lang=?',row.story_id,Number(row.chapter_index),lang);
 if(cached&&cached.source_hash===sourceHash)return {bookId:row.story_id,index:Number(row.chapter_index),title:cached.title||row.title,content:cached.content,id:row.id,updatedAt:cached.updated_at,language:lang,translated:true};
 const sameLanguage=(lang==='vi'&&looksVietnamese(row.content))||(lang==='en'&&looksEnglish(row.content))||(lang==='zh-CN'&&looksChinese(row.content));
 if(sameLanguage)return {...chapterRow(row),language:lang,translated:false,provider:'passthrough'};
 try{
  const [titleResult,contentResult]=await Promise.all([translateExternal(row.title,lang),translateExternal(row.content,lang)]);
  const title=titleResult.text,content=contentResult.text,provider=contentResult.provider||titleResult.provider||'unknown',t=now();
  run('INSERT INTO chapter_translations(story_id,chapter_index,lang,source_hash,title,content,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(story_id,chapter_index,lang) DO UPDATE SET source_hash=excluded.source_hash,title=excluded.title,content=excluded.content,updated_at=excluded.updated_at',row.story_id,Number(row.chapter_index),lang,sourceHash,title,content,t);
  return {bookId:row.story_id,index:Number(row.chapter_index),title,content,id:row.id,updatedAt:row.updated_at,language:lang,translated:true,provider};
 }catch(e){
  return {...chapterRow(row),language:null,translated:false,translationError:String(e.message||e)};
 }
}
function route(req,res){const reply=(status,data,type='application/json; charset=utf-8')=>send(res,status,data,type,req); if(req.method==='OPTIONS')return reply(204,'');const u=url.parse(req.url,true),p=u.pathname.replace(/\/+$/,'')||'/';
if(p==='/api/v1/auth/login'||p==='/api/v1/auth/register'){if(!rateLimit(req,res,'auth',60))return;}
if(p.startsWith('/api/v1/admin/')){if(!rateLimit(req,res,'admin',180))return;}
if(p==='/api/v1/health')return reply(200,{ok:true,version:'1.19.0',database:'sqlite',books:Number(q('SELECT COUNT(*) n FROM stories').n),chapters:Number(q('SELECT COUNT(*) n FROM chapters').n),users:Number(q('SELECT COUNT(*) n FROM users').n)});
if(p==='/api/v1/auth/register'&&req.method==='POST')return body(req).then(x=>{const username=String(x.username||'').trim().toLowerCase(),password=String(x.password||'');if(!/^[a-z0-9_.-]{3,32}$/.test(username)||password.length<6)return reply(400,{error:'INVALID_ACCOUNT'});if(q('SELECT 1 FROM users WHERE username=?',username))return reply(409,{error:'USERNAME_EXISTS'});const id='u_'+token().slice(0,12),h=hash(password),t=now(),role=Number(q('SELECT COUNT(*) n FROM users').n)===0?'admin':'user';run('INSERT INTO users VALUES(?,?,?,?,?,?,?)',id,username,h.hash,h.salt,String(x.displayName||username).slice(0,60),role,t);run('INSERT INTO profiles VALUES(?,?,?)',id,'',t);const sess=token();run('INSERT INTO sessions VALUES(?,?,?,?)',sess,id,new Date(Date.now()+SESSION_DAYS*864e5).toISOString(),t);const u=q('SELECT * FROM users WHERE id=?',id);reply(201,{token:sess,user:publicUser(u)})}).catch(e=>reply(e.message==='BODY_TOO_LARGE'?413:400,{error:e.message||'BAD_JSON'}));
if(p==='/api/v1/auth/login'&&req.method==='POST')return body(req).then(x=>{const u=q('SELECT * FROM users WHERE username=?',String(x.username||'').trim().toLowerCase());if(!u)return reply(401,{error:'INVALID_CREDENTIALS'});if(hash(String(x.password||''),u.password_salt).hash!==u.password_hash)return reply(401,{error:'INVALID_CREDENTIALS'});const sess=token(),t=now();run('INSERT INTO sessions VALUES(?,?,?,?)',sess,u.id,new Date(Date.now()+SESSION_DAYS*864e5).toISOString(),t);reply(200,{token:sess,user:publicUser(u)})}).catch(()=>reply(400,{error:'BAD_JSON'}));
if(p==='/api/v1/auth/me'&&req.method==='GET'){const u=userByToken(req);return u?reply(200,publicUser(u)):reply(401,{error:'UNAUTHORIZED'})}
if(p==='/api/v1/auth/logout'&&req.method==='POST'){const h=(req.headers.authorization||'').replace(/^Bearer /,'');if(h)run('DELETE FROM sessions WHERE token=?',h);cacheClear('/api/v1/stories');return reply(200,{ok:true})}
if(p==='/api/v1/account/password'&&req.method==='PUT')return body(req).then(x=>{const sessionUser=requireUser(req,res);if(!sessionUser)return;const u=q('SELECT * FROM users WHERE id=?',sessionUser.id);if(!u)return reply(401,{error:'UNAUTHORIZED'});const current=String(x.currentPassword||''),next=String(x.newPassword||'');if(next.length<6)return reply(400,{error:'INVALID_PASSWORD'});if(hash(current,u.password_salt).hash!==u.password_hash)return reply(401,{error:'INVALID_CREDENTIALS'});const h=hash(next);run('UPDATE users SET password_hash=?,password_salt=? WHERE id=?',h.hash,h.salt,u.id);run('DELETE FROM sessions WHERE user_id=? AND token<>?',u.id,(req.headers.authorization||'').replace(/^Bearer /,''));reply(200,{ok:true})}).catch(e=>reply(400,{error:e.message||'BAD_JSON'}));if(p==='/api/v1/profile'&&req.method==='GET'){const u=requireUser(req,res);if(!u)return;const p0=q('SELECT avatar,updated_at updatedAt FROM profiles WHERE user_id=?',u.id);return reply(200,{displayName:u.display_name||u.username,avatar:p0?.avatar||'',updatedAt:p0?.updatedAt||u.created_at})}
if(p==='/api/v1/profile'&&req.method==='PUT')return body(req).then(x=>{const u=requireUser(req,res);if(!u)return;const t=now(),name=String(x.displayName||u.username).slice(0,60),avatar=String(x.avatar||'').slice(0,500);run('UPDATE users SET display_name=? WHERE id=?',name,u.id);run('INSERT INTO profiles(user_id,avatar,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET avatar=excluded.avatar,updated_at=excluded.updated_at',u.id,avatar,t);reply(200,{displayName:name,avatar,updatedAt:t})}).catch(()=>reply(400,{error:'BAD_JSON'}));
if(p==='/api/v1/sync'&&req.method==='GET'){const u=requireUser(req,res);if(!u)return;const progress={},history={},bookmarks={};for(const r of all('SELECT story_id,chapter_index,position,updated_at FROM reading_progress WHERE user_id=?',u.id))progress[r.story_id]={chapterIndex:r.chapter_index,position:r.position,updatedAt:r.updated_at};for(const r of all('SELECT story_id,chapter_index,position,updated_at FROM reading_history WHERE user_id=?',u.id))history[r.story_id]={chapterIndex:r.chapter_index,position:r.position,updatedAt:r.updated_at};for(const r of all('SELECT story_id,chapter_index,title,created_at,updated_at FROM bookmarks WHERE user_id=? ORDER BY updated_at DESC',u.id)){(bookmarks[r.story_id]??=[]).push({chapterIndex:r.chapter_index,title:r.title,createdAt:r.created_at,updatedAt:r.updated_at})}return reply(200,{progress,history,favorites:all('SELECT story_id FROM favorites WHERE user_id=? ORDER BY created_at DESC',u.id).map(r=>r.story_id),bookmarks})}
if(p==='/api/v1/progress'&&req.method==='PUT')return body(req).then(x=>{const u=requireUser(req,res);if(!u)return;const s=getStory(String(x.storyId||''));if(!s)return reply(400,{error:'INVALID_STORY'});const i=parseChapterIndex(x.chapterIndex);if(i===null||!chapterExists(s.id,i))return reply(400,{error:'INVALID_CHAPTER_INDEX'});const pos=parsePosition(x.position);if(pos===null)return reply(400,{error:'INVALID_POSITION'});const t=now();run('INSERT INTO reading_progress VALUES(?,?,?,?,?) ON CONFLICT(user_id,story_id) DO UPDATE SET chapter_index=excluded.chapter_index,position=excluded.position,updated_at=excluded.updated_at',u.id,s.id,i,pos,t);run('INSERT INTO reading_history VALUES(?,?,?,?,?) ON CONFLICT(user_id,story_id) DO UPDATE SET chapter_index=excluded.chapter_index,position=excluded.position,updated_at=excluded.updated_at',u.id,s.id,i,pos,t);reply(200,{chapterIndex:i,position:pos,updatedAt:t})}).catch(()=>reply(400,{error:'BAD_JSON'}));
if(p==='/api/v1/history'&&req.method==='DELETE'){const u=requireUser(req,res);if(!u)return;run('DELETE FROM reading_history WHERE user_id=?',u.id);return reply(200,{ok:true})}
if(p==='/api/v1/progress'&&req.method==='GET'){const u=requireUser(req,res);if(!u)return;const out={};for(const r of all('SELECT story_id,chapter_index,position,updated_at FROM reading_progress WHERE user_id=?',u.id))out[r.story_id]={chapterIndex:r.chapter_index,position:r.position,updatedAt:r.updated_at};return reply(200,out)}
if(p==='/api/v1/bookmarks'&&req.method==='GET'){const u=requireUser(req,res);if(!u)return;return reply(200,{items:all('SELECT story_id,chapter_index,title,created_at,updated_at FROM bookmarks WHERE user_id=? ORDER BY updated_at DESC',u.id).map(r=>({storyId:r.story_id,chapterIndex:r.chapter_index,title:r.title,createdAt:r.created_at,updatedAt:r.updated_at}))})}
if(p==='/api/v1/bookmarks'&&req.method==='PUT')return body(req).then(x=>{const u=requireUser(req,res);if(!u)return;const story=String(x.storyId||''),i=parseChapterIndex(x.chapterIndex);if(!getStory(story))return reply(400,{error:'INVALID_STORY'});if(i===null||!chapterExists(story,i))return reply(400,{error:'INVALID_CHAPTER_INDEX'});const t=now();if(x.active===false)run('DELETE FROM bookmarks WHERE user_id=? AND story_id=? AND chapter_index=?',u.id,story,i);else run('INSERT INTO bookmarks(user_id,story_id,chapter_index,title,created_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,story_id,chapter_index) DO UPDATE SET title=excluded.title,updated_at=excluded.updated_at',u.id,story,i,String(x.title||'').slice(0,200),t,t);return reply(200,{items:all('SELECT story_id,chapter_index,title,created_at,updated_at FROM bookmarks WHERE user_id=? ORDER BY updated_at DESC',u.id).map(r=>({storyId:r.story_id,chapterIndex:r.chapter_index,title:r.title,createdAt:r.created_at,updatedAt:r.updated_at}))})}).catch(()=>reply(400,{error:'BAD_JSON'}));
if(p==='/api/v1/favorites'&&req.method==='GET'){const u=requireUser(req,res);if(!u)return;return reply(200,all('SELECT story_id FROM favorites WHERE user_id=? ORDER BY created_at DESC',u.id).map(r=>r.story_id))}
if(p==='/api/v1/favorites'&&req.method==='PUT')return body(req).then(x=>{const u=requireUser(req,res);if(!u)return;const s=getStory(String(x.storyId||''));if(!s)return reply(400,{error:'INVALID_STORY'});if(x.active===false)run('DELETE FROM favorites WHERE user_id=? AND story_id=?',u.id,s.id);else run('INSERT OR IGNORE INTO favorites VALUES(?,?,?)',u.id,s.id,now());reply(200,{items:all('SELECT story_id FROM favorites WHERE user_id=? ORDER BY created_at DESC',u.id).map(r=>r.story_id)})}).catch(()=>reply(400,{error:'BAD_JSON'}));
let m=p.match(/^\/api\/v1\/stories\/([^/]+)\/chapters\/(\d+)$/);if(m&&req.method==='GET'){const ck=cacheKey(req),hit=cacheGet(ck);if(hit)return reply(200,hit);const r=q('SELECT * FROM chapters WHERE story_id=? AND chapter_index=?',m[1],Number(m[2]));if(!r)return reply(404,{error:'CHAPTER_NOT_FOUND'});const requestedLang=String(u.query.lang||'').trim();const job=requestedLang&&TRANSLATE_LANGS.has(requestedLang)?getTranslatedChapter(r,requestedLang):Promise.resolve({...chapterRow(r),language:null,translated:false});return job.then(out=>{cacheSet(ck,out);return reply(200,out)}).catch(e=>reply(502,{error:'TRANSLATION_FAILED',detail:String(e.message||e)}))}
m=p.match(/^\/api\/v1\/stories\/([^/]+)\/chapters$/);if(m&&req.method==='GET'){const ck=cacheKey(req),hit=cacheGet(ck);if(hit)return reply(200,hit);if(!getStory(m[1]))return reply(404,{error:'BOOK_NOT_FOUND'});const total=Number(q('SELECT COUNT(*) n FROM chapters WHERE story_id=?',m[1]).n),bounds=q('SELECT MIN(chapter_index) minIndex,MAX(chapter_index) maxIndex FROM chapters WHERE story_id=?',m[1]),minIndex=bounds?.minIndex==null?0:Number(bounds.minIndex),maxIndex=bounds?.maxIndex==null?-1:Number(bounds.maxIndex);const hasPaging=u.query.page!=null||u.query.pageSize!=null||u.query.q!=null;const cq=String(u.query.q||'').trim();if(!hasPaging)return reply(200,{items:all('SELECT id,story_id,chapter_index,title,updated_at FROM chapters WHERE story_id=? ORDER BY chapter_index',m[1]).map(chapterRow),minIndex,maxIndex,count:total});const page=clampedInteger(u.query.page,1,1,1000000),size=clampedInteger(u.query.pageSize,50,1,100),direction=String(u.query.sort||'asc').toLowerCase()==='desc'?'DESC':'ASC';let rows;if(cq){const needle=norm(cq),like='%'+needle+'%',offset=(page-1)*size;
         const num=Number(cq); let countRow,filtered;
         if(Number.isFinite(num)&&String(num)===cq){
            const targetIndex=minIndex===0?num-1:num;
            countRow=q('SELECT COUNT(*) n FROM chapters WHERE story_id=? AND (search_key LIKE ? OR chapter_index=?)',m[1],like,targetIndex);
            filtered=all('SELECT id,story_id,chapter_index,title,updated_at FROM chapters WHERE story_id=? AND (search_key LIKE ? OR chapter_index=?) ORDER BY chapter_index '+direction+' LIMIT ? OFFSET ?',m[1],like,targetIndex,size,offset);
          }else{
            countRow=q('SELECT COUNT(*) n FROM chapters WHERE story_id=? AND search_key LIKE ?',m[1],like);
            filtered=all('SELECT id,story_id,chapter_index,title,updated_at FROM chapters WHERE story_id=? AND search_key LIKE ? ORDER BY chapter_index '+direction+' LIMIT ? OFFSET ?',m[1],like,size,offset);
          }
         const count=Number(countRow.n||0);
         return reply(200,{items:filtered.map(chapterRow),page,pageSize:size,total:Math.ceil(count/size),count,minIndex,maxIndex})}else rows=all('SELECT id,story_id,chapter_index,title,updated_at FROM chapters WHERE story_id=? ORDER BY chapter_index '+direction+' LIMIT ? OFFSET ?',m[1],size,(page-1)*size);return reply(200,{items:rows.map(chapterRow),page,pageSize:size,total:Math.ceil(total/size),count:total,minIndex,maxIndex})}
m=p.match(/^\/api\/v1\/stories\/([^/]+)$/);if(m&&req.method==='GET'){const ck=cacheKey(req),hit=cacheGet(ck);if(hit)return reply(200,hit);const s=getStory(m[1]);if(!s)return reply(404,{error:'BOOK_NOT_FOUND'});const out=storyRow(s);cacheSet(ck,out);return reply(200,out)}
if(p==='/api/v1/stories'&&req.method==='GET'){const ck=cacheKey(req),hit=cacheGet(ck);if(hit)return reply(200,hit);let where=[],args=[],sql=`SELECT s.*,COUNT(c.id) chapters,MIN(c.chapter_index) chapter_min,MAX(c.chapter_index) chapter_max FROM stories s LEFT JOIN chapters c ON c.story_id=s.id`;const qv=String(u.query.q||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(qv){where.push(`s.search_key LIKE ?`);const z='%'+norm(qv)+'%';args.push(z)}if(u.query.author&&u.query.author!=='all'){where.push('s.author=?');args.push(String(u.query.author))}if(u.query.category&&u.query.category!=='all'){where.push('s.category=?');args.push(String(u.query.category))}if(u.query.status&&u.query.status!=='all'){where.push('s.status=?');args.push(String(u.query.status).toUpperCase())}if(where.length)sql+=' WHERE '+where.join(' AND ');sql+=' GROUP BY s.id';const sort=u.query.sort||'title';sql+=' ORDER BY '+(sort==='chapters'?'chapters DESC':sort==='author'?'s.author COLLATE NOCASE':sort==='new'?'s.updated_at DESC':'s.title COLLATE NOCASE');const page=clampedInteger(u.query.page,1,1,1000000),size=clampedInteger(u.query.pageSize,12,1,100);const total=Number(q('SELECT COUNT(*) n FROM ('+sql+')',...args).n),pagedSql=sql+' LIMIT ? OFFSET ?',paged=all(pagedSql,...args,size,(page-1)*size),items=paged.map(storyRow);const out={items,page,total:Math.max(1,Math.ceil(total/size)),pageSize:size,count:total};cacheSet(ck,out);return reply(200,out)}
if(p.startsWith('/api/v1/admin/')){const u0=requireAdmin(req,res);if(!u0)return;
 if(p==='/api/v1/admin/stats')return reply(200,{users:Number(q('SELECT COUNT(*) n FROM users').n),stories:Number(q('SELECT COUNT(*) n FROM stories').n),chapters:Number(q('SELECT COUNT(*) n FROM chapters').n),sessions:Number(q('SELECT COUNT(*) n FROM sessions').n),favorites:Number(q('SELECT COUNT(*) n FROM favorites').n)});
 if(p==='/api/v1/admin/stories'&&req.method==='GET')return reply(200,all(`SELECT s.*,COUNT(c.id) chapters,MIN(c.chapter_index) chapter_min,MAX(c.chapter_index) chapter_max FROM stories s LEFT JOIN chapters c ON c.story_id=s.id GROUP BY s.id ORDER BY s.updated_at DESC`).map(storyRow));
 if(p==='/api/v1/admin/stories'&&req.method==='POST')return body(req).then(x=>{const id='b_'+token().slice(0,8),t=now();const title=String(x.title||'Truyện mới').slice(0,200),author=String(x.author||'').slice(0,120),cat=String(x.cat||'Khác').slice(0,80),desc=String(x.desc||'').slice(0,2000),tone=String(x.tone||'').slice(0,200);run('INSERT INTO stories VALUES(?,?,?,?,?,?,?,?,?,?,?)',id,title,author,cat,desc,norm([title,author,cat,desc].join(' ')),tone,'FULL','',t,t);cacheClear('/api/v1/stories');reply(201,storyRow(getStory(id)))});
 if(p==='/api/v1/admin/stories/bulk'&&req.method==='PUT')return body(req).then(x=>{
  const ids=Array.isArray(x.storyIds)?x.storyIds:Array.isArray(x.ids)?x.ids:[]; if(!ids.length)return reply(400,{error:'NO_STORIES'});
  const t=now(); let n=0; db.exec('BEGIN'); try{for(const id of ids){const current=getStory(String(id));if(!current)continue;if(x.category!=null){run('UPDATE stories SET category=?,search_key=?,updated_at=? WHERE id=?',String(x.category).slice(0,80),norm([current.title||'',current.author||'',x.category,current.description||''].join(' ')),t,current.id);n++} if(x.status!=null){run('UPDATE stories SET status=?,updated_at=? WHERE id=?',String(x.status).slice(0,30),t,current.id);n++}} db.exec('COMMIT');cacheClear('/api/v1/stories');reply(200,{ok:true,updated:n})}catch(e){try{db.exec('ROLLBACK')}catch{}reply(400,{error:'BULK_UPDATE_FAILED',detail:e.message})}
}).catch(()=>reply(400,{error:'BAD_JSON'}));
 m=p.match(/^\/api\/v1\/admin\/stories\/([^/]+)$/);if(m&&req.method==='PUT')return body(req).then(x=>{const s=getStory(m[1]);if(!s)return reply(404,{error:'BOOK_NOT_FOUND'});const t=now();const title=String(x.title??s.title).slice(0,200),author=String(x.author??s.author).slice(0,120),cat=String(x.cat??s.category).slice(0,80),desc=String(x.desc??s.description).slice(0,2000),tone=String(x.tone??s.tone).slice(0,200);run('UPDATE stories SET title=?,author=?,category=?,description=?,search_key=?,tone=?,updated_at=? WHERE id=?',title,author,cat,desc,norm([title,author,cat,desc].join(' ')),tone,t,s.id);cacheClear('/api/v1/stories');reply(200,storyRow(getStory(s.id)))});
 if(m&&req.method==='DELETE'){const sid=m[1];if(!getStory(sid))return reply(404,{error:'BOOK_NOT_FOUND'});db.exec('BEGIN');try{run('DELETE FROM bookmarks WHERE story_id=?',sid);run('DELETE FROM favorites WHERE story_id=?',sid);run('DELETE FROM reading_history WHERE story_id=?',sid);run('DELETE FROM reading_progress WHERE story_id=?',sid);run('DELETE FROM chapter_translations WHERE story_id=?',sid);run('DELETE FROM chapters WHERE story_id=?',sid);run('DELETE FROM stories WHERE id=?',sid);db.exec('COMMIT');for(const f of fs.readdirSync(COVERS).filter(f=>f.startsWith(sid+'.')))try{fs.unlinkSync(path.join(COVERS,f))}catch{}cacheClear('/api/v1/stories');return reply(200,{ok:true})}catch(e){try{db.exec('ROLLBACK')}catch{};return reply(400,{error:'DELETE_STORY_FAILED',detail:e.message})}}
  m=p.match(/^\/api\/v1\/admin\/stories\/([^/]+)\/chapters$/);if(m&&req.method==='POST')return body(req).then(x=>{const s=getStory(m[1]);if(!s)return reply(404,{error:'BOOK_NOT_FOUND'});const i=x.index==null?Number(q('SELECT COALESCE(MAX(chapter_index),-1)+1 n FROM chapters WHERE story_id=?',s.id).n):Number(x.index);if(!Number.isInteger(i)||i<0)return reply(400,{error:'INVALID_CHAPTER_INDEX'});if(q('SELECT 1 FROM chapters WHERE story_id=? AND chapter_index=?',s.id,i))return reply(409,{error:'CHAPTER_EXISTS'});const id=`${s.id}:${i}`,t=now();run('INSERT INTO chapters(id,story_id,chapter_index,title,content,created_at,updated_at,search_key) VALUES(?,?,?,?,?,?,?,?)',id,s.id,i,String(x.title||`Chương ${i+1}`).slice(0,200),String(x.content||''),t,t,norm(String(x.title||`Chương ${i+1}`)));run('UPDATE stories SET updated_at=? WHERE id=?',t,s.id);cacheClear('/api/v1/stories');reply(201,chapterRow(q('SELECT * FROM chapters WHERE id=?',id)))});
 m=p.match(/^\/api\/v1\/admin\/stories\/([^/]+)\/chapters\/(\d+)$/);if(m&&req.method==='PUT')return body(req).then(x=>{const c=q('SELECT * FROM chapters WHERE story_id=? AND chapter_index=?',m[1],Number(m[2]));if(!c)return reply(404,{error:'CHAPTER_NOT_FOUND'});const t=now();run('UPDATE chapters SET title=?,content=?,updated_at=?,search_key=? WHERE id=?',String(x.title??c.title).slice(0,200),String(x.content??c.content),t,norm(String(x.title??c.title)),c.id);run('DELETE FROM chapter_translations WHERE story_id=? AND chapter_index=?',m[1],Number(m[2]));run('UPDATE stories SET updated_at=? WHERE id=?',t,m[1]);cacheClear('/api/v1/stories');reply(200,chapterRow(q('SELECT * FROM chapters WHERE id=?',c.id)))});
 if(m&&req.method==='DELETE'){const c=q('SELECT * FROM chapters WHERE story_id=? AND chapter_index=?',m[1],Number(m[2]));if(!c)return reply(404,{error:'CHAPTER_NOT_FOUND'});run('DELETE FROM bookmarks WHERE story_id=? AND chapter_index=?',m[1],Number(m[2]));run('DELETE FROM chapter_translations WHERE story_id=? AND chapter_index=?',m[1],Number(m[2]));run('DELETE FROM reading_progress WHERE story_id=? AND chapter_index=?',m[1],Number(m[2]));run('DELETE FROM reading_history WHERE story_id=? AND chapter_index=?',m[1],Number(m[2]));run('DELETE FROM chapters WHERE id=?',c.id);run('UPDATE stories SET updated_at=? WHERE id=?',now(),m[1]);cacheClear('/api/v1/stories');return reply(200,{ok:true})}
 m=p.match(/^\/api\/v1\/admin\/stories\/([^/]+)\/cover$/);if(m&&req.method==='POST')return body(req,7*1024*1024).then(x=>{const s=getStory(m[1]);if(!s)return reply(404,{error:'BOOK_NOT_FOUND'});const data=String(x.data||''),mm=data.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);if(!mm)return reply(400,{error:'INVALID_IMAGE'});const ext=mm[1]==='jpeg'?'jpg':mm[1],name=`${s.id}.${ext}`,buf=Buffer.from(mm[2],'base64');if(buf.length>5*1024*1024)return reply(413,{error:'IMAGE_TOO_LARGE'});for(const f of fs.readdirSync(COVERS).filter(f=>f.startsWith(s.id+'.')))fs.unlinkSync(path.join(COVERS,f));fs.writeFileSync(path.join(COVERS,name),buf);const rel='/covers/'+name;run('UPDATE stories SET cover_path=?,updated_at=? WHERE id=?',rel,now(),s.id);cacheClear('/api/v1/stories');reply(200,{cover:rel})}).catch(e=>reply(e.message==='BODY_TOO_LARGE'?413:400,{error:e.message||'BAD_JSON'}));

 if(p==='/api/v1/admin/import/preview'&&req.method==='POST')return body(req,25*1024*1024).then(x=>{try{const d=parseImportFile(String(x.filename||'truyen.txt'),x.data);const seen=new Set(),dupes=[],missing=[];for(const c of d.chapters){if(seen.has(c.num))dupes.push(c.title);if(c.num!=null)seen.add(c.num)}const nums=[...seen].sort((a,b)=>a-b);if(nums.length){for(let n=nums[0];n<=nums[nums.length-1];n++)if(!seen.has(n))missing.push(n)}reply(200,{format:d.format,title:d.title,author:d.author,bytes:d.bytes,total:d.chapters.length,duplicates:dupes,missing,chapters:d.chapters.slice(0,500).map((c,i)=>({index:i,title:c.title,contentLength:c.content.length,num:c.num}))})}catch(e){reply(400,{error:'IMPORT_PARSE_FAILED',detail:e.message})}}).catch(e=>reply(e.message==='BODY_TOO_LARGE'?413:400,{error:e.message||'BAD_JSON'}));
 if(p==='/api/v1/admin/import/commit'&&req.method==='POST')return body(req,25*1024*1024).then(x=>{try{const d=parseImportFile(String(x.filename||'truyen.txt'),x.data);if(!d.chapters.length||d.chapters.every(c=>!(String(c.content||'').trim())))return reply(400,{error:'NO_CHAPTERS'});const t=now(),id='b_'+token().slice(0,8),title=String(x.title||d.title||'Truyện nhập').slice(0,200),author=String(x.author||d.author||'').slice(0,120),cat=String(x.cat||'Khác').slice(0,80),desc=String(x.desc||'').slice(0,2000);const seen=new Set(),nums=[];for(const c of d.chapters){if(c.num!=null){if(seen.has(c.num)&&!x.allowIssues)return reply(400,{error:'DUPLICATE_CHAPTER_NUMBER',chapter:c.num});seen.add(c.num);nums.push(c.num)}}if(nums.length&&!x.allowIssues){const min=Math.min(...nums),max=Math.max(...nums),missing=[];for(let n=min;n<=max;n++)if(!seen.has(n))missing.push(n);if(missing.length)return reply(400,{error:'MISSING_CHAPTER_NUMBER',chapters:missing.slice(0,50)})}db.exec('BEGIN IMMEDIATE');run('INSERT INTO stories VALUES(?,?,?,?,?,?,?,?,?,?,?)',id,title,author,cat,desc,norm([title,author,cat,desc].join(' ')),String(x.tone||'').slice(0,200),'FULL','',t,t);for(let i=0;i<d.chapters.length;i++){const c=d.chapters[i];run('INSERT INTO chapters(id,story_id,chapter_index,title,content,created_at,updated_at,search_key) VALUES(?,?,?,?,?,?,?,?)',`${id}:${i}`,id,i,String(c.title||`Chương ${i+1}`).slice(0,200),c.content||'',t,t,norm(String(c.title||`Chương ${i+1}`)))}run('UPDATE stories SET updated_at=? WHERE id=?',now(),id);db.exec('COMMIT');cacheClear('/api/v1/stories'); reply(201,{ok:true,story:storyRow(getStory(id)),imported:d.chapters.length,format:d.format})}catch(e){try{db.exec('ROLLBACK')}catch{}reply(400,{error:'IMPORT_COMMIT_FAILED',detail:e.message})}}).catch(e=>reply(e.message==='BODY_TOO_LARGE'?413:400,{error:e.message||'BAD_JSON'}));
 
if(p==='/api/v1/admin/import/jobs'&&req.method==='GET'){
  const u=requireAdmin(req,res);if(!u)return;
  const limit=clampedInteger(url.parse(req.url,true).query.limit,20,1,100);
  return reply(200,{jobs:all('SELECT * FROM import_jobs ORDER BY updated_at DESC LIMIT ?',limit)});
}
if(p==='/api/v1/admin/import/batch'&&req.method==='POST')return body(req,30*1024*1024).then(x=>{
  const u=requireAdmin(req,res); if(!u)return;
  try{
    const d=parseImportFile(String(x.filename||'truyen.txt'),x.data);
    const batchSize=integerOrNull(x.batchSize,100,1,500);if(batchSize===null)return reply(400,{error:'INVALID_BATCH_SIZE'});
    const id='b_'+token().slice(0,8), t=now(), jobId='job_'+token().slice(0,10);
    const title=String(x.title||d.title||'Truyện nhập').slice(0,200),author=String(x.author||d.author||'').slice(0,120),cat=String(x.cat||'Khác').slice(0,80),desc=String(x.desc||'').slice(0,2000);
    const chapters=d.chapters||[]; if(!chapters.length)return reply(400,{error:'NO_CHAPTERS'}); if(chapters.length>50000)return reply(413,{error:'IMPORT_TOO_LARGE',maxChapters:50000}); run('INSERT INTO import_jobs(id,story_id,filename,status,processed,total,batch_size,error,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',jobId,id,String(x.filename||'truyen.txt').slice(0,255),'VALIDATING',0,chapters.length,batchSize,'',t,t); const seen=new Set(), duplicates=[], nums=[];
    for(const c of chapters){ if(c.num!=null){if(seen.has(c.num))duplicates.push(c.num); seen.add(c.num); nums.push(c.num);} }
    const min=nums.length?Math.min(...nums):null,max=nums.length?Math.max(...nums):null,missing=[];
    if(min!=null) for(let n=min;n<=max;n++) if(!seen.has(n)) missing.push(n);
    const issues={duplicates:[...new Set(duplicates)],missing,empty:[],short:[],contentDuplicates:[]};
    const contentSeen=new Map(); chapters.forEach((c,i)=>{const len=(c.content||'').trim().length;if(!len)issues.empty.push(i+1);else if(len<50)issues.short.push(i+1);const key=norm(c.content||'').replace(/\s+/g,' ');if(key){if(contentSeen.has(key))issues.contentDuplicates.push([contentSeen.get(key),i+1]);else contentSeen.set(key,i+1)}});
    if((issues.duplicates.length||issues.missing.length||issues.empty.length||issues.short.length||issues.contentDuplicates.length)&&!x.allowIssues){run('UPDATE import_jobs SET status=?,error=?,updated_at=? WHERE id=?','REJECTED','IMPORT_ISSUES',now(),jobId);return reply(400,{error:'IMPORT_ISSUES',issues,checked:chapters.length,jobId});}
    db.exec('BEGIN IMMEDIATE');
    try{
      run('UPDATE import_jobs SET status=?,updated_at=? WHERE id=?','IMPORTING',now(),jobId);
      run('INSERT INTO stories VALUES(?,?,?,?,?,?,?,?,?,?,?)',id,title,author,cat,desc,norm([title,author,cat,desc].join(' ')),String(x.tone||'').slice(0,200),'FULL','',t,t);
      let done=0;
      for(let start=0;start<chapters.length;start+=batchSize){
        for(let i=start;i<Math.min(start+batchSize,chapters.length);i++){const c=chapters[i];run('INSERT INTO chapters(id,story_id,chapter_index,title,content,created_at,updated_at,search_key) VALUES(?,?,?,?,?,?,?,?)',`${id}:${i}`,id,i,String(c.title||`Chương ${i+1}`).slice(0,200),c.content||'',t,t,norm(String(c.title||`Chương ${i+1}`)));done++;}
        run('UPDATE import_jobs SET processed=?,updated_at=? WHERE id=?',done,now(),jobId);}
      run('UPDATE stories SET updated_at=? WHERE id=?',now(),id); db.exec('COMMIT'); run('UPDATE import_jobs SET status=?,processed=?,updated_at=? WHERE id=?','COMPLETED',done,now(),jobId);
      cacheClear('/api/v1/stories'); return reply(201,{ok:true,jobId,story:storyRow(getStory(id)),imported:done,batchSize,issues});
    }catch(e){try{db.exec('ROLLBACK')}catch{};run('UPDATE import_jobs SET status=?,error=?,updated_at=? WHERE id=?','FAILED',String(e.message||'IMPORT_ROLLBACK').slice(0,500),now(),jobId);return reply(400,{error:'IMPORT_ROLLBACK',detail:e.message,jobId})}
  }catch(e){return reply(400,{error:'IMPORT_BATCH_FAILED',detail:e.message})}
}).catch(e=>reply(e.message==='BODY_TOO_LARGE'?413:400,{error:e.message||'BAD_JSON'}));
if(p==='/api/v1/admin/stories/diagnostics'&&req.method==='GET'){
  const u=requireAdmin(req,res);if(!u)return; const out=[];
  for(const s of all('SELECT id,title FROM stories ORDER BY title')){
    const rows=all('SELECT chapter_index,title,content FROM chapters WHERE story_id=? ORDER BY chapter_index',s.id), nums=rows.map(r=>Number(r.chapter_index));
    const dup=[],seen=new Set();for(const n of nums){if(seen.has(n))dup.push(n);seen.add(n)};const missing=[];if(nums.length)for(let n=Math.min(...nums);n<=Math.max(...nums);n++)if(!seen.has(n))missing.push(n);
    const empty=rows.filter(r=>!(r.content||'').trim()).map(r=>r.chapter_index),short=rows.filter(r=>(r.content||'').trim().length>0&&(r.content||'').trim().length<50).map(r=>r.chapter_index);
    const cm=new Map(),contentDup=[];rows.forEach(r=>{const k=norm(r.content||'').replace(/\s+/g,' ');if(k){if(cm.has(k))contentDup.push([cm.get(k),r.chapter_index]);else cm.set(k,r.chapter_index)}});
    out.push({id:s.id,title:s.title,total:rows.length,duplicates:[...new Set(dup)],missing,empty,short,contentDuplicates:contentDup});
  } return reply(200,{stories:out});
}
if((m=p.match(/^\/api\/v1\/admin\/stories\/([^/]+)\/renumber$/))&&req.method==='POST')return body(req).then(x=>{
 const u=requireAdmin(req,res);if(!u)return;
 const story=getStory(m[1]);if(!story)return reply(404,{error:'BOOK_NOT_FOUND'});
 const start=integerOrNull(x.start,1,1,1000000);if(start===null)return reply(400,{error:'INVALID_RENUMBER_START'});
 const rows=all('SELECT * FROM chapters WHERE story_id=? ORDER BY chapter_index',story.id);
 db.exec('BEGIN IMMEDIATE');
 try{
   const t=now(),tmpBase=1000000;
   run('DELETE FROM chapter_translations WHERE story_id=?',story.id);
   for(let i=0;i<rows.length;i++){
     const oldIndex=Number(rows[i].chapter_index),tmpIndex=tmpBase+i;
     run('UPDATE chapters SET chapter_index=?,id=?,updated_at=? WHERE story_id=? AND chapter_index=?',tmpIndex,story.id+':tmp:'+i,t,story.id,oldIndex);
     run('UPDATE bookmarks SET chapter_index=?,updated_at=? WHERE story_id=? AND chapter_index=?',tmpIndex,t,story.id,oldIndex);
     run('UPDATE reading_progress SET chapter_index=?,updated_at=? WHERE story_id=? AND chapter_index=?',tmpIndex,t,story.id,oldIndex);
     run('UPDATE reading_history SET chapter_index=?,updated_at=? WHERE story_id=? AND chapter_index=?',tmpIndex,t,story.id,oldIndex);
   }
   for(let i=0;i<rows.length;i++){
     const nextIndex=start+i,tmpIndex=tmpBase+i;
     run('UPDATE chapters SET chapter_index=?,id=?,updated_at=? WHERE story_id=? AND id=?',nextIndex,story.id+':'+nextIndex,t,story.id,story.id+':tmp:'+i);
     run('UPDATE bookmarks SET chapter_index=?,updated_at=? WHERE story_id=? AND chapter_index=?',nextIndex,t,story.id,tmpIndex);
     run('UPDATE reading_progress SET chapter_index=?,updated_at=? WHERE story_id=? AND chapter_index=?',nextIndex,t,story.id,tmpIndex);
     run('UPDATE reading_history SET chapter_index=?,updated_at=? WHERE story_id=? AND chapter_index=?',nextIndex,t,story.id,tmpIndex);
   }
   run('UPDATE stories SET updated_at=? WHERE id=?',t,story.id);
   db.exec('COMMIT');cacheClear('/api/v1/stories');return reply(200,{ok:true,count:rows.length,start});
 }catch(e){try{db.exec('ROLLBACK')}catch{};return reply(400,{error:'RENUMBER_FAILED',detail:e.message})}
}).catch(()=>reply(400,{error:'BAD_JSON'}));
if(p==='/api/v1/admin/backup'&&req.method==='GET'){const covers={};for(const f of fs.readdirSync(COVERS)){const fp=path.join(COVERS,f);if(fs.statSync(fp).isFile())covers[f]='data:'+mime(fp).split(';')[0]+';base64,'+fs.readFileSync(fp).toString('base64')}const snap={version:'1.6.1',createdAt:now(),users:all('SELECT * FROM users'),profiles:all('SELECT * FROM profiles'),stories:all('SELECT * FROM stories'),chapters:all('SELECT * FROM chapters'),progress:all('SELECT * FROM reading_progress'),history:all('SELECT * FROM reading_history'),favorites:all('SELECT * FROM favorites'),bookmarks:all('SELECT * FROM bookmarks'),covers};return reply(200,snap)}
 if(p==='/api/v1/admin/backup/restore'&&req.method==='POST')return body(req,30*1024*1024).then(x=>{if(!Array.isArray(x.stories)||!Array.isArray(x.chapters)||!Array.isArray(x.users))return reply(400,{error:'INVALID_BACKUP'});let committed=false;db.exec('BEGIN');try{db.exec('DELETE FROM chapter_translations; DELETE FROM bookmarks; DELETE FROM favorites; DELETE FROM reading_history; DELETE FROM reading_progress; DELETE FROM chapters; DELETE FROM stories; DELETE FROM profiles; DELETE FROM sessions; DELETE FROM users;');for(const r of x.users)run('INSERT INTO users VALUES(?,?,?,?,?,?,?)',r.id,r.username,r.password_hash,r.password_salt,r.display_name,r.role,r.created_at);for(const r of (x.profiles||[]))run('INSERT INTO profiles VALUES(?,?,?)',r.user_id,r.avatar||'',r.updated_at||now());for(const r of x.stories)run('INSERT INTO stories VALUES(?,?,?,?,?,?,?,?,?,?,?)',r.id,r.title,r.author,r.category,r.description,r.search_key||norm([r.title,r.author,r.category,r.description].join(' ')),r.tone,r.status,r.cover_path||'',r.created_at,r.updated_at);for(const r of x.chapters)run('INSERT INTO chapters(id,story_id,chapter_index,title,content,created_at,updated_at,search_key) VALUES(?,?,?,?,?,?,?,?)',r.id,r.story_id,r.chapter_index,r.title,r.content,r.created_at,r.updated_at);for(const r of (x.progress||[]))run('INSERT INTO reading_progress VALUES(?,?,?,?,?)',r.user_id,r.story_id,r.chapter_index,r.position,r.updated_at);for(const r of (x.history||[]))run('INSERT INTO reading_history VALUES(?,?,?,?,?)',r.user_id,r.story_id,r.chapter_index,r.position,r.updated_at);for(const r of (x.favorites||[]))run('INSERT INTO favorites VALUES(?,?,?)',r.user_id,r.story_id,r.created_at);for(const r of (x.bookmarks||[]))run('INSERT INTO bookmarks VALUES(?,?,?,?,?,?)',r.user_id,r.story_id,r.chapter_index,r.title||'',r.created_at,r.updated_at);db.exec('COMMIT');committed=true;cacheClear('/api/v1/stories');for(const f of fs.readdirSync(COVERS))fs.unlinkSync(path.join(COVERS,f));for(const [name,data] of Object.entries(x.covers||{})){const mm=String(data).match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);if(mm)fs.writeFileSync(path.join(COVERS,path.basename(name)),Buffer.from(mm[2],'base64'))}reply(200,{ok:true})}catch(e){if(!committed){try{db.exec('ROLLBACK')}catch{}}reply(committed?500:400,{error:'RESTORE_FAILED',detail:e.message})}}).catch(()=>reply(400,{error:'BAD_JSON'}));
}
if(p.startsWith('/covers/')){const f=path.join(COVERS,path.basename(p));if(fs.existsSync(f))return reply(200,fs.readFileSync(f),mime(f))}
if(p==='/'||p==='/index.html'){const f=path.join(ROOT,'index.html');return reply(200,fs.readFileSync(f,'utf8'),'text/html; charset=utf-8')}
const file=path.normalize(path.join(ROOT,p));if((file===ROOT||file.startsWith(ROOT+path.sep))&&fs.existsSync(file)&&fs.statSync(file).isFile()){const ext=path.extname(file);const types={'.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.html':'text/html; charset=utf-8'};return reply(200,fs.readFileSync(file),types[ext]||'application/octet-stream')}return reply(404,{error:'NOT_FOUND'})}

function zipEntries(buf){
  const out=[]; let eocd=-1;
  for(let i=buf.length-22;i>=Math.max(0,buf.length-65557);i--){if(buf.readUInt32LE(i)===0x06054b50){eocd=i;break}}
  if(eocd<0)throw new Error('INVALID_ZIP');
  const n=buf.readUInt16LE(eocd+10),cd=buf.readUInt32LE(eocd+12),off=buf.readUInt32LE(eocd+16);let p=off;
  for(let i=0;i<n;i++){if(buf.readUInt32LE(p)!==0x02014b50)throw new Error('INVALID_ZIP_CENTRAL');const method=buf.readUInt16LE(p+10),csize=buf.readUInt32LE(p+20),usize=buf.readUInt32LE(p+24),nl=buf.readUInt16LE(p+28),el=buf.readUInt16LE(p+30),cl=buf.readUInt16LE(p+32),lo=buf.readUInt32LE(p+42);const name=buf.slice(p+46,p+46+nl).toString('utf8');out.push({name,method,csize,usize,lo});p+=46+nl+el+cl}
  return out;
}
function zipRead(buf,e){const p=e.lo;if(buf.readUInt32LE(p)!==0x04034b50)throw new Error('INVALID_ZIP_LOCAL');const nl=buf.readUInt16LE(p+26),el=buf.readUInt16LE(p+28),data=buf.slice(p+30+nl+el,p+30+nl+el+e.csize);if(e.method===0)return data;if(e.method===8)return zlib.inflateRawSync(data);throw new Error('UNSUPPORTED_ZIP_COMPRESSION')}
function stripHtml(s){return String(s||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<br\s*\/?>/gi,'\n').replace(/<\/p\s*>/gi,'\n').replace(/<\/div\s*>/gi,'\n').replace(/<\/h[1-6]\s*>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#39;/g,"'").replace(/&quot;/gi,'"').replace(/\r/g,'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim()}
function chapterizeText(text){
  const lines=String(text||'').replace(/^\uFEFF/,'').split(/\n/), re=/^\s*(?:chương|chuong|chapter|chap(?:ter)?|hồi|hoi)\s*(?:[.:#-]?\s*)?(\d+)?(?:\s*[:.\-–—]\s*|\s+)?(.{0,180})\s*$/i,zhRe=/^\s*(第\s*(?:\d+|[零〇一二三四五六七八九十百千万两]+)\s*[章节節回卷篇])\s*[:：.\-–—]?\s*(.{0,180})\s*$/u;let starts=[];
  lines.forEach((line,i)=>{const m=line.match(re);if(m&&((m[1]!==undefined)||/chương|chuong|chapter|hồi|hoi/i.test(line)))starts.push({line:i,num:m[1]?Number(m[1]):null,title:(m[2]||'').trim()});else{const z=line.match(zhRe);if(z)starts.push({line:i,num:null,title:(z[1]+' '+(z[2]||'')).trim()})}});
  if(starts.length===0)return [{index:0,title:'Chương 1',content:String(text||'').trim(),num:null}];
  if(starts.length===1){const a=starts[0],title=a.title||`Chương ${a.num??1}`,content=lines.slice(a.line+1).join('\n').trim();return [{index:0,title,content,num:a.num}]}
  const out=[];for(let i=0;i<starts.length;i++){const a=starts[i],b=starts[i+1]?.line??lines.length;let title=a.title||`Chương ${a.num??i+1}`;let content=lines.slice(a.line+1,b).join('\n').trim();out.push({index:i,title,content,num:a.num})}return out;
}
function parseEpub(buf){
  const es=zipEntries(buf),map=new Map(es.map(e=>[e.name,e]));const readName=n=>{const e=map.get(n);return e?zipRead(buf,e).toString('utf8'):''};const container=readName('META-INF/container.xml');const opfMatch=container.match(/full-path\s*=\s*["']([^"']+)["']/i);if(!opfMatch)throw new Error('EPUB_NO_OPF');const opfPath=opfMatch[1],base=path.posix.dirname(opfPath),opf=readName(opfPath);if(!opf)throw new Error('EPUB_OPF_READ');
  const title=(opf.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i)||[])[1]||'';const author=(opf.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i)||[])[1]||'';const manifest={};for(const m of opf.matchAll(/<item\b[^>]*>/gi)){const tag=m[0],attrs={};for(const a of tag.matchAll(/([:\w-]+)\s*=\s*["']([^"']*)["']/g))attrs[a[1]]=a[2];if(attrs.id&&attrs.href&&attrs['media-type'])manifest[attrs.id]={href:attrs.href,type:attrs['media-type']}}const spine=[];for(const m of opf.matchAll(/<itemref\b[^>]*idref=["']([^"']+)["'][^>]*>/gi)){if(manifest[m[1]])spine.push(manifest[m[1]])}
  const chapters=[];for(const it of spine){if(!/html|xhtml/i.test(it.type))continue;const name=path.posix.normalize(path.posix.join(base,it.href));const raw=readName(name);if(!raw)continue;const txt=stripHtml(raw);if(!txt)continue;const local=chapterizeText(txt);for(const c of local)chapters.push(c)}return {title:stripHtml(title),author:stripHtml(author),chapters:chapters.map((c,i)=>({...c,index:i,title:c.title||`Chương ${i+1}`}))};
}
function parseImportFile(filename,data){const ext=path.extname(filename||'').toLowerCase(),buf=Buffer.from(String(data||'').replace(/^data:[^;]+;base64,/,'').trim(),'base64');if(!buf.length)throw new Error('EMPTY_FILE');if(buf.length>20*1024*1024)throw new Error('IMPORT_TOO_LARGE');if(ext==='.epub'||buf.readUInt32LE(0)===0x04034b50){const e=parseEpub(buf);return {...e,format:'epub',bytes:buf.length}}const text=buf.toString('utf8').replace(/\u0000/g,'');return {title:path.basename(filename||'Truyện',ext).replace(/[_-]+/g,' ').trim(),author:'',chapters:chapterizeText(text),format:'txt',bytes:buf.length};}

function mime(f){return {'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'}[path.extname(f).toLowerCase()]||'application/octet-stream'}
const server=http.createServer((req,res)=>{try{route(req,res)}catch(e){console.error(e);if(!res.headersSent)send(res,500,{error:'INTERNAL_ERROR',detail:e.message},'application/json; charset=utf-8',req)}});
if(require.main===module){
 server.listen(PORT,()=>console.log(`Kho Truyen API v1.19.0 http://localhost:${PORT}`));
 process.on('SIGINT',()=>{db.close();server.close(()=>process.exit(0))});
 process.on('SIGTERM',()=>{db.close();server.close(()=>process.exit(0))});
}
module.exports={parseEpub,chapterizeText,stripHtml,parseImportFile,db,server};
