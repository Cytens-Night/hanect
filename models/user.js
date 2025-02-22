// models/user.js
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    maxlength: 30,
  },
  password: {
    type: String,
    required: true,
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
});

// ✅ Prevents model from being recompiled
if (!mongoose.models.User) {
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

  userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };

  module.exports = mongoose.model("User", userSchema);
} else {
  module.exports = mongoose.models.User;
}
