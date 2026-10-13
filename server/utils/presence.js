const User = require("../models/userModel");

/**
 * True when either user has blocked the other.
 */
async function isBlockedEither(a, b) {
  if (!a || !b) return false;
  try {
    const found = await User.exists({
      $or: [
        { _id: a, blockedUsers: b },
        { _id: b, blockedUsers: a },
      ],
    });
    return !!found;
  } catch (err) {
    return false;
  }
}

/**
 * Sends an online/last-seen change only to users who have this user in their
 * contacts - and never across a block - instead of broadcasting to everyone.
 */
async function notifyStatusChange(userId, payload) {
  if (!global.io || !global.onlineUsers) return;
  try {
    const me = await User.findById(userId).select("blockedUsers");
    if (!me) return;
    const watchers = await User.find({
      contacts: userId,
      blockedUsers: { $ne: userId },
      _id: { $nin: me.blockedUsers },
    }).select("_id");

    watchers.forEach((w) => {
      const socketId = global.onlineUsers.get(w._id.toString());
      if (socketId) global.io.to(socketId).emit("user-status-changed", payload);
    });
  } catch (err) {
    console.log(err.message);
  }
}

/**
 * Asks a user's client to re-fetch its contact list (e.g. after a block
 * change) so stale online / last-seen values disappear immediately.
 */
function notifyContactsChanged(userId) {
  if (!global.io || !global.onlineUsers) return;
  const socketId = global.onlineUsers.get(String(userId));
  if (socketId) global.io.to(socketId).emit("contacts-changed");
}

module.exports = { isBlockedEither, notifyStatusChange, notifyContactsChanged };
