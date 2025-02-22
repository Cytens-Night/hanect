// public/client.js

/************************************************************
 * DOM ELEMENTS
 ************************************************************/

// Auth container + forms
const authContainer = document.querySelector('.auth-container'); // main wrapper for login/signup
const loginFormBox = document.getElementById('loginForm');
const signupFormBox = document.getElementById('signupForm');

// Toggle links (switching between login & signup)
const goToSignupLink = document.getElementById('goToSignup');
const goToLoginLink = document.getElementById('goToLogin');

// Login elements
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');

// Signup elements
const signupUsername = document.getElementById('signupUsername');
const signupPassword = document.getElementById('signupPassword');
const signupGender = document.getElementById('signupGender');
const signupBtn = document.getElementById('signupBtn');

// After authentication, user section
const userSection = document.getElementById('userSection'); // Might be hidden initially
const displayUsername = document.getElementById('displayUsername');
const logoutBtn = document.getElementById('logoutBtn');

// Heart & matching
const userHeart = document.getElementById('userHeart');
const findMatchBtn = document.getElementById('findMatchBtn');
const matchStatus = document.getElementById('matchStatus');

// Chat elements
const chatContainer = document.getElementById('chatContainer');
const matchNameElem = document.getElementById('matchName');
const typingIndicator = document.getElementById('typingIndicator');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const imageInput = document.getElementById('imageInput');
const sendImageBtn = document.getElementById('sendImageBtn');
const satisfiedBtn = document.getElementById('satisfiedBtn');

// Global variables
let socket = null;
let currentUser = null;      // Data from the server for the logged-in user
let matchedUserId = null;    // ID of the matched user
let matchedPartnerSocket = null; // If your server returns partner's socket ID, store it here

/************************************************************
 * TOGGLE BETWEEN LOGIN & SIGNUP FORMS
 ************************************************************/

if (goToSignupLink) {
  goToSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    // Switch the auth container to "signup" mode
    authContainer.setAttribute('data-mode', 'signup');
  });
}

if (goToLoginLink) {
  goToLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    // Switch back to "login" mode
    authContainer.setAttribute('data-mode', 'login');
  });
}

/************************************************************
 * LOGIN LOGIC
 ************************************************************/

if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();

    if (!username || !password) {
      alert('Please enter your username and password.');
      return;
    }

    try {
      // Send to /api/login (Passport local strategy)
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Store current user data
        currentUser = data.user;
        // Show user section
        showUserSection();
        // Initialize socket after login
        initSocket();
      } else {
        alert(data.message || 'Login failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Error during login. Check console for details.');
    }
  });
}

/************************************************************
 * SIGNUP LOGIC
 ************************************************************/

if (signupBtn) {
  signupBtn.addEventListener('click', async () => {
    const username = signupUsername.value.trim();
    const password = signupPassword.value.trim();
    const gender = signupGender.value;

    if (!username || !password || !gender) {
      alert('Please fill out all fields.');
      return;
    }

    try {
      // Send to /api/signup
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, gender })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        currentUser = data.user;
        showUserSection();
        initSocket();
      } else {
        alert(data.message || 'Signup failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Error during signup. Check console for details.');
    }
  });
}

/************************************************************
 * LOGOUT
 ************************************************************/

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/logout');
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        currentUser = null;
        showAuthSection();
        if (socket) {
          socket.disconnect();
          socket = null;
        }
      }
    } catch (err) {
      console.error(err);
    }
  });
}

/************************************************************
 * MATCHING LOGIC
 ************************************************************/

if (findMatchBtn) {
  findMatchBtn.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/find-unmatched');
      const data = await res.json();

      if (res.ok && data.matchFound) {
        matchStatus.innerText = 'Match found!';
        matchNameElem.innerText = data.partner.username;
        matchedUserId = data.partner._id; 
        // If your server sends partner's socket ID, store it in matchedPartnerSocket

        // Show chat container
        chatContainer.style.display = 'block';
      } else {
        matchStatus.innerText = 'No match found yet. Try again later.';
      }
    } catch (err) {
      console.error(err);
      alert('Error while finding match.');
    }
  });
}

/************************************************************
 * SOCKET.IO & CHAT
 ************************************************************/

function initSocket() {
  socket = io(); // Connect to Socket.IO

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  // Handle receiving messages
  socket.on('receiveMessage', (data) => {
    addMessage(`${data.fromName}: ${data.text}`);
  });

  // Handle receiving images
  socket.on('receiveImage', (data) => {
    addImage(`${data.fromName} sent an image: `, data.image);
  });

  // Typing indicator
  socket.on('partnerTyping', () => {
    typingIndicator.style.display = 'block';
    setTimeout(() => {
      typingIndicator.style.display = 'none';
    }, 2000);
  });

  // If match is closed
  socket.on('matchClosed', () => {
    alert('Both users have agreed to close the match. The session will end.');
    chatContainer.style.display = 'none';
    matchStatus.innerText = 'Not matched yet.';
    messagesDiv.innerHTML = '';
  });
}

/************************************************************
 * CHAT FEATURES
 ************************************************************/

if (sendBtn) {
  sendBtn.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (!message) return;

    // For demonstration, we might need a partner's socket ID or a "room"
    // If your server uses 'data.to', pass matchedPartnerSocket or matchedUserId
    socket.emit('sendMessage', { to: matchedPartnerSocket, text: message });

    addMessage(`You: ${message}`);
    messageInput.value = '';
  });
}

if (sendImageBtn) {
  sendImageBtn.addEventListener('click', () => {
    const file = imageInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      const base64Image = e.target.result;
      socket.emit('sendImage', { to: matchedPartnerSocket, image: base64Image });
    };
    reader.readAsDataURL(file);

    imageInput.value = '';
  });
}

if (messageInput) {
  messageInput.addEventListener('input', () => {
    // Throttle if needed
    socket.emit('typing', { to: matchedPartnerSocket });
  });
}

if (satisfiedBtn) {
  satisfiedBtn.addEventListener('click', () => {
    socket.emit('userSatisfied', { matchId: matchedPartnerSocket });
  });
}

/************************************************************
 * HELPER FUNCTIONS
 ************************************************************/

function showUserSection() {
  // Hide auth container
  if (authContainer) authContainer.style.display = 'none';
  // Show user section
  if (userSection) userSection.style.display = 'block';

  // If we have a displayUsername or userHeart, set them
  if (displayUsername && currentUser) {
    displayUsername.innerText = currentUser.username;
  }
  if (userHeart && currentUser.heart) {
    userHeart.innerText = currentUser.heart;
  }
}

function showAuthSection() {
  // Show the auth container, revert to login mode by default
  if (authContainer) {
    authContainer.style.display = 'flex';
    authContainer.setAttribute('data-mode', 'login');
  }
  // Hide userSection
  if (userSection) userSection.style.display = 'none';
}

function addMessage(msg) {
  const p = document.createElement('p');
  p.textContent = msg;
  messagesDiv.appendChild(p);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addImage(caption, base64Image) {
  const div = document.createElement('div');
  const p = document.createElement('p');
  p.innerText = caption;

  const img = document.createElement('img');
  img.src = base64Image;
  img.style.maxWidth = '200px';

  div.appendChild(p);
  div.appendChild(img);
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

/************************************************************
 * ON LOAD (Optional)
 ************************************************************/
// If you want to do something immediately when the page loads, do it here.
// e.g., showAuthSection by default
showAuthSection();
