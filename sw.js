/**
 * FocusFlow Service Worker - PWA Offline Support
 * Caches all local assets for offline use
 */
const CACHE_NAME = 'focusflow-v84';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/main.js',
  '/js/webgazer.js',
  '/js/perception/perceptionModule.js',
  '/js/perception/faceDetection.js',
  '/js/perception/headPose.js',
  '/js/perception/gazeRegion.js',
  '/js/perception/mouseTracker.js',
  '/js/perception/scrollAnalyzer.js',
  '/js/perception/attentionHeatmap.js',
  '/js/cognition/stateMachine.js',
  '/js/decision/decisionModule.js',
  '/js/decision/adaptiveThreshold.js',
  '/js/decision/interventionExecutor.js',
  '/js/decision/interventionStrategy.js',
  '/js/ui/paragraphSplitter.js',
  '/js/i18n/i18n.js',
  '/js/utils/textEncoding.js',
  '/js/utils/cameraAccess.js',
  '/js/ui/readingView.js',
  '/js/ui/visualEffects.js',
  '/js/ui/focusMode.js',
  '/js/ui/debugPanel.js',
  '/js/nlp/keywordExtractor.js',
  '/js/nlp/llmSummaryManager.js',
  '/js/nlp/llmTranslateManager.js',
  '/js/nlp/paragraphSummarizer.js',
  '/js/analytics/attentionAnalytics.js',
  '/js/analytics/sessionReport.js',
  '/js/calibration/calibrationManager.js',
  '/manifest.json'
];

// Install: cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets...');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll error (non-fatal):', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first with cache fallback
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and cdn requests
  const url = event.request.url;

  // Always fetch JS/CSS/HTML from network to avoid stale comprehension-assist code
  if (url.includes('/js/') || url.includes('/css/') || url.endsWith('.html') || url.endsWith('/')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request))
    );
    return;
  }

  if (url.startsWith('chrome-extension://') || url.includes('cdn.jsdelivr.net')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/index.html');
        });
      })
  );
});
