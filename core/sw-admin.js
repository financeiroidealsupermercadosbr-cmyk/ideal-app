// sw-admin.js — service worker mínimo do painel IDEAL Core
const CACHE = 'core-admin-v1';

self.addEventListener('install', e => { self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Nunca cacheia chamadas ao Supabase (auth/dados) — sempre rede.
  if (url.includes('supabase.co')) return;
  // HTML/recursos: tenta rede primeiro, cai pro cache se offline.
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
        return resp;
      })
      .catch(() => caches.match(e.request))
  );
});
