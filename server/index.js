const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const app = express();
const socket = require("socket.io");
const Messages = require("./models/messageModel");
const User = require("./models/userModel");
const { notifyStatusChange, isBlockedEither } = require("./utils/presence");
require("dotenv").config();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("DB Connetion Successfull");
  })
  .catch((err) => {
    console.log(err.message);
  });

app.get("/ping", (_req, res) => {
  return res.json({ msg: "Ping Successful" });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () =>
  console.log(`Server started on ${PORT}`)
);

const io = socket(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ["GET", "POST"],
    credentials: true,
  },
  maxHttpBufferSize: 5e7, // 50MB for media transfer over sockets
});

global.io = io;
global.onlineUsers = new Map();

io.on("connection", (socket) => {
  global.chatSocket = socket;

  socket.on("add-user", async (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;
    try {
      await User.findByIdAndUpdate(userId, { isOnline: true });
      await notifyStatusChange(userId, { userId, isOnline: true });
    } catch (err) {
      console.log(err.message);
    }
  });

  socket.on("typing", async (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket && !(await isBlockedEither(data.from, data.to))) {
      socket.to(sendUserSocket).emit("user-typing", data.from);
    }
  });

  socket.on("stop-typing", async (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket && !(await isBlockedEither(data.from, data.to))) {
      socket.to(sendUserSocket).emit("user-stop-typing", data.from);
    }
  });

  socket.on("send-msg", async (data) => {
    const to = data.to;
    // Blocked either way: drop silently - no delivery, no "delivered" tick
    if (await isBlockedEither(data.from, to)) return;
    const isRecipientOnline = onlineUsers.has(to);

    const payload = {
      message: typeof data.msg === "string" ? data.msg : (data.message || ""),
      messageType: data.messageType || "text",
      mediaUrl: data.mediaUrl || "",
      messageId: data.messageId,
      _id: data.messageId,
      from: data.from,
      status: isRecipientOnline ? "delivered" : "sent",
      reactions: data.reactions || [],
      createdAt: new Date(),
    };

    const sendUserSocket = onlineUsers.get(to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("msg-recieve", payload);
      socket.emit("msg-delivered", {
        messageId: data.messageId,
        to: to,
      });
    }
  });

  socket.on("mark-messages-read", async (data) => {
    try {
      if (data.from && data.to) {
        await Messages.updateMany(
          {
            users: { $all: [data.from, data.to] },
            sender: data.to,
            status: { $ne: "read" },
          },
          { $set: { status: "read" } }
        );
        const sendUserSocket = onlineUsers.get(data.to);
        if (
          sendUserSocket &&
          !(await isBlockedEither(data.from, data.to))
        ) {
          socket.to(sendUserSocket).emit("messages-read-by-user", {
            readerId: data.from,
          });
        }
      }
    } catch (err) {
      console.log(err.message);
    }
  });

  socket.on("send-reaction", async (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket && !(await isBlockedEither(data.from, data.to))) {
      socket.to(sendUserSocket).emit("reaction-received", {
        messageId: data.messageId,
        reactions: data.reactions,
      });
    }
  });

  socket.on("disconnect", async () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      const now = new Date();
      try {
        await User.findByIdAndUpdate(socket.userId, {
          isOnline: false,
          lastSeen: now,
        });
        await notifyStatusChange(socket.userId, {
          userId: socket.userId,
          isOnline: false,
          lastSeen: now,
        });
      } catch (err) {
        console.log(err.message);
      }
    }
  });
});
