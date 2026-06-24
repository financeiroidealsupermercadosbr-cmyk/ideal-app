/* Service Worker — Ideal Core (PWA)
   Estratégia que se atualiza sozinha (sem limpar cache na mão):
   - HTML (same-origin): network-first → sempre a versão nova quando online; cache = rede offline.
   - Estáticos (same-origin: ícones, manifest, imagens): stale-while-revalidate →
     entrega rápido do cache E busca a versão nova em segundo plano; a próxima carga já vem atualizada.
   - Cross-origin (Supabase, CDNs, fontes Google): passa DIRETO pela rede, nunca cacheia
     (protege os dados da API e impede servir manifest/ícone velho).
   Para um reset imediato e total, basta subir o número em CACHE. */
const CACHE = 'ideal-v16';
const SHELL = ['./', './index.html', './manifest.json',
               './logo-core.png', './login-bg-core.png',
               './icon-cliente-192.png', './icon-cliente-512.png',
               './icon-splash-192.png', './icon-splash-512.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) =>
    Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))   // cada item isolado: 1 falha não derruba os outros
  ));
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
  if (req.method !== 'GET') return;                    // POST/PUT/etc (API) passam direto
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;     // Supabase, CDNs e fontes: rede direta, sem cache

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
    // stale-while-revalidate: serve cache na hora E atualiza em segundo plano
    e.respondWith(
      caches.match(req).then((cached) => {
        const rede = fetch(req).then((r) => {
          if (r && r.status === 200) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
          return r;
        }).catch(() => cached);
        return cached || rede;
      })
    );
  }
});
