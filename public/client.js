/************************************************************
 * DOM ELEMENTS
 ************************************************************/

// Auth container & forms
const authContainer = document.querySelector(".auth-container");
const loginFormBox = document.getElementById("loginForm");
const signupFormBox = document.getElementById("signupForm");

// Toggle links (switching between login & signup)
const goToSignupLink = document.getElementById("goToSignup");
const goToLoginLink = document.getElementById("goToLogin");

// Login elements
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const googleLoginBtn = document.getElementById("googleLoginBtn");

// Signup elements
const signupUsername = document.getElementById("signupUsername");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const signupGender = document.getElementById("signupGender");
const signupBtn = document.getElementById("signupBtn");

// Forgot Password Elements
const forgotPasswordLink = document.getElementById("forgotPassword");
const resetEmailInput = document.getElementById("resetEmail");
const resetPasswordBtn = document.getElementById("resetPasswordBtn");

// After authentication, user section
const userSection = document.getElementById("userSection");
const displayUsername = document.getElementById("displayUsername");
const logoutBtn = document.getElementById("logoutBtn");

// Matching
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
const satisfiedBtn = document.getElementById("satisfiedBtn");

// Global variables
let socket = null;
let currentUser = null;
let matchedUserId = null;
let matchId = null;

/************************************************************
 * TOGGLE LOGIN/SIGNUP FORMS
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
    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();

    if (!email || !password) {
      alert("Please enter your email and password.");
      return;
    }

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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
 * GOOGLE LOGIN LOGIC
 ************************************************************/

if (googleLoginBtn) {
  googleLoginBtn.addEventListener("click", async () => {
    window.location.href = "/api/auth/google";
  });
}

/************************************************************
 * SIGNUP LOGIC
 ************************************************************/

if (signupBtn) {
  signupBtn.addEventListener("click", async () => {
    const username = signupUsername.value.trim();
    const email = signupEmail.value.trim();
    const password = signupPassword.value.trim();
    const gender = signupGender.value;

    if (!username || !email || !password || !gender) {
      alert("Please fill out all fields.");
      return;
    }

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, gender }),
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
 * PASSWORD RESET LOGIC
 ************************************************************/

if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener("click", () => {
    const email = prompt("Enter your email to reset your password:");
    if (email) {
      fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
        .then((res) => res.json())
        .then((data) => alert(data.message || "Check your email for reset link."));
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
      const res = await fetch("/api/find-match", { method: "POST" });
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
 * SOCKET.IO CHAT LOGIC
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
  userSection.style.display = "none";
}

function addMessage(msg) {
  const p = document.createElement("p");
  p.textContent = msg;
  messagesDiv.appendChild(p);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

showAuthSection();
