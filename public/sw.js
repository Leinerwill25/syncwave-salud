/*
 * ASHIRA Service Worker for Web Push Notifications
 */

self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/3.png', // Logo de ASHIRA
      badge: '/3.png', // Icono para la barra de estado
      image: data.image, // Por si enviamos una imagen en la notif
      vibrate: [200, 100, 200],
      tag: 'ashira-notification',
      renotify: true,
      data: {
        url: data.url || '/'
      },
      actions: [
        { action: 'open', title: 'Ver ahora' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
