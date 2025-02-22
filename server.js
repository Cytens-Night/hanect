require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./config/database");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const authRoutes = require("./routes/auth");
const matchRoutes = require("./routes/match");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const morgan = require("morgan");
const winston = require("winston");
const Match = require("./models/Match");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ✅ Connect to MongoDB
connectDB();

// ✅ Logging
app.use(morgan("dev")); // Basic request logging to console
const logger = winston.createLogger({
  transports: [new winston.transports.File({ filename: "logs/app.log" })],
});

// ✅ Express Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secretDevKey",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  })
);

// ✅ Passport (Authentication)
require("./config/passport")(passport);
app.use(passport.initialize());
app.use(passport.session());

// ✅ Routes
app.use("/api", authRoutes);
app.use("/api", matchRoutes);

// ✅ Serve static frontend files
app.use(express.static(path.join(__dirname, "public")));

// ✅ Real-Time Chat with Socket.IO
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // ✅ User joins their chat room (match)
  socket.on("joinChat", async ({ matchId }) => {
    socket.join(matchId);
    console.log(`User joined chat room: ${matchId}`);
  });

  // ✅ Send message & save it to MongoDB
  socket.on("sendMessage", async (data) => {
    const { matchId, senderId, message, image } = data;

    try {
      const match = await Match.findById(matchId);
      if (!match) return;

      match.chatHistory.push({
        sender: senderId,
        message: message || null,
        image: image || null,
      });

      await match.save();

      // ✅ Broadcast message to both users in the match
      io.to(matchId).emit("receiveMessage", {
        senderId,
        message,
        image,
      });
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  // ✅ Handle "Satisfied" button event
  socket.on("userSatisfied", async ({ matchId, userId }) => {
    try {
      const match = await Match.findById(matchId);
      if (!match) return;

      if (!match.satisfiedUsers.includes(userId)) {
        match.satisfiedUsers.push(userId);
      }

      // If both users clicked "Satisfied", close the match
      if (
        match.satisfiedUsers.includes(match.user1.toString()) &&
        match.satisfiedUsers.includes(match.user2.toString())
      ) {
        match.status = "closed";
        await match.save();
        io.to(matchId).emit("matchClosed");
      }
    } catch (err) {
      console.error("Error updating satisfaction:", err);
    }
  });

  // ✅ Handle user disconnecting
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

// ✅ Global Error Handling
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// ✅ Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
