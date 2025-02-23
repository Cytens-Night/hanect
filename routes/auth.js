// routes/auth.js
const express = require("express");
const router = express.Router();
const passport = require("passport");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const nodemailer = require("nodemailer");
require("dotenv").config();

const heartPairs = [
  { male: "❤️‍🕺(M1)", female: "❤️‍💃(F1)" },
  { male: "❤️‍🕺(M2)", female: "❤️‍💃(F2)" },
  { male: "❤️‍🕺(M3)", female: "❤️‍💃(F3)" },
  { male: "❤️‍🕺(M4)", female: "❤️‍💃(F4)" },
  { male: "❤️‍🕺(M5)", female: "❤️‍💃(F5)" },
];

// ✅ Email Transporter (Ensure your .env file has correct EMAIL_USER & EMAIL_PASS)
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ SIGNUP (Register a new user)
router.post("/signup", async (req, res, next) => {
  try {
    const { username, email, password, gender } = req.body;

    if (!username || !email || !password || !gender) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // ✅ Check if username or email already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: "Username or Email already taken." });
    }

    // Assign a unique heart symbol
    const randomIndex = Math.floor(Math.random() * heartPairs.length);
    let heart =
      gender === "male" ? heartPairs[randomIndex].male : heartPairs[randomIndex].female;

    const newUser = new User({
      username,
      email,
      password,
      gender,
      heart,
      pairIndex: randomIndex,
    });

    await newUser.save();

    // ✅ Auto login after signup
    req.login(newUser, (err) => {
      if (err) return next(err);
      return res.json({
        success: true,
        user: {
          _id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          gender: newUser.gender,
          heart: newUser.heart,
          pairIndex: newUser.pairIndex,
        },
      });
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// ✅ LOGIN (Using email or username)
router.post("/login", async (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(400).json({ message: "Invalid credentials." });

    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      return res.json({
        success: true,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          gender: user.gender,
          heart: user.heart,
          pairIndex: user.pairIndex,
        },
      });
    });
  })(req, res, next);
});

// ✅ LOGOUT
router.get("/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(); // Destroy session on logout
    res.json({ success: true, message: "Logged out successfully" });
  });
});

// ✅ FORGOT PASSWORD (Send reset email)
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "No user found with this email." });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetToken = resetToken;
    user.resetTokenExpiration = Date.now() + 3600000; // 1 hour expiration

    await user.save();

    // Send email
    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: "Password Reset Request",
      text: `Click the link below to reset your password: \n\n${resetURL}\n\nThis link expires in 1 hour.`,
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Password reset email sent!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error sending email. Try again later." });
  }
});

// ✅ RESET PASSWORD
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiration: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    // Hash the new password before saving
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Clear reset token
    user.resetToken = null;
    user.resetTokenExpiration = null;

    await user.save();
    res.json({ success: true, message: "Password successfully updated!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error resetting password." });
  }
});

// ✅ GOOGLE AUTHENTICATION
router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    successRedirect: "/dashboard",
  })
);

// ✅ Ensure environment variables for Google OAuth are correctly set
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error("❌ ERROR: Missing Google OAuth credentials. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.");
  process.exit(1);
}

module.exports = router;
