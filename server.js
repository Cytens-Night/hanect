// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const authRoutes = require('./routes/auth');
const matchRoutes = require('./routes/match');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const morgan = require('morgan');
const winston = require('winston');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Connect to DB
connectDB();

// Logging
app.use(morgan('dev')); // Basic request logging to console
// Winston example (logs to file):
const logger = winston.createLogger({
  transports: [
    new winston.transports.File({ filename: 'logs/app.log' })
  ]
});

// Express Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'secretDevKey',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI })
}));

// Passport
require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api', authRoutes);
app.use('/api', matchRoutes);

// Serve static client
app.use(express.static(path.join(__dirname, 'public')));

// Socket.IO (with session awareness if needed)
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // We can attempt to check session or do more advanced logic
  // If user is matched, we can join them into a room with their partner etc.

  socket.on('sendMessage', (data) => {
    const { to, text } = data;
    // Example: broadcast to specific socket "to"
    io.to(to).emit('receiveMessage', { from: socket.id, text });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    // Cleanup if needed
  });
});

// Error handling middlewares
app.use((err, req, res, next) => {
  logger.error(err.stack); // Winston logs the error
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
