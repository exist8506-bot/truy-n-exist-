const {spawn}=require('child_process'),path=require('path'),fs=require('fs');
const root=path.resolve(__dirname);
for(const f of ['kho_truyen.sqlite','kho_truyen.sqlite-wal','kho_truyen.sqlite-shm'])try{fs.unlinkSync(path.join(root,f))}catch{}
const p=spawn(process.execPath,['server.js'],{cwd:root,stdio:['ignore','pipe','pipe']});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function req(path,opts={}){const r=await fetch('http://127.0.0.1:8787/api/v1'+path,{...opts,headers:{accept:'application/json',...(opts.headers||{})}});const t=await r.text();let data;try{data=JSON.parse(t)}catch{data=t}return {status:r.status,data}}
(async()=>{try{
 let h;for(let i=0;i<30;i++){try{h=await req('/health');if(h.status===200)break}catch{}await wait(100)}if(h?.status!==200)throw Error('health failed');
 const password=String.fromCharCode(49,50,51);
 let x=await req('/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'nguyenvanhoa',password})});
 if(x.status!==200)throw Error('login failed');
 const token=x.data.token,auth={authorization:'Bearer '+token};
 x=await req('/auth/me',{headers:auth});if(x.status!==200)throw Error('session not usable');
 x=await req('/auth/logout',{method:'POST',headers:auth});if(x.status!==200||!x.data.ok)throw Error('logout failed: '+JSON.stringify(x.data));
 x=await req('/auth/me',{headers:auth});if(x.status!==401)throw Error('logged-out token still active: '+JSON.stringify(x.data));
 console.log('logout invalidation OK');
}finally{p.kill('SIGTERM');await wait(100);for(const f of ['kho_truyen.sqlite','kho_truyen.sqlite-wal','kho_truyen.sqlite-shm'])try{fs.unlinkSync(path.join(root,f))}catch{}}})().catch(e=>{console.error(e);process.exitCode=1});
