const Messages = require("../models/messageModel");
const User = require("../models/userModel");
const mongoose = require("mongoose");

module.exports.getMessages = async (req, res, next) => {
  try {
    const { from, to } = req.body;

    // Mark messages sent by 'to' to 'from' as 'read'
    await Messages.updateMany(
      {
        users: { $all: [from, to] },
        sender: to,
        status: { $ne: "read" },
      },
      { $set: { status: "read" } }
    );

    const messages = await Messages.find({
      users: {
        $all: [from, to],
      },
      // messages sent while the viewer had blocked the sender stay hidden
      $or: [{ blockedDelivery: { $ne: true } }, { sender: from }],
    }).sort({ updatedAt: 1 });

    const projectedMessages = messages.map((msg) => {
      return {
        _id: msg._id,
        fromSelf: msg.sender.toString() === from,
        message: msg.message ? msg.message.text : "",
        messageType: msg.messageType || "text",
        mediaUrl: msg.mediaUrl || "",
        status: msg.status || "sent",
        reactions: msg.reactions || [],
        createdAt: msg.createdAt,
      };
    });
    return res.json(projectedMessages);
  } catch (ex) {
    next(ex);
  }
};

module.exports.addMessage = async (req, res, next) => {
  try {
    const { from, to, message, messageType, mediaUrl } = req.body;

    const [sender, recipient] = await Promise.all([
      User.findById(from).select("blockedUsers"),
      User.findById(to).select("blockedUsers"),
    ]);
    if (!sender || !recipient) {
      return res.status(404).json({ status: false, msg: "User not found" });
    }
    // The sender blocked this contact: they have to unblock first
    if (sender.blockedUsers.some((id) => id.toString() === to)) {
      return res.status(403).json({
        status: false,
        blocked: true,
        msg: "You blocked this contact. Unblock to send messages.",
      });
    }
    // The recipient blocked the sender: store silently, never deliver
    const blockedByRecipient = recipient.blockedUsers.some(
      (id) => id.toString() === from
    );

    const isRecipientOnline = global.onlineUsers && global.onlineUsers.has(to);
    const initialStatus =
      isRecipientOnline && !blockedByRecipient ? "delivered" : "sent";

    const data = await Messages.create({
      message: { text: message || "" },
      messageType: messageType || "text",
      mediaUrl: mediaUrl || "",
      users: [from, to],
      sender: from,
      status: initialStatus,
      blockedDelivery: blockedByRecipient,
      reactions: [],
    });

    if (data) {
      if (!blockedByRecipient) {
        // First message makes the sender show up in the recipient's chats
        await Promise.all([
          User.updateOne({ _id: to }, { $addToSet: { contacts: from } }),
          User.updateOne({ _id: from }, { $addToSet: { contacts: to } }),
        ]);
      }
      return res.json({
        msg: "Message added successfully.",
        messageId: data._id,
        status: data.status,
        messageType: data.messageType,
        mediaUrl: data.mediaUrl,
      });
    } else {
      return res.json({ msg: "Failed to add message to the database" });
    }
  } catch (ex) {
    next(ex);
  }
};

module.exports.getUnreadCounts = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!userId || userId === "undefined") {
      return res.json({});
    }

    const unreadMessages = await Messages.aggregate([
      {
        $match: {
          users: userId,
          sender: { $ne: new mongoose.Types.ObjectId(userId) },
          status: { $ne: "read" },
          blockedDelivery: { $ne: true },
        },
      },
      {
        $group: {
          _id: "$sender",
          count: { $sum: 1 },
        },
      },
    ]);

    const counts = {};
    unreadMessages.forEach((item) => {
      counts[item._id.toString()] = item.count;
    });

    return res.json(counts);
  } catch (ex) {
    next(ex);
  }
};

module.exports.reactMessage = async (req, res, next) => {
  try {
    const { messageId, userId, emoji } = req.body;
    const msg = await Messages.findById(messageId);
    if (!msg) {
      return res.json({ status: false, msg: "Message not found" });
    }

    const existingIndex = msg.reactions.findIndex(
      (r) => r.userId.toString() === userId && r.emoji === emoji
    );

    if (existingIndex > -1) {
      msg.reactions.splice(existingIndex, 1);
    } else {
      msg.reactions = msg.reactions.filter(
        (r) => r.userId.toString() !== userId
      );
      msg.reactions.push({ userId, emoji });
    }

    await msg.save();
    return res.json({ status: true, reactions: msg.reactions });
  } catch (ex) {
    next(ex);
  }
};
