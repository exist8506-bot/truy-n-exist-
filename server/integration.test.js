const http=require('http'),fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const root=path.resolve(__dirname);
for(const f of ['kho_truyen.sqlite','kho_truyen.sqlite-wal','kho_truyen.sqlite-shm'])try{fs.unlinkSync(path.join(root,f))}catch{}
const p=spawn(process.execPath,['server.js'],{cwd:root,stdio:['ignore','pipe','pipe']});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function req(path,opts={}){const r=await fetch('http://127.0.0.1:8787/api/v1'+path,opts);const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=text}return {status:r.status,headers:r.headers,data};}
(async()=>{try{
 let h;for(let i=0;i<30;i++){try{h=await req('/health');if(h.status===200)break}catch{}await wait(200)}if(h?.status!==200)throw Error('health failed');
 let x=await req('/stories?page=1&pageSize=10');if(x.status!==200||x.data.count!==3||x.data.items.length!==3)throw Error('stories list shape/seed failed');
 x=await req('/stories/b1/chapters/0');if(x.status!==200||!x.data.content)throw Error('chapter failed');
 const reg=await req('/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'ci_admin',password:'secret123',displayName:'CI Admin'})});if(reg.status!==201)throw Error('register failed '+JSON.stringify(reg.data));const token=reg.data.token;const auth={'authorization':'Bearer '+token};
 x=await req('/auth/me',{headers:auth});if(x.status!==200||x.data.role!=='admin')throw Error('admin me failed');
 x=await req('/profile',{headers:auth});if(x.status!==200)throw Error('profile get failed');
 x=await req('/profile',{method:'PUT',headers:{...auth,'content-type':'application/json'},body:JSON.stringify({displayName:'CI Updated'})});if(x.status!==200||x.data.displayName!=='CI Updated')throw Error('profile put failed');
 x=await req('/progress',{method:'PUT',headers:{...auth,'content-type':'application/json'},body:JSON.stringify({storyId:'b1',chapterIndex:2,position:37.5})});if(x.status!==200||x.data.chapterIndex!==2)throw Error('progress put failed');
 x=await req('/progress',{headers:auth});if(x.status!==200||x.data.b1.chapterIndex!==2)throw Error('progress get failed');
 x=await req('/favorites',{method:'PUT',headers:{...auth,'content-type':'application/json'},body:JSON.stringify({storyId:'b1',active:true})});if(x.status!==200||!x.data.items.includes('b1'))throw Error('favorite put failed');
 x=await req('/favorites',{headers:auth});if(x.status!==200||!x.data.includes('b1'))throw Error('favorite get failed');
 x=await req('/sync',{headers:auth});if(x.status!==200||x.data.progress.b1.chapterIndex!==2||!x.data.favorites.includes('b1'))throw Error('sync failed');
 x=await req('/admin/stats',{headers:auth});if(x.status!==200||x.data.stories!==3||x.data.chapters!==26)throw Error('admin stats failed');
 x=await req('/admin/stories',{method:'POST',headers:{...auth,'content-type':'application/json'},body:JSON.stringify({title:'CI CRUD Story',author:'CI',cat:'Test',desc:'Integration'})});if(x.status!==201)throw Error('admin create story failed');const sid=x.data.id;
 x=await req('/admin/stories/'+sid+'/chapters',{method:'POST',headers:{...auth,'content-type':'application/json'},body:JSON.stringify({index:0,title:'Chương CI',content:'Nội dung tích hợp đủ dài để kiểm tra API CRUD.'})});if(x.status!==201)throw Error('admin create chapter failed');
 x=await req('/stories/'+sid+'/chapters/0');if(x.status!==200||x.data.title!=='Chương CI')throw Error('new chapter read failed');
 x=await req('/admin/stories/'+sid+'/chapters/0',{method:'PUT',headers:{...auth,'content-type':'application/json'},body:JSON.stringify({title:'Chương CI sửa',content:'Nội dung đã được chỉnh sửa.'})});if(x.status!==200)throw Error('admin update chapter failed');
 x=await req('/admin/stories/'+sid,{method:'PUT',headers:{...auth,'content-type':'application/json'},body:JSON.stringify({title:'CI CRUD Story sửa'})});if(x.status!==200)throw Error('admin update story failed');
 x=await req('/admin/stories/'+sid+'/chapters/0',{method:'DELETE',headers:auth});if(x.status!==200)throw Error('admin delete chapter failed');
 x=await req('/admin/stories/'+sid,{method:'DELETE',headers:auth});if(x.status!==200)throw Error('admin delete story failed');
 x=await req('/admin/stories/diagnostics',{headers:auth});if(x.status!==200||!Array.isArray(x.data.stories))throw Error('diagnostics failed');
 x=await req('/admin/backup',{headers:auth});if(x.status!==200||!Array.isArray(x.data.stories)||!Array.isArray(x.data.chapters))throw Error('backup failed');
 const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';x=await req('/admin/stories/b1/cover',{method:'POST',headers:{'authorization':'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({data:'data:image/png;base64,'+png})});if(x.status!==200||!x.data.cover)throw Error('cover upload failed '+JSON.stringify(x.data)); const u=await req('/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'ci_user',password:'secret123'})});if(u.status!==201)throw Error('second user failed');
 x=await req('/admin/stats',{headers:{authorization:'Bearer '+u.data.token}});if(x.status!==403)throw Error('admin guard failed');
 x=await req('/stories/b1');const et=x.headers.get('etag');if(!et)throw Error('etag missing');x=await req('/stories/b1',{headers:{'if-none-match':et}});if(x.status!==304)throw Error('etag 304 failed');
 x=await req('/stories',{headers:{'accept-encoding':'gzip'}});if(x.status!==200)throw Error('gzip request failed');
 console.log('1.6 integration OK');
}finally{p.kill('SIGTERM');await wait(100);for(const f of ['kho_truyen.sqlite','kho_truyen.sqlite-wal','kho_truyen.sqlite-shm'])try{fs.unlinkSync(path.join(root,f))}catch{}}})().catch(e=>{console.error(e);process.exitCode=1});