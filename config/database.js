// config/database.js

const mongoose = require('mongoose');

module.exports = function connectDB() {
  const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hanectdb';
  
  mongoose.connect(dbURI);


  const db = mongoose.connection;
  db.on('error', (err) => console.error('MongoDB connection error:', err));
  db.once('open', () => {
    console.log(`Connected to MongoDB at ${dbURI}`);
  });
};
