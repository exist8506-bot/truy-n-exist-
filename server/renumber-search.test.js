const {spawn}=require('child_process'),path=require('path'),fs=require('fs');
const root=path.resolve(__dirname);
for(const f of ['kho_truyen.sqlite','kho_truyen.sqlite-wal','kho_truyen.sqlite-shm'])try{fs.unlinkSync(path.join(root,f))}catch{}
const p=spawn(process.execPath,['server.js'],{cwd:root,stdio:['ignore','pipe','pipe']});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function req(path,opts={}){const r=await fetch('http://127.0.0.1:8787/api/v1'+path,{...opts,headers:{accept:'application/json',...(opts.headers||{})}});const t=await r.text();let data;try{data=JSON.parse(t)}catch{data=t}return {status:r.status,data}}
(async()=>{try{
 let h;for(let i=0;i<30;i++){try{h=await req('/health');if(h.status===200)break}catch{}await wait(100)}if(h?.status!==200)throw Error('health failed');
 const password=String.fromCharCode(49,50,51);
 const login=await req('/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'nguyenvanhoa',password})});
 if(login.status!==200)throw Error('login failed');
 const auth={authorization:'Bearer '+login.data.token};
 const x=await req('/admin/stories/b1/renumber',{method:'POST',headers:{...auth,'content-type':'application/json'},body:JSON.stringify({start:10})});
 if(x.status!==200)throw Error('renumber failed: '+JSON.stringify(x.data));
 let s=await req('/stories/b1/chapters?page=1&pageSize=100&q=10');
 if(s.status!==200||s.data.count!==1||Number(s.data.items[0]?.index)!==10)throw Error('renumbered numeric search did not find chapter 10: '+JSON.stringify(s.data));
 s=await req('/stories/b1/chapters?page=1&pageSize=100&q=11');
 if(s.status!==200||s.data.count!==1||Number(s.data.items[0]?.index)!==11)throw Error('renumbered numeric search did not find chapter 11: '+JSON.stringify(s.data));
 console.log('renumbered numeric chapter search OK');
}finally{p.kill('SIGTERM');await wait(100);for(const f of ['kho_truyen.sqlite','kho_truyen.sqlite-wal','kho_truyen.sqlite-shm'])try{fs.unlinkSync(path.join(root,f))}catch{}}})().catch(e=>{console.error(e);process.exitCode=1})
