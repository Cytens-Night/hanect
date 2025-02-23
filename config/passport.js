// config/passport.js
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user");
const bcrypt = require("bcrypt");
require("dotenv").config();

module.exports = function (passport) {
  // ✅ Local Strategy for Email or Username Login
  passport.use(
    new LocalStrategy(
      { usernameField: "usernameOrEmail" }, // Allow login with either email or username
      async (usernameOrEmail, password, done) => {
        try {
          // Find user by email OR username
          const user = await User.findOne({
            $or: [{ email: usernameOrEmail }, { username: usernameOrEmail }],
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
        callbackURL: process.env.GOOGLE_CALLBACK_URL, // Use from .env to avoid issues
        passReqToCallback: true,
      },
      async (request, accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ googleId: profile.id });

          if (!user) {
            // Assign a random heart
            const heartPairs = [
              { male: "❤️‍🕺(M1)", female: "❤️‍💃(F1)" },
              { male: "❤️‍🕺(M2)", female: "❤️‍💃(F2)" },
              { male: "❤️‍🕺(M3)", female: "❤️‍💃(F3)" },
              { male: "❤️‍🕺(M4)", female: "❤️‍💃(F4)" },
              { male: "❤️‍🕺(M5)", female: "❤️‍💃(F5)" },
            ];
            const randomIndex = Math.floor(Math.random() * heartPairs.length);
            const heart = heartPairs[randomIndex].male; // Default to male heart

            user = new User({
              googleId: profile.id,
              username: profile.displayName.replace(/\s+/g, "").toLowerCase(),
              email: profile.emails[0].value,
              gender: "not specified",
              heart,
            });

            await user.save();
          }

          return done(null, user);
        } catch (err) {
          console.error("Google OAuth Error:", err);
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
