const systemMsg = document.getElementById('system_messages')
const systemMsgTime = 10000 // System messages display time (10 seconds)

/**
 * System messages handling
 */
// system message Close button listener
document.getElementById('system_msg-close-button').addEventListener('click', (event) => {
  event.preventDefault();
  systemMsg.classList.remove('open');
  systemMsg.setAttribute('aria-live', 'off');
});

// hiding system messages
function hideSystemMessages() {
  systemMsg.setAttribute('aria-live', 'off');
  systemMsg.classList.remove('open');
  document.getElementById('system_messages-text').innerHTML = '';
}

// Showing system masseges handling
function showMessage(type) {
  let textField = document.getElementById('system_messages-text');
  let container = document.getElementById('system_messages-container');
  container.classList.remove('error', 'info', 'success', 'warning');
  switch (type) {
    case 'invalid':
      textField.innerHTML="Incorrect data in the form. Check data and try again.";
      container.classList.add('error');
      break;
    case 'saved':
      textField.innerHTML="Review saved. Thank you for your opinion.";
      container.classList.add('success');
      break;
    case 'favorite-true':
      textField.innerHTML="Your request to set the restaurant as favorite has been successfully submitted.";
      container.classList.add('success');
      break;
    case 'favorite-false':
      textField.innerHTML="Your request to set the restaurant as not favorite has been successfully submitted.";
      container.classList.add('success');
      break;
    case 'favorite-failed':
      textField.innerHTML="Connection error. Your request to set the restaurant favorite status has been not submitted.";
      container.classList.add('error');
      break;
    default:
      textField.innerHTML="Something went wrong! Try again, please.";
      container.classList.add('info');
  }
  systemMsg.setAttribute('aria-live', 'assertive');
  systemMsg.classList.add('open');
  setTimeout(hideSystemMessages, systemMsgTime);
  return;
}
let restaurants,
  neighborhoods,
  cuisines;
var map;
var markers = [];
let favoriteRestaurants = [];

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
}

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');

  // Get favorite restaurant
  DBHelper.fetchFavoriteRestaurants((error, restaurants) => {
    if (error) {
      return;
    } else {
      if (!restaurants) {
        return;
      } else {
        favoriteRestaurants = restaurants;
        return;
      }
    }
  });

  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  if (isRestaurantFavorite(restaurant.id)) {
    const favorite = document.createElement('div');
    favorite.className = 'favorite';
    favorite.innerHTML = '♥';
    li.append(favorite);
  }

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.setAttribute('alt', DBHelper.imageAltAttribute(restaurant));
  image.src = DBHelper.imageUrlForRestaurant(restaurant, 'sm');
  li.append(image);

  const name = document.createElement('h3');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.classList.add('neighborhood');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more)

  return li
}
/**
 * Checking is restaurant favorite
 */
isRestaurantFavorite = (id) => {
  let favorite = false;
  if (favoriteRestaurants.length !== 0) {
    favoriteRestaurants.forEach( restaurant => {
      if (restaurant.id == id) favorite = true;
    });
  }
  return favorite;
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}