import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

import UserModel from "../Models/User.js";
import OtpModel from "../Models/Otp.js";
import { NotificationModel } from "../Models/Notification.js";
import { PostModel } from "../Models/Post.js";
import { getSocketId, io } from "../socket.js";
import { sendOtpEmail } from "../Utilis/mail.js";

/* ================= SEND OTP ================= */
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    // Check if email already exists
    const existing = await UserModel.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP
    await OtpModel.findOneAndUpdate(
      { email },
      { otp, createdAt: new Date() },
      { upsert: true, new: true }
    );

    await sendOtpEmail(email, otp);
    res.json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("OTP Error:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

/* ================= REGISTER ================= */
export const registerUser = async (req, res) => {
  try {
    const { username, email, password, otp } = req.body;

    if (!username || !email || !password || !otp) {
      return res.status(400).json({ message: "All fields including OTP are required" });
    }

    // Verify OTP
    const otpRecord = await OtpModel.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const existing = await UserModel.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const newUser = await UserModel.create({
      username,
      email,
      password: hashed,
    });

    // Delete OTP after successful registration
    await OtpModel.deleteOne({ _id: otpRecord._id });

    const token = jwt.sign(
      { id: newUser._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        profilePic: newUser.profilePic,
        bio: newUser.bio,
        isPrivate: newUser.isPrivate,
      },
    });

  } catch (err) {
    res.status(500).json({ message: "Registration failed" });
  }
};

/* ================= LOGIN ================= */
export const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.password) {
      return res.status(401).json({ message: "Google login only account" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePic: user.profilePic,
        bio: user.bio,
        isPrivate: user.isPrivate,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed" });
  }
};

/* ================= GOOGLE AUTH ================= */
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub } = payload;

    let user = await UserModel.findOne({ email });

    if (!user) {
      user = await UserModel.create({
        username: name.replace(/\s/g, "").toLowerCase(),
        email,
        googleId: sub,
        profilePic: picture,
      });
    }

    const jwtToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token: jwtToken, user });
  } catch (err) {
    res.status(401).json({ message: "Google auth failed" });
  }
};

/* ================= GET MY PROFILE ================= */
export const getMyProfile = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const postCount = await PostModel.countDocuments({ user: req.user._id });

    res.json({
      user,
      followersCount: user.followers?.length || 0,
      followingCount: user.following?.length || 0,
      postCount,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= GET USER PROFILE ================= */
export const getUserProfile = async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check statuses relative to current user using string comparison
    const isFollowing = user.followers.some(id => id.toString() === req.user._id.toString());
    const requestSent = user.followRequests.some(id => id.toString() === req.user._id.toString());

    // Get Post Count
    const postCount = await PostModel.countDocuments({ user: req.params.id });

    res.json({ user, isFollowing, requestSent, postCount, followersCount: user.followers.length, followingCount: user.following.length });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(500).json({ message: "Server error" });
  }
};


export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      const allUsers = await UserModel.find({}).limit(10).select("_id username profilePic");
      return res.json(allUsers);
    }

    const users = await UserModel.find({
      username: { $regex: q, $options: "i" }
    })
      .select("_id username profilePic");

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Search failed" });
  }
};


/* ================= FOLLOW / UNFOLLOW ================= */
export const followUnfollowUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    if (targetUserId.toString() === currentUserId.toString()) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const targetUser = await UserModel.findById(targetUserId);
    const currentUser = await UserModel.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    /* -------- CASE 1: ALREADY FOLLOWING (UNFOLLOW) -------- */
    if (currentUser.following.some(id => id.toString() === targetUserId.toString())) {
      currentUser.following.pull(targetUserId);
      targetUser.followers.pull(currentUserId);

      await currentUser.save();
      await targetUser.save();

      // Delete the follow notification
      await NotificationModel.deleteMany({
        receiver: targetUserId,
        sender: currentUserId,
        type: "follow"
      });

      const socketId = getSocketId(targetUserId);
      if (socketId) {
        io.to(socketId).emit("newNotification"); // Trigger refresh
      }

      return res.json({ following: false, requested: false });
    }

    /* -------- CASE 2: PENDING REQUEST (CANCEL REQUEST) -------- */
    if (targetUser.followRequests.some(id => id.toString() === currentUserId.toString())) {
      targetUser.followRequests.pull(currentUserId);
      await targetUser.save();

      // Optional: Delete the notification
      await NotificationModel.deleteMany({
        receiver: targetUserId,
        sender: currentUserId,
        type: "follow_request"
      });

      const socketId = getSocketId(targetUserId);
      if (socketId) {
        io.to(socketId).emit("newNotification"); // Trigger refresh
      }

      return res.json({ following: false, requested: false });
    }

    /* -------- CASE 3: PRIVATE ACCOUNT (SEND REQUEST) -------- */
    if (targetUser.isPrivate) {
      if (!targetUser.followRequests.includes(currentUserId)) {
        targetUser.followRequests.push(currentUserId);
        await targetUser.save();
      }

      await NotificationModel.findOneAndUpdate(
        { receiver: targetUserId, sender: currentUserId, type: "follow_request" },
        { $set: { createdAt: new Date(), isRead: false } },
        { upsert: true }
      );

      const socketId = getSocketId(targetUserId);
      if (socketId) {
        io.to(socketId).emit("newNotification");
      }

      return res.json({ requested: true, following: false });
    }

    /* -------- CASE 4: PUBLIC ACCOUNT (FOLLOW DIRECTLY) -------- */
    currentUser.following.push(targetUserId);
    targetUser.followers.push(currentUserId);

    await currentUser.save();
    await targetUser.save();

    await NotificationModel.findOneAndUpdate(
      { receiver: targetUserId, sender: currentUserId, type: "follow" },
      { $set: { createdAt: new Date(), isRead: false } },
      { upsert: true }
    );

    const socketId = getSocketId(targetUserId);
    if (socketId) {
      io.to(socketId).emit("newNotification");
    }

    return res.json({ following: true, requested: false });
  } catch (err) {
    console.error("FOLLOW ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= FOLLOW REQUESTS ================= */
export const getFollowRequests = async (req, res) => {
  const user = await UserModel.findById(req.user._id)
    .populate("followRequests", "username profilePic");

  res.json({ requests: user.followRequests });
};

export const acceptFollowRequest = async (req, res) => {
  const { requesterId } = req.params;

  const user = await UserModel.findById(req.user._id);
  if (!user.followRequests.includes(requesterId)) {
    return res.status(400).json({ message: "No request found" });
  }

  user.followRequests.pull(requesterId);
  user.followers.push(requesterId);

  const requester = await UserModel.findById(requesterId);
  requester.following.push(user._id);

  await user.save();
  await requester.save();

  // 🗑️ Delete the request notification
  await NotificationModel.deleteMany({
    receiver: req.user._id,
    sender: requesterId,
    type: "follow_request"
  });

  await NotificationModel.findOneAndUpdate(
    { receiver: requesterId, sender: req.user._id, type: "follow" },
    { $set: { createdAt: new Date(), isRead: false } },
    { upsert: true }
  );

  const socketId = getSocketId(requesterId);
  if (socketId) {
    io.to(socketId).emit("newNotification");
  }

  res.json({ accepted: true });
};

export const rejectFollowRequest = async (req, res) => {
  const { requesterId } = req.params;

  const user = await UserModel.findById(req.user._id);
  user.followRequests.pull(requesterId);
  await user.save();

  // 🗑️ Delete the request notification
  await NotificationModel.deleteMany({
    receiver: req.user._id,
    sender: requesterId,
    type: "follow_request"
  });

  res.json({ rejected: true });
};

/* ================= GET LISTS ================= */
export const getFollowers = async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.id)
      .populate("followers", "username profilePic bio");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.followers);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getFollowing = async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.id)
      .populate("following", "username profilePic bio");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.following);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
