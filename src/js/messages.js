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
  console.log('Showing message');
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
    default:
      textField.innerHTML="Something went wrong! Try again, please.";
      container.classList.add('info');
  }
  systemMsg.setAttribute('aria-live', 'assertive');
  systemMsg.classList.add('open');
  setTimeout(hideSystemMessages, systemMsgTime);
  return;
}