const http=require('http'),path=require('path'),{spawn}=require('child_process');
const root=path.resolve(__dirname);
for(const f of ['kho_truyen.sqlite','kho_truyen.sqlite-wal','kho_truyen.sqlite-shm'])try{require('fs').unlinkSync(path.join(root,f))}catch{}
const p=spawn(process.execPath,['server.js'],{cwd:root,stdio:['ignore','pipe','pipe']});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function req(pth,opts={}){
  const r=await fetch('http://127.0.0.1:8787/api/v1'+pth,{...opts,headers:{accept:'application/json',...(opts.headers||{})}});
  const t=await r.text();let data;try{data=JSON.parse(t)}catch{data=t}
  return {status:r.status,data};
}
(async()=>{
  try{
    let h;for(let i=0;i<30;i++){try{h=await req('/health');if(h.status===200)break}catch{}await wait(100)}
    if(h?.status!==200)throw Error('health failed');
    const login=await req('/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'nguyenvanhoa',password:'123'})});
    if(login.status!==200)throw Error('admin login failed');
    const auth={'authorization':'Bearer '+login.data.token,'content-type':'application/json'};
    const cr=await req('/admin/stories',{method:'POST',headers:auth,body:JSON.stringify({title:'Edge Validation',author:'CI'})});
    if(cr.status!==201)throw Error('story create failed');
    const sid=cr.data.id;
    let x=await req('/admin/stories/'+sid+'/chapters',{method:'POST',headers:auth,body:JSON.stringify({index:-1,title:'bad',content:'bad'})});
    if(x.status!==400||x.data.error!=='INVALID_CHAPTER_INDEX')throw Error('negative chapter index accepted: '+JSON.stringify(x));
    x=await req('/admin/stories/'+sid+'/chapters',{method:'POST',headers:auth,body:JSON.stringify({index:'abc',title:'bad',content:'bad'})});
    if(x.status!==400||x.data.error!=='INVALID_CHAPTER_INDEX')throw Error('non-numeric chapter index accepted: '+JSON.stringify(x));
    x=await req('/admin/stories/'+sid+'/chapters',{method:'POST',headers:auth,body:JSON.stringify({index:0,title:'Good',content:'This chapter is intentionally long enough for validation.'})});
    if(x.status!==201)throw Error('valid chapter create failed: '+JSON.stringify(x));
    const user=await req('/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'edge_user',password:'secret123'})});
    if(user.status!==201)throw Error('user create failed');
    const ua={'authorization':'Bearer '+user.data.token,'content-type':'application/json'};
    x=await req('/progress',{method:'PUT',headers:ua,body:JSON.stringify({storyId:sid,chapterIndex:99,position:20})});
    if(x.status!==400||x.data.error!=='INVALID_CHAPTER_INDEX')throw Error('out-of-range progress accepted: '+JSON.stringify(x));
    x=await req('/progress',{method:'PUT',headers:ua,body:JSON.stringify({storyId:sid,chapterIndex:0,position:101})});
    if(x.status!==400||x.data.error!=='INVALID_POSITION')throw Error('out-of-range progress position accepted: '+JSON.stringify(x));
    x=await req('/bookmarks',{method:'PUT',headers:ua,body:JSON.stringify({storyId:sid,chapterIndex:99,active:true})});
    if(x.status!==400||x.data.error!=='INVALID_CHAPTER_INDEX')throw Error('out-of-range bookmark accepted: '+JSON.stringify(x));
    x=await req('/progress',{method:'PUT',headers:ua,body:JSON.stringify({storyId:sid,chapterIndex:0,position:50})});
    if(x.status!==200)throw Error('valid progress setup failed: '+JSON.stringify(x));
    await req('/bookmarks',{method:'PUT',headers:ua,body:JSON.stringify({storyId:sid,chapterIndex:0,title:'delete me',active:true})});
    x=await req('/admin/stories/'+sid+'/chapters/0',{method:'DELETE',headers:auth});
    if(x.status!==200)throw Error('chapter delete failed: '+JSON.stringify(x));
    x=await req('/progress',{headers:ua});
    if(x.status!==200||x.data[sid])throw Error('deleted chapter left progress: '+JSON.stringify(x.data));
    x=await req('/bookmarks',{headers:ua});
    if(x.status!==200||x.data.items.some(v=>v.storyId===sid&&v.chapterIndex===0))throw Error('deleted chapter left bookmark: '+JSON.stringify(x.data));
    x=await req('/sync',{headers:ua});
    if(x.status!==200||x.data.history?.[sid]||x.data.progress?.[sid])throw Error('deleted chapter left sync history/progress: '+JSON.stringify(x.data));
    x=await req('/admin/stories/bulk',{method:'PUT',headers:auth,body:JSON.stringify({storyIds:[sid,'missing-id'],status:'FULL'})});
    if(x.status!==200||x.data.updated!==1)throw Error('bulk update counted missing story: '+JSON.stringify(x));
    await req('/admin/stories/'+sid,{method:'DELETE',headers:auth});
    console.log('edge validation OK');
  }finally{
    p.kill('SIGTERM');await wait(100);
    for(const f of ['kho_truyen.sqlite','kho_truyen.sqlite-wal','kho_truyen.sqlite-shm'])try{require('fs').unlinkSync(path.join(root,f))}catch{}
  }
})().catch(e=>{console.error(e);process.exitCode=1})
