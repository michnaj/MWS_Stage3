let restaurant,restaurantId,reviews;var map;const nameField=document.getElementById("name-input"),ratingField=document.getElementById("rating-select"),commentField=document.getElementById("comment-textarea"),nameMsg=document.getElementById("name-message"),ratingMsg=document.getElementById("rating-message"),commentMsg=document.getElementById("comment-message"),reviewForm=document.getElementById("review_form"),reviewSaveButton=document.getElementById("review_form-save"),reviewClearButton=document.getElementById("review_form-clear"),favoriteButton=document.getElementById("restaurant-favorite"),favoriteText=document.getElementById("favorite-text"),systemMsg=document.getElementById("system_messages"),systemMsgTime=1e4;window.initMap=(()=>{fetchRestaurantFromURL((e,t)=>{e?console.error(e):(self.map=new google.maps.Map(document.getElementById("map"),{zoom:17,center:t.latlng,scrollwheel:!1}),fillBreadcrumb(),DBHelper.mapMarkerForRestaurant(self.restaurant,self.map))})}),fetchRestaurantFromURL=(e=>{if(self.restaurant)return void e(null,self.restaurant);const t=getParameterByName("id");t?DBHelper.fetchRestaurantById(t,(t,a)=>{self.restaurant=a,a?(fillRestaurantHTML(),e(null,a)):console.error(t)}):(error="No restaurant id in URL",e(error,null))}),fillRestaurantHTML=((e=self.restaurant)=>{DBHelper.fetchFavoriteRestaurants((t,a)=>{if(!t&&a){let t=!1;return a.forEach(a=>{a.id==e.id&&(t=!0)}),void setFavoriteButton(t)}}),document.getElementById("restaurant-name").innerHTML=e.name,document.getElementById("restaurant-address").innerHTML=e.address;const t=document.getElementById("restaurant-img");t.className="restaurant-img";let a=document.createElement("source"),i=document.createElement("source"),n=document.createElement("img");a.setAttribute("media","(max-width: 380px)"),a.setAttribute("srcset",DBHelper.imageUrlForRestaurant(e,"sm")),i.setAttribute("media","(max-width: 575px)"),i.setAttribute("srcset",DBHelper.imageUrlForRestaurant(e,"md")),n.setAttribute("alt",DBHelper.imageAltAttribute(e)),n.src=DBHelper.imageUrlForRestaurant(e,""),t.appendChild(a),t.appendChild(i),t.appendChild(n),document.getElementById("restaurant-cuisine").innerHTML=e.cuisine_type,e.operating_hours&&fillRestaurantHoursHTML(),fillReviewsHTML()}),fillRestaurantHoursHTML=((e=self.restaurant.operating_hours)=>{const t=document.getElementById("restaurant-hours");for(let a in e){const i=document.createElement("tr");i.tabIndex=0;const n=document.createElement("td");n.innerHTML=a,i.appendChild(n);const r=document.createElement("td");r.innerHTML=e[a],i.appendChild(r),t.appendChild(i)}}),fillReviewsHTML=((e=self.restaurant.id)=>{DBHelper.fetchReviews(e,(e,t)=>{if(e)console.log(e);else{const e=document.getElementById("reviews-container");if(!t){const t=document.createElement("p");return t.innerHTML="No reviews yet!",void e.appendChild(t)}{const a=document.getElementById("reviews-list");a.innerHTML="",t.forEach(e=>{a.appendChild(createReviewHTML(e))}),e.appendChild(a)}}})}),createReviewHTML=(e=>{const t=document.createElement("li"),a=document.createElement("p");a.classList.add("name"),a.innerHTML=e.name,t.appendChild(a);const i=document.createElement("p");i.classList.add("date");let n=formatDate(new Date(e.createdAt));i.innerHTML=n,t.appendChild(i);const r=document.createElement("p");r.classList.add("rating"),r.innerHTML=`Rating: ${e.rating}`,t.appendChild(r);const s=document.createElement("p");return s.classList.add("comment"),s.innerHTML=e.comments,t.appendChild(s),t}),formatDate=(e=>{let t=e.getDate(),a=e.getMonth(),i=e.getFullYear();return`${["January","February","March","April","May","June","July","August","September","October","November","December"][a]} ${t}, ${i}`}),fillBreadcrumb=((e=self.restaurant)=>{const t=document.getElementById("breadcrumb"),a=document.createElement("li"),i=document.createElement("a");i.innerHTML=e.name,i.href=DBHelper.urlForRestaurant(e),i.setAttribute("aria-current","page"),a.append(i),t.appendChild(a)}),getParameterByName=((e,t)=>{t||(t=window.location.href),e=e.replace(/[\[\]]/g,"\\$&");const a=new RegExp(`[?&]${e}(=([^&#]*)|&|#|$)`).exec(t);return a?a[2]?decodeURIComponent(a[2].replace(/\+/g," ")):"":null}),favoriteButton.addEventListener("click",e=>{let t;e.preventDefault(),t="true"===favoriteButton.getAttribute("data-favorite"),DBHelper.putFavoriteRestaurant(getParameterByName("id"),!t).then(()=>{favoriteButton.setAttribute("data-favorite",!t),showMessage(`favorite-${!t}`)}).catch(()=>{showMessage("favorite-failed")})}),setFavoriteButton=(e=>{e?(favoriteButton.setAttribute("data-favorite",!0),favoriteText.innerHTML="Favorite - Set as a not favorite"):(favoriteButton.setAttribute("data-favorite",!1),favoriteText.innerHTML="Not favorite - Set as a favorite")}),document.addEventListener("DOMContentLoaded",e=>{document.getElementById("restaurant-id-input").value=getParameterByName("id")}),document.getElementById("review_form-add").addEventListener("click",e=>{e.preventDefault(),reviewForm.classList.toggle("open")}),reviewSaveButton.addEventListener("click",e=>{e.preventDefault();let t={restaurant_id:parseInt(document.getElementById("restaurant-id-input").value),name:document.getElementById("name-input").value,rating:parseInt(document.getElementById("rating-select").value),comments:document.getElementById("comment-textarea").value};validateReviewForm(t)?saveReview(t):showMessage("invalid")}),saveReview=(e=>{DBHelper.postReview(e).then(()=>fillReviewsHTML()).catch(()=>console.log("Request failed!")),reviewForm.classList.remove("open")}),reviewClearButton.addEventListener("click",e=>{e.preventDefault(),nameField.value="",nameField.setAttribute("aria-invalid",""),nameMsg.style.visibility="hidden",nameMsg.setAttribute("aria-live","off"),ratingField.value="",ratingField.setAttribute("aria-invalid",""),ratingMsg.style.visibility="hidden",ratingMsg.setAttribute("aria-live","off"),commentField.value="",commentField.setAttribute("aria-invalid",""),commentMsg.style.visibility="hidden",commentMsg.setAttribute("aria-live","off"),hideSystemMessages()}),nameField.addEventListener("focusout",e=>{setFieldsAttribute(!checkValidText(nameField.value),"name")}),ratingField.addEventListener("focusout",e=>{setFieldsAttribute(!checkValidRating(ratingField.value),"rating")}),commentField.addEventListener("focusout",e=>{setFieldsAttribute(!checkValidText(commentField.value),"comment")}),checkValidText=(e=>{return!(!e||0==e.trim().length||e.match(/(<([^>]+)>)/gi)||e.match("&lt;")||e.match("&gt;")||e.match("&amp;")||e.match("&quot;"))}),checkValidRating=(e=>!!e),setFieldsAttribute=((e,t)=>{switch(t){case"name":nameField.setAttribute("aria-invalid",e),e?(nameMsg.setAttribute("aria-live","assertive"),nameMsg.style.visibility="visible"):(nameMsg.setAttribute("aria-live","off"),nameMsg.style.visibility="hidden");break;case"rating":ratingField.setAttribute("aria-invalid",e),e?(ratingMsg.setAttribute("aria-live","assertive"),ratingMsg.style.visibility="visible"):(ratingMsg.setAttribute("aria-live","off"),ratingMsg.style.visibility="hidden");break;case"comment":commentField.setAttribute("aria-invalid",e),e?(commentMsg.setAttribute("aria-live","assertive"),commentMsg.style.visibility="visible"):(commentMsg.setAttribute("aria-live","off"),commentMsg.style.visibility="hidden");break;default:return}}),validateReviewForm=(e=>{let t=!0;return checkValidRating(e.rating)?setFieldsAttribute(!1,"rating"):(setFieldsAttribute(!0,"rating"),t=!1),checkValidText(e.name)?setFieldsAttribute(!1,"name"):(setFieldsAttribute(!0,"name"),t=!1),checkValidText(e.comments)?setFieldsAttribute(!1,"comment"):(setFieldsAttribute(!0,"comment"),t=!1),t}),document.getElementById("system_msg-close-button").addEventListener("click",e=>{e.preventDefault(),systemMsg.classList.remove("open"),systemMsg.setAttribute("aria-live","off")}),hideSystemMessages=(()=>{systemMsg.setAttribute("aria-live","off"),systemMsg.classList.remove("open"),document.getElementById("system_messages-text").innerHTML=""}),showMessage=(e=>{hideSystemMessages();let t=document.getElementById("system_messages-text"),a=document.getElementById("system_messages-container");switch(a.classList.remove("error","info","success","warning"),e){case"invalid":t.innerHTML="Incorrect data in the form. Check data and try again.",a.classList.add("error");break;case"saved":t.innerHTML="Review saved. Thank you for your opinion.",a.classList.add("success");break;case"saved-queue":t.innerHTML="Network request failed, this is expected if offline.<br />Review saved locally. It will be retried when connection re-established.<br />Thank you for your opinion.",a.classList.add("warning");break;case"favorite-true":t.innerHTML="Your request to set the restaurant as favorite has been successfully submitted.",a.classList.add("success");break;case"favorite-false":t.innerHTML="Your request to set the restaurant as not favorite has been successfully submitted.",a.classList.add("success");break;case"favorite-failed":t.innerHTML="Connection error. Your request to set the restaurant favorite status has been not submitted.",a.classList.add("error");break;default:t.innerHTML="Something went wrong! Try again, please.",a.classList.add("info")}systemMsg.setAttribute("aria-live","assertive"),systemMsg.classList.add("open"),setTimeout(hideSystemMessages,1e4)});