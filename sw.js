/* Service Worker — Ideal Supermercados (D11-P1 · PWA)
   Estratégia conservadora para NÃO travar atualizações nem a API:
   - NUNCA cacheia chamadas ao Apps Script (script.google.com) → dados sempre frescos.
   - HTML = network-first → sempre pega a versão nova quando online; cai no cache offline.
   - Estáticos (ícones, etc.) = cache-first.
   Para forçar atualização do cache no futuro, suba o número da versão em CACHE. */
const CACHE = 'ideal-v12';
const SHELL = ['./', './index.html', './icon-192-3.png', './icon-512-3.png', './manifest.json'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                          // POSTs (API) passam direto
  const url = new URL(req.url);
  if (url.hostname.indexOf('script.google.com') !== -1) return; // nunca cacheia a API

  const aceita = req.headers.get('accept') || '';
  const ehHTML = req.mode === 'navigate' || aceita.indexOf('text/html') !== -1;

  if (ehHTML) {
    // network-first: versão nova sempre que online; cache como rede de segurança offline
    e.respondWith(
      fetch(req)
        .then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return r; })
        .catch(() => caches.match(req).then((m) => m || caches.match('./index.html')))
    );
  } else {
    // estáticos: cache-first
    e.respondWith(
      caches.match(req).then((m) => m || fetch(req).then((r) => {
        const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp));
        return r;
      }))
    );
  }
});
