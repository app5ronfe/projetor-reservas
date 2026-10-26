// Recebe o push da secretaria e abre a app ao tocar. O envio (VAPID) é feito no servidor.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('push', (event) => {
  let dados = { titulo: 'Secretaria 5 Ronfe', corpo: 'Nova atividade no projetor', url: '/secretaria' };
  try { if (event.data) dados = { ...dados, ...event.data.json() }; } catch { /* mensagem sem JSON */ }
  event.waitUntil(self.registration.showNotification(dados.titulo, { body: dados.corpo, data: { url: dados.url } }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data.url));
});
