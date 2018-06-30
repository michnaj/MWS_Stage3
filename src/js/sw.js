const staticCacheName = 'restrev-v1';
const imagesCacheName = 'restrev-img-v1';
const allCaches = [staticCacheName, imagesCacheName];
const repository = '';

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(staticCacheName).then(function (cache) {
      return cache.addAll([
        `${repository}/`,
        `${repository}/index.html`,
        `${repository}/sw.js`,
        `${repository}/css/styles.css`,
        `${repository}/js/dball.js`,
        `${repository}/js/main.js`,
        `${repository}/js/restaurant_info.js`,
        `${repository}/ico/restaurant_512.png`,
        `${repository}/ico/restaurant_192.png`
      ]);
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName.startsWith('restrev-') && !allCaches.includes(cacheName);
        }).map(function(cacheName) {
          return cache.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('fetch', function(event) {
  let requestUrl = new URL(event.request.url);

  if (requestUrl.pathname.endsWith('/restaurants')) {
    return;
  }
  if (requestUrl.pathname.startsWith('/img/')) {
    event.respondWith(servePhoto(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) {
        return response;
      } else {
        return fetch(event.request).then(function(networkResponse) {
          let responseClone = networkResponse.clone();
          caches.open(staticCacheName).then(function(cache) {
            cache.put(event.request, responseClone);
          });
          return networkResponse;
        }).catch(function() {
          return new Response('<h1>Connection error!</h1>'
            + '<p>Sorry, Information is not available. Check your Internet coonnection!</p>', {
            headers: {'Content-Type': 'text/html'}
          });
        })
      }
    })
  )
});

function servePhoto(request) {
  let storageUrl = request.url.replace(/_\d+px\.jpg$/, '');
  return caches.open(imagesCacheName).then(function(cache) {
    return cache.match(storageUrl).then(function(response) {
      if (response) {
        return response;
      } else {
        return fetch(request).then(function(networkResponse) {
          let responseClone = networkResponse.clone();
          cache.put(storageUrl, responseClone);
          return networkResponse;
        }).catch(function() {
          return new Response('<h1>Connection error!</h1>'
            + '<p>Sorry, Information is not available. Check your Internet coonnection!</p>', {
            headers: {'Content-Type': 'text/html'}
          });
        })
      }
    });
  });
}