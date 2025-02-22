// models/match.js
const mongoose = require("mongoose");
const path = require("path");
const User = require(path.join(__dirname, "../models/User"));


const matchSchema = new mongoose.Schema(
  {
    user1: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    user2: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["active", "closed"], default: "active" },
    satisfiedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    chatHistory: [
      {
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        message: { type: String, required: false },
        image: { type: String, required: false },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// ✅ Ensure Model is Not Overwritten
module.exports = mongoose.models.Match || mongoose.model("Match", matchSchema);
