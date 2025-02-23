require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const morgan = require("morgan");
const winston = require("winston");

// Import Routes
const authRoutes = require("./routes/auth");
const matchRoutes = require("./routes/match");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ✅ CORS Middleware (Allows frontend requests)
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000", credentials: true }));

// ✅ Validate Required Environment Variables
const mongoURI = process.env.MONGODB_URI;
const sessionSecret = process.env.SESSION_SECRET;

if (!mongoURI || !sessionSecret) {
  console.error("❌ ERROR: Missing required environment variables (MONGODB_URI, SESSION_SECRET).");
  process.exit(1);
}

// ✅ Connect to MongoDB with Better Error Handling
mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log(`✅ Connected to MongoDB at ${mongoURI}`))
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  });

// ✅ Improved Logging with Morgan & Winston
app.use(morgan("dev"));

const logger = winston.createLogger({
  level: "error",
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: "logs/error.log" })],
});

// ✅ Secure Sessions with MongoDB Store
app.use(
  session({
    secret: sessionSecret,
    resave: false, // Prevents unnecessary session overwrites
    saveUninitialized: false, // Prevents creating sessions for unauthenticated users
    store: MongoStore.create({
      mongoUrl: mongoURI,
      ttl: 14 * 24 * 60 * 60, // 14 days expiration
      autoRemove: "native",
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      httpOnly: true,
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days in milliseconds
    },
  })
);

// ✅ Initialize Passport
require("./config/passport")(passport);
app.use(passport.initialize());
app.use(passport.session());

// ✅ Middleware to Restore User Session
app.use((req, res, next) => {
  if (req.user) {
    console.log(`🔵 Active Session: ${req.user.username || req.user.email}`);
  }
  next();
});

// ✅ Serve Static Files
app.use(express.static(path.join(__dirname, "public")));

// ✅ Middleware for JSON & Form Handling
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Routes
app.use("/", authRoutes); // FIXED: Ensures `/auth/google/callback` works
app.use("/api", matchRoutes);

// ✅ API Route to Check Session (Ensures User Stays Logged In)
app.get("/api/session", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ success: true, user: req.user });
  } else {
    res.json({ success: false, message: "Not authenticated" });
  }
});

// ✅ Serve Frontend (For Production Deployments)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Socket.IO for Real-time Chat & Matchmaking
const activeUsers = new Map();

io.on("connection", (socket) => {
  console.log(`🔵 User Connected: ${socket.id}`);

  socket.on("registerUser", (userId) => {
    activeUsers.set(userId, socket.id);
    console.log(`✅ User Registered: ${userId}`);
  });

  socket.on("sendMessage", (data) => {
    const { to, text } = data;
    const recipientSocket = activeUsers.get(to);
    if (recipientSocket) {
      io.to(recipientSocket).emit("receiveMessage", { from: socket.id, text });
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔴 User Disconnected: ${socket.id}`);
    activeUsers.forEach((socketId, userId) => {
      if (socketId === socket.id) {
        activeUsers.delete(userId);
      }
    });
  });
});

// ✅ Improved Error Handling
app.use((err, req, res, next) => {
  console.error("❌ ERROR:", err.stack);
  logger.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// ✅ Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
