
const CACHE_NAME = 'autocontrol-pro-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.css',
  // Es posible que necesites añadir aquí los bundles de JS y CSS si tienen hashes
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;

  // Para peticiones a la API, usar estrategia "Network first".
  // Esto asegura que siempre se obtienen los datos más frescos.
  // Si la red falla, no se intenta nada (pero se podría devolver una respuesta offline genérica).
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        // Opcional: Devolver una respuesta JSON genérica de "offline".
        if (request.method === 'GET') {
            return new Response(JSON.stringify({ error: 'Estás offline. No se pueden obtener los datos.' }), {
              headers: { 'Content-Type': 'application/json' }
            });
        }
        // Para POST, PUT, DELETE, simplemente fallar si no hay red.
        // No se puede crear/modificar datos offline sin una lógica de sincronización compleja.
      })
    );
    return;
  }

  // Para todas las demás peticiones (app shell), usar "Cache first".
  // Esto hace que la aplicación cargue instantáneamente desde el caché.
  event.respondWith(
    caches.match(request)
      .then(response => {
        // Si el recurso está en el caché, lo devuelve.
        if (response) {
          return response;
        }
        // Si no, hace la petición a la red, y la guarda en caché para la próxima vez.
        return fetch(request).then(
          fetchResponse => {
            if(!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }

            const responseToCache = fetchResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, responseToCache);
              });

            return fetchResponse;
          }
        );
      })
  );
});

// Evento 'activate': Limpia cachés antiguos.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
