const http=require('http'),path=require('path'),{spawn}=require('child_process');
const fs=require('fs');
const root=path.resolve(__dirname);
for(const f of ['kho_truyen.sqlite','kho_truyen.sqlite-wal','kho_truyen.sqlite-shm'])try{fs.unlinkSync(path.join(root,f))}catch{}
const p=spawn(process.execPath,['server.js'],{cwd:root,stdio:['ignore','pipe','pipe']});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function req(path,opts={}){
  const r=await fetch('http://127.0.0.1:8787/api/v1'+path,{...opts,headers:{accept:'application/json',...(opts.headers||{})}});
  const t=await r.text();let data;try{data=JSON.parse(t)}catch{data=t}
  return {status:r.status,data};
}
(async()=>{
  try{
    let h;for(let i=0;i<30;i++){try{h=await req('/health');if(h.status===200)break}catch{}await wait(100)}
    if(h?.status!==200)throw Error('health failed');
    for(const path of ['/stories?page=abc&pageSize=abc','/stories/b1/chapters?page=abc&pageSize=abc']) {
      const x=await req(path);
      if(x.status!==200)throw Error('invalid pagination crashed: '+path+' '+JSON.stringify(x));
      if(!Number.isInteger(x.data.page)||x.data.page<1)throw Error('invalid page fallback: '+JSON.stringify(x.data));
      if(!Number.isInteger(x.data.pageSize)||x.data.pageSize<1)throw Error('invalid pageSize fallback: '+JSON.stringify(x.data));
    }
    const login=await req('/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'nguyenvanhoa',password:String.fromCharCode(49,50,51)})});
    if(login.status!==200)throw Error('admin login failed');
    const auth={'authorization':'Bearer '+login.data.token,'content-type':'application/json'};
    let x=await req('/admin/import/jobs?limit=abc',{headers:auth});
    if(x.status!==200||!Array.isArray(x.data.jobs))throw Error('invalid import-job limit failed: '+JSON.stringify(x));
    const data='data:text/plain;base64,'+Buffer.from('Chương 1\\nNội dung đủ dài để kiểm tra batch size.').toString('base64');
    x=await req('/admin/import/batch',{method:'POST',headers:auth,body:JSON.stringify({filename:'bad-batch.txt',data,batchSize:'abc'})});
    if(x.status!==400||x.data.error!=='INVALID_BATCH_SIZE')throw Error('invalid batchSize accepted: '+JSON.stringify(x));
    x=await req('/admin/import/commit',{method:'POST',headers:auth,body:JSON.stringify({filename:'short.txt',data:'data:text/plain;base64,'+Buffer.from('Chương 1\nngắn').toString('base64')})});
    if(x.status!==400||x.data.error!=='IMPORT_ISSUES'||!x.data.issues?.short?.length)throw Error('short commit import accepted: '+JSON.stringify(x));
    x=await req('/admin/stories/b1/renumber',{method:'POST',headers:auth,body:JSON.stringify({start:'abc'})});
    if(x.status!==400||x.data.error!=='INVALID_RENUMBER_START')throw Error('invalid renumber start accepted: '+JSON.stringify(x));
    console.log('numeric input hardening OK');
  }finally{
    p.kill('SIGTERM');await wait(100);
    for(const f of ['kho_truyen.sqlite','kho_truyen.sqlite-wal','kho_truyen.sqlite-shm'])try{fs.unlinkSync(path.join(root,f))}catch{}
  }
})().catch(e=>{console.error(e);process.exitCode=1})
