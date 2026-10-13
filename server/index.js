const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const app = express();
const socket = require("socket.io");
const Messages = require("./models/messageModel");
const User = require("./models/userModel");
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

const server = app.listen(process.env.PORT, () =>
  console.log(`Server started on ${process.env.PORT}`)
);

const io = socket(server, {
  cors: {
    origin: "http://localhost:3000",
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
      io.emit("user-status-changed", { userId, isOnline: true });
    } catch (err) {
      console.log(err.message);
    }
  });

  socket.on("typing", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("user-typing", data.from);
    }
  });

  socket.on("stop-typing", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("user-stop-typing", data.from);
    }
  });

  socket.on("send-msg", (data) => {
    const to = data.to;
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
        if (sendUserSocket) {
          socket.to(sendUserSocket).emit("messages-read-by-user", {
            readerId: data.from,
          });
        }
      }
    } catch (err) {
      console.log(err.message);
    }
  });

  socket.on("send-reaction", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
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
        io.emit("user-status-changed", {
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
