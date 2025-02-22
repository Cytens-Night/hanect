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

let socket = null;
let currentUser = null; // Data from the server for the logged-in user
let matchedPartnerSocket = null; // We’d store partner’s socket ID if the server returns it

// ------------------- AUTH FLOW ------------------- //
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
      initSocket();
    } else {
      alert(data.message || 'Login failed.');
    }
  } catch (err) {
    console.error(err);
    alert('Error during login.');
  }
});

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
      initSocket();
    } else {
      alert(data.message || 'Signup failed.');
    }
  } catch (err) {
    console.error(err);
    alert('Error during signup.');
  }
});

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

// ------------------- UI HELPERS ------------------- //
function showUserSection() {
  authSection.style.display = 'none';
  userSection.style.display = 'block';
  displayUsername.innerText = currentUser.username;
  userHeart.innerText = currentUser.heart || 'No heart assigned.';
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

// ------------------- SOCKET & MATCHING ------------------- //
function initSocket() {
  socket = io();

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('receiveMessage', (data) => {
    addMessage(`Partner: ${data.text}`);
  });

  socket.on('receiveImage', (data) => {
    addImage('Partner sent an image:', data.image);
  });

  socket.on('partnerTyping', () => {
    typingIndicator.style.display = 'block';
    setTimeout(() => {
      typingIndicator.style.display = 'none';
    }, 2000);
  });

  socket.on('matchClosed', () => {
    alert('Both users agreed to close the match!');
    chatContainer.style.display = 'none';
    matchStatus.innerText = 'Not matched yet.';
    messagesDiv.innerHTML = '';
  });
}

findMatchBtn.addEventListener('click', async () => {
  try {
    const res = await fetch('/api/find-unmatched');
    const data = await res.json();
    if (data.matchFound) {
      matchStatus.innerText = 'Match found!';
      matchNameElem.innerText = data.partner.username;
      chatContainer.style.display = 'block';
      // Typically you'd store partner's socket ID, or server does a room approach
    } else {
      matchStatus.innerText = 'No match found yet. Try again later.';
    }
  } catch (err) {
    console.error(err);
    alert('Error finding match.');
  }
});

// ------------------- CHAT FEATURES ------------------- //
sendBtn.addEventListener('click', () => {
  const message = messageInput.value.trim();
  if (!message) return;

  // For demonstration, we don't have a partner's socket ID
  socket.emit('sendMessage', { to: matchedPartnerSocket, text: message });
  addMessage(`You: ${message}`);
  messageInput.value = '';
});

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

messageInput.addEventListener('input', () => {
  socket.emit('typing', { to: matchedPartnerSocket });
});

satisfiedBtn.addEventListener('click', () => {
  socket.emit('userSatisfied', { matchId: matchedPartnerSocket });
});

// ------------------- HELPER FUNCTIONS ------------------- //
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
