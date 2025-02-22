// routes/match.js (optional, or integrate into your socket logic)
const express = require('express');
const router = express.Router();
const User = require('../models/user');

// Example route to get an unmatched user from the DB
router.get('/find-unmatched', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not logged in.' });
    }

    // Find unmatched user in DB that has opposite gender & same pairIndex
    const match = await User.findOne({
      _id: { $ne: req.user._id },
      gender: { $ne: req.user.gender },
      pairIndex: req.user.pairIndex,
      matchedWith: null
    });

    if (!match) {
      return res.json({ matchFound: false });
    }

    // We found a match, mark them matched
    await User.findByIdAndUpdate(req.user._id, { matchedWith: match._id });
    await User.findByIdAndUpdate(match._id, { matchedWith: req.user._id });

    return res.json({
      matchFound: true,
      partner: {
        _id: match._id,
        username: match.username,
        gender: match.gender,
        heart: match.heart
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
