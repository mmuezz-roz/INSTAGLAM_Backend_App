// import express from 'express'
// import connectDb from './config/db.js';
// import dotenv from 'dotenv'
// import cors from 'cors'
// import UserRoute from './Route/Userroute.js';
// import PostRoute from './Route/PostRoute.js';

// dotenv.config()



// const app = express()
// connectDb()

// app.use(cors());
// app.use(express.json({ limit: "10mb" }))
// console.log("Server Started!");


// app.use("/user",UserRoute,PostRoute);



// app.listen(3000,()=> console.log("server Started http://localhost:3000")
// )

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

import connectDb from "./config/db.js";
import UserRoute from "./Route/Userroute.js";
import PostRoute from "./Route/PostRoute.js";

dotenv.config();

const app = express();
connectDb();

/* ---------------- MIDDLEWARE ---------------- */
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

/* ---------------- ROUTES ---------------- */
app.use("/user", UserRoute);
app.use("/post",PostRoute);

/* ---------------- SOCKET.IO ---------------- */

// 🔥 IMPORTANT: create HTTP server
const server = http.createServer(app);

// 🔔 Socket instance
export const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

// 🧠 Store online users
const onlineUsers = new Map();

// 🔌 Socket connection
io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  // Register user
  socket.on("register", (userId) => {
    onlineUsers.set(userId.toString(), socket.id);
    console.log("User registered:", userId);
  });

  // Disconnect
  socket.on("disconnect", () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log("🔴 User disconnected:", userId);
      }
    }
  });
});

// 🎯 Helper function for notifications
export const getSocketId = (userId) => {
  return onlineUsers.get(userId.toString());
};

/* ---------------- START SERVER ---------------- */
server.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
});
