const V = 'miradel-v5';
const FILES = ['/', '/index.html', '/student.html', '/admin.html', '/student.js', '/admin.js', '/common.js', '/theme.css', '/manifest.json', '/icon.svg', '/offline.html', '/modules/lugat.html'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES))); self.skipWaiting(); });
// Eski ilova keshini o'chiramiz, lekin lug'at darajalari keshi ('lugat-data') qoladi
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x.startsWith('miradel-') && x !== V).map(x => caches.delete(x))))); self.clients.claim(); });
// Ilova qobig'i qurilmadan ochiladi (internetsiz ham), yangilanishi orqa fonda
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  e.respondWith((async () => {
    const c = await caches.open(V), m = await c.match(r);
    const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => null);
    if (m) { e.waitUntil(net); return m; }
    return (await net) || c.match('/offline.html');
  })());
});
