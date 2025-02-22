require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const morgan = require('morgan');
const winston = require('winston');

// Import Routes
const authRoutes = require('./routes/auth');
const matchRoutes = require('./routes/match');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ✅ Ensure MongoDB URI is properly loaded
const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  console.error("❌ ERROR: MongoDB URI is missing! Check your .env file.");
  process.exit(1);
}

// ✅ Connect to MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log(`✅ Connected to MongoDB at ${mongoURI}`))
  .catch(err => {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  });

// ✅ Logging Middleware
app.use(morgan('dev'));

// ✅ Setup Session Store with MongoDB
app.use(session({
  secret: process.env.SESSION_SECRET || 'secretDevKey',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: mongoURI,
    ttl: 14 * 24 * 60 * 60 // 14 days expiration
  })
}));

// ✅ Passport Initialization
require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());

// ✅ Serve Static Files (Frontend)
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Routes
app.use('/api', authRoutes);
app.use('/api', matchRoutes);

// ✅ Serve index.html (Frontend Entry Point)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ Socket.io for Real-time Chat & Matching
io.on('connection', (socket) => {
  console.log('🔵 A user connected:', socket.id);

  socket.on('sendMessage', (data) => {
    const { to, text } = data;
    io.to(to).emit('receiveMessage', { from: socket.id, text });
  });

  socket.on('disconnect', () => {
    console.log('🔴 A user disconnected:', socket.id);
  });
});

// ✅ Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("❌ ERROR:", err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// ✅ Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
