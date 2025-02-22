// config/database.js

const mongoose = require("mongoose");

module.exports = function connectDB() {
  const dbURI = process.env.MONGODB_URI || "mongodb://localhost:27017/hanectdb";

  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true, // Ensures proper connection management
    serverSelectionTimeoutMS: 5000, // Avoids long delays in case of issues
    autoIndex: false, // Prevents performance issues in production
    maxPoolSize: 10, // Controls the number of simultaneous connections
  };

  mongoose
    .connect(dbURI, options)
    .then(() => console.log(`✅ Connected to MongoDB at ${dbURI}`))
    .catch((err) => {
      console.error("❌ MongoDB connection error:", err);
      process.exit(1); // Exit if connection fails
    });

  // ✅ Handling Disconnections & Automatic Reconnect
  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️ MongoDB Disconnected! Retrying connection...");
    setTimeout(() => mongoose.connect(dbURI, options), 5000);
  });

  // ✅ Handling Unexpected Errors
  mongoose.connection.on("error", (err) => {
    console.error("❌ MongoDB Connection Error:", err);
  });
};
