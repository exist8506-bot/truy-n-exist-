const V='kho-truyen-1.20.0';
const PRECACHE=['./','./index.html','./app.js','./books.js','./api-client.js','./manifest.webmanifest','./public-domain-seed.json','./sw.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>c.addAll(PRECACHE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(a=>Promise.all(a.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c)).catch(()=>{});return r})
 .catch(()=>caches.match(e.request).then(r=>r||Response.error())));
});