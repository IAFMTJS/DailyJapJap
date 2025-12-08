// Service Worker for DailyJapJap PWA
const CACHE_NAME = 'dailyjapjap-v1';
const RUNTIME_CACHE = 'dailyjapjap-runtime-v1';

// Files to cache immediately
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/style.css',
  '/main.js',
  '/manifest.json',
  '/modules/core/state-manager.js',
  '/modules/core/event-bus.js',
  '/modules/core/api-client.js',
  '/modules/core/app-manager.js',
  '/utils/helpers.js',
  '/utils/api.js',
  '/services/studyStats.js',
  '/services/xpService.js',
  '/services/heartsService.js',
  '/services/streakService.js',
  '/services/skillStrengthService.js',
  '/services/celebrationService.js',
  '/services/chapterService.js',
  '/services/testService.js',
  '/services/progressService.js',
  '/pages/PathPage.js',
  '/pages/StudyPage.js',
  '/pages/FlashcardPage.js',
  '/pages/QuizPage.js',
  '/pages/KanaPage.js',
  '/pages/PracticePage.js',
  '/pages/GamesPage.js',
  '/pages/ChapterTestPage.js',
  '/pages/ChallengesPage.js',
  '/pages/StoryPage.js',
  '/pages/AchievementsPage.js',
  '/pages/QuestsPage.js',
  '/pages/ExercisePage.js',
  '/pages/StatsPage.js',
  '/components/audio-player.js',
  '/components/matching-exercise.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(PRECACHE_URLS.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[Service Worker] Cache failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API requests - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response
          const responseToCache = response.clone();
          
          // Cache successful GET requests
          if (request.method === 'GET' && response.status === 200) {
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline response for API
            return new Response(
              JSON.stringify({ error: 'Offline - data not available' }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        })
    );
    return;
  }

  // Static assets - cache first, network fallback
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });

            return response;
          })
          .catch(() => {
            // If both cache and network fail, return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-study-stats') {
    event.waitUntil(syncStudyStats());
  }
});

async function syncStudyStats() {
  try {
    // Get stats from IndexedDB or localStorage
    // In a real app, this would sync with a server
    console.log('[Service Worker] Syncing study stats...');
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
  }
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New challenge available!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'dailyjapjap-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('DailyJapJap', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});

