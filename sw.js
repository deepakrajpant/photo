const VERSION='sajilo-gk-v3-owner';
const BASE=new URL('./',self.location).href;
const SHELL=['','index.html','manifest.json','assets/css/main.css','assets/css/student.css','assets/css/admin.css','assets/css/learning.css','assets/css/navigation.css','assets/js/ui/navigation.js','assets/js/services/access.js','assets/js/app.js','assets/js/utils.js','assets/js/ui/components.js','assets/icons/icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL.map(p=>BASE+p)))));
self.addEventListener('message',e=>{if(e.data==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sajilo-gk-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET')return;
 if(u.origin==='https://www.gstatic.com'&&u.pathname.startsWith('/firebasejs/12.10.0/')){e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(VERSION).then(c=>c.put(e.request,copy));}return r;})));return;}
 if(u.origin!==self.location.origin||!u.href.startsWith(BASE))return;
 if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match(BASE+'index.html')));return;}
 if(!/\.(js|css|svg|png|woff2)$/.test(u.pathname))return;
 e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(VERSION).then(c=>c.put(e.request,copy));}return r;})));
});
