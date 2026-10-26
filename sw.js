const CACHE='budget-studio-offline-v9-8a-device-sync';
const ASSETS=['./index.html','./style.css?v=098a','./app.js?v=098a','./crypto-extra.js?v=098a','./auth-extra.js?v=098a','./sync-extra.js?v=098a','./media-extra.js?v=098a','./business-extra.js?v=098a','./finance-engine.js?v=098a','./tool-planner.js?v=098a','./home-tools.js?v=098a','./orders-extra.js?v=098a','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('budget-studio-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin)return;
 if(req.mode==='navigate'){event.respondWith(fetch(req).catch(()=>caches.match('./index.html')));return;}
 if(/\/(app\.js|sync-extra\.js|crypto-extra\.js|media-extra\.js|business-extra\.js|orders-extra\.js|tool-planner\.js|home-tools\.js|finance-engine\.js|style\.css)$/.test(url.pathname)){event.respondWith(fetch(req).then(response=>{if(response.ok){const clone=response.clone();caches.open(CACHE).then(cache=>cache.put(req,clone)).catch(()=>{});}return response}).catch(()=>caches.match(req)));return;}
 event.respondWith(caches.match(req).then(cached=>cached||fetch(req)));
});
