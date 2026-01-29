// InstaGlam Backend Server
import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import connectDb from "./config/db.js";
import UserRoute from "./Route/Userroute.js";
import PostRoute from "./Route/PostRoute.js";
import ChatRoute from "./Route/ChatRoute.js";
import { app, server } from "./socket.js";

connectDb();

/* ---------------- MIDDLEWARE ---------------- */
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

/* ---------------- ROUTES ---------------- */
app.use("/user", UserRoute);
app.use("/post", PostRoute);
app.use("/chat", ChatRoute);

/* ---------------- START SERVER ---------------- */
// server.listen(3000, () => {
//   console.log("🚀 Server running at http://localhost:3000");
// });

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 InstaGlam Server running at http://localhost:${PORT}`);
});

// Graceful shutdown to prevent EADDRINUSE on nodemon restart
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
