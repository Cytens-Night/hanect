// routes/auth.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/user');
const heartPairs = [
  { male: "❤️‍🕺(M1)", female: "❤️‍💃(F1)" },
  { male: "❤️‍🕺(M2)", female: "❤️‍💃(F2)" },
  { male: "❤️‍🕺(M3)", female: "❤️‍💃(F3)" },
  { male: "❤️‍🕺(M4)", female: "❤️‍💃(F4)" },
  { male: "❤️‍🕺(M5)", female: "❤️‍💃(F5)" },
];

// @route   POST /signup
// @desc    Register new user
router.post('/signup', async (req, res, next) => {
  try {
    const { username, password, gender } = req.body;
    if (!username || !password || !gender) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Create user
    const randomIndex = Math.floor(Math.random() * heartPairs.length);
    let heart = (gender === 'male')
      ? heartPairs[randomIndex].male
      : heartPairs[randomIndex].female;

    const newUser = new User({
      username,
      password,
      gender,
      heart,
      pairIndex: randomIndex
    });

    await newUser.save();

    // Automatically log user in after signup (optional)
    req.login(newUser, (err) => {
      if (err) return next(err);
      return res.json({
        success: true,
        user: {
          _id: newUser._id,
          username: newUser.username,
          gender: newUser.gender,
          heart: newUser.heart,
          pairIndex: newUser.pairIndex
        }
      });
    });

  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Username is already taken.' });
    }
    return next(err);
  }
});

// @route   POST /login
// @desc    Login existing user
router.post('/login', passport.authenticate('local'), (req, res) => {
  // If successful, passport will attach user to req.user
  return res.json({
    success: true,
    user: {
      _id: req.user._id,
      username: req.user.username,
      gender: req.user.gender,
      heart: req.user.heart,
      pairIndex: req.user.pairIndex
    }
  });
});

// @route   GET /logout
// @desc    Logout user
router.get('/logout', (req, res) => {
  req.logout(() => {
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

module.exports = router;
