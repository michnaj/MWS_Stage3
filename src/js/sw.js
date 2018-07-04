importScripts('https://storage.googleapis.com/workbox-cdn/releases/3.3.0/workbox-sw.js');

if (workbox) {
  console.log(`Workbox is loaded.`);

  workbox.setConfig({ debug: false });

  workbox.core.setCacheNameDetails({
    prefix: 'restrev',
    suffix: 'v1'
  });

  workbox.precaching.precacheAndRoute([
    '/sw.js',
    '/index.html',
    '/'
  ]);

  // Images
  workbox.routing.registerRoute(
    /\.(?:png|gif|jpg|jpeg|svg)$/,
    workbox.strategies.cacheFirst({
      cacheName: 'restrev-images',
      plugins: [
        new workbox.expiration.Plugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    }),
  );

  // CSS and JavaScript
  workbox.routing.registerRoute(
    /\.(?:js|css)$/,
    workbox.strategies.staleWhileRevalidate({
      cacheName: 'restrev-static',
    }),
  );

  // Restaurants
  workbox.routing.registerRoute(
    new RegExp('restaurant.html(.*)'),
    workbox.strategies.cacheFirst({
      cacheName: 'restrev-restaurants',
      cacheableResponse: {statuses: [0, 200]}
    })
  );

  // Google Maps
  workbox.routing.registerRoute(
    new RegExp('https://maps.(?:googleapis|gstatic).com/(.*)'),
    workbox.strategies.cacheFirst({
      cacheName: 'restrev-maps',
      plugins: [
        new workbox.cacheableResponse.Plugin({
          statuses: [0, 200]
        }),
      ],
    }),
  );

  /**
   * TO DO: Background Sync
   */

} else {
  console.log(`Workbox didn't load.`);
}
