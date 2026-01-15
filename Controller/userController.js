
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { OAuth2Client } from "google-auth-library";

import { NotificationModel } from "../Models/Notification.js";
import { getSocketId, io } from "../server.js";
import UserModel from "../Models/user.js";





 
export const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
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

    
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      message: "Successfully registered!",
      token,
      user: newUser,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Registration failed" });
  }
};

// ================= LOGIN ================= 
export const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    
    if (!email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

  
    const loginedUser = await UserModel.findOne({ email });
    if (!loginedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Block Google-only users
    if (!loginedUser.password) {
      return res.status(401).json({
        message: "This account uses Google login",
      });
    }

    
    const match = await bcrypt.compare(password, loginedUser.password);
    if (!match) {
      return res.status(401).json({ message: "Incorrect password" });
    }

  
    const token = jwt.sign(
      { id: loginedUser._id, email: loginedUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

   const safeUser = {
      _id: loginedUser._id,
      username: loginedUser.username,
      email: loginedUser.email,
      profilePic: loginedUser.profilePic,
      bio: loginedUser.bio,
      isPrivate: loginedUser.isPrivate,
    };

    res.status(200).json({
      message: "Login successful!",
      token,
      user: safeUser,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Login failed" });
  }
};





const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Google token missing" });
    }

    
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

    res.status(200).json({
      token: jwtToken,
      user,
    });

  } catch (error) {
    console.error("Google auth error:", error);
    res.status(401).json({ message: "Google authentication failed" });
  }
};



export const getMyProfile = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id)
      .select("-password");

    res.status(200).json({
      user,
      followersCount: user.followers.length,
      followingCount: user.following.length,
      postCount: 0 // will update later
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};



export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.json([]);
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





export const getUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await UserModel.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get User Profile Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};









export const followUnfollowUser = async (req, res) => {
  try {
    const targetUserId = req.params.id; // ✅ FIXED
    const currentUserId = req.user._id;

    if (targetUserId.toString() === currentUserId.toString()) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const targetUser = await UserModel.findById(targetUserId);
    const currentUser = await UserModel.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔁 UNFOLLOW
    if (currentUser.following.includes(targetUserId)) {
      currentUser.following.pull(targetUserId);
      targetUser.followers.pull(currentUserId);

      await currentUser.save();
      await targetUser.save();

      return res.json({ following: false });
    }

    // 🔒 PRIVATE ACCOUNT → FOLLOW REQUEST
    if (targetUser.isPrivate) {
      if (!targetUser.followRequests.includes(currentUserId)) {
        targetUser.followRequests.push(currentUserId);
        await targetUser.save();

        await NotificationModel.create({
          receiver: targetUserId,
          sender: currentUserId,
          type: "follow_request",
        });

        const socketId = getSocketId(targetUserId);
        if (socketId) {
          io.to(socketId).emit("newNotification");
        }
      }

      return res.json({ requested: true });
    }

    // 🌍 PUBLIC ACCOUNT → FOLLOW
    currentUser.following.push(targetUserId);
    targetUser.followers.push(currentUserId);

    await currentUser.save();
    await targetUser.save();

    await NotificationModel.create({
      receiver: targetUserId,
      sender: currentUserId,
      type: "follow",
    });

    const socketId = getSocketId(targetUserId);
    if (socketId) {
      io.to(socketId).emit("newNotification");
    }

    return res.json({ following: true });

  } catch (err) {
    console.error("FOLLOW ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};





export const getFollowRequests = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id)
      .populate("followRequests", "username profilePic");

    res.status(200).json({
      requests: user.followRequests,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch follow requests" });
  }
};



export const acceptFollowRequest = async (req, res) => {
  try {
    const { requesterId } = req.params;
    const user = await UserModel.findById(req.user._id);

    if (!user.followRequests.includes(requesterId)) {
      return res.status(400).json({ message: "No such request" });
    }

    // remove request
    user.followRequests.pull(requesterId);
    user.followers.push(requesterId);

    const requester = await UserModel.findById(requesterId);
    requester.following.push(user._id);

    await user.save();
    await requester.save();

   // 🔔 NOTIFY REQUESTER
    await NotificationModel.create({
    receiver: requesterId,   // 👈 requester gets notified
   sender: req.user._id,    // 👈 private account owner
   type: "follow",
    });

res.json({ accepted: true });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};






export const rejectFollowRequest = async (req, res) => {
  try {
    const { requesterId } = req.params;

    const user = await UserModel.findById(req.user._id);
    user.followRequests.pull(requesterId);
    await user.save();

    res.json({ rejected: true });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};




