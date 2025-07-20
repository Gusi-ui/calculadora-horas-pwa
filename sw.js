const CACHE_NAME = 'calculadora-horas-v1.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/sheet.css',
  '/main.js',
  '/data/holidays.json',
  '/favicons/favicon.svg',
  '/favicons/favicon-96x96.png',
  '/favicons/apple-touch-icon.png',
  '/favicons/site.webmanifest',
  'https://cdn.jsdelivr.net/npm/slim-select@2.8.0/dist/slimselect.min.js',
  'https://cdn.jsdelivr.net/npm/slim-select@2.8.0/dist/slimselect.min.css'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Error en la instalación del cache:', error);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptar peticiones
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Devolver desde cache si está disponible
        if (response) {
          return response;
        }

        // Si no está en cache, intentar obtener de la red
        return fetch(event.request)
          .then((response) => {
            // Verificar que la respuesta sea válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clonar la respuesta para poder usarla en cache y devolverla
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Si falla la red, devolver página offline para navegación
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Manejo de mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Sincronización en segundo plano
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Aquí se pueden implementar tareas en segundo plano
  // como sincronizar datos, enviar notificaciones, etc.
  console.log('Sincronización en segundo plano ejecutada');
}

// Manejo de notificaciones push
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nueva notificación',
    icon: '/favicons/favicon-96x96.png',
    badge: '/favicons/favicon-96x96.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver detalles',
        icon: '/favicons/favicon-96x96.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/favicons/favicon-96x96.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Calculadora de Horas', options)
  );
});

// Manejo de clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
}); 