const {spawn}=require('child_process'),path=require('path'),fs=require('fs');
const root=path.resolve(__dirname);
for(const f of ['kho_truyen.sqlite','kho_truyen.sqlite-wal','kho_truyen.sqlite-shm'])try{fs.unlinkSync(path.join(root,f))}catch{}
const p=spawn(process.execPath,['server.js'],{cwd:root,stdio:['ignore','pipe','pipe']});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function req(path,opts={}){const r=await fetch('http://127.0.0.1:8787/api/v1'+path,{...opts,headers:{accept:'application/json',...(opts.headers||{})}});const t=await r.text();let data;try{data=JSON.parse(t)}catch{data=t}return {status:r.status,data}}
(async()=>{try{
 let h;for(let i=0;i<30;i++){try{h=await req('/health');if(h.status===200)break}catch{}await wait(100)}if(h?.status!==200)throw Error('health failed');
 const password=String.fromCharCode(49,50,51),login=await req('/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'nguyenvanhoa',password})});
 if(login.status!==200)throw Error('login failed');
 const auth={authorization:'Bearer '+login.data.token,'content-type':'application/json'};
 let x=await req('/admin/stories',{method:'POST',headers:auth,body:JSON.stringify({title:'Empty Chapter Test',author:'CI'})});if(x.status!==201)throw Error('story create failed');const id=x.data.id;
 x=await req('/admin/stories/'+id+'/chapters',{method:'POST',headers:auth,body:JSON.stringify({index:0,title:'Empty',content:'   '})});if(x.status!==400||x.data.error!=='INVALID_CHAPTER_CONTENT')throw Error('empty chapter create accepted: '+JSON.stringify(x.data));
 x=await req('/admin/stories/'+id+'/chapters',{method:'POST',headers:auth,body:JSON.stringify({index:0,title:'Good',content:'Valid chapter content long enough for the CRUD hardening regression.'})});if(x.status!==201)throw Error('valid chapter rejected');
 x=await req('/admin/stories/'+id+'/chapters/0',{method:'PUT',headers:auth,body:JSON.stringify({content:'  '})});if(x.status!==400||x.data.error!=='INVALID_CHAPTER_CONTENT')throw Error('empty chapter update accepted: '+JSON.stringify(x.data));
 x=await req('/admin/stories/'+id,{method:'DELETE',headers:auth});if(x.status!==200)throw Error('cleanup failed');
 console.log('chapter content hardening OK');
}finally{p.kill('SIGTERM');await wait(100);for(const f of ['kho_truyen.sqlite','kho_truyen.sqlite-wal','kho_truyen.sqlite-shm'])try{fs.unlinkSync(path.join(root,f))}catch{}}})().catch(e=>{console.error(e);process.exitCode=1});
