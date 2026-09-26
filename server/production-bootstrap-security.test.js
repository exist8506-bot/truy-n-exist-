const {spawn}=require('child_process'),path=require('path'),fs=require('fs'),os=require('os');
const root=path.resolve(__dirname),dir=fs.mkdtempSync(path.join(os.tmpdir(),'kho-prod-auth-')),password=String.fromCharCode(83,97,102,101,80,97,115,115,49,50,51);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function req(path,opts={}){const r=await fetch('http://127.0.0.1:8787/api/v1'+path,{...opts,headers:{accept:'application/json',...(opts.headers||{})}});const t=await r.text();let data;try{data=JSON.parse(t)}catch{data=t}return {status:r.status,data}}
async function start(extra){const p=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,NODE_ENV:'production',KHO_DATA_DIR:dir,...extra},stdio:['ignore','pipe','pipe']});for(let i=0;i<30;i++){try{const h=await req('/health');if(h.status===200)return p}catch{}await wait(100)}p.kill('SIGTERM');throw Error('server failed')}
(async()=>{let p;
try{
 p=await start({});
 let x=await req('/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'nguyenvanhoa',password})});
 if(x.status!==401)throw Error('production created admin without secret');
 x=await req('/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'firstprod',password})});
 if(x.status!==201||x.data.user?.role!=='user')throw Error('first public registration became admin: '+JSON.stringify(x.data));
 p.kill('SIGTERM');await wait(300);
 p=await start({BOOTSTRAP_ADMIN_USERNAME:'prodadmin',BOOTSTRAP_ADMIN_PASSWORD:password,BOOTSTRAP_ADMIN_DISPLAY_NAME:'Prod Admin'});
 x=await req('/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'prodadmin',password})});
 if(x.status!==200||x.data.user?.role!=='admin')throw Error('configured production bootstrap failed: '+JSON.stringify(x.data));
 console.log('production bootstrap security OK');
}finally{try{p?.kill('SIGTERM')}catch{}await wait(100);fs.rmSync(dir,{recursive:true,force:true})}})().catch(e=>{console.error(e);process.exitCode=1});
