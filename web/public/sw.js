/**
 * Halchal - Service Worker
 * Architecture: Extreme Resilience (CLAUDE.md), PWA Offline First
 * Caches app shell, static assets, and last known zone status.
 */

const CACHE_NAME = 'halchal-shell-v2';
const API_CACHE_NAME = 'halchal-api-v2';

const STATIC_PRECACHE = [
  '/manifest.webmanifest',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install Event: Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE).catch((err) => {
        console.warn('Pre-cache non-fatal warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event: Cleanup obsolete caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== API_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Optimized multi-tier caching with zero crawl interference
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Strictly ignore non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 0. Explicit exclusions: Never intercept OG images, dynamic sitemaps, robots.txt, or crawlers
  if (
    url.pathname.startsWith('/api/og') ||
    url.pathname.startsWith('/sitemap') ||
    url.pathname === '/robots.txt' ||
    url.pathname.endsWith('.xml')
  ) {
    return;
  }

  // 1. Zone API Requests (/api/zone/*): Network First with Cache Fallback
  if (url.pathname.startsWith('/api/zone/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) {
            // Append header indicating cached stale data
            const headers = new Headers(cached.headers);
            headers.set('x-halchal-offline', 'true');
            return new Response(cached.body, {
              status: cached.status,
              statusText: cached.statusText,
              headers,
            });
          }
          return new Response(
            JSON.stringify({
              error: 'অফলাইন মোড: ক্যাশে কোনো ডেটা সংরক্ষিত নেই।',
              offline: true,
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }
          );
        })
    );
    return;
  }

  // 2. Static Assets (_next/static, icons): Cache First
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 3. Navigation Requests (HTML pages): Network First, Offline Fallback Only
  // Avoids caching stale HTML for search crawlers or serving outdated utility status as fresh
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(request);
        if (cached) {
          const headers = new Headers(cached.headers);
          headers.set('x-halchal-offline', 'true');
          return new Response(cached.body, {
            status: cached.status,
            statusText: cached.statusText,
            headers,
          });
        }
        return new Response(
          '<!DOCTYPE html><html lang="bn"><head><meta charset="utf-8"/><title>হালচাল - অফলাইন</title></head><body style="background:#070A0F;color:#F8FAFC;font-family:sans-serif;text-align:center;padding:50px 20px;"><h2>ইন্টারনেট সংযোগ নেই</h2><p>নেটওয়ার্ক সংযোগ পুনরায় চালু হলে হালচাল স্বয়ংক্রিয়ভাবে আপডেট হবে।</p></body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      })
    );
    return;
  }

  // Default Pass-through
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

// Background Sync Event: Flush queued offline reports
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reports') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'HALCHAL_FLUSH_QUEUE' });
        });
      })
    );
  }
});

// -----------------------------------------------------------------------------
// Push Notifications & Interactive Restoration Confirmation
// Architecture: Bengali-First, 30-min One-Tap Action Tokens, CLAUDE.md
// -----------------------------------------------------------------------------

// Push Event: Display incoming Web Push notification
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: 'হালচাল (Halchal)',
      body: event.data ? event.data.text() : 'আপনার এলাকায় নতুন আপডেট এসেছে',
    };
  }

  const title = data.title || 'হালচাল';
  const notifData = data.data || {};
  const h3Index = notifData.h3_index || 'default';
  const category = notifData.category || 'alert';

  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-192.png',
    tag: data.tag || `halchal-${h3Index}-${category}`,
    renotify: true,
    data: notifData,
    actions: data.actions || [],
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Event:
// Handles action buttons ("হ্যাঁ, ফিরেছে" / "না, এখনো নেই") via signed action token
// without opening the app.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notifData = event.notification.data || {};

  // 1. One-Tap Action Button Click: "হ্যাঁ, ফিরেছে" (vote_ok) or "না, এখনো নেই" (vote_out)
  if (action === 'vote_ok' || action === 'vote_out') {
    const vote = action === 'vote_ok' ? 'ok' : 'out';
    const actionToken = notifData.action_token;

    if (actionToken) {
      const restoreUrl = notifData.restore_url || '/api/restore-vote';

      event.waitUntil(
        fetch(restoreUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: actionToken,
            vote: vote,
          }),
        })
          .then(async (res) => {
            const result = await res.json().catch(() => ({}));
            const feedbackBody =
              result.message ||
              (vote === 'ok'
                ? 'ধন্যবাদ! বিদ্যুৎ ফেরার তথ্য গ্রহণ করা হয়েছে।'
                : 'ধন্যবাদ! সংযোগ বিচ্ছিন্ন থাকার তথ্য গ্রহণ করা হয়েছে।');

            return self.registration.showNotification('হালচাল - হালনাগাদ', {
              body: feedbackBody,
              icon: '/icons/icon-192.png',
              badge: '/icons/icon-192.png',
              tag: 'halchal-vote-ack',
              vibrate: [100, 50, 100],
            });
          })
          .catch((err) => {
            console.warn('Failed to submit restoration vote from notification action:', err);
          })
      );
      return;
    }
  }

  // 2. Notification Body Click: Open/Focus the relevant zone page in browser
  const targetUrl = notifData.h3_index ? `/z/${notifData.h3_index}` : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client && client.url.includes(self.location.origin)) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Push Subscription Change Event: Re-sync subscription if renewed by browser
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription?.options || { userVisibleOnly: true })
      .then((newSubscription) => {
        return fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: newSubscription.toJSON(),
          }),
        });
      })
      .catch((err) => {
        console.warn('pushsubscriptionchange renewal error:', err);
      })
  );
});
