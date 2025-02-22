const express = require("express");
const router = express.Router();
const Match = require("../models/Match");
const User = require("../models/User");

// ✅ Find or return existing match
router.post("/find-unmatched", async (req, res) => {
  const userId = req.user._id;

  try {
    // Check if user already has an active match
    let existingMatch = await Match.findOne({
      $or: [{ user1: userId }, { user2: userId }],
      status: "active",
    }).populate("user1 user2");

    if (existingMatch) {
      return res.json({
        matchFound: true,
        partner: existingMatch.user1._id.equals(userId)
          ? existingMatch.user2
          : existingMatch.user1,
        matchId: existingMatch._id,
      });
    }

    // Find an opposite-gender user who is not matched
    const currentUser = await User.findById(userId);
    const potentialMatch = await User.findOne({
      gender: currentUser.gender === "male" ? "female" : "male",
      _id: { $ne: userId },
    });

    if (!potentialMatch) {
      return res.json({ matchFound: false, message: "No match found." });
    }

    // Create a new match
    const newMatch = new Match({
      user1: userId,
      user2: potentialMatch._id,
    });
    await newMatch.save();

    res.json({
      matchFound: true,
      partner: potentialMatch,
      matchId: newMatch._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Fetch chat history for a match
router.get("/:matchId/chat", async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId).populate(
      "chatHistory.sender"
    );
    if (!match) return res.status(404).json({ error: "Match not found" });

    res.json({ success: true, chatHistory: match.chatHistory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Store chat messages in MongoDB
router.post("/:matchId/chat", async (req, res) => {
  const { senderId, message, image } = req.body;

  try {
    const match = await Match.findById(req.params.matchId);
    if (!match) return res.status(404).json({ error: "Match not found" });

    match.chatHistory.push({
      sender: senderId,
      message: message || null,
      image: image || null,
    });

    await match.save();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Handle "Satisfied" button - Only closes if BOTH users confirm
router.post("/satisfied", async (req, res) => {
  const { matchId, userId } = req.body;

  try {
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ error: "Match not found" });

    // Store users who clicked "Satisfied"
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
      return res.json({ success: true, message: "Match closed for both users." });
    }

    await match.save();
    res.json({ success: true, message: "Waiting for the other user to confirm." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
