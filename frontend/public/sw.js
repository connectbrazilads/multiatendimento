// Service Worker básico para permitir instalação como PWA
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Estratégia de rede apenas (não faz cache para evitar bugs de sync)
  event.respondWith(fetch(event.request));
});
