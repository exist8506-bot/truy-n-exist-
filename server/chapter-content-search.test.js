const {spawn}=require('child_process'),path=require('path'),fs=require('fs');
const root=path.resolve(__dirname);
for(const f of ['kho_truyen.sqlite','kho_truyen.sqlite-wal','kho_truyen.sqlite-shm'])try{fs.unlinkSync(path.join(root,f))}catch{}
const p=spawn(process.execPath,['server.js'],{cwd:root,stdio:['ignore','pipe','pipe']});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function req(path){const r=await fetch('http://127.0.0.1:8787/api/v1'+path);const data=await r.json();return {status:r.status,data}}
(async()=>{try{
 let h;for(let i=0;i<30;i++){try{h=await req('/health');if(h.status===200)break}catch{}await wait(100)}if(h?.status!==200)throw Error('health failed');
 let x=await req('/stories/b1/chapters?page=1&pageSize=100&q=Minh');
 if(x.status!==200||x.data.count<1)throw Error('content search failed: '+JSON.stringify(x.data));
 x=await req('/stories/b1/chapters?page=1&pageSize=100&q=dinh');
 if(x.status!==200||x.data.count<1)throw Error('accent-insensitive content search failed: '+JSON.stringify(x.data));
 x=await req('/stories/b1/chapters?page=1&pageSize=100&q=không+tồn+tại');
 if(x.status!==200||x.data.count!==0)throw Error('empty content search failed: '+JSON.stringify(x.data));
 console.log('chapter content search regression OK');
}finally{p.kill('SIGTERM');await wait(100);for(const f of ['kho_truyen.sqlite','kho_truyen.sqlite-wal','kho_truyen.sqlite-shm'])try{fs.unlinkSync(path.join(root,f))}catch{}}})().catch(e=>{console.error(e);process.exitCode=1});
