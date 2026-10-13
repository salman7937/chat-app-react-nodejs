const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    min: 3,
    max: 20,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    max: 50,
  },
  password: {
    type: String,
    required: true,
    min: 8,
  },
  isAvatarImageSet: {
    type: Boolean,
    default: false,
  },
  avatarImage: {
    type: String,
    default: "",
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  // People shown in this user's chat list (WhatsApp style)
  contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Users" }],
  // People this user has blocked
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Users" }],
  // Set once existing chat partners have been copied into `contacts`
  contactsInitialized: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("Users", userSchema);
