// config/database.js

const mongoose = require('mongoose');

module.exports = function connectDB() {
  // Use the environment variable if available; otherwise default to local DB
  const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hanectdb';

  // Connect to MongoDB
  mongoose
    .connect(dbURI)
    .then(() => {
      console.log(`Connected to MongoDB at ${dbURI}`);
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err);
    });
};
