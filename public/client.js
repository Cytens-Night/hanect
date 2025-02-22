/************************************************************
 * DOM ELEMENTS
 ************************************************************/
// Auth container + forms
const authContainer = document.querySelector(".auth-container");
const loginFormBox = document.getElementById("loginForm");
const signupFormBox = document.getElementById("signupForm");

// Toggle links (switching between login & signup)
const goToSignupLink = document.getElementById("goToSignup");
const goToLoginLink = document.getElementById("goToLogin");

// Login elements
const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");

// Signup elements
const signupUsername = document.getElementById("signupUsername");
const signupPassword = document.getElementById("signupPassword");
const signupGender = document.getElementById("signupGender");
const signupBtn = document.getElementById("signupBtn");

// After authentication, user section
const userSection = document.getElementById("userSection");
const displayUsername = document.getElementById("displayUsername");
const logoutBtn = document.getElementById("logoutBtn");

// Heart & matching
const userHeart = document.getElementById("userHeart");
const findMatchBtn = document.getElementById("findMatchBtn");
const matchStatus = document.getElementById("matchStatus");

// Chat elements
const chatContainer = document.getElementById("chatContainer");
const matchNameElem = document.getElementById("matchName");
const typingIndicator = document.getElementById("typingIndicator");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const imageInput = document.getElementById("imageInput");
const sendImageBtn = document.getElementById("sendImageBtn");
const satisfiedBtn = document.getElementById("satisfiedBtn");

// Global variables
let socket = null;
let currentUser = null;
let matchedUserId = null;
let matchId = null;

/************************************************************
 * TOGGLE BETWEEN LOGIN & SIGNUP FORMS
 ************************************************************/

if (goToSignupLink) {
  goToSignupLink.addEventListener("click", (e) => {
    e.preventDefault();
    authContainer.setAttribute("data-mode", "signup");
  });
}

if (goToLoginLink) {
  goToLoginLink.addEventListener("click", (e) => {
    e.preventDefault();
    authContainer.setAttribute("data-mode", "login");
  });
}

/************************************************************
 * LOGIN LOGIC
 ************************************************************/

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();

    if (!username || !password) {
      alert("Please enter your username and password.");
      return;
    }

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        currentUser = data.user;
        showUserSection();
        initSocket();
      } else {
        alert(data.message || "Login failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Error during login.");
    }
  });
}

/************************************************************
 * SIGNUP LOGIC
 ************************************************************/

if (signupBtn) {
  signupBtn.addEventListener("click", async () => {
    const username = signupUsername.value.trim();
    const password = signupPassword.value.trim();
    const gender = signupGender.value;

    if (!username || !password || !gender) {
      alert("Please fill out all fields.");
      return;
    }

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, gender }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        currentUser = data.user;
        showUserSection();
        initSocket();
      } else {
        alert(data.message || "Signup failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Error during signup.");
    }
  });
}

/************************************************************
 * LOGOUT
 ************************************************************/

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      const res = await fetch("/api/logout");
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
  findMatchBtn.addEventListener("click", async () => {
    try {
      const res = await fetch("/api/find-unmatched", { method: "POST" });
      const data = await res.json();

      if (res.ok && data.matchFound) {
        matchStatus.innerText = "Match found!";
        matchNameElem.innerText = data.partner.username;
        matchedUserId = data.partner._id;
        matchId = data.matchId;

        fetchChatHistory(matchId);
        chatContainer.style.display = "block";
      } else {
        matchStatus.innerText = "No match found yet. Try again later.";
      }
    } catch (err) {
      console.error(err);
      alert("Error while finding match.");
    }
  });
}

/************************************************************
 * CHAT LOGIC
 ************************************************************/

function initSocket() {
  socket = io();

  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
    if (matchId) socket.emit("joinChat", { matchId });
  });

  socket.on("receiveMessage", (data) => {
    addMessage(`${data.senderId}: ${data.message || "(Image sent)"}`);
  });

  socket.on("matchClosed", () => {
    alert("Both users confirmed satisfaction. Chat is now closed.");
    chatContainer.style.display = "none";
    matchStatus.innerText = "Not matched yet.";
    messagesDiv.innerHTML = "";
  });
}

if (sendBtn) {
  sendBtn.addEventListener("click", () => {
    const message = messageInput.value.trim();
    if (!message) return;

    socket.emit("sendMessage", { matchId, senderId: currentUser._id, message });
    addMessage(`You: ${message}`);
    messageInput.value = "";
  });
}

if (satisfiedBtn) {
  satisfiedBtn.addEventListener("click", () => {
    socket.emit("userSatisfied", { matchId, userId: currentUser._id });
  });
}

/************************************************************
 * HELPER FUNCTIONS
 ************************************************************/

function showUserSection() {
  authContainer.style.display = "none";
  userSection.style.display = "block";
  displayUsername.innerText = currentUser.username;
}

function showAuthSection() {
  authContainer.style.display = "flex";
  authContainer.setAttribute("data-mode", "login");
  userSection.style.display = "none";
}

function fetchChatHistory(matchId) {
  fetch(`/api/match/${matchId}/chat`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        data.chatHistory.forEach((msg) => {
          addMessage(`${msg.sender.username}: ${msg.message || "(Image sent)"}`);
        });
      }
    });
}

function addMessage(msg) {
  const p = document.createElement("p");
  p.textContent = msg;
  messagesDiv.appendChild(p);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

showAuthSection();
