
import { Server } from "socket.io";
import http from "http";
import express from "express";
import jwt from "jsonwebtoken";
import Message from "./Models/Message.js";
import Conversation from "./Models/Conversation.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  },
});

const onlineUsers = new Map();

export const getSocketId = (userId) => {
  if (!userId) return null;
  return onlineUsers.get(userId.toString());
};

/* 🔐 SOCKET AUTH */
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch {
    next(new Error("Socket auth failed"));
  }
});

/* 🔌 CONNECTION */
io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.userId);

  onlineUsers.set(socket.userId.toString(), socket.id);

  /* JOIN CHAT ROOM */
  socket.on("joinConversation", (conversationId) => {
    socket.join(conversationId);
  });

  /* SEND MESSAGE */
  socket.on("sendMessage", async ({ conversationId, text }) => {
    try {
      if (!text?.trim()) return;

      const message = await Message.create({
        conversation: conversationId,
        sender: socket.userId,
        text,
      });

      const convo = await Conversation.findByIdAndUpdate(
        conversationId,
        { lastMessage: message._id, updatedAt: Date.now() },
        { new: true }
      );

      if (!convo) return;

      // chat UI (both users)
      io.to(conversationId).emit("newMessage", message);

      // notify ONLY receiver
      const receiverId = convo.participants.find(
        (id) => id.toString() !== socket.userId.toString()
      );

      if (receiverId) {
        const receiverSocket = onlineUsers.get(receiverId.toString());
        if (receiverSocket) {
          io.to(receiverSocket).emit("newMessageNotification", {
            conversationId,
            message,
            sender: socket.userId
          });
        }
      }
    } catch (err) {
      console.error("❌ SOCKET SEND_MESSAGE ERROR:", err);
    }
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(socket.userId.toString());
    console.log("🔴 Disconnected:", socket.userId);
  });
});

export { app, server, io, onlineUsers };
