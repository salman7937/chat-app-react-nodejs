const User = require("../models/userModel");
const Messages = require("../models/messageModel");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const {
  notifyStatusChange,
  notifyContactsChanged,
} = require("../utils/presence");

const CONTACT_FIELDS = "username avatarImage isOnline lastSeen";
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user)
      return res.json({ msg: "Incorrect Username or Password", status: false });
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.json({ msg: "Incorrect Username or Password", status: false });
    delete user.password;
    return res.json({ status: true, user });
  } catch (ex) {
    next(ex);
  }
};

module.exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const usernameCheck = await User.findOne({ username });
    if (usernameCheck)
      return res.json({ msg: "Username already used", status: false });
    const emailCheck = await User.findOne({ email });
    if (emailCheck)
      return res.json({ msg: "Email already used", status: false });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      username,
      password: hashedPassword,
    });
    delete user.password;
    return res.json({ status: true, user });
  } catch (ex) {
    next(ex);
  }
};

module.exports.getAllUsers = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const me = await User.findById(userId).select(
      "contacts blockedUsers contactsInitialized"
    );
    if (!me) return res.json([]);

    // One-time: copy existing chat partners into the contact list so
    // chats that existed before this feature do not disappear.
    if (!me.contactsInitialized) {
      const partners = await Messages.aggregate([
        { $match: { users: userId } },
        { $unwind: "$users" },
        { $match: { users: { $ne: userId } } },
        { $group: { _id: "$users" } },
      ]);
      const partnerIds = partners
        .map((p) => p._id)
        .filter((id) => mongoose.Types.ObjectId.isValid(id));
      await User.updateOne(
        { _id: userId },
        {
          $addToSet: { contacts: { $each: partnerIds } },
          $set: { contactsInitialized: true },
        }
      );
      me.contacts = [...me.contacts, ...partnerIds];
    }

    const contacts = await User.find({ _id: { $in: me.contacts } }).select(
      CONTACT_FIELDS + " blockedUsers"
    );

    // Most recent conversation first
    const lastMsgs = await Messages.aggregate([
      {
        $match: {
          users: userId,
          $or: [
            { blockedDelivery: { $ne: true } },
            { sender: new mongoose.Types.ObjectId(userId) },
          ],
        },
      },
      {
        $project: {
          other: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$users",
                  cond: { $ne: ["$$this", userId] },
                },
              },
              0,
            ],
          },
          createdAt: 1,
        },
      },
      { $group: { _id: "$other", last: { $max: "$createdAt" } } },
    ]);
    const lastMap = {};
    lastMsgs.forEach((m) => {
      lastMap[m._id] = new Date(m.last).getTime();
    });

    const blockedByMe = new Set(me.blockedUsers.map((id) => id.toString()));
    const result = contacts.map((c) => {
      const blockedMe = c.blockedUsers.some((id) => id.toString() === userId);
      const isBlocked = blockedByMe.has(c._id.toString());
      // a block hides online / last seen in both directions
      const hidePresence = blockedMe || isBlocked;
      return {
        _id: c._id,
        username: c.username,
        avatarImage: c.avatarImage,
        isOnline: hidePresence ? false : c.isOnline,
        lastSeen: hidePresence ? null : c.lastSeen,
        isBlocked,
        lastMessageAt: lastMap[c._id.toString()] || 0,
      };
    });
    result.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    return res.json(result);
  } catch (ex) {
    next(ex);
  }
};

module.exports.searchUsers = async (req, res, next) => {
  try {
    const q = (req.query.q || "").toString().trim();
    const userId = req.query.userId;
    if (q.length < 3 || !userId) return res.json([]);

    const me = await User.findById(userId).select("contacts");
    const myContacts = new Set(
      (me ? me.contacts : []).map((id) => id.toString())
    );

    const users = await User.find({
      _id: { $ne: userId },
      username: { $regex: escapeRegex(q), $options: "i" },
      isAvatarImageSet: true,
      // users who blocked the searcher stay hidden
      blockedUsers: { $ne: userId },
    })
      .select("username avatarImage")
      .limit(10);

    return res.json(
      users.map((u) => ({
        _id: u._id,
        username: u.username,
        avatarImage: u.avatarImage,
        alreadyContact: myContacts.has(u._id.toString()),
      }))
    );
  } catch (ex) {
    next(ex);
  }
};

module.exports.addContact = async (req, res, next) => {
  try {
    const { userId, contactId } = req.body;
    if (!userId || !contactId || userId === contactId) {
      return res.status(400).json({ status: false, msg: "Invalid request" });
    }
    const contact = await User.findById(contactId).select(
      CONTACT_FIELDS + " blockedUsers"
    );
    if (!contact) {
      return res.status(404).json({ status: false, msg: "User not found" });
    }
    const me = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { contacts: contactId } },
      { new: true }
    ).select("blockedUsers");
    if (!me) {
      return res.status(404).json({ status: false, msg: "User not found" });
    }
    const blockedMe = contact.blockedUsers.some(
      (id) => id.toString() === userId
    );
    const isBlocked = me.blockedUsers.some((id) => id.toString() === contactId);
    const hidePresence = blockedMe || isBlocked;
    return res.json({
      status: true,
      contact: {
        _id: contact._id,
        username: contact.username,
        avatarImage: contact.avatarImage,
        isOnline: hidePresence ? false : contact.isOnline,
        lastSeen: hidePresence ? null : contact.lastSeen,
        isBlocked,
      },
    });
  } catch (ex) {
    next(ex);
  }
};

module.exports.blockUser = async (req, res, next) => {
  try {
    const { userId, targetId } = req.body;
    if (!userId || !targetId || userId === targetId) {
      return res.status(400).json({ status: false, msg: "Invalid request" });
    }
    await User.updateOne(
      { _id: userId },
      { $addToSet: { blockedUsers: targetId, contacts: targetId } }
    );
    notifyContactsChanged(targetId);
    return res.json({ status: true });
  } catch (ex) {
    next(ex);
  }
};

module.exports.unblockUser = async (req, res, next) => {
  try {
    const { userId, targetId } = req.body;
    if (!userId || !targetId) {
      return res.status(400).json({ status: false, msg: "Invalid request" });
    }
    await User.updateOne({ _id: userId }, { $pull: { blockedUsers: targetId } });
    notifyContactsChanged(targetId);
    return res.json({ status: true });
  } catch (ex) {
    next(ex);
  }
};

module.exports.setAvatar = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const avatarImage = req.body.image;
    const userData = await User.findByIdAndUpdate(
      userId,
      {
        isAvatarImageSet: true,
        avatarImage,
      },
      { new: true }
    );
    return res.json({
      isSet: userData.isAvatarImageSet,
      image: userData.avatarImage,
    });
  } catch (ex) {
    next(ex);
  }
};

module.exports.logOut = async (req, res, next) => {
  try {
    if (!req.params.id) return res.json({ msg: "User id is required " });
    onlineUsers.delete(req.params.id);
    const now = new Date();
    await User.findByIdAndUpdate(req.params.id, {
      isOnline: false,
      lastSeen: now,
    });
    await notifyStatusChange(req.params.id, {
      userId: req.params.id,
      isOnline: false,
      lastSeen: now,
    });
    return res.status(200).send();
  } catch (ex) {
    next(ex);
  }
};
