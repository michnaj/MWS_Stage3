let restaurant;
let restaurantId;
let reviews;
var map;

// Review form elements
const nameField = document.getElementById('name-input');
const ratingField = document.getElementById('rating-select');
const commentField = document.getElementById('comment-textarea');
const nameMsg = document.getElementById('name-message');
const ratingMsg = document.getElementById('rating-message');
const commentMsg = document.getElementById('comment-message');
const reviewForm = document.getElementById('review_form');
const reviewSaveButton = document.getElementById('review_form-save');
const reviewClearButton = document.getElementById('review_form-clear');
const favoriteButton = document.getElementById('restaurant-favorite');

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 17,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  let smSource = document.createElement('source');
  let mdSource = document.createElement('source');
  let imgTag = document.createElement('img');
  smSource.setAttribute('media', '(max-width: 380px)');
  smSource.setAttribute('srcset', DBHelper.imageUrlForRestaurant(restaurant, 'sm'));
  mdSource.setAttribute('media', '(max-width: 575px)');
  mdSource.setAttribute('srcset', DBHelper.imageUrlForRestaurant(restaurant, 'md'));
  imgTag.setAttribute('alt', DBHelper.imageAltAttribute(restaurant));
  imgTag.src = DBHelper.imageUrlForRestaurant(restaurant, '');
  image.appendChild(smSource);
  image.appendChild(mdSource);
  image.appendChild(imgTag);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');
    row.tabIndex = 0;

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (restaurantId = self.restaurant.id) => {
  DBHelper.fetchReviews(restaurantId, (error, reviews) => {
    if (error) {
      console.log(error);
    } else {
      const container = document.getElementById('reviews-container');
      if (!reviews) {
        const noReviews = document.createElement('p');
        noReviews.innerHTML = 'No reviews yet!';
        container.appendChild(noReviews);
        return;
      } else {
        const ul = document.getElementById('reviews-list');
        ul.innerHTML = '';
        reviews.forEach(review => {
          ul.appendChild(createReviewHTML(review));
        });
        container.appendChild(ul);
      }
    }
  });
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.classList.add('name');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.classList.add('date');
  let reviewDate = formatDate(new Date(review.createdAt));
  date.innerHTML = reviewDate;
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.classList.add('rating');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.classList.add('comment');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Format reviews Date
 */
formatDate = (date) => {
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  let day = date.getDate();
  let month = date.getMonth();
  let year = date.getFullYear();
  return `${monthNames[month]} ${day}, ${year}`;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  const link = document.createElement('a');
  link.innerHTML = restaurant.name;
  link.href = DBHelper.urlForRestaurant(restaurant);
  link.setAttribute('aria-current', 'page');
  li.append(link);
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Favorite handling
 */

favoriteButton.addEventListener('click', (event) => {
  event.preventDefault();
  favoriteButton.classList.toggle('favorite');
});

/**
 * Add new Review form handling
 */

// Set restaurant-id in add new review form
document.addEventListener('DOMContentLoaded', (event) => {
  document.getElementById('restaurant-id-input').value = getParameterByName('id');
});

// Add new review button
document.getElementById('review_form-add').addEventListener('click', (event) => {
  event.preventDefault();
  reviewForm.classList.toggle('open');
});

// Saving review
reviewSaveButton.addEventListener('click', (event) => {
  event.preventDefault();
  let review = {
    restaurantId: document.getElementById('restaurant-id-input').value,
    name: document.getElementById('name-input').value,
    rating: document.getElementById('rating-select').value,
    comment: document.getElementById('comment-textarea').value
  }
  let valid = validateReviewForm(review);
  if (valid) saveReview(review);
  else showMessage('invalid');
});

function saveReview(review) {
  console.log(`Review saved: ${review}`);
  showMessage('saved');
  reviewForm.classList.remove('open');
  return;
}

// Clear review form
reviewClearButton.addEventListener('click', (event) => {
  event.preventDefault();
  // name fields
  nameField.value = '';
  nameField.setAttribute('aria-invalid', '');
  nameMsg.style.visibility = 'hidden';
  nameMsg.setAttribute('aria-live', 'off');
  //rating fields
  ratingField.value = '';
  ratingField.setAttribute('aria-invalid', '');
  ratingMsg.style.visibility = 'hidden';
  ratingMsg.setAttribute('aria-live', 'off');
  // comment fields
  commentField.value = '';
  commentField.setAttribute('aria-invalid', '');
  commentMsg.style.visibility = 'hidden';
  commentMsg.setAttribute('aria-live', 'off');
  // system messages
  hideSystemMessages();
});

// Fields listeners for validation
nameField.addEventListener('focusout', (event) => {
  setFieldsAttribute(!checkValidText(nameField.value), 'name');
});

ratingField.addEventListener('focusout', (event) => {
  setFieldsAttribute(!checkValidRating(ratingField.value), 'rating');
});

commentField.addEventListener('focusout', (event) => {
  setFieldsAttribute(!checkValidText(commentField.value), 'comment');
});

// Fields validation
// Text fields
function checkValidText(value) {
  const reg = /(<([^>]+)>)/gi;
  if ((!value) || (value.trim().length == 0) || (value.match(reg))
    || (value.match('&lt;')) || (value.match('&gt;'))
    || (value.match('&amp;')) || (value.match('&quot;'))) return false;
  else return true;
}
// Rating field
function checkValidRating(value) {
  if (!value) return false;
  else return true;
}

// Set fields attribute (valid, invalid) in add new form
function setFieldsAttribute(invalid, field) {
  switch (field) {
    case 'name':
      nameField.setAttribute('aria-invalid', invalid);
      if (invalid) {
        nameMsg.setAttribute('aria-live', 'assertive');
        nameMsg.style.visibility = 'visible';
      } else {
        nameMsg.setAttribute('aria-live', 'off');
        nameMsg.style.visibility = 'hidden';
      }
      break;
    case 'rating':
      ratingField.setAttribute('aria-invalid', invalid);
      if (invalid) {
        ratingMsg.setAttribute('aria-live', 'assertive');
        ratingMsg.style.visibility = 'visible';
      } else {
        ratingMsg.setAttribute('aria-live', 'off');
        ratingMsg.style.visibility = 'hidden';
      }
      break;
    case 'comment':
      commentField.setAttribute('aria-invalid', invalid);
      if (invalid) {
        commentMsg.setAttribute('aria-live', 'assertive');
        commentMsg.style.visibility = 'visible';
      } else {
        commentMsg.setAttribute('aria-live', 'off');
        commentMsg.style.visibility = 'hidden';
      }
      break;
    default:
      return;
  }
  return;
}

function validateReviewForm(review) {
  let validation = true;
  // reting validation
  if (!checkValidRating(review.rating)) {
    setFieldsAttribute(true, 'rating');
    validation = false;
  } else {
    setFieldsAttribute(false, 'rating');
  }

  // name validation
  if (!checkValidText(review.name)) {
    setFieldsAttribute(true, 'name');
    validation = false;
  } else {
    setFieldsAttribute(false, 'name');
  }

  // comment validation
  if (!checkValidText(review.comment)) {
    setFieldsAttribute(true, 'comment');
    validation = false;
  } else {
    setFieldsAttribute(false, 'comment');
  }

  return validation;
}