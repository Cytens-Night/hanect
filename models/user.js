// models/user.js
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
      required: true,
      maxlength: 30,
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    googleId: {
      type: String, // Store Google OAuth ID if user logs in with Google
      default: null,
    },
    gender: {
      type: String, // 'male' or 'female'
      required: true,
    },
    heart: {
      type: String,
      default: null,
    },
    pairIndex: {
      type: Number,
      default: null,
    },
    matchedWith: {
      type: mongoose.Schema.Types.ObjectId, // store the matched user's _id
      ref: "User",
      default: null,
    },
    resetToken: {
      type: String, // Stores token for password reset
      default: null,
    },
    resetTokenExpiration: {
      type: Date, // Expiry for reset token
      default: null,
    },
  },
  { timestamps: true }
);

// ✅ Hash Password Before Saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ✅ Compare Password Method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ✅ Prevent Duplicate Model Compilation
module.exports = mongoose.models.User || mongoose.model("User", userSchema);
