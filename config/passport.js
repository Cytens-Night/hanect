// config/passport.js
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

module.exports = function (passport) {
  // ✅ Local Strategy for Username or Email Login
  passport.use(
    new LocalStrategy(
      { usernameField: "emailOrUsername" }, // Allow login with either email or username
      async (emailOrUsername, password, done) => {
        try {
          // Find user by email OR username
          const user = await User.findOne({
            $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
          });

          if (!user) {
            return done(null, false, { message: "Invalid credentials." });
          }

          // Check password
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            return done(null, false, { message: "Incorrect password." });
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  // ✅ Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.NODE_ENV === "production"
        ? "https://hanect-service.onrender.com/auth/google/callback"
        : "http://localhost:3000/auth/google/callback",
        passReqToCallback: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ googleId: profile.id });

          if (!user) {
            user = new User({
              googleId: profile.id,
              username: profile.displayName,
              email: profile.emails[0].value,
              gender: "not specified",
              heart: null,
            });

            await user.save();
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  // ✅ Serialize user to store in session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // ✅ Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};
