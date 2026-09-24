/* Kho Truyen Full API bridge */
(function(){
 const base=()=> (window.KHO_API_BASE || (location.protocol==='file:'?'http://localhost:8787/api/v1':'/api/v1')).replace(/\/$/,'');
 async function request(path,opts={}){const r=await fetch(base()+path,{...opts,headers:{Accept:'application/json',...(opts.headers||{})}});if(!r.ok)throw new Error('HTTP_'+r.status);return r.status===204?null:r.json()}
 window.KhoAPI={version:'1.6.1',base,getStories:(q='')=>request('/stories'+(q?'?q='+encodeURIComponent(q):'')),getBook:id=>request('/stories/'+encodeURIComponent(id)),getChapter:(id,i)=>request('/stories/'+encodeURIComponent(id)+'/chapters/'+i)};
})();
