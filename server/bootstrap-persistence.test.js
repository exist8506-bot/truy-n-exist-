const fs=require('fs'),os=require('os'),path=require('path'),{spawn}=require('child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kho-bootstrap-'));
const root=path.resolve(__dirname);
const password=String.fromCharCode(49,50,51);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function req(path,opts={}){const r=await fetch('http://127.0.0.1:8787/api/v1'+path,{...opts,headers:{accept:'application/json',...(opts.headers||{})}});const t=await r.text();let data;try{data=JSON.parse(t)}catch{data=t}return {status:r.status,data}}
async function start(){const p=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,KHO_DATA_DIR:dir},stdio:['ignore','pipe','pipe']});for(let i=0;i<30;i++){try{const h=await req('/health');if(h.status===200)return p}catch{}await wait(100)}p.kill('SIGTERM');throw Error('server failed to start')}
(async()=>{let p;
try{
 p=await start();
 let x=await req('/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'nguyenvanhoa',password})});
 if(x.status!==200)throw Error('bootstrap login failed: '+JSON.stringify(x.data));
 const auth={authorization:'Bearer '+x.data.token,'content-type':'application/json'};
 x=await req('/profile',{method:'PUT',headers:auth,body:JSON.stringify({displayName:'Admin Persistent'})});
 if(x.status!==200||x.data.displayName!=='Admin Persistent')throw Error('profile update failed: '+JSON.stringify(x.data));
 p.kill('SIGTERM');await wait(300);
 p=await start();
 x=await req('/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'nguyenvanhoa',password})});
 if(x.status!==200)throw Error('bootstrap login after restart failed: '+JSON.stringify(x.data));
 x=await req('/profile',{headers:{authorization:'Bearer '+x.data.token}});
 if(x.status!==200||x.data.displayName!=='Admin Persistent')throw Error('bootstrap display name was reset: '+JSON.stringify(x.data));
 console.log('bootstrap profile persistence OK');
}finally{try{p?.kill('SIGTERM')}catch{}await wait(100);fs.rmSync(dir,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
