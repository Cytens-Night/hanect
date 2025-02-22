// public/client.js

// DOM Elements
const authSection = document.getElementById('authSection');
const userSection = document.getElementById('userSection');

const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');

const signupUsername = document.getElementById('signupUsername');
const signupPassword = document.getElementById('signupPassword');
const signupGender = document.getElementById('signupGender');
const signupBtn = document.getElementById('signupBtn');

const displayUsername = document.getElementById('displayUsername');
const logoutBtn = document.getElementById('logoutBtn');

const userHeart = document.getElementById('userHeart');
const findMatchBtn = document.getElementById('findMatchBtn');
const matchStatus = document.getElementById('matchStatus');

const chatContainer = document.getElementById('chatContainer');
const matchNameElem = document.getElementById('matchName');
const typingIndicator = document.getElementById('typingIndicator');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const imageInput = document.getElementById('imageInput');
const sendImageBtn = document.getElementById('sendImageBtn');
const satisfiedBtn = document.getElementById('satisfiedBtn');

let socket = null;        // Socket.io instance
let currentUser = null;   // Store user info
let matchedUserSocket = null; // The socket ID of the matched user (set once matched)


// ------------------- AUTH FUNCTIONS ------------------- //

// LOGIN
loginBtn.addEventListener('click', async () => {
  const username = loginUsername.value.trim();
  const password = loginPassword.value.trim();

  if (!username || !password) {
    alert('Please enter username and password.');
    return;
  }

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      currentUser = data.user;
      showUserSection();
      initSocket(); // Initialize Socket.io after login
    } else {
      alert(data.message || 'Login failed.');
    }
  } catch (err) {
    console.error(err);
    alert('An error occurred during login.');
  }
});

// SIGNUP
signupBtn.addEventListener('click', async () => {
  const username = signupUsername.value.trim();
  const password = signupPassword.value.trim();
  const gender = signupGender.value;

  if (!username || !password || !gender) {
    alert('Please fill out all fields.');
    return;
  }

  try {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, gender })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      currentUser = data.user;
      showUserSection();
      initSocket(); // Initialize Socket.io after signup
    } else {
      alert(data.message || 'Signup failed.');
    }
  } catch (err) {
    console.error(err);
    alert('An error occurred during signup.');
  }
});

// LOGOUT
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

// ------------------- UI FUNCTIONS ------------------- //
function showUserSection() {
  authSection.style.display = 'none';
  userSection.style.display = 'block';

  displayUsername.innerText = currentUser.username;
  userHeart.innerText = currentUser.heart || 'No heart assigned';
}

function showAuthSection() {
  authSection.style.display = 'block';
  userSection.style.display = 'none';
  loginUsername.value = '';
  loginPassword.value = '';
  signupUsername.value = '';
  signupPassword.value = '';
  signupGender.value = '';
}

// ------------------- SOCKET.IO & MATCHING ------------------- //

function initSocket() {
  socket = io(); // Connect to Socket.IO (default path /socket.io)

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  // Chat message from other user
  socket.on('receiveMessage', (data) => {
    const { from, text } = data;
    addMessage(`Partner: ${text}`);
  });

  // Image from other user
  socket.on('receiveImage', (data) => {
    const { from, image } = data;
    addImage('Partner sent an image:', image);
  });

  // Typing indicator
  socket.on('partnerTyping', () => {
    typingIndicator.style.display = 'block';
    setTimeout(() => {
      typingIndicator.style.display = 'none';
    }, 2000);
  });

  // Satisfied / match closed
  socket.on('matchClosed', () => {
    alert('Both users have agreed to close the match. Chat ended.');
    messagesDiv.innerHTML = '';
    chatContainer.style.display = 'none';
    matchStatus.innerText = 'Not matched yet.';
  });
}


// Find match with the back-end (REST example) 
findMatchBtn.addEventListener('click', async () => {
  try {
    const res = await fetch('/api/find-unmatched');
    const data = await res.json();

    if (res.ok && data.matchFound) {
      matchStatus.innerText = 'Match found!';
      chatContainer.style.display = 'block';
      matchNameElem.innerText = data.partner.username;
      // In a real scenario, you might store the partner's _id (and possibly their socket ID if your server sets that up)
    } else {
      matchStatus.innerText = 'No match found yet. Try again later.';
    }
  } catch (err) {
    console.error(err);
    alert('Error while finding match.');
  }
});

// ------------------- CHAT LOGIC ------------------- //

// Send message
sendBtn.addEventListener('click', () => {
  const message = messageInput.value.trim();
  if (!message) return;

  // Optional: block links
  if (/(http:\/\/|https:\/\/|www\.)/i.test(message)) {
    alert("Links are not allowed!");
    return;
  }

  // Send to server
  // (For a real system, you might need the partner's socket ID or a "room" approach)
  socket.emit('sendMessage', { to: matchedUserSocket, text: message });

  addMessage(`You: ${message}`);
  messageInput.value = '';
});

// Send image
sendImageBtn.addEventListener('click', () => {
  const file = imageInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64Image = e.target.result;
    socket.emit('sendImage', { to: matchedUserSocket, image: base64Image });
  };
  reader.readAsDataURL(file);

  imageInput.value = '';
});

// Typing indicator
messageInput.addEventListener('input', () => {
  socket.emit('typing', { to: matchedUserSocket });
});

// Satisfied
satisfiedBtn.addEventListener('click', () => {
  socket.emit('userSatisfied', { matchId: matchedUserSocket });
});

// ------------------- HELPER FUNCTIONS ------------------- //
function addMessage(msg) {
  const p = document.createElement('p');
  p.innerText = msg;
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
