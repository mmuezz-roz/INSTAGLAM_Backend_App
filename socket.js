
import { Server } from "socket.io";
import http from "http";
import express from "express";
import jwt from "jsonwebtoken";
import Message from "./Models/Message.js";
import Conversation from "./Models/Conversation.js";
import cloudinary from "./config/cloudinary.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "https://sway-frontend-app.vercel.app"
    ],
    credentials: true,
  },
  connectionStateRecovery: {
    // the backup duration of the sessions and the packets
    maxDisconnectionDuration: 2 * 60 * 1000,
    // whether to skip middlewares upon successful recovery
    skipMiddlewares: true,
  }
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
  socket.join(socket.userId.toString());

  /* JOIN CHAT ROOM */
  socket.on("joinConversation", (conversationId) => {
    socket.join(conversationId);
  });

  /* SEND MESSAGE */
  socket.on("sendMessage", async ({ conversationId, text, image, tempId }) => {
    try {
      if ((!text?.trim() && !image) || !conversationId) {
        console.error("❌ SOCKET: Missing text/image or conversationId");
        return;
      }

      if (!socket.userId) {
        console.error("❌ SOCKET: Missing socket.userId (Not authenticated)");
        return;
      }

      let imageUrl = null;
      if (image) {
        try {
          const uploadRes = await cloudinary.uploader.upload(image, {
            folder: "chat_messages",
          });
          imageUrl = uploadRes.secure_url;
        } catch (uploadErr) {
          console.error("❌ CLOUDINARY CHAT UPLOAD ERROR:", uploadErr);
        }
      }

      const message = await Message.create({
        conversation: conversationId,
        sender: socket.userId,
        text: text || "",
        image: imageUrl,
      });

      const convo = await Conversation.findByIdAndUpdate(
        conversationId,
        { lastMessage: message._id, updatedAt: Date.now() },
        { new: true }
      );

      if (!convo) {
        console.error("❌ SOCKET: Conversation not found", conversationId);
        return;
      }

      const messageData = message.toObject();
      if (tempId) messageData.tempId = tempId;

      io.to(conversationId.toString()).emit("newMessage", messageData);

      const receiverId = convo.participants.find(
        (id) => id.toString() !== socket.userId.toString()
      );

      if (receiverId) {
        io.to(receiverId.toString()).emit("newMessageNotification", {
          conversationId: conversationId.toString(),
          message: messageData,
          sender: socket.userId
        });
      }
    } catch (err) {
      console.error("❌ SOCKET SEND_MESSAGE ERROR:", err.message);
    }
  });

  /* DELETE MESSAGE */
  socket.on("deleteMessage", ({ conversationId, messageId }) => {
    io.to(conversationId.toString()).emit("messageDeleted", { messageId });
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(socket.userId.toString());
    console.log("🔴 Disconnected:", socket.userId);
  });
});

export { app, server, io, onlineUsers };
