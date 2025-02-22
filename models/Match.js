const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema({
  user1: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  user2: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["active", "closed"], default: "active" },
  satisfiedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  chatHistory: [
    {
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      message: String,
      image: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

const Match = mongoose.model("Match", matchSchema);
module.exports = Match;
