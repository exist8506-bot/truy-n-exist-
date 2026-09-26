const zlib=require('node:zlib'),path=require('path'),fs=require('fs');
const root=path.resolve(__dirname),original=zlib.gzip;
for(const f of ['kho_truyen.sqlite','kho_truyen.sqlite-wal','kho_truyen.sqlite-shm'])try{fs.unlinkSync(path.join(root,f))}catch{}
zlib.gzip=(buf,cb)=>cb(new Error('forced gzip failure'));
const p=require('./server');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
 let r;for(let i=0;i<30;i++){try{r=await fetch('http://127.0.0.1:8787/api/v1/health',{headers:{'accept-encoding':'gzip'}});if(r.ok)break}catch{}await wait(100)}
 if(!r?.ok)throw Error('health failed');
 if(r.headers.get('content-encoding'))throw Error('gzip header remained after failure: '+r.headers.get('content-encoding'));
 const j=await r.json();if(j.status!=='ok')throw Error('invalid fallback body: '+JSON.stringify(j));
 console.log('gzip fallback OK');
}finally{zlib.gzip=original;try{p.server?.close?.()}catch{}try{p.close?.()}catch{}await wait(100);for(const f of ['kho_truyen.sqlite','kho_truyen.sqlite-wal','kho_truyen.sqlite-shm'])try{fs.unlinkSync(path.join(root,f))}catch{}}})().catch(e=>{console.error(e);process.exitCode=1});
