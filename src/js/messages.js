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
hideSystemMessages = () => {
  systemMsg.setAttribute('aria-live', 'off');
  systemMsg.classList.remove('open');
  document.getElementById('system_messages-text').innerHTML = '';
}

// Showing system masseges handling
showMessage = (type) => {
  hideSystemMessages();
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
    case 'saved-queue':
      textField.innerHTML="Network request failed, this is expected if offline.<br />Review saved locally. It will be retried when connection re-established.<br />Thank you for your opinion.";
      container.classList.add('warning');
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