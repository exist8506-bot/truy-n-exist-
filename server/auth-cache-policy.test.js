const {spawn}=require('child_process'),path=require('path'),fs=require('fs');
const root=path.resolve(__dirname);
for(const f of ['kho_truyen.sqlite','kho_truyen.sqlite-wal','kho_truyen.sqlite-shm'])try{fs.unlinkSync(path.join(root,f))}catch{}
const p=spawn(process.execPath,['server.js'],{cwd:root,stdio:['ignore','pipe','pipe']});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
 let ready=false;for(let i=0;i<30;i++){try{const r=await fetch('http://127.0.0.1:8787/api/v1/health');if(r.ok){ready=true;break}}catch{}await wait(100)}if(!ready)throw Error('health failed');
 const password=String.fromCharCode(49,50,51);
 const login=await fetch('http://127.0.0.1:8787/api/v1/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'nguyenvanhoa',password})});
 if(!login.ok)throw Error('login failed');
 const j=await login.json(), auth={authorization:'Bearer '+j.token};
 const personal=await fetch('http://127.0.0.1:8787/api/v1/progress',{headers:auth});
 if(personal.headers.get('cache-control')!=='no-store')throw Error('authenticated GET cache policy is not no-store: '+personal.headers.get('cache-control'));
 const publicResponse=await fetch('http://127.0.0.1:8787/api/v1/stories?page=1&pageSize=1');
 if(publicResponse.headers.get('cache-control')!=='private, max-age=5')throw Error('public GET cache policy changed unexpectedly: '+publicResponse.headers.get('cache-control'));
 console.log('authenticated GET cache policy OK');
}finally{p.kill('SIGTERM');await wait(100);for(const f of ['kho_truyen.sqlite','kho_truyen.sqlite-wal','kho_truyen.sqlite-shm'])try{fs.unlinkSync(path.join(root,f))}catch{}}})().catch(e=>{console.error(e);process.exitCode=1});
