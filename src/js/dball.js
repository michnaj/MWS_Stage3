'use strict';

(function() {
  function toArray(arr) {
    return Array.prototype.slice.call(arr);
  }

  function promisifyRequest(request) {
    return new Promise(function(resolve, reject) {
      request.onsuccess = function() {
        resolve(request.result);
      };

      request.onerror = function() {
        reject(request.error);
      };
    });
  }

  function promisifyRequestCall(obj, method, args) {
    var request;
    var p = new Promise(function(resolve, reject) {
      request = obj[method].apply(obj, args);
      promisifyRequest(request).then(resolve, reject);
    });

    p.request = request;
    return p;
  }

  function promisifyCursorRequestCall(obj, method, args) {
    var p = promisifyRequestCall(obj, method, args);
    return p.then(function(value) {
      if (!value) return;
      return new Cursor(value, p.request);
    });
  }

  function proxyProperties(ProxyClass, targetProp, properties) {
    properties.forEach(function(prop) {
      Object.defineProperty(ProxyClass.prototype, prop, {
        get: function() {
          return this[targetProp][prop];
        },
        set: function(val) {
          this[targetProp][prop] = val;
        }
      });
    });
  }

  function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return this[targetProp][prop].apply(this[targetProp], arguments);
      };
    });
  }

  function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyCursorRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function Index(index) {
    this._index = index;
  }

  proxyProperties(Index, '_index', [
    'name',
    'keyPath',
    'multiEntry',
    'unique'
  ]);

  proxyRequestMethods(Index, '_index', IDBIndex, [
    'get',
    'getKey',
    'getAll',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(Index, '_index', IDBIndex, [
    'openCursor',
    'openKeyCursor'
  ]);

  function Cursor(cursor, request) {
    this._cursor = cursor;
    this._request = request;
  }

  proxyProperties(Cursor, '_cursor', [
    'direction',
    'key',
    'primaryKey',
    'value'
  ]);

  proxyRequestMethods(Cursor, '_cursor', IDBCursor, [
    'update',
    'delete'
  ]);

  // proxy 'next' methods
  ['advance', 'continue', 'continuePrimaryKey'].forEach(function(methodName) {
    if (!(methodName in IDBCursor.prototype)) return;
    Cursor.prototype[methodName] = function() {
      var cursor = this;
      var args = arguments;
      return Promise.resolve().then(function() {
        cursor._cursor[methodName].apply(cursor._cursor, args);
        return promisifyRequest(cursor._request).then(function(value) {
          if (!value) return;
          return new Cursor(value, cursor._request);
        });
      });
    };
  });

  function ObjectStore(store) {
    this._store = store;
  }

  ObjectStore.prototype.createIndex = function() {
    return new Index(this._store.createIndex.apply(this._store, arguments));
  };

  ObjectStore.prototype.index = function() {
    return new Index(this._store.index.apply(this._store, arguments));
  };

  proxyProperties(ObjectStore, '_store', [
    'name',
    'keyPath',
    'indexNames',
    'autoIncrement'
  ]);

  proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'put',
    'add',
    'delete',
    'clear',
    'get',
    'getAll',
    'getKey',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'openCursor',
    'openKeyCursor'
  ]);

  proxyMethods(ObjectStore, '_store', IDBObjectStore, [
    'deleteIndex'
  ]);

  function Transaction(idbTransaction) {
    this._tx = idbTransaction;
    this.complete = new Promise(function(resolve, reject) {
      idbTransaction.oncomplete = function() {
        resolve();
      };
      idbTransaction.onerror = function() {
        reject(idbTransaction.error);
      };
      idbTransaction.onabort = function() {
        reject(idbTransaction.error);
      };
    });
  }

  Transaction.prototype.objectStore = function() {
    return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
  };

  proxyProperties(Transaction, '_tx', [
    'objectStoreNames',
    'mode'
  ]);

  proxyMethods(Transaction, '_tx', IDBTransaction, [
    'abort'
  ]);

  function UpgradeDB(db, oldVersion, transaction) {
    this._db = db;
    this.oldVersion = oldVersion;
    this.transaction = new Transaction(transaction);
  }

  UpgradeDB.prototype.createObjectStore = function() {
    return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
  };

  proxyProperties(UpgradeDB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(UpgradeDB, '_db', IDBDatabase, [
    'deleteObjectStore',
    'close'
  ]);

  function DB(db) {
    this._db = db;
  }

  DB.prototype.transaction = function() {
    return new Transaction(this._db.transaction.apply(this._db, arguments));
  };

  proxyProperties(DB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(DB, '_db', IDBDatabase, [
    'close'
  ]);

  // Add cursor iterators
  // TODO: remove this once browsers do the right thing with promises
  ['openCursor', 'openKeyCursor'].forEach(function(funcName) {
    [ObjectStore, Index].forEach(function(Constructor) {
      Constructor.prototype[funcName.replace('open', 'iterate')] = function() {
        var args = toArray(arguments);
        var callback = args[args.length - 1];
        var nativeObject = this._store || this._index;
        var request = nativeObject[funcName].apply(nativeObject, args.slice(0, -1));
        request.onsuccess = function() {
          callback(request.result);
        };
      };
    });
  });

  // polyfill getAll
  [Index, ObjectStore].forEach(function(Constructor) {
    if (Constructor.prototype.getAll) return;
    Constructor.prototype.getAll = function(query, count) {
      var instance = this;
      var items = [];

      return new Promise(function(resolve) {
        instance.iterateCursor(query, function(cursor) {
          if (!cursor) {
            resolve(items);
            return;
          }
          items.push(cursor.value);

          if (count !== undefined && items.length == count) {
            resolve(items);
            return;
          }
          cursor.continue();
        });
      });
    };
  });

  var exp = {
    open: function(name, version, upgradeCallback) {
      var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
      var request = p.request;

      request.onupgradeneeded = function(event) {
        if (upgradeCallback) {
          upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
        }
      };

      return p.then(function(db) {
        return new DB(db);
      });
    },
    delete: function(name) {
      return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = exp;
    module.exports.default = module.exports;
  }
  else {
    self.idb = exp;
  }
}());

/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Restaurants database URL.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /* Reviews database URL */
  static get REVIEWS_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/reviews/?restaurant_id=`;
  }

  /* POST reviews URL */
  static get POSTREVIEWS_URL() {
    const port = 1337
    return `http://localhost:${port}/reviews/`;
  }

  /* Favorite restaurant URL */
  static get FAV_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants/?is_favorite=true`;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    return DBHelper.getLocalRestaurants(callback).then( response => {
      if (response) {
        DBHelper.getRestaurants(callback);
        return callback(null, response);
      }
      return DBHelper.getRestaurants(callback);
    });
  }

  /**
   * Fetch all restaurant reviews
   */
  static fetchReviews(id, callback) {
    return DBHelper.getLocalReviews(id, callback).then( response => {
      if (response) {
        DBHelper.getReviews(id, callback);
        callback(null, response);
      }
      return DBHelper.getReviews(id, callback);
    });
  }

  // Get restaurants data from IndexedDB
  static getLocalRestaurants(callback) {
    return dbPromise.then(function(db) {
      if (!db) return;
      let store = db.transaction('restaurants').objectStore('restaurants');
      return store.getAll().then( restaurants => callback(null, restaurants) )
        .catch(err => callback(`Request failed. Returned ${err}`, null) );
    });
  }

  // Get reviews data from IndexedDB
  static getLocalReviews(id, callback) {
    return dbPromise.then(function(db) {
      if (!db) return;
      let store = db.transaction('reviews').objectStore('reviews');
      let index = store.index('restaurant_id');
      return index.getAll(parseInt(id)).then( reviews => callback(null, reviews) )
        .catch(err => callback(`Request failed. Returned ${err}`, null) );
    });
  }

  // Get restaurant data from network
  static getRestaurants(callback) {
    return fetch(DBHelper.DATABASE_URL)
    .then(response => response.json())
    .then(restaurants => {
      DBHelper.saveRestaurants(restaurants);
      callback(null, restaurants)
    }).catch(err => callback(`Request failed. Returned ${err}`, null));
  }

  // Get reviews from network
  static getReviews(id, callback) {
    return fetch(`${DBHelper.REVIEWS_URL}${id}`)
    .then(response => response.json())
    .then(reviews => {
      DBHelper.saveReviews(reviews);
      callback(null, reviews)
    }).catch(err => callback(`Request failed. Returned ${err}`, null));
  }

  // Saves restaurants data in IndexedDB
  static saveRestaurants(restaurants) {
    return dbPromise.then(function(db) {
      if (!db) return;
      let tx = db.transaction('restaurants', 'readwrite');
      let store = tx.objectStore('restaurants');
      restaurants.forEach(restaurant => store.put(restaurant));
    });
  }

  // Saves reviews data in IndexedDB
  static saveReviews(reviews) {
    return dbPromise.then(function(db) {
      if (!db) return;
      let tx = db.transaction('reviews', 'readwrite');
      let store = tx.objectStore('reviews');
      reviews.forEach(review => store.put(review));
    });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    return dbPromise.then(function(db) {
      if (!db) return;
      let store = db.transaction('restaurants').objectStore('restaurants');
      return store.get(parseInt(id)).then( restaurant => callback(null, restaurant) )
        .catch( () => callback(`Restaurant doesn't exist.`, null) );
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   * Added size parameter - defines witch size of image should return
   */
  static imageUrlForRestaurant(restaurant, size) {
    if (!restaurant.photograph) return 'img/noimage.jpg';
    let suffix = '';
    let image = `${restaurant.photograph}.jpg`;
    if (size === 'sm') suffix = '_300px';
    else if (size === 'md') suffix = '_500px';
    let newImage = image.replace('.', suffix + '.');
    return ('img/' + newImage);
  }

  /**
   * Restaurant image alt attribute.
   */
  static imageAltAttribute(restaurant) {
    return (`Image of ${restaurant.name} Restaurant`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

  /**
   * Favourite restaurants
   */
  // Get reviews from network
  static fetchFavoriteRestaurants(callback) {
    return fetch(DBHelper.FAV_URL)
      .then(response => response.json())
      .then(restaurants => {
        callback(null, restaurants)
      }).catch(err => callback(`Request failed. Returned ${err}`, null));
  }

  // fetching favorite restaurant PUT request
  static putFavoriteRestaurant(restaurantId, isFavorite) {
    let url = `http://localhost:1337/restaurants/${restaurantId}/?is_favorite=${isFavorite}`;

    return fetch(url, { method: 'PUT'});
  }

  /**
   * Reviews
   */
  static postReview(review) {
    const headers = new Headers({'Content-Type': 'application/json'});
    const data = JSON.stringify(review);
    return fetch(DBHelper.POSTREVIEWS_URL, {
      method: 'POST',
      headers: headers,
      body: data
    })
    .then( () => {
      showMessage('saved');
      return Promise.resolve()
    })
    .catch( () => {
      showMessage('saved-queue');
      return Promise.resolve()
    });
  }
}

/**
 * IndexedDB
 */

function openDB() {
  if ('serviceWorker' in navigator) {
    return idb.open('Restrev-db', 1, function(upgradeDb) {
      if (!upgradeDb.objectStoreNames.contains('restaurants')) const restaurantsStore = upgradeDb.createObjectStore('restaurants', { keyPath: 'id' });
      if (!upgradeDb.objectStoreNames.contains('reviews')) {
        const reviewsStore = upgradeDb.createObjectStore('reviews', { keyPath: 'id', autoIncrement: true});
        reviewsStore.createIndex('restaurant_id', 'restaurant_id', {unique: false});
      }
    });
  } else {
    return Promise.resolve();
  }
}

const dbPromise = openDB();